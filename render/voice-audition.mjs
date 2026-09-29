// Solo voice audition. Purpose: judge ONE voice, alone, on real lines from the episode.
//
// ---------------------------------------------------------------------------------------
// WHY THIS IS SEPARATE FROM voice-test.mjs (added 2026-09-29)
//
// voice-test.mjs renders the conversation with two speakers in a single call. That is the
// shape the episode needs, but it is NOT the shape AI Studio auditions a voice in - AI
// Studio reads a short sample from one speaker with a style prompt, which is why the same
// voice names sound better there.
//
// This script isolates the variable. One voice, one speaker per call, the host's own lines
// from the episode, nothing else.
//
// The useful comparison is NOT audition-vs-mp3. It is:
//   node render/voice-audition.mjs <turns> Bodi David
//   node render/voice-audition.mjs <turns> Fenrir David
//   ... same lines, different voice. If Fenrir also sounds good solo, the pair was never
//   the problem and the two-speaker call is where the work is.
//
// No text model call. No script generation. A voice check costs one TTS pass per chunk.
// ---------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------
// OVER-ENUNCIATION (added 2026-09-29)
//
// Reported symptom: the voice holds the end of a word to emphasise it, and leans on each
// syllable. Awkward, effortful, not how a person talks.
//
// Two causes, and both are ours rather than the voice's.
//
// 1. PUNCTUATION CUES. This script was written to be read, so it is punctuated the way
//    prose is punctuated. A colon means "here comes a list, land on it". A semicolon means
//    "hold, then continue". A dash means "stress the next thing". The TTS model obeys those
//    marks literally, which is exactly the held-syllable effect. normalizeForSpeech()
//    rewrites those cues into the flat punctuation people actually speak in. Written prose
//    keeps its punctuation - this happens only on the copy sent to the synthesiser.
//
// 2. STYLE PROMPT. The first version asked for warmth but never told the model to relax its
//    articulation, and "clear" is the default register of a TTS model given no other
//    direction. An unhedged negative instruction is what suppresses it.
//
// Note the deliberate wording below. Asking the model NOT to do something works far worse
// than describing the thing it should do instead, so most of the prompt is spent describing
// ordinary speech rather than forbidding careful speech.
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
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Four turns per call. Short enough that prosody does not drift mid-generation.
const CHUNK_TURNS = Number(process.env.CHUNK_TURNS || 4);

// Roughly forty-five seconds of speech. Enough to hear character and pacing, short enough
// that auditioning six voices is not a long wait.
const SAMPLE_WORDS = Number(process.env.SAMPLE_WORDS || 450);

const SPEED = Number(process.env.TTS_SPEED || 1);
if (!Number.isFinite(SPEED) || SPEED <= 0) {
  console.error('FAIL: TTS_SPEED must be a positive number');
  process.exit(1);
}

// Relaxed, slightly under-enunciated speech. This is the lever that was missing on the
// first pass. TTS_SPEED above 1.0 helps the same problem and is a separate control.
const DEFAULT_STYLE =
  'You are two people talking, not a narrator reading. Speak the way someone talks when they are relaxed and mid-thought - words run together a little, some syllables get swallowed, sentences end on a downward shrug rather than a landing. Keep the pace conversational and slightly quick. Do not articulate each word separately. Do not lean on syllables or stretch the ends of words for emphasis. Do not slow down to be understood.';

const STYLE = process.env.TTS_STYLE || DEFAULT_STYLE;

// Prose punctuation rewritten into speech punctuation. See the note at the top of the file:
// the model follows these marks literally, and the list-shaped marks are what produce the
// held-syllable delivery.
function normalizeForSpeech(text) {
  return text
    .replace(/\s*[\u2014\u2013]\s*/g, ', ') // em / en dash -> comma
    .replace(/\s*;\s*/g, '. ') // semicolon -> full stop
    .replace(/\s*:\s*/g, ', ') // colon -> comma, removes the "land on this" cue
    .replace(/\s*[\u201C\u201D\u2018\u2019"]/g, '') // quote marks drop out
    .replace(/\s*[()]/g, ' ') // parentheses drop out
    .replace(/\.{2,}/g, '. ') // ellipses collapse, trailing-off is a style matter
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const [turnsPath, voiceName, host] = process.argv.slice(2);
if (!turnsPath || !voiceName || !host) {
  console.error('usage: node render/voice-audition.mjs <turns-path> <voice-name> <host>');
  console.error('example: node render/voice-audition.mjs scripts/internal-courtroom-01.turns.json Bodi David');
  process.exit(1);
}

const sections = JSON.parse(fs.readFileSync(turnsPath, 'utf8'));
if (!Array.isArray(sections) || sections.length === 0 || !Array.isArray(sections[0])) {
  console.error('FAIL: turns file must be an array of sections, each an array of turns');
  process.exit(1);
}

// Pull the host's own lines across the whole episode, in order, and stop at the word budget.
// Only lines from the given host: a voice audition should not contain another speaker.
const lines = [];
let total = 0;
for (const section of sections) {
  for (const t of section) {
    if (t.speaker !== host) continue;
    const n = t.text.split(/\s+/).filter(Boolean).length;
    if (total + n > SAMPLE_WORDS) break;
    lines.push(normalizeForSpeech(t.text));
    total += n;
  }
  if (total >= SAMPLE_WORDS) break;
}

if (lines.length === 0) {
  console.error(`FAIL: no lines found for host "${host}" in ${turnsPath}`);
  process.exit(1);
}

async function call(body) {
  const res = await fetch(`${BASE}/${TTS_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${TTS_MODEL} ${res.status}: ${await res.text()}`);
  return res.json();
}

async function voice(chunk, label) {
  const audioRes = await call({
    // The style is prepended per chunk, not once per file: each call is generated
    // independently, so a chunk that does not carry the direction gets the model's default
    // register back.
    contents: [{ role: 'user', parts: [{ text: `${STYLE}\n\n${chunk.join('\n\n')}` }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      // Single speaker, which is the whole point of this script. No multiSpeakerVoiceConfig.
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
    },
  });

  const part = audioRes.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!part) {
    console.error(`FAIL: ${label} returned no audio`);
    process.exit(1);
  }
  return Buffer.from(part.inlineData.data, 'base64');
}

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

console.log(`audition: ${host} read by ${voiceName}`);
console.log(`sample: ${lines.length} lines, ${total} words, chunk size ${CHUNK_TURNS}, tempo ${SPEED}x`);

const chunks = [];
for (let s = 0; s < lines.length; s += CHUNK_TURNS) {
  const slice = lines.slice(s, s + CHUNK_TURNS);
  const label = `chunk ${chunks.length + 1}`;
  const pcm = await voice(slice, label);
  chunks.push(pcm);
  console.log(`  ${label}: ${slice.length} lines, ${pcm.length} bytes`);
}

fs.mkdirSync('out', { recursive: true });

const wavPath = path.join('out', `${voiceName}-${host}-audition.wav`);
fs.writeFileSync(wavPath, wav(Buffer.concat(chunks)));

const mp3Path = path.join('out', `${voiceName}-${host}-audition.mp3`);
const filter = SPEED === 1 ? [] : ['-filter:a', `atempo=${SPEED}`];
execFileSync('ffmpeg', ['-y', '-i', wavPath, ...filter, '-codec:a', 'libmp3lame', '-qscale:a', '4', mp3Path], { stdio: 'inherit' });
fs.unlinkSync(wavPath);

const seconds = Number(
  execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', mp3Path])
    .toString()
    .trim(),
);
console.log(`duration: ${seconds.toFixed(0)}s`);
console.log(`wrote ${mp3Path}`);
