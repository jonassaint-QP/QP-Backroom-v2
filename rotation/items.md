# Item register — the rotation

One row per item that enters the pipeline. **No row deleted; a superseded row is marked and left in
place.**

**This is what the stall chase reads.** A stall is arithmetic on these rows: an item whose stage-entry
age has passed its threshold.

| item id | surface | lane | stage | owner | stage entered | status | artifact |
|---|---|---|---|---|---|---|---|
| S-2026-10-02-014 | Instagram | retail | KILLED | eva | 2026-10-02T16:00:00Z | KILLED | queue id 1cccf3b2 |
