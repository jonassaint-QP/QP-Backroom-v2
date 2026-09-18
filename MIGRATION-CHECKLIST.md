# Migration Checklist

The predecessor repository is currently the only copy of several files. Nothing is lost by the rebuild as long as this checklist is worked before the predecessor is archived or deleted.

Each line below names a file that must be opened, read, checked against the current standards, and then committed here. Files should not be copied blind, because several of them carry the defects this rebuild exists to fix.

## Must be carried over verbatim, checked for content only

`prompts/episode-brief-centaur.md`
`prompts/episode-writer.md`
`prompts/outline.md`
`prompts/personas.md`

These four are the podcast production set and they are in good condition. Carry them as they stand. Two items inside them still need a decision rather than a copy: whether the retired jurisdiction stays as the episode's lived case, and whether the collection of terms of art should be defined in one place rather than referenced only.

## Must be carried over, with the named correction applied on the way in

`rules/policies/QP-POL-003.md` — carry the substance, re-frame the jurisdictional language to the current single-jurisdiction footprint.

`rules/policies/QP-ICP-LANG-001.md` — carry the actual rule, not the placeholder. The predecessor file was 301 bytes and contained the policy's name and none of its content, which is why the rule kept being restated in conversation instead of read from source.

`rules/persona.md` and `prompts/personas.md` — two files, one letter apart, different purposes, nothing ranking either. Rename one before both land here.

`memory/facts/organization.md` — the predecessor version named a repository that does not exist. Point it at this one.

`memory/index.md` — three entries were listed as unreferenced or unresolvable. Resolve or strike each rather than carrying the ambiguity forward.

## Must be read before anything is decided

`schema/turns.json`

This file could not be read from the assistant lane on 2026-09-18 and the outline generator delegates the turn contract to it. It is the one file defining the shape every episode must produce and it is the one file not yet verified. Read it first, then decide whether it lands here unchanged.

## Must not be carried over

Any file containing client identity or clinical detail. The predecessor is not compliant and history is permanent, so a file that cannot be screened should not enter the new history at all.

Any file whose only role was to hold the material that caused the rebuild.

## Open decisions blocking the checklist

Where the roster manifest lives, since the reconciliation job rebalances a directory that holds two specifications against a roster of seven seats.

Whether the repository is added as a read source for the Gem alongside the seat folders, which the architecture document resolves in favour of yes and which needs executing on the platform side.

Which of the two files that both claim the same execution layer is the definition of record.
