// Voice-fit test. Purpose: hear Fenrir and Orus on real script before committing to a full render.
//
// There is NO text model call here. The turns already exist and are voiced as written, so a
// voice question costs one TTS pass per chunk and nothing else. If the voices are wrong, no
// script generation and no full episode were spent finding that out.
//
// ---------------------------------------------------------------------------------------
// WHY CHUNKING EXISTS (added 2026-09-29)
//
// The first version handed each section to the TTS model in one call - up to fifteen turns,
// four hundred words, one generation. The output came back flat: the model drifts into a
// narrator register partway through a long generation, and in multi-speaker mode it spends
// its capacity holding two identities apart rather than performing either one.
//
// The same voice names sound far better in AI Studio, and the reason is context, not
// casting. AI Studio auditions a short sample, one speaker, no preamble. So this version
// matches those conditions: each call carries a small number of turns (CHUNK_TURNS), and
// the mechanical instruction is replaced with a performance direction, which is the closest
// analogue to the style prompt AI Studio applies.
//
// Chunks are concatenated back into one section, so the join points are silent and the
// delivered file still reads as a single conversation.
//
// If it is STILL flat after this, the next lever is single-speaker mode: voice each host's
// turns separately and interleave them, which is exactly what AI Studio does. That is a
// bigger change and is deliberately not made here until short chunks have been ruled out.
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
const VOICES = { David: 'Fenrir', Jason: 'Orus' };
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Four turns per call by default. Short enough that prosody does not drift; long enough
// that the model still hears the two hosts answering each other rather than isolated lines.
const CHUNK_TURNS = Number(process.env.CHUNK_TURNS || 4);

// The performance direction. This is a style prompt, not an instruction set: it describes
// how the conversation should sound, where the previous version told the model how to
// interpret punctuation. Mechanical instruction produces mechanical delivery.
const STYLE =
  process.env.TTS_STYLE ||
  'Read the following as a warm, unhurried conversation between two people genuinely talking to each other, not as a narration. Natural pacing, real reactions, no announcer voice. Every dash is a cut-in and every ellipsis is trailing off.\n\n';

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

async function voice(turns, label) {
  const lines = turns.map(t => `${t.speaker}: ${t.text}`).join('\n');

  const audioRes = await call(TTS_MODEL, {
    contents: [{ role: 'user', parts: [{ text: STYLE + lines }] }],
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

  console.log(`section ${n}: ${turns.length} turns, ${turns.reduce((k, t) => k + words(t.text), 0)} words`);

  const pieces = [];
  for (let s = 0; s < turns.length; s += CHUNK_TURNS) {
    const slice = turns.slice(s, s + CHUNK_TURNS);
    const label = `section ${n} chunk ${pieces.length + 1}`;
    const pcm = await voice(slice, label);
    pieces.push(pcm);
    console.log(
      `  ${label}: ${slice.length} turns, ${slice.reduce((k, t) => k + words(t.text), 0)} words, ${pcm.length} bytes`,
    );
  }

  chunks.push(Buffer.concat(pieces));
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
