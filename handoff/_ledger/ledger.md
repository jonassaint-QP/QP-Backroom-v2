# Poke ledger

One line per poke. Timestamp, seat, changed or unchanged, and the action taken if any.

**This file exists so that the protocol can be audited, and so that its failure is visible rather
than silent.** A clock that stops and leaves no trace is the failure mode this ledger is written
against.

**The quiet rule applies to output, not to this file.** A poke that finds nothing still writes one
`unchanged` line here. It produces no message.

| timestamp | seat | changed | action |
|---|---|---|---|
