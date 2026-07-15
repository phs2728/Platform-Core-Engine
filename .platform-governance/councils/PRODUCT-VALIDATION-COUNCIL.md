# Product Validation Council — OPENED

**Status**: 🟢 OPENED (effective 2026-07-14)
**Authority**: Platform Council Resolution PCR-001 §1 item 9
**Opening resolution**: PCR-001
**Seat**: replaces the now-closed Recovery Council

---

## 1. Mandate

The Product Validation Council (PVC) is the standing body responsible for ensuring that **Platform knowledge evolves from validated production evidence**, never from reconstruction, speculation, or unverified assumption.

The PVC's mandate arises from two complementary sources:

1. **PCR-001 §1 item 7–8** — Only reusable capabilities validated through Discovery Beta → Experiment → Evidence Promotion Standard may become Experience Engine v2. Platform knowledge must evolve from production, never from reconstruction.

2. **Knowledge Governance Standard** (`/opt/data/Knowledge_Governance_Standard.md`) — The PVC is the implementation owner for the Knowledge Governance Standard adopted 2026-07-14.

## 2. Responsibilities

| # | Responsibility | Source | Output |
|---|---|---|---|
| 1 | Maintain the Experiment Registry | `/opt/data/Experiment_Registry_Specification.md` | Versioned registry |
| 2 | Maintain the Evidence Promotion Standard (EPS) | `/opt/data/Evidence_Promotion_Standard.md` | Stable, versioned standard |
| 3 | Validate Envoy product evidence during Discovery Beta | `/opt/data/Discovery_Beta_Framework.md` | Validation Records |
| 4 | Promote validated capabilities (Level 0 → 5) | EPS | Promoted Platform knowledge |
| 5 | Convey Knowledge Review Board decisions | `/opt/data/Experiment_Standard.md` §PART 7 | Decisions (Approve / Reject / Needs More Evidence / Archive) |
| 6 | Maintain lifecycle of Platform knowledge (Candidate / Active / Deprecated / Superseded / Archived) | `/opt/data/Knowledge_Lifecycle.md` | Lifecycle state transitions |
| 7 | Coordinate with Envoy product team for production evidence | PCR-001 §1 items 5–6 | Evidence Pipeline |

## 3. Forbidden actions

The PVC shall **never**:

- Promote a hypothesis or assumption directly to Platform knowledge.
- Promote product-specific learning as Platform-wide rule without cross-product validation.
- Promote an Experience pattern from documents, PRDs, or memory.
- Auto-promote any candidate without explicit owner / executive approval.
- Silently delete or overwrite knowledge — supersession must be versioned and reversible.

## 4. Authority and interface

| Direction | Counterparty | Interface |
|---|---|---|
| Receives Evidence from | Envoy product team | Validation Records + Evidence Artifacts |
| Receives promotion requests from | Any Engine maintainer | Promotion Request Form (per EPS) |
| Reports to | Platform Owner (사장님 박흥식 / Tim Park) | Periodic Council report |
| Coordinates with | Knowledge Review Board (cross-functional) | Cross-product confirmation |
| Replaces (effective 2026-07-14) | Recovery Council | All source-disposition responsibilities |

## 5. Decision rules

| Decision | Required evidence | Voting |
|---|---|---|
| Approve promotion to next EPS level | Level-appropriate (Levels 0–5 thresholds per `/opt/data/Evidence_Promotion_Standard.md`) | Majority of Council + Owner sign-off |
| Reject promotion | Inadequate evidence / failed quality review | Recorded, never silent |
| Send back for "Needs More Evidence" | Specific gaps | Recorded |
| Archive | Knowledge superseded or invalidated | Recorded with supersession link |

## 6. Cross-references

| Artifact | Path |
|---|---|
| Knowledge Governance Standard | `/opt/data/Knowledge_Governance_Standard.md` |
| Evidence Promotion Standard | `/opt/data/Evidence_Promotion_Standard.md` |
| Experiment Standard | `/opt/data/Experiment_Standard.md` |
| Hypothesis Lifecycle Standard | `/opt/data/Hypothesis_Lifecycle_Standard.md` |
| Discovery Alpha Framework | `/opt/data/Discovery_Alpha_Framework.md` |
| Discovery Beta Framework | `/opt/data/Discovery_Beta_Framework.md` |
| Validation Lifecycle | `/opt/data/Validation_Lifecycle.md` |
| Platform Learning Flow | `/opt/data/Platform_Learning_Flow.md` |
| Executive Decision Flow | `/opt/data/Executive_Decision_Flow.md` |
| PCR-001 | `.platform-governance/resolutions/PCR-001.md` |
| Experience Engine Charter | `.charters/EXPERIENCE_ENGINE_CHARTER.md` |

## 7. Seal

```
PRODUCT VALIDATION COUNCIL OPENED 2026-07-14.
PCR-001 §1 item 9 executed.
First standing responsibility: receiving Envoy Discovery Beta evidence.
PVC will not promote speculation. PVC will not delete knowledge.
The PVC evolves Platform from production.
```
