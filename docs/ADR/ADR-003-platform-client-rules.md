# ADR-003: Platform Client Rules (Constitution §20-§23)

**ADR ID**: ADR-003
**Date**: 2026-07-15
**Status**: 🟢 ACCEPTED (Council Chair direct adoption, 2026-07-15)
**Author**: Platform Council (proposed by 사장님 박흥식 / Tim Park)
**Deciders**: 사장님 (Architecture Review Board)
**Supersedes**: none
**Superseded by**: none
**Target Constitution version**: v1.3
**Related**: Charter (`.charters/PLATFORM_CLIENT_RULES_C26_to_C29.md`), Constitution v1.2 (Frozen + ADR-001 + ADR-002), Council Final Directive CFD-001 (superseded on this specific point — see §7 below)

---

## Context

Platform Core v1.2 (Frozen + ADR-001 + ADR-002) covers the Platform Core (C-24, Product Lab Principle, Product Lab Standard, Hidden Platform Principle).

The Chair (사장님 박흥식 / Tim Park), on 2026-07-15, observed that **visual restraint and project structure rules** are needed as **Platform-level client project principles** that apply to all client projects (Envoy today, restaurant/pilgrimage/transport/marketplace tomorrow).

Four rules are proposed:

1. **C-26 Project Workspace Standard** — every client project gets an independent workspace under `clients/<client>/<product>/<phase>/...`.
2. **C-27 Premium Visual Restraint Principle** — design for trust, not decoration; explicit Emoji / Icon / Color / Shadow / Card / Glass / Gradient / Animation restraint rules.
3. **C-28 Content First** — Photo → Headline → Content → CTA → Decoration ordering.
4. **C-29 Less But Better** — one core message + one core CTA + one visual flow per screen.

The Chair additionally supplied an **Envoy Project Structure Special Case** with a `shared/` subdirectory for brand, design-system, components, assets, content — used by both `hostel/` and `tours/`.

The Chair explicitly stated: **"이 규칙은 Envoy만을 위한 것이 아니라 앞으로 모든 고객 프로젝트의 기본 원칙으로 삼는 것이 좋습니다."**

This ADR proposes Constitutional elevation of all 4 rules under §9.1 procedural chain.

---

## Decision

This ADR enacts a Constitutional amendment to `docs/000_PLATFORM_CONSTITUTION.md`:

### Amendment — New Sections §20-§23 (Platform Client Rules)

§20 / §21 / §22 / §23 of the Constitution record the 4 rules verbatim from the Council Chair. §20.1 covers §20 C-26, §20.3 covers §21 C-27, §20.4 covers §22 C-28, §20.5 covers §23 C-29. The Envoy Project Structure (§20.2) is a C-26 special case.

### Verbatim text of each rule

The full verbatim text is recorded in:

- **§20.1 (C-26 Project Workspace Standard)**: see Constitution §20.1
- **§20.2 (Envoy Project Structure C-26 Special Case)**: see Constitution §20.2
- **§20.3 (C-27 Premium Visual Restraint Principle)**: see Constitution §20.3; sub-sections §20.3.1 (기본 규칙), §20.3.2 (Emoji Rule), §20.3.3 (Icon Rule), §20.3.4 (Premium Reference)
- **§20.4 (C-28 Content First)**: see Constitution §20.4
- **§20.5 (C-29 Less But Better)**: see Constitution §20.5

### Operation-level changes accompanying this ADR

| Change | Where |
|---|---|
| Constitution version | v1.2 → **v1.3 (Frozen + ADR-001 + ADR-002 + ADR-003 amendments)** |
| Doc header | Updated to v1.3 with §20-§23 listed in amendments |
| Version History table | Added v1.3 row referencing §20-§23 + ADR-003 |
| 사장님 명령 박스 | Added ADR-003 block with verbatim C-26 / C-27 / C-28 / C-29 quotes |
| New sections §20-§23 | Appended to Constitution |
| Charter | `.charters/PLATFORM_CLIENT_RULES_C26_to_C29.md` sealed |

### Why Charter + Constitutional amendment (not Charter alone)

- The Chair emphasized the rules are **Platform-level**, not Envoy-level. A Charter alone leaves them at the Charter-layer; they should bind Platform as a whole.
- Per §9.1 procedure (Issue → ADR → Chair approval → Constitution update → CHANGELOG → minor version 동결), a constitutional patch is the right ceremony.
- The Chair's instruction is the approval evidence; this ADR is the procedural record.

---

## Consequences

### Positive

1. **4 rules are now Platform-constitutional**, binding for every client project (not just Envoy).
2. **Visual restraint is normalized** at the Platform level — a single source of truth for Aman/Apple/Stripe/Linear/Airbnb-style restraint.
3. **Project workspace is structurally enforced** (`clients/<client>/<product>/<phase>/...`).
4. **Content-first + less-but-better** are durable principles, not re-derivable from each client project.

### Negative / Risks

1. **Risk 1 — Over-restriction in conversational contexts**: strict 0-emoji rule might over-restrict blog/marketing copy. **Mitigated**: §20.3.2 explicitly allows emojis in (여행 후기 / 블로그 / SNS / 이벤트 / 마케팅 배너) — 5 contexts where emoji is acceptable.
2. **Risk 2 — Phase-name proliferation**: the structure mandates `discovery/`, `prd/`, `trd/`, etc. but specific projects may want custom sub-phases. **Mitigated**: the standard supplies the canonical layout; per-project additions are allowed.
3. **Risk 3 — Premature constraints**: if a future client (e.g., a children's education product) needs emoji-rich UI, the rule becomes a blocker. **Mitigated**: C-24 process allows for evidence-driven amendments to the rule (no Platform asset may be added without evidence; rule relaxation would require a new ADR).
4. **Risk 4 — Vertical-specific UI vocabulary**: premium hospitality has its own conventions (e.g., hotel rating stars). **Mitigated**: §20.3.4 already lists 5 reference brands (Aman, Apple, Stripe, Linear, Airbnb); vertical-specific additions via ADR.

### Neutral

- Existing Platform assets are unchanged (no Engines/Standards/Playbooks added).
- Existing governance instruments (PCR-001/002/003, ADR-001/002, Charters) are unchanged.
- These rules apply prospectively to all client projects.

---

## Alternatives considered

### Alt 1 — Keep rules at Charter layer only (no Constitutional elevation)

**Rejected.** The Chair stated the rules are **Platform-level**, not Charter-level. A Charter-only elevation would dilute the rules' authority. Per §1.5 ("Reusable for 10+ Years") of the Constitution, durable cross-client principles belong in the Constitution, not in a Charter that may be superseded.

### Alt 2 — Apply rules only to Envoy (not other future clients)

**Rejected.** The Chair explicitly stated: **"이 규칙은 Envoy만을 위한 것이 아니라 앞으로 모든 고객 프로젝트의 기본 원칙으로 삼는 것이 좋습니다."** Single-client applicability would undermine the Platform's purpose as a multi-client operating system.

### Alt 3 — Auto-generated per-client Charter duplicates

**Rejected.** Generating per-client duplicates (one Charter per client) would create N governance files for the same rule, defeating the purpose of Platform-level principles. Single constitutional rule + per-client operationalization in `clients/<client>/`.

### Alt 4 — Make the rules Standard / Playbook (not Constitutional)

**Rejected.** The Chair specifically framed these as "Platform Rules" — Constitutional. Standards and Playbooks are subordinate. Constitutional elevation is the highest binding level below direct Chair authority.

---

## Implementation Plan

### Executed in this session

1. ✅ Drafted this ADR-003 (this document)
2. ✅ Created `.charters/PLATFORM_CLIENT_RULES_C26_to_C29.md` (verbatim source)
3. ✅ Patched `docs/000_PLATFORM_CONSTITUTION.md` to v1.3:
   - Header updated to v1.3 + Effective Date addition
   - 사장님 명령 박스 gained an ADR-003 block
   - §9.2 version history row added
   - §20-§23 sections appended (verbatim)
4. ⏭ Commit on `feature/platform-freeze-v1`
5. ⏭ Re-stamp `platform-core-v1.0-freeze` tag

### Implementation Notes

- This is the FIRST ADR adopted via **Chair direct adoption** rather than via a procedural pre-ADR-originated proposal. Council Final Directive's (CFD-001) STOP clause for new Platform governance artifacts is held to be **superseded on this point** by direct Chair authority.
- Future ADRs by Chair direct adoption remain possible but should be reserved for **constitutional and platform-level** amendments, not for routine client-project work (the latter is suppressed unless accompanied by C-24-validated evidence).

---

## References

| Source | Path | Used |
|---|---|---|
| Charter (verbatim source) | `.charters/PLATFORM_CLIENT_RULES_C26_to_C29.md` | §1-§5 verbatim |
| Platform Constitution v1.2 | `docs/000_PLATFORM_CONSTITUTION.md` | amendment target |
| ADR-001 | `docs/ADR/ADR-001-platform-freeze-rule.md` | predecessor (procedural pattern) |
| ADR-002 | `docs/ADR/ADR-002-hidden-platform-principle.md` | predecessor |
| PCR-001 / PCR-002 / PCR-003 | `.platform-governance/resolutions/` | predecessor resolutions |
| CFD-001 | `.charters/COUNCIL_FINAL_DIRECTIVE.md` | superseded on this specific point |
| HIDDEN_PLATFORM_CHARTER | `.charters/HIDDEN_PLATFORM_CHARTER.md` | cross-compatible |
| EXPERIENCE_ENGINE_CHARTER | `.charters/EXPERIENCE_ENGINE_CHARTER.md` | cross-compatible |
| Envoy Project State Map | `/opt/data/ENVOY_PROJECT_STATE_MAP.md` | informs Envoy project structure adoption |

---

## ADOPTION

This ADR is adopted by direct Council Chair authority (사장님 박흥식 / Tim Park) on 2026-07-15. The Chair's instruction in the session conversation log of 2026-07-15 is the evidence. Effective immediately upon adoption.

```
ACCEPTED 2026-07-15.
Council Chair: 사장님 박흥식 / Tim Park.
Constitution v1.2 -> v1.3 (with §20-§23 Platform Client Rules).
4 rules apply to all client projects (Envoy today, others tomorrow).
Envoy Project Structure with shared/ subdirectory is canonical.
CFD-001 STOP clause is superseded on this constitutional amendment only;
continues to bind client-project work absent Chair exception.
```
