# SPR-006 — Sprint 2B-2: Core SDK v1.0 RC1 (Release Candidate)

**Sprint**: 2B-2 Close-out
**Date**: 2026-07-11
**Status**: 🟡 Core SDK v1.0 RC1 (Stable 보류)

---

## Goal

**Core SDK가 다른 엔진에서 재사용된다는 증명 → 5개 검증 도구 작성.**
**Status: RC1 (Stable 조건 미충족).**

---

## Completed

### 사장님 확립 5개 검증 항목 (모두 도구 작성 완료)

| # | 항목 | 도구 | 비고 |
|---|---|---|---|
| 1 | Import Boundary Test | `tools/scripts/import-boundary-test.ts` | pnpm install 후 실행 |
| 2 | Public API Snapshot | `tools/scripts/public-api-snapshot.sh` | 첫 snapshot 생성 |
| 3 | Serialization Test | `test/serialization.test.ts` | 5개 테스트 |
| 4 | Error Compatibility | PlatformError.toLog/toPublic | 인터페이스 추가 |
| 5 | Example Test | `tools/scripts/example-test.sh` | examples/*.ts |

### Policy Engine Migration
- `engines/policy/src/errors.ts` → Core SDK PlatformError 상속

### Identity Engine Acceptance
- `engines/identity/src/example-acceptance.ts` (재사용 증명)

---

## Release State

**Core SDK** = `v1.0 RC1` (Release Candidate 1)
- Architecture ✅
- Reusability ✅
- API ✅
- SDK Design ✅
- Acceptance Design ✅
- Local Verification 🟡 (pnpm install 대기)
- CI Verification 🟡 (GitHub Actions 첫 push 대기)
- **Stable** ❌

---

## Stable 조건 (사장님 확립)

모두 PASS 필수:
- pnpm install
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build
- 다른 Engine 실제 Import
- Examples 실행
- GitHub Actions Green
- PRG PASS
- Engine Certification PASS

---

## 헌법 보강 (§12.17 C-21 Platform Release Rule)

**5단계**: Draft → Alpha → Beta → RC → Stable

---

## Next

**Stable 선언 대기** (사장님 환경에서 pnpm install + 검증 후).
Stable 선언 후 **Sprint 2C (Identity Engine 구현)** 시작.

---

**End of SPR-006**

> 사장님 Platform Owner: "이 마지막 검증은 단순한 절차가 아니라, Platform Core가 실제 동작하는 기반임을 증명하는 중요한 기준이 됩니다."
