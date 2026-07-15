---
product_id: PVP-001
phase: 8
deliverable: QA Plan
status: drafted
filed: 2026-07-15
authority: PCR-002 + Phase 8 pipeline
---

# QA Plan — PVP-001 Phase 8

> **Phase**: 8 of 14. Quality assurance for the build before deployment.

---

## 1. QA objectives

1. Every hypothesis variant is wired correctly (no broken states).
2. Booking flow works under load (500 concurrent users simulated).
3. Payment integration passes sanity checks (test mode → sandbox).
4. i18n covers en / ko / ka.
5. Accessibility: WCAG 2.1 AA on critical flows.

---

## 2. Test matrix

| Test | Type | Tool | Owner |
|---|---|---|---|
| Booking happy-path | E2E | Playwright | QA |
| Booking cancel + refund | E2E | Playwright | QA |
| Trust badge cluster variant A/B | E2E | Playwright | QA |
| Sticky CTA variant | E2E | Playwright | QA |
| Search availability edge cases | Unit | Vitest | Backend QA |
| Hold idempotency | Unit | Vitest | Backend QA |
| Payment intent idempotency | Unit | Vitest | Backend QA |
| Confirm consistency | Integration | Vitest | Backend QA |
| A/B test traffic split | Smoke | Custom | Analytics + QA |
| Mobile viewport | E2E | Playwright | QA |
| ko / ka translation completeness | Manual | QA checklist | QA + Marketing |
| Lighthouse mobile ≥ 85 | Perf | Lighthouse | Frontend + QA |

---

## 3. Test acceptance criteria

- 100% of critical-path tests passing.
- 0 P0/P1 bugs open at release sign-off.
- Lighthouse mobile ≥ 85 on all 4 pages.
- Vitest coverage ≥ 80% on booking-related modules.

---

## 4. QA → QES handoff

QA reports go to QES (Phase 9) as raw input. QES assesses Compliance Report against Platform standards.

---

## 5. Risk register

| Risk | Mitigation |
|---|---|
| Payment provider test flakiness | Pin to sandbox; re-run on retry |
| Browser-specific rendering | Cross-browser matrix (Chrome, Safari, Firefox) |
| i18n string drift | Single source of truth (CMS-managed translations) |

---

## 6. Seal

```
QA PLAN DRAFTED 2026-07-15.
Phase 8 ready for execution (Phases 6 + 7 in progress).
12 test items queued.
```

## 7. **NEW STANDARD CHECK (C-24)**

| Potential new Standard | Status |
|---|---|
| Hostel-specific QA Standard | ❌ **NOT added** — Existing Platform QA + QES covers product QA |
| Travel-specific QA Standard | ❌ **NOT added** — Out-of-scope (Constitution §1.2 Industry-Agnostic) |

C-24 satisfied.
