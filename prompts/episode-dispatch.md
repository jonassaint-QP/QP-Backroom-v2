# Standing Episode Dispatch

**Purpose.** The reusable instruction for producing an episode. Nothing here changes between episodes except the four bracketed fields. This file exists so that episode production does not depend on remembering how it works.

**Filed 2026-09-29. Supersedes all turn-by-turn instruction in chat.**

---

## The two things that run an episode

**The writer prompt** — `prompts/episode-writer.md`. Permanent. It tells the model how to write the script, the length, the format, the rules. It does not change between episodes, and it does not need to be re-supplied.

**The brief** — one file per episode in `prompts/`. This is what changes. It carries the beats, the section split, the cast, the terms of art, the exclusions and the call to action.

**That is the whole system.** A brief in, an episode out. There is no third thing and nothing is written by hand downstream of the brief.

---

## The brief has two authors

**Jason holds the clinical lane.** The literature, mechanisms, definitions, the terms of art and how they fit, the procedural sequence, the two-viewpoint dialectic, the picture-painting, and the hedging on anything a listener could read as clinical guidance.

**David holds the editorial lane.** Structure, beat order, copy standards, format, the concrete example, the plain-language translation, the counter-argument, the gut check.

**A beat with no lane assigned arrives thin.** That is the failure that has produced every short render, so the lane is named per beat before the brief is cleared.

---

## Clearance, before dispatch

Editorial clears structure first. Compliance clears content second. Only then does the render run.

The render is a single pass producing script and audio together, so there is no script waiting to be cleared afterwards, and a compliance failure found after the render only means the render was already spent.

After the render, the output is verified against the brief — but that is verification, not clearance. Where the output departs from a cleared brief, correct the brief and re-render. An uncleared departure is never published.

---

## The prompt to give the writing seat, per episode

> Write the production brief for episode [NUMBER] of Unmapped Terrain, on the topic of [TOPIC].
>
> File it at `prompts/episode-brief-[SLUG].md`.
>
> **Assign a lane to every beat.** Jason's beats carry the clinical material — the mechanism, the definition, the term of art and how it fits the framework, the procedural sequence, the two viewpoints, the picture-painting. David's beats carry the editorial material — the concrete example, the plain-language translation, the counter-argument, the gut check. A beat with no lane named will arrive thin, so name it.
>
> **Give each beat enough to carry a full exchange.** A mechanism, a concrete example, a practical detail, a counter-argument the other host can push against. The writer can only produce as much as the beats give it — a heading becomes a summarised line, and summarising is what produces short scripts.
>
> **Design for the three-section cut.** The renderer slices the script into three equal parts, so each section must stand alone at 1,800–2,150 words. Section one: cold open plus beats one and two. Section two: beats three and four. Section three: beats five and six plus the closing.
>
> **Include in the brief:** the target (36–40 minutes, 5,400–6,400 words, 145–175 turns), the cast and locked voice identifiers (David on Fenrir, Jason on Orus), the pause ceiling (200–400 ms, realised through punctuation), the required terms of art, the exclusions, and the primary call to action.
>
> **The call to action is the comma form** — Adjourn the Courtroom, Book Your Intake Assessment — at the close of the episode only, never mid-episode.
>
> **Excluded entirely:** the Dignity Investment block. This is production material, not a published article.
>
> **No unsupported numeric claims.** Describe a proportion in language rather than attaching a percentage.
>
> When the brief is written, state which beats belong to which lane, and hand it to editorial review. Do not write the script, and do not write JSON — the renderer writes the script from this brief.

---

## The dispatch itself

The render workflow on `main` takes two inputs: **the brief path** and **the episode ID**.

**Before dispatch, check two things that fail the run on the first call:** the API key is present and billing is live.

**If the run errors on the model name**, that is the voice model identifier in the workflow file going stale — preview model names get retired. It is a one-line change to the current model name and it is not a code problem.

---

## What to check when it comes back

**Word count per section, stated separately.** Not an episode total. A total reads healthy while one section is thin.

**The count is a reconciliation.** The figure reported and the figure reproduced from the output must agree. Within seven words is counting variance. Beyond seven, the difference is a sentence somebody wrote, and the question becomes what it says and whether the practice will put its name behind it.

**Every beat covered, in order. The terms of art present. The call to action at the close only. No unsupported numeric claims.**

*Filed by Eva, Executive Assistant. No client identifiers, no credentials, no clinical detail and no financial content appear in this document.*
