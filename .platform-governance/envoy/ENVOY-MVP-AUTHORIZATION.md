# Envoy MVP Authorization

**Status**: 🟢 AUTHORIZED (effective 2026-07-14)
**Authority**: Platform Council Resolution PCR-001 §1 items 5 and 6
**Sequence position**: After Platform Freeze, Before Discovery Beta

---

## 1. Authorization

PCR-001 §1 item 5: **Begin Envoy MVP immediately.**
PCR-001 §1 item 6: **The Envoy project becomes the canonical Experience Engine validation project.**

Envoy Hostel is the first product to operate under Platform Core v1.0 (frozen at tag `platform-core-v1.0-freeze`). Envoy's role is twofold:

1. **As a Product**: Build a real hostel website and acquire real customers.
2. **As a Validation Project**: Generate the production evidence that will become Experience Engine v2.

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

## 4. Initial Hypothesis Register (per Council Chair's directives)

The Council Chair identified four evidence questions as the first concerns Envoy must validate. These are hereby **registered as the first set of Alpha-level Hypotheses** for the Product Validation Council:

| ID | Hypothesis | Type | Owner | Status | Validation plan |
|---|---|---|---|---|---|
| HYP-ENVOY-001 | Customers' trust is determined by specific booking-page content (photos, reviews, policies, manager profile, etc.) | Customer | Envoy PM | Hypothesis | Beta: A/B test variants on Envoy booking page |
| HYP-ENVOY-002 | Specific detail-page sections measurably improve booking conversion (e.g., room gallery, neighborhood map, transparent pricing, cancellation policy visibility) | Product | Envoy PM | Hypothesis | Beta: funnel analytics with section-level visibility |
| HYP-ENVOY-003 | Specific CTAs outperform others (sticky-book vs. floating vs. inline; specific copy vs. generic; urgency vs. trust) | Product | Envoy PM | Hypothesis | Beta: A/B test CTA variants and track conversion |
| HYP-ENVOY-004 | Specific Trust Evidence items measurably increase bookings (reviews count, Google rating badge, secure-payment icons, refundability badge, manager photo+name, response time) | Customer + Trust | Envoy PM | Hypothesis | Beta: A/B test evidence placement; track booking delta |

These four hypotheses are the canonical Beta questions for Envoy. **None of them are answered today.** They are explicitly **Unknowns**, not fact. They are the things Beta must validate.

## 5. What Envoy MVP means — concretely

Per PCR-001 §1 item 5 ("Begin Envoy MVP immediately"), Envoy MVP authorization permits the following sequence:

```
Envoy MVP Build
  ↓
Envoy MVP Release (real public URL)
  ↓
Real customer traffic accumulates
  ↓
Discovery Beta Evidence Collection begins
  ↓
HYP-ENVOY-001, 002, 003, 004 are tested
  ↓
Experiment Records are filed at .platform-governance/experiments/
  ↓
Validation Records feed PVC
  ↓
Promotion (per EPS) gates capability that becomes Experience Engine v2
```

## 6. Forbidden activities (per Charter + PCR-001)

Envoy MVP **MUST NOT**:

- Reverse-engineer or re-implement Experience Engine source code (Charter §1).
- Manufacture "evidence" to validate Hypotheses (PCR-001 §1 item 8 + Knowledge Governance Standard: "Platform must learn only from validated reality").
- Edit Platform Core v1.0 (Core is frozen; only tag `platform-core-v1.0-freeze`).
- Promote any Envoy-specific learning to Platform-wide pattern without EPS Level 4 (multi-product or repeatable production evidence).

Envoy MVP **SHOULD**:

- Operate against frozen Platform Core v1.0.
- Capture hypothesis status transitions (Hypothesis → Testing → Verified/Rejected/Replaced/Deprecated).
- File Experiment Records at `.platform-governance/experiments/` per Experiment Standard.
- Treat A/B-test results as Product Evidence, not Platform Knowledge — promotion comes later.

## 7. Cross-references

| Artifact | Path |
|---|---|
| PCR-001 | `.platform-governance/resolutions/PCR-001.md` |
| Product Validation Council Charter | `.platform-governance/councils/PRODUCT-VALIDATION-COUNCIL.md` |
| Discovery Alpha Framework | `/opt/data/Discovery_Alpha_Framework.md` |
| Discovery Beta Framework | `/opt/data/Discovery_Beta_Framework.md` |
| Hypothesis Lifecycle Standard | `/opt/data/Hypothesis_Lifecycle_Standard.md` |
| Evidence Promotion Standard | `/opt/data/Evidence_Promotion_Standard.md` |
| Experience Engine Charter | `.charters/EXPERIENCE_ENGINE_CHARTER.md` |
| Envoy MVP PRD | `/opt/data/envoy-hostel-prd.md` |

## 8. Seal

```
ENVOY MVP AUTHORIZED 2026-07-14.
PCR-001 §1 items 5–6 executed.
Discovery Alpha already PASSED via prior artifacts.
Next step: Discovery Beta → HYP-ENVOY-001, 002, 003, 004 are the first registered hypotheses.
PVC receives Envoy's Evidence Collection per its Charter.
Experience Engine v2 will be built from validated Envoy reality, never from memory.
```
