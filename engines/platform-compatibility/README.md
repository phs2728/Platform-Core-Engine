# Platform Compatibility Suite

> **Platform QA Foundation — Validates contracts, events, references, APIs, and dependencies across ALL engines. NO BUSINESS LOGIC. QA ONLY. Auto-generates compatibility matrix, health scores, release reports.**

**Version**: 0.1.0 (Draft — RC1)
**Phase**: 1 (Foundation)
**Branch**: `feature/platform-compatibility-suite`

---

## 목적

Platform이 30~50개 Engine으로 커질수록 Engine 간 계약(Contract)이 깨지는 것이 가장 위험합니다.
이 Engine은 **모든 Engine의 호환성과 품질을 자동 검증**하는 Platform QA Foundation입니다.

**절대 하지 않는 것**: Business Logic, Pricing, Booking, Inventory, Payment, Authentication, Authorization — QA만 수행.

---

## 의존성

```yaml
depends_on:
  - core-sdk
```

---

## 빠른 시작

```bash
# Full platform scan (모든 검증 + 8개 리포트 생성)
pnpm platform:compat

# 개별 검증
pnpm contract:test      # Contract 검증
pnpm event:test         # Event Contract 검증
pnpm reference:test     # Reference Contract 검증
pnpm dependency:test    # Dependency / Circular 검증
pnpm api:test           # API Snapshot / Breaking Change 검증
pnpm release:test       # Release Certification
pnpm health             # Engine Health Score
```

---

## 검증 항목

| 검증 | 설명 |
|---|---|
| **Event Contract** | Publisher/Subscriber 존재 여부, Payload, Version, Schema |
| **Reference Contract** | Reference Type owner 존재 여부, 필수 필드 |
| **API Compatibility** | Public API Snapshot → Breaking Change 감지 |
| **Dependency** | Circular Dependency, Phase 위반, Missing Dependency |
| **Contract** | 모든 검증 결과 취합 → Engine별 PASS/FAIL |
| **Compatibility Matrix** | 모든 Engine pair 간 관계 (depends/event/reference/none) |
| **Event Graph** | Publisher → Subscriber 이벤트 흐름 그래프 |
| **Health Score** | Engine별 0–100점 (6 factors) |
| **Release Certification** | Engine별 Merge 가능 여부 (PASS/FAIL/WARNING) |
| **Platform Readiness** | Platform 전체 준비도 보고 |

---

## Engine Health Score (6 Factors)

| Factor | Max Points | 설명 |
|---|---|---|
| Contract Violations | 30 | critical -15, warning -5 |
| Event Contracts | 15 | fail -8, warning -3 |
| Reference Contracts | 10 | fail -10 |
| Dependency Health | 20 | cycle -20, forbidden -10, layer -5 |
| API Stability | 15 | breaking -15 |
| Manifest Completeness | 10 | provides, events, boundaries |

---

## Architecture

```
src/
├── interfaces/          ← Types & Port interfaces
├── contracts/           ← Contract aggregation
├── events/              ← Event Contract Validator
├── references/          ← Reference Contract Validator
├── apis/                ← API Snapshot & Diff
├── dependencies/        ← Dependency & Cycle detection
├── runner/              ← Matrix builder, Event graph, Health calculator
├── certification/       ← Release & Platform readiness
├── report/              ← 8 Markdown report generators
├── use-cases/           ← 11 use cases
├── infrastructure/      ← Filesystem loader, In-Memory stores
└── index.ts             ← Public API
```

---

## Reports (자동 생성)

```
docs/platform/
├── compatibility-report.md    ← 호환성 매트릭스 + Platform Readiness
├── contract-report.md         ← Engine별 Contract 위반
├── dependency-report.md       ← 의존성 그래프 + 순환 참조
├── event-report.md            ← 이벤트 계약 + 흐름 그래프
├── reference-report.md        ← 참조 계약
├── api-report.md              ← API Snapshot diff
├── release-report.md          ← Engine 인증
└── health-report.md           ← 헬스 스코어 + 요인 분석
```

---

## Tests

```bash
pnpm test   # 91 tests
```

| Category | Tests |
|---|---|
| Event Contracts | 12 |
| Reference Contracts | 10 |
| Dependency | 12 |
| API Snapshots | 10 |
| Contract Aggregation | 8 |
| Compatibility Matrix | 10 |
| Health & Release | 10 |
| Report Generation | 8 |
| Integration | 11 |
| **Total** | **91** |
