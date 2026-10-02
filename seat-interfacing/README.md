# QP — Seat Interfacing

**A seat hands work to another seat by writing a file into that seat's handoff folder, and a
five-minute clock wakes each seat in turn to check whether anything arrived.**

Built 2026-10-02 at Joshua Jonassaint's direction, because a Gem has no clock: it reads its folder
when it is invoked and not before, so a file placed in a folder sits until something reads it.

## Layout

```
seat-interfacing/docs/                 the specification, the request and response templates
seat-interfacing/handoff/to-<seat>/    seven folders, one per receiving seat
seat-interfacing/handoff/_ledger/      the poke ledger
seat-interfacing/apps-script/Code.gs   the clock
seat-interfacing/apps-script/fallback-workflow.yml   the weaker fallback, not recommended
```

## The four rules that keep this alive

**Quiet** — a poke that finds nothing produces nothing.
**Act** — a poke is a wake, not an authorization.
**Metadata** — a poke never reads content to decide whether to wake.
**Artifact** — a response without an artifact is recorded as relayed, never verified.

## The access path, corrected 2026-10-02

**All seven seats run under one Google account**, so there is no per-seat sharing grant and nothing to
change from Viewer to Editor. **What gates a seat's write is that a Gem cannot create or save a file
— it holds no write tool.** No sharing setting fixes that.

**So the rail is one Drive write path, not seven grants.** A component holding write under the same
account files a seat's output into `to-<seat>`. The Apps Script is the recommended one: it already
holds write and already writes the ledger. Full table in `handoff/README.md`.

## Founder actions outstanding

**One.** Create `_handoff` in Drive with the seven `to-<seat>` folders and `_ledger`. Steps in
`handoff/README.md`.

**Two.** Decide which component files on behalf of the seats, and extend it to write into `to-<seat>`.
**A rail nobody has tested is a rail nobody has.**

## Secrets

**No token, no key or credential appears anywhere in this packet.** The script reads from Script
Properties; the workflow reads from repository secrets.

## Status

**Committed:** the convention, the folders, the ledger, the clock, the templates, the review cadence,
the rule text for the founding documents.

**Not built here, and deliberately:** the Drive side. Folder creation is an account action, not a
repository action. **A repository cannot create a Drive folder.**
