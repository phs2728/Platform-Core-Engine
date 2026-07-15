---
product_id: PVP-001
product_name: "Envoy Hostel & Tours"
version: 0.1.0
status: kickoff-draft
filed: 2026-07-15
founder: 사장님 박흥식 / Tim Park
platform_version_at_kickoff: v1.1 (Frozen + ADR-001 amendments)
authority: PCR-002 (Product Validation Council, adopted 2026-07-15)
---

# PVP-001 Product Kickoff — Envoy Hostel & Tours

> **Authority**: Platform Council Resolution PCR-002 §"FIRST PRODUCT" block (verbatim, 2026-07-15).
> **Platform**: Core v1.1 Frozen (C-24 binding).
> **Status**: kickoff-draft — Pre-Coding Plan not yet pvc-approved.

---

## 1. Identity

| Field | Value |
|---|---|
| Product ID | **PVP-001** |
| Product Name | **Envoy Hostel & Tours** |
| Original lineage | Envoy Hostel → Envoy Product Lab → Envoy Hostel & Tours |
| Role | **Canonical Platform Validation Project (per PCR-002)** |
| Mission | Discover reality through real customer behavior; let validated reality teach the Platform, not the reverse |
| Filing root | `.platform-governance/products/pvp-001/` |
| Founder | 사장님 박흥식 / Tim Park (CEO + PM + Platform Owner) |
| Product Manager | TBD (see Agent Role Matrix) |
| Status | kickoff-draft → discovery-beta → pre-coding-approved → build → beta |

---

## 2. Mission statement

> **The objective is NOT to prove the Platform.**
> **The objective is to discover reality.**
> **Every assumption must be validated.**
> **Every hypothesis must become evidence.**

(Verbatim from PCR-002 §"MISSION".)

Operationally:
- We assume NOTHING that has not been observed in production.
- Every Hypothesis becomes Evidence, Rejection, Replacement, or Deprecation.
- The Platform earns the right to evolve based on what PVP-001 actually proves.
- C-24 (Constitution §15) is in force: no new Engines/Standards/Playbooks can be added during Product Development unless production evidence from PVP-001 (or a future Product) triggers an ADR.

---

## 3. The 14-Phase Product Development pipeline (canonical)

Per PCR-002 §"PHASES" block (verbatim). Order shall not be reversed.

| # | Phase | Output | Owner (primary) | Gate to enter next phase |
|---|---|---|---|---|
| 1 | Discovery Beta | Discovery Beta Checklist PASS | Product Manager | All 14 hypotheses registered with status; at least 3 evidence sources identified |
| 2 | PRD | PRD (refreshed) | Product Manager + CEO | All hypotheses tied to PRD sections; success metrics drafted |
| 3 | TRD | TRD (refreshed) | Tech Lead + Product Manager | Architecture maps PRD into Platform engine calls; no new engines required |
| 4 | UX | UX Research Plan + UX Output | UX | UX research findings tied to at least 4 hypotheses |
| 5 | Visual Design | Visual Design System + Key Screens | UI Design | Visual system tested against brand DNA + UX findings |
| 6 | Frontend | Frontend Implementation | Frontend | **Pre-Coding Plan = pvc-approved** (Constitution §17) |
| 7 | Backend | Backend Implementation | Backend | Frontend Phase ≥ 80% complete; QA gates on backend integration |
| 8 | QA | QA Plan + QA Test Reports | QA | All critical-path tests passing |
| 9 | QES | QES Compliance Report | QA / Platform Guardian | QES v1 (`.quality` standard) all six gates PASS |
| 10 | Deployment | Deployed URL + Release Notes | Backend / DevOps | Smoke test on production URL |
| 11 | Analytics | Analytics Implementation + Dashboard | Analytics | Real traffic flowing; events firing |
| 12 | Customer Interview | Interview Transcripts + Sentiment | Research | ≥ 5 interviews per persona, recorded with consent |
| 13 | Evidence Collection | Validated Evidence Records (Level 0 → 2+) | Analytics + Research | Each hypothesis advanced or rejected with evidence |
| 14 | Platform Learning | Promotion Candidates + ADR proposals (if any) | PM + PVC | At least one EPS L2 evidence; promotion path L4 proposed only after multi-product or repeat-production evidence |

### Phasing rules

- **Phase 6 (Frontend) and Phase 7 (Backend) cannot begin until Pre-Coding Plan = `pvc-approved`.**
- The Pre-Coding Plan is the single gate enforced by Constitution §17 / Product Lab Standard operative §3.
- Each phase produces a deliverable archived at `.platform-governance/products/pvp-001/<phase>.md`.
- The phase artifacts together constitute the canonical record of PVP-001's evidence chain.

---

## 4. Inherited artifacts (Discovery Alpha inputs)

These exist before Phase 1 begins; they are content (not the formal container):

| Artifact | Path | Position |
|---|---|---|
| Brand DNA Report | `/opt/data/Brand_DNA_Report.md` | Alpha input → Phase 4 (UX), Phase 5 (Visual) |
| Customer Discovery Report | `/opt/data/Customer_Discovery_Report.md` | Alpha input → Phase 1 (Beta), Phase 12 (Interviews) |
| Customer Decision Architecture | `/opt/data/Customer_Decision_Architecture.md` | Alpha input → Phase 4 (UX), Phase 11 (Analytics) |
| Trust Evidence Blueprint | `/opt/data/Trust_Evidence_Blueprint.md` | Alpha input → Phase 5 (Visual), Phase 11 (Analytics) |
| Content Strategy Blueprint | `/opt/data/Content_Strategy_Blueprint.md` | Alpha input → Phase 5 (Visual) |
| Product Strategy | `/opt/data/envoy-product-strategy.md` | Alpha input → Phase 2 (PRD) |
| Product Ecosystem Map | `/opt/data/Envoy_Product_Ecosystem_Map.md` | Alpha input → Phase 7 (Backend) |
| Implementation Readiness Report | `/opt/data/Implementation_Readiness_Report.md` | Alpha PASS output (predecessor to current kickoff) |
| PRD (legacy, will be refreshed in Phase 2) | `/opt/data/envoy-hostel-prd.md` | Input to PRD refresh |
| TRD Validation | `/opt/data/envoy-hostel-trd-validation.md` | Input to TRD refresh |
| IRP-001 | `/opt/data/envoy-hostel-irp-001.md` | Pre-coding plan predecessor (legacy) |
| HPR-001 (PRD Review Gate) | `/opt/data/envoy-hostel-prd-review-gate-hpr001.md` | Discovery Alpha gate artifact |
| Platform Audit | `/opt/data/envoy-platform-audit.md` | Platform fit review |

These artifacts are **inputs** — they are not validated outputs yet. Phase 1 (Discovery Beta) is what starts validating them.

---

## 5. Hypotheses inherited (re-designated)

| Old ID | New ID | Hypothesis | Status |
|---|---|---|---|
| HYP-ENVOY-001 | **HYP-PVP-001-001** | Customers' trust is determined by specific booking-page content (photos, reviews, policies, manager profile, etc.) | Hypothesis |
| HYP-ENVOY-002 | **HYP-PVP-001-002** | Specific detail-page sections measurably improve booking conversion (room gallery, neighborhood map, transparent pricing, cancellation policy visibility) | Hypothesis |
| HYP-ENVOY-003 | **HYP-PVP-001-003** | Specific CTAs outperform others (sticky-book vs. floating vs. inline; specific copy vs. generic; urgency vs. trust) | Hypothesis |
| HYP-ENVOY-004 | **HYP-PVP-001-004** | Specific Trust Evidence items measurably increase bookings (reviews count, Google rating badge, secure-payment icons, refundability badge, manager photo+name, response time) | Hypothesis |

These four hypotheses are the **first Beta questions** for PVP-001. They are explicitly Unknowns. They become Verified, Rejected, Replaced, or Deprecated only through validated reality.

---

## 6. Agent hierarchy (verbatim from PCR-002)

```
CEO
  │
Product Manager
  │
Research
  │
UX
  │
UI Design
  │
Frontend
  │
Backend
  │
SEO
  │
Marketing
  │
QA
  │
Analytics
```

The hierarchy is informational; ownership boundaries are detailed in the Agent Role Matrix (`.platform-governance/products/pvp-001/agent-role-matrix.md`).

CEO owns vision, market, capital, and ultimate accountability. PM owns scope, schedule, and Phase gates. Each downstream role owns its discipline-specific deliverables.

---

## 7. Mandatory rules (verbatim from PCR-002)

| # | Rule | Enforcement |
|---|---|---|
| 1 | Never modify Platform Core because of opinions | C-24 (Constitution §15) + Charter §1 |
| 2 | Never create new Engines during Product Development | C-24 |
| 3 | Never create new Standards during Product Development | C-24 |
| 4 | Never create new Playbooks during Product Development | C-24 |
| 5 | Only production evidence may trigger an ADR | C-24 + ADR Rule 5.2 + Knowledge Governance Standard |

---

## 8. What PVP-001 is NOT

- Not a Platform engine.
- Not a Platform extension.
- Not a copy of any existing Product.
- Not a redesign of Platform Core.
- Not a prototype for "proving the Platform".

What PVP-001 IS:

- The canonical Platform Validation Project.
- A Product Lab.
- The first Producer of evidence that may flow back to Platform knowledge (per EPS ladder).

---

## 9. Status snapshot

| Aspect | Status |
|---|---|
| Pre-Coding Plan filed | ✅ at `.platform-governance/products/pvp-001/pre-coding-plan.md` (filed 2026-07-15) |
| PVC review of Pre-Coding Plan | ⏳ pending (chair sign-off required to begin Phase 6/7) |
| Discovery Beta Phase 1 | ⏳ about to begin (checklist filed) |
| Phases 6–7 (Frontend / Backend) | ⏳ gated on PVC approval |
| Phase 10 (Deployment) | ⏳ target once MVP build complete |
| Phase 13 (Evidence Collection) | ⏳ target after first 30 days of production traffic |
| Phase 14 (Platform Learning) | ⏳ target after first EPS L2 evidence |

---

## 10. Cross-references

| Artifact | Path |
|---|---|
| PCR-002 | `.platform-governance/resolutions/PCR-002.md` |
| PCR-001 | `.platform-governance/resolutions/PCR-001.md` |
| ADR-001 | `docs/ADR/ADR-001-platform-freeze-rule.md` |
| Platform Constitution v1.1 | `docs/000_PLATFORM_CONSTITUTION.md` |
| Charter (Experience Engine) | `.charters/EXPERIENCE_ENGINE_CHARTER.md` |
| Exception EXC-EXPERIENCE-001 | `.platform-governance/exceptions/EXC-EXPERIENCE-001.md` |
| Product Lab Standard (operative) | `/opt/data/Product_Lab_Standard.md` |
| Discovery Beta Framework | `/opt/data/Discovery_Beta_Framework.md` |
| Hypothesis Lifecycle Standard | `/opt/data/Hypothesis_Lifecycle_Standard.md` |
| Evidence Promotion Standard | `/opt/data/Evidence_Promotion_Standard.md` |
| All 11 deliverables | `.platform-governance/products/pvp-001/*.md` |

---

## 11. Seal

```
PVP-001 KICKOFF DRAFT 2026-07-15.
PCR-002 EXECUTED.
14 phases queued; 11 deliverable plans filed.
Pre-Coding Plan filed for PVC review.
Platform Core v1.1 frozen and certified.
Product Era begins.
```
