---
product_id: PVP-001
phase: 11
deliverable: Analytics Plan
status: drafted
filed: 2026-07-15
authority: PCR-002 + Phase 11 pipeline
---

# Analytics Plan — PVP-001 Phase 11

> **Phase**: 11 of 14. Measurement = Beta Evidence.

---

## 1. Analytics principles

1. Every hypothesis decision = measurable event(s).
2. Every Trust Stage has at least one engagement event.
3. A/B test variants are tied to event taxonomy by design.
4. Privacy: no PII in events; anonymize IP; honor cookie consent.

---

## 2. Event taxonomy (representative)

### Page events

| Event | When | Parameters |
|---|---|---|
| `page_view` | every page | path, referrer, locale |
| `page_scroll_depth` | 25/50/75/100% | path, depth |

### Trust stage events (HYP-PVP-001-001, 004)

| Event | When |
|---|---|
| `view_gallery` | gallery enters viewport |
| `expand_gallery_image` | image lightbox opens |
| `view_manager_profile` | manager section visible ≥ 3s |
| `view_payment_security` | secure-payment badge visible |
| `view_refund_policy` | refundability badge visible |
| `view_review_badge` | review badge expanded |

### Hypothesis-specific events

| Hypothesis | Events |
|---|---|
| HYP-PVP-001-001 | `view_gallery`, `view_manager_profile`, `expand_*` |
| HYP-PVP-001-002 | `view_section`, `cta_section_X_clicked`, `remove_section_X_test` |
| HYP-PVP-001-003 | `cta_position_variant_X_clicked` (3 variants) |
| HYP-PVP-001-004 | `badge_position_X_clicked`, `add_remove_evidence_X` |

### Funnel events

| Event | When |
|---|---|
| `funnel_search` | search submitted |
| `funnel_detail_view` | detail page load |
| `funnel_room_select` | user clicks "Book this" |
| `funnel_guests` | step 2 complete |
| `funnel_payment` | step 3 reached |
| `funnel_confirm` | confirmation page reached |
| `booking_cancelled` | cancellation event |

---

## 3. GA4 + GTM wiring

- GTM container: dedicated for pvp-001 (separate from existing AI Bridge Georgia tag)
- GA4 property: dedicated for pvp-001
- Event mapping: GTM trigger → GA4 event
- A/B variant assigned at `cookie_consent` event captured via GTM

---

## 4. Dashboard (Phase 11 output → cross-ref `product-lab-dashboard.md`)

The Analytics Plan feeds the Product Lab Dashboard. The dashboard surfaces:

- Funnel conversion per step
- Per-hypothesis metrics
- A/B test results (per variant)
- Trust stage engagement depth
- Booking + revenue total + per traffic source

---

## 5. Tool inventory

| Tool | Role |
|---|---|
| GA4 | Event collection, audience segmentation |
| GTM | Tag management, A/B variant assignment |
| Hotjar (or equivalent) | Heatmaps + session recording |
| Internal dashboard | Cross-tool aggregation (product-lab-dashboard.md) |

---

## 6. Privacy + consent

- Cookie consent banner (CMP) on first visit.
- GA4 + GTM only fire after consent.
- IP anonymization enabled.
- Data retention 14 months (default).

---

## 7. Acceptance criteria

- [ ] Every MVP page fires `page_view`.
- [ ] Every Trust Stage has at least one engagement event.
- [ ] Every A/B variant fires a tagged event.
- [ ] Dashboard reachable internally (Phase 11 output).
- [ ] Cookie consent properly blocks pre-consent events.

---

## 8. Seal

```
ANALYTICS PLAN DRAFTED 2026-07-15.
Phase 11 ready (post-deployment; tied to Phase 12 interviews).
Event taxonomy covers 4 hypotheses + 5 trust stages + funnel.
```
