# Directory Map

Three layers, and this map covers the first one. What follows describes what belongs in this repository, as opposed to a seat folder or the interface that reads them.

```
QP-Backroom/
├── .github/
│   └── workflows/
│       ├── eod-reconciliation.yml      # End-of-day memory and rules reconciliation
│       └── run-verification.yml        # Operational verification of the rule set
├── agents/
│   ├── triage-agent.md                 # Agent scope, limits, and memory bindings
│   └── drafting-agent.md
├── ai/
│   └── run-verify.yml                  # Verification runner definition
├── memory/
│   ├── index.md                        # Entry point map for human and model parsing
│   ├── facts/
│   │   └── organization.md             # Non-clinical operational truths
│   ├── people/
│   ├── projects/
│   │   └── decisions/
│   └── archive/                        # Superseded entries, forward-linked
├── prompts/
│   ├── episode-brief-centaur.md        # Episode brief and production constraints
│   ├── episode-writer.md               # Script generation prompt
│   ├── outline.md                      # Outline generator
│   └── personas.md                     # Locked podcast cast and voice specifications
├── rules/
│   ├── voice-and-tone.md               # Written voice for every seat that produces text
│   ├── drafting.md                     # Message structure and sending criteria
│   ├── labelling.md                    # Inbound mail categorisation logic
│   ├── labelling-PHI.md                # Clinical data handling on inbound mail
│   ├── replies.md                      # Skip versus respond rules
│   ├── archiving.md                    # Auto-filing constraints
│   ├── meetings.md                     # Calendar preference rules
│   ├── policies/
│   │   ├── QP-POL-002.md               # Clinical firewall between the two lanes
│   │   ├── QP-POL-003.md               # Client identity and anonymisation
│   │   └── QP-ICP-LANG-001.md          # Language and boundary rule
│   └── corrections/
│       ├── log.md                      # Append-only error and correction log
│       └── eod-checklist.md
├── schema/
│   └── turns.json                      # Turn contract for episode output
├── README.md
├── REBUILD-NOTE.md
├── MIGRATION-CHECKLIST.md
├── DIRECTORY-MAP.md
└── ROSTER.md
```

## Two naming collisions resolved on 2026-09-18

The written-voice sheet was named `rules/persona.md` while the locked cast sheet is named `prompts/personas.md`. One letter apart, different subjects, nothing ranking either, and a reader or a model arriving at either could not tell which governed what. The written-voice sheet is now `rules/voice-and-tone.md`. The cast keeps `prompts/personas.md`, because its name is referenced by the writer prompt and the turn contract and the locked cast is the more permanent of the two.

A privacy policy was also mislabelled with the identifier of a different policy. It was flagged rather than silently renumbered, and the identifier still needs confirming.

## What belongs here

Anything that would be true no matter which seat is reading it. The governing rules, the code of conduct, the naming and precedence conventions, the shared vocabulary, the roster, the memory layer, and the version history.

## What does not belong here

Anything specific to one seat's daily work, which goes in the seat's own Drive folder because it changes often and can be edited by hand in a browser without a commit. And clinical information never belongs here, because the gate sits at the moment of authoring and not at the moment of filing.

## Precedence between the three layers (added 2026-09-22)

There are three places a fact can live, and until now nothing ranked them. It does now, and the ranking does not change with how impressive or how lengthy any of them is.

**The repository is authoritative on the governing rules and the canonical record.** It is version-controlled, every change is dated and attributable, a superseded entry can be point-forwarded, and a claim can be checked against the commit that made it. This is the only layer that can hold a rule.

**The seat folder is authoritative on that seat's live daily state.** It belongs to one seat, it is edited by hand in a browser without a commit, and it is where the dated files describing present operating state belong, including Calendar State and Signal Register. A seat must be able to update its own operating state at any time, and the seat folder is where it does so.

**NotebookLM is a derivative historical corpus and holds no authority over current state.** It is a static synthesis environment that grows by acquisition. It has no native tools, it cannot write a tombstone, it cannot clear a scheduled task, and it cannot observe a state change on any platform. It is read for long-form themes, clinical frameworks, and subcultural research, and it is never read to establish what is true now. Where a notebook entry conflicts with a dated seat-folder entry, the dated entry wins automatically. Where it conflicts with a governing rule, the rule wins and the conflict is reported.

**Why this needs a written rule rather than good intentions.** A language model has no internal clock. Repetition reads as authority, so a retired jurisdiction documented across dozens of older briefs will outrank a single newer dated decision unless something explicitly forbids it. That is the documented mechanism by which retired footprints and legacy coordinates kept returning as live scope. Volume is not currency and recency is not authority; only the dated, attributable record is either.

**The boundary applies to every seat, not to one.** Any seat holding a notebook or any other acquired corpus treats it as background. No seat sources an operational claim to it, no seat treats a passage from it as a dated instruction, and no seat resolves a conflict with it by choosing the version it has seen more often.

## The three things this map exists to catch

A file named for one thing and containing another. That defect has now appeared five times across the two repositories, on the readme, on the language policy, on a privacy policy filed under the wrong identifier, on a branch named for a body of work it did not contain, and on the outline generator.

A path referenced but not present, whose specific danger is that a reader hitting a declared-but-missing record concludes it was lost and recreates it, manufacturing a second version of a decision that already exists.

A citation marker that asserts a source nobody verified. A pasted artifact of that shape and a fabricated reference are indistinguishable to a reader, which is why they are stripped on the way in rather than left to be discovered.
