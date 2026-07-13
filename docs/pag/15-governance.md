# PAG Part 15 — Platform Governance

> Versioning, backward compatibility, migration, approval processes.

## Versioning

| Artifact | Version Scheme | Current Version |
|---|---|---|
| Platform (core-sdk) | SemVer (MAJOR.MINOR.PATCH) | 1.0.0 |
| Engines | SemVer + RC (e.g., 1.0.0-rc2) | Per-engine |
| Skills | SemVer | 1.0.0 |
| Skill Packs | SemVer | 1.0.0 |
| Playbooks | SemVer | 1.0.0 |
| QES | SemVer | 1.0.0 |
| PAG | SemVer | 1.0.0 |

## Backward Compatibility Rules

1. **Major version bump** = breaking change (requires migration)
2. **Minor version bump** = additive (new features, no breakage)
3. **Patch version bump** = bug fix (no behavior change)
4. **Event schemas**: Major version must match between producer and consumer
5. **Zod schemas**: New fields = minor (additive), removed fields = major (breaking)

## Approval Matrix

| Change Type | Approver | Evidence Required |
|---|---|---|
| New Skill | Skill Council (Governance) | 15-field validation + evidence source |
| New Skill Pack | Skill Council | All member skills validated |
| New Playbook | Platform Architecture Committee | Industry analysis + section coverage |
| QES Rule Change | Quality Council | Evidence (≥10 chars) from production data |
| New Engine | ❌ FORBIDDEN | Architecture is COMPLETE |
| Learning Update | Automatic (evidence-based) | Production metrics |
| PAG Update | Platform Architecture Committee | Version change rationale |

## Migration Strategy

When a major version changes:

```
1. Old version remains available (backward compat)
2. Deprecation notice emitted
3. New version runs in parallel
4. Consumers migrate at their pace
5. Old version removed after 2 major cycles
```

## Skill/Playbook Approval Flow

```
Propose → Validate (15 fields) → Quality Gates (6 checks)
→ Governance Review → Approve / Reject / Quarantine
→ If A/B: auto-executable
→ If C: requires explicit approval per use
→ If D: disabled
```

## Platform Integrity Validation

Run `runPlatformValidation()` before any release:

- ✅ No duplicate engine
- ✅ No new business engine (outside approved registry)
- ✅ No boundary violation
- ✅ No industry coupling in core
- ✅ All preserved engines present
- ✅ No architecture drift

**If any critical finding → release BLOCKED.**