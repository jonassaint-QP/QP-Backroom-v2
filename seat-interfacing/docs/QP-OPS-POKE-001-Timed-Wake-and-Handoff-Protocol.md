# QP-OPS-POKE-001 — Timed Wake, Handoff and Pre-Release Currency Review

Version 1.0, built 2026-10-02. Author: Eva, Executive Assistant, at Joshua Jonassaint's direction.
Supersedes: the 2026-09-26 draft of the same name, which specified this and did not build it.

**Status: built. Two founder actions outstanding — see Status at the close.**

Classification: Internal. Contains no credentials, no client identifiers, no protected health information.

---

## The requirement

**Seats must be able to ask each other for what they need and get it, without the founder standing in
the middle.** He does not want to be a bottleneck and does not want to be the person who notices that
something changed.

**And nothing goes out carrying a fact nobody re-checked.** A post, a page or a price written thirty
days ago is a claim about a business that has moved since. The review he asked for is: *has anything
changed since I wrote this, before it goes out* — not on the morning of release.

## The problem being solved

A Gem has no clock. **It reads its folder when it is invoked and not before**, so a file placed in a
folder sits until something reads it. That is correct for a conversational assistant and wrong for a
working team of seven that hands work to each other.

**The poke is the missing clock.**

---

## One — where it runs, and why not in the Gem

**The poke cannot live inside a seat, because nothing runs inside a seat between prompts.** It lives
at the orchestration layer, on infrastructure the business already owns.

**Primary: Google Workspace Apps Script with a time-driven trigger.** It runs inside the existing
business associate agreement, holds a five-minute cadence reliably, reads Drive file metadata
directly, needs no secret to reach Drive, and survives repository inactivity.

**Fallback: a repository scheduled workflow.** Viable but weaker. The documented cadence floor is five
minutes, runs are delayed under load so a five-minute schedule drifts to ten or fifteen, and
**scheduled workflows are disabled after a period of repository inactivity, which would silently kill
the protocol.** Provided as `apps-script/fallback-workflow.yml` and not recommended.

## Two — what a poke actually does

**A poke does not wake the model.** It checks three things and spends nothing unless one is true:

**A new file in that seat's handoff folder** — a file identifier the ledger has not seen before.

**A modified timestamp on that seat's own working state files** — operating specification, calendar
state, signal register.

**A task or calendar item due to that seat at or before the current time.**

**If none is true the poke ends.** No model call, no read of content, no output of any kind. Recorded
in the ledger as `unchanged` and nothing else.

**This is why the check is on metadata rather than on content.** It is the difference between a
protocol that costs a rounding error and one that costs two thousand model invocations a day.

**Where a poke finds work, it writes a wake marker into the seat's own folder** and records the action
in the ledger. **The seat does the work when it is next invoked**, reading the marker. The poke cannot
invoke the seat: no API in this architecture can start a Gem conversation.

## Three — staggering

**Seven seats waking in the same second will collide on quota and produce intermittent failures that
read as flakiness rather than as load.** Seats are offset across the five-minute window.

| Minute | Seat |
|---|---|
| :00 | Jason |
| :01 | Adam |
| :02 | Mark |
| :03 | David |
| :04 | Ethan |
| :05 | Michael |
| :06 | Robert |

## Four — the quiet rule

**A poke that finds nothing produces nothing.** No status message, no confirmation, no heartbeat, no
summary that says work was checked and none found.

Two thousand pokes a day, most finding nothing, would otherwise produce two thousand messages, and
**the protocol would be switched off within a week for drowning the person it was built for.**

**Silence is the correct output of a negative check.** Where a record is wanted, the ledger holds it.

## Five — the act rule

**A poke is a wake and not an authorization.** It does not permit a publish, an unschedule, a deletion
or any other act that a standing rule reserves to the founder.

**Every guard that exists today continues to govern what a woken seat may do, and waking changes none
of them.**

## Six — the ledger

**One line per poke.** Timestamp, seat, changed or unchanged, and the action taken if any.

It exists so the protocol can be audited and **so that its failure is visible rather than silent.**
Held at `handoff/_ledger/ledger.md`.

---

## Seven — the request convention

**There is no messaging rail in this architecture and none is designed.** A seat asks another seat for
something by placing a request file in the receiving seat's handoff folder.

**Required fields: request id, from, to, one question, needed by, artifact expected.**

**One question per file.** A file containing two questions is two files and will be returned
unanswered.

**A response carries the request id, the answer, the artifact it rests on, and its date.** **A response
without an artifact is recorded as relayed, never as verified.**

**A request that cannot be answered is returned with a reason, not silence** — one line: what was
tried, what stopped it, whether someone else can close the gap.

**A request is never an authorization.**

## Eight — the pre-release currency review

**Nothing publishes or releases without a currency review recorded against it.** Five questions, in
order:

**Is the fact still true?** A rate, a price, a jurisdiction, an address, a phone number, a storefront
state, a licence number, a service still being sold. **Checked against a source, not against the
copy.**

**Is the destination still live?** Every link fetched, not assumed. **A dark destination fails the
item regardless of how good the copy is.**

**Does the item still match the business as it is now?** **An item is not cleared by having been
correct when it was written.**

**Is the copy still within its lane?** No clinical claim on a retail surface, no retail apparatus on a
clinical one.

**Is the contact block still clean?** Website only. No phone, no email, no licence number, no physical
practice address on any public surface.

### When it runs

**Thirty days out** — a standing re-read of anything scheduled or drafted more than thirty days ahead.
This is the review that stops a September assumption reaching an October audience.

**Seven days out** — a sweep of everything queued, re-read against current state.

**Seventy-two hours out** — the pre-flight. **Every item, always, whether or not anything changed.**
The last point at which a decision can still stop an item.

**Immediately on any change of business state** — a lane closed, a jurisdiction suspended, a
destination dark, a service retired, a processor changed — **re-sweep everything queued.**

### Who runs it and who checks the checker

**The seat that owns the item runs the review and records it. A second seat verifies it and is named
in the record.**

**The founder is notified only on a fail, in one line, with the failing test named.** A pass produces
nothing, because **a check that reports success for a living is a check that gets switched off.**

**The review may report. It may not release.**

---

## Secrets

**No token, key or credential appears anywhere in this packet.** The Apps Script reads what it needs
from Script Properties; the fallback workflow reads from repository secrets. **A key that lands in a
file is compromised by definition, and nothing in this estate can redact history.**

## Status at build

**Built and committed:** the folders, the ledger, the clock, the request and response templates, the
review cadence, the rule text.

**Outstanding, both founder actions:** the Drive folder creation, and the extension of the 2026-09-21
write grant to David, Ethan, Michael and Robert. **Nothing in this protocol functions until every seat
can write to a handoff folder.**
