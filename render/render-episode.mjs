// QP podcast renderer. Brief in, MP3 out - or a finished turns file in (scripts/*.json), which
// skips the writer and is voiced as written. See acceptance criteria, criteria 1-9.
//
// ---------------------------------------------------------------------------------------
// VOICE PATH ALIGNMENT (added 2026-09-29)
//
// The audition script (render/voice-audition.mjs) is what produced delivery Joshua approved.
// This file previously rendered audio under three conditions the audition does NOT use, and
// all three are why the episode voices sounded robotic while the same voice sounded good in
// isolation:
//
//   1. ONE CALL PER SECTION. Up to fifteen turns, four hundred words, single generation. The
//      model drifts into narrator register partway through a long generation. Now chunked
//      (CHUNK_TURNS), same as the audition.
//   2. MECHANICAL INSTRUCTION. An instruction set about punctuation is mechanical instruction,
//      and mechanical instruction produces mechanical delivery. Now a performance direction.
//   3. PROSE PUNCTUATION SENT VERBATIM. Colons, semicolons and dashes are obeyed literally by
//      the model, a colon says "land on this", a semicolon says "hold", which produces the
//      held-syllable, leaned-on-word effect. normalizeForSpeech() flattens those cues for the
//      synthesiser only. The turns file written to out/ keeps the original punctuation.
//
// If the episode voices are STILL flat after this, the next lever is single-speaker mode:
// voice each host's turns separately and interleave, which is exactly what AI Studio does.
// Deliberately not done here until short chunks have been ruled out in the full render.
// ---------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------
// STYLE PROMPT (added 2026-09-29)
//
// THIS CONSTANT IS THE WITNESSED-GOOD ONE. It is the wording under which Joshua said "that
// was perfect", and it is the baseline every later experiment is measured against. Restore it
// rather than re-derive it: it was arrived at by trial, and the two variants tried after it
// both failed - a version built from the AI Studio presets came back OVERPERFORMING ("in
// command of the room" and "glad to be saying it" both ask for an audience, and a host is what
// you get), and a tightened version came back ANXIOUS ("slightly quick clip" plus micro-pauses
// plus 1.2x speed stack into tension). Neither variant is kept here.
//
// The shape that works: relaxed and mid-thought, descriptions of ordinary speech rather than
// prohibitions, and negative instructions confined to the two failure modes that actually
// occurred (articulating each word separately, leaning on syllables).
//
// Punctuation in this constant is deliberately ASCII. An em dash is a model instruction to
// stress what follows, which is the precise tic the speech pass exists to remove, so it has no
// business in a style prompt.
//
// Override per run with the style field on the Render Episode workflow; leaving that field
// BLANK falls back to this constant. A style typed into the field on a previous run persists in
// the GitHub UI, so clear the field rather than assuming it is empty.
// ---------------------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.error('FAIL: GEMINI_API_KEY missing');
  process.exit(1);
}

const TTS_MODEL = process.env.TTS_MODEL || 'gemini-3.1-flash-tts-preview';
const TEXT_MODEL = process.env.TEXT_MODEL || 'gemini-3.1-pro-preview';

// Bodi is the approved voice. Overridable per host so a recast is a workflow field rather
// than a code change, the point of the audition was to make this a one-line decision.
const VOICES = {
  David: process.env.VOICE_DAVID || 'Bodi',
  Jason: process.env.VOICE_JASON || 'Orus',
};

const SECTIONS = 3;

// Turns per TTS call. Short enough that prosody does not drift mid-generation; long enough
// that the model still hears the two hosts answering each other.
const CHUNK_TURNS = Number(process.env.CHUNK_TURNS || 4);

// Playback speed, applied after synthesis via ffmpeg atempo. Duration changes, pitch does not.
// 1.2 is the approved setting. The collision warning fires above 1.25, so the default sits just
// under the point where consonants start smearing.
const SPEED = Number(process.env.TTS_SPEED || 1.2);
if (!Number.isFinite(SPEED) || SPEED <= 0) {
  console.error('FAIL: TTS_SPEED must be a positive number');
  process.exit(1);
}
if (SPEED > 1.25) {
  console.warn(`warning: TTS_SPEED ${SPEED} is past the point where consonants start colliding`);
}

// The witnessed-good style prompt. See the note at the top of this file before editing.
const STYLE =
  process.env.TTS_STYLE ||
  'You are two people talking, not narrators reading. Speak the way someone talks when they are relaxed and mid-thought - words run together a little, some syllables get swallowed, sentences end on a downward shrug rather than a landing. Keep the pace conversational and slightly quick. Do not articulate each word separately. Do not lean on syllables or stretch the ends of words for emphasis. Do not slow down to be understood.';

// The script is written in one call PER SECTION, not one call for the whole episode.
// A single call asked for 5,400 words returns roughly a quarter of that, every time.
// Each call below is therefore asked for one section's worth, and the section boundary
// is requested rather than computed. The sections must also be written in order, because
// each call is given the tail of the one before it so a term of art defined earlier is
// not defined again later.
const SECTION_PLAN = [
  'Section 1 of 3: the cold open plus beats one and two.',
  'Section 2 of 3: beats three and four. This continues an episode already in progress: open by picking the conversation back up, and do not re-introduce or re-define any term of art that Section 1 already defined.',
  'Section 3 of 3: beats five and six plus the episode closing. The primary call to action is spoken on the final turn, once, and never mid-section. Do not re-introduce or re-define any term of art already defined earlier.',
];
const SECTION_WORDS =
  'Length for this section: 1,800 to 2,150 spoken words. Count the words in the lines you produce before you return, and state that count on its own line after the array. If you cannot reach 1,800 words from the material without padding, say so in that same line instead of inflating the dialogue.';
const TAIL_TURNS = 6; // turns carried from the end of the previous section, for continuity only

// The source is either a brief (.md), which goes through the writer, or a finished turns file
// (.json), which is voiced as written. A turns file uses the scripts/ convention: an array of
// sections, each an array of turns. A flat array is read as a single section.
const [sourcePath, episodeId] = process.argv.slice(2);
if (!sourcePath || !episodeId) {
  console.error('usage: node render/render-episode.mjs <brief.md | turns.json> <episode-id>');
  process.exit(1);
}
const fromTurns = sourcePath.endsWith('.json');

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

async function call(model, body) {
  const res = await fetch(`${BASE}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${model} ${res.status}: ${await res.text()}`);
  return res.json();
}

const spoken = t => (typeof t.text === 'string' && t.text.trim() !== '' ? t.text : t.line);
const words = s => s.split(/\s+/).filter(Boolean).length;

// Prose punctuation rewritten into speech punctuation, for the synthesiser only. The model
// follows these marks literally and the list-shaped ones are what produce the held-syllable
// delivery. The turns written to out/ keep the original text.
function normalizeForSpeech(text) {
  return text
    .replace(/\s*[\u2014\u2013]\s*/g, ', ') // em / en dash -> comma
    .replace(/\s*;\s*/g, '. ') // semicolon -> full stop
    .replace(/\s*:\s*/g, ', ') // colon -> comma, removes the "land on this" cue
    .replace(/\s*[\u201C\u201D\u2018\u2019"]/g, '') // quote marks drop out
    .replace(/\s*[()]/g, ' ') // parentheses drop out
    .replace(/\*+/g, '') // stray markdown emphasis must never be read aloud
    .replace(/\.{2,}/g, '. ') // ellipses collapse, trailing-off is a style matter
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// schema tolerance: the turn contract is documented with `line`, the writer may emit
// either. Normalise once, here, so no downstream line has to care which field arrived.
function parseTurns(raw, label) {
  let out;
  try {
    out = JSON.parse(raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1));
  } catch (err) {
    console.error(`FAIL: ${label} output is not a parseable turn array`);
    process.exit(1);
  }
  if (!Array.isArray(out) || out.length === 0) {
    console.error(`FAIL: ${label} returned no turn array`);
    process.exit(1);
  }
  for (const t of out) {
    const line = spoken(t);
    if (typeof line !== 'string' || line.trim() === '') {
      console.error(`FAIL: ${label} has a turn with no spoken line (speaker=${t.speaker ?? '?'})`);
      process.exit(1);
    }
    // A speaker with no voice config is voiced at the model's whim, not as either host.
    if (!(t.speaker in VOICES)) {
      console.error(`FAIL: ${label} has a turn for unknown speaker "${t.speaker}" - expected ${Object.keys(VOICES).join(' or ')}`);
      process.exit(1);
    }
    t.text = line;
    if (t.pause_after_ms !== undefined) {
      console.warn(`note: pause_after_ms=${t.pause_after_ms} is realised by punctuation, not sent to the model`);
    }
  }
  return out;
}

// 1. script: a turns file is read as-is; a brief goes through the writer, one call per section.
const parts = [];
if (fromTurns) {
  const data = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const sections = Array.isArray(data) && data.every(Array.isArray) ? data : [data];
  sections.forEach((s, i) => {
    const section = parseTurns(JSON.stringify(s), `${sourcePath} section ${i + 1}`);
    parts.push(section);
    console.log(`section ${i + 1}: ${section.length} turns, ${section.reduce((n, t) => n + words(t.text), 0)} words (from file)`);
  });
}

// writer prompt + brief + section plan -> one turn array per section
const writer = fromTurns ? '' : fs.readFileSync('prompts/episode-writer.md', 'utf8');
const brief = fromTurns ? '' : fs.readFileSync(sourcePath, 'utf8');
for (let i = 0; i < (fromTurns ? 0 : SECTIONS); i++) {
  const prior = parts.length
    ? `\n\nSECTION ${i} AS ALREADY WRITTEN: the closing turns of the previous section. This is context for continuity only. Do not repeat it, do not restate it, and do not summarise it before continuing.\n\n${parts
        .at(-1)
        .slice(-TAIL_TURNS)
        .map(t => `${t.speaker}: ${t.text}`)
        .join('\n')}`
    : '';

  const text = `${writer}\n\n---\n\nEPISODE BRIEF\n\n${brief}\n\n---\n\nNOW WRITE\n\n${SECTION_PLAN[i]}\n\n${SECTION_WORDS}${prior}\n\nReturn only this section's turns as a JSON array.`;

  const res = await call(TEXT_MODEL, { contents: [{ role: 'user', parts: [{ text }] }] });
  const raw = (res.candidates?.[0]?.content?.parts ?? []).map(p => p.text).join('');

  const section = parseTurns(raw, `section ${i + 1}`);
  parts.push(section);
  console.log(`section ${i + 1}: ${section.length} turns, ${section.reduce((n, t) => n + words(t.text), 0)} words`);
}

const turns = parts.flat();
console.log(`script: ${turns.length} turns, ${turns.reduce((n, t) => n + words(t.text), 0)} words`);

// A section that renders empty is a failure, and it is cheaper to catch it here than to
// ship ten minutes of audio and find out from a listener.
const short = parts.findIndex(p => p.length === 0);
if (short !== -1) {
  console.error(`FAIL: section ${short + 1} came back empty`);
  process.exit(1);
}

async function voice(turnsChunk, label) {
  const lines = turnsChunk
    .map(t => `${t.speaker}: ${normalizeForSpeech(spoken(t))}`)
    .join('\n');

  const audioRes = await call(TTS_MODEL, {
    // The style is prepended per call, not once per file: each call is generated
    // independently, so a chunk that does not carry the direction gets the model's default
    // register back.
    contents: [{ role: 'user', parts: [{ text: `${STYLE}\n\n${lines}` }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: Object.entries(VOICES).map(([speaker, voiceName]) => ({
            speaker,
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          })),
        },
      },
    },
  });

  const part = audioRes.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!part) {
    console.error(`FAIL: ${label} returned no audio`);
    process.exit(1);
  }
  return Buffer.from(part.inlineData.data, 'base64');
}

// 2. audio pass, chunked within each section. The section boundary is still the one the
// script was written to, so the join points land where the writing already breaks.
console.log(`chunk size: ${CHUNK_TURNS} turns, tempo: ${SPEED}x, voices: ${JSON.stringify(VOICES)}`);

const chunks = [];
for (let i = 0; i < parts.length; i++) {
  const n = i + 1;
  const section = parts[i];

  const pieces = [];
  for (let s = 0; s < section.length; s += CHUNK_TURNS) {
    const slice = section.slice(s, s + CHUNK_TURNS);
    const label = `section ${n} chunk ${pieces.length + 1}`;
    const pcm = await voice(slice, label);
    pieces.push(pcm);
  }

  chunks.push(Buffer.concat(pieces));
  console.log(`section ${n}: ${parts[n - 1].length} turns, ${chunks.at(-1).length} bytes PCM`);
}

// 3. raw PCM (24kHz / 16-bit / mono) -> WAV -> MP3
function wav(pcm, rate = 24000, ch = 1, bits = 16) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(ch, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE((rate * ch * bits) / 8, 28);
  h.writeUInt16LE((ch * bits) / 8, 32);
  h.writeUInt16LE(bits, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

fs.mkdirSync('out', { recursive: true });

const turnsPath = path.join('out', `${episodeId}.turns.json`);
fs.writeFileSync(turnsPath, JSON.stringify(turns, null, 2));

const wavPath = path.join('out', `${episodeId}.wav`);
fs.writeFileSync(wavPath, wav(Buffer.concat(chunks)));

const mp3Path = path.join('out', `${episodeId}.mp3`);
const filter = SPEED === 1 ? [] : ['-filter:a', `atempo=${SPEED}`];
execFileSync('ffmpeg', ['-y', '-i', wavPath, ...filter, '-codec:a', 'libmp3lame', '-qscale:a', '4', mp3Path], { stdio: 'inherit' });
fs.unlinkSync(wavPath);

const seconds = Number(
  execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', mp3Path])
    .toString()
    .trim(),
);
console.log(`duration: ${(seconds / 60).toFixed(1)} min`);
if (seconds < 20 * 60) console.warn('warning: render is under 20 minutes - check for a dropped section');

console.log(`wrote ${mp3Path} and ${turnsPath}`);
