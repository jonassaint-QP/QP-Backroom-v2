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

// 1. script pass: writer prompt + brief -> validated turn array
const writer = fs.readFileSync('prompts/episode-writer.md', 'utf8');
const brief = fs.readFileSync(briefPath, 'utf8');

const scriptRes = await call(TEXT_MODEL, {
  contents: [{ role: 'user', parts: [{ text: `${writer}\n\n---\n\nEPISODE BRIEF\n\n${brief}` }] }],
});
const raw = (scriptRes.candidates?.[0]?.content?.parts ?? []).map(p => p.text).join('');

let turns;
try {
  turns = JSON.parse(raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1));
} catch (err) {
  console.error('FAIL: writer output is not a parseable turn array');
  process.exit(1);
}
if (!Array.isArray(turns) || turns.length === 0) {
  console.error('FAIL: writer prompt returned no turn array');
  process.exit(1);
}

// schema tolerance: the turn contract is documented with `line`, the writer may emit
// either. Normalise once, here, so no downstream line has to care which field arrived.
const spoken = t => (typeof t.text === 'string' && t.text.trim() !== '' ? t.text : t.line);

for (const t of turns) {
  const line = spoken(t);
  if (typeof line !== 'string' || line.trim() === '') {
    console.error(`FAIL: turn has no spoken line (speaker=${t.speaker ?? '?'})`);
    process.exit(1);
  }
  t.text = line;
  if (t.pause_after_ms !== undefined) {
    console.warn(`note: pause_after_ms=${t.pause_after_ms} is realised by punctuation, not sent to the model`);
  }
}
console.log(`script: ${turns.length} turns`);

// 2. three sections, cut here. The writer emits a flat turn array with no per-turn
// section field, so the split happens in code rather than being requested from the model.
const size = Math.ceil(turns.length / SECTIONS);
const parts = Array.from({ length: SECTIONS }, (_, i) => turns.slice(i * size, (i + 1) * size));

const empty = parts.findIndex(p => p.length === 0);
if (empty !== -1) {
  console.error(`FAIL: section ${empty + 1} is empty - writer returned too few turns`);
  process.exit(1);
}

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
