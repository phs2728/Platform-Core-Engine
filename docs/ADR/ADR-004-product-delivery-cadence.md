# ADR-004: Product Delivery Cadence — Progressive Decision + Decision Queue + Working Website First

**ADR ID**: ADR-004
**Date**: 2026-07-15
**Status**: 🟢 ACCEPTED (Council Chair direct adoption, 2026-07-15)
**Author**: Platform Council (proposed by 사장님 박흥식 / Tim Park)
**Deciders**: 사장님 (Architecture Review Board)
**Supersedes**: none (does NOT supersede CFR-001 STOP clause nor C-24 binding)
**Superseded by**: none
**Target Constitution version**: v1.4
**Related**: Charter (`.charters/PRODUCT_DELIVERY_CADENCE_C27_to_C29.md`), Constitution v1.3 (Frozen + ADR-001 + ADR-002 + ADR-003), Council Final Directive (CFD-001), Pre-Coding Plan (`pvp-001/pre-coding-plan.md`), Envoy Gap Report

---

## Context

The Council Chair (사장님 박흥식 / Tim Park), observing the recent Envoy project state (Project State Map, Gap Report), noted that **the Operating approach** has historically been "BLOCKED → STOP" — i.e., when an Open Decision exists, work halts. This pattern, while preserving correctness, **does not match real Agency operations**.

Real Agency operations work as follows:

1. **Imperfect-by-default**: A working artifact (e.g., a draft site) is shipped iteratively, not after "Perfect PRD, Perfect TRD, Perfect Decision".
2. **Decisions are deferred until necessary**: Decoupling the moment of decision from the moment of implementation.
3. **Decisions are queued by priority**: Critical decisions (those that physically block implementation) are made first; everything else is deferred.

The Chair directs three new Constitutional rules to formalize this operating cadence:

1. **Progressive Decision Principle** — never stop implementation unless the missing decision physically prevents implementation.
2. **Decision Queue** — Open Decisions are classified Critical / High / Medium / Low; only Critical blocks.
3. **Working Website First** — the canonical progression is `Working → Beautiful → Perfect`, NEVER `Perfect Planning → Perfect PRD → ... → Website`.

The Chair's instruction also explicitly retargets the Envoy project — Critical decisions identified as **Cloudbeds integration** and **direct-booking booking flow**; all other Open Decisions can proceed in parallel.

This ADR proposes Constitutional elevation under §9.1 procedure.

---

## Decision

### Numbering note (important)

The Chair's instruction supplied rule numbers **C-27 / C-28 / C-29**, but the Constitution §21-§23 (per ADR-003) already uses C-27 / C-28 / C-29 for **Premium Visual Restraint Principle / Content First / Less But Better**.

To avoid duplicate numbering, this ADR proposes:

- **Existing C-27 (Premium Visual Restraint)**: unchanged numbering at §21
- **Existing C-28 (Content First)**: unchanged numbering at §22
- **Existing C-29 (Less But Better)**: unchanged numbering at §23
- **New principles** (this ADR):
  - **C-30 Progressive Decision Principle** → **§24**
  - **C-31 Decision Queue** → **§25**
  - **C-32 Working Website First** → **§26**

This preserves both sets of rules without conflict.

### Amendment — New Sections §24-§26 (Product Delivery Cadence)

§24 / §25 / §26 of the Constitution record the 3 new rules verbatim from the Council Chair. They bind all Platform Agency / Client Project Delivery work, not just Envoy.

### Verbatim text of each rule

The full verbatim text is recorded in `.charters/PRODUCT_DELIVERY_CADENCE_C27_to_C29.md` and will appear in Constitution §24-§26.

**C-30 Progressive Decision Principle (§24)**: Never stop implementation unless the missing decision physically prevents implementation. "결정이 없어도 만들 수 있으면 만든다."

**C-31 Decision Queue (§25)**: Open Decisions are queued Critical → High → Medium → Low. Only Critical blocks; the rest continue in parallel. Worked examples from Chair:
- 언어 (language) — Multi-language via i18n abstraction; English default; no block.
- Currency — Multi Currency Engine; no block.
- URL — Router abstraction; no block.
- Cloudbeds — Adapter Interface; no block.
- Working principle: "**90%는 이미 구현 가능합니다.**"

**C-32 Working Website First (§26)**: Always progress `Working → Beautiful → Perfect`. Never `Perfect Planning → Perfect PRD → Perfect TRD → Perfect Decision → Website`.

Plus **5 Product Delivery Rules** (verbatim from Chair, integrated into §26):

1. Always keep the project moving.
2. Only block work that is technically impossible without a decision.
3. Everything else continues in parallel.
4. Collect decisions just before they become necessary.
5. Deliver a working product first, then refine it.

### Envoy Critical decisions (verbatim from Chair)

- **Critical 1**: Cloudbeds integration (예약 시스템 / PMS)
- **Critical 2**: 직접 예약 방식 (Booking Flow)

The remaining Envoy Open Decisions (per Gap Report) are non-Critical under this Classification:

| Priority | Decision | Source / Resolution path |
|---|---|---|
| **Critical** | Cloudbeds integration | Need PMS connector (Adapter Interface per C-30) |
| **Critical** | Direct-booking booking flow | Need Booking Engine customization (Adapter Interface per C-30) |
| High | Brand DNA owner validation (OD-7) | Async owner sign-off; Library proceeds |
| High | Cross-promo surface count (OD-6) | Decide at Phase 6 frontend prep |
| High | Tours PRD strategy (OD-5) | Decide before Phase 2 PR authoring |
| Medium | Launch language (OD-1) | i18n abstraction; English default; flip on day-of-launch |
| Medium | Currency (OD-2) | Multi Currency Engine; default GEL |
| Medium | URL localization (OD-3) | Router abstraction; default English; i18n routing later |
| Medium | Customer Discovery BLOCKED (OD-9) | Continue UI/Layout/CMS/SEO/Design (per C-32); ask only the specific customer question when needed |

### Operation-level changes accompanying this ADR

| Change | Where |
|---|---|
| Constitution version | v1.3 → **v1.4 (Frozen + ADR-001 + ADR-002 + ADR-003 + ADR-004 amendments)** |
| Doc header | Updated to v1.4 with §24-§26 listed in amendments |
| Version History table | Added v1.4 row |
| 사장님 명령 박스 | Added ADR-004 block with verbatim C-30/31/32 quotes |
| New sections §24-§26 | Appended to Constitution |
| Charter | `.charters/PRODUCT_DELIVERY_CADENCE_C27_to_C29.md` sealed |
| Pre-Coding Plan status | Changed from `pvc-pending` (blocking) to `pvc-iterating` (non-blocking); iterates to `pvc-approved` |
| Open Decisions | Re-classified under Decision Queue (Critical/High/Medium/Low) |
| Envoy Gap Report | Updated to reflect Decision Queue |
| Council Final Directive | STOP clause retained (Platform-side); NOT in conflict with C-30/31/32 (Client-side) |

---

## Consequences

### Positive

1. **Working output emerges earlier**: a "Working Website" can be deployed as a beta cohort while Critical decisions are still being discussed.
2. **Decision fatigue reduced**: Medium / Low decisions are deferred until necessary, reducing the cognitive load on Chair and team.
3. **Parallel execution enabled**: Brand / UI / Layout / Photo / Component / Typography / Navigation / Animation / CMS / SEO / Accessibility all run in parallel; language and booking are slotted into the appropriate moment.
4. **Realistic agency cadence**: matches how real agencies operate, replacing the "perfect planning → perfect delivery" myth.
5. **C-30/C-31/C-32 compose with C-26/C-27/C-28**: C-26-C-29 are constraints on *what* is built; C-30-C-32 are cadence rules for *how* it is built. Both apply.

### Negative / Risks

1. **Risk 1 — Drift toward "Perfectionism at any moment"**: A team might inadvertently slip from "Working → Beautiful → Perfect" cadence back into "perfect plan first" mode. **Mitigated**: Weekly cadence review against C-32; product lab dashboard tracks which stages are in progress.
2. **Risk 2 — Decision accumulation**: Medium / Low decisions may accumulate over time and require a final cleanup before launch. **Mitigated**: Decision Queue is reviewed at every Phase gate to ensure Medium / Low decisions are not silently stalling.
3. **Risk 3 — Critical decision blocking persists**: Cloudbeds and Booking Flow remain Critical and may still pause parts of the project. **Mitigated**: C-30 says "make what's possible" — Cloudbeds integration can be worked as Adapter Interface even before concrete provider is chosen, and the booking engine can be wired with a mock provider.
4. **Risk 4 — Open Decisions inadvertently become commitments**: A Medium decision deferred too long may become a High decision. **Mitigated**: Decision Queue reclassification is a regular task; decisions are re-scored when context changes.

### Neutral

- C-24 (Platform Freeze Rule) is unchanged. No new Platform asset is added by this ADR.
- Hidden Platform Principle (§18) is unchanged.
- C-26-C-29 (Client Rules) are unchanged.
- Constitution §17 (Product Lab Standard pre-coding gate) is **retained** for Frontend/Backend coding start, but **iterative** plan authoring is now C-32-compliant.

---

## Alternatives considered

### Alt 1 — Charter only, no Constitutional elevation

**Rejected.** The Chair explicitly framed these as Platform-level operating rules ("앞으로는 항상"). Charter-only weakens the binding force, and the existing precedent (ADR-003 for ADR-004) puts new client/project rules at Constitutional level. Consistency demands v1.4.

### Alt 2 — Reuse C-27/28/29 numbering (rename existing Client Rules)

**Rejected.** Renaming existing rules (C-27 → C-30 etc.) would break references and human-readability. The new C-30/31/32 numbering preserves continuity.

### Alt 3 — Change Pre-Coding Plan gate to "non-blocking" entirely

**Rejected.** Removing pre-coding gate entirely would violate §17's intent of ensuring Frontend/Backend work begins with a clear plan. C-29 says iteration is OK; C-29 does not say "no plan needed". The Pre-Coding Plan remains **required**, but its authoring is iterative and its `pvc-approved` status is the Critical gate.

---

## Implementation Plan

### Executed in this session

1. ✅ Drafted this ADR-004 (this document)
2. ✅ Created `.charters/PRODUCT_DELIVERY_CADENCE_C27_to_C29.md` (verbatim source)
3. ⏭ Patched `docs/000_PLATFORM_CONSTITUTION.md` to v1.4:
   - Header updated to v1.4 with §24-§26 listed in amendments
   - 사장님 명령 박스 gained an ADR-004 block
   - §9.2 version history row added
   - §24 / §25 / §26 sections appended (verbatim)
4. ⏭ Updated Envoy Gap Report §6.7 Open Decisions table to reflect Decision Queue classification
5. ⏭ Updated Pre-Coding Plan status from `pvc-pending` to `pvc-iterating` (per C-29)
6. ⏭ Commit on `feature/platform-freeze-v1` and re-stamp `platform-core-v1.0-freeze` tag

### Implementation Notes

- ADR-004 follows the precedent of ADR-003 (Chair direct adoption, supersedes CFD-001 STOP clause on this specific point).
- Pre-Coding Plan authorship is now **iterative**: starting with `pvc-iterating` and progressing to `pvc-approved` over time, not a single-shot.
- Decision Queue is a **living document**; it lives at `02-gap-report.md` §6.7 and is updated as decisions are made.

---

## References

| Source | Path | Used |
|---|---|---|
| Charter (verbatim source) | `.charters/PRODUCT_DELIVERY_CADENCE_C27_to_C29.md` | §1-§3 verbatim |
| Platform Constitution v1.3 | `docs/000_PLATFORM_CONSTITUTION.md` | amendment target |
| ADR-001 / ADR-002 / ADR-003 | `docs/ADR/` | predecessors |
| PCR-001 / PCR-002 / PCR-003 | `.platform-governance/resolutions/` | preserved |
| CFD-001 Council Final Directive | `.charters/COUNCIL_FINAL_DIRECTIVE.md` | retained for Platform-side work |
| C-26-C-29 Client Rules | `docs/000_PLATFORM_CONSTITUTION.md` §20-§23 | preserved as constraints |
| Pre-Coding Plan | `.platform-governance/products/pvp-001/pre-coding-plan.md` | status updated |
| Envoy Gap Report | `/opt/data/clients/envoy/shared/references/02-gap-report.md` | updated |
| Envoy Project State Map | `/opt/data/ENVOY_PROJECT_STATE_MAP.md` | context |

---

## ADOPTION

This ADR is adopted by direct Council Chair authority (사장님 박흥식 / Tim Park) on 2026-07-15. The Chair's instruction in the session conversation log of 2026-07-15 is the evidence. Effective immediately upon adoption.

```
ACCEPTED 2026-07-15.
Council Chair: 사장님 박흥식 / Tim Park.
Constitution v1.3 -> v1.4 (with §24 C-30 / §25 C-31 / §26 C-32).
3 new operating rules; ADF-001 STOP clause preserved for Platform-side.
Open Decisions reclassified by priority (Critical: Cloudbeds, Booking Flow).
Working Website First: Working -> Beautiful -> Perfect.
Pre-Coding Plan: status moved from pvc-pending to pvc-iterating.
Rules apply to ALL Platform Agency / Client Project delivery work.
```
