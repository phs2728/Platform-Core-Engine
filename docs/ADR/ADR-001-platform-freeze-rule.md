# ADR-001: Platform Freeze Rule + Product Lab Principle + Product Lab Standard

**ADR ID**: ADR-001
**Date**: 2026-07-15
**Status**: 🟢 ACCEPTED
**Author**: Platform Council (proposed by 사장님 박흥식 / Tim Park)
**Deciders**: 사장님 (Architecture Review Board)
**Supersedes**: none
**Superseded by**: none
**Target Constitution version**: v1.1
**Related**: PCR-001 (`.platform-governance/resolutions/PCR-001.md`), Experience Engine Charter (`.charters/EXPERIENCE_ENGINE_CHARTER.md`), Envoy MVP Authorization (`.platform-governance/envoy/ENVOY-MVP-AUTHORIZATION.md`)

---

## Context

Platform Core v1.0 has been FROZEN at tag `platform-core-v1.0-freeze` (PCR-001 §1 item 1). The Platform now ships:

- Platform Constitution v1.0 (Frozen 2026-07-11)
- Discovery Framework (Alpha + Beta)
- PRD Engine, TRD Engine
- Agency OS
- Skill Library, Skill Pack, Playbooks
- QES (Quality Execution Standard)
- PAG (Platform Agent Guide)
- Knowledge Governance Standard
- Platform Freeze v1.0

This is a "Platform OS" — operationally complete. The risk going forward is **infinite platform expansion**: every observation about a product could trigger an "Engine RC2 / RC3 / RC4" cycle that never ends. The Platform would never be completed.

The Council Chair observes that the next phase is **Product Founder**, not **Platform Engineer**. The Platform now needs to be **disciplined** about what it adds.

Two needs are present:

1. A freeze-rule that prevents the Platform from adding new Engines / Standards / Playbooks **unless production evidence requires them**. This is C-24.
2. A product-lab doctrine that treats every Product as a Laboratory for the Platform. This is the **Product Lab Principle** + **Product Lab Standard**.

This ADR proposes Constitutional amendments for both, in a single reviewable amendment package, because they are mutually consistent and share the same rationale: **after Platform Freeze, evolution must come from production**, never from internal platform-build momentum.

---

## Decision

This ADR enacts three amendments to `docs/000_PLATFORM_CONSTITUTION.md` v1.0 → v1.1:

### Amendment A — New Section §13 (Platform Freeze Rule) — introduces **C-24**

§13 is added to the Constitution after §12. Its sole rule, **C-24 — Platform Freeze Rule**, is recorded verbatim from the Council Chair's resolution text published in the session conversation log on 2026-07-15. Verbatim text:

```
C-24 Platform Freeze Rule

After Platform Freeze,

new Engines are prohibited.

new Standards are prohibited.

new Playbooks are prohibited.

unless

production evidence requires them.
```

Operating interpretation (non-normative; recorded in this ADR for reviewer convenience):

- "After Platform Freeze" means from tag `platform-core-v1.0-freeze` onward.
- "New Engines / Standards / Playbooks" refers to **net new platform assets** intended to be added to Platform Core. (Refactoring, consolidation, or deprecation of existing assets does not constitute "new".)
- "Production evidence requires them" is interpreted as EPS Level 4 (Platform Pattern) **or** higher — i.e. the asset has crossed from product-specific learning to platform-wide relevance via validated cross-product or repeatable-production evidence.
- The decision to add a new Engine/Standard/Playbook is itself subject to a new ADR (per ADR Rule 5.2).

### Amendment B — New Section §14 (Product Lab Principle) — doctrine, not rule

§14 records the doctrine (not a rule with mechanical enforcement) verbatim from the Council Chair:

```
Product Lab Principle

Every Product

is

a Laboratory

for the Platform.
```

This doctrine binds the rest of the Constitution and all downstream standards. It is reviewed every time a new Product is onboarded.

### Amendment C — New Section §15 (Product Lab Standard) — pre-coding-required plan definition

§15 records the Product Lab Standard verbatim from the Council Chair:

```
Every Product

must define

Hypotheses

Metrics

Experiments

Success Criteria

Learning Goals

before coding starts.
```

This is enforced as a **gate**: PRD TRD development cannot begin until these six plan fields are filled, signed by the Product Founder, and recorded at `.platform-governance/products/<product>/pre-coding-plan.md` (or equivalent). Validation by the Product Validation Council (PVC).

### Operation-level changes accompanying this ADR

| Change | Where |
|---|---|
| Platform version | Constitution v1.0 → **v1.1 — FROZEN-with-amendment** |
| Doc header | `**Version**: v1.1 — Frozen + ADR-001 amendments` |
| Version History table | Add row "v1.1 / 2026-07-15 / +C-24 +Product Lab Principle +Product Lab Standard (ADR-001)" |
| Section §12.20 | Stamped as `C-24 (forward) — see §13.1` (cross-reference, no duplication) |
| New sections §13, §14, §15 | Appended after §12 |

### Sequencing (verbatim from Council Chair)

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

This sequence is recorded as the **canonical Product Lab loop** in §14.2 and is the **operating interpretation** of the Product Lab Standard. Each loop pass produces a Discovery Beta PASS that may flow into Platform Learning through EPS Levels 0–5.

---

## Consequences

### Positive

1. **Anti-inflation rule**: No more RC2/RC3/RC4 cycles without production evidence.
2. **Discipline**: Platform additions become evidence-gated.
3. **Direction**: `Platform → Product → Evidence → Platform` becomes enforceable; the reverse `Platform → Platform → Platform` is forbidden.
4. **Envoy-as-Lab**: Envoy is positioned as the first Product Lab, not just a product.
5. **Knowledge Governance (prior std)**: Aligns with `/opt/data/Knowledge_Governance_Standard.md` (2026-07-14) — which already states "Reality improves the Platform. Speculation never does."
6. **PCR-001 alignment**: This ADR reinforces PCR-001 §1 item 8 ("Platform knowledge must evolve from production, never from reconstruction").

### Negative / Risks

1. **Higher startup cost**: Every Product must define Hypotheses/Metrics/Experiments/Success Criteria/Learning Goals before coding. May lengthen initial product cycles. **Mitigated**: Envoy's Alpha artifacts already cover most of this; the Pre-Coding Plan is a small step beyond Discovery Alpha PASS.
2. **Evidence gate may delay Platform evolution**: A validated capability that requires a new Platform asset must wait for EPS Level 4. **Mitigated**: This is the explicit point — the alternative is unbounded Platform expansion, which is worse.
3. **Discipline requires Council enforcement**: C-24 has no automatic mechanical gate. **Mitigated**: ADR Rule 5.2 already requires any new Platform asset to have its own ADR; this is the existing gate.

### Neutral

- Experienced Engine, Standard, and Playbook assets remain frozen at v1.0 + the assets recorded in Freeze Manifest v1.0. Refactoring within an asset is governed by the asset's own ADR; cross-cutting additions are governed by C-24.
- Envoys already pre-staged Discovery Alpha artifacts (Brand DNA, Customer Discovery, Decision Architecture, Trust Evidence Blueprint, Content Strategy, Product Strategy) align with the Product Lab Standard's six fields approximately. These artifacts are **supersession-compatible** — they are the substantive content; the Product Lab Standard is the formal container.

---

## Alternatives considered

### Alt 1 — Postpone amendment until after Envoy Product Lab Beta PASS

**Rejected.** C-24 must apply to Envoy Beta's output. If we wait, Envoy Beta may emit Platform-extension proposals before the rule is in place. The rule must be in force **before** any Beta evidence starts influencing Platform direction.

### Alt 2 — Make C-24 a separate Platform Standard, not a Constitutional rule

**Rejected.** A "freeze" rule applied to the Platform itself is itself a Platform-constitutional concern. Living in `/opt/data/...` standards area would obscure its authority. It belongs in the Constitution.

### Alt 3 — Make the Product Lab Standard optional (recommendation, not requirement)

**Rejected.** A non-binding standard has historically been ignored in this team. The Council Chair's directive is a hard pre-coding gate. Making it mandatory is the only way to enforce it before Envoy Beta.

### Alt 4 — Adopt only C-24, defer Product Lab Principle / Standard

**Rejected.** The Council Chair published all three as one package with shared rationale. Splitting the ADR dilutes authority. The trio is internally consistent and co-applies.

---

## Implementation Plan

### Step-by-step (executed in this order in the same Council session)

1. ✅ Create `docs/ADR/ADR-001-platform-freeze-rule.md` (this file).
2. ⏭ Patch `docs/000_PLATFORM_CONSTITUTION.md`:
   - Update header to `**Version**: v1.1 — Frozen + ADR-001 amendments`.
   - Append §13 "Platform Freeze Rule (C-24)" with §13.1 containing the C-24 verbatim text.
   - Append §14 "Product Lab Principle" with §14.1 (verbatim) and §14.2 (canonical Product Lab loop, verbatim from Council Chair).
   - Append §15 "Product Lab Standard" with §15.1 (verbatim) and §15.2 (gate enforcement: pre-coding plan required before coding).
   - Update §9.2 헌법 버전 히스토리 to add v1.1 row.
3. ⏭ Write `docs/standards/PRODUCT_LAB_STANDARD.md` — operative document for Product Lab Standard (gate is enforced by PVC).
4. ⏭ Update `.platform-governance/envoy/ENVOY-MVP-AUTHORIZATION.md`:
   - Add §8: Product Lab rebrand ("Envoy Hostel" → "Envoy Product Lab").
   - Update §3 to cite ADR-001 C-24.
   - Update sequencing to the canonical 11-step Product Lab loop.
5. ⏭ Update `.platform-governance/FREEZE_MANIFEST_v1.0.md` to record C-24 and v1.1.
6. ⏭ Update `.platform-governance/councils/PRODUCT-VALIDATION-COUNCIL.md` to incorporate the Product Lab Standard as a PVC gate.
7. ⏭ Update `.charters/EXPERIENCE_ENGINE_CHARTER.md` cross-references to include ADR-001.
8. ⏭ Commit on `feature/platform-freeze-v1` and **re-stamp `platform-core-v1.0-freeze` tag** pointing to the new commit. (The freeze tag itself stays at v1.0; the underlying Constitution is amended to v1.1 — see §Implementation Notes below.)

### Implementation Notes

- The git tag `platform-core-v1.0-freeze` is preserved as the freeze entrypoint; it is moved forward on the branch to include the v1.1 amendment. The tag name is unchanged because the Platform v1.0 is still Frozen (not opened). The tag's object will include the v1.1 amendment.
- The original git tag object (pointing to commit `677a03a`) is preserved in the reflog as historical record, but is no longer the canonical freeze pointer.

---

## References

| Source | Path | Used |
|---|---|---|
| Council Chair resolution text | conversation log 2026-07-15 | C-24 + Product Lab Principle + Product Lab Standard verbatim |
| Platform Constitution v1.0 | `docs/000_PLATFORM_CONSTITUTION.md` | amendment target |
| PCR-001 | `.platform-governance/resolutions/PCR-001.md` | reinforces PCR-001 §1 item 8 |
| Charter | `.charters/EXPERIENCE_ENGINE_CHARTER.md` | cross-compatible ("No reconstruction from memory") |
| Freeze Manifest | `.platform-governance/FREEZE_MANIFEST_v1.0.md` | updated by this ADR |
| Knowledge Governance Standard | `/opt/data/Knowledge_Governance_Standard.md` | aligned (reality over speculation) |
| Hypothesis Lifecycle Standard | `/opt/data/Hypothesis_Lifecycle_Standard.md` | pre-coding-plan links to hypothesis ID |
| Evidence Promotion Standard | `/opt/data/Evidence_Promotion_Standard.md` | C-24 evidence threshold = EPS Level 4 |

---

## ADOPTION

This ADR is adopted by the Architecture Review Board (사장님) on 2026-07-15. Effective immediately upon adoption.

```
ACCEPTED 2026-07-15.
Council Chair: 사장님 박흥식 / Tim Park.
Constitution v1.0 → v1.1.
Three amendments: C-24, Product Lab Principle, Product Lab Standard.
```

Next step per ADR Rule 9.1 step 4: update the Constitution file with these amendments (executed by Council Clerk).
