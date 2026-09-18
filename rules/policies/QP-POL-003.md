# Policy: Client Identity and Anonymisation

**ID:** QP-POL-003
**Effective Date:** 2026-09-16
**Status:** Active

## The absolute boundary

No client identity, clinical note, session content, diagnosis, medication detail, or scheduling detail enters this repository, the assistant memory layer, any draft, any log, or any chat. Clinical data exists in TherapyNotes and nowhere else.

## Why deletion is not a remedy

Git history is permanent. A file removed from the working tree remains in the history, reachable, forever. A single committed identifier therefore cannot be withdrawn by any later correction, which means the gate belongs at the moment of authoring and not at the moment of review.

## Referencing a client where a reference is unavoidable

Use the naming convention, which is Capital-lowercase-Capital-lowercase, such as JaDo. No other form is permitted outside TherapyNotes.

## Standard of anonymisation

The operative standard is Safe Harbor de-identification combined with irreversible anonymisation: the record must not be re-identifiable by any means reasonably available, including combination with other records.

## Inbound mail

If an incoming email or message carries client identifying health information, it is labelled for quarantine and its content is not output, summarised, or logged anywhere.

## Jurisdictional framing, corrected 2026-09-18

The anonymisation standard above is carried at a level at least as strict as any jurisdiction this practice has operated in. The practice is now Pennsylvania only. Earlier versions of this policy cited the privacy standard of a second jurisdiction; that citation is removed rather than retained, because a policy that names a retired jurisdiction is read as evidence that the jurisdiction is live.
