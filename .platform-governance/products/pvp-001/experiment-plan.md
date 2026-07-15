---
product_id: PVP-001
deliverable: Experiment Plan (canonical)
status: drafted
filed: 2026-07-15
authority: PCR-002 + Experiment Standard + Experiment Registry Specification
---

# Experiment Plan — PVP-001

> **Canonical experiment plan**. Each experiment has an ID, owner, success metric, and stop condition.
> **First 4 experiments = first 4 hypotheses** (registered).

---

## 1. Experiment Register (Snapshot)

| Exp ID | Linked Hypothesis | Owner | Start (target) | End (target) | Status |
|---|---|---|---|---|---|
| EXP-PVP-001-001 | HYP-PVP-001-001 | UX + Frontend + Analytics | Week 1 post-launch | Week 6 | Planned |
| EXP-PVP-001-002 | HYP-PVP-001-002 | Analytics + UX | Week 1 post-launch | Week 6 | Planned |
| EXP-PVP-001-003 | HYP-PVP-001-003 | Frontend + Analytics | Week 1 post-launch | Week 6 | Planned |
| EXP-PVP-001-004 | HYP-PVP-001-004 | Marketing + Analytics | Week 1 post-launch | Week 6 | Planned |

---

## 2. EXP-PVP-001-001 — Booking Page Trust

**Hypothesis**: HYP-PVP-001-001 (Customers' trust is determined by specific booking-page content).

| Field | Value |
|---|---|
| Objective | Identify which booking-page content most reduces booking anxiety |
| Variants | A: photo gallery only; B: gallery + manager profile; C: gallery + manager + reviews badge; D: gallery + manager + reviews + secure-payment icon |
| Sample size | 80% of traffic split equally (4-way) |
| Duration | 4 weeks minimum, 6 weeks target |
| Primary metric | Booking conversion rate per variant (Phase 11 metric 1.3) |
| Secondary metrics | Trust badge CTR, scroll depth, time-on-booking-page |
| Stop condition | Statistical significance p<0.05 OR 6-week cutoff |
| Success criterion | Variant D lift ≥ +10% over Variant A baseline |

---

## 3. EXP-PVP-001-002 — Detail Page Sections

**Hypothesis**: HYP-PVP-001-002 (Specific detail-page sections measurably improve booking conversion).

| Field | Value |
|---|---|
| Objective | Identify which sections contribute most to conversion |
| Variants | A: original order (Bento); B: pricing first; C: gallery first; D: reviews first |
| Sample size | 80% of traffic split equally (4-way) |
| Duration | 4 weeks |
| Primary metric | Detail → booking conversion rate |
| Secondary metrics | Per-section scroll depth, bounce rate |
| Stop condition | Statistical significance p<0.05 OR 4-week cutoff |
| Success criterion | Variant lift ≥ +5% vs. baseline A |

**Sub-experiment (remove-each-section)**:
| Variants | A: all sections; B: remove reviews; C: remove pricing; D: remove manager |
| Goal | Confirm which sections are necessary (drop ≥ 3% conversion ⇒ necessary) |

---

## 4. EXP-PVP-001-003 — CTA Variants

**Hypothesis**: HYP-PVP-001-003 (Specific CTAs outperform others).

| Field | Value |
|---|---|
| Objective | Identify CTA placement + copy that maximizes click-to-booking |
| Variants | A: inline, generic copy; B: floating, specific copy; C: sticky, specific copy; D: sticky, urgency copy |
| Sample size | 80% split equally (4-way) |
| Duration | 4 weeks |
| Primary metric | CTA CTR + downstream booking conversion |
| Secondary metrics | Mobile vs. desktop CTR, bounce rate post-click |
| Stop condition | Statistical significance p<0.05 OR 4-week cutoff |
| Success criterion | Variant lift ≥ +20% CTR vs. baseline A |

---

## 5. EXP-PVP-001-004 — Trust Evidence Cluster

**Hypothesis**: HYP-PVP-001-004 (Specific Trust Evidence items measurably increase bookings).

| Field | Value |
|---|---|
| Objective | Identify which trust evidence items matter most |
| Variants | A: no badges; B: payment security only; C: payment security + refundability; D: payment + refundability + response-time |
| Sample size | 80% split equally (4-way) |
| Duration | 4 weeks |
| Primary metric | Booking conversion rate per variant |
| Secondary metrics | Per-badge CTR, return-visit rate |
| Stop condition | Statistical significance p<0.05 OR 4-week cutoff |
| Success criterion | Variant D lift ≥ +8% vs. baseline A |

---

## 6. Anti-cohabitation rule

Two experiments running simultaneously on the same page may confound. Mitigation:

- EXP-001 + EXP-003: orthogonal (001 changes content; 003 changes CTA). Co-run OK.
- EXP-002 + EXP-003: orthogonal. Co-run OK.
- EXP-001 + EXP-004: same trust layer. SEQUENTIAL (001 first, then 004).

---

## 7. Risks + mitigations

| Risk | Mitigation |
|---|---|
| Sample size too small for 4-way split | Reduce to 2-way (best variant vs. baseline) if traffic insufficient |
| Sequential dependency missed | Calendar enforcement; explicit run-order in launch checklist |
| Variant contamination | Feature flag enforced at edge; CMS-managed |

---

## 8. Outputs

Each experiment produces:

1. Experiment Record (frozen at end-of-experiment) at `.platform-governance/experiments/EXP-PVP-001-NNN.md`
2. Validation Record (per Hypothesis Lifecycle Standard) for the linked hypothesis
3. Promotion candidate (if EPS threshold crossed) per Evidence Collection Plan

---

## 9. Seal

```
EXPERIMENT PLAN DRAFTED 2026-07-15.
4 experiments registered (one per first hypothesis).
Each has ID, owner, variants, sample, duration, metrics, stop condition, success criterion.
Anti-cohabitation rule defined.
```
