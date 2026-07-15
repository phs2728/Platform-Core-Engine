---
product_id: PVP-001
deliverable: Success Metrics (canonical)
status: drafted
filed: 2026-07-15
authority: PCR-002 + Product Lab Standard §17
---

# Success Metrics — PVP-001

> **Canonical metric dictionary** for Product Lab 001. Other deliverables cross-reference this file.
> **Status**: Drafted. Targets are initial hypotheses, validated through Beta cycles.

---

## 1. Mission-critical metrics (Outcome)

| # | Metric | Definition | Initial target | Source |
|---|---|---|---|---|
| 1 | Booking conversion rate (search → confirmation) | bookings / searches over 30-day window | ≥ 3.0% | Analytics (Phase 11) |
| 2 | Total bookings per month | distinct completed bookings | ≥ 60 by Month 3 | Analytics |
| 3 | Revenue per visitor | total revenue / unique visitors | ≥ ₾18 median target | Analytics + Backend |
| 4 | Direct bookings (vs. OTA) | ratio of direct bookings / total bookings | ≥ 50% by Month 6 | Analytics + Backend |
| 5 | Repeat visit rate | unique returning visitors / total | ≥ 8% | Analytics |

---

## 2. Per-hypothesis metrics

### HYP-PVP-001-001 (booking page trust)

| # | Metric | Target |
|---|---|---|
| 1.1 | `view_gallery` rate | ≥ 70% of detail-page visitors |
| 1.2 | `view_manager_profile` rate | ≥ 40% |
| 1.3 | Booking page → confirmation conversion | ≥ 25% (industry 12–18%) |

### HYP-PVP-001-002 (detail page sections)

| # | Metric | Target |
|---|---|---|
| 2.1 | Each section scroll-depth | ≥ 60% per section |
| 2.2 | Section-order conversion lift | ≥ +5% vs. baseline |
| 2.3 | Section-removal conversion drop | ≥ -3% per removed section (validates section necessity) |

### HYP-PVP-001-003 (CTAs)

| # | Metric | Target |
|---|---|---|
| 3.1 | CTA CTR per variant | ≥ +20% improvement vs. baseline |
| 3.2 | Variant-bounce rate | ≤ baseline + 1pp |
| 3.3 | Mobile vs. desktop CTR differential | per-platform tracked |

### HYP-PVP-001-004 (trust evidence)

| # | Metric | Target |
|---|---|---|
| 4.1 | `view_payment_security` rate | ≥ 30% |
| 4.2 | `view_refund_policy` rate | ≥ 25% |
| 4.3 | Trust badge cluster → booking lift | ≥ +8% |

---

## 3. Trust Stage engagement metrics

| Stage | Metric | Target |
|---|---|---|
| Anxiety | view_gallery + view_manager ≥ 3s | ≥ 50% of visitors |
| Discovery | view_amenities + scroll_policy | ≥ 60% |
| Evaluation | expand_review | ≥ 30% |
| Confidence | view_payment + view_refund | ≥ 35% combined |
| Action | cta_click | ≥ 35% of detail visitors |

---

## 4. Operational metrics

| # | Metric | Target |
|---|---|---|
| 4.1 | TTFB P95 | < 250ms |
| 4.2 | LCP (mobile) | < 2.5s |
| 4.3 | Lighthouse mobile score | ≥ 85 |
| 4.4 | QES gate pass rate | 100% |

---

## 5. Quality + governance metrics

| # | Metric | Target |
|---|---|---|
| 5.1 | QA test pass rate | 100% on critical paths |
| 5.2 | QES gate FAILs per release | 0 |
| 5.3 | Hypothesis advance count | ≥ 2 by Month 6 |
| 5.4 | Promotion candidates filed | ≥ 1 by Month 9 |

---

## 6. Anti-goals (NOT to optimize)

Per C-24 + Charter, PVP-001 is NOT optimizing for:

- Vanity metrics (page-views, time-on-site)
- Conversion at the cost of trust (dark patterns)
- Hidden fees (mandated transparent pricing)
- Review gatekeeping (display honest reviews)

---

## 7. Acceptance criteria (Success Metrics ready)

- [ ] All metrics defined with formula and source
- [ ] Targets set per hypothesis
- [ ] Anti-goals explicit
- [ ] Cross-references to Analytics Plan and Experiment Plan complete

---

## 8. Seal

```
SUCCESS METRICS CANONICAL DRAFTED 2026-07-15.
Mission-critical: 5 metrics; Per-hypothesis: 12 metrics; Trust stage: 5 metrics; Operational: 4.
Anti-goals explicit.
```
