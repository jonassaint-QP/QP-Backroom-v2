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
//      linked in sandbox returns test data. Real feeds are not reachable yet, and two of those
//      four items are business verification and billing rather than engineering.
//   2. Plaid is not a tool this seat can call. There is no Plaid connector on the platform, so
//      nothing here can be driven from chat. This script is the plumbing instead: it runs in
//      the repo, against credentials held as write-only secrets.
// ---------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------
// BOTH LANES SETTLE AT FOUND, AND FOUND HOLDS TWO ACCOUNTS (corrected 2026-09-30)
//
// Earlier the same day this file assumed Lane 1 settled at TransPecos. That was the retail
// settlement account, and it CLOSED on 2026-09-30 after ninety days with no transfer - closed
// for inactivity, not for cause, because the storefront is suspended and the retail lane has
// never traded.
//
// Founder direction: the seat is linked to the FOUND bank, which holds TWO accounts, and then
// to the KURV processor. So the destination for both lanes is Found.
//
// THIS IS THE DANGEROUS CASE, AND IT IS WHY THIS FILE IS STRUCTURED THE WAY IT IS. Two lanes
// whose money lands at ONE institution is exactly the situation where a single connection sweeps
// both. A Plaid Item at Found can expose every account the credentials can see, which would put
// the clinical sub-account and the commercial account in one feed - a lane crossing at the
// connection layer, one layer below any report, where no reconciliation would ever reveal it.
//
// So: Link must be run TWICE against Found, selecting a different account each time, and the two
// resulting access tokens are kept in two separate secrets. Two Items, two tokens, two files.
// Never one Item covering both accounts. If a single Item is ever created that can see both,
// that Item is the incident, not the configuration.
// ---------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------
// BUT PLAID CANNOT READ THE PROCESSOR (added 2026-09-30)
//
// KURV is a payment processor, not a bank. Plaid reads bank accounts through bank credentials
// and has no route into a merchant processor. So the processor side of this seat's work does
// not come from this script at all.
//
// Processor data arrives as settlement reports - the PaymentCloud/KURV notices already landing
// in the mailbox, referencing the merchant MID - and those are read as documents. Plaid gives
// the bank truth; the settlement report gives the processor truth; reconciliation is the diff
// between them. Neither source can substitute for the other, and a reconciliation that checks
// one against itself is a formatting exercise.
//
// TWO MIDs APPEAR IN THE RECORD, FROM TWO DIFFERENT MERCHANT ACCOUNTS. The clinical account was
// opened in error and closed; the e-commerce merchant is the live one. Before any processor
// figure is reconciled, confirm which MID belongs to the live merchant - reconciling against a
// closed account's reports is silent and produces a clean-looking figure that means nothing.
// ---------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------
// THE FIREWALL APPLIES TO THE CONNECTIONS, NOT JUST THE OUTPUT (added 2026-09-30)
//
// Every output in this script is per-lane and there is no code path that totals them. The
// summary at the end prints one line per active lane and no combined figure, deliberately. A
// blended number is the financial expression of a crossed lane.
//
// Note this rule does NOT become optional now that the retail lane is quiet. The live pressure
// runs the other way: the standing temptation is to route a commercial charge through the
// clinical processor "just this once", and that is precisely the exposure the firewall prevents.
// ---------------------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------------------
// THE ACCESS TOKEN IS THE SECRET, AND IT IS NOT THE ONLY ONE (added 2026-09-30)
//
// Plaid's client ID is not sensitive. The SECRET and every ACCESS TOKEN are. An access token is
// a standing read of a bank account with no expiry and no second factor, which makes it the most
// dangerous value in this workspace.
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

// The seat cannot move money and neither can this script. It reads.
if (ENV === 'production' && process.env.ALLOW_PRODUCTION !== '1') {
  console.error('FAIL: production is not enabled. Set ALLOW_PRODUCTION=1 only once the four');
  console.error('dashboard items are complete, Link has been run per account, and the tokens are');
  console.error('stored as secrets. Until then, sandbox answers the same engineering questions.');
  process.exit(1);
}

const HOST = ENV === 'production' ? 'https://production.plaid.com' : 'https://sandbox.plaid.com';

// One entry per ACCOUNT, not per institution, and that distinction is the whole firewall here.
// Both lanes are at Found, so two entries share an institution and differ only in which account
// their token was authorised for. Each has its own token secret and its own output files.
const LANES = [
  {
    key: 'lane1-commercial',
    label: 'Lane 1 - retail storefront (KURV/PaymentCloud -> Found, commercial account)',
    enabled: process.env.LANE1_ENABLED === '1',
    note: 'Found commercial account. The former TransPecos settlement account closed 2026-09-30.',
    sandboxInstitution: process.env.PLAID_LANE1_INSTITUTION || 'ins_109508',
    tokenEnv: 'PLAID_ACCESS_TOKEN_LANE1',
    accountEnv: 'PLAID_ACCOUNT_LANE1',
  },
  {
    key: 'lane2-clinical',
    label: 'Lane 2 - clinical services (Cardpointe/First Data -> Found, clinical sub-account)',
    enabled: process.env.LANE2_ENABLED !== '0',
    note: null,
    sandboxInstitution: process.env.PLAID_LANE2_INSTITUTION || 'ins_109509',
    tokenEnv: 'PLAID_ACCESS_TOKEN_LANE2',
    accountEnv: 'PLAID_ACCOUNT_LANE2',
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
    console.error(`FAIL: ${lane.key} has no ${lane.tokenEnv}. Run Link once for THIS ACCOUNT`);
    console.error('and store the resulting access token as that secret. Both lanes are at Found, so');
    console.error('Link runs twice and selects a different account each time.');
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
console.log(`${LANES.length} lanes, one ACCOUNT each. Outputs are never combined.\n`);

const summary = [];

for (const lane of LANES) {
  if (!lane.enabled) {
    console.log(`${lane.key} - SKIPPED`);
    if (lane.note) console.log(`  ${lane.note}`);
    console.log('  no statement is pulled, so nothing can be reconciled against nothing.\n');
    summary.push({ key: lane.key, skipped: true });
    continue;
  }

  console.log(`${lane.key} - ${lane.label}`);

  const accessToken = await accessTokenFor(lane);
  const { accounts } = await post('/accounts/get', { access_token: accessToken });

  // Guard against the crossing this whole file exists to prevent. If the token's item can see
  // accounts that belong to the OTHER lane, the firewall is broken at the source and the run
  // stops rather than producing a clean-looking but crossed statement.
  const expected = process.env[lane.accountEnv];
  if (expected && !accounts.some(a => a.account_id === expected)) {
    console.warn(`  WARNING: ${lane.tokenEnv} cannot see the expected account ${expected}.`);
    console.warn('  Check which account Link authorised before using this output.\n');
  }

  const visibleOther = lane.key === 'lane1-commercial' ? process.env.PLAID_ACCOUNT_LANE2 : process.env.PLAID_ACCOUNT_LANE1;
  if (visibleOther && accounts.some(a => a.account_id === visibleOther)) {
    console.error(`FAIL: ${lane.tokenEnv} can see the other lane's account ${visibleOther}.`);
    console.error('This Item spans both lanes. Revoke it and re-run Link for one account only.');
    process.exit(1);
  }

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

// One line per lane, no total. See the firewall note at the top of this file.
console.log('summary (per lane, never combined):');
for (const s of summary) {
  console.log(s.skipped ? `  ${s.key}: skipped (no account linked)` : `  ${s.key}: ${s.accounts} accounts, ${s.transactions} transactions`);
}
console.log('\nNo blended figure is produced anywhere in this script, by design.');
console.log('Processor side (KURV/PaymentCloud) does not come from Plaid - read the settlement reports.');
