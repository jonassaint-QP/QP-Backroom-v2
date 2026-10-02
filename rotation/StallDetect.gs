/**
 * QP-OPS-RELAY-001 — Stall detection and the chaser rotation
 * Queer Pathways. Built 2026-10-02.
 *
 * Runs on the same Apps Script project and the same five-minute trigger as
 * QP-OPS-POKE-001. It reads the item register, finds items whose stage has not
 * advanced inside its threshold, writes them to the stalled register, and
 * notifies the chaser seat only.
 *
 * It chases. It never clears, releases, unmocks, deletes or corrects anything.
 *
 * INSTALL
 *   Shares Script Properties with Code.gs. Add:
 *     CHASER_EMAIL = <address of the seat on duty today>
 *   No credential beyond what Code.gs already reads.
 *
 * DESIGN NOTES
 *   The founder stage is REPORTED, never chased. Release is his by rule, so
 *   chasing it buys nothing. The lever there is scope, not speed.
 *   A jam caused by a missing capability is recorded as a finding, not looped.
 */

var THRESHOLDS_HOURS = {
  INTAKE:     24,
  EDITORIAL:  48,
  COMPLIANCE: 72,
  FOUNDER:    168   // 7 days - reported, not chased
};

var TERMINAL = { CLEARED: true, HELD: true, KILLED: true };

// Same order as the poke stagger, so a successor reads one system, not two.
var CHASER_ROTATION = ['jason', 'adam', 'mark', 'david', 'ethan', 'michael', 'robert'];

function stallDetect() {
  var props = PropertiesService.getScriptProperties();
  var rootId = props.getProperty('HANDOFF_ROOT');
  if (!rootId) return;

  var items = readItems(rootId);
  if (!items.length) return;

  var now = new Date();
  var stalled = [];

  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (TERMINAL[it.stage]) continue;

    var threshold = THRESHOLDS_HOURS[it.stage];
    if (!threshold) continue;

    var ageHours = (now.getTime() - it.stageEntered.getTime()) / 36e5;
    if (ageHours < threshold) continue;

    stalled.push({
      id: it.id,
      stage: it.stage,
      owner: it.owner,
      hours: Math.round(ageHours),
      over: Math.round(ageHours - threshold)
    });
  }

  // The quiet rule. Nothing stalled, nothing output, one ledger line.
  if (!stalled.length) {
    logStall(rootId, 'none', '');
    return;
  }

  writeStalledRegister(rootId, stalled);

  // Notify the chaser only. The founder is not on this list by design.
  var chaser = chaserToday();
  var to = props.getProperty('CHASER_EMAIL');
  if (to) {
    var body = stalled.map(function (s) {
      return '- ' + s.id + '  stage ' + s.stage + '  blocked on ' + s.owner +
             '  ' + s.hours + 'h in stage (' + s.over + 'h past threshold)';
    }).join('\n');
    MailApp.sendEmail(to,
      'QP stall chase - ' + stalled.length + ' item(s) - ' + chaser + ' on duty',
      body + '\n\nNudge the blocker. If unanswered at the next sweep, route around to a second\n' +
             'seat. Escalate to the founder only if neither can answer - one line, not a thread.\n' +
             'A jam caused by a missing capability is recorded as a finding, not chased.');
  }

  logStall(rootId, 'found', stalled.map(function (s) { return s.id; }).join(' | '));
}

/* --- the unstick ladder, recorded so a chaser knows which rung it is on --- */

function recordNudge(rootId, itemId, blocker, bySeat) {
  appendItemStageLog(rootId, itemId,
    '| ' + new Date().toISOString() + ' | CHASE | nudged ' + blocker + ' | ' + bySeat + ' |');
}

function recordRouteAround(rootId, itemId, secondSeat, bySeat) {
  appendItemStageLog(rootId, itemId,
    '| ' + new Date().toISOString() + ' | CHASE | routed around to ' + secondSeat + ' | ' + bySeat + ' |');
}

function recordEscalation(rootId, itemId, blocker, bySeat) {
  appendItemStageLog(rootId, itemId,
    '| ' + new Date().toISOString() + ' | CHASE | escalated - ' + blocker + ' unanswered | ' + bySeat + ' |');
}

/* --- helpers --- */

function chaserToday() {
  var dow = new Date().getDay();               // 0 = Sunday
  var idx = (dow + 6) % 7;                     // Monday = 0, so Monday starts the rotation
  return CHASER_ROTATION[idx];
}

function readItems(rootId) {
  var out = [];
  var f = fileIn(childFolder(rootId, '_ledger'), 'items.md');
  if (!f) return out;
  var lines = f.getBlob().getDataAsString().split('\n');
  for (var i = 0; i < lines.length; i++) {
    var c = lines[i].split('|');
    if (c.length < 8) continue;
    if (/^\s*[-:]+\s*$/.test(c[1])) continue;                 // header rule
    if (c[1].trim() === 'item id') continue;                  // header
    var entered = Date.parse(c[6]);
    if (!entered) continue;
    out.push({
      id: c[1].trim(), surface: c[2].trim(), owner: c[5].trim(),
      stage: c[4].trim().toUpperCase(), stageEntered: new Date(entered)
    });
  }
  return out;
}

function writeStalledRegister(rootId, stalled) {
  var lf = childFolder(rootId, '_ledger');
  if (!lf) return;
  var f = fileIn(lf, 'stalled.md');
  var header = '| detected | item id | stage | blocked on | hours in stage | past threshold |\n|---|---|---|---|---|---|\n';
  var rows = stalled.map(function (s) {
    return '| ' + new Date().toISOString() + ' | ' + s.id + ' | ' + s.stage + ' | ' +
           s.owner + ' | ' + s.hours + ' | ' + s.over + ' |\n';
  }).join('');
  if (f) {
    f.setContent(f.getBlob().getDataAsString() + rows);
  } else {
    lf.createFile('stalled.md', '# Stall register\n\n' + header + rows, MimeType.PLAIN_TEXT);
  }
}

function appendItemStageLog(rootId, itemId, row) {
  var items = childFolder(rootId, 'items');
  if (!items) return;
  var it = items.getFoldersByName(itemId);
  if (!it.hasNext()) return;
  var f = fileIn(it.next(), 'stage-log.md');
  if (f) f.setContent(f.getBlob().getDataAsString() + row + '\n');
}

function childFolder(rootId, name) {
  var it = DriveApp.getFolderById(rootId).getFoldersByName(name);
  return it.hasNext() ? it.next() : null;
}

function fileIn(folder, name) {
  if (!folder) return null;
  var it = folder.getFilesByName(name);
  return it.hasNext() ? it.next() : null;
}

function logStall(rootId, state, action) {
  var lf = childFolder(rootId, '_ledger');
  if (!lf) return;
  var f = fileIn(lf, 'ledger.md');
  var row = '| ' + new Date().toISOString() + ' | stall-chase | ' + state + ' | ' + action + ' |\n';
  if (f) f.setContent(f.getBlob().getDataAsString() + row);
}
