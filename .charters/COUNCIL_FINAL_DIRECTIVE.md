# Council Final Directive Charter (2026-07-15)

**Charter ID**: CFD-001
**Adopted**: 2026-07-15
**Authority**: Platform Council Final Directive (Chair: 사장님 박흥식 / Tim Park)
**Status**: 🔒 SEALED — Verbatim from Council Chair's final directive. Modifications require a new Council Resolution superseding this Charter.
**Effective**: Immediately upon adoption
**Relation to Constitution**: This Charter supplements (does not amend) the Platform Constitution v1.2 (Frozen + ADR-001 + ADR-002 amendments). It is a **Charter** (operational policy), not a constitutional amendment and not a Standard or Playbook. It does NOT trigger C-24 (§15) review, because it does not propose adding a new Platform asset.
**Supersedes**: All prior governance expansion intents (operationally).

---

## 0. Provenance of this Charter

This Charter is captured **verbatim** from the Council Chair's "PLATFORM COUNCIL FINAL DIRECTIVE" instruction published in the session conversation log on 2026-07-15. The text in §1 is **the canonical Directive**. References to it from other documents must include the section heading or verbatim quote.

---

## 1. Directive Text (verbatim, canonical)

```
PLATFORM COUNCIL FINAL DIRECTIVE

Platform Core v1.2 is officially COMPLETE.

The Platform is no longer the primary work product.

The Product becomes the primary work product.

Effective immediately:

STOP creating Platform governance artifacts
unless production evidence requires a Platform change.

STOP creating ADRs for theoretical improvements.

STOP creating new Engines.

STOP creating new Standards.

STOP creating new Playbooks.

START delivering client projects.

For every client:

Understand the business.

Discover the real requirements.

Generate PRD.

Generate TRD.

Design.

Develop.

Review with QES.

Deliver.

Collect customer feedback.

Collect analytics.

Only if repeated production evidence reveals
a reusable capability,

submit a Platform Change Proposal.

Otherwise,

improve only the client project.

The Platform exists to serve products.

Products exist to serve customers.

Customers create evidence.

Evidence evolves the Platform.
```

---

## 2. Operating interpretation (non-normative)

This section is **not** part of the Directive text. It records operating guidance.

### 2.1 What "STOP" means

| Forbidden activity | Why forbidden |
|---|---|
| Creating new Platform governance artifacts (Charters, Resolutions, Standards, Playbooks, Skills) without production evidence | C-24 (Constitution §15) reinforces; this Directive makes it operational |
| Creating ADRs for theoretical improvements | Evidence-gated per Knowledge Governance Standard + Charter §3 below |
| Creating new Engines | C-24 absolute |
| Creating new Standards | C-24 absolute |
| Creating new Playbooks | C-24 absolute |

This Charter itself (the present document) is the **last governance artifact** authorized — it directly records the Council Final Directive verbatim, which is its own justification. No additional governance artifacts shall be created absent a Council Resolution superseding this Charter.

### 2.2 What "START" means

| Required activity | Where it happens |
|---|---|
| Understand the business | Discovery Conversation with the client |
| Discover the real requirements | Discovery Beta (per existing framework) |
| Generate PRD | Client Project internal (hidden from client per Hidden Platform Principle §18) |
| Generate TRD | Client Project internal |
| Design | Visual Design (per existing visual-design-kickoff) |
| Develop | Frontend + Backend (per existing plans) |
| Review with QES | QES gate (existing standard) |
| Deliver | Client Project delivery |
| Collect customer feedback | Phase 12 (existing customer-interview-plan) |
| Collect analytics | Phase 11 (existing analytics-plan) |

All of the above are **already documented** in existing PVP-001 internal artifacts. **No new artifacts needed for delivery.**

### 2.3 The new knowledge flow (verbatim from Directive)

```
The Platform exists to serve products.
Products exist to serve customers.
Customers create evidence.
Evidence evolves the Platform.
```

Operationally, this is:

```
Platform Assets → Product (delivery to customer) → Customer Interaction
   ↑                                                       ↓
   └──────────── Evidence ← ─────── Customer Feedback ─────┘
```

The Platform does NOT directly evolve from Platform-internal reasoning. The Platform evolves **only** through validated evidence from Customer interactions across **multiple** Product deliveries.

### 2.4 Trigger for Platform Change Proposals

A Platform Change Proposal (PCP — one form of ADR) may be submitted **only** when:

1. Repeated production evidence from ≥ 2 distinct Product deliveries (or ≥ 2 distinct clients within the same Product) demonstrates a reusable capability gap.
2. The Capability gap cannot be filled by existing Platform assets (verifiable via QES gates).
3. The Proposal includes:
   - Production evidence (≥ 2 distinct data sources)
   - Cross-product comparison
   - Owner / executive review
   - Version plan
   - Rollback plan
   - Charter §3 verification (PVC + Knowledge Review Board)

Until all three conditions hold, **a Platform Change Proposal MUST NOT be filed**.

---

## 3. Resolution precedence

This Directive supersedes any prior operational interpretation that expands Platform governance. Specifically:

| Prior instrument | Status under this Directive |
|---|---|
| Constitution v1.2 | ✅ Remains in force, unchanged |
| ADR-001 (C-24 / Lab Principle / Lab Standard) | ✅ Remains in force; reinforces this Directive's STOP clause |
| ADR-002 (Hidden Platform Principle) | ✅ Remains in force; reinforces Customer-centric delivery |
| PCR-001, PCR-002, PCR-003 | ✅ Remains in force as historical resolutions; new PCRs **must not be issued** absent evidence-driven justification |
| All Charters and Resolutions at the time of this Directive | ✅ Frozen at v1.2 |

---

## 4. The freeze / delivery split (operational)

Two layers now coexist:

| Layer | Status | Activity |
|---|---|---|
| **Frozen** | 🤍 STOP | Creating new Platform governance without evidence |
| **Delivery** | 🟢 START | Client Project delivery (existing CP-001 internal + 8 client-facing artifacts) |

All previously created artifacts in `.platform-governance/`, `.charters/`, `docs/ADR/`, `docs/000_PLATFORM_CONSTITUTION.md`, `.platform-governance/clients/envoy-hostel-tours/`, and `.platform-governance/products/pvp-001/` are **complete and frozen** at v1.2 + CP-001 kickoff state.

**No new artifacts in any of these directories without evidence-driven justification.**

---

## 5. Evidence Pipeline (canonical)

```
Customer interaction (booking, click, call, review)
  ↓
Phase 11: Analytics (event fires)
  ↓
Phase 12: Customer Interview (qualitative)
  ↓
Phase 13: Evidence Collection (per Evidence Promotion Standard)
  ↓
Evidence Promotion Standard Level 0 → 5
  ↓
[IF Level 4+: triggered multi-product]
  ↓
Platform Change Proposal (PCP) — file only after:
  * ≥ 2 distinct Product deliveries OR
  * ≥ 2 distinct clients within same Product
  * + ≥ 2 distinct data sources
  * + Owner / Executive review
  * + QES verification
  ↓
PCP → ADR (Council Resolution) → Constitution amendment (if approved)
```

A PCP is **NOT** a regular ADR. PCPs are **gated by production evidence**.

---

## 6. Compatibility with prior instruments

| Prior instrument | Compatible? | Notes |
|---|---|---|
| Constitution v1.2 (Frozen + ADR-001 + ADR-002) | ✅ | This Directive is operational; Constitution unchanged |
| ADR-001 (C-24) | ✅ | This Directive operationalizes C-24's "unless production evidence requires them" clause |
| ADR-002 (Hidden Platform Principle) | ✅ | Customer-centric delivery aligns with §18 |
| PCR-001 / PCR-002 / PCR-003 | ✅ | Historical; future PCRs are subject to this Directive's evidence-gating |
| Charter (Experience Engine) | ✅ | "No reconstruction from memory" continues to bind |
| Charter (Hidden Platform) | ✅ | Customer-facing delivery reinforces |
| Product Lab Standard (operative) | ✅ | Pre-coding gate continues for Client Project work |
| PVP-001 internal artifacts | ✅ | Continue as Client Project internal working documents |
| CP-001 client-facing artifacts | ✅ | Continue as the client-facing layer |

---

## 7. Anti-loop clause (from Constitution §15.4 + this Directive)

The following reasoning loops are explicitly forbidden:

```
Platform → Platform → Platform → Platform     (forbidden by C-24 / §15.4)
Platform → New Engine (without evidence)         (forbidden by C-24 / §15)
Platform → New Standard (without evidence)       (forbidden by C-24 / §15)
Platform → New Playbook (without evidence)       (forbidden by C-24 / §15)
```

The only loop permitted:

```
Platform → Product → Customer → Evidence → Platform    (verbatim from this Directive §1)
```

---

## 8. Seal

```
SEALED 2026-07-15.
Council Final Directive verbatim adopted.
This is the LAST Platform governance artifact until evidence requires another.
The Platform is COMPLETE.
The Product becomes the primary work product.
Customers create evidence. Evidence evolves the Platform.

Council Chair: 사장님 박흥식 / Tim Park
Date: 2026-07-15
```

---

> **For Operating Teams**: This Charter authorizes immediate Delivery to commence using **already-existing artifacts**. Do not create new governance. Do not request new Platform assets. Build the deliverable using what's already in `.platform-governance/clients/envoy-hostel-tours/` (client-facing) and `.platform-governance/products/pvp-001/` (internal). File a Platform Change Proposal only when production evidence from ≥ 2 distinct sources demonstrates a reusable capability gap that existing Platform assets cannot fill.
