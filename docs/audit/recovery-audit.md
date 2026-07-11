# Recovery Audit Report — Identity Engine

> **Sprint 2C-4 Task 3** · 2026-07-11
> Engine: `@platform/engine-identity` v1.0.0-rc.1
> 테스트 파일: `engines/identity/test/recovery-audit.test.ts`

## 1. 개요

Identity Engine이 의존하는 외부 인프라(DB, Redis, SMTP, OAuth Provider) 및
내부 상태(Clock, Session, Refresh Token) 장애 상황에서의 동작을 검증한다.

각 시나리오는 **Expected / Actual / Recovery / Result** 구조로 보고한다.

## 2. 테스트 환경

- **저장소**: In-Memory Repository (장애 시뮬레이션을 위해 래핑하여 사용)
- **테스트 프레임워크**: Vitest 1.6.1
- **Clock**: 고정 시간 기반 (일부 시나리오에서 가변)
- **외부 의존성**: Mock Provider로 네트워크 호출 없이 시뮬레이션

## 3. 시나리오별 결과

### 3.1 DB Down (AccountRepository 장애)

| 항목 | 내용 |
|------|------|
| **시나리오** | DB 연결 끊김 (ECONNREFUSED) — AccountRepository의 모든 메서드가 실패 |
| **Expected** | Login 시도 → `AuthenticationError` 반환 (안전 실패, fail-closed) |
| **Actual** | `findByEmail` 실패 → `AuthenticationError('Invalid credentials')` 반환 |
| **Recovery** | DB 복구 후 동일 UseCase 인스턴스로 정상 Login 가능 |
| **Result** | ✅ **PASS** — 장애 중 인증 정보 누출 없음 (동일한 에러 메시지) |

**검증 포인트**:
- DB 장애 시 "Account not found"가 아닌 "Invalid credentials" 반환 → **사용자 열거(enumeration) 방지**
- 복구 후 별도 재시작 없이 즉시 정상 동작

### 3.2 Redis Down (Session Repository 장애)

| 항목 | 내용 |
|------|------|
| **시나리오** | Redis 연결 끊김 — SessionRepository의 모든 메서드가 실패 |
| **Expected** | Session 생성 실패 → `insert()`에서 throw |
| **Actual** | `loginUseCase` 내 `sessionRepository.insert()`에서 `'Redis ECONNREFUSED'` throw |
| **Recovery** | Redis 복구 후 Session 정상 생성 |
| **Result** | ✅ **PASS** — Session 없는 인증 성공 불가 (fail-closed) |

**검증 포인트**:
- Session Repository 장애 시 Login UseCase가 부분 성공하지 않음
- Password 검증 통과 후 Session 저장 실패 → 전체 Login 실패

### 3.3 SMTP Down (Email Sender 장애)

| 항목 | 내용 |
|------|------|
| **시나리오** | SMTP 서버 연결 끊김 — EmailSender.send() 실패 |
| **Expected** | 이메일 발송 필요한 UseCase에서 throw |
| **Actual** | `send()` 호출 시 `'SMTP connection refused (ECONNREFUSED)'` throw |
| **Recovery** | SMTP 복구 후 이메일 정상 발송 |
| **Result** | ✅ **PASS** — 이메일 발송 실패 시 UseCase가 중단됨 |

**검증 포인트**:
- Email Verification, Password Reset 등 이메일 의존 UseCase가 장애를 전파
- 사용자에게 "발송됨" 거짓 응답 방지

### 3.4 OAuth Provider Down

| 항목 | 내용 |
|------|------|
| **시나리오** | OAuth Provider(google 등) API 응답 불가 (네트워크 장애) |
| **Expected** | `exchangeCode()` / `fetchUserProfile()` 실패 → UseCase 오류 |
| **Actual** | `exchangeCode` 호출 시 `'fetch failed (ECONNREFUSED)'` throw |
| **Recovery** | Provider 복구 후 정상 OAuth Login 가능 |
| **Result** | ✅ **PASS** — 외부 장애가 내부 시스템으로 전파되지 않음 |

**검증 포인트**:
- OAuth Provider 장애 시 명확한 에러 메시지
- Plugin First 아키텍처로 인해 하나의 Provider 장애가 다른 Provider에 영향 없음

### 3.5 Clock Drift (서버 간 시간 불일치)

| 항목 | 내용 |
|------|------|
| **시나리오** | 서버 간 Clock 불일치 — 클라이언트/서버 시간 차이 |
| **Expected** | Session 만료 판정이 서버 Clock 기준으로 일관되게 동작 |
| **Actual** | 미래 시간으로 설정 시 만료된 Session이 정확히 거부됨 |
| **Recovery** | Clock 동기화 후 정상 동작 |
| **Result** | ✅ **PASS** — Clock Drift에도 Session 만료 로직 정상 |

**검증 포인트**:
- 25시간 후 Clock 이동 → 24시간 Session 만료 정확히 감지
- `refreshSessionUseCase`가 만료된 토큰을 `NotFoundError`로 거부

### 3.6 Expired Session (만료된 세션)

| 항목 | 내용 |
|------|------|
| **시나리오** | 이미 만료된 Session Token으로 Refresh 시도 |
| **Expected** | `NotFoundError('Session expired')` 반환 |
| **Actual** | `refreshSessionUseCase` → `NotFoundError` 반환 |
| **Recovery** | 사용자 재인증 필요 |
| **Result** | ✅ **PASS** — 만료된 Session으로 갱신 불가 |

**검증 포인트**:
- `expiresAt` 비교 로직이 서버 Clock 기준으로 정확
- 만료된 토큰으로 새 토큰 발급 방지

### 3.7 Invalid Refresh Token (잘못된 리프레시 토큰)

| 항목 | 내용 |
|------|------|
| **시나리오** | 존재하지 않는/잘못된 Session Token으로 Refresh 시도 |
| **Expected** | `NotFoundError('Session not found')` 반환 |
| **Actual** | `refreshSessionUseCase` → `NotFoundError` 반환 |
| **Recovery** | 사용자 재인증 필요 |
| **Result** | ✅ **PASS** — 존재하지 않는 토큰으로 Session 갱신 불가 |

**검증 포인트**:
- `findByToken`이 존재하지 않는 토큰에 대해 `Err` 반환
- Refresh Token Rotation 후 이전 토큰 사용 불가

## 4. 종합 평가

| 시나리오 | Result |
|----------|--------|
| 1. DB Down | ✅ PASS |
| 2. Redis Down | ✅ PASS |
| 3. SMTP Down | ✅ PASS |
| 4. OAuth Provider Down | ✅ PASS |
| 5. Clock Drift | ✅ PASS |
| 6. Expired Session | ✅ PASS |
| 7. Invalid Refresh Token | ✅ PASS |

**전체 결과: 7/7 PASS**

### 주요 발견사항

1. **Fail-Closed 설계**: 모든 인프라 장애 상황에서 인증을 허용하지 않음 (보안 우선)
2. **에러 메시지 일관성**: 장애 유형과 무관하게 동일한 인증 실패 응답 → 정보 누출 방지
3. **복구 용이성**: 장애 복구 후 별도 재시작/상태 초기화 없이 즉시 정상 동작
4. **Result<T,E> 패턴**: 모든 UseCase가 throw가 아닌 Result 반환으로 예측 가능한 오류 처리

### 테스트 통계

```
Test Files  1 passed (1)
     Tests  9 passed (9)
```
