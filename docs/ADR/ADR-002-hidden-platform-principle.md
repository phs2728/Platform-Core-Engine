# ADR-002: Hidden Platform Principle (Constitution §18)

**ADR ID**: ADR-002
**Date**: 2026-07-15
**Status**: 🟢 ACCEPTED (operating under PCR-003 since 2026-07-15; formally accepted by Architecture Review Board on 2026-07-15)
**Author**: Product Validation Council (proposed by 사장님 박흥식 / Tim Park)
**Deciders**: 사장님 (Architecture Review Board)
**Supersedes**: none
**Superseded by**: none
**Target Constitution version**: v1.2
**Related**: PCR-003 (`.platform-governance/resolutions/PCR-003.md`), Hidden Platform Charter (`.charters/HIDDEN_PLATFORM_CHARTER.md`), PCR-002 (`.platform-governance/resolutions/PCR-002.md`), ADR-001

---

## Context

PCR-002 (2026-07-15) established **Product Lab 001 (PVP-001) — Envoy Hostel & Tours** as the canonical Platform Validation Project. In the same Council Chair conversation, the Chair observed that **the Platform has historically been explained in Platform-internal terms** (Engines, Standards, Playbooks, ADR procedures), but **the end client does not (and should not) know any of this**.

The Council Chair's insight: **"플랫폼은 보이지 않는다. 고객의 결과물만 보인다."** This reframes the Platform's purpose:

- The Platform is **internal infrastructure** (Discovery Engine, PRD Engine, TRD Engine, Agency OS, Skill Library, QES, etc.).
- The client (e.g., Envoy Hostel & Tours) sees **only the deliverable**: a beautiful, fast, bookable, manageable, SEO-optimized website.
- The Platform performs all internal steps — Customer Discovery → PRD → TRD → UX → Design → Frontend → Backend → CMS → SEO → QA → QES → Release — **automatically and invisibly**.

This reframe does not change any Platform asset (C-24 is preserved) — it changes the **framing** of the work: PVP-001 stops being a "Platform Validation Project" and becomes a **Client Project (CP-001)** for Envoy Hostel & Tours.

The Platform's role shifts from "validate the Platform" to **"deliver a US$10,000+ premium website to the client, using the Platform internally"**.

---

## Decision

This ADR enacts **one new section** to `docs/000_PLATFORM_CONSTITUTION.md`:

### Amendment — New Section §18 (Hidden Platform Principle)

§18 records the **Hidden Platform Principle** verbatim from the Council Chair, including:

- The canonical text from PCR-003 §"OUTPUT" (verbatim).
- The agency workflow verbatim from PCR-003 §.
- The C-24 binding: client work does NOT modify the Platform.
- The PVP-001 re-designation: PVP-001 ↔ CP-001 (Client Project 001).

§18 binds all Client Project work going forward. Existing Platform assets (PCR-001, PCR-002, ADR-001, the 33 Engines, Standards, Playbooks, QES, etc.) are preserved unchanged.

### Operation-level changes accompanying this ADR

| Change | Where |
|---|---|
| Platform version | Constitution v1.1 → **v1.2 (Frozen + §18 amendments)** |
| Doc header | Updated to v1.2 with §18 listed in amendments |
| Version History table | Added v1.2 row referencing §18 + ADR-002 |
| New section §18 | Appended to Constitution after §17 |
| New resolution | PCR-003 created and adopted |
| New charter | `.charters/HIDDEN_PLATFORM_CHARTER.md` sealed |
| PVP-001 → CP-001 re-designation | Worked through internally; **no Platform-side rename** (would require ADR-003 which is forbidden by C-24) |
| Pre-coding gate (Constitution §17) | Continues to bind CP-001 work; Pre-Coding Plan is the gate before any Client Project coding |

### Why no Platform-side rename of PVP-001 to CP-001

C-24 (Constitution §15) prohibits adding new Engines, Standards, or Playbooks without production evidence. Renaming an internal folder is not strictly creating a new asset, BUT the safer interpretation is to keep the historical folder name and use **CP-001 as a logical alias** for cross-references — not a filesystem rename.

Therefore: **PVP-001 internal artifacts remain at `.platform-governance/products/pvp-001/`**. The CP-001 alias is used in **client-facing and governance artifacts** (this ADR, the new Client Project deliverables), but the underlying directory is unchanged. This respects §18.3 (anti-pattern: renaming for cosmetic client-presentation reason is unnecessary and risks breaking internal references).

---

## Consequences

### Positive

1. **Hidden Platform Principle binds all Client Project work**: no PRD/TRD/Agency-OS naming in client-facing artifacts.
2. **The Platform Agency is now explicit**: agents operating in Client-facing mode know they deliver only the deliverable.
3. **Re-designation clarifies the unit of truth**: the client is now primary; the Platform is implementation detail.
4. **No Platform asset changes**: C-24 still in force, so this reframing is non-disruptive.
5. **All previous work preserved**: PVP-001 internal artifacts remain valid; they just live behind the Hidden Platform Charter now.

### Negative / Risks

1. **Confusion between PVP-001 / CP-001**: the artifact path uses `pvp-001` while cross-references use `cp-001`. **Mitigated**: documented explicitly in §18.5 of the Constitution.
2. **Two-track governance (Platform + Client)**: requires the Platform Agency to maintain both Platform-internal and Client-facing views of the same work. **Mitigated**: this is explicit in the Agent Role Matrix (each role has Client-facing + Internal-facing prompts).
3. **Pricing risk**: US$10,000+ positioning is a market decision, not a Platform decision. **Mitigated**: pricing is documented in `premium-positioning.md`, separate from Platform internals.

### Neutral

- Existing Pre-Coding Plan for PVP-001 continues to apply (status: pvc-pending).
- Existing 14-phase pipeline from PCR-002 continues to apply (re-interpreted as Client Project delivery phases).
- Existing 11-role agent hierarchy from PCR-002 continues to apply (re-interpreted as the Platform Agency's roles).

---

## Alternatives considered

### Alt 1 — Keep PVP-001 framing, add §18 as adjunct

**Rejected.** Maintaining both "PVP-001 (Platform Validation)" and "CP-001 (Client Project)" framings without re-designation leaves the original platform-validation framing dominant. The Council Chair explicitly observed the "platform-centric → client-centric" pivot.

### Alt 2 — Rename PVP-001 folder to CP-001 (filesystem rename)

**Rejected.** This would either:
(a) require ADR-003 (a new ADR for a Platform-side change — borderline C-24 violation since it modifies how Platform references its own history), or
(b) keep history references intact but break current artifacts.
Both are worse than keeping the path and aliasing it.

**Selected**: keep `.platform-governance/products/pvp-001/` path; use "CP-001" as an alias for current Client Project references.

### Alt 3 — Skip §18 entirely; the Principle is implicit in PCR-003

**Rejected.** The §18 is the **Constitutional embodiment** of the Principle. Without §18, the Principle is a Council Resolution text without constitutional standing. The Council Chair's instruction implies the Principle belongs in the Constitution (it is **a rule about how the Platform operates**, not just a one-time decision).

---

## Implementation Plan

### Executed in this session

1. ✅ Created `.platform-governance/resolutions/PCR-003.md` (this Resolution)
2. ✅ Created `.charters/HIDDEN_PLATFORM_CHARTER.md` (verbatim from Council Chair)
3. ✅ Patched `docs/000_PLATFORM_CONSTITUTION.md` to add §18 + version history row
4. ⏭ Create ADR-002 (this document)
5. ⏭ Create Client Project deliverables at `.platform-governance/clients/envoy-hostel-tours/`:
   - `client-kickoff.md`
   - `client-facing-brief.md`
   - `platform-to-client-mapping.md` (internal map)
   - `discovery-conversation.md`
   - `delivery-checklist.md`
   - `premium-positioning.md` (US$10K+ justification)
   - `client-acceptance-form.md`
   - `client-interview-plan.md` (15 questions for the client)
6. ⏭ Update existing PVP-001 plan docs to reference CP-001 alias (without renaming)
7. ⏭ Re-stamp `platform-core-v1.0-freeze` tag with new commit

### Implementation Notes

- ADR-002 accepted by Architecture Review Board on 2026-07-15 (same date as PCR-003).
- Tag re-stamping: per the established pattern, the `platform-core-v1.0-freeze` tag NAME remains stable; the underlying commit advances to include the §18 amendment.

---

## References

| Source | Path | Used |
|---|---|---|
| PCR-003 | `.platform-governance/resolutions/PCR-003.md` | §1 verbatim client workflow + Hidden Platform Principle |
| Hidden Platform Charter | `.charters/HIDDEN_PLATFORM_CHARTER.md` | §1 verbatim Canonical |
| Platform Constitution v1.1 + ADR-001 | `docs/000_PLATFORM_CONSTITUTION.md` | amendment target |
| ADR-001 | `docs/ADR/ADR-001-platform-freeze-rule.md` | predecessor |
| PCR-002 | `.platform-governance/resolutions/PCR-002.md` | PVP-001 history |
| PCR-001 | `.platform-governance/resolutions/PCR-001.md` | freeze + C-24 |

---

## ADOPTION

This ADR is adopted by the Architecture Review Board (사장님) on 2026-07-15. Effective immediately upon adoption.

```
ACCEPTED 2026-07-15.
Council Chair: 사장님 박흥식 / Tim Park.
Constitution v1.1 -> v1.2 (with §18 Hidden Platform Principle).
PCR-003 issued.
Hidden Platform Charter sealed.
CP-001 alias established for PVP-001.
Next step: Client Project deliverables filed at .platform-governance/clients/envoy-hostel-tours/.
```
