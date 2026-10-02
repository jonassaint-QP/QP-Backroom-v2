# QP-OPS-RELAY-001 — Item Rotation and Stall Chase

Version 1.0, 2026-10-02. Author: Eva, Executive Assistant, at Joshua Jonassaint's direction.
Companion to: **QP-OPS-POKE-001** (the clock and the handoff convention) and the **Social Publication
Gate** (the seven tests).
Classification: Internal. No client identifiers, no protected health information.

**Status: built. Two founder actions outstanding — see section six.**

---

## The correction this file is written against

**A rotation was set and a different thing was built.** What was asked for was not a schedule of who
checks whose output. It was this:

**An item enters the pipeline, rotates through the seats that must look at it, and comes back out the
other side with a decision.** Ethan wants to post. He needs an image. It goes to Adam and David. Then
it comes back: **go post.**

**And alongside it, one seat whose standing job is to ask: is anything sitting at a gate, stuck, and
what does it need.**

**And the point of both is that the founder is not the one who unsticks it.** He does not want to
workshop the problem with a seat every time something jams. **He wants a mechanism that keeps trying.**

---

## One — an item is a folder, not a file

**The unit that travels is an item folder:** `items/<ITEM-ID>/`, containing the copy, the assets and a
single stage log.

**The asset travels with the copy.** An image separated from the text it belongs to is how a post
publishes with the wrong picture, or with a picture that was never cleared.

**The stage log is append-only.** One line per stage entry and exit, with a name and a date. **No stage
log, no rotation** — an item that cannot be tracked cannot be chased.

```
items/S-2026-10-02-014/
  copy.md          the text, verbatim, as it will publish
  assets/          the image or images, cleared with the copy
  stage-log.md     append-only: stage, entered, exited, by whom, decision
```

## Two — the rotation, seat to seat

**Routes, by content. The item does not need to know why it is going; the route does.**

| Item type | Route |
|---|---|
| Social post | author → editorial → compliance → release → **author publishes** |
| Clinical-facing copy | author → Jason → Adam → release |
| Retail copy | author → editorial → Adam → release |
| Financial record | author → Mark → release |

**The item returns to the author with the decision attached.** That return is the thing described:
**go post.**

**Parallel review is one item, one log, one decision.** Adam and David may both read at once, and only
the stage's owner writes the outcome. **Two seats writing the decision is how an item gets cleared
twice and challenged never.**

## Three — what counts as stalled

**A stall is not a feeling. It is an item whose stage has not advanced inside its threshold**, or a
stage that advanced with no decision recorded against it.

| Stage | Threshold before it is stalled |
|---|---|
| INTAKE | 24 hours |
| EDITORIAL | 48 hours |
| COMPLIANCE | 72 hours |
| FOUNDER | 7 days — **reported, not chased** |

**Terminal states are never stalled:** CLEARED, HELD, KILLED.

**The founder's stage is deliberately generous and the reason is structural.** Everything else in this
pipeline can be unstuck by a seat without him. **His stage cannot, because release is his by rule.**
So it is reported on the weekly sweep rather than chased hourly, and the design goal is to keep his
stage **rare** — reserved for release, money and legal, and emptied of everything a seat can decide.

## Four — the chaser, and the rotation that was meant

**One seat on duty per day, rotating across the seven in the same order as the poke stagger.** Its
standing job, once per sweep:

**Read the item register. Name every stalled item. Ping the seat that is blocking it. Record the ping.**

**It clears nothing.** It is a chaser. The act rule is unchanged: a chaser cannot release, unmock, delete
or correct.

**Sunday's seat runs the weekly sweep** across everything published, queued or filed in the preceding
seven days.

## Five — the unstick ladder

**This is the part that keeps the founder out of the middle.**

**One — nudge the blocker.** A request file into the blocking seat's handoff folder, with a needed-by
and the artifact expected. The clock picks it up within five minutes.

**Two — route around.** If the ping is unanswered at the next sweep, the chaser asks a **second seat
who can answer instead**. Most jams are a seat that is dormant, and a dormant seat is not a reason for
the work to stop.

**Three — escalate, one line, and only now.** If the second seat cannot answer either, it reaches the
founder: **the item, the stage, the blocker, and what it needs.** One line. **Not a thread.**

**And if the blocker is a missing integration or a missing capability**, the chaser records that as the
finding rather than looping. **A jam caused by no capability is not chased; it is named and it goes to
the build list.**

## Six — the integration question, answered plainly

**Nobody has one, and it does not need to be bought.**

**There is no seat-to-seat messaging integration in this estate and none is offered by any platform it
runs on.** What exists is the Drive folder plus the five-minute clock, and that *is* the integration —
it is the one already paid for.

**What the stall chase needs from it is almost nothing:** the item register already records stage and
stage-entry date, because the rotation writes it. **A stall is arithmetic on rows that are already
being written.**

**What is genuinely missing is not capability but access.** Four seats cannot write to a folder, so
four seats cannot open a stage log or ping a blocker. **The rotation is seven seats wide and five of
them currently cannot record anything.**

## Seven — the answer to "can we design it ourselves"

**Yes. It is code on the same clock, and the code is written.**

`StallDetect.gs` reads the item register, compares stage-entry age against the threshold for that
stage, writes the stalled rows, and notifies **the chaser only**. It shares the Apps Script project and
the five-minute trigger with QP-OPS-POKE-001.

**No new subscription. No new account. No key.** The first pass runs on the same Apps Script that is
already specified, reading the same Drive.

---

## What is not solved by this document

**A dormant seat cannot be woken by a file.** The clock can see that work arrived; it cannot make a
seat read it. **The route-around in step two of the ladder is the remedy for exactly that**, and it is
a rule rather than a mechanism: the chaser must ask someone else rather than wait.

**The founder's stage stays a floor on throughput.** The ladder shortens everything else; it cannot
shorten the one stage where the release authority sits. **The lever there is scope, not speed** —
keeping his stage to release, money and legal.
