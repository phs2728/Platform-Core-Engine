# Platform Validation Engine v0.1 RC1

> The platform's self-validation capability — E2E testing, certification, and release readiness.

## Overview

Platform Validation Engine은 단순한 테스트 도구가 아닙니다. 플랫폼 전체가 **스스로 자신의 품질을 검증**하는 엔진입니다.

- **8 Built-in Scenarios**: Full Lifecycle, Cancellation, Payment Failure, Archive Chain, Authorization Deny, Media Flow, Communication Failure, Identity Login
- **Scenario Runner**: 각 단계마다 Event Published, Repository Updated, Workflow State, Permission, Audit, Communication, Guardian, Compatibility 검증
- **Certification**: 엔진별 7개 영역 인증 (Architecture, Platform, Security, Performance, Maintainability, Test, Backward Compatibility)
- **Platform Health**: overallScore (0~100), engine health, guardian + compatibility scores
- **Release Validation**: 전체 regression + 모든 엔진 certification
- **Reports**: 7가지 타입 (validation, scenario, coverage, release, regression, certification, health)

## Architecture

```
engines/platform-validation/
├── engine.json
├── README.md
├── docs/
│   ├── 01-prd.md
│   ├── SPR-001.md
│   └── Engine_Certification.md
├── src/
│   ├── interfaces/index.ts     — 10 entities + 6 repos + 5 host interfaces
│   ├── domain/
│   │   ├── statusTransition.ts — validation status + health/readiness formulas
│   │   ├── events.ts           — EventEnvelope builder
│   │   ├── audit.ts            — Audit helper
│   │   └── validation.ts       — zod schemas
│   ├── scenario/
│   │   └── builtinScenarios.ts — 8 built-in platform scenarios
│   ├── infrastructure/
│   │   ├── InMemoryRepositories.ts — 6 InMemory repos
│   │   └── hostAdapters.ts     — ManifestProvider, ActionProvider, Guardian, Compatibility, EventBus
│   ├── use-cases/
│   │   ├── types.ts            — ValidationUseCaseDeps (3-Layer DI)
│   │   ├── ValidationUseCases.ts   — 6 (runValidation/runScenario/runRegression/runSmokeTest/runCertification/runReleaseValidation)
│   │   ├── ScenarioUseCases.ts     — 7 (CRUD + seedBuiltin)
│   │   └── ReportHealthUseCases.ts — 6 (generateReport/metrics/summary + calculateHealth/coverage/readiness)
│   └── index.ts                — Public API barrel
├── test/
│   ├── helpers.ts              — Mock engine manifests + action providers
│   └── validation.test.ts      — 51 tests
└── examples/
    └── 01-full-lifecycle.ts
```

## Public API (25 Use Cases)

### Validation Execution (6)
- `runValidationUseCase` — core executor (multiple scenarios)
- `runScenarioUseCase` — single scenario
- `runRegressionUseCase` — all active scenarios
- `runSmokeTestUseCase` — critical-tagged subset
- `runCertificationUseCase` — per-engine 7-area certification
- `runReleaseValidationUseCase` — regression + certify all engines

### Scenario Management (7)
- `createScenarioUseCase` / `updateScenarioUseCase` / `deleteScenarioUseCase`
- `getScenarioUseCase` / `listScenariosUseCase` / `searchScenariosUseCase`
- `seedBuiltinScenariosUseCase` — loads 8 built-in scenarios

### Reports & Health (6)
- `generateReportUseCase` / `generateMetricsUseCase` / `generateSummaryUseCase`
- `calculateHealthUseCase` / `calculateCoverageUseCase` / `calculateReadinessUseCase`

### Built-in Scenario Library (8)
1. **Full Lifecycle** — User → Org → Catalog → Pricing → Inventory → Booking → Order → Workflow → Payment → Communication → Review (11 steps)
2. **Cancellation Flow** — Booking Cancel → Inventory Release → Workflow Cancel → Payment Refund → Communication → Review Block
3. **Payment Failure + Rollback** — Payment Fail → Workflow Rollback → Inventory Release → Audit → Communication
4. **Archive Chain** — Org Archive → Catalog Archive → Inventory Archive → Booking Reject → Order Reject
5. **Authorization Deny** — Auth Deny → Workflow Stop → Audit → Guardian Warning
6. **Media Flow** — Media Upload → Catalog Update → Search Index → Review Attachment
7. **Communication Failure** — Comm Fail → Retry → DLQ → Alert
8. **Identity Login** — Login → Permission Check → Workflow Start → Payment → Review

## Key Formulas

### Health Score
```
healthScore = passRate × 0.30
            + coverage × 0.25
            + guardianScore × 0.225
            + compatibilityScore × 0.225
```

### Platform Status
```
≥85 → Healthy
≥60 → Degraded
<60 → Critical
```

### Readiness
```
readiness = passRate - (failedScenarios × 5) - (brokenContracts × 10)
ready = readiness ≥ 85 && failedScenarios === 0
```

## Host Interfaces

- `IEngineManifestProvider` — reads engine.json metadata (never imports engines)
- `IEngineActionProvider` — executes actions on engines via plugin
- `IGuardianProvider` — reads Platform Guardian scores
- `ICompatibilityProvider` — reads Compatibility Suite results
- `ICustomDataPolicyProvider` — scenario attribute validation

## Sprint 1 Results

- 25 Use Cases
- 51 tests
- 8 built-in scenarios (47 steps total)
- 6 InMemory Repositories
- 0 cross-engine imports (QA meta-engine pattern)
- 0 industry-agnostic violations
