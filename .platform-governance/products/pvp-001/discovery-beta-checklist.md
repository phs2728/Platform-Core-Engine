---
product_id: PVP-001
phase: 1
deliverable: Discovery Beta Checklist
status: drafted
filed: 2026-07-15
authority: PCR-002 + Discovery Beta Framework (`/opt/data/Discovery_Beta_Framework.md`)
related_hypotheses: HYP-PVP-001-001, 002, 003, 004
---

# Discovery Beta Checklist — PVP-001 Phase 1

> **Phase**: 1 of 14 (canonical pipeline per PCR-002)
> **Objective**: Replace Alpha-stage Planning Evidence with reality-aligned Beta Evidence plan; register all Beta evidence sources; identify trust-stage mapping for the customer decision path.

---

## 1. Phase 1 entry criteria

PVP-001 may enter Phase 1 when ALL of the following hold:

- [x] Pre-Coding Plan filed at `.platform-governance/products/pvp-001/pre-coding-plan.md`.
- [x] 4 hypotheses registered (HYP-PVP-001-001, 002, 003, 004), each with Owner, Evidence Source, Validation Plan.
- [x] Alpha artifacts inherited (Brand DNA, Customer Discovery, Trust Evidence Blueprint, Content Strategy, Product Strategy).
- [ ] Customer personas refreshed (target ≥ 3 personas).
- [ ] Evidence sources identified per hypothesis (target ≥ 2 sources per hypothesis).
- [ ] Beta success metrics drafted (see Success Metrics plan).
- [ ] Bookable artifact (the "thing the customer actually buys") clearly defined.

---

## 2. Beta hypothesis canonical list

| ID | Hypothesis | Status | Validation plan summary | Owner |
|---|---|---|---|---|
| HYP-PVP-001-001 | Customers' trust is determined by specific booking-page content (photos, reviews, policies, manager profile, etc.) | Hypothesis | A/B test variants on booking page; eye-tracking + interview triangulation | Research + UX |
| HYP-PVP-001-002 | Specific detail-page sections measurably improve booking conversion (room gallery, neighborhood map, transparent pricing, cancellation policy visibility) | Hypothesis | Funnel analytics per section; remove-each-section test | Analytics + UX |
| HYP-PVP-001-003 | Specific CTAs outperform others (sticky-book vs. floating vs. inline; specific copy vs. generic; urgency vs. trust) | Hypothesis | Multi-variant CTA testing (≥ 4 variants); CTR + downstream booking lift | Frontend + Analytics |
| HYP-PVP-001-004 | Specific Trust Evidence items measurably increase bookings (reviews count, Google rating badge, secure-payment icons, refundability badge, manager photo+name, response time) | Hypothesis | Add-remove evidence test; segment by repeat-visitor vs. new | Marketing + Analytics |

---

## 3. Evidence sources to be activated (per Beta Framework)

PVP-001 will activate the following Production Evidence sources during Beta:

| # | Evidence source | Owner | Cadence | First data target |
|---|---|---|---|---|
| 1 | GA4 + GTM (page views, scroll depth, outbound clicks) | Ana | Real-time | Day 1 of Phase 10 |
| 2 | Hotjar / equivalent heatmap + session recording | UX | Continuous | Phase 10 |
| 3 | Booking conversion funnel (search → detail → booking → payment) | Analytics | Real-time | Phase 10 |
| 4 | A/B test results (4 hypotheses, ≥ 4 variants each) | Analytics + Frontend | Per test | Phase 10–13 |
| 5 | Customer interviews (≥ 5 per persona) | Research | Weekly | Phase 12 |
| 6 | Reviews (Google, Booking.com, Hostelworld) | Marketing | Weekly | Phase 11+ |
| 7 | Support tickets + chat (Zendesk or equivalent) | QA | Real-time | Phase 10+ |
| 8 | Staff interviews (after hostel's first month) | Research | One-off | Phase 12+ |

---

## 4. Trust Stage mapping (per Trust Evidence Blueprint)

| Trust Stage | Customer belief | Page-level evidence to validate |
|---|---|---|
| **Anxiety** | "Is this place real and safe?" | Photo gallery, manager profile + face, hostel address with map, Google Reviews badge |
| **Discovery** | "What does this hostel offer?" | Room types, amenities, neighborhood, food, cancellation policy, hostel rules |
| **Evaluation** | "Is this the right place for ME (solo/couple/group/long-stay)?" | Persona-matched reviews, room photos per persona, real-quote stories |
| **Confidence** | "Can I trust them with my money and stay?" | Secure-payment icons, refundability, response time SLA, manager reach |
| **Action** | "How do I book now?" | CTA copy variants, sticky-book behavior, calendar with availability |

The Trust Stage mapping feeds directly into Phase 11 (Analytics plan) — events must be tied to stages.

---

## 5. Phase 1 deliverables (output of this checklist)

| # | Output | Path |
|---|---|---|
| 1 | Product Kickoff | `.platform-governance/products/pvp-001/product-kickoff.md` |
| 2 | Discovery Beta Checklist (this file) | `.platform-governance/products/pvp-001/discovery-beta-checklist.md` |
| 3 | Success Metrics | `.platform-governance/products/pvp-001/success-metrics.md` |
| 4 | Experiment Plan | `.platform-governance/products/pvp-001/experiment-plan.md` |
| 5 | Evidence Collection Plan | `.platform-governance/products/pvp-001/evidence-collection-plan.md` |
| 6 | Customer Interview Plan | `.platform-governance/products/pvp-001/customer-interview-plan.md` |
| 7 | Analytics Plan | `.platform-governance/products/pvp-001/analytics-plan.md` |
| 8 | UX Research Plan | `.platform-governance/products/pvp-001/ux-research-plan.md` |
| 9 | Product Lab Dashboard | `.platform-governance/products/pvp-001/product-lab-dashboard.md` |
| 10 | PRD Kickoff | `.platform-governance/products/pvp-001/prd-kickoff.md` |
| 11 | TRD Kickoff | `.platform-governance/products/pvp-001/trd-kickoff.md` |

---

## 6. Beta acceptance criteria (Discovery Beta PASS)

Discovery Beta is "PASS" when ALL of the following hold:

- All 4 hypotheses have status `Hypothesis` with Validation Plan.
- Each hypothesis has ≥ 2 independent evidence sources queued.
- Trust Stage mapping covers all 5 stages with at least one evidence asset per stage.
- Beta success metrics have draft thresholds (see Success Metrics plan).
- Customer personas refreshed (≥ 3 personas).
- ≥ 5 customer interviews scheduled.
- Analytics plan covers funnel + per-hypothesis events.
- Evidence Collection Plan has EPS-level classification per hypothesis.

Discovery Beta FAIL → return to Phase 1 with explicit gaps. Discovery Beta PASS → enter Phase 2 (PRD).

---

## 7. Phase 1 → Phase 2 handoff

| Hand-off item | Owner | Receiver |
|---|---|---|
| Hypothesis Register | PM | PRD author |
| Trust Stage mapping | UX | Visual Design |
| Persona refresh | Research | UX + Analytics |
| Success Metrics draft | Analytics | All downstream roles |
| Evidence Collection Plan | PM + Research | All downstream roles |

---

## 8. Cross-references

| Standard | Path |
|---|---|
| Discovery Beta Framework | `/opt/data/Discovery_Beta_Framework.md` |
| Hypothesis Lifecycle Standard | `/opt/data/Hypothesis_Lifecycle_Standard.md` |
| Evidence Promotion Standard | `/opt/data/Evidence_Promotion_Standard.md` |
| Experiment Standard | `/opt/data/Experiment_Standard.md` |
| Hypothesis register | HYP-PVP-001-001..004 (registered in `experiment-plan.md`) |

---

## 9. Seal

```
DISCOVERY BETA CHECKLIST DRAFTED 2026-07-15.
Phase 1 ready for execution.
4 hypotheses registered.
8 evidence sources queued.
5 Trust Stages mapped.
Acceptance criteria defined.
```
