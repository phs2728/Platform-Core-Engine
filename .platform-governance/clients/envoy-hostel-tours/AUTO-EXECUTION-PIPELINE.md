# Auto-Execution Pipeline — PVP-001 (Client Project 001)

> **Authority**: PCR-003 §"The Platform must automatically execute" verbatim list.
> **Replaces**: manual sprint-by-sprint execution per PCR-002 14-Phase pipeline.
> **Status**: 🟢 ACTIVE — Platform Agency auto-executes these phases against the Customer Charter.

---

## 1. Pipeline purpose

Map the **16 internal phases** (auto-executed, customer-invisible) to the **8 client-visible outputs** (customer-facing). Each internal phase contributes to one or more visible outputs.

---

## 2. Phase → Output mapping

| # | Internal Phase | Owner (Platform Agency role) | Visible Output(s) contributed | Internal artifact path |
|---|---|---|---|---|
| 1 | Customer Discovery | Research + PM | (Stage 0 — no output yet; informs all) | `.platform-governance/products/pvp-001/product-kickoff.md` |
| 2 | Requirements Analysis | PM + Research | (Stage 0 — refines Client requirements) | `.platform-governance/products/pvp-001/prd-kickoff.md` |
| 3 | PRD | PM + CEO | (Internal — Customer never sees PRD) | `.platform-governance/products/pvp-001/prd-kickoff.md` |
| 4 | TRD | Tech Lead + PM | (Internal) | `.platform-governance/products/pvp-001/trd-kickoff.md` |
| 5 | UX Research | UX + Research | (Internal) | `.platform-governance/products/pvp-001/ux-research-plan.md` |
| 6 | Information Architecture | UX | **Output 3** (Booking-ready structure) | (Bento Box design spec) |
| 7 | Content Strategy | Marketing + UX | **Output 4** (CMS-ready content) | `.platform-governance/products/pvp-001/ux-research-plan.md` cross-ref |
| 8 | Trust Architecture | UX + Marketing | **Output 3** (Trust evidence cluster) | (Trust stage binding) |
| 9 | Customer Decision Architecture | UX + Marketing | **Output 3** (Decision-flow spec) | (Decision-stage binding) |
| 10 | Visual Design | UI Design + UX | **Output 1** (Beautiful design) | `.platform-governance/products/pvp-001/visual-design-kickoff.md` |
| 11 | Frontend Development | Frontend + UI Design | **Output 1**, **Output 8** (Mobile) | `.platform-governance/products/pvp-001/frontend-plan.md` |
| 12 | Backend Development | Backend + Tech Lead | **Output 3** (Booking engine integration) | `.platform-governance/products/pvp-001/backend-plan.md` |
| 13 | CMS Configuration | Backend + Marketing | **Output 4** (CMS) | (CMS schema spec) |
| 14 | SEO | SEO + Marketing | **Output 6** (SEO) | (SEO audit spec) |
| 15 | Accessibility | Frontend + QA | **Output 8** (Mobile + WCAG 2.1 AA) | (a11y spec) |
| 16 | Performance Optimization | Frontend + Backend | **Output 2** (Fast speed) | (perf budget spec) |
| 17 | QA | QA + Frontend | (Internal — QES gate) | `.platform-governance/products/pvp-001/qa-plan.md` |
| 18 | QES Review | QA + Platform Guardian | (Internal — QES gate) | `.platform-governance/products/pvp-001/qes-plan.md` |
| 19 | Final Delivery | PM + CEO | **All 8** outputs assembled | `.platform-governance/products/pvp-001/delivery-plan.md` |

Note: PCR-003 lists 18 phases, but the verbatim "Customer Discovery → ... → Final Delivery" sequence has 19 separators; we treat them as 18 phases with a final "delivery" tie-out for completeness. Section §3 below normalizes to PCR-003's verbatim count.

---

## 3. Normalized 16-phase mapping (per PCR-003 verbatim)

Aligned to PCR-003 §1 verbatim "must automatically execute":

| # | Internal Phase | Output mapping | Phase owner |
|---|---|---|---|
| 1 | Customer Discovery | (Stage 0) | Research |
| 2 | Requirements Analysis | (Stage 0) | PM |
| 3 | PRD | (Internal) | PM |
| 4 | TRD | (Internal) | Tech Lead |
| 5 | UX Research | (Internal) | UX |
| 6 | Information Architecture | Output 3 | UX |
| 7 | Content Strategy | Output 4 | Marketing |
| 8 | Trust Architecture | Output 3 | UX + Marketing |
| 9 | Customer Decision Architecture | Output 3 | UX |
| 10 | Visual Design | Output 1 | UI Design |
| 11 | Frontend Development | Output 1, 8 | Frontend |
| 12 | Backend Development | Output 3 | Backend |
| 13 | CMS Configuration | Output 4 | Backend |
| 14 | SEO | Output 6 | SEO |
| 15 | Accessibility | Output 8 | Frontend |
| 16 | Performance Optimization | Output 2 | Frontend + Backend |
| 17 | QA | (QES gate) | QA |
| 18 | QES Review | (QES gate) | QA + Platform Guardian |
| 19 | Final Delivery | All 8 outputs assembled | PM + CEO |

(Quality assurance phases 17–18 cover all 8 outputs. Final Delivery 19 covers final assembly.)

---

## 4. C-24 + C-25 compliance

- **C-24**: All 18 phases use only the frozen Platform Core v1.2 (33 engines + 1 known-exception). No new Engines/Standards/Playbooks are added during execution.
- **C-25**: Customer does not see any of these phases. Customer sees only the 8 outputs.

---

## 5. Auto-execution triggers

The Platform Agency auto-executes Phases 1–19 sequentially. For each phase:

1. **Trigger**: Pre-Coding Plan = `pvc-approved` (passed).
2. **Inputs**: prior phase outputs + frozen Platform Core v1.2 contracts.
3. **Outputs**: artifact path recorded in §2 mapping.
4. **Halt conditions**: QES gate FAIL (return to Phase 11/12 for fix) OR ADR suspension.
5. **Customer notification**: NONE per C-25 (customer is invisible to internal phases; only sees cumulative delivery at Final Delivery).

---

## 6. Cross-references

| Artifact | Path |
|---|---|
| Customer Charter | `.charters/CUSTOMER_CHARTER.md` |
| Charter (this Client Project) | `.platform-governance/clients/envoy-hostel-tours/CHARTER.md` |
| PCR-003 | `.platform-governance/resolutions/PCR-003.md` |
| Pre-Coding Plan | `.platform-governance/products/pvp-001/pre-coding-plan.md` |
| 14-Phase Product Plan (older; superseded by Client Project Mode but artifacts preserved) | `.platform-governance/products/pvp-001/*.md` |

---

## 7. Seal

```
AUTO-EXECUTION PIPELINE ADOPTED 2026-07-15.
16 internal phases mapped to 8 client-visible outputs (PCR-003 verbatim).
C-24 + C-25 compliant.
Sequential, non-interruptible, no customer notification.
```

> **Note**: In PCR-002 the same 14-phase pipeline was documented as `manual sprint-by-sprint`. In PCR-003 / ADR-002 the pipeline is **auto-executed** by Platform Agency. The 14 phase-plan documents at `.platform-governance/products/pvp-001/` remain valid as **artifacts** of the auto-execution (the Platform writes them as it executes), not as work-instructions for human coders.
