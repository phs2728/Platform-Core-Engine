---
project_id: CP-001
audience: PLATFORM AGENCY (internal only — never shared with client)
---

# Platform → Client Output Mapping (Internal)

> **CONFIDENTIAL — Platform Agency only.** This document maps every internal Platform asset to the client-facing deliverable it produces. The client never sees this document or any references to it.

---

## 1. The mapping matrix

| Platform internal asset | Phase | Client-facing deliverable |
|---|---|---|
| Brand DNA Report | (inherited) | Design Direction in the Brief |
| Customer Discovery Report (Alpha) | (inherited) | Discovery Conversation question set |
| Customer Decision Architecture | (inherited) | Design comps + CTA variants |
| Trust Evidence Blueprint | (inherited) | Trust badge cluster + manager profile |
| Content Strategy Blueprint | (inherited) | CMS content templates |
| Product Strategy | (inherited) | Brief + Proposal |
| Product Ecosystem Map | (inherited) | Backend integration plan |
| Implementation Readiness Report | (inherited) | Pre-coding gate (internal) |
| Discovery Beta Framework (Beta phase 1 plan) | (PCR-002 §3) | Discovery Conversation (client sees only the questions) |
| Hypothesis Lifecycle Standard (HYP-PVP-001-001..004) | PCR-002 §4 | A/B tests behind the scenes — client sees "we tested X and chose Y" |
| Evidence Promotion Standard (eps ladder) | PCR-003 §5 | Used internally; client sees "we validated this with real travelers" |
| Knowledge Governance Standard | (inherited) | Internal usage only |
| Experiment Standard | (PCR-002 §7) | Internal usage only |
| Product Lab Standard (operative) | PCR-002 | Internal usage only |
| Discovery Alpha Framework | (inherited) | Used internally; client sees "we asked great questions" |
| Discovery Beta Framework | (inherited) | Used internally; client sees "we tested with real travelers" |
| Validation Lifecycle | (inherited) | Used internally; client sees "we chose what works" |
| Evidence Classification Standard | (inherited) | Used internally; client sees "we know what's working and what's not" |
| Platform Learning Flow | (inherited) | Used internally; client sees "we update the website based on real data" |
| Executive Decision Flow | (inherited) | Used internally; client sees "decisions are made by us, the Agency, on your behalf" |
| Updated Discovery Philosophy | (inherited) | Used internally; client sees "we just do the right thing" |
| Discovery Framework Upgrade | (inherited) | Used internally; no client surface |
| Charter (Experience Engine) | ADR-001 | Implicit binding; no client surface |
| PCR-001 / Freeze Manifest | (inherited) | Internal usage only |
| PCR-002 / Product Lab framing | PCR-002 | Internal usage only; superseded by PCR-003 for client work |
| ADR-001 / C-24 | ADR-001 | Internal usage only; never exposed to client |
| ADR-002 / Hidden Platform Principle | PCR-003 | This document |
| 14-phase pipeline | PCR-002 §"PHASES" | Re-interpreted in client-facing phases |
| 11 PVP-001 deliverables | PCR-002 §"OUTPUT" | Becomes internal working artifacts for CP-001 |
| Pre-Coding Plan (Constitution §17 gate) | PCR-002 | Internal; gates all internal work |

---

## 2. The masking language

When working in client-facing mode, the Platform Agency uses this **masking vocabulary**:

| Internal term | Client-facing equivalent |
|---|---|
| Discovery Beta | "We asked the right questions to understand your guests" |
| Hypothesis | "We tested a specific change in your website" |
| A/B test | "We tested two versions and chose the better one" |
| Variant | "Version" |
| EPS ladder | (no surface; internalized) |
| Engine / Standards / Playbook | (no surface) |
| ADR | (no surface) |
| PVC | (no surface) |
| QES | "Our quality team reviewed and approved" |
| Hypothesis Lifecycle | (no surface; client sees "real-world testing") |
| Knowledge Governance | (no surface; client sees "decisions backed by data") |
| EPS | (no surface) |
| PVC | (no surface; client sees "we sign off internally before launch") |
| InMemoryRepositories | "Our infrastructure" |
| Result<T, E> | "Error handling" (no deep technical detail) |

---

## 3. What the client must never see

Per Hidden Platform Charter §3, the client must never see:

| Forbidden artifact | Why |
|---|---|
| PRD | Client doesn't need engineering specifications |
| TRD | Client doesn't need architecture decisions |
| Agency OS | Client doesn't need internal OS documents |
| QES Gate IDs | Client doesn't need quality-engineering IDs |
| Skills / Playbooks | Client doesn't need Platform internals |
| ADR numbers | Client doesn't need amendment records |
| EPS levels | Client doesn't need evidence taxonomy |
| Hypothesis IDs | Client doesn't need A/B-test identifiers |

If a client proactively asks "what's an Engine?", the Agency responds:

> "It's how we organize our internal work — think of it as our internal SOPs and tooling. You don't need to know about it to run a great website. What you care about is: does it convert? does it run smoothly? does it look great? We track all those for you."

---

## 4. Cross-references

- Client Kickoff: `client-kickoff.md`
- Client-Facing Brief: `client-facing-brief.md`
- Discovery Conversation (internal): `discovery-conversation.md`
- Client Interview Plan (with Envoy as client): `client-interview-plan.md`
- PVP-001 internal artifacts: `.platform-governance/products/pvp-001/*.md`

---

## 5. Seal

```
PLATFORM -> CLIENT MAPPING DRAFTED 2026-07-15.
Confined to Platform Agency.
Never share with client.
Masking vocabulary established.
```
