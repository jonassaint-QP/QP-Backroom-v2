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
│   └── personas.md                     # Locked cast and voice specifications
├── rules/
│   ├── persona.md                      # Core voice and tone specifications
│   ├── labelling.md                    # Inbound mail categorisation logic
│   ├── labelling-PHI.md                # Clinical data handling on inbound mail
│   ├── drafting.md                     # Message structure and sending criteria
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
└── DIRECTORY-MAP.md
```

## What belongs here

Anything that would be true no matter which seat is reading it. The governing rules, the code of conduct, the naming and precedence conventions, the shared vocabulary, the roster, the memory layer, and the version history.

## What does not belong here

Anything specific to one seat's daily work. That goes in the seat's own Drive folder, because it changes often and can be edited by hand in a browser without a commit. And client information never belongs here, because the gate for that sits at the moment of authoring and not at the moment of filing.

## The two things this map exists to catch

A file named for one thing and containing another. That defect has appeared four separate times in the predecessor repository, on the readme, on the language policy, on a privacy policy filed under the wrong identifier, and on a branch named for a body of work it did not contain.

A path referenced but not present. That defect appeared three times, and its danger is specific: a reader who hits a declared-but-missing record concludes the record was lost and recreates it, which manufactures a second version of a decision that already exists.
