# SPR-005 — Sprint 2B-2: Core SDK Acceptance Test

**Sprint**: 2B-2  
**Date**: 2026-07-11  
**Status**: 🟡 In Progress

---

## Goal

**Core SDK가 다른 엔진에서 아무 수정 없이 재사용된다는 사실을 증명.**

---

## Completed

### 사장님 확립 5개 검증 항목

1. **Import Boundary Test** (`tools/scripts/import-boundary-test.ts`)
   - core-sdk → 다른 engine import ❌
   - engine cross-import ❌

2. **Public API Snapshot** (`tools/scripts/public-api-snapshot.sh`)
   - Sprint 2B-2 snapshot 생성
   - CI에서 diff 검증

3. **Serialization Test** (`test/serialization.test.ts`)
   - JSON.stringify/parse round-trip
   - EventEnvelope, Result, PlatformError

4. **Error Compatibility** (PlatformError.toLog + toPublic)
   - Logger용 / Public 응답용 분리

5. **Example Test** (`tools/scripts/example-test.sh`)
   - examples/*.ts 컴파일 + 실행

### Policy Engine 마이그레이션

- `engines/policy/src/errors.ts` → Core SDK PlatformError 상속
- 자체 PolicyError → deprecated, Sprint 후속에서 완전 제거

### Identity Engine Acceptance

- `engines/identity/src/example-acceptance.ts`
- `Result`, `Validation`, `EventEnvelope`, `Logger` 모두 Core SDK 사용

---

## Issues

- LSP가 zod/vitest 타입 미인식 (의존성 미설치 — 정상)
- 모노레포 workspace 실제 pnpm install 대기 (Sprint 2A 후속)

---

## PRG Result

| # | 항목 | Status |
|---|---|---|
| 1 | Import Boundary Test | ✅ 도구 작성 완료 |
| 2 | Public API Snapshot | ✅ snapshot 첫 생성 |
| 3 | Serialization Test | ✅ 테스트 작성 완료 |
| 4 | Error Compatibility | ✅ toLog + toPublic 추가 |
| 5 | Example Test | ✅ 도구 작성 완료 |

**판정**: 🟡 CONDITIONAL PASS (도구/인터페이스 작성 완료, 실제 검증은 pnpm install 후)

---

## Coverage

- Import Boundary: 정적 분석 (TS regex)
- Public API Snapshot: Sprint별 비교
- Serialization: EventEnvelope + Result + Error
- Error Compatibility: REST/GraphQL/gRPC/CLI/Worker 호환
- Example Test: 모든 모듈의 examples/

---

## Next Sprint

**Sprint 2C: Identity Engine 구현** (사장님 승인 대기)
- Core SDK 사용 본격화
- 실제 Login/Register/OAuth 구현

Sprint 2B-2 통과 시 **v1.0 Stable 선언 가능** (사장님 확립).

---

**End of SPR-005**
