---
product_id: PVP-001
phase: 2
deliverable: PRD Kickoff
status: drafted
filed: 2026-07-15
authority: PCR-002 + Phase 2 pipeline
inherits_from: /opt/data/envoy-hostel-prd.md (legacy)
---

# PRD Kickoff — PVP-001 Phase 2

> **Phase**: 2 of 14. Refreshing the legacy `/opt/data/envoy-hostel-prd.md` to align with PCR-002 scope.
> **Goal**: A PRD that says what we'll build, what we will NOT build, and how each decision maps to a registered hypothesis.

---

## 1. PRD refresh targets

| # | Target | Status |
|---|---|---|
| 1 | Persona map (≥ 3 personas) — refreshed | Drafted |
| 2 | JTBD per persona | Drafted |
| 3 | Feature scope — MVP vs. next-vs.-never | Drafted |
| 4 | Hypothesis → Feature mapping | Drafted |
| 5 | Out-of-scope list (explicit non-goals) | Drafted |
| 6 | Success metrics chapter (cross-ref Success Metrics plan) | Drafted |
| 7 | Trust Evidence chapter (cross-ref Trust Evidence Blueprint) | Drafted |
| 8 | Open questions (to resolve in Beta) | Drafted |

---

## 2. Persona map (initial, will be validated by Beta)

| # | Persona | JTBD | Trust stage priority |
|---|---|---|---|
| P1 | Solo traveler, first time in Tbilisi | "Find a safe, social, central hostel for 3–5 nights at predictable price" | Anxiety > Discovery > Action |
| P2 | Couple, anniversary trip | "Find a quiet private room with romantic context and confirmed clean bathroom" | Discovery > Confidence > Action |
| P3 | Group of friends (4–6) | "Find dorms that fit the group, social atmosphere, walking distance from night life" | Discovery > Action |
| P4 | Long-stay remote worker | "Find a quiet bed + reliable wifi + desk in dorm, weekly discount, friendly community" | Confidence > Discovery > Action |
| P5 | Family (2 adults + 1 child) | "Find a private room + crib availability + family-friendly policy + nearby park" | Confidence > Anxiety > Discovery > Action |

Personas are hypotheses themselves — Beta validates or revises them (HYP-PVP-001-002, 003).

---

## 3. Feature scope — MVP

### In-scope (MVP)

- Single landing page with Hero + Booking CTA.
- Room details page with: gallery, neighborhood, cancellation, transparent pricing, manager profile, reviews badge, secure-payment badge.
- Booking flow (search availability → select room → guest details → payment → confirmation).
- 4 hypothesis-driven A/B test variants wired at MVP launch (see Experiment Plan).
- Analytics: GA4 + GTM events tracking full funnel.
- Reviews aggregation (Google + Booking.com + Hostelworld, embedded badges).
- Manager direct contact channel (response time SLA experiment).

### Out-of-scope (MVP)

- Tours booking integration (named in product name "Envoy Hostel & Tours"; deferred to Phase 14 iteration).
- Multi-property inventory.
- Loyalty program.
- Affiliate links / referral codes.
- AI chat for booking assistance.
- Native mobile app.
- Multi-language beyond English + Korean + Georgian.

Out-of-scope items are **explicit hypotheses** the team has not validated; adding them back requires Beta evidence per C-24.

---

## 4. Hypothesis → Feature mapping

| Hypothesis | MVP feature tested |
|---|---|
| HYP-PVP-001-001 (booking page trust) | Booking page photo gallery + reviews badge + manager profile; A/B variants |
| HYP-PVP-001-002 (detail page sections) | Room detail page sections; remove-each-section test |
| HYP-PVP-001-003 (CTAs) | Sticky CTA variant vs. floating; specific copy A/B |
| HYP-PVP-001-004 (trust evidence) | Trust evidence badge cluster placement; add-remove tests |

---

## 5. Open questions to resolve in Beta

1. **Pricing transparency** — Should we show the price breakdown before the guest reaches the booking form? (HYP-PVP-001-002)
2. **Cancellation policy display** — How prominently should the cancellation policy show on the booking page? (HYP-PVP-001-001)
3. **Manager profile presence** — Does a manager photo+name affect booking on a Tbilisi hostel audience? (HYP-PVP-001-001, 004)
4. **CTA placement** — Sticky vs. floating vs. inline — does this vary by device? (HYP-PVP-001-003)
5. **Tour cross-sell** — Should tours be advertised on the booking confirmation page? (Defer to Phase 14 — out-of-scope for MVP)

---

## 6. Success metrics chapter (cross-reference)

The full metric dictionary is at `success-metrics.md`. Summary:

| Metric | Target |
|---|---|
| Booking conversion rate (search → booking confirmation) | ≥ 3% (industry baseline 1.5–2.5%) |
| Detail-page → booking-page CTR | ≥ 18% |
| Booking page → confirmation rate | ≥ 25% |
| Review badge CTR (placeholder → reviews page) | track |
| Cancellation policy visibility CTR (scroll depth to policy section) | track |
| Manager profile engagement (engaged view count) | track |

Targets are **initial hypotheses** to be validated through Beta cycles.

---

## 7. Trust evidence chapter (cross-reference)

The full Trust Evidence Blueprint is at `/opt/data/Trust_Evidence_Blueprint.md`. The five Trust Stages must each have:

1. At least one asset on the booking page.
2. At least one event tied to it in the Analytics plan.
3. At least one A/B variant in the Experiment Plan.

| Stage | Primary asset | Primary event | Primary A/B test |
|---|---|---|---|
| Anxiety | Photo gallery + manager profile | `view_gallery` + `view_manager` | gallery position variants |
| Discovery | Room types + amenities + cancellation | `view_amenities` + `scroll_policy` | section ordering test |
| Evaluation | Persona-matched reviews | `view_review` + `expand_review` | persona-filtered reviews vs. all |
| Confidence | Secure-payment + refundability + SLA | `view_payment_security` + `view_refund` | badge cluster variants |
| Action | CTA variants | `click_cta` | sticky vs. floating vs. inline |

---

## 8. Acceptance criteria (PRD refresh PASS)

PRD refresh is PASS when:

- [ ] Persona map has ≥ 3 personas with JTBD and trust stage priority.
- [ ] In-scope / Out-of-scope lists are explicit and signed by PM + CEO.
- [ ] Every MVP feature maps to at least one hypothesis.
- [ ] Open questions list is reviewed by Research.
- [ ] TRD work can begin (Phase 3 gate).
- [ ] Pre-Coding Plan remains updated (any new features added requires re-filing the plan and re-PVC review).

---

## 9. Seal

```
PRD KICKOFF DRAFTED 2026-07-15.
Legacy envoy-hostel-prd.md is INPUT, not OUTPUT.
Refresh will produce: /opt/data/pvp-001-prd.md (target location, post-Phase-2).
```
