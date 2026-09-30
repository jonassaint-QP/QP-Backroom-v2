// List every voice the Gemini API will actually accept for TTS.
//
// ---------------------------------------------------------------------------------------
// WHY THIS EXISTS (added 2026-09-30)
//
// A render died with:
//
//   400 INVALID_ARGUMENT - "No matching speaker voice found for name: Bodi and language: "
//
// So we stop guessing and ask the API. See the note on FIELD NAMES below for why the first
// version of this script could not answer the question it was written to answer.
// ---------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------
// FIELD NAMES (fixed 2026-09-30)
//
// The first version read `v.name` for every entry and printed 200 rows of "(no name)". That is
// not a fact about the catalogue - it is a fact about this script. The voice objects returned
// here do not carry their identifier under `name`, so the Bodi check at the end compared
// against undefined two hundred times and reported NOT FOUND. Inconclusive, not a finding.
//
// So: probe every plausible field, print which one hit, and dump raw JSON for the first few
// entries when asked. A lister that cannot name a single voice has to show its work.
//
// Set DUMP_RAW=1 to print the raw objects. Do that first if the field probe comes back empty
// again, because then the shape is genuinely unknown rather than misread.
// ---------------------------------------------------------------------------------------
const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.error('FAIL: GEMINI_API_KEY missing');
  process.exit(1);
}

const BASE = process.env.GEMINI_BASE || 'https://generativelanguage.googleapis.com/v1beta';
const LOOK_FOR = process.env.LOOK_FOR_VOICE || 'Bodi';
const DUMP_RAW = process.env.DUMP_RAW === '1';

async function get(url) {
  const res = await fetch(url, { headers: { 'x-goog-api-key': KEY } });
  const body = await res.text();
  if (!res.ok) {
    console.error(`FAIL: ${url} returned ${res.status}`);
    console.error(body.slice(0, 2000));
    return null;
  }
  try {
    return JSON.parse(body);
  } catch (err) {
    console.error('FAIL: response is not JSON');
    console.error(body.slice(0, 2000));
    return null;
  }
}

const routes = [
  `${BASE}/voices?pageSize=1000`,
  `${BASE}/voices?pageSize=200`,
  `${BASE}/voices`,
  `${BASE}/models?pageSize=200`,
];

let list = null;
let usedRoute = null;

for (const route of routes) {
  const data = await get(route);
  const found = data?.voices ?? data?.models;
  if (Array.isArray(found) && found.length) {
    list = found;
    usedRoute = route;
    break;
  }
}

if (!list) {
  console.error('FAIL: no voice list came back from any known route');
  process.exit(1);
}

console.log(`source: ${usedRoute}`);
console.log(`${list.length} entries`);

// Probe the plausible identifier fields. Whichever one returns a string for most entries is the
// real one, and we say so rather than assuming.
const CANDIDATES = ['name', 'voiceId', 'voice_id', 'id', 'speaker', 'displayName', 'display_name', 'voiceName'];

const scores = CANDIDATES.map(f => ({
  field: f,
  hits: list.filter(v => typeof v[f] === 'string' && v[f] !== '').length,
})).sort((a, b) => b.hits - a.hits);

console.log('');
console.log('field probe (how many entries carry each field as a non-empty string):');
for (const s of scores) console.log(`  ${s.field}: ${s.hits}/${list.length}`);

if (DUMP_RAW) {
  console.log('');
  console.log('raw first 3 entries:');
  for (const v of list.slice(0, 3)) console.log(JSON.stringify(v, null, 2));
  console.log('all keys seen on entry 1:', Object.keys(list[0]).join(', '));
}

const NAME = scores[0].hits > 0 ? scores[0].field : null;
const desc = v => v.description ?? v.displayName ?? v.summary ?? '';
const type = v => v.voiceType ?? v.type ?? v.voice_type ?? '';
const langs = v =>
  Array.isArray(v.supportedLanguages)
    ? ` [${v.supportedLanguages.slice(0, 5).join(', ')}]`
    : Array.isArray(v.languages)
      ? ` [${v.languages.slice(0, 5).join(', ')}]`
      : '';

console.log('');
if (!NAME) {
  console.error('FAIL: no identifier field found on any entry.');
  console.error('note: rerun with DUMP_RAW=1 to see the actual shape before trusting any conclusion.');
  process.exit(1);
}

console.log(`using "${NAME}" as the identifier field\n`);
for (const v of list) {
  console.log(`${v[NAME]}\t${type(v)}${desc(v) ? `\t${desc(v)}` : ''}${langs(v)}`);
}

const hit = list.find(v => String(v[NAME]).toLowerCase().includes(LOOK_FOR.toLowerCase()));
console.log('');
if (hit) {
  console.log(`${LOOK_FOR}: PRESENT as "${hit[NAME]}" - use that exact string.`);
} else {
  console.log(`${LOOK_FOR}: not found under "${NAME}". Check it against the list above before`);
  console.log('concluding anything - if the probe line above shows 0 hits, this told you nothing.');
}
