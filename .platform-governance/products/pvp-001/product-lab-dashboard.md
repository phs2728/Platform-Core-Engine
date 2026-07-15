---
product_id: PVP-001
deliverable: Product Lab Dashboard (layout spec, not code)
status: drafted
filed: 2026-07-15
authority: PCR-002 + Ana Daily Analytics pattern + Success Metrics
---

# Product Lab Dashboard — PVP-001 Layout Specification

> **Scope**: This document is the **layout spec** for the PVP-001 Lab Dashboard. It is not a code build; per C-24, no new Platform dashboard library is added — the dashboard uses existing Ana infrastructure (GA4 + GTM + Ana daily analytics logs).

---

## 1. Dashboard audience

| Audience | Primary use |
|---|---|
| 사장님 / CEO | Booking conversion, revenue per visitor, top-line movement |
| PM | Hypothesis advance counts, experiment results, blockers |
| Frontend | Variant assignment distribution, UI bugs |
| Backend | Booking errors, payment failures, SLO compliance |
| UX | Heatmaps, scroll depth, persona engagement |
| Marketing | Traffic source mix, conversion by channel |
| Research | Interview queue, transcripts |

---

## 2. Sections (top-to-bottom)

### Section 1 — Mission-critical KPIs

| Card | Source | Refresh |
|---|---|---|
| Booking conversion rate (last 7 / 30 days) | GA4 + Booking engine | Real-time |
| Total bookings (last 7 / 30 days) | Booking engine | Real-time |
| Revenue (last 7 / 30 days) | Payment engine | Real-time |
| Avg booking value | Payment engine | Real-time |
| Repeat visitor rate | GA4 (returning users) | Real-time |

### Section 2 — Per-hypothesis status (4 cards)

For each of HYP-PVP-001-001..004:

- Hypothesis statement
- Status (Hypothesis / Testing / Verified / Rejected)
- Latest experiment headline (lift%)
- Time to resolution
- Linked experiment ID

### Section 3 — Trust Stage engagement

| Stage | Primary metric (last 7 days) | vs. Target |
|---|---|---|
| Anxiety | view_gallery + view_manager | % |
| Discovery | view_amenities + scroll_policy | % |
| Evaluation | expand_review | % |
| Confidence | view_payment + view_refund | % |
| Action | cta_click | % |

### Section 4 — Funnel visualization

Landing → Detail → Booking step 1 → step 2 → step 3 → Confirmation (with conversion rates).

### Section 5 — Variant traffic split

For each active experiment: A / B / C / D traffic split (must remain balanced within ±5%).

### Section 6 — Operational alerts

- 5xx booking error rate spike
- TTFB regression
- Lighthouse score drop
- Variant assignment skew

### Section 7 — Customer interview status

- Interviews per persona (target vs. completed)
- Recent transcripts (top 3)
- Open research questions

### Section 8 — Platform Learning Feed

- Level 2+ evidence pending review
- Promotion candidates filed
- Decisions pending PVC

---

## 3. Tooling (no new libraries)

| Tool | Role |
|---|---|
| GA4 (already in Platform) | Event collection |
| GTM (already in Platform) | Tag management |
| Ana daily-analytics logs (already in Platform) | Aggregated reporting source |
| Existing internal dashboard pattern | Cross-source aggregation |

No new dashboard library, no new Standard. C-24 satisfied.

---

## 4. Refresh cadence

| Card | Cadence |
|---|---|
| KPIs | Daily (Ana cron) |
| Hypothesis status | Weekly |
| Trust stage | Daily |
| Funnel | Daily |
| Variant split | Hourly during active experiments |
| Alerts | Real-time |

---

## 5. Acceptance criteria

- [ ] All 8 sections have data sources mapped
- [ ] No new Platform libraries introduced (C-24)
- [ ] Dashboard reachable from PM workspace

---

## 6. Seal

```
PRODUCT LAB DASHBOARD LAYOUT DRAFTED 2026-07-15.
8 sections; existing tooling only.
C-24 satisfied (no new Standard / Engine / Playbook).
```
