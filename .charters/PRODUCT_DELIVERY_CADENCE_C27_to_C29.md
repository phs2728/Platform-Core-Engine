# Platform Product Delivery Cadence Charter (C-27 / C-28 / C-29)

**Charter ID**: PCR-CADENCE-001
**Adopted**: 2026-07-15
**Authority**: Platform Council Chair (사장님 박흥식 / Tim Park) — direct adoption (precedent: PCR-CLIENT-001).
**Status**: 🔒 SEALED — Verbatim from Council Chair's instruction of 2026-07-15.
**Effective**: Immediately upon adoption.
**Relation to Constitution**: This Charter proposes elevation of 3 principles into Constitution v1.4 via ADR-004. The Charter is the verbatim source of truth; the Constitution absorbs them as **C-27 Progressive Decision Principle**, **C-28 Decision Queue**, **C-29 Working Website First**, replacing the existing §21-§23 numbering (which will remain untouched — see §6 below for resolution).
**Scope**: Applies to ALL Platform Agency / Client Project Delivery work — across ALL Platform clients (not just Envoy).

---

## 0. Provenance

This Charter is captured **verbatim** from the Council Chair's instruction "수정해야 할 운영 원칙" of 2026-07-15. The text in §1-§3 is **verbatim** with C-27 / C-28 / C-29 numbering as supplied by the Chair.

---

## 1. C-27 Progressive Decision Principle (verbatim)

```
Progressive Decision Principle

Never stop implementation

unless

the missing decision

physically prevents implementation.

즉

"결정이 없어도 만들 수 있으면 만든다."
```

### 1.1 Worked examples (verbatim from Chair)

| Question | Answer if missing |
|---|---|
| 언어 (language) | 영어로 만든다. 나중에 i18n 적용. |
| Currency | Multi Currency Engine 사용. |
| URL | Router 추상화. |
| Cloudbeds | Adapter Interface 작성. |

**Closure principle (verbatim from Chair)**: **"90%는 이미 구현 가능합니다."**

---

## 2. C-28 Decision Queue (verbatim)

```
Decision Queue

Open Decision을 모두 해결하려 하지 말고

Critical

↓

High

↓

Medium

↓

Low

로 나눕니다.

그러면

OD-1

↓

Low

계속 진행

---

OD-4

↓

Critical

여기서만 질문
```

### 2.1 Envoy current Open Decisions (re-classified)

Per Chair (2026-07-15):

| Priority | Decision | Source |
|---|---|---|
| **Critical** | **Cloudbeds 연동 (예약 시스템)** | See Envoy Gap Report OD-4 |
| **Critical** | **직접 예약 방식 (Booking Flow)** | See Envoy Gap Report OD-8 |
| High | Brand DNA owner validation | OD-7 |
| High | Cross-promo surface count (PRD ↔ Chair 충돌) | OD-6 |
| High | Tours PRD strategy (separate vs merged) | OD-5 |
| Medium | Launch language (en / ka / ko) | OD-1 |
| Medium | Currency (GEL / USD / multi) | OD-2 |
| Medium | URL localization pattern | OD-3 |
| Medium | Customer Discovery BLOCKED gate | OD-9 |

**Operationally**: only Critical decisions are blocking; High decisions are queued for the next decision window; Medium / Low are deferred until they become immediately necessary.

### 2.2 Categories (verbatim from Chair)

> "나머지는
>
> * 언어
> * URL
> * Currency
> * 메뉴 이름
> * 카피
> * 브랜드 문구
>
> 등은 **나중에도 충분히 변경 가능합니다.**"

These categories are by definition Medium / Low because they do not physically block implementation.

---

## 3. C-29 Working Website First (verbatim)

```
Working Website First

앞으로는 항상

Working Website

↓

Beautiful Website

↓

Perfect Website

순서입니다.

절대로

Perfect Planning

↓

Perfect PRD

↓

Perfect TRD

↓

Perfect Decision

↓

Website

가 되어서는 안 됩니다.
```

### 3.1 Product Delivery Rules (verbatim from Chair)

```
Product Delivery Rules

1. **Always keep the project moving.**
2. **Only block work that is technically impossible without a decision.**
3. **Everything else continues in parallel.**
4. **Collect decisions just before they become necessary.**
5. **Deliver a working product first, then refine it.**
```

---

## 4. Operating interpretation (non-normative)

### 4.1 Implicit workflow demonstration (verbatim from Chair)

Replacing the **current sequential BLOCKED**:

```
OD-1
↓
STOP
```

with the **desired parallel execution**:

```
Brand
UI
Layout
Photo Strategy
Component
Typography
Navigation
Animation
CMS
SEO
Accessibility
동시에 진행

↓

언어 결정

↓

예약 연동
```

And replacing the **Customer Discovery BLOCKED**:

```
Customer Discovery
↓
BLOCKED
↓
STOP
```

with the **desired progressive continuation**:

```
Customer Discovery
↓
Continue UI
↓
Continue Components
↓
Continue Layout
↓
Continue CMS
↓
Continue SEO
↓
Continue Design
↓
Need customer answer?
↓
Ask only that question.
```

### 4.2 Honest mapping to existing Platform instruments

| Existing instrument | Status under C-27~C-29 |
|---|---|
| Constitution §17 Product Lab Standard (pre-coding gate) | **Retained** for Frontend/Backend coding start. But — per C-27 — non-blocking aspects of pre-coding-plan (e.g., Discovery Beta customer interviews) can proceed in parallel with Frontend/Backend work if "technically possible". |
| Constitution §18 Hidden Platform Principle | Unchanged. |
| PVC pre-coding-plan `pvc-approved` status | **Retained as Critical gate**. But — per C-29 — Pre-Coding Plan authoring proceeds iteratively as a "Working Document" rather than a "Perfect Document". Initial draft at `pvc-working`, then iterated to `pvc-approved`. |
| Open Decisions (envoy-context) | Re-classified under C-28 (Critical/High/Medium/Low). |
| Council Final Directive STOP clause | **Retained** for Platform Engine/Standard/Playbook additions. **Does NOT apply** to Client Project delivery work (per Charter scope). |

### 4.3 What C-29 forbids

The **forbidden pattern** (verbatim from Chair):

```
Perfect Planning
↓
Perfect PRD
↓
Perfect TRD
↓
Perfect Decision
↓
Website
```

### 4.4 What C-29 requires

The **required progression** (verbatim from Chair):

```
Working Website
↓
Beautiful Website
↓
Perfect Website
```

Note: this sequence is a **stages of refinement**, not a sequential dependency. At any point, the Working Website may be deployed (e.g., as a beta cohort), while Beautiful and Perfect versions are still being worked on in parallel.

---

## 5. Compatibility with prior instruments

| Prior instrument | Compatible? | Notes |
|---|---|---|
| Constitution v1.3 (Frozen + ADR-001/002/003) | ✅ | This Charter proposes v1.4 additive only |
| ADR-001 (C-24) | ✅ | C-27 does not override C-24; Platform-engine additions still evidence-gated |
| ADR-002 (Hidden Platform Principle) | ✅ | Client experience unaffected |
| ADR-003 (C-26 Client Rules — Workspace, Visual Restraint, Content First, Less But Better) | ✅ | These four are **constraints** on the C-29 sequence (Working→Beautiful→Perfect **must still respect C-26-C-29**). |
| PCR-002 (Product Lab 001) | ✅ | Preserved |
| PCR-003 (Client Project Mode) | ✅ | Preserved |
| CFD-001 Council Final Directive | ✅ | STOP clause continues to bind Platform-side work |
| Pre-coding gate (§17) | ✅ | **Retained as Critical gate**; iterative plan authoring C-29-aligned |

---

## 6. Path to Constitutional elevation

Per §9.1 procedural chain, this Charter is the verbatim source for ADR-004, which proposes the elevation to **Constitution §24 / §25 / §26 (C-27 / C-28 / C-29)**.

**Numbering note**: The existing Constitution §21-§23 are already used for C-27-C-29 (Premium Visual Restraint, Content First, Less But Better per ADR-003). This Charter's three new principles are **operationally distinct** but share the C-27-C-29 numbering slot.

**Resolution per Chair convenience**: The ADR-004 will renumber so that:
- Old §21 (C-27 Premium Visual Restraint) → **§21 (unchanged numbering)**
- Old §22 (C-28 Content First) → **§22 (unchanged numbering)**
- Old §23 (C-29 Less But Better) → **§23 (unchanged numbering)**
- New Charter principles → **C-30 (Progressive Decision)** / **C-31 (Decision Queue)** / **C-32 (Working Website First)**, with §24-§26 reserved for cross-references.

This avoids confusion between two sets of "C-27-C-29".

---

## 7. Cross-references

| Companion artifact | Path |
|---|---|
| Constitution v1.3 | `/opt/data/projects/identity-engine/docs/000_PLATFORM_CONSTITUTION.md` |
| ADR-003 | `/opt/data/projects/identity-engine/docs/ADR/ADR-003-platform-client-rules.md` |
| ADR-004 (forthcoming) | `/opt/data/projects/identity-engine/docs/ADR/ADR-004-product-delivery-cadence.md` |
| Council Final Directive | `/opt/data/projects/identity-engine/.charters/COUNCIL_FINAL_DIRECTIVE.md` |
| Envoy Gap Report (Decision Queue source) | `/opt/data/clients/envoy/shared/references/02-gap-report.md` |
| Envoy Project State Map | `/opt/data/ENVOY_PROJECT_STATE_MAP.md` |

---

## 8. Seal

```
SEALED 2026-07-15.
PCR-CADENCE-001 ADOPTED by Council Chair.
3 New Principles (Progressive Decision, Decision Queue, Working Website First) SEALED verbatim.
Constitution v1.3 -> v1.4 amendment filed via ADR-004.
Rules apply to ALL Platform Agency / Client Project delivery work.
Anti-pattern: Perfect Planning -> Perfect PRD -> Perfect TRD -> Perfect Decision -> Website.
Required pattern: Working -> Beautiful -> Perfect (parallel refinement, not sequential dependency).
```

---

> **For Operating Teams**: Effective immediately, treat Open Decisions as **constraints that physically block** work, not as gates that prevent starting. Critical decisions (per C-28) are blocking; everything else proceeds in parallel. Deliver a Working Website first, then refine.
