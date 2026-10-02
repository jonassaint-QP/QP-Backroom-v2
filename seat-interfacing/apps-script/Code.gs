// QP-OPS-POKE-001 — Timed Wake and Handoff
// Queer Pathways. Built 2026-10-02.
//
// A five-minute clock that wakes each seat in turn and checks whether anything
// has arrived for it. It never reads content to decide whether to wake.
//
// INSTALL
//   1. Project Settings > Script Properties. Add HANDOFF_ROOT = <Drive folder id of _handoff>.
//   2. Add SEAT_<NAME>_FOLDER = <Drive folder id of that seat's working folder>, per seat.
//      Missing entries are skipped, not fatal.
//   3. Add NOTIFY_EMAIL = <address to notify on found work only>.
//   4. Triggers > Add Trigger > timeDriven > every 5 minutes.
//
// DESIGN NOTES THAT ARE NOT OPTIONAL
//   The quiet rule    - nothing found, nothing output. No heartbeat, no summary.
//   The act rule      - this script wakes; it never publishes, unschedules or deletes.
//   The metadata rule - it inspects identifiers and timestamps, never file contents.

var SEATS = ['jason', 'adam', 'mark', 'david', 'ethan', 'michael', 'robert'];
var STAGGER = { jason: 0, adam: 1, mark: 2, david: 3, ethan: 4, michael: 5, robert: 6 };

function poke() {
  var props = PropertiesService.getScriptProperties();
  var rootId = props.getProperty('HANDOFF_ROOT');
  if (!rootId) return;

  var minute = new Date().getMinutes();
  for (var i = 0; i < SEATS.length; i++) {
    var seat = SEATS[i];
    if (minute % 7 !== STAGGER[seat]) continue;   // staggered: never seven at once
    try {
      pokeSeat(rootId, seat, props);
    } catch (err) {
      log(rootId, seat, 'error', String(err));     // a silent failure is the failure mode
    }
  }
}

function pokeSeat(rootId, seat, props) {
  var ledger = readLedger(rootId);
  var reasons = [];

  // One. a file in this seat's handoff folder that the ledger has not seen
  var incoming = childFolder(rootId, 'to-' + seat);
  if (incoming) {
    var files = incoming.getFiles();
    while (files.hasNext()) {
      var f = files.next();
      if (!ledger.seen[f.getId()]) reasons.push('file ' + f.getName() + ' (' + f.getId() + ')');
    }
  }

  // Two. a modified timestamp on the seat's own working state files
  var workingId = props.getProperty('SEAT_' + seat.toUpperCase() + '_FOLDER');
  if (workingId) {
    try {
      var wf = DriveApp.getFolderById(workingId).getFiles();
      while (wf.hasNext()) {
        var w = wf.next();
        if (w.getLastUpdated().getTime() > ledger.lastRun) {
          reasons.push('state changed: ' + w.getName());
        }
      }
    } catch (e) { /* folder not shared with the script account; skip */ }
  }

  // Three. a due task
  try {
    var now = new Date();
    var soon = new Date(now.getTime() + 5 * 60 * 1000);
    var tasks = Tasks.Tasks.list('@default', { showCompleted: false, maxResults: 50 }).items || [];
    for (var t = 0; t < tasks.length; t++) {
      var due = tasks[t].due ? new Date(tasks[t].due) : null;
      if (due && due <= soon && String(tasks[t].title).toLowerCase().indexOf(seat) !== -1) {
        reasons.push('task due: ' + tasks[t].title);
      }
    }
  } catch (e) { /* Tasks not authorised on this account; skipped by design */ }

  // The quiet rule. Nothing found, nothing recorded beyond one ledger line.
  if (reasons.length === 0) {
    log(rootId, seat, 'unchanged', '');
    return;
  }

  // Found work: write a wake marker the seat will read on next invocation.
  var marker = 'WAKE-' + seat + '-' + Utilities.formatDate(new Date(), 'Etc/UTC', 'yyyyMMdd-HHmm') + '.md';
  var body = '# Wake marker\n\nSeat: ' + seat + '\nTimestamp: ' + new Date().toISOString() +
    '\n\nThe five-minute clock found the following for you:\n\n' +
    reasons.map(function (r) { return '- ' + r; }).join('\n') +
    '\n\nOpen your handoff folder and act. This marker authorises nothing: it is a wake, not a\n' +
    'clearance. Any act reserved to the founder remains reserved.\n';
  var seatFolder = childFolder(rootId, 'to-' + seat);
  if (seatFolder) seatFolder.createFile(marker, body, MimeType.PLAIN_TEXT);

  log(rootId, seat, 'changed', reasons.join(' | '));

  // Notify only on found work. A fail is news; a pass is not.
  var to = props.getProperty('NOTIFY_EMAIL');
  if (to) {
    MailApp.sendEmail(to, 'QP wake: ' + seat, reasons.join('\n'));
  }
}

/* ---- helpers ---- */

function childFolder(rootId, name) {
  var it = DriveApp.getFolderById(rootId).getFoldersByName(name);
  return it.hasNext() ? it.next() : null;
}

function readLedger(rootId) {
  var seen = {};
  var lastRun = 0;
  var lf = childFolder(rootId, '_ledger');
  if (!lf) return { seen: seen, lastRun: lastRun };
  var files = lf.getFilesByName('ledger.md');
  if (!files.hasNext()) return { seen: seen, lastRun: lastRun };
  var text = files.next().getBlob().getDataAsString();
  var lines = text.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var m = lines[i].match(/^\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]*)\|/);
    if (m) {
      lastRun = Math.max(lastRun, Date.parse(m[1]) || 0);
      var ids = m[4].match(/\(([^)]+)\)/g) || [];
      for (var j = 0; j < ids.length; j++) seen[ids[j].replace(/[()]/g, '')] = true;
    }
  }
  return { seen: seen, lastRun: lastRun };
}

function log(rootId, seat, state, action) {
  var lf = childFolder(rootId, '_ledger');
  if (!lf) return;
  var files = lf.getFilesByName('ledger.md');
  var row = '| ' + new Date().toISOString() + ' | ' + seat + ' | ' + state + ' | ' + action + ' |\n';
  if (files.hasNext()) {
    var f = files.next();
    f.setContent(f.getBlob().getDataAsString() + row);
  } else {
    lf.createFile('ledger.md',
      '| timestamp | seat | changed | action |\n|---|---|---|---|\n' + row, MimeType.PLAIN_TEXT);
  }
}
