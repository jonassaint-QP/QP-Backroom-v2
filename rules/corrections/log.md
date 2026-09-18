# Corrections Log

Append-only. This log records errors, corrections, and retirements with dates. It is never edited and never pruned. An entry is added when an error is found, when a rule is changed, and when a decision that had been operative is retired.

A correction is never an overwrite. It states the new position, names the date, and points back to what it supersedes.

---

## 2026-09-18 — Repository rebuilt as QP-Backroom-v2

**What happened.** Predecessor `QP-Backroom` could not be made safe by deletion. A 3 MB export committed 2026-09-17 contained copies of two commercially published workbooks. Removing the file from the working tree did not remove the blob from history, and the branch carrying it was merged to main on 2026-09-17, so the blob became reachable from main's history permanently.

**Correction.** Clean rebuild. No commit or history carried forward. The predecessor is retained and is not a source going forward.

**Supersedes.** All prior history of `QP-Backroom`.

**Standing lesson recorded.** A commit is permanent. The copyright screen and the clinical-data screen both belong at the moment of authoring.

## 2026-09-18 — Language policy file contained no rule

**What happened.** `QP-ICP-LANG-001.md` was 301 bytes and held the policy's name and none of its content.

**Correction.** Rewritten to carry the actual rule, its permitted and banned contexts, and the reason for the distinction.

**Supersedes.** The predecessor version of `rules/policies/QP-ICP-LANG-001.md`.

## 2026-09-18 — Jurisdictional framing in the privacy policy was stale

**What happened.** The anonymisation policy cited the privacy standard of a jurisdiction retired on 2026-09-16.

**Correction.** Substance retained, citation removed, with a note explaining why it was removed rather than retained.

**Supersedes.** The predecessor version of `rules/policies/QP-POL-003.md`.

## 2026-09-18 — Repository name drift in the organisation facts

**What happened.** The organisation facts named a repository that does not exist, drift from a rename that never propagated.

**Correction.** Points at `jonassaint-QP/QP-Backroom-v2`, with a note that any reference to a differently named repository is drift to be corrected rather than followed.

**Supersedes.** The predecessor version of `memory/facts/organization.md`.
