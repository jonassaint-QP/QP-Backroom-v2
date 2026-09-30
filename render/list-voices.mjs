// List every voice the Gemini API will actually accept for TTS.
//
// ---------------------------------------------------------------------------------------
// WHY THIS EXISTS (added 2026-09-30)
//
// A render died with:
//
//   400 INVALID_ARGUMENT - "No matching speaker voice found for name: Bodi and language: "
//
// Bodi appears in AI Studio's voice picker. It is a display name for an audition slot, not
// necessarily a name the generateContent endpoint accepts, and in this case it is not one.
// Meanwhile Fenrir and Orus - the two voices the FIRST successful voice test used - are both in
// the documented prebuilt list. That is the tell: the file that rendered used API-valid names,
// and the one that failed used a name that only exists in the Studio UI.
//
// Guessing at valid names is worse than asking. This script asks. Run it once, take the list,
// and cast from that list from then on.
//
// Prebuilt voices cannot be fetched individually (GetVoice does not serve them) - they are only
// available by listing, which is what this does.
// ---------------------------------------------------------------------------------------
const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.error('FAIL: GEMINI_API_KEY missing');
  process.exit(1);
}

// v1beta, matching the endpoint the renderer uses. The voice library lives alongside the model
// routes rather than under /models/{model}.
const BASE = process.env.GEMINI_BASE || 'https://generativelanguage.googleapis.com/v1beta';

// A name worth checking against the catalogue, since it is the one that just failed.
const LOOK_FOR = process.env.LOOK_FOR_VOICE || 'Bodi';

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

// Try the documented voice library first, then the alternative shapes, so a route rename on
// Google's side is answered with evidence rather than an assumption about which one moved.
const routes = [`${BASE}/voices?pageSize=200`, `${BASE}/voices`, `${BASE}/models?pageSize=200`];

let voices = null;
let usedRoute = null;

for (const route of routes) {
  const data = await get(route);
  const list = data?.voices ?? data?.models;
  if (Array.isArray(list) && list.length) {
    voices = list;
    usedRoute = route;
    break;
  }
}

if (!voices) {
  console.error('FAIL: no voice list came back from any known route');
  console.error('note: if every route 404s, the voice library may need a different API version');
  process.exit(1);
}

console.log(`source: ${usedRoute}`);
console.log(`${voices.length} entries\n`);

// Print the machine-readable part of each entry. Prebuilt voices carry the usable name; voice
// design entries carry a voice_... id, which is what a custom narrator would be referenced by.
for (const v of voices) {
  const name = v.name ?? '(no name)';
  const type = v.voiceType ?? v.type ?? '';
  const desc = v.description ?? v.displayName ?? '';
  const langs = Array.isArray(v.supportedLanguages) ? ` [${v.supportedLanguages.slice(0, 4).join(', ')}]` : '';
  console.log(`${name}\t${type}${desc ? `\t${desc}` : ''}${langs}`);
}

const hit = voices.find(v => (v.name ?? '').toLowerCase().includes(LOOK_FOR.toLowerCase()));
console.log('');
if (hit) {
  console.log(`\n${LOOK_FOR}: PRESENT as "${hit.name}" - use that exact string.`);
} else {
  console.log(`\n${LOOK_FOR}: NOT in this list. It is an AI Studio display name, not an API voice.`);
  console.log('Cast from the names above instead.');
}
