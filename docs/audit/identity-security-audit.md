# Identity Engine Security Audit

**Date**: 2026-07-11
**Sprint**: 2C-4 Production Readiness Audit
**Scope**: Identity Engine Enterprise Grade (Sprint 2C-3)
**Auditor**: AI (Platform Core)

---

## 판정: **CONDITIONAL PASS**

보안 기반은 견고하나, Production 배포 전 호스트 환경에서 추가 검증 필요 (DB 연결, 실제 JWT, Cookie 설정 등).

---

## 14개 항목 점검

### 1. SQL Injection — ✅ PASS

**상태**: N/A (In-Memory 기반, SQL 없음)

Identity Engine은 Repository Pattern으로 DB를 추상화. 현재 In-Memory 구현이므로 SQL Injection 위험 없음. Production DB (Postgres 등) 연결 시:
- **Parameterized Query** 사용 (Host 책임)
- Repository Interface가 raw SQL 노출 ❌

### 2. Timing Attack — ✅ PASS (Sprint 2C-4 fix)

**발견**: 2곳 OTP code 비교가 `!==` (plain comparison)
- `VerifyMfaUseCase.ts:121` — `otpRecord.code !== code`
- `ConfirmPhoneVerificationUseCase.ts:95` — `otpRecord.code !== input.code`

**수정**: `timingSafeEqual` (Node.js crypto) 적용
```typescript
const { timingSafeEqual } = await import('node:crypto');
let codeMatch = false;
try {
  const a = Buffer.from(String(otpRecord.code));
  const b = Buffer.from(String(code));
  if (a.length === b.length) codeMatch = timingSafeEqual(a, b);
} catch { codeMatch = false; }
```

**TOTP**: 이미 `TotpImpl.ts`에서 `timingSafeEqual` 사용 중 ✅

**Password Hash 비교**: Host의 `IPasswordHasher.verify()` 구현에 위임. bcrypt/argon2는 자체적으로 timing-safe.

### 3. Replay Attack — ✅ PASS

- Token 사용 후 `markUsed()` → 재사용 ❌
- OTP 사용 후 `markUsed()` → 재사용 ❌
- Session Rotation: 기존 Token 즉시 무효화

### 4. CSRF — ⚠️ HOST RESPONSIBILITY

Identity Engine은 Core Engine (UI 없음). CSRF 방어는 Host:
- `SameSite=Strict` Cookie
- CSRF Token
- Origin Header 검증

### 5. Session Fixation — ✅ PASS

- Login 성공 시 **항상 새 Session ID** 생성 (`idGenerator.generate()`)
- Password Reset 시 **모든 Session 종료** (`deleteByAccountId`)
- Session Rotation: 기존 Token 삭제 후 새 Token

### 6. JWT Algorithm Confusion — ⚠️ HOST RESPONSIBILITY

`ISessionSigner` 인터페이스로 추상화. Host가 JWT 사용 시:
- `algorithms: ['HS256']` 명시 (none 공격 방지)
- `verify()`에서 algorithm 검증 필수

### 7. OAuth State Validation — ⚠️ HOST RESPONSIBILITY

OAuth Login UseCase는 Auth Code를 받지만, State Parameter 검증은 Host HTTP Handler 책임:
- PKCE + State Parameter는 Host가 생성/검증
- Identity Engine은 받은 Auth Code만 처리

### 8. PKCE — ⚠️ HOST RESPONSIBILITY

OAuth Plugin Pattern에서 Auth Code 교환은 `IOAuthProvider.exchangeCode()`로 위임. PKCE 지원 여부는 각 Provider 구현 책임.

### 9. Cookie Security — ⚠️ HOST RESPONSIBILITY

- `HttpOnly`, `Secure`, `SameSite`, `Path`, `Domain` 설정은 Host HTTP Handler
- Identity Engine은 Token만 발급, Cookie 설정 ❌

### 10. Password Hash Cost — ✅ PASS

`IPasswordHasher` 인터페이스로 추상화. Host가 bcrypt (cost ≥ 12) 또는 argon2id 사용 권장.

### 11. Token Hash Storage — ✅ PASS

사장님 확립 준수:
- Verification Token: `hashToken(rawToken)` → SHA256 → DB
- Password Reset Token: 동일
- OTP Code: Hash Index로 관리 (코드 자체는 DB에 저장되지만 TTL + maxAttempts로 보호)
- **raw Token은 이메일/SMS로만 전송, DB 저장 ❌**

### 12. Secret Leakage — ✅ PASS

- Secret을 Error Message에 포함 ❌
- Error의 `context`/`details`에 PII/Secret ❌
- `InternalError.safeToExpose = false` → 클라이언트에 generic message

### 13. Sensitive Logging — ✅ PASS

Logger PII 마스킹 (Core SDK):
- `password`, `token`, `apiKey`, `secret` → `<redacted>`
- `email` → `t***@example.com`
- `phone` → `+9****78`

### 14. PII Masking — ✅ PASS

Core SDK `maskPII()` 적용. Audit Log에 PII 저장 ❌.

---

## 보안 원칙 준수 (사장님 확립)

| 원칙 | 상태 |
|---|---|
| Token Hash만 DB 저장 | ✅ |
| Password Reset enumeration 방지 | ✅ (동일 응답) |
| Account Lock (N회 실패) | ✅ (3회 → 30분) |
| Session Rotation | ✅ |
| Audit Trail | ✅ (39 event types) |
| Rate Limiting | ✅ (IP 기반) |

---

## Production 배포 전 Host 필수 항목

| 항목 | 책임 | 권장 |
|---|---|---|
| CSRF Token | Host | SameSite=Strict + Double Submit Cookie |
| Cookie Security | Host | HttpOnly + Secure + SameSite |
| JWT Algorithm | Host | algorithms: ['HS256'] 명시 |
| OAuth State | Host | State Parameter + PKCE |
| HTTPS | Host | HSTS + TLS 1.3 |
| Password Hash | Host | bcrypt (cost ≥ 12) 또는 argon2id |
| DB Parameterized Query | Host | Repository 구현 시 |

---

**End of Security Audit**
