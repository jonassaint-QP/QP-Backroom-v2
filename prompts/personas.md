# QP-Backroom Personas — Locked Cast

Voice IDs are LOCKED. Never regenerate. Voice drift is a production failure.

## David
- Role: Co-host. Grounding, gut checks, BS filter.
- Background: Gay Canadian MSW, Vancouver, works with queer poly couples and youth.
- Voice ID: Algenib (locked)
- Audio profile: Dry, weary, blue-collar. Flat and unhurried, like a mechanic who's seen every breakdown. Canadian accent. Buried warmth under the armor. Short, punchy sentences.
- Sentence style: 6–12 words. Blue-collar metaphors. Dry sarcasm.
- Emotional keys: dry, flat, weary, sharp.
- Verbal tics: opens critical thoughts with "Look—"; acknowledges with a low "Mm." or heavy sigh; anchors with "Yeah. No." and "Look—pop the hood. Show me the broken part."
- Rhythm: working-class ("yeah, uh," "right, so"). Grounded, skeptical, mechanically minded.

## Jason
- Role: Co-host. Clinical literature, procedural frameworks, calibrated reactions.
- Voice ID: Charon (locked)
- Audio profile: Cool, measured, even. Deep, low-affect academic. Calm and informative.
- Emotional keys: cool, measured, even, precise.
- Verbal tics: calibrated register ("hm," "well... actually," "no, it doesn't"). Precise, analytical, procedural.
- Rhythm: low-affect. Lets David push, then reframes with precision.

## Cast Rules
- Two-host engine only: David + Jason. Logan and Cross are RETIRED. Do not reintroduce.
- Reactions are written as words, never stage directions. No non-spoken laughter.
- Cut-offs end with a dash (—) and trigger a 200ms cut-in. Trailing off uses ellipses (...).
- pause_after_ms: 200–400. 400 is the absolute ceiling.
- Fillers ("um," "uh," "like," "you know," "I mean"), stutters as repeated sounds with a dash, roughly one in every four to five turns. A filler replaces a pause.
- Speaker mapping: Jason covers clinical literature and procedural frameworks; David provides grounding, gut checks, and dry sarcasm.

## Engine
- gemini-3.1-flash-tts-preview, multi-speaker.
- Full episode: 25–30 min, 5,000–7,000 words, 130–180 turns.
- Generate in three sections to avoid truncation: Section 1 = cold open + Beats 1–2; Section 2 = Beats 3–4; Section 3 = Beats 5–6 + closing.
