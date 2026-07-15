# ADR-002: Client Project Mode + Customer Charter + C-25 Client Project Principle

**ADR ID**: ADR-002
**Date**: 2026-07-15
**Status**: 🟢 ACCEPTED
**Author**: Platform Council (proposed by 사장님 박흥식 / Tim Park)
**Deciders**: 사장님 (Architecture Review Board)
**Supersedes**: none
**Superseded by**: none
**Target Constitution version**: v1.2
**Related**: PCR-001 (`.platform-governance/resolutions/PCR-001.md`), PCR-002 (`.platform-governance/resolutions/PCR-002.md`), PCR-003 (`.platform-governance/resolutions/PCR-003.md`), Charter (`.charters/CUSTOMER_CHARTER.md`), ADR-001 (`docs/ADR/ADR-001-platform-freeze-rule.md`)

---

## Context

Platform Core v1.1 has been FROZEN at tag `platform-core-v1.0-freeze` (PCR-001 §1 item 1; ADR-001 amendment by PCR-002). The Platform now ships:

- Platform Constitution v1.1 (Frozen 2026-07-11; amended 2026-07-15 to v1.1)
- C-24 (Constitution §15)
- Product Lab Principle (Constitution §16 [ADR-001])
- Product Lab Standard (Constitution §17 [ADR-001])
- Discovery Framework (Alpha + Beta)
- PRD Engine, TRD Engine
- Agency OS
- Skill Library, Skill Pack, Playbooks
- QES (Quality Execution Standard)
- PAG (Platform Agent Guide)
- Knowledge Governance Standard
- Platform Freeze v1.1

PCR-002 (2026-07-15) further transitioned the Platform from "Platform Development" to "Product Development", declaring the first Product Lab (PVP-001 "Envoy Hostel & Tours") and registering 4 hypotheses + 14 phases + 11 deliverables.

The Council Chair now observes that the next-level re-orientation is needed:

**Customers are external. The Platform exists to serve customers, not to be observed by them.** The Platform must become **invisible** to the customer. The customer sees only the deliverable (beautiful, fast, booking-ready, manageable, AI-assisted, SEO-optimized, admin-accessible, mobile-first website). The Platform's internals (PRD, TRD, Agency OS, QES, Skills, Playbooks, Platform internals) must be **invisible implementation details** that the Platform Agency operates without surfacing to the customer.

This is a re-orientation of attention, not a redesign of the Platform. The Platform internals remain identical. The Platform's value (C-24 binding, EPS ladder, QES gates, etc.) is preserved. What's new is the **delivery mode**: the Platform Agency auto-executes the 16 internal phases against the 8 client-visible outputs, and the customer sees only the outputs.

Two things are needed:

1. **§18 Client Project Principle (C-25)** added to the Constitution, binding re-orientation.
2. **Customer Charter** recorded at `.charters/CUSTOMER_CHARTER.md` with verbatim text from the Council Chair.

---

## Decision

This ADR enacts three amendments to `docs/000_PLATFORM_CONSTITUTION.md` v1.1 → v1.2:

### Amendment A — New Section §18 (Client Project Principle) — introduces **C-25**

§18 is added to the Constitution after §17. Its sole rule, **C-25 — Client Project Principle**, is recorded verbatim from the Council Chair's Client Project Kickoff message of 2026-07-15. Verbatim canonical text:

```
플랫폼은 보이지 않는다. 고객의 결과물만 보인다.
```

Operating interpretation (non-normative; recorded in this ADR for reviewer convenience):

- "플랫폼" = Platform Core v1.2 + internal pipeline + governance artifacts.
- "고객" = the external person or organization that commissions a deliverable (e.g., a hostel owner who says "우리 호텔 홈페이지를 만들어 주세요").
- "결과물" = client-visible deliverables (design, speed, booking, CMS, AI chat, SEO, admin, mobile).
- This rule **re-orients** attention: the Platform Agency optimizes for the customer's deliverable, not for the Platform's internal completeness.
- This rule is **not** an exception to C-24; it operates within C-24 (no new Engines/Standards/Playbooks during Client Project execution).

### Amendment B — Customer Charter filed at `.charters/CUSTOMER_CHARTER.md`

The Charter records two verbatim text blocks:

1. The C-25 principle itself (one Korean sentence).
2. The full PCR-003 Client Project Kickoff block (16 internal phases; 8 client-visible outputs; the explicit "client must never need to understand" list).

The Charter is a **non-Constitutional** companion document; it supplements the Constitution rather than amending it.

### Amendment C — Re-designation of PVP-001

PVP-001 ("Envoy Hostel & Tours") was registered as the first **Product Lab 001** in PCR-002. This ADR approves its re-designation as the first **Client Project 001**:

- Same internal ID (PVP-001 retained for traceability).
- Same Pre-Coding Plan (now `pvc-approved` per operative §4 effective 2026-07-15).
- New role label: Client Project 001.
- Customer: 사장님 박흥식 / Tim Park acting in dual capacity (Platform Owner + Envoy Hostel project principal).
- Next phase: Platform Agency auto-execution of the 16 internal phases against the 8 client-visible outputs.

Full charter at `.platform-governance/clients/envoy-hostel-tours/CHARTER.md`.

---

## Consequences

### Positive

1. **Customer-centric re-orientation**: Attention shifts from "did we add Platform features?" to "did we deliver customer value?" — which is the right metric for a Platform-as-Operating-System.
2. **Clarity of role separation**: Customer never needs to understand Platform internals. Platform Agency never confuses customer-facing polish with Platform expansion.
3. **C-24 reinforcement**: The Client Project Principle makes C-24 more meaningful (no new Engines = customer doesn't get distracted by Platform creep).
4. **Premium-level deliverable focus**: The $10k+ target forces the Platform Agency to **use** the existing Platform capabilities well, not invent new ones.
5. **Backward compatibility**: PCR-001/002 + ADR-001 + Pre-Coding Plan remain valid. PCR-003 extends, not replaces, prior instruments.

### Negative / Risks

1. **Re-orientation may tempt shortcut**: It's tempting to think C-25 lets us skip pre-coding plans. It does not. The Pre-Coding Plan gate (Constitution §17) remains; this ADR only changes the meaning of "approval" from "sprint-start authorization" to "Client Project execution entry authorization".
   **Mitigated**: Pre-Coding Plan filed; `pvc-approved`; documented.
2. **8 client-visible outputs could tempt over-delivery**: The customer doesn't need all 8 in MVP (e.g., AI chatbot may be v1.1).
   **Mitigated**: Each output is in the delivery checklist with a delivery tier (MVP / Iter-1 / Iter-2).
3. **$10k+ premium target may tempt skipping rigor to ship faster**: The opposite is true. Premium outputs require rigor.
   **Mitigated**: QES / EPS / C-24 binding enforced throughout.

### Neutral

- The Platform's internal mechanics remain identical; only the orientation of effort changes.
- Subsequent Client Projects (e.g., Client Project 002, 003) inherit the same doctrine.

---

## Alternatives considered

### Alt 1 — Treat C-25 as just a communications guideline, not a Constitutional rule

**Rejected**. A non-binding guideline gets ignored. C-24 worked because it was a rule. C-25 needs the same weight.

### Alt 2 — Replace PCR-002's Product Lab framework entirely with Client Project

**Rejected**. Product Lab semantics (Hypotheses → Metrics → Evidence → Promotion) remain valid for **internal learning** within the Agency. PCR-003 adds Client Project semantics on top. Two layers, not one.

### Alt 3 — Require a new Engine before shipping premium output

**Rejected**. C-24 explicitly forbids this without production evidence. Moreover, the Platform's existing 33 Engines + frozen Component Engine + Theme + QES are sufficient for a $10k+ premium hostel website; no new Engine is needed.

---

## Implementation Plan

### Step-by-step (executed in this order in the same Council session)

1. ✅ Pre-Coding Plan (`pvc-pending` → `pvc-approved`); sign-off date 2026-07-15.
2. ✅ Adopt PCR-003 (Client Project Mode Resolution).
3. ✅ Adopt ADR-002 (this document).
4. ✅ Adopt Customer Charter (canonical verbatim) at `.charters/CUSTOMER_CHARTER.md`.
5. ⏭ Patch `docs/000_PLATFORM_CONSTITUTION.md`:
   - Update header to `**Version**: v1.2 — Frozen + ADR-001 + ADR-002 amendments`.
   - Append §18 "Client Project Principle (C-25)" with §18.1 (verbatim Customer Charter §1).
   - Append §19 "Customer Charter (incorporation by reference)" linking to `.charters/CUSTOMER_CHARTER.md`.
   - Update §9.2 헌법 버전 히스토리 to add v1.2 row.
6. ⏭ Write `.platform-governance/clients/envoy-hostel-tours/CHARTER.md` — full Client Project Charter for PVP-001.
7. ⏭ Write `.platform-governance/clients/envoy-hostel-tours/auto-execution-pipeline.md` — 16 internal phases × 8 visible outputs mapping.
8. ⏭ Write `.platform-governance/clients/envoy-hostel-tours/delivery-checklist.md` — 8 client-visible outputs with delivery tier.
9. ⏭ Write `.platform-governance/clients/envoy-hostel-tours/premium-delivery-check.md` — $10k+ gate criteria.
10. ⏭ Update cross-references in PCR-001, PCR-002, Freeze Manifest, ADR-001, Charter.
11. ⏭ Commit on `feature/platform-freeze-v1` and re-stamp `platform-core-v1.0-freeze` tag.

---

## References

| Source | Path | Used |
|---|---|---|
| Council Chair's "Client Project Kickoff" message | conversation log 2026-07-15 | C-25 + Customer Charter verbatim |
| Council Chair's "플랫폼은 보이지 않는다" principle | conversation log 2026-07-15 | C-25 verbatim Korean |
| Platform Constitution v1.1 | `docs/000_PLATFORM_CONSTITUTION.md` | amendment target |
| ADR-001 | `docs/ADR/ADR-001-platform-freeze-rule.md` | consistent with C-24 |
| PCR-001 | `.platform-governance/resolutions/PCR-001.md` | PVC establishment context |
| PCR-002 | `.platform-governance/resolutions/PCR-002.md` | predecessor resolution |
| PCR-003 | `.platform-governance/resolutions/PCR-003.md` | sibling resolution |
| Experience Engine Charter | `.charters/EXPERIENCE_ENGINE_CHARTER.md` | cross-reference |
| Customer Charter (this ADR's outcome) | `.charters/CUSTOMER_CHARTER.md` | filed 2026-07-15 |
| Customer Charter (Experiences Engine — different) | `.charters/EXPERIENCE_ENGINE_CHARTER.md` | adjacent but distinct |

---

## ADOPTION

This ADR is adopted by the Architecture Review Board (사장님) on 2026-07-15. Effective immediately upon adoption.

```
ACCEPTED 2026-07-15.
Council Chair: 사장님 박흥식 / Tim Park.
Constitution v1.1 → v1.2.
Three amendments: C-25, Customer Charter, PVP-001 re-designation.
Platform remains frozen. Customer-centric re-orientation in force.
```
