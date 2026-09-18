# Rebuild Note

**Date:** 2026-09-18
**Repository:** QP-Backroom-v2
**Predecessor:** QP-Backroom, retained but not to be used as a source going forward

## Why the rebuild

On 2026-09-17 a 3 MB export file was committed to the predecessor repository. It contained copies of two commercially published workbooks, *The DBT Skills Training Manual* and *The DBT Skills Workbook for Teens*, alongside the Marblism employee backup data.

The file was later removed from the working tree. That did not solve the problem, for one reason worth stating plainly because it is the same reason the repository exists at all: **removing a file from the working tree does not remove it from git history.** Every version of every file ever committed is retained permanently. The file therefore remained reachable from the predecessor's history.

Two further facts made it worse rather than better. The branch carrying the file was merged into main on 2026-09-17, so the blob became reachable from main's history rather than only from a side branch. And the predecessor's own source register had warned against exactly that merge, giving this reason, so the warning was correct and was overtaken by the merge.

Because a blob cannot be withdrawn from history by any later commit, the only ways out were a history rewrite or a clean rebuild. The founder chose the rebuild on 2026-09-18.

## What this rebuild changes

No commit and no history carries forward from the predecessor. That is the point of it.

Four defects identified in the 2026-09-18 review are corrected here rather than repeated: the directory map now names the podcast prompt set, the ai directory, and the schema directory, and it no longer references a configuration file or a decisions folder that do not exist; the jurisdictional framing in the privacy policy is current rather than naming a retired jurisdiction; the language policy file now contains the rule it is named for rather than only the title; and the corrections log begins with this rebuild as its first dated entry rather than being empty.

## What this rebuild does not do

It does not carry over any file that could not be read and verified first. Anything not yet present is named in `MIGRATION-CHECKLIST.md` rather than estimated, because a file reproduced from memory is worse than a missing file: it will pass a check while being wrong.

It does not delete the predecessor. Deletion is a separate decision, taken after the checklist is worked, because the predecessor is currently the only copy of several files.

## The standing lesson

A commit is permanent. There is no undo. The gate has to sit at the moment of authoring, which is why the PHI screen and the copyright screen belong before a file is staged rather than after it is pushed.
