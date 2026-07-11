# Identity Engine — Event Definitions

**Version**: v1.0
**Status**: Frozen (사장님 확립, 2026-07-11)
**Companion to**: [03-domain-model.md](./03-domain-model.md)
**Schema Versioning**: SemVer (major.minor.patch)

---

## 0. 문서 위치

이 문서는 **Identity Engine이 발행하는 모든 도메인 이벤트**의 카탈로그입니다.

- **버스**: Universal Core의 `EventBus`
- **수신자**: Audit Engine (자동), Notification Engine (자동), 기타 엔진/앱 (구독)
- **버전 정책**: `version: "1.0.0"` 형식. 페이로드 변경 시 ADR 필요
- **Industry Agnostic**: 이벤트 이름/페이로드에 산업 키워드 등장 금지

---

## 1. Event Envelope (Universal Core와 일치)

```typescript
interface IdentityDomainEvent {
  id: string;                              // UUID v7
  tenantId: string;                        // UUID
  eventType: IdentityEventType;            // 'auth.login.success'
  entity?: 'user' | 'identity' | 'credential' | 'session' | 'policy' | 'audit';
  entityId?: string;
  payload: Record<string, unknown>;
  timestamp: string;                       // ISO 8601
  version: string;                         // '1.0.0'
}
```

---

## 2. Event Type Catalog

### 2.1 Authentication Events

#### `auth.login.success` (v1.0.0)

**트리거**: 사용자가 성공적으로 로그인했을 때 (모든 인증 방식 공통)

**Entity**: `session`

**Payload**:
```json
{
  "userId": "018f0e5c-...",
  "sessionId": "018f0e5c-...",
  "identifierType": "email",
  "authMethod": "password",                // 'password' | 'oauth_google' | 'oauth_kakao' | 'totp' | ...
  "mfaUsed": false,                        // 2FA 사용 여부
  "ipAddress": "203.0.113.42",
  "userAgent": "Mozilla/5.0...",
  "country": "KR",
  "isSuspicious": false,
  "rememberMe": false
}
```

**구독 권장**: Audit, Notification (새 디바이스 로그인 알림)

---

#### `auth.login.failure` (v1.0.0)

**트리거**: 로그인 실패 시 (비밀번호 틀림, 계정 잠김, Rate Limit 등 모든 실패)

**Entity**: `user` (또는 null — 식별자 없을 때)

**Payload**:
```json
{
  "identifierType": "email",
  "identifierHash": "sha256(...)",         // PII 보호
  "reason": "invalid_credentials",        // 'invalid_credentials' | 'account_locked' | 'rate_limited' | 'captcha_failed' | 'verification_required'
  "authMethod": "password",
  "ipAddress": "203.0.113.42",
  "userAgent": "Mozilla/5.0...",
  "attemptsRemaining": 3
}
```

**구독 권장**: Audit, Notification (반복 실패 알림 — 관리자)

---

#### `auth.login.partial` (v1.0.0)

**트리거**: 부분 인증 성공 (2FA challenge 필요, Email verification 필요)

**Entity**: `user`

**Payload**:
```json
{
  "userId": "018f0e5c-...",
  "sessionId": "018f0e5c-...",
  "nextStep": "totp_challenge",           // 'totp_challenge' | 'email_verification' | 'sms_verification' | 'admin_approval'
  "challengeToken": "...",
  "expiresAt": "2026-07-11T08:15:00Z"
}
```

---

#### `auth.logout` (v1.0.0)

**트리거**: 사용자가 명시적으로 로그아웃했을 때

**Entity**: `session`

**Payload**:
```json
{
  "userId": "018f0e5c-...",
  "sessionId": "018f0e5c-...",
  "reason": "user_initiated",
  "ipAddress": "203.0.113.42"
}
```

---

#### `auth.logout.all` (v1.0.0)

**트리거**: 사용자가 모든 세션 종료 시

**Payload**:
```json
{
  "userId": "018f0e5c-...",
  "sessionCount": 3,
  "reason": "user_initiated"              // 'user_initiated' | 'password_changed' | 'admin_force'
}
```

---

#### `auth.session.expired` (v1.0.0)

**트리거**: 세션 만료 (백그라운드 정리 작업)

**Payload**:
```json
{
  "userId": "018f0e5c-...",
  "sessionId": "018f0e5c-...",
  "expiredAt": "2026-07-11T08:00:00Z",
  "reason": "ttl_elapsed"                 // 'ttl_elapsed' | 'idle_timeout'
}
```

---

### 2.2 Registration Events

#### `auth.register.success` (v1.0.0)

**트리거**: 신규 가입 성공

**Entity**: `user`

**Payload**:
```json
{
  "userId": "018f0e5c-...",
  "identifierType": "email",
  "identifierHash": "sha256(...)",
  "verificationRequired": ["email"],      // 어떤 identity의 verification이 필요한가
  "ipAddress": "203.0.113.42"
}
```

---

#### `auth.register.failure` (v1.0.0)

**Payload**:
```json
{
  "reason": "identifier_taken",          // 'identifier_taken' | 'password_policy_violation' | 'rate_limited'
  "identifierType": "email",
  "identifierHash": "sha256(...)",
  "ipAddress": "203.0.113.42"
}
```

---

### 2.3 Password Events

#### `auth.password.reset.requested` (v1.0.0)

**Payload**:
```json
{
  "userId": "018f0e5c-...",                // null 가능 (계정 열거 방지 위해 응답은 항상 동일)
  "identifierType": "email",
  "identifierHash": "sha256(...)",
  "channel": "email",                      // 'email' | 'sms'
  "ipAddress": "203.0.113.42",
  "deliveredToUser": true                  // false = 계정 없음 (no-op)
}
```

---

#### `auth.password.reset.completed` (v1.0.0)

**Payload**:
```json
{
  "userId": "018f0e5c-...",
  "channel": "email",
  "ipAddress": "203.0.113.42",
  "sessionsRevoked": 3
}
```

---

#### `auth.password.changed` (v1.0.0)

**Payload**:
```json
{
  "userId": "018f0e5c-...",
  "actor": "user",                         // 'user' | 'admin'
  "ipAddress": "203.0.113.42",
  "sessionsRevoked": 2
}
```

---

### 2.4 Verification Events

#### `auth.email.verified` (v1.0.0)

**Payload**:
```json
{
  "userId": "018f0e5c-...",
  "identityId": "018f0e5c-...",
  "ipAddress": "203.0.113.42"
}
```

---

#### `auth.phone.verified` (v1.0.0)

**Payload**:
```json
{
  "userId": "018f0e5c-...",
  "identityId": "018f0e5c-...",
  "ipAddress": "203.0.113.42"
}
```

---

### 2.5 Identity Management Events

#### `auth.identity.added` (v1.0.0)

**Payload**:
```json
{
  "userId": "018f0e5c-...",
  "identityId": "018f0e5c-...",
  "type": "phone",                         // 'email' | 'phone' | 'username' | 'oauth_subject'
  "verified": false,
  "actor": "user"                          // 'user' | 'admin'
}
```

---

#### `auth.identity.removed` (v1.0.0)

**Payload**:
```json
{
  "userId": "018f0e5c-...",
  "identityId": "018f0e5c-...",
  "type": "phone",
  "actor": "user"
}
```

---

### 2.6 OAuth Events

#### `auth.oauth.linked` (v1.0.0)

**Payload**:
```json
{
  "userId": "018f0e5c-...",
  "provider": "oauth_google",
  "oauthSubject": "google:108012345678901234567",
  "actor": "user"
}
```

---

#### `auth.oauth.unlinked` (v1.0.0)

**Payload**:
```json
{
  "userId": "018f0e5c-...",
  "provider": "oauth_google",
  "actor": "user"
}
```

---

### 2.7 Two-Factor Events

#### `auth.2fa.enabled` (v1.0.0)

**Payload**:
```json
{
  "userId": "018f0e5c-...",
  "method": "totp",                        // 'totp' | 'email_otp' | 'sms_otp'
  "actor": "user"
}
```

---

#### `auth.2fa.disabled` (v1.0.0)

**Payload**:
```json
{
  "userId": "018f0e5c-...",
  "method": "totp",
  "actor": "user"
}
```

---

### 2.8 Account Status Events

#### `auth.account.locked` (v1.0.0)

**Payload**:
```json
{
  "userId": "018f0e5c-...",
  "reason": "max_failures",               // 'max_failures' | 'admin_action' | 'suspicious_activity'
  "lockedUntil": "2026-07-11T08:30:00Z",  // null = 영구
  "actor": "system",                       // 'system' | 'admin'
  "sessionsRevoked": 2
}
```

---

#### `auth.account.unlocked` (v1.0.0)

**Payload**:
```json
{
  "userId": "018f0e5c-...",
  "actor": "user",                         // 'user' | 'admin' | 'system'
  "unlockMethod": "time_elapsed"          // 'time_elapsed' | 'admin' | 'reset_link'
}
```

---

#### `auth.account.disabled` (v1.0.0)

**Payload**:
```json
{
  "userId": "018f0e5c-...",
  "reason": "gdpr_erasure_request",
  "actor": "admin"
}
```

---

### 2.9 Security Events

#### `auth.suspicious_login.detected` (v1.0.0)

**Payload**:
```json
{
  "userId": "018f0e5c-...",
  "sessionId": "018f0e5c-...",
  "reasons": ["new_country", "new_device"],
  "previousCountry": "KR",
  "currentCountry": "RU",
  "ipAddress": "203.0.113.42",
  "riskScore": 0.85
}
```

**구독 권장**: Audit, Notification (사용자/관리자 알림)

---

#### `auth.rate_limit.exceeded` (v1.0.0)

**Payload**:
```json
{
  "route": "/auth/login",
  "scope": "ip",                           // 'ip' | 'identifier' | 'tenant'
  "scopeValue": "203.0.113.42",
  "limit": 5,
  "windowSeconds": 900
}
```

---

#### `auth.captcha.failed` (v1.0.0)

**Payload**:
```json
{
  "route": "/auth/login",
  "provider": "hcaptcha",
  "ipAddress": "203.0.113.42"
}
```

---

### 2.10 Admin Events

#### `auth.policy.changed` (v1.0.0)

**Payload**:
```json
{
  "actor": "admin",
  "adminId": "018f0e5c-...",
  "changes": [
    { "field": "passwordMinLength", "from": 8, "to": 12 },
    { "field": "loginMaxFailures", "from": 10, "to": 5 }
  ]
}
```

---

#### `auth.session.revoked.admin` (v1.0.0)

**Payload**:
```json
{
  "userId": "018f0e5c-...",
  "sessionId": "018f0e5c-...",
  "adminId": "018f0e5c-...",
  "reason": "security_incident"
}
```

---

## 3. Event Schema Versioning

### 3.1 정책

```
- 모든 이벤트 payload에 version 필드 포함 (SemVer)
- 하위 호환 변경 (필드 추가): minor bump
- 하위 비호환 변경 (필드 제거/타입 변경): major bump
- 버그 수정 (값 보정): patch bump
- 새 이벤트 추가: version 1.0.0으로 시작
```

### 3.2 구독자 호환성

```typescript
// 구독자 코드
eventBus.on('auth.login.success', async (event) => {
  if (semver.major(event.version) > 1) {
    // Major 변경 — 신중하게 처리
    await handleV2(event.payload);
  } else {
    await handleV1(event.payload);
  }
});
```

### 3.3 Deprecation 정책

```
- Deprecation 예정 이벤트는 6개월간 병행 발행
- payload.metadata.deprecated: true + 대체 이벤트명 명시
- v2.0에서 제거
```

---

## 4. 이벤트 ↔ Audit Log 매핑

Universal Core EventBus는 모든 이벤트를 자동으로 Audit Log에 기록합니다 (priority: -20, engine-event-bus.ts 참조).

| Event Type | Audit Log event_type | 비고 |
|---|---|---|
| `auth.login.success` | `auth.login.success` | 그대로 |
| `auth.login.failure` | `auth.login.failure` | 그대로 |
| `auth.password.changed` | `auth.password.changed` | 그대로 |
| `auth.account.locked` | `auth.account.locked` | 그대로 |

→ Audit은 **별도 처리 없이 자동**. Identity Engine은 Audit에 직접 쓰지 않습니다.

---

## 5. 이벤트 ↔ Notification 매핑

Universal Core EventBus는 모든 이벤트를 Notification Engine에 전달합니다 (priority: -10).

Notification Engine은 자신의 규칙 테이블을 보고 **발송 여부 결정**. Identity Engine이 명시적으로 호출하는 것은 없습니다.

**권장 Notification 규칙** (호스트가 설정):

| Event Type | Rule |
|---|---|
| `auth.login.success` | 새 디바이스/국가에서 로그인 시 Email 발송 |
| `auth.password.changed` | Email 발송 |
| `auth.email.verified` | (선택) Email 발송 |
| `auth.account.locked` | Email + SMS 발송 |
| `auth.suspicious_login.detected` | Email 발송 |

---

## 6. Industry Agnostic 검증

```
✓ 이벤트 이름 prefix: 'auth.*' (Industry-Agnostic)
✓ payload에 'tour', 'booking', 'hotel', 'restaurant', 'order', 'product', 'payment' 단어 없음
✓ 모든 이벤트가 사용자 신원/인증 책임 범위 내
```

---

## 7. [TBD: 사장님 확립 필요]

| 항목 | 기본 제안 |
|---|---|
| 이벤트 버전 정책 (SemVer vs CalVer) | SemVer |
| Deprecation notice 기간 | 6개월 |
| Old version payload 보관 기간 | 무기한 (Audit Log) |
| Event ordering 보장 | 단일 tenant 내 시간순 (multi-region은 eventual consistency) |

---

**End of Event Definitions v1.0**