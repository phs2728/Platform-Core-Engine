# Upgrade Audit Report — Identity Engine

> **Sprint 2C-4 Task 4** · 2026-07-11
> Engine: `@platform/engine-identity` v1.0.0-rc.1

## 1. 개요

Identity Engine의 버전 업그레이드 시 **하위 호환성(backward compatibility)**을 검증한다.
Core SDK 헌법 §C-20 (SDK Stability Rule): Minor 100% 하위 호환, Breaking Change = Major + ADR 필수.

### 검증 항목

1. Session Token 호환성 (old → upgrade → still valid)
2. Refresh Token 호환성
3. Event Schema 하위 호환성
4. Public API 호환성

## 2. Session Token 호환성

### 검증 방법
- 기존 형식의 Session Token (`tok:{sessionId}`)이 업그레이드 후에도 유효한지 확인
- `ISessionSigner` 인터페이스의 `sign` / `verify` 계약 준수

### 결과

| 항목 | 상태 | 비고 |
|------|------|------|
| Token 형식 (`tok:{id}`) | ✅ 호환 | 동일한 서명 형식 유지 |
| `ISessionSigner.verify()` | ✅ 호환 | 기존 토큰 검증 가능 |
| `SessionPayload` 구조 | ✅ 호환 | accountId/sessionId/tenantId/issuedAt/expiresAt 유지 |
| `SessionRecord` 필드 | ✅ 호환 | 모든 기존 필드 유지 + 새 필드는 optional |

### 상세 분석

**SessionPayload (불변 계약)**:
```typescript
interface SessionPayload {
  accountId: string;   // 불변
  sessionId: string;   // 불변
  tenantId: string;    // 불변
  issuedAt: string;    // 불변
  expiresAt: string;   // 불변
}
```

**SessionRecord (확장 가능)**:
```typescript
interface SessionRecord {
  // ... 기존 필드 ...
  refreshToken: string | null;       // v1.0 추가 (null 허용)
  deviceFingerprint: string | null;  // v1.0 추가 (null 허용)
  deviceName: string | null;         // v1.0 추가 (null 허용)
}
```

> 기존 토큰은 `SessionSigner.verify()`를 통해 payload 복원 가능하며,
> 새 필드들은 모두 `null` 허용이므로 하위 호환성 보장.

## 3. Refresh Token 호환성

### 검증 방법
- `refreshSessionUseCase`가 기존 Session Token을 입력받아 새 Token 발급
- Rotation 후 이전 토큰 무효화 확인

### 결과

| 항목 | 상태 | 비고 |
|------|------|------|
| 기존 토큰 → Refresh | ✅ 호환 | `findByToken`으로 기존 토큰 조회 가능 |
| Rotation (old → new) | ✅ 작동 | 기존 토큰 삭제 + 새 토큰 생성 |
| 이전 토큰 무효화 | ✅ 확인 | Rotation 후 이전 토큰 사용 불가 |
| 만료된 토큰 거부 | ✅ 확인 | `NotFoundError` 반환 |

### Rotation 흐름
```
1. findByToken(oldToken) → SessionRecord
2. expiresAt 체크 (만료 시 NotFoundError)
3. 새 SessionPayload 생성 (샊은 sessionId, 새 expiresAt)
4. signer.sign(newPayload) → newToken
5. sessionRepository.delete(oldSession.id)
6. sessionRepository.insert(newSession)
7. Event: session.refreshed.v1 발행
```

## 4. Event Schema 하위 호환성

### 검증 방법
- 모든 EventEnvelope이 `schemaRef` (예: `auth.login.success.v1`)를 포함하는지 확인
- Event 구조가 Core SDK `EventEnvelope<T>` 표준을 준수하는지 확인

### 결과

| Event Type | SchemaRef | 상태 |
|------------|-----------|------|
| `account.created` | `account.created.v1` | ✅ |
| `auth.login.success` | `auth.login.success.v1` | ✅ |
| `auth.login.failure` | `auth.login.failure.v1` | ✅ |
| `session.refreshed` | `session.refreshed.v1` | ✅ |
| `session.logout_all` | `session.logout_all.v1` | ✅ |
| `session.revoked` | `session.revoked.v1` | ✅ |
| `password.changed` | `password.changed.v1` | ✅ |
| `password.reset.requested` | `password.reset.requested.v1` | ✅ |
| `password.reset.confirmed` | `password.reset.confirmed.v1` | ✅ |
| `verification.email.requested` | `verification.email.requested.v1` | ✅ |
| `mfa.enrolled` | `mfa.enrolled.v1` | ✅ |
| `device.trusted` | `device.trusted.v1` | ✅ |
| `device.revoked` | `device.revoked.v1` | ✅ |

### EventEnvelope 구조 (Core SDK 표준)

```typescript
interface EventEnvelope<TPayload> {
  readonly eventId: string;        // UUID v7
  readonly aggregateId: string;
  readonly occurredAt: string;     // ISO 8601
  readonly version: string;        // SemVer "1.0.0"
  readonly tenantId: string;
  readonly correlationId: string;
  readonly causationId: string;
  readonly engine: EngineName;     // "identity"
  readonly eventType: string;      // "auth.login.success"
  readonly schemaRef: string;      // "auth.login.success.v1"
  readonly payload: TPayload;
}
```

> 모든 이벤트가 `version: "1.0.0"`과 개별 `schemaRef`를 포함.
> Schema 진화 시 새 `schemaRef` 버전(v2) 추가로 하위 호환성 보장.

## 5. Public API 호환성

### 검증 방법
- `src/index.ts`에서 export하는 모든 심볼이 기존 계약을 유지하는지 확인
- UseCase 함수 시그니처 (`(input, deps) => Promise<Result<T, E>>`) 일관성

### 결과

### 5.1 Export 호환성

| Export 카테고리 | 상태 | 비고 |
|-----------------|------|------|
| Core SDK Re-exports | ✅ 호환 | Result, Ok, Err, Errors, Event, Validation |
| UseCase 함수 | ✅ 호환 | 모든 UseCase가 `(input, deps) → Result<T,E>` 패턴 |
| Input/Output Types | ✅ 호환 | 기존 타입 유지 |
| Deps Interfaces | ✅ 호환 | 인터페이스 확장만 (축소 없음) |
| In-Memory Repositories | ✅ 호환 | 모든 Repository 클래스 export 유지 |

### 5.2 UseCase 함수 시그니처

모든 UseCase가 동일한 패턴을 따른다:

```typescript
// 패턴: (input, deps) → Promise<Result<T, E>>
export async function xxxUseCase(
  input: XxxInput,
  deps: XxxDeps,
): Promise<Result<XxxOutput, SomeError>>
```

| UseCase | 반환 타입 | 상태 |
|---------|-----------|------|
| `createAccountUseCase` | `Result<CreateAccountOutput, ValidationError \| ConflictError>` | ✅ |
| `loginUseCase` | `Result<LoginOutput, AuthenticationError>` | ✅ |
| `refreshSessionUseCase` | `Result<RefreshSessionOutput, NotFoundError>` | ✅ |
| `logoutAllUseCase` | `Result<{ revokedCount: number }, Error>` | ✅ |
| `revokeSessionUseCase` | `Result<void, NotFoundError>` | ✅ |
| `changePasswordUseCase` | `Result<ChangePasswordOutput, ValidationError \| AuthenticationError>` | ✅ |
| `requestPasswordResetUseCase` | `Result<RequestPasswordResetOutput, never>` | ✅ |
| `confirmPasswordResetUseCase` | `Result<ConfirmPasswordResetOutput, ValidationError \| NotFoundError>` | ✅ |
| `requestEmailVerificationUseCase` | `Result<RequestEmailVerificationOutput, NotFoundError \| ValidationError>` | ✅ |
| `enrollTotpUseCase` | `Result<EnrollTotpOutput, Error>` | ✅ |
| `trustDeviceUseCase` | `Result<void, NotFoundError>` | ✅ |
| `revokeDeviceUseCase` | `Result<void, NotFoundError>` | ✅ |

### 5.3 Policy 인터페이스 호환성

```typescript
interface IdentityPolicy {
  password: { minLength, requireUppercase, ... };  // 불변
  session: { durationHours, ... };                   // 불변
  security: { maxLoginFailures, ... };               // 불변
  verification: { tokenTtlMinutes, ... };            // 불변
  mfa: { required, backupCodeCount };                // 불변
}
```

> Policy 구조 변경 시 하위 호환성 깨짐 위험.
> 현재 모든 필드가 명시적으로 정의되어 있으며, optional 확장은 안전.

## 6. 종합 평가

| 검증 항목 | Result |
|-----------|--------|
| Session Token 호환성 | ✅ PASS |
| Refresh Token 호환성 | ✅ PASS |
| Event Schema 하위 호환성 | ✅ PASS |
| Public API 호환성 | ✅ PASS |

**전체 결과: 4/4 PASS**

### 호환성 보장 원칙

1. **Result<T,E> 불변**: 모든 UseCase가 동일한 반환 패턴 유지
2. **Interface 확장만**: 기존 인터페이스에서 필드 제거/이름 변경 없음
3. **Event SchemaRef 버전 관리**: 각 이벤트가 명시적 schemaRef 보유
4. **SemVer 준수**: Breaking Change 필요 시 Major 버전 + ADR 필수
