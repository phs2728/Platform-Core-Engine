# Experience Engine Charter (PCR-001)

**Version**: 1.0
**Adopted**: 2026-07-14
**Authority**: Platform Council Resolution PCR-001 (Council Chair: 사장님 박흥식 / Tim Park)
**Status**: 🔒 SEALED — Verbatim from PCR-001 Council Decision. Modifications require a new Platform Council Resolution.
**Relationship to Constitution**: This Charter supplements `docs/000_PLATFORM_CONSTITUTION.md` (v1.0 FROZEN). It does NOT amend the Constitution; it adds a domain-specific charter to the Platform's governance library.
**Effective Date**: 2026-07-14
**Owner**: Platform Owner (Platform CTO, 사장님)

---

## 0. Provenance of this Charter

This Charter is captured **verbatim** from the Council Chair's resolution text published in the session conversation log on 2026-07-14 under "Council Decision". Any future paraphrase, summary, or interpretive note by an AI agent is prohibited in any document that quotes this Charter. The text in §1 below is **the canonical Charter**. References to it from other documents must include the section heading or verbatim quote.

---

## 1. Charter Text (canonical, verbatim)

```
Experience Engine Charter

The Experience Engine shall never evolve
through reconstruction.

It shall evolve only through
validated product experience.

Experience is a product-derived capability,
not a document-derived capability.

Every reusable Experience pattern
must originate from
Discovery Beta,
validated experiments,
and production evidence.

The Envoy project is designated as the
canonical reference implementation
for Experience Engine v2.

No reconstruction from memory.

No speculative implementation.

Reality first.

Customers first.

Platform second.
```

---

## 2. Operating interpretation (for Platform Owners, Engineers, and AI Agents)

This section is **not** part of the Charter text. It is a non-normative operating note recording the Council Chair's published rationale alongside PCR-001, retained for reviewability. The Charter's binding authority is §1 only.

### 2.1 Evolution policy (from §1)

| Prohibited | Required |
|---|---|
| Evolving Experience Engine through reconstruction (copying from documents, memory, or unverified sources) | Evolving Experience Engine only through validated product experience |
| Treating Experience as a document-derived capability (PRDs, design docs, narrative specs) | Treating Experience as a product-derived capability |
| Promoting any reusable Experience pattern without Discovery Beta evidence | Every reusable Experience pattern must originate from Discovery Beta, validated experiments, and production evidence |

### 2.2 Canonical reference project

The Envoy project is **designated** as the canonical reference implementation for Experience Engine v2. This means:

- Envoy's product behavior, customer interaction patterns, conversion data, and operational evidence are the source of truth for what Experience Engine v2 must serve.
- Experience Engine v2 is **derived from** Envoy; Envoy is not derived from Experience Engine.
- Envoy is the first consumer of platform capabilities, including any future Experience Engine v2.

### 2.3 Resolution Precedence (from PCR-001)

Per PCR-001, the following prohibitions apply and have precedence over any prior authorization (including EXP-RECOVERY-001):

1. Do not attempt further recovery of the original Experience Engine source.
2. Do not classify the original Experience Engine as RECOVERED.
3. Do not classify the original Experience Engine as UNRECOVERABLE.
4. Do not merge the current `feature/experience-engine-rc1` working tree into Platform Core (`feature/platform-freeze-v1`).
5. Reusable Experience Engine v2 capabilities must pass through **all** of: Discovery Beta, Experiment, Evidence Promotion Standard.

### 2.4 Knowledge direction (from PCR-001)

```
Experience
↓
Product
↓
Customer
↓
Evidence
↓
Platform
```

Platform knowledge evolves **from production**, **never from reconstruction** of lost, missing, or unverified source code.

---

## 3. Cross-references

| Related artifact | Path | Status |
|---|---|---|
| Platform Constitution v1.1 (FROZEN + ADR-001 amendments) | `docs/000_PLATFORM_CONSTITUTION.md` | Adopted 2026-07-11 (v1.0) and amended 2026-07-15 (v1.1); this Charter supplements, does not amend |
| ADR-001 | `docs/ADR/ADR-001-platform-freeze-rule.md` | Authority for v1.1 amendment (C-24 + Product Lab Principle + Product Lab Standard) |
| Platform Knowledge Governance Standard | `/opt/data/Knowledge_Governance_Standard.md` | Adopted 2026-07-14; this Charter aligns |
| Product Lab Standard (operative) | `/opt/data/Product_Lab_Standard.md` | Adopted 2026-07-15; pre-coding gate enforced by PVC |
| Evidence Promotion Standard | `/opt/data/Evidence_Promotion_Standard.md` | Adopted 2026-07-14 |
| Discovery Alpha / Beta Framework | `/opt/data/Discovery_Alpha_Framework.md`, `/opt/data/Discovery_Beta_Framework.md` | Adopted 2026-07-14 |
| Provenance Audit (UNKNOWN PROVENANCE) | `Experience_Recovery_Classification.md` (repo root) | Filed 2026-07-14 |
| Known Exception | `.platform-governance/exceptions/EXC-EXPERIENCE-001.md` | Registered 2026-07-14 |
| PCR-001 (Council Resolution) | `.platform-governance/resolutions/PCR-001.md` | Adopted 2026-07-14 |

---

## 4. Seal

```
SEALED 2026-07-14.
PCR-001 ADOPTED UNANIMOUSLY.
Charter §1 is VERBATIM and is the only binding text.
This Charter supersedes any prior directives on Experience Engine evolution
that conflict with §1.
```
