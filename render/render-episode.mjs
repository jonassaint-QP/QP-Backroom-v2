// QP podcast renderer. Brief in, MP3 out. See acceptance criteria, criteria 1-9.
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
const VOICES = { David: 'Fenrir', Jason: 'Orus' };
const SECTIONS = 3;

// The script is written in one call PER SECTION, not one call for the whole episode.
// A single call asked for 5,400 words returns roughly a quarter of that, every time.
// Each call below is therefore asked for one section's worth, and the section boundary
// is requested rather than computed. The sections must also be written in order, because
// each call is given the tail of the one before it so a term of art defined earlier is
// not defined again later.
const SECTION_PLAN = [
  'Section 1 of 3 — the cold open plus beats one and two.',
  'Section 2 of 3 — beats three and four. This continues an episode already in progress: open by picking the conversation back up, and do not re-introduce or re-define any term of art that Section 1 already defined.',
  'Section 3 of 3 — beats five and six plus the episode closing. The primary call to action is spoken on the final turn, once, and never mid-section. Do not re-introduce or re-define any term of art already defined earlier.',
];
const SECTION_WORDS =
  'Length for this section: 1,800 to 2,150 spoken words. Count the words in the lines you produce before you return, and state that count on its own line after the array. If you cannot reach 1,800 words from the material without padding, say so in that same line instead of inflating the dialogue.';
const TAIL_TURNS = 6; // turns carried from the end of the previous section, for continuity only

const [briefPath, episodeId] = process.argv.slice(2);
if (!briefPath || !episodeId) {
  console.error('usage: node render/render-episode.mjs <brief-path> <episode-id>');
  process.exit(1);
}

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
    t.text = line;
    if (t.pause_after_ms !== undefined) {
      console.warn(`note: pause_after_ms=${t.pause_after_ms} is realised by punctuation, not sent to the model`);
    }
  }
  return out;
}

// 1. script pass: writer prompt + brief + section plan -> one turn array per section
const writer = fs.readFileSync('prompts/episode-writer.md', 'utf8');
const brief = fs.readFileSync(briefPath, 'utf8');

const parts = [];
for (let i = 0; i < SECTIONS; i++) {
  const prior = parts.length
    ? `\n\nSECTION ${i} AS ALREADY WRITTEN — the closing turns of the previous section. This is context for continuity only: do not repeat it, do not restate it, and do not summarise it before continuing.\n\n${parts
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

// 2. audio pass, one call per section. The section boundary is now the one the script was
// written to, rather than a computed slice of a flat array.
const chunks = [];
for (let i = 0; i < parts.length; i++) {
  const n = i + 1;
  const lines = parts[i].map(t => `${t.speaker}: ${spoken(t)}`).join('\n');

  const audioRes = await call(TTS_MODEL, {
    contents: [{ role: 'user', parts: [{ text: 'TTS the following two-host conversation exactly as written. Treat every dash as a cut-in and every ellipsis as trailing off.\n\n' + lines }] }],
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
    console.error(`FAIL: section ${n} returned no audio`);
    process.exit(1);
  }
  chunks.push(Buffer.from(part.inlineData.data, 'base64'));
  console.log(`section ${n}: ${chunks.at(-1).length} bytes PCM`);
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
execFileSync('ffmpeg', ['-y', '-i', wavPath, '-codec:a', 'libmp3lame', '-qscale:a', '4', mp3Path], { stdio: 'inherit' });
fs.unlinkSync(wavPath);

const seconds = Number(
  execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', mp3Path])
    .toString()
    .trim(),
);
console.log(`duration: ${(seconds / 60).toFixed(1)} min`);
if (seconds < 20 * 60) console.warn('warning: render is under 20 minutes - check for a dropped section');

console.log(`wrote ${mp3Path} and ${turnsPath}`);
