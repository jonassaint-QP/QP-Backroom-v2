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

## The three things this map exists to catch

A file named for one thing and containing another. That defect has now appeared five times across the two repositories, on the readme, on the language policy, on a privacy policy filed under the wrong identifier, on a branch named for a body of work it did not contain, and on the outline generator.

A path referenced but not present, whose specific danger is that a reader hitting a declared-but-missing record concludes it was lost and recreates it, manufacturing a second version of a decision that already exists.

A citation marker that asserts a source nobody verified. A pasted artifact of that shape and a fabricated reference are indistinguishable to a reader, which is why they are stripped on the way in rather than left to be discovered.
