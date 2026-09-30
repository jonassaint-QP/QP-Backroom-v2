// Bank linking via Plaid. Two lanes, two Items, never one.
//
// ---------------------------------------------------------------------------------------
// WHY THIS EXISTS (added 2026-09-30)
//
// The question was whether the estate can link to a bank, and the answer is Plaid, with two
// caveats that shape this whole file.
//
//   1. The four items on the Plaid dashboard - select products, choose plan, verify business,
//      submit request - are not complete, so the account is in SANDBOX. Every institution
//      linked in sandbox returns test data. Real TransPecos and Found feeds are not reachable
//      yet, and two of those four items are business verification and billing rather than
//      engineering.
//   2. Plaid is not a tool this seat can call. There is no Plaid connector on the platform, so
//      nothing here can be driven from chat. This script is the plumbing instead: it runs in
//      the repo, against credentials held as write-only secrets.
//
// Sandbox is still the right place to build. Linking against fake institutions now means
// production is a credential swap rather than a first attempt, and nobody debugs against real
// money.
// ---------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------
// THE FIREWALL APPLIES TO THE CONNECTIONS, NOT JUST THE OUTPUT (added 2026-09-30)
//
// Two lanes means two Plaid Items - one for TransPecos, one for Found - and never a single Item
// covering both banks. A connection spanning both banks nets the lanes one layer below any
// report, and a rule enforced only at the reporting layer is not enforced at all.
//
// So every output in this script is per-lane and there is no code path that totals them. The
// summary at the end prints two counts and no combined figure, deliberately. A blended number
// is the financial expression of a crossed lane.
// ---------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------
// THE ACCESS TOKEN IS THE SECRET, AND IT IS NOT THE ONLY ONE (added 2026-09-30)
//
// Plaid's client ID is not sensitive. The SECRET and every ACCESS TOKEN are. An access token is
// a standing read of a bank account with no expiry and no second factor, which makes it the
// most dangerous value in this workspace.
//
// Rules, and they are not stylistic:
//   - secrets come from the environment only, never a literal in this file
//   - the token is redacted before anything is logged, including inside error bodies
//   - nothing writes a token to out/ - artifacts are downloadable and effectively public
//   - if a token ever reaches a commit, ROTATE IT in the Plaid dashboard. Deleting the commit
//     is not a fix, because git history keeps it and a commit is permanent.
//
// Note what does NOT pass through this estate: bank usernames and passwords. That is the point
// of Link - credentials go to Plaid directly and are never seen, stored or proxied here.
// ---------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------
// WHY LINK ITSELF IS NOT IN THIS FILE (added 2026-09-30)
//
// Plaid Link is a browser flow - a human opens it, picks their institution, authenticates. It
// cannot run inside a GitHub Action, so the production path is: run Link once per bank, take
// the resulting access token, and store it as a secret.
//
// Sandbox has a shortcut that exercises the same exchange and sync path without a browser:
// /sandbox/public_token/create mints a public token for a test institution headlessly. So this
// script runs end to end in CI today, and the only thing that changes in production is where
// the access token comes from.
// ---------------------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';

const CLIENT_ID = process.env.PLAID_CLIENT_ID;
const SECRET = process.env.PLAID_SECRET;
const ENV = process.env.PLAID_ENV || 'sandbox';

if (!CLIENT_ID || !SECRET) {
  console.error('FAIL: PLAID_CLIENT_ID and PLAID_SECRET must both be set (write-only secrets)');
  process.exit(1);
}

if (!['sandbox', 'production'].includes(ENV)) {
  console.error(`FAIL: PLAID_ENV must be sandbox or production, got "${ENV}"`);
  process.exit(1);
}

// The seat cannot move money and neither can this script. It reads. Refusing to run against
// real balances by accident is the whole reason this guard exists.
if (ENV === 'production' && process.env.ALLOW_PRODUCTION !== '1') {
  console.error('FAIL: production is not enabled. Set ALLOW_PRODUCTION=1 only once the four');
  console.error('dashboard items are complete, Link has been run per bank, and the tokens are');
  console.error('stored as secrets. Until then, sandbox answers the same engineering questions.');
  process.exit(1);
}

const HOST = ENV === 'production' ? 'https://production.plaid.com' : 'https://sandbox.plaid.com';

// The two lanes. Institution ids are sandbox test institutions; in production these are unused
// because the access token already names the item.
const LANES = [
  {
    key: 'lane1-transpecos',
    label: 'Lane 1 - retail storefront (KURV/PaymentCloud -> TransPecos)',
    sandboxInstitution: process.env.PLAID_LANE1_INSTITUTION || 'ins_109508',
    tokenEnv: 'PLAID_ACCESS_TOKEN_LANE1',
  },
  {
    key: 'lane2-found',
    label: 'Lane 2 - clinical services (Cardpointe/First Data -> Found Bank)',
    sandboxInstitution: process.env.PLAID_LANE2_INSTITUTION || 'ins_109509',
    tokenEnv: 'PLAID_ACCESS_TOKEN_LANE2',
  },
];

// Redaction. Error bodies from Plaid can echo the request back, access token included, so the
// token is scrubbed from anything printed rather than trusted not to appear.
function redact(s) {
  let out = String(s);
  for (const t of [SECRET, ...LANES.map(l => process.env[l.tokenEnv])]) {
    if (t && t.length > 6) out = out.split(t).join('[redacted]');
  }
  return out.replace(/access-[a-z0-9-]+/gi, 'access-[redacted]');
}

async function post(endpoint, body) {
  const res = await fetch(`${HOST}${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, secret: SECRET, ...body }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${endpoint} ${res.status}: ${redact(text).slice(0, 600)}`);
  }
  return JSON.parse(text);
}

// Production tokens come from Link and live in secrets. Sandbox mints its own.
async function accessTokenFor(lane) {
  const existing = process.env[lane.tokenEnv];
  if (existing) {
    console.log(`  token: from ${lane.tokenEnv}`);
    return existing;
  }

  if (ENV === 'production') {
    console.error(`FAIL: ${lane.key} has no ${lane.tokenEnv}. Run Link once for this bank and`);
    console.error('store the resulting access token as that secret before running production.');
    process.exit(1);
  }

  const { public_token } = await post('/sandbox/public_token/create', {
    institution_id: lane.sandboxInstitution,
    initial_products: ['transactions'],
  });
  const { access_token, item_id } = await post('/item/public_token/exchange', { public_token });
  console.log(`  token: minted in sandbox from ${lane.sandboxInstitution} (item ${item_id})`);
  return access_token;
}

function csv(rows, columns) {
  const escape = v => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(','), ...rows.map(r => columns.map(c => escape(r[c])).join(','))].join('\n');
}

fs.mkdirSync(path.join('out', 'plaid'), { recursive: true });

console.log(`plaid: ${HOST}`);
console.log(`${LANES.length} lanes, each one its own Item. Outputs are never combined.\n`);

const summary = [];

for (const lane of LANES) {
  console.log(`${lane.key} - ${lane.label}`);

  const accessToken = await accessTokenFor(lane);

  const { accounts } = await post('/accounts/get', { access_token: accessToken });

  // transactions/sync without a cursor returns the full history. A cursor belongs in durable
  // storage, and a CI runner is ephemeral, so this run is a full pull by design - fine for a
  // statement-sized read and deliberately not pretending to be incremental.
  const sync = await post('/transactions/sync', { access_token: accessToken });
  const transactions = sync.added ?? [];

  const accountRows = accounts.map(a => ({
    account_id: a.account_id,
    name: a.name,
    official_name: a.official_name ?? '',
    type: a.type,
    subtype: a.subtype ?? '',
    mask: a.mask ?? '',
  }));

  const txRows = transactions
    .map(t => ({
      date: t.date,
      name: t.name,
      amount: t.amount,
      account_id: t.account_id,
      pending: t.pending,
      transaction_id: t.transaction_id,
    }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const accountPath = path.join('out', 'plaid', `${lane.key}.accounts.csv`);
  const txPath = path.join('out', 'plaid', `${lane.key}.transactions.csv`);
  fs.writeFileSync(accountPath, csv(accountRows, ['account_id', 'name', 'official_name', 'type', 'subtype', 'mask']));
  fs.writeFileSync(txPath, csv(txRows, ['date', 'name', 'amount', 'account_id', 'pending', 'transaction_id']));

  console.log(`  accounts: ${accountRows.length}`);
  console.log(`  transactions: ${txRows.length}`);
  console.log(`  wrote ${accountPath} and ${txPath}\n`);

  summary.push({ key: lane.key, accounts: accountRows.length, transactions: txRows.length });
}

// Two lines, two counts, no total. See the firewall note at the top of this file.
console.log('summary (per lane, never combined):');
for (const s of summary) console.log(`  ${s.key}: ${s.accounts} accounts, ${s.transactions} transactions`);
console.log('\nNo blended figure is produced anywhere in this script, by design.');
