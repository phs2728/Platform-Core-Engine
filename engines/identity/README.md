# Identity Engine v1.0

> **AI Bridge Georgia Platform Core — Identity Engine**
>
> 인증 · 세션 · 보안 · 감사 · OAuth
>
> **Industry-Agnostic Reusable Engine**

**Version**: v1.0 (Sprint 2C-2 Complete)
**Status**: 🟢 **RC1** (Stable 선언 사장님 확정 대기)
**Date**: 2026-07-11

---

## 목적

Identity Engine은 **사용자 신원을 확인**하고, **세션을 관리**하며, **모든 인증 이벤트를 감사 로그에 기록**하는 산업-비종속 엔진입니다.

```
사장님 확립 Sprint 2C-2 — 100% 완료:

✅ Account 생성
✅ Email 로그인
✅ Password Hash
✅ Session 생성
✅ Logout
✅ Email Verification (RFC-026)
✅ Password Reset (RFC-027)
✅ Account Lock (RFC-028)
✅ Session Refresh (RFC-029)
✅ Audit Log (RFC-030)
✅ OAuth (RFC-031, Plugin Pattern)
```

---

## 책임

- **Account**: 사용자 계정 (email 기반)
- **Authentication**: 자격증명 검증
- **Session**: Token 발급 + 검증 + Rotation
- **Authorization**: (RBAC Engine이 Phase 4에서 담당)
- **Audit**: 모든 보안 이벤트 기록
- **OAuth**: Plugin Pattern으로 확장 가능

---

## 사용하지 않는 것 (Phase 후속)

- ❌ Profile 정보 (Profile Engine 별도)
- ❌ 주소/여권 (Phase 5 Booking Engine)
- ❌ 결제 수단 (Phase 5 Payment Engine)

---

## 의존성

```yaml
depends_on:
  - core-sdk       # v1.0 Stable
  - policy         # Configuration SSoT
  - universal-core # EventBus, EntityStore
```

**Identity는 다른 Engine을 직접 import하지 않습니다** (헌법 §C-10).

---

## 빠른 시작

### 1. In-Memory로 시작 (테스트 / 개발)

```typescript
import {
  createAccountUseCase,
  loginWithEmailUseCase,
  logoutUseCase,
  InMemoryAccountRepository,
  InMemorySessionRepository,
  InMemoryEmailSender,
  InMemoryAuditLogRepository,
  createLogger,
} from '@platform/engine-identity';

const accounts = new InMemoryAccountRepository();
const sessions = new InMemorySessionRepository();
const audit = new InMemoryAuditLogRepository();
const email = new InMemoryEmailSender();
const logger = createLogger({ engine: 'identity' });

// Account 생성
const createResult = await createAccountUseCase(
  { email: 'user@example.com', password: 'SecurePass123!', tenantId: 't-1', correlationId: 'r-1' },
  {
    accountRepository: accounts,
    passwordHasher: bcryptHasher,
    idGenerator: uuidV7Generator,
    clock: systemClock,
    eventBus: inProcessBus,
    auditLogRepository: audit,
  },
);

// Login
const loginResult = await loginWithEmailUseCase(
  { email: 'user@example.com', password: 'SecurePass123!', tenantId: 't-1', correlationId: 'r-2' },
  {
    accountRepository: accounts,
    passwordHasher: bcryptHasher,
    sessionSigner: jwtSigner,
    sessionRepository: sessions,
    idGenerator: uuidV7Generator,
    clock: systemClock,
    eventBus: inProcessBus,
    auditLogRepository: audit,
    policy: {
      maxFailures: 3,
      lockDurationMinutes: 30,
      sessionDurationHours: 24,
    },
  },
);
```

### 2. Production — 실제 DB 연결

```typescript
import {
  createAccountUseCase,
  PostgresAccountRepository,  // Phase 후속에서 구현
  PostgresSessionRepository,
  SMTPEmailSender,
  AuditLogRepository,
} from '@platform/engine-identity';

const accounts = new PostgresAccountRepository({ pool: pgPool });
const sessions = new PostgresSessionRepository({ pool: pgPool });
const email = new SMTPEmailSender({ smtp: smtpConfig });
const audit = new PostgresAuditLogRepository({ pool: pgPool });
```

---

## 5단계 Use Case 패턴 (모든 Engine 공통)

```typescript
// 1. Schema 검증 (zod)
const validation = validate(schema, input);
if (!validation.ok) return validation;

// 2. Repository 조회
const result = await repository.find(input);
if (!result.ok) return result;

// 3. 비즈니스 로직
// 4. Repository 쓰기
// 5. Event 발행 (EventEnvelope)
await eventBus.emit(envelope);

// 6. Audit 기록
await auditLogRepository.insert({...});

// 7. Result 반환
return Ok({...});
```

---

## Plugin Pattern — OAuth

```typescript
import { oauthLoginUseCase, GoogleOAuthProvider, IOAuthProvider } from '@platform/engine-identity';

// Host가 제공한 Provider들
const providers: Record<string, IOAuthProvider> = {
  google: new GoogleOAuthProvider(clientId, clientSecret),
  // apple: new AppleOAuthProvider(...),
  // facebook: new FacebookOAuthProvider(...),
};

await oauthLoginUseCase(
  {
    providerName: 'google',
    authCode,
    redirectUri,
    tenantId: 't-1',
    correlationId: 'r-1',
  },
  {
    providers,
    accountRepository: accounts,
    passwordHasher: bcryptHasher,
    sessionSigner: jwtSigner,
    sessionRepository: sessions,
    idGenerator: uuidV7Generator,
    clock: systemClock,
    eventBus: inProcessBus,
    auditLogRepository: audit,
    policy: { sessionDurationHours: 24 },
  },
);
```

**새 OAuth Provider 추가 시**: `IOAuthProvider` 구현만 작성 → 기존 코드 무수정 (헌법 §C-9).

---

## Audit Trail

모든 UseCase는 다음 EventType 중 하나 이상을 Audit에 기록:

```typescript
type AuditEventType =
  | 'login_success'
  | 'login_failed'
  | 'password_changed'
  | 'password_reset'
  | 'email_changed'
  | 'session_revoked'
  | 'account_locked'
  | 'account_unlocked'
  | 'email_verified'
  | 'session_refreshed'
  | 'oauth_login'
  | 'oauth_unlinked';
```

---

## Event (EventEnvelope 사용)

### auth.login.success

```json
{
  "eventId": "01HXXXX...",
  "aggregateId": "user-uuid",
  "occurredAt": "2026-07-11T08:00:00.000Z",
  "version": "1.0.0",
  "tenantId": "tenant-uuid",
  "correlationId": "req-uuid",
  "causationId": "",
  "engine": "identity",
  "eventType": "auth.login.success",
  "schemaRef": "auth.login.success.v1",
  "payload": { "accountId": "user-uuid", "sessionId": "sess-uuid", "loginAt": "..." }
}
```

12+ event types (eventType과 schemaRef 매핑).

---

## 보안 원칙

### Token Storage

```typescript
// ✅ Token → SHA256 Hash → DB
import { hashToken } from '@platform/engine-identity';
const tokenHash = hashToken(rawToken);  // SHA256
await verificationTokenRepository.insert({ rawToken, ... });  // hash 자동 저장

// ❌ raw Token을 DB에 저장 (절대 금지)
await db.query('INSERT INTO tokens (token) VALUES ($1)', [rawToken]);
```

### Account Lock

```yaml
maxFailures: 3
lockDurationMinutes: 30
```

### Session Rotation

```typescript
// 60분 이상 남은 경우 자동 Rotation
const result = await refreshSessionUseCase(input, deps);
result.newSessionToken;  // 새 Token
```

---

## API Endpoints (Host가 노출)

| Method | Path | UseCase |
|---|---|---|
| POST | `/auth/register` | createAccountUseCase |
| POST | `/auth/login` | loginWithEmailUseCase |
| POST | `/auth/logout` | logoutUseCase |
| POST | `/auth/verify-email/request` | requestEmailVerificationUseCase |
| POST | `/auth/verify-email/confirm` | confirmEmailVerificationUseCase |
| POST | `/auth/password/reset/request` | requestPasswordResetUseCase |
| POST | `/auth/password/reset/confirm` | confirmPasswordResetUseCase |
| POST | `/auth/session/refresh` | refreshSessionUseCase |
| POST | `/auth/oauth/:provider/callback` | oauthLoginUseCase |

(실제 Route Handler는 Host 책임)

---

## Tests

```bash
pnpm test
```

**현재**: 5 tests PASS (Sprint 2C-2)

| Test | 대상 |
|---|---|
| Sprint 2C-2-1 Email Verification | requestEmailVerification, confirmEmailVerification |
| Sprint 2C-2-3 Account Lock | failedAttempts + lockedUntil + Account Lock error |
| Sprint 2C-2-4 Session Refresh | refreshSessionUseCase |
| Sprint 2C-2-5 Audit Log | recordAudit helper |

---

## Integration with Core SDK

Identity Engine은 **Core SDK의 모든 것을 사용**:

```typescript
import { Result, Ok, Err, ... } from '@platform/core-sdk';
import { PlatformError, ValidationError, ... } from '@platform/core-sdk';
import { ILogger, createLogger, ... } from '@platform/core-sdk';
import { EventEnvelope, createEnvelope } from '@platform/core-sdk';
import { Email, Password, validate } from '@platform/core-sdk';
```

**Sprint 2B-2 Acceptance 결과**: Identity는 Core SDK 수정 없이 재사용 ✅

---

## 다음 단계

사장님 Platform Owner 확립 (2026-07-11):

1. **Identity Engine v1.0 Stable 선언** (사장님 결정 시)
2. **main Merge** (feature/identity-hardening + feature/identity-email-mvp → main)
3. **Next Engine: Notification Engine** (Phase 2, Identity 의존)

---

## 사장님 확립 의존성

```
Phase 1:
  Policy → Core SDK → Identity ← ✅ 완료

Phase 2 (다음):
  Notification ← Identity (login.success event 구독)
  Event Bus (Universal Core)
```

---

**End of Identity Engine README**

> 사장님 Platform Owner: "속도보다 품질. 작은 범위를 끝까지."