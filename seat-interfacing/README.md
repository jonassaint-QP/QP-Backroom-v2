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

## Two founder actions outstanding

**One.** Create `_handoff` in Drive with the seven `to-<seat>` folders and `_ledger`, and share it
**Editor** with every seat. Steps in `handoff/README.md`.

**Two.** Extend the 2026-09-21 write grant to **David, Ethan, Michael and Robert**. It covers Jason,
Adam and Mark only. **Nothing here functions until every seat can write to a handoff folder.**

## Secrets

**No token, key or credential appears anywhere in this packet.** The script reads from Script
Properties; the workflow reads from repository secrets.

## Status

**Committed:** the convention, the folders, the ledger, the clock, the templates, the review cadence,
the rule text for the founding documents.

**Not built here, and deliberately:** the Drive side. Folder creation and the sharing grant are
account actions, not repository actions. **A repository cannot create a Drive folder.**
