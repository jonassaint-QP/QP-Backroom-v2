# Request template

Copy this into the receiving seat's `to-<seat>/` folder and fill every field. **A request is a file,
not a message** — there is no messaging rail in this architecture and none is designed.

```
request id:     REQ-YYYYMMDD-<from-seat>-<n>
from:           <seat>
to:             <seat>
question:       <one question>
needed by:      YYYY-MM-DD HH:MM ET
artifact expected: <what a complete answer looks like: a file path, a document id, a fetched page>
```

## Rules

**One question per file.** A request containing two questions is two requests and will be returned
unanswered.

**A needed-by date is mandatory.** Without one, the request sits behind everything else.

**Name the artifact.** "What are the rates" is not answerable. "The current published rate card, as a
file path or document id" is.

**A request is not authorization.** It cannot release a publish, an unschedule, a deletion, or any act
a standing rule reserves to the founder. That rule is unchanged by this protocol.

**A request that cannot be answered comes back with a reason, not silence.** One line: what was
tried, what stopped it, and whether someone else can close the gap.
