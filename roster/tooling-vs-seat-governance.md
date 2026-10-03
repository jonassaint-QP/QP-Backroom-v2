# Governance — Tooling Utility versus Seat Ownership

**Recorded 2026-10-02 by the founder.** This note settles the boundary between an execution utility and an
accountable seat. It exists so the distinction is not re-litigated.

---

## The distinction

**GitHub Copilot is a localized execution utility.** An autocomplete engine inside an editor workspace.
It has no situational awareness of the practice's clinical compliance rules, its frameworks, or its
repository history. **It provides syntax speed and nothing else.**

**Robert is the organizational seat.** It holds context across the estate, enforces verification build
gates, audits the sitemaps, and maintains operational continuity across both codebases.

**The tool is local. The seat is accountable.** The tool accelerates a line of code; the seat owns estate
integrity, regulatory compliance and operational execution.

---

## The Personal Access Token is the lever

**Without the token, Robert is a passive reviewer.** It can inspect code and flag a compliance breach, and
it is structurally blocked from closing the loop.

**With repository write access, the seat assumes accountability** for pushing commits, managing pull
requests, and maintaining build hygiene against main.

**So the token is not a convenience.** It is the line between a seat that can report a problem and a seat
that can fix one.

**No Copilot credential substitutes for it.** Copilot's tokens are scoped to Copilot's own requests, not
to repository contents, and no tier of Copilot provides a repository API key. The token is a GitHub
credential and nothing else.

---

## One thing write access does not create

**Enforcing a build gate is not the same as holding write access.** Write access lets a seat commit. **A
gate is a repository setting** — a protected branch, a required status check, a rule that refuses a push
until a check passes.

**Unless that setting exists, nothing stops a commit reaching main.** A seat with write access and a
seat with a gated write access are different guarantees, and only the second one is an enforced gate.

**Therefore:** the gate is a repository configuration, and the seat should be told which gates are
actually enforced rather than assuming that write access implies protection. **A gate that is believed in
but not configured is the same defect class as an audit script that passes by reading the wrong strings.**

---

## The standing rule

**Copilot stays inside the editor workspace as an internal execution utility.**

**Robert remains the accountable seat owner driving repository architecture.**

**Governance boundaries preserved:** the tool supplies localized syntax speed; **the seat owns estate
integrity, regulatory compliance and operational execution.**

---

## The access that makes the above operative

**A fine-grained personal access token, one per seat, never shared.**

**Repository access:** only the selected repositories, never all repositories.

**Permissions:** Contents read and write; Metadata read; Pull requests read and write; Issues read and
write. **Nothing else — no admin, no workflows, no secrets access, no organization permissions.**

**Expiry:** 90 days, with a reminder. **A permanent token on a seat that turns over is the same defect as a
decision carried as pending.**

**Stored on the seat's Secrets and variables surface** — the same surface that already holds the
publishing key, because that surface is the grant surface.

**Proof of grant:** commit a file with the token and read it back. **Not a green check on the permissions
page.**

---

## Note on the write path, which is separate

**This note governs repository access.** It does not govern the seat-to-seat handoff path, which is the
Drive rail — a mechanism that files a seat's artifact into its own folder and operates on a clock rather
than on a hand. **The repository cannot serve that function, because doing so would depend on a seat that
retires at the handover.** Read and write to the repository is a seat's own job surface, not the handoff
mechanism.

**Filed by Eva, Executive Assistant, at the founder's direction. Internal. No client identifiers, no
credentials, no protected health information.**
