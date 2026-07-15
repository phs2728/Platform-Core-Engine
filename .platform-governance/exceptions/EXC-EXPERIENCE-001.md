# Known Exception: EXC-EXPERIENCE-001

```
Known Exception

Engine

Experience

Classification

UNKNOWN PROVENANCE

Status

Deferred

Reason

Provenance cannot be verified.

Runtime integrity verified.

Git provenance unavailable.

Will be superseded by Experience v2 derived from production evidence.
```

---

## 1. Procedural metadata

| Field | Value |
|---|---|
| Exception ID | EXC-EXPERIENCE-001 |
| Engine | `engines/experience` |
| Classification | UNKNOWN PROVENANCE |
| Status | Deferred |
| Registered | 2026-07-14 |
| Authority | Platform Council Resolution PCR-001 |
| Resolution ref | `.platform-governance/resolutions/PCR-001.md` §1 item 2 |
| Charter ref | `.charters/EXPERIENCE_ENGINE_CHARTER.md` |
| Owner | Platform Owner (사장님 박흥식 / Tim Park) |
| Reviewable | No (deferred to Experience Engine v2 promotion) |
| Supersession path | Experience Engine v2 derived from Envoy production evidence, promoted through Evidence Promotion Standard |

---

## 2. Branch state (recorded at registration)

| Property | Value |
|---|---|
| Working branch | `feature/experience-engine-rc1` (separate from freeze) |
| Source files on branch HEAD (tracked) | 2 files (README.md, docs/TRUST_ARCHITECTURE_RC3.md) |
| Source files on branch working tree (untracked) | 19 files (engine.json, package.json, tsconfig*.json, src/*.ts, test/*.ts) |
| `examples/` directory | Absent |
| Build artifacts (`dist/`) | Present, generated from current src/ (mtime order proves SRC → DIST) |
| `engines/experience/src` in freeze branch (`feature/platform-freeze-v1`) | Not merged (2 files only, README + TRUST doc) |
| Provenance Git path | **NONE** (no commit, no reflog, no stash, no unreachable object containing src) |

---

## 3. Reason (verbatim, from Council Chair)

The Reason block above (in the title) is **verbatim** from the Council Chair's Council Decision text. It is the only binding Reason text. The Council Chair further specified:

```
이 Provenance Audit에서 중요한 것은

RECOVERED

도 아니고

UNRECOVERABLE

도 아니라는 것입니다.

오히려

UNKNOWN PROVENANCE

라는 결론이 플랫폼 철학에 가장 맞습니다.
```

---

## 4. Operational consequences

| Action | Status |
|---|---|
| `feature/experience-engine-rc1` → `feature/platform-freeze-v1` merge | PROHIBITED (per PCR-001 §1 item 4) |
| Re-implementation of Experience Engine from memory or documents | PROHIBITED (per Charter §1: "No reconstruction from memory") |
| Speculative implementation of Experience Engine v2 | PROHIBITED (per Charter §1: "No speculative implementation") |
| Auto-promotion to RECOVERED | PROHIBITED (per PCR-001 §1 item 3) |
| Auto-promotion to UNRECOVERABLE | PROHIBITED (per PCR-001 §1 item 3) |
| Replacement via Envoy production evidence → Experience Engine v2 | REQUIRED (per Charter §1 and PCR-001 §1 items 5–7) |

---

## 5. Resolution path (forward path to Experience v2)

```
Envoy MVP release
  ↓
Envoy production data accumulates
  ↓
Discovery Beta Evidence Collection
  ↓
Experiment (registered per /opt/data/Experiment_Standard.md)
  ↓
Validation Record (verified evidence)
  ↓
Evidence Promotion Standard (EPS Level 0 → 5)
  ↓
Knowledge Candidate
  ↓
Owner / Executive review
  ↓
Experience Engine v2 RC
  ↓
Supersession of EXC-EXPERIENCE-001 (this exception becomes Superseded)
```

---

## 6. Cross-references

| Artifact | Path |
|---|---|
| Provenance Audit | `Experience_Provenance_Report.md` |
| Integrity Audit | `Experience_Integrity_Report.md` |
| Missing Files Audit | `Experience_Missing_Files_Report.md` |
| Recovery Classification | `Experience_Recovery_Classification.md` |
| Council Recommendation | `Experience_Council_Recommendation.md` |
| PCR-001 | `.platform-governance/resolutions/PCR-001.md` |
| Charter | `.charters/EXPERIENCE_ENGINE_CHARTER.md` |
| Recovery Failure Report (legacy, superseded) | `Recovery_Failure_Report.md` |

---

## 7. Seal

```
EXC-EXPERIENCE-001 REGISTERED 2026-07-14.
PCR-001 §1 item 2 executed.
Deferment is indefinite; resolution path is product-driven.
This exception will be SUPERSEDED, not DELETED, when Experience Engine v2 is promoted.
```
