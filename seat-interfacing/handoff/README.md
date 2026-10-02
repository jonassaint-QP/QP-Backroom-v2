# Handoff folders — the convention and the access grant

## The convention

**One folder per receiving seat: `to-<seat>/`.** A seat writes into *another* seat's folder. It does
not need a `from-` folder, because the folder it writes into is the record of what it sent.

**One question per file.** A file containing two questions is two files. The fields, and the response
format, are in `docs/request-template.md` and `docs/response-template.md`.

**Nothing notifies a seat that a file has arrived.** There is no signal, no flag and no alert. **A
handoff is not complete when the file lands. It is complete when the receiving seat next opens its
folder** — and the poke is what guarantees that happens within five minutes rather than whenever
somebody happens to ask.

## The access grant — the one piece that blocks everything

**Folder write and Drive organisation were granted on 2026-09-21 to Jason, Adam and Mark only.**
David, Ethan, Michael and Robert were not included.

**Until that grant is extended to all seven, this protocol is unbuildable**, because a seat that
cannot write to a folder cannot hand anything to anyone.

| Seat | Write to handoff folders | Status |
|---|---|---|
| Jason | Yes | Granted 2026-09-21 |
| Adam | Yes | Granted 2026-09-21 |
| Mark | Yes | Granted 2026-09-21 |
| David | **No** | **Grant needed** |
| Ethan | **No** | **Grant needed** |
| Michael | **No** | **Grant needed** |
| Robert | **No** | **Grant needed** |

## Founder steps — Drive side, not in this repository

**1.** Create a folder named `_handoff` in the shared Drive area the team already reads.

**2.** Inside it, create seven folders: `to-jason`, `to-adam`, `to-mark`, `to-david`, `to-ethan`,
`to-michael`, `to-robert`. One `_ledger` folder for the ledger file.

**3.** Share `_handoff` with each seat's account with **Editor** access. **Editor on the parent is
what makes a seat able to write into its own and into others' folders.**

**4.** Confirm the four missing seats can write by having one of them create a test file and delete it.

**5.** Add the folder to each seat's Gem as a knowledge source, alongside its seat folder and the
shared rules folder.
