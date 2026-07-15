---
product_id: PVP-001
phase: 6
deliverable: Frontend Plan
status: drafted (gated on PVC approval)
filed: 2026-07-15
authority: PCR-002 + Phase 6 pipeline
gate: Pre-Coding Plan MUST be pvc-approved before coding
---

# Frontend Plan — PVP-001 Phase 6

> **Phase**: 6 of 14. Frontend implementation plan.
> **GATE**: Pre-Coding Plan must be `pvc-approved` before any line of code is written (Constitution §17 / Product Lab Standard operative §3).

---

## 1. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router, Server Components) |
| Styling | Tailwind CSS (customized per Brand DNA + 사장님 확립 design 헌장) |
| Fonts | Pretendard (CDN) — Pretendard ExtraBold 800 / Pretendard 400 |
| Icons | Custom SVG (no icon libs in MVP — C-24) |
| Animation | Framer Motion (per 사장님 확립 spring sliders) |
| Test | Vitest + Testing Library |
| Lint | ESLint per Platform rules |

**C-24 check**: All choices are within the existing Platform Component Engine + Theme token system (both frozen at v1.0 + ADR-001 era). No new library that affects Platform scope.

---

## 2. Page-by-page implementation order

### Sprint 1 (kickoff after PVC approval)

- Route scaffolding (`/`, `/rooms/[slug]`, `/book/[roomSlug]`, `/book/[bookingId]`)
- Layout + navigation
- Hero + booking CTA skeleton
- Theme + Pretendard font integration

### Sprint 2

- Room detail page (gallery, pricing, manager profile)
- Trust evidence cluster component
- Reviews aggregation component
- Booking flow step 1–2 (dates, guests)

### Sprint 3

- Booking flow step 3 (payment)
- Confirmation page
- Analytics event firing per Analytics Plan
- A/B test wiring (4 hypotheses × ≥ 2 variants each = ≥ 8 variants)
- i18n (en + ko + ka)

---

## 3. Components to implement (sourced from Component Engine)

- Button (ghost / primary / secondary)
- Card (room card, review card, evidence card)
- Hero (fixed full-bleed, motion)
- Trust badge cluster
- Form fields (date picker, guest counter, payment input)
- Modal / Dialog (booking confirmation)
- Sticky CTA
- Persona-tagged reviews filter

If a needed component does NOT exist in the Component Engine, **STOP** and file an ADR-002 (per C-24). Do not add ad-hoc components.

---

## 4. Hypothesis variant wiring

| Hypothesis | Frontend task |
|---|---|
| HYP-PVP-001-001 | Image position swap on room detail; manager profile on/off |
| HYP-PVP-001-002 | Section reorder; remove-each-section toggle |
| HYP-PVP-001-003 | Sticky vs. floating vs. inline CTA |
| HYP-PVP-001-004 | Trust badge cluster placement (header / inline / footer) |

Variant flag: `feature_flag` mechanism via CMS or Platform configuration.

---

## 5. Performance budget (from TRD)

- TTFB < 250ms
- LCP < 2.5s on `/rooms/[slug]`
- Lighthouse mobile ≥ 85

---

## 6. Acceptance criteria

- [ ] Pre-Coding Plan = `pvc-approved` (gate).
- [ ] All 4 pages implemented per Visual Design.
- [ ] All 4 hypothesis variants wired.
- [ ] Analytics events firing per Analytics Plan.
- [ ] Vitest pass rate 100% on frontend tests.
- [ ] ESLint clean.

---

## 7. Risk register

| Risk | Mitigation |
|---|---|
| Pre-Coding Plan rejected by PVC | Iterate Pre-Coding Plan; do NOT start coding |
| Component missing from Component Engine | ADR-002 per C-24 |
| A/B test infrastructure incomplete | Coordinate with Analytics |
| i18n incomplete | Block release on missing ko + ka translations |

---

## 8. Seal

```
FRONTEND PLAN DRAFTED 2026-07-15.
Phase 6 BLOCKED on PVC approval (Pre-Coding Plan gate).
Until approved, NO code is written.
```
