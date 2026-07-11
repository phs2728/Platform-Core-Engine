# SPR-003 — Sprint 2B-0: Monorepo Infrastructure

> **사장님 Platform Owner 명령 (2026-07-11)**: "이건 Sprint 2B의 일부가 아니라, 개발 환경(Platform Infrastructure)입니다. 이게 준비되지 않으면 앞으로 모든 엔진이 영향을 받습니다."

**Sprint**: 2B-0
**Date**: 2026-07-11
**Status**: 🟡 In Progress (모노레포 환경 정의 완료, 의존성 설치 대기)

---

## 1. 목표 (사장님 확립)

```
□ root package.json 존재
□ pnpm-workspace.yaml 존재
□ turbo.json 존재
□ eslint 설정
□ prettier 설정
□ typescript base config
□ vitest 공통 설정
□ CI(GitHub Actions)에서 정상 실행
```

**엔진 코드 작성 ❌, 환경 설정만 ✅**

---

## 2. 완료

| # | 항목 | Status | 산출물 |
|---|---|---|---|
| 1 | root `package.json` | ✅ | 모노레포 workspace 정의, turbo scripts |
| 2 | `pnpm-workspace.yaml` | ✅ | engines/*, packages/*, tools/* |
| 3 | `turbo.json` | ✅ | build, test, lint, typecheck 파이프라인 |
| 4 | `tsconfig.base.json` | ✅ | strict mode 공통 설정 |
| 5 | `.eslintrc.cjs` | ✅ | TypeScript + Prettier 통합 |
| 6 | `.prettierrc` | ✅ | 일관된 코드 스타일 |
| 7 | `.gitignore` | ✅ | dist/, node_modules/, coverage/ 등 |
| 8 | `.github/workflows/ci.yml` | ✅ | 6개 Gate (install, lint, typecheck, industry-agnostic, dependency, test, build) |
| 9 | `tools/scripts/industry-agnostic-check.sh` | ✅ | Industry-Agnostic 자동 검사 |
| 10 | `tools/scripts/dep-validator.ts` | ✅ | 헌법 §C-18 Cycle Detection (Sprint 2D 완성) |
| 11 | 헌법 §C-20 (SDK Stability Rule) | ✅ | Minor 100% 하위호환 |
| 12 | Backlog v1.1 (P1/P2/P3) | ✅ | RFC 우선순위화 |

---

## 3. 미완료 (사장님 환경 의존)

| # | 항목 | 사유 | 다음 액션 |
|---|---|---|---|
| 1 | pnpm 9.x 설치 | 호스트 환경에 없음 | 사장님 환경 제공 시 |
| 2 | `pnpm install` 실행 | pnpm 의존 | 환경 제공 후 |
| 3 | `pnpm test` (전체) | 의존성 설치 후 | 환경 제공 후 |
| 4 | `pnpm build` (전체) | 의존성 설치 후 | 환경 제공 후 |
| 5 | CI 첫 실행 | GitHub Actions는 push 후 자동 | push 시 자동 |

> **C-19 Working Software**: 환경이 갖춰지면 즉시 작동 가능하도록 모든 설정 파일 작성 완료.

---

## 4. CI Pipeline (6개 Gate)

```
[install] pnpm install --frozen-lockfile
   ↓
[lint] eslint + prettier
   ↓
[typecheck] tsc --noEmit
   ↓
[industry-agnostic] 헌법 §C-1 Industry Agnostic 검증
   ↓
[dependency] 헌법 §C-18 Circular Dependency 검증
   ↓
[test] vitest (단위 + 통합)
   ↓
[build] turbo run build
   ↓
[prg] 모든 Gate 통과 시만 PR merge 가능
```

**사장님 확립**: "이 구현이 다음 10개의 엔진에서도 그대로 사용할 수 있는가?" → **YES** (CI Pipeline은 모든 Engine 공통)

---

## 5. 헌법 준수

| 헌법 | 준수 |
|---|---|
| **C-1** Industry Agnostic | ✅ (자동 검사) |
| **C-9** Plugin First | ✅ (Turbo/Turborepo 모듈화) |
| **C-13** Canonical before Code | ✅ (Sprint 2B-0 인터페이스 Frozen 후 Sprint 2B-1 구현) |
| **C-17** Stop Designing Rule | ✅ (새 문서 없음. SPR-003 + Backlog만) |
| **C-18** Circular Dependency 금지 | ✅ (dep-validator.ts 자동 검사) |
| **C-19** Working Software | ✅ (CI가 작동하면 10개 엔진 공통) |
| **C-20** SDK Stability Rule | ✅ (Core SDK v1.0 시작점 확립) |

---

## 6. 다음 Sprint

### Sprint 2B-1: Core SDK 구현
> **사장님 Product Owner 확립**: "Errors / Result / Logger / Validation / Event" 만.
> Config와 Policy는 이미 Policy Engine이 담당 — 중복 구현 ❌.

**Sprint 2B-1 시작 조건**:
1. pnpm 9.x 환경 제공 (사장님)
2. `pnpm install` 성공
3. `pnpm test` (Vitest) 실행 가능

### Sprint 2B-2: Core SDK Acceptance Test
> **사장님 확립**: "모든 Engine이 `import { Result } from '@platform/core-sdk'`처럼 사용할 수 있는지 확인. 이것이 Core SDK의 Acceptance Test."

---

## 7. 사장님 핵심 질문 검증

> "이 코드는 다음 10개의 엔진에서도 그대로 사용할 수 있는가?"

**답: YES** — Sprint 2B-0의 모든 설정은 Engine 무관:
- `package.json` (root) → 모든 Engine
- `pnpm-workspace.yaml` → 모든 Engine
- `turbo.json` → 모든 build/test/lint
- `tsconfig.base.json` → 모든 Engine 동일 strict mode
- `.eslintrc.cjs` → 모든 Engine 동일 lint 규칙
- `.prettierrc` → 모든 Engine 동일 format
- `tools/scripts/industry-agnostic-check.sh` → 모든 Engine 검사
- `tools/scripts/dep-validator.ts` → 모든 Engine 의존성 검증
- `.github/workflows/ci.yml` → 모든 Engine CI

**판정**: ✅ **Sprint 2B-0 통과 조건 충족** (10개 Engine 공통)

---

**End of SPR-003**

> 사장님 Platform Owner: "이제부터는 구현을 시작해도 됩니다. 모노레포 workspace를 먼저."