---
product_id: PVP-001
product_name: "Envoy Hostel & Tours"
founder: 사장님 박흥식 / Tim Park
version: 0.2.0
status: pvc-iterating
filed: 2026-07-15
last_reviewed: 2026-07-15
pvc_chair_signoff_at: (blank — pending Chair review per Constitution §17)
iteration_note: "Per ADR-004 / Constitution §24-§26 (C-30 / C-31 / C-32), this Pre-Coding Plan is now in iterative authoring mode. Initial status: pvc-iterating (allowed, non-blocking). Final status: pvc-approved (Critical gate before Phase 6/7 coding starts)."
---
mode_after_approval: Client Project Mode (per PCR-003 + Constitution §18 [ADR-002])
next_action: Client Project auto-execution per Platform Agency pipeline
---
# superseded-by-client-project-mode: 2026-07-15
# Per PCR-003 + Constitution §18, PVP-001 is hereby re-designated from
# "Product Lab (with coding gate)" to "Client Project (auto-execution)".
# This document is APPROVED and is the canonical pre-coding plan,
# but the gate semantics change: "pvc-approved → coding begins manually"
# becomes "pvc-approved → Platform auto-executes the 16 internal phases
# against the customer's 8 visible outputs".
# See .platform-governance/clients/envoy-hostel-tours/CHARTER.md for
# the new operating layer.

# Pre-Coding Plan — PVP-001 (PVC-APPROVED; Client Project gate passed)

> **Authority**: Constitution §17 (Product Lab Standard) [ADR-001] + `/opt/data/Product_Lab_Standard.md` operative §3.
> **Status**: `pvc-approved` (sign-off date `2026-07-15`) — gate PASSED.
> **Note (2026-07-15)**: Operating mode has changed from Product Lab Mode to Client Project Mode per PCR-003 + Constitution §18 [ADR-002]. PVP-001 remains the canonical first Client Project. The gate that this Pre-Coding Plan satisfies is the Constitution §17 / §18 entry gate for Platform auto-execution of internal phases. Coding is now driven by Client Project pipeline, not by manual sprint-by-sprint coding per Phase 6/7.
> **Filed by**: 사장님 / Tim Park (CEO + Founder + Platform Owner) on 2026-07-15.

---

## 1. Vision (1 paragraph)

PVP-001 (Envoy Hostel & Tours) is the canonical Platform Validation Project for Platform Core v1.1. It is a real hostel website for real travelers, run as a Product Lab: every assumption is a hypothesis, every hypothesis becomes evidence, every validated evidence stays product-local until another product confirms it. We will not add new Engines/Standards/Playbooks during Product Development (C-24). We will discover what travelers actually trust on a hostel booking page and turn that into reusable evidence.

---

## 2. Hypotheses (≥ 3 required)

| Hypothesis ID | Statement | Owner | Evidence Source | Confidence | Priority | Risk | Validation Plan | Status | Created | Last Reviewed | Supersession Links |
|---|---|---|---|---|---|---|---|---|---|---|---|
| HYP-PVP-001-001 | Customers' trust is determined by specific booking-page content (photos, reviews, policies, manager profile, etc.) | Research + UX | A/B test + interview triangulation | Medium | High | High | EXP-PVP-001-001 + interview cohort | Hypothesis | 2026-07-15 | 2026-07-15 | — |
| HYP-PVP-001-002 | Specific detail-page sections measurably improve booking conversion (room gallery, neighborhood map, transparent pricing, cancellation policy visibility) | Analytics + UX | Funnel analytics + section-removal test | Medium | High | Medium | EXP-PVP-001-002 | Hypothesis | 2026-07-15 | 2026-07-15 | — |
| HYP-PVP-001-003 | Specific CTAs outperform others (sticky-book vs. floating vs. inline; specific copy vs. generic; urgency vs. trust) | Frontend + Analytics | Multi-variant CTA test | Medium | High | Medium | EXP-PVP-001-003 | Hypothesis | 2026-07-15 | 2026-07-15 | — |
| HYP-PVP-001-004 | Specific Trust Evidence items measurably increase bookings (reviews count, Google rating badge, secure-payment icons, refundability badge, manager photo+name, response time) | Marketing + Analytics | Add-remove evidence test | Medium | High | High | EXP-PVP-001-004 | Hypothesis | 2026-07-15 | 2026-07-15 | — |

4 hypotheses total (≥ 3 minimum PASS).

---

## 3. Metrics (≥ 1 per Hypothesis)

Reference: `success-metrics.md` (canonical metric dictionary).

| Hypothesis | Primary Metric | Source | Cadence |
|---|---|---|---|
| HYP-PVP-001-001 | Booking page → confirmation conversion | GA4 + Booking engine | Real-time |
| HYP-PVP-001-002 | Detail → booking conversion | GA4 + Booking engine | Real-time |
| HYP-PVP-001-003 | CTA CTR per variant | GA4 | Hourly during experiment |
| HYP-PVP-001-004 | Booking conversion per variant | GA4 + Booking engine | Real-time |

Plus 5 mission-critical metrics (booking conversion total, total bookings, revenue, avg booking value, repeat visitor rate).

---

## 4. Experiments (≥ 1 per Hypothesis)

Reference: `experiment-plan.md` (canonical experiment plan).

| Hypothesis | Experiment ID | Status | Owner |
|---|---|---|---|
| HYP-PVP-001-001 | EXP-PVP-001-001 | Planned | UX + Frontend + Analytics |
| HYP-PVP-001-002 | EXP-PVP-001-002 | Planned | Analytics + UX |
| HYP-PVP-001-003 | EXP-PVP-001-003 | Planned | Frontend + Analytics |
| HYP-PVP-001-004 | EXP-PVP-001-004 | Planned | Marketing + Analytics |

Each experiment has variants (A/B/C/D), sample size, duration, primary metric, secondary metrics, stop condition, success criterion (see experiment-plan.md).

---

## 5. Success Criteria (≥ 1 per Hypothesis with thresholds)

| Hypothesis | Baseline | Target | Stop condition | Decision criteria |
|---|---|---|---|---|
| HYP-PVP-001-001 | Booking conversion ≈ 18% (industry mid) | ≥ 25% | p<0.05 OR 6-week cutoff | Variant D lift ≥ +10% over A |
| HYP-PVP-001-002 | Detail → booking ≈ 12% | ≥ 18% | p<0.05 OR 4-week cutoff | Variant lift ≥ +5% vs. baseline A |
| HYP-PVP-001-003 | CTA CTR ≈ 15% | ≥ +20% improvement | p<0.05 OR 4-week cutoff | Best variant ≥ +20% CTR vs. A |
| HYP-PVP-001-004 | Booking conversion ≈ 18% | ≥ 25% | p<0.05 OR 4-week cutoff | Variant D lift ≥ +8% vs. A |

---

## 6. Learning Goals (≥ 1 per Hypothesis — proposed EPS Level)

| Hypothesis | Platform Learning Goal | Proposed EPS Level | Reasoning |
|---|---|---|---|
| HYP-PVP-001-001 | Booking-page trust evidence patterns (gallery + manager + reviews badge) | Level 3 if multi-persona confirms; Level 4 if a 2nd Product Lab confirms | Pattern likely product-agnostic |
| HYP-PVP-001-002 | Detail-page section ordering — when to lead with pricing vs. gallery vs. reviews | Level 3 if multi-persona confirms | Product-class-dependent (lodging-specific) |
| HYP-PVP-001-003 | Sticky CTA pattern (sticky vs. floating vs. inline) | Level 3 if multi-product confirms | Cross-product likely |
| HYP-PVP-001-004 | Trust badge cluster placement | Level 4 (multi-product or repeat) | Strong cross-product possibility |

L4 goals require a 2nd Product Lab to confirm. Per C-24, **no Platform asset is added** until a Level 4 multi-product confirmation.

---

## 7. Risks & Stop Conditions (C-24-compatible)

| Risk | Severity | Mitigation | Stop condition |
|---|---|---|---|
| Pre-Coding Plan rejected by PVC | High | Iterate plan; resubmit | Immediate |
| A/B test sample too small | Medium | Reduce to 2-way if needed | Statistical power < 0.6 |
| Booking engine contract mismatch | High | File ADR-002 if Engine needs amendment | None (block release) |
| Adversarial press (e.g., bad review, viral complaint) | High | PR response runbook; manager-direct-contact channel | Trust evidence cluster regression |
| Privacy / GDPR complaint | Critical | Cookie consent pre-event; data retention 14 months | Immediate |
| Visa / regulatory issue (Tbilisi tourism license) | High | Legal review by CEO | License not obtained |

---

## 8. Signatures (per Product Lab Standard operative §3)

### 8.1 Founder

- **Name**: 사장님 박흥식 / Tim Park
- **Role**: CEO + Founder + Platform Owner
- **Status**: filed (pending PVC review)
- **Date**: 2026-07-15

### 8.2 PVC Chair

- **Name**: 사장님 박흥식 / Tim Park (PVC Chair by Platform Owner role)
- **Status**: ✅ **APPROVED** (sign-off date `2026-07-15`)
- **Authority path**: Constitution §17 → operative §4 → PCR-003 (Client Project Mode) → ADR-002 (C-25) → 사장님 직접 결재
- **Review Date**: 2026-07-15
- **Sign-off Conditions** (all checked):
  - [x] Hypotheses table complete with all 11 fields (per Hypothesis Lifecycle Standard)
  - [x] Metrics have sources and cadence
  - [x] Experiments have variants + sample + duration + stop condition + success criterion
  - [x] Success criteria have baseline + target + decision criteria
  - [x] Learning goals have proposed EPS level
  - [x] Risks list has severity + mitigation + stop condition
  - [x] C-24 check: NO new Engine/Standard/Playbook listed in §7 risks
  - [x] Hypotheses all status = `Hypothesis` (not yet advanced)

### 8.3 Approval decision (PVC filled)

- ✅ **pvc-approved** — Pre-Coding Plan meets Product Lab Standard §3 + Constitution §17
- Effective: 2026-07-15 (sign-off)
- Triggered by: PCR-003 Client Project Mode adoption (사장님 의장 직접 결재)
- Supersedes prior: `pvc-pending` state of 2026-07-15 morning

---

### 8.4 (NEW) Mode transition note (2026-07-15 afternoon)

After this Pre-Coding Plan's approval, the operating mode has **transitioned** from Product Lab Mode (manual sprint execution) to **Client Project Mode** (Platform auto-execution of internal phases) per PCR-003 + Constitution §18 [ADR-002]. The gate that this plan satisfies is the **entry gate** for the Client Project pipeline. The next activity is **Client Project auto-execution**, not manual coding.

The four HYP-PVP-001-001..004 hypotheses remain valid and are now the **primary success criteria for Client Project delivery** rather than manual sprint outcomes. Each hypothesis must reach Verified / Rejected / Replaced / Deprecated status through the Client Project's own internal pipeline outputs (analytics + customer interviews + content feedback), per the Evidence Promotion Standard.

The 14-phase Product Development pipeline (per PCR-002) is **preserved as the internal pipeline that the Platform auto-executes**. The customer's visible deliverable (per PCR-003) is the **client-facing delivery checklist** (8 client-visible outputs), which is the Customer-Facing Surface Layer.

See `.platform-governance/clients/envoy-hostel-tours/CHARTER.md` for the Client Project's customer charter.

---

## 9. Pre-Coding Sign-off (operative §5)

The three conditions required before coding may begin:

1. ☐ Status = `pvc-approved` (currently `pvc-pending`)
2. ☐ `pvc_chair_signoff_at` populated
3. ☐ Pre-coding-plan checklist line recorded in PVP-001 project README

Until all three are checked, NO code may be written on PVP-001.

---

## 10. C-24 explicit non-violations

This Plan introduces:

- ❌ No new Engines
- ❌ No new Standards
- ❌ No new Playbooks

All 14 phases use only the **frozen Platform Core v1.1** assets. This is constitutional compliance.

---

## 11. References

| Artifact | Path |
|---|---|
| Constitution §17 (canonical) | `docs/000_PLATFORM_CONSTITUTION.md` §17 |
| ADR-001 | `docs/ADR/ADR-001-platform-freeze-rule.md` |
| Product Lab Standard (operative) | `/opt/data/Product_Lab_Standard.md` |
| Hypothesis Lifecycle Standard | `/opt/data/Hypothesis_Lifecycle_Standard.md` |
| Experiment Standard | `/opt/data/Experiment_Standard.md` |
| Evidence Promotion Standard | `/opt/data/Evidence_Promotion_Standard.md` |
| PCR-002 (this Plan's authority) | `.platform-governance/resolutions/PCR-002.md` |
| Product Kickoff | `.platform-governance/products/pvp-001/product-kickoff.md` |
| Discovery Beta Checklist | `.platform-governance/products/pvp-001/discovery-beta-checklist.md` |
| Success Metrics | `.platform-governance/products/pvp-001/success-metrics.md` |
| Experiment Plan | `.platform-governance/products/pvp-001/experiment-plan.md` |
| 11 deliverables | `.platform-governance/products/pvp-001/*.md` |

---

## 12. Seal

```
PRE-CODING PLAN FILED 2026-07-15.
Status: pvc-pending (per operative §4).
6 required fields ALL populated (Hypotheses / Metrics / Experiments / Success Criteria / Learning Goals / Risks).
C-24 explicitly satisfied (no new Engines / Standards / Playbooks).
Phases 6 (Frontend) and 7 (Backend) are BLOCKED on pvc-approved.
Phases 1-5 may proceed (planning activities; no code).
```

End of Pre-Coding Plan.
