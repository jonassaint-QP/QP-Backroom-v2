// Voice-fit test. Purpose: hear Fenrir and Orus on real script before committing to a full render.
//
// There is NO text model call here. The turns already exist and are voiced as written, so a
// voice question costs one TTS pass per section and nothing else. If the voices are wrong,
// no script generation and no full episode were spent finding that out.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.error('FAIL: GEMINI_API_KEY missing');
  process.exit(1);
}

const TTS_MODEL = process.env.TTS_MODEL || 'gemini-3.1-flash-tts-preview';
const VOICES = { David: 'Fenrir', Jason: 'Orus' };
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const [turnsPath, episodeId] = process.argv.slice(2);
if (!turnsPath || !episodeId) {
  console.error('usage: node render/voice-test.mjs <turns-path> <episode-id>');
  process.exit(1);
}

const sections = JSON.parse(fs.readFileSync(turnsPath, 'utf8'));
if (!Array.isArray(sections) || sections.length === 0 || !Array.isArray(sections[0])) {
  console.error('FAIL: turns file must be an array of sections, each an array of turns');
  process.exit(1);
}

async function call(model, body) {
  const res = await fetch(`${BASE}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${model} ${res.status}: ${await res.text()}`);
  return res.json();
}

const words = s => s.split(/\s+/).filter(Boolean).length;

const chunks = [];
for (let i = 0; i < sections.length; i++) {
  const n = i + 1;
  const turns = sections[i];

  for (const t of turns) {
    if (!t.speaker || !t.text) {
      console.error(`FAIL: section ${n} has a turn missing speaker or text`);
      process.exit(1);
    }
    if (!(t.speaker in VOICES)) {
      console.error(`FAIL: section ${n} names unknown speaker ${t.speaker} (no locked voice)`);
      process.exit(1);
    }
  }

  const lines = turns.map(t => `${t.speaker}: ${t.text}`).join('\n');
  console.log(`section ${n}: ${turns.length} turns, ${turns.reduce((k, t) => k + words(t.text), 0)} words`);

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

const wavPath = path.join('out', `${episodeId}-voice-test.wav`);
fs.writeFileSync(wavPath, wav(Buffer.concat(chunks)));

const mp3Path = path.join('out', `${episodeId}-voice-test.mp3`);
execFileSync('ffmpeg', ['-y', '-i', wavPath, '-codec:a', 'libmp3lame', '-qscale:a', '4', mp3Path], { stdio: 'inherit' });
fs.unlinkSync(wavPath);

const seconds = Number(
  execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', mp3Path])
    .toString()
    .trim(),
);
console.log(`duration: ${(seconds / 60).toFixed(1)} min`);

// This is a fit check, not an episode. Ten minutes is the floor for judging a voice.
if (seconds < 10 * 60) console.warn('warning: under 10 minutes - extend the turns file before judging the fit');

console.log(`wrote ${mp3Path}`);
