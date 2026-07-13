# PAG Part 4 — Workflow Rules

> For every project: execution order, parallel execution, handoff rules, approval rules.

## Standard Execution Order

```
Phase 1: Planning        (sequential)
  ↓
Phase 2: Research        (parallel swarm)
  ↓
Phase 3: Creative        (parallel swarm)
  ↓
Phase 4: Experience      (parallel swarm)
  ↓
Phase 5: Theme           (sequential, blocks Component)
  ↓
Phase 6: Component       (sequential, needs Theme)
  ↓
Phase 7: CMS             (parallel with Component)
  ↓
Phase 8: Studio          (sequential, needs Theme+Component+CMS)
  ↓
Phase 9: Frontend Gen    (parallel: React/Vue/Flutter)
  ↓
Phase 10: Backend/BFF    (parallel with Frontend)
  ↓
Phase 11: QA             (sequential, blocks Release)
  ↓
Phase 12: Release        (sequential, final)
  ↓
Phase 13: Learning       (async, post-release)
```

## Parallel Execution Rules

| Phase | Parallelizable? | Swarms Involved |
|---|---|---|
| Research | ✅ Yes | Research Swarm (5 specialists) |
| Creative | ✅ Yes | Creative Swarm (5 specialists) |
| Experience | ✅ Yes | UX Swarm (4 specialists) |
| Theme → Component | ❌ No | Sequential (Component needs ThemeManifest) |
| CMS | ✅ Yes (with Component) | Engineering Swarm |
| Frontend Gen | ✅ Yes (per target) | Engineering Swarm |
| QA | ✅ Yes (per page) | QA Swarm (4 specialists) |

## Handoff Rules

```
Theme Engine → (ThemeManifest) → Component Engine
Theme Engine → (ThemeManifest) → CMS Engine (read-only)
Component Engine → (ComponentManifest) → CMS Engine (read-only)
CMS Engine → (Content+Page) → Studio Engine (read-only)
Studio Engine → (PublishIntent event) → CMS Engine (publish)
All Engines → (EventEnvelope) → Agency OS (orchestration)
```

## Approval Rules

| Decision Type | Required Approver | Agency First Principle Gates |
|---|---|---|
| Theme selection | Creative Director + CDO | 6/6 gates |
| Layout structure | UX Director + CDO | 6/6 gates |
| Copy direction | Creative Director + CEO | 6/6 gates |
| QES FAIL → Release override | ❌ FORBIDDEN | N/A — QES FAIL blocks release |
| QES WARNING → Release | CDO approval required | 6/6 gates |
| QES PASS → Release | Auto-approved | N/A |