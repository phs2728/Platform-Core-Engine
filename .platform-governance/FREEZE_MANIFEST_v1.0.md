# Platform Core v1.2 — Freeze Manifest

**Version**: 1.2 (FROZEN; v1.0 + ADR-001 amendments + ADR-002 amendments)
**Freeze date**: 2026-07-14 (v1.0); 2026-07-15 (v1.1 — Constitution amended by ADR-001); 2026-07-15 (v1.2 — Constitution amended by ADR-002)
**Authority**: Platform Council Resolution PCR-001 §1 item 1 + ADR-001 [accepted 2026-07-15] + ADR-002 [accepted 2026-07-15]
**Adopted**: by Council Chair (사장님 박흥식 / Tim Park) unanimous vote
**Status**: 🔒 FROZEN (no further Platform-side additions except via new ADR per C-24)

---

## 0. What this document is

This is the **canonical record** of Platform Core v1.0 Freeze. It is the document a future reader must consult to verify:

1. What is in Platform Core v1.0.
2. What is intentionally NOT in Platform Core v1.0 (Known Exceptions).
3. What governance artifacts bind the freeze.
4. What the next permitted step is (Envoy MVP).

The Platform Core v1.0 freeze is recorded as a **git tag** (`platform-core-v1.0-freeze`) on the freeze branch (`feature/platform-freeze-v1`) HEAD. The tag name is the entrypoint; this manifest is the contents.

---

## 1. Identity

| Property | Value |
|---|---|
| Frozen branch | `feature/platform-freeze-v1` |
| Frozen HEAD commit | `155de9194a09739377f8b14b8c4fa57e71c55037` |
| Frozen message | `feat(freeze): merge feature/release-manager-engine-rebuilt into Platform Freeze` |
| Freeze tag | `platform-core-v1.0-freeze` (annotated; created at freeze time) |
| Freeze resolution | `.platform-governance/resolutions/PCR-001.md` |
| Freeze mechanism | Council Resolution (not automation) |
| Reviewable | Yes (any Council Resolution may amend future freezes) |

---

## 2. Engines in Platform Core v1.0

### 2.1 RC engines successfully merged into freeze (8 attempted; 7 merged)

| # | Engine | Original RC branch | Extracted branch | Merged at | Status |
|---|---|---|---|---|---|
| 1 | Creative Knowledge | `feature/creative-knowledge-rc1` | `feature/creative-knowledge-engine-rebuilt` | commit `fcc8670` | ✅ MERGED |
| 2 | Learning | `feature/learning-engine-rc1` | `feature/learning-engine-rebuilt` | commit `2012299` | ✅ MERGED |
| 3 | Theme | `feature/theme-engine-rc1` | `feature/theme-engine-rebuilt` | commit `c7388bd` | ✅ MERGED |
| 4 | Component | `feature/component-engine-rc1` | `feature/component-engine-rebuilt` | commit `86b7374` | ✅ MERGED |
| 5 | CMS | `feature/cms-engine-rc1` | `feature/cms-engine-rebuilt` | commit `87c50d7` | ✅ MERGED |
| 6 | Studio | `feature/studio-engine-rc1` | `feature/studio-engine-rebuilt` | commit `a09cee1` | ✅ MERGED |
| 7 | Release Manager | `feature/release-manager-sprint-1` | `feature/release-manager-engine-rebuilt` | commit `155de91` | ✅ MERGED |
| 8 | Experience | `feature/experience-engine-rc1` (intended) | (none) | (not merged) | ⛔ NOT MERGED — see §4 |

### 2.2 Pre-existing engines inherited from prior freeze-vision work (26 additional)

These engines were already present in freeze HEAD at the time of the 7 merge operations. They pre-date this audit cycle. Counted for completeness; their provenance is recorded in prior freeze audits (see `Engine_Provenance_Report.md` and `Platform_Verification_Report.md`).

| Group | Engines |
|---|---|
| Core / SDK | `core-sdk` |
| Identity / Organization | `identity`, `organization`, `authorization`, `user` |
| Commerce | `booking`, `billing`, `order`, `payment`, `pricing` |
| Content / Catalog | `catalog`, `communication`, `inventory`, `media`, `review` |
| Search / AI | `search`, `ai`, `query` |
| Operations | `policy`, `runtime`, `event-bus`, `address` |
| Platform internals | `agency-os`, `platform-validation`, `platform-guardian`, `platform-compatibility` |

(Full list: 33 engines with source + 1 engine `experience` with docs = 34 total engine directories at freeze HEAD.)

### 2.3 Total Engine inventory at freeze

| Status | Count | Engines |
|---|---|---|
| Implemented in HEAD | 33 | (above, 7 RC merges + 26 pre-existing) |
| Doc-only (not source-merged) | 1 | `experience` (README + TRUST doc only) |

---

## 3. Gate status at freeze (per engine class)

For the 7 RC engines that were merged during this audit cycle:

| Engine | Typecheck | Build | Test | Boundary | Dep* |
|---|---|---|---|---|---|
| Creative Knowledge | PASS | PASS | PASS (130) | PASS | FAIL (validator defect) |
| Learning | PASS | PASS | PASS (153) | PASS | FAIL (validator defect) |
| Theme | PASS | PASS | PASS (85) | PASS | FAIL (validator defect) |
| Component | PASS | PASS | PASS (74) | PASS | FAIL (validator defect) |
| CMS | PASS | PASS | PASS (50) | PASS | FAIL (validator defect) |
| Studio | PASS | PASS | PASS (35) | PASS | FAIL (validator defect) |
| Release Manager | PASS | PASS | PASS (50) | PASS | FAIL (validator defect) |

*Dep gate FAIL is **NOT** a contract violation. It is a known defect in `tools/scripts/dep-validator.ts` that walks `node_modules/` recursively and finds nested `engine.json` files. The dependency edges in each engine's `engine.json` are correct (verified by the import-boundary gate, which PASSES for all 7). This defect is a tooling bug, not a Platform contract violation, and is preserved at freeze for separate remediation under a future Platform Council Resolution (not within v1.0 scope).

## 4. Known Exception: Experience Engine

| Field | Value |
|---|---|
| Exception ID | `EXC-EXPERIENCE-001` |
| Engine | `engines/experience` |
| Classification | UNKNOWN PROVENANCE |
| Status | Deferred |
| Reason | "Provenance cannot be verified. Runtime integrity verified. Git provenance unavailable. Will be superseded by Experience v2 derived from production evidence." |

PCR-001 §1 item 4 mandates: **Do not merge the current Experience working tree into Platform Core.** Honored. Experience Engine is intentionally NOT in Platform Core v1.0.

Full exception details: `.platform-governance/exceptions/EXC-EXPERIENCE-001.md`
Provenance evidence: `Experience_Provenance_Report.md`, `Experience_Recovery_Classification.md`

## 5. Companion governance artifacts bound to this freeze

These artifacts are referenced by this freeze and must remain discoverable alongside the freeze tag:

| Companion governance artifacts bound to this freeze | Path | Role |
|---|---|---|
| Platform Council Resolution PCR-001 | `.platform-governance/resolutions/PCR-001.md` | Authority for this freeze |
| **PCR-002** | `.platform-governance/resolutions/PCR-002.md` | Product Development era; PVP-001 Product Lab 001 |
| **PCR-003** | `.platform-governance/resolutions/PCR-003.md` | Client Project Mode; PVP-001 re-designated |
| **ADR-001** | `docs/ADR/ADR-001-platform-freeze-rule.md` | Authority for v1.1 amendment (C-24 + Product Lab Principle + Product Lab Standard) |
| **ADR-002** | `docs/ADR/ADR-002-client-project-mode.md` | Authority for v1.2 amendment (C-25 + Customer Charter + PVP-001 Client Project re-designation) |
| Known Exception (Experience Engine) | `.platform-governance/exceptions/EXC-EXPERIENCE-001.md` | Documents what is deferred |
| Experience Engine Charter | `.charters/EXPERIENCE_ENGINE_CHARTER.md` | Binds future Experience evolution to product evidence only |
| **Customer Charter (C-25)** | `.charters/CUSTOMER_CHARTER.md` | Binds client-centric re-orientation; "플랫폼은 보이지 않는다. 고객의 결과물만 보인다." |
| Product Lab Standard (operative) | `/opt/data/Product_Lab_Standard.md` | Pre-coding gate enforced by PVC per Constitution §17 |
| Recovery Council Closure Notice | `.platform-governance/councils/RECOVERY-COUNCIL-CLOSED.md` | Discharges the disposition authority |
| Product Validation Council Charter | `.platform-governance/councils/PRODUCT-VALIDATION-COUNCIL.md` | Defines the next-step council |
| **Envoy Client Project Charter** | `.platform-governance/clients/envoy-hostel-tours/CHARTER.md` | First Client Project (PVP-001 re-designated) |
| **Envoy Auto-Execution Pipeline** | `.platform-governance/clients/envoy-hostel-tours/AUTO-EXECUTION-PIPELINE.md` | 16 internal phases × 8 visible outputs |
| **Envoy Delivery Checklist** | `.platform-governance/clients/envoy-hostel-tours/DELIVERY-CHECKLIST.md` | 8 client-visible deliverables (verbatim from PCR-003) |
| **Envoy Premium Delivery Check** | `.platform-governance/clients/envoy-hostel-tours/PREMIUM-DELIVERY-CHECK.md` | $10k+ gate criteria |
| Platform Constitution v1.2 (FROZEN + ADR-001 + ADR-002 amendments) | `docs/000_PLATFORM_CONSTITUTION.md` | Highest-level governance; amended to v1.2 by ADR-001 + ADR-002 |

## 6. Scope of the freeze

This freeze binds:

- Engine inventory (§2) — final at `155de91` HEAD.
- Known Exception (§4) — final at freeze time. Future modifications require a new Resolution.
- Companion governance (§5) — bound by reference; not modified by this freeze.

This freeze does **NOT** bind:

- Working tree changes outside `feature/platform-freeze-v1` (audit/verification reports written after HEAD remain uncommitted; see §7).
- Other branches (`feature/experience-engine-rc1` and others continue under their own governance).
- Future Platform Council Resolutions.

## 7. Working tree state at freeze

Recorded for transparency — these files exist on disk at freeze time but are not part of the freeze commit unless explicitly included by a follow-up commit:

| Class | Count | Examples |
|---|---|---|
| Modified M | 17 | `docs/platform/{api,compatibility,contract,dependency,event,health,reference,release}-report.md`; `engines/platform-compatibility/{cli,src,test}/*`; `engines/platform-guardian/package.json`; `pnpm-lock.yaml` |
| Untracked audit/verification reports | 24 | `Recovery_Failure_Report.md`, `Platform_Verification_Report.md`, `Engine_Provenance_Report.md`, etc. (previous audit cycle) |
| Untracked Provenance Audit (this cycle) | 5 | `Experience_{Provenance,Integrity,Missing_Files,Recovery_Classification,Council_Recommendation}.md` |
| Untracked `.charters/` | 1 directory | `.charters/EXPERIENCE_ENGINE_CHARTER.md` |
| Untracked `.platform-governance/` | 1 directory | (the entire governance tree seeded by this freeze action) |
| Untracked `engines/experience/{engine.json,package.json,src/,test/,tsconfig*.json}` | 6 entries | preserved as working-tree state of `feature/experience-engine-rc1` branch (NOT merge target) |

These files were inspected by the Provenance Audit; their disk presence is documented but **none of the untracked `engines/experience/*` source/test/config files are merged into the freeze branch**.

## 8. Freeze acceptance criteria — status

| Criterion | Status |
|---|---|
| 7 RC engines extracted, verified, and merged | ✅ |
| 1 RC engine (Experience) NOT merged; classified UNKNOWN PROVENANCE; deferred | ✅ per PCR-001 |
| Provenance of all merged engines traceable in git history | ✅ |
| Provenance of Experience disk-only files: documented as UNKNOWN; not classified | ✅ |
| Companion governance artifacts in place (Charter, PCR-001, Known Exception, PVC Charter) | ✅ (this manifest records their authorship) |
| Recovery Council closed | ✅ |
| Product Validation Council opened | ✅ |
| Envoy MVP authorized | ✅ per PCR-001 §1 item 5 |
| Sequencing per Council Chair's directive (Freeze → Envoy → Discovery Beta → Experience v2) | ✅ recorded |

## 9. Next step (per PCR-001 + ADR-001 + ADR-002)

Authorized next step: **Envoy Hostel & Tours Client Project** auto-execution. Authorized by:

- PCR-001 §1 items 5–6 (Envoy as canonical validation project)
- Constitution §16 (Product Lab Principle) [ADR-001]
- Constitution §17 (Product Lab Standard) [ADR-001]
- Constitution §18 (Client Project Principle, C-25) [ADR-002]
- ADR-001 §5 (Implementation Plan)
- **ADR-002 (Client Project Mode)**
- **PCR-003 (Client Project Mode Resolution)**

```
Platform Freeze v1.2   ← YOU ARE HERE (frozen with C-24 + C-25 binding)
   ↓
Envoy Client Project: Pre-Coding Plan = pvc-approved (2026-07-15)
   ↓
Platform Agency auto-execution (16 internal phases, customer-invisible)
   ↓
Customer-facing delivery (8 visible outputs per PCR-003)
   ↓
Premium Delivery Check ($10k+ valuation stamp at final delivery)
   ↓
Production launch
   ↓
Discovery Beta cycles accumulate production evidence (for Future Product Lab)
   ↓
PVC promotes evidence -> Platform patterns (EPS L0 -> L4+)
   ↓
Experience Engine v2 (only after EPS L4 multi-product / repeat-production)
```

Order shall not be reversed. Experience Engine v2 is **not** a freeze-time deliverable; it is a Beta-time and post-Beta-time deliverable.

C-24 (Constitution §15) is in force: no new Platform Engines/Standards/Playbooks may be added unless production evidence from a Product Lab / Client Project demands them.

C-25 (Constitution §18) is in force: the Platform is invisible to the customer. The customer sees only the 8 client-visible deliverables.

## 10. Seal

```
PLATFORM CORE v1.2 FROZEN 2026-07-15.
PCR-001 §1 items 1–9 executed.
ADR-001 ACCEPTED 2026-07-15; Constitution v1.0 -> v1.1.
ADR-002 ACCEPTED 2026-07-15; Constitution v1.1 -> v1.2.
C-24 Platform Freeze Rule in force (Constitution §15).
C-25 Client Project Principle in force (Constitution §18).
Customer Charter SEALED 2026-07-15 (.charters/CUSTOMER_CHARTER.md).
Product Lab Standard pre-coding gate enforced (Constitution §17 + /opt/data/Product_Lab_Standard.md).
7 RC engines MERGED into Platform Core.
1 RC engine (Experience) DEFERRED to Known Exception EXC-EXPERIENCE-001.
Recovery Council CLOSED.
Product Validation Council OPENED.
PVP-001 'Envoy Hostel & Tours' re-designated Product Lab 001 -> Client Project 001 (per ADR-002 / PCR-003).
Pre-Coding Plan = pvc-approved (sign-off 2026-07-15).
Next permitted step: Platform Agency auto-execution of 16 internal phases against 8 client-visible outputs.
```
