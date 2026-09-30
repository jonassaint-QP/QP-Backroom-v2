// List every voice the Gemini API will actually accept for TTS.
//
// ---------------------------------------------------------------------------------------
// WHY THIS EXISTS (added 2026-09-30)
//
// A render died with:
//
//   400 INVALID_ARGUMENT - "No matching speaker voice found for name: Bodi and language: "
//
// So we stop guessing and ask the API instead.
// ---------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------
// FIELD NAMES, RESOLVED (2026-09-30)
//
// Two versions of this script were wrong before this one, and both errors are worth recording
// because they were both about reading the response rather than about the API.
//
//   1. v1 read `v.name`. The REST response has no `name` field, so every row printed
//      "(no name)" and the Bodi check compared against undefined 200 times. The script then
//      reported NOT FOUND, which looked like a finding and was actually a bug.
//
//   2. v2 probed a list of candidate fields and would have found `id` - but it still printed
//      header rows before the probe, so a reader could take the table at face value.
//
// Per the Voices API reference, ListVoices returns Voice objects with snake_case fields:
//
//   id            For PREBUILT voices this IS the speaker name (e.g. Puck, Charon). For custom
//                 voices it is a generated `voice_...` id. This is the value a synthesis call
//                 wants, which is the whole point of listing.
//   display_name  A human label. NOT what synthesis accepts.
//   type          prebuilt | prompted | replicated
//   description, pitch, gender, accent, context, language_code, persona
//
// So `id` is the identifier, and `display_name` is the friendly label. They are not
// interchangeable and only one of them renders audio.
// ---------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------
// FILTERS (added 2026-09-30)
//
// The catalogue is 200 entries and most of them are not English. ListVoices accepts filters,
// so the useful way to find a narrator is to ask for the shape rather than to read the list:
//
//   context=Audiobook   optimal usage context
//   pitch=low           low | medium | high
//   gender=male         female | male | neutral
//   accent=American
//   search=<substring>  matched against display_name and description
//
// Set any of them as workflow inputs. Routing a question to the API beats reading 200 rows.
// ---------------------------------------------------------------------------------------
const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.error('FAIL: GEMINI_API_KEY missing');
  process.exit(1);
}

const BASE = process.env.GEMINI_BASE || 'https://generativelanguage.googleapis.com/v1beta';
const LOOK_FOR = process.env.LOOK_FOR_VOICE || 'Bodi';
const DUMP_RAW = process.env.DUMP_RAW === '1';

// Filters. Empty string means unset, so a blank workflow input does not become a filter.
const filters = {
  type: process.env.VOICE_TYPE || 'prebuilt',
  context: process.env.VOICE_CONTEXT || '',
  pitch: process.env.VOICE_PITCH || '',
  gender: process.env.VOICE_GENDER || '',
  accent: process.env.VOICE_ACCENT || '',
  search: process.env.VOICE_SEARCH || '',
  language_code: process.env.VOICE_LANGUAGE || '',
};

const query = Object.entries(filters)
  .filter(([, v]) => v !== '')
  .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
  .join('&');

async function get(url) {
  const res = await fetch(url, { headers: { 'x-goog-api-key': KEY } });
  const body = await res.text();
  if (!res.ok) return { error: `${res.status}: ${body.slice(0, 600)}` };
  try {
    return { data: JSON.parse(body) };
  } catch (err) {
    return { error: 'response is not JSON' };
  }
}

// page_size as the API spells it, max 1000. The earlier version sent pageSize, which is not the
// documented parameter name and silently returned the default page.
const routes = [
  `${BASE}/voices?page_size=1000${query ? `&${query}` : ''}`,
  `${BASE}/voices${query ? `?${query}` : ''}`,
  `${BASE}/voices?page_size=1000`,
];

let list = null;
let usedRoute = null;

for (const route of routes) {
  const { data, error } = await get(route);
  if (error) {
    console.warn(`route failed: ${route}\n  ${error}`);
    continue;
  }
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
console.log(`filters: ${query || '(none)'}`);
console.log(`${list.length} entries`);

if (DUMP_RAW) {
  console.log('\nraw first entry, so the shape is on the record:');
  console.log(JSON.stringify(list[0], null, 2));
  console.log(`all keys on entry 1: ${Object.keys(list[0]).join(', ')}\n`);
}

// Completion tokens cap the table. The filters are the tool for a big list; this is just a guard
// against a 1000-row log that nobody reads. Set SHOW_ALL=1 to override.
const LIMIT = process.env.SHOW_ALL === '1' ? list.length : Number(process.env.ROW_LIMIT || 60);

console.log('');
for (const v of list.slice(0, LIMIT)) {
  // id is the value synthesis accepts. Fall back to whichever field is present so a shape
  // change shows up as a wrong-looking label rather than a silent empty column.
  const id = v.id ?? v.display_name ?? '(no id)';
  const label = v.display_name && v.display_name !== id ? ` (${v.display_name})` : '';
  const bits = [v.type, v.pitch && `pitch=${v.pitch}`, v.gender, v.context, v.accent]
    .filter(Boolean)
    .join(' ');
  console.log(`${id}${label}\t${bits}${v.description ? `\t${v.description}` : ''}`);
}

if (list.length > LIMIT) {
  console.log(`\n... ${list.length - LIMIT} more not shown. Narrow with filters, or set SHOW_ALL=1.`);
}

// The Bodi question, answered explicitly. If the id column above is populated and Bodi is not
// in it, the answer is real.
const populated = list.filter(v => v.id).length;
const hit = list.find(v => String(v.id ?? '').toLowerCase() === LOOK_FOR.toLowerCase());
const loose = list.find(v => JSON.stringify(v).toLowerCase().includes(LOOK_FOR.toLowerCase()));

console.log('');
if (populated === 0) {
  console.error('INCONCLUSIVE: no entry carried an id, so nothing was actually checked.');
  console.error('Rerun with dump_raw=1 before drawing any conclusion.');
  process.exit(1);
}

console.log(`${populated}/${list.length} entries carried an id, so the table above is real.`);
if (hit) {
  console.log(`\n${LOOK_FOR}: PRESENT. id = "${hit.id}" - that exact string is what synthesis wants.`);
} else if (loose) {
  console.log(`\n${LOOK_FOR}: not an id, but appears somewhere in this entry:`);
  console.log(JSON.stringify(loose, null, 2));
} else {
  console.log(`\n${LOOK_FOR}: not present under the current filters.`);
  console.log('note: the filters above are applied to this check too.');
}
