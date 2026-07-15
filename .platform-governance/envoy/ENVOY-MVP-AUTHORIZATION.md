# Envoy Product Lab Authorization (formerly "Envoy MVP Authorization")

**Project name**: **Envoy Product Lab** (re-designated 2026-07-15 per Constitution §16.4 / ADR-001)
**Former name**: Envoy Hostel MVP (renamed)
**Status**: 🟢 AUTHORIZED (effective 2026-07-14 under PCR-001; re-designated 2026-07-15 by ADR-001)
**Authority**: Platform Council Resolution PCR-001 §1 items 5 and 6; **Platform Constitution §16 (Product Lab Principle) [ADR-001]**; **§17 (Product Lab Standard) [ADR-001]**
**Sequence position**: After Platform Freeze v1.1, Before Discovery Beta

---

## 1. Authorization

PCR-001 §1 item 5: **Begin Envoy MVP immediately.**
PCR-001 §1 item 6: **The Envoy project becomes the canonical Experience Engine validation project.**

ADR-001 / Constitution §16.4 (2026-07-15): Envoy is re-designated **Envoy Product Lab**. Envoy operates as a **Laboratory for the Platform**: its purpose is to (a) ship a real product (hostel website for real customers) AND (b) generate production evidence that may flow back into Platform knowledge through the canonical Product Lab loop (§16.2).

Envoy is the first product to operate under Platform Core v1.0 (frozen at tag `platform-core-v1.0-freeze`). Envoy's role is threefold:

1. **As a Product**: Build a real hostel website and acquire real customers.
2. **As a Validation Project**: Generate the production evidence that will become Experience Engine v2.
3. **As a Laboratory**: Operate the canonical Product Lab loop (Constitution §16.2), producing Hypotheses → Metrics → Experiments → Success Criteria → Learning Goals.

## 2. Envoy's relationship to the 4-council structure

| Council | Envoy relationship |
|---|---|
| Platform Council | Envoy is a consumer of frozen Platform Core v1.0 (read-only against Core) |
| Recovery Council | CLOSED — irrelevant to Envoy |
| Product Validation Council | Envoy is the **first** validation project under PVC. Envoy's evidence feeds PVC. |
| Knowledge Review Board (nested in PVC) | Will review Envoy's evidence for promotion to Platform v2 |

## 3. Envoy's relationship to Existing Artifacts

Envoy already has Discovery Alpha artifacts in place:

| Artifact | Path | Status |
|---|---|---|
| Brand DNA Report | `/opt/data/Brand_DNA_Report.md` | Alpha input |
| Customer Discovery Report | `/opt/data/Customer_Discovery_Report.md` | Alpha input |
| Customer Decision Architecture | `/opt/data/Customer_Decision_Architecture.md` | Alpha input |
| Content Strategy Blueprint | `/opt/data/Content_Strategy_Blueprint.md` | Alpha input |
| Trust Evidence Blueprint | `/opt/data/Trust_Evidence_Blueprint.md` | Alpha input |
| Product Strategy | `/opt/data/envoy-product-strategy.md` | Alpha input |
| Product Ecosystem Map | `/opt/data/Envoy_Product_Ecosystem_Map.md` | Alpha input |
| Implementation Readiness Report | `/opt/data/Implementation_Readiness_Report.md` | Alpha PASS output (partial) |
| PRD | `/opt/data/envoy-hostel-prd.md` | Alpha PASS output |
| TRD Validation | `/opt/data/envoy-hostel-trd-validation.md` | Alpha PASS output |
| IRP-001 | `/opt/data/envoy-hostel-irp-001.md` | Implementation Plan (pre-build) |
| HPR-001 (PRD Review Gate) | `/opt/data/envoy-hostel-prd-review-gate-hpr001.md` | Alpha gate artifact |
| Platform Audit | `/opt/data/envoy-platform-audit.md` | Platform fit review |

Per the Discovery Framework adopted 2026-07-14, these Alpha artifacts are **Planning Evidence** — they justify building the MVP. They are NOT yet Production Evidence. Beta is what converts them to Verified/Observed.

Per ADR-001 / Constitution §17 (Product Lab Standard), these artifacts will be re-positioned as **inputs to the Pre-Coding Plan** (`.platform-governance/products/envoy/pre-coding-plan.md`) — they are content, not the formal container. The Six Required Fields (Hypotheses, Metrics, Experiments, Success Criteria, Learning Goals, Pre-Coding Sign-off) is the formal container; Alpha artifacts provide the substance.

## 4. Initial Hypothesis Register (per Council Chair's directives)

The Council Chair identified four evidence questions as the first concerns Envoy must validate. These are hereby **registered as the first set of Alpha-level Hypotheses** for the Product Validation Council:

| ID | Hypothesis | Type | Owner | Status | Validation plan |
|---|---|---|---|---|---|
| HYP-ENVOY-001 | Customers' trust is determined by specific booking-page content (photos, reviews, policies, manager profile, etc.) | Customer | Envoy PM | Hypothesis | Beta: A/B test variants on Envoy booking page |
| HYP-ENVOY-002 | Specific detail-page sections measurably improve booking conversion (e.g., room gallery, neighborhood map, transparent pricing, cancellation policy visibility) | Product | Envoy PM | Hypothesis | Beta: funnel analytics with section-level visibility |
| HYP-ENVOY-003 | Specific CTAs outperform others (sticky-book vs. floating vs. inline; specific copy vs. generic; urgency vs. trust) | Product | Envoy PM | Hypothesis | Beta: A/B test CTA variants and track conversion |
| HYP-ENVOY-004 | Specific Trust Evidence items measurably increase bookings (reviews count, Google rating badge, secure-payment icons, refundability badge, manager photo+name, response time) | Customer + Trust | Envoy PM | Hypothesis | Beta: A/B test evidence placement; track booking delta |

These four hypotheses are the canonical Beta questions for Envoy. **None of them are answered today.** They are explicitly **Unknowns**, not fact. They are the things Beta must validate.

## 5. What Envoy Product Lab means — concretely

Per PCR-001 §1 item 5 ("Begin Envoy MVP immediately") AND Constitution §16 (Product Lab Principle) AND §17 (Product Lab Standard):

### 5.1 Envoy Product Lab canonical loop (Constitution §16.2, verbatim)

```
Envoy Discovery Beta
↓
PRD
↓
TRD
↓
UI / UX
↓
Development
↓
QES
↓
Deploy
↓
Analytics
↓
Customer Interviews
↓
Evidence
↓
Platform Learning
```

This is the canonical order of operations for an Envoy Product Lab cycle. Order shall not be reversed.

### 5.2 Higher-level sequence

```
Envoy Product Lab Build (cycles of §5.1)
  ↓
Discovery Beta Evidence accumulates across cycles
  ↓
HYP-ENVOY-001, 002, 003, 004 are tested and resolved
  ↓
Experiment Records filed at .platform-governance/experiments/
  ↓
Validation Records feed PVC
  ↓
Promotion (per EPS) gates capability that becomes Experience Engine v2
```

### 5.3 Pre-coding gate (Constitution §17 + Product Lab Standard operative)

Envoy's coding MAY begin ONLY after Envoy's Pre-Coding Plan (`.platform-governance/products/envoy/pre-coding-plan.md`) is `pvc-approved`. Until then, only:

- Filing the Pre-Coding Plan.
- Self-review (§3.2 of operative document).
- PVC review (§4 of operative document).

are permitted. See `/opt/data/Product_Lab_Standard.md` §4 for the gating process.

## 6. Forbidden activities (per Charter + PCR-001 + C-24)

Envoy Product Lab **MUST NOT**:

- Reverse-engineer or re-implement Experience Engine source code (Charter §1).
- Manufacture "evidence" to validate Hypotheses (PCR-001 §1 item 8 + Knowledge Governance Standard: "Platform must learn only from validated reality").
- Edit Platform Core v1.0 (Core is frozen; only tag `platform-core-v1.0-freeze`).
- Promote any Envoy-specific learning to Platform-wide pattern without EPS Level 4 (multi-product or repeatable production evidence).
- **Add a new Platform Engine, Standard, or Playbook** without production evidence (Constitution §15 / C-24) — applies to every team member, including the Envoy team.
- **Begin coding** without a Pre-Coding Plan approved by PVC (Constitution §17 / Product Lab Standard).

Envoy Product Lab **SHOULD**:

- Operate against frozen Platform Core v1.0.
- Capture hypothesis status transitions (Hypothesis → Testing → Verified/Rejected/Replaced/Deprecated).
- File Experiment Records at `.platform-governance/experiments/` per Experiment Standard.
- Treat A/B-test results as Product Evidence, not Platform Knowledge — promotion comes later.
- File Pre-Coding Plan at the canonical path before any line of code is written.

## 7. Cross-references

| Artifact | Path |
|---|---|
| PCR-001 | `.platform-governance/resolutions/PCR-001.md` |
| ADR-001 | `docs/ADR/ADR-001-platform-freeze-rule.md` |
| Platform Constitution §15-§17 [ADR-001] | `docs/000_PLATFORM_CONSTITUTION.md` |
| Product Validation Council Charter | `.platform-governance/councils/PRODUCT-VALIDATION-COUNCIL.md` |
| **Product Lab Standard (operative)** | `/opt/data/Product_Lab_Standard.md` |
| Discovery Alpha Framework | `/opt/data/Discovery_Alpha_Framework.md` |
| Discovery Beta Framework | `/opt/data/Discovery_Beta_Framework.md` |
| Hypothesis Lifecycle Standard | `/opt/data/Hypothesis_Lifecycle_Standard.md` |
| Evidence Promotion Standard | `/opt/data/Evidence_Promotion_Standard.md` |
| Experience Engine Charter | `.charters/EXPERIENCE_ENGINE_CHARTER.md` |
| Envoy PRD (legacy) | `/opt/data/envoy-hostel-prd.md` |
| Envoy Pre-Coding Plan (to be filed) | `.platform-governance/products/envoy/pre-coding-plan.md` |

## 8. Seal

```
ENVOY PRODUCT LAB AUTHORIZED 2026-07-14.
RE-DESIGNATED 2026-07-15: Envoy -> Envoy Product Lab (Constitution §16.4).
Authority now anchored in PCR-001 + Constitution §16, §17 + ADR-001.
Discovery Alpha already PASSED via prior artifacts.
Canonical Product Lab loop per Constitution §16.2 (11 steps; verbatim).
Pre-coding gate enforced by PVC per Constitution §17 + Product Lab Standard.
First registered hypotheses: HYP-ENVOY-001, 002, 003, 004.
Knowledge flow direction: Platform -> Product -> Evidence -> Platform (only).
Reverse direction forbidden.
Experience Engine v2 will be built from validated Envoy reality, never from memory.
```
