# Handoff folders — the convention and the access path

## The convention

**One folder per receiving seat: `to-<seat>/`.** A seat writes into *another* seat's folder. It does
not need a `from-` folder, because the folder it writes into is the record of what it sent.

**One question per file.** A file containing two questions is two files. The fields, and the response
format, are in `docs/request-template.md` and `docs/response-template.md`.

**Nothing notifies a seat that a file has arrived.** There is no signal, no flag and no alert. **A
handoff is not complete when the file lands. It is complete when the receiving seat next opens its
folder** — and the poke is what guarantees that happens within five minutes rather than whenever
somebody happens to ask.

## The access path — corrected 2026-10-02

**An earlier version of this file said the 2026-09-21 grant covered Jason, Adam and Mark only, and
that David, Ethan, Michael and Robert needed it extended. That was wrong in a way worth recording,**
because a successor reading it would have gone looking for a sharing change that does not exist.

**Founder confirmation, 2 October: all seven seats run under one Google account.** There is no
per-seat login, so there is no per-seat sharing grant, so there is nothing to change from Viewer to
Editor. **The 2026-09-21 grant is superseded by this correction, not extended by it.**

**What actually gates a seat's write is that a Gem cannot create or save a file.** It holds no write
tool. A seat can draft, reason and answer; it cannot put a file anywhere. **That is not a permissions
problem and no sharing setting fixes it.**

**So the handoff rail is not seven grants. It is one.** A seat's output travels to a receiving seat
through a component that holds Drive write under the same account. Three candidates, in order of
preference:

**One — the Apps Script from QP-OPS-POKE-001.** It already holds Drive write, already runs on the
account, and already writes the ledger. **Extend it to accept a draft and file it into the correct
`to-<seat>` folder.** This is the option that needs no new account and no new subscription.

**Two — the coordinator seat.** An agent that holds Drive write summarises, rewrites and files on
behalf of a seat that cannot. **This is the manual relay, and it works today.**

**Three — an IDE session on this account** (Antigravity or Gemini CLI), which holds Drive write for
the duration of a session. **Good for filing, poor as a rail** — it runs when the machine runs.

| Component | Drive write | Always on | Can file a seat's output |
|---|---|---|---|
| Apps Script (QP-OPS-POKE-001) | Yes | Yes | **Yes, once extended** |
| Coordinator seat | Yes | Yes | **Yes, today** |
| IDE session | Yes | No | Yes, while open |
| A Gem | **No** | — | **No. It holds no write tool.** |

## Founder steps — Drive side, not in this repository

**1.** Create a folder named `_handoff` in the shared Drive area.

**2.** Inside it, create seven folders: `to-jason`, `to-adam`, `to-mark`, `to-david`, `to-ethan`,
`to-michael`, `to-robert`. One `_ledger` folder for the ledger file.

**3.** Add the folder to each seat's Gem as a knowledge source, alongside its seat folder and the
shared rules folder. **Read is the only access a Gem needs, and read is what it has.**

**4.** **Decide which component files on behalf of the seats**, and extend it to write into
`to-<seat>`. The Apps Script is the recommended answer, because it already holds write and already
writes the ledger.

**5.** Confirm the rail with one test: have a seat produce a file and watch it land in a `to-<seat>`
folder. **A rail nobody has tested is a rail nobody has.**

## What this correction changes for the rotation

The rotation is not seven seats wide with five unable to record. **It is seven seats with one Drive
write path between them**, and whether a seat can open a stage log or ping a blocker depends on
extending that one path — not on seven sharing changes.
