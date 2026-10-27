// Audiobook render path. Chapter text in, single-narrator MP3 out.
//
// ---------------------------------------------------------------------------------------
// WHY THIS IS A SEPARATE SCRIPT FROM render-episode.mjs
//
// The episode path solves the HARD problem: two speakers, one generation, a model that has to
// hold two identities apart while also sounding like a person. Everything in that path exists
// to manage that difficulty - the writer prompt, the section plan, the tail-turns continuity
// handoff, the chunking that keeps prosody from drifting mid-generation.
//
// An audiobook has none of those problems. One narrator, continuous text, no second identity
// to keep separate, and no writer at all because the text is already written. So this file is
// much smaller on purpose. It reuses the four fixes that survived the episode work and drops
// everything else:
//
//   - the speech-punctuation pass (colons and dashes are obeyed as stress instructions)
//   - the relaxed style prompt, which is what stopped the over-enunciation
//   - chunked generation, so prosody cannot drift across a long read
//   - atempo for speed, which moves duration without moving pitch
//
// It is a SEPARATE FILE rather than a mode flag inside render-episode.mjs so that a change to
// the audiobook cannot disturb the episode path, and vice versa. They share conventions, not
// code.
// ---------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------
// PAGE ARTIFACTS (added 2026-09-30)
//
// The manuscript is punctuated and marked up for the page, and several of those marks are
// actively harmful when read aloud. Observed in the source material:
//
//   [Cite: 4]     citation markers left over from the research draft - these get READ ALOUD,
//                 which is the single worst failure mode here because it sounds like a bug
//   Tab 2 ...     document chrome from a Doc tab title, not manuscript text
//   ## and **     markdown headings and emphasis, read as "hash hash" or swallowed depending
//                 on the model's mood
//   ---           horizontal rules between parts, read as nothing or as a pause of random length
//   [1]           bracketed numerals and superscripts from citation pass
//
// stripPageArtifacts() removes those before anything reaches the synthesiser. The spoken text
// is ALSO written to out/ so a human can sight-check what was actually said. Do not skip that
// file - it is the only cheap way to catch a marker surviving the strip.
// ---------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------
// PRONUNCIATION (added 2026-09-30)
//
// The manuscript carries clinical terms, names, and terms of art that a TTS model will guess
// at. Guesses are not random, they are consistently wrong, so they need fixing once rather
// than per render. scripts/spoken-forms.json holds plain find-and-replace pairs applied to the
// spoken text only: written spelling on the left, how it should sound on the right. Applied
// after the page-artifact strip and before the punctuation pass, so a replacement can itself
// contain punctuation if needed. A missing file is not an error - it just means no overrides
// have been settled yet.
// ---------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------
// RESUME (added 2026-09-30)
//
// Every chunk is written to out/<id>.chunks/NNNN.pcm as it completes, and an existing chunk is
// skipped on rerun. A chapter that fails at chunk forty of sixty therefore costs forty chunks
// to redo, not sixty, and it costs nothing to try. A chunk is only ever paid for once.
//
// This is the reason the pilot matters: a thirteen-chapter book is a long unattended run, and
// without resume a single failure at the end throws away everything before it. The chunk
// directory is deleted on success so it never bloats the artifact, and deliberately kept on
// failure so the rerun can pick up.
// ---------------------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.error('FAIL: GEMINI_API_KEY missing');
  process.exit(1);
}

const TTS_MODEL = process.env.TTS_MODEL || 'gemini-3.8-flash-tts';
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Single narrator for the whole book. Casting is a workflow field, not a code change.
const VOICE = process.env.BOOK_VOICE || 'Bodi';

// 1.0 by default, NOT the podcast's 1.2. 1.2 was chosen for a conversational episode that
// Joshua listens to at 1.5x on top; an audiobook is long-form and is the artifact everyone
// else receives, so it masters at natural pace and lets each listener move the slider.
const SPEED = Number(process.env.TTS_SPEED || 1);
if (!Number.isFinite(SPEED) || SPEED <= 0) {
  console.error('FAIL: TTS_SPEED must be a positive number');
  process.exit(1);
}

// ~600 words is roughly four minutes of speech. Raised from 300 on 2026-10-27: the TTS model is
// capped at 100 requests a day on this account's tier, and the cap counts requests, not audio,
// so bigger chunks fit about twice the book into a day at the same cost. If the voice starts to
// drift late in a chunk, bring this back down.
const CHUNK_WORDS = Number(process.env.BOOK_CHUNK_WORDS || 600);

// Retries. Long unattended runs hit transient 429s and 5xx responses, and a single one should
// not cost a chapter. 4xx other than 429 is NOT retried - a bad request fails identically
// every time, and retrying it just hides the message.
const ATTEMPTS = Number(process.env.API_ATTEMPTS || 5);

// Narrator register. Deliberately not the podcast phrasing: an audiobook is read TO one
// person, over hours, and anything with performance in it wears out fast.
//
// It goes in as a short bracketed tag, not a sentence of instructions (changed 2026-10-27).
// gemini-3.8-flash-tts reads a prose instruction ALOUD - every chunk of the first Chapter 1
// and 2 renders opened with the narrator saying "Read this as a single narrator..." - and it
// also speaks a "Say in a ... voice:" prefix and rejects systemInstruction outright. A tag in
// square brackets steers delivery without being spoken (checked by transcribing the output).
const STYLE = process.env.TTS_STYLE || 'warm, unhurried, intimate narration';

const [chapterPath, chapterId] = process.argv.slice(2);
if (!chapterPath || !chapterId) {
  console.error('usage: node render/render-book.mjs <chapter-path> <chapter-id>');
  console.error('example: node render/render-book.mjs book/chapter-01.txt chapter-01');
  process.exit(1);
}

if (!fs.existsSync(chapterPath)) {
  console.error(`FAIL: chapter file not found at ${chapterPath}`);
  process.exit(1);
}

// Page formatting that must never be spoken. See the note at the top of the file.
function stripPageArtifacts(text) {
  return text
    .replace(/^\s*Tab\s*\d+.*$/gim, '') // Doc tab chrome, not manuscript text
    .replace(/\[Cite:\s*\d+\]/gi, '') // research citation markers - read aloud if left in
    .replace(/\[\d+\]/g, '') // bracketed numerals from the citation pass
    .replace(/^\s*#{1,6}\s*/gm, '') // markdown heading marks
    .replace(/^\s*[-*_]{3,}\s*$/gm, '') // horizontal rules
    .replace(/\*{1,3}/g, '') // emphasis marks
    .replace(/^\s*>\s?/gm, '') // blockquote markers
    .replace(/-{2,}/g, ' ') // dash runs inside a line, "---Begin Forwarded Message---"
    .replace(/^-(?=\S)/gm, '') // leading hyphen on heading song lines, "-Noise (Kenny Chesney, 2016)"
    .replace(/([^\s.!?,;:"'])[ \t]*$/gm, '$1.') // a line with no end mark (heading, subject line, text message) gets a full stop, or it runs into the next sentence once newlines collapse
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Prose punctuation rewritten into speech punctuation. The model obeys these marks literally:
// a colon says "land on this", a semicolon says "hold", a dash says "stress the next thing".
// That is the held-syllable delivery, and it is the single largest reason a read sounds
// robotic. Em dashes and quotes go too.
function normalizeForSpeech(text) {
  return text
    .replace(/\s*[\u2014\u2013]\s*/g, ', ') // em / en dash -> comma
    .replace(/\s*;\s*/g, '. ') // semicolon -> full stop
    .replace(/\s*:(?!\d)\s*/g, ', ') // colon -> comma, except in clock times like 10:31
    .replace(/[\u201C\u201D\u2018\u2019"]/g, '') // quote marks drop out (not the space before them, or 'said. "That' becomes 'said.That')
    .replace(/\s*[()]/g, ' ') // parentheses drop out
    .replace(/\.{2,}/g, '. ') // ellipses collapse
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?])/g, '$1') // no space before a mark, left behind when a parenthesis drops out
    .trim();
}

// Plain find-and-replace overrides for anything the model mispronounces. Written spelling on
// the left, spoken form on the right. Absent file is fine - it means none are settled yet.
function loadSpokenForms() {
  const p = 'scripts/spoken-forms.json';
  if (!fs.existsSync(p)) return {};
  try {
    // The file opens with // comment lines, which JSON.parse rejects, so drop them first.
    const body = fs.readFileSync(p, 'utf8').replace(/^\s*\/\/.*$/gm, '');
    return JSON.parse(body);
  } catch (err) {
    console.error(`FAIL: ${p} exists but is not valid JSON`);
    process.exit(1);
  }
}

function applySpokenForms(text, forms) {
  let out = text;
  for (const [written, said] of Object.entries(forms)) {
    out = out.split(written).join(said);
  }
  return out;
}

// Split at sentence boundaries so a chunk never starts or ends mid-thought, which is audible.
function chunkText(text, maxWords) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim() !== '');
  const chunks = [];
  let current = [];
  let count = 0;

  for (const s of sentences) {
    const n = s.split(/\s+/).filter(Boolean).length;
    if (count > 0 && count + n > maxWords) {
      chunks.push(current.join(' '));
      current = [];
      count = 0;
    }
    current.push(s);
    count += n;
  }
  if (current.length) chunks.push(current.join(' '));
  return chunks;
}

// Retry wrapper. See the note above on which statuses are worth retrying.
async function call(body, label) {
  let last;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const res = await fetch(`${BASE}/${TTS_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify(body),
    });

    if (res.ok) return res.json();

    const detail = await res.text();
    last = `${TTS_MODEL} ${res.status}: ${detail}`;

    if (res.status !== 429 && res.status < 500) {
      console.error(`FAIL: ${label} rejected and will not be retried - ${last}`);
      process.exit(1);
    }

    if (attempt === ATTEMPTS) break;

    // Exponential backoff with jitter, so parallel chunks do not retry in lockstep.
    const wait = 2 ** attempt * 1000 + Math.floor(Math.random() * 1000);
    console.warn(`retry ${attempt}/${ATTEMPTS} for ${label} in ${Math.round(wait / 1000)}s - ${last}`);
    await new Promise(r => setTimeout(r, wait));
  }
  console.error(`FAIL: ${label} gave up after ${ATTEMPTS} attempts - ${last}`);
  process.exit(1);
}

async function voiceChunk(text, label) {
  const res = await call(
    {
      contents: [{ role: 'user', parts: [{ text: `[${STYLE}] ${text}` }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        // Single speaker. There is no second identity in this file by design.
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
      },
    },
    label,
  );

  const part = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!part) {
    console.error(`FAIL: ${label} returned no audio`);
    process.exit(1);
  }
  return Buffer.from(part.inlineData.data, 'base64');
}

// ---------------------------------------------------------------------------------------
// ONE FILE PER PART (added 2026-10-27)
//
// Joshua reviews a chapter by listening and sending corrections part by part, and each part is
// roughly a twelve-minute read. So the chapter is split on its "Part N:" heading lines and each
// part is voiced and written as its own file: out/<id>-part-N.mp3. A chunk never crosses a part
// boundary. Anything before the first part (section and chapter headings, "Before you begin")
// is pushed to the start of Part 1; the closing "Landing" note stays at the end of the last
// part. A chapter with no Part headings renders as a single file, out/<id>.mp3, as before.
//
// Chunks checkpoint per part (out/<id>.chunks/part-N/), so an edit to one part only costs that
// part's chunks on rerun. NOTE: resume is by chunk index, not content. After editing a part,
// delete that part's chunk folder before rerunning, or stale audio is reused.
// ---------------------------------------------------------------------------------------
function splitParts(text) {
  const lines = text.split('\n');
  const starts = [];
  lines.forEach((l, i) => {
    if (/^\s*Part\s+\d+\s*:/i.test(l)) starts.push(i);
  });
  if (starts.length === 0) return [{ label: null, text }];
  return starts.map((start, k) => {
    const from = k === 0 ? 0 : start; // preamble rides with Part 1
    const to = k + 1 < starts.length ? starts[k + 1] : lines.length; // Landing rides with the last part
    const n = lines[start].match(/\d+/)[0];
    return { label: `part-${n}`, text: lines.slice(from, to).join('\n') };
  });
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

function hasFfmpeg() {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const raw = fs.readFileSync(chapterPath, 'utf8');
const forms = loadSpokenForms();
const sections = splitParts(raw).map(s => {
  const spoken = normalizeForSpeech(applySpokenForms(stripPageArtifacts(s.text), forms));
  return { ...s, chunks: chunkText(spoken, CHUNK_WORDS), words: spoken.split(/\s+/).filter(Boolean).length };
});

if (sections.every(s => s.chunks.length === 0)) {
  console.error(`FAIL: ${chapterPath} produced no speakable text`);
  process.exit(1);
}

fs.mkdirSync('out', { recursive: true });
const ffmpeg = hasFfmpeg();

console.log(`chapter: ${chapterId} <- ${chapterPath}`);
console.log(`narrator: ${VOICE}, model: ${TTS_MODEL}, tempo: ${SPEED}x, chunk size: ${CHUNK_WORDS} words`);
console.log(
  `parts: ${sections.map(s => `${s.label ?? 'whole'} ${s.words}w/${s.chunks.length}c`).join(', ')}`,
);
if (!ffmpeg) console.warn('warning: ffmpeg not found - writing WAV only and keeping chunks for a later MP3 pass');

for (const s of sections) {
  const name = s.label ? `${chapterId}-${s.label}` : chapterId;
  const chunkDir = s.label ? path.join('out', `${chapterId}.chunks`, s.label) : path.join('out', `${chapterId}.chunks`);
  fs.mkdirSync(chunkDir, { recursive: true });

  // Proofing artifact. Sight-check this before trusting the audio: markers that survive the
  // strip are inaudible in a log and obvious on the page.
  const spokenPath = path.join('out', `${name}.spoken.txt`);
  fs.writeFileSync(spokenPath, s.chunks.join('\n\n'));

  console.log(`${name}: ${s.words} words in ${s.chunks.length} chunks`);
  const pcms = [];
  let rendered = 0;

  for (let i = 0; i < s.chunks.length; i++) {
    const chunkPath = path.join(chunkDir, `${String(i + 1).padStart(4, '0')}.pcm`);
    if (fs.existsSync(chunkPath)) {
      pcms.push(fs.readFileSync(chunkPath));
      console.log(`  chunk ${i + 1}/${s.chunks.length}: resumed from disk`);
      continue;
    }
    const pcm = await voiceChunk(s.chunks[i], `${name} chunk ${i + 1}`);
    fs.writeFileSync(chunkPath, pcm);
    pcms.push(pcm);
    rendered += 1;
    console.log(
      `  chunk ${i + 1}/${s.chunks.length}: ${s.chunks[i].split(/\s+/).filter(Boolean).length} words, ${pcm.length} bytes`,
    );
  }
  console.log(`  rendered ${rendered} new chunks, ${s.chunks.length - rendered} resumed`);

  // raw PCM (24kHz / 16-bit / mono) -> WAV -> MP3
  const pcm = Buffer.concat(pcms);
  const wavPath = path.join('out', `${name}.wav`);
  fs.writeFileSync(wavPath, wav(pcm));

  // Duration from the PCM itself, so the pace check works with or without ffprobe.
  const seconds = pcm.length / (24000 * 2) / SPEED;
  const wpm = Math.round(s.words / (seconds / 60));
  console.log(`  duration: ${(seconds / 60).toFixed(1)} min, pace: ${wpm} words per minute`);
  // 140-160 spoken words a minute is normal narration. Far outside that range means a chunk
  // was dropped or the text is not what we think it is.
  if (wpm < 110 || wpm > 200) console.warn(`  warning: ${wpm} wpm is outside the normal narration range`);

  if (!ffmpeg) {
    console.log(`  wrote ${wavPath}, ${spokenPath} (chunks kept for the MP3 pass)`);
    continue;
  }

  const mp3Path = path.join('out', `${name}.mp3`);
  const filter = SPEED === 1 ? [] : ['-filter:a', `atempo=${SPEED}`];
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wavPath, ...filter, '-codec:a', 'libmp3lame', '-qscale:a', '4', mp3Path], { stdio: 'inherit' });
  fs.unlinkSync(wavPath);

  // Only clear the checkpoint on success. A failed run keeps its chunks so the rerun resumes.
  fs.rmSync(chunkDir, { recursive: true, force: true });
  console.log(`  wrote ${mp3Path}, ${spokenPath}`);
}
