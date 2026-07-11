# Identity Engine — Domain Model

**Version**: v1.0
**Status**: Frozen (사장님 확립, 2026-07-11)
**Companion to**: [01-prd.md](./01-prd.md), [02-trd.md](./02-trd.md)

---

## 0. 문서 위치

Domain Model은 **엔진이 다루는 모든 개념**의 정의를 담습니다.

- **Entity**: 정체성이 있는 객체 (User, Session, AuditLog)
- **Value Object**: 값 자체가 의미 (Email, PasswordHash, OAuthTokens)
- **Aggregate**: 일관성 경계 (User Aggregate = User + UserIdentities)
- **Domain Event**: 상태 변화의 사실 통지 (UserRegistered, LoginSucceeded)
- **Invariant**: 절대 깨지면 안 되는 규칙

이 문서는 **Domain-Driven Design**의 표기법을 따릅니다.

---

## 1. 도메인 경계 (Bounded Context)

### 1.1 Identity Engine의 책임 영역

```
┌─────────────────────────────────────────────────────────┐
│  IDENTITY ENGINE BOUNDED CONTEXT                         │
│                                                          │
│  책임: "누가 누구인지 확인하고 그 신원을 보호한다"           │
│                                                          │
│  포함:                                                    │
│   - 인증 자격 (User + Credential + Identity)              │
│   - 인증 흐름 (Login, Register, Verify, Reset)            │
│   - 세션 (Session)                                       │
│   - 정책 (SecurityPolicy per Tenant)                     │
│   - 감사 (AuditLog)                                       │
│   - 자격증명 (OAuth, SMTP, SMS Provider 설정)             │
│                                                          │
│  제외 (절대):                                             │
│   - 프로필 (이름, 닉네임, 아바타, 자기소개)                │
│   - 주소                                                  │
│   - 결제 수단                                              │
│   - 여권/신분증                                            │
│   - 업종별 데이터 (여행 이력, 예약 이력, 주문 이력)         │
│   - 마케팅 동의                                            │
│   - 알림 환경설정 (언어, 시간대)                           │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Universal Core와의 관계

사장님 확립: **80% Universal / 20% Domain**.

| 영역 | 책임 | 위치 |
|---|---|---|
| Tenant (회사/조직) | 모든 엔진 공유 | Universal Core |
| Event Bus | 모든 엔진 공유 | Universal Core |
| Entity Store 추상화 | 모든 엔진 공유 | Universal Core |
| Plugin Registry | 모든 엔진 공유 | Universal Core |
| **User** (인덱스) | 인증된 신원 인덱스 | **Identity Engine** |
| **Session, Credential, Policy, Audit, ...** | 인증 책임 | **Identity Engine** |
| Profile (이름, 아바타) | 자기 표현 | **별도 엔진 (Product 앱)** |

> **중요**: Identity Engine의 `User`는 Universal Core의 `User` 타입과 **같은 정체성**을 갖지만, **Identity Engine은 인증에 필요한 필드만** 저장한다. 프로필 필드는 다른 엔진/앱이 자기 스키마로 관리한다.

---

## 2. 엔티티 카탈로그 (9개)

PRD §Database가 명시한 9개 도메인:

```
1.  Users                    — 인증된 신원의 인덱스
2.  UserIdentities           — User가 가진 신원 (이메일, 전화, 사용자명, OAuth subject)
3.  AuthProviders            — 사용 가능한 인증 제공자 (Google, Apple, ...)
4.  Credentials              — 각 User의 자격증명 (비밀번호 해시, OAuth tokens)
5.  Sessions                 — 활성 세션
6.  VerificationTokens       — 이메일/SMS 인증 코드
7.  PasswordResets           — 비밀번호 재설정 토큰
8.  SecurityPolicies         — Tenant별 보안 정책
9.  AuditLogs                — 모든 인증 이벤트 기록
```

추가로 (PRD에 명시되지 않았지만 **반드시 필요한** 도메인):

```
10. TenantCredentials        — Tenant가 가진 외부 서비스 자격증명 (Google Client Secret 등)
```

> 위 10개는 모두 **Industry-Agnostic**입니다. "Hotel", "Tour", "Restaurant" 같은 단어가 등장하지 않습니다.

---

## 3. Aggregate: User

### 3.1 정의

```typescript
class User {
  readonly id: UserId;                      // UUID v7
  readonly tenantId: TenantId;              // 어느 회사에 속하는가
  readonly status: UserStatus;              // 'active' | 'locked' | 'disabled' | 'pending_verification'
  readonly identities: UserIdentity[];      // 이 User가 가진 신원들 (1:N)
  readonly credentials: Credential[];       // 이 User가 가진 자격증명들 (1:N)
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastLoginAt: Date | null;
  readonly lockedUntil: Date | null;        // Account Lock 시점
  readonly version: number;                 // 낙관적 잠금
}
```

### 3.2 Invariants (절대 깨지면 안 되는 규칙)

```
I-1: 모든 User는 정확히 하나의 Tenant에 속한다. (tenantId NOT NULL)
I-2: User는 최소 1개 이상의 UserIdentity를 가진다. (등록 즉시 만들어짐)
I-3: User의 status가 'locked'이면 어떤 인증도 성공할 수 없다.
I-4: User의 status가 'pending_verification'이고 Tenant 정책이 verification을 요구하면, 인증이 부분적으로만 허용된다.
I-5: User가 'disabled'이면 어떤 인증도 시도할 수 없다 (401 반환).
```

### 3.3 Value Objects

```typescript
type UserId = UUIDv7;                     // 시간 정렬 가능, 분산 친화
type TenantId = UUIDv7;

enum UserStatus {
  PendingVerification = 'pending_verification',
  Active = 'active',
  Locked = 'locked',
  Disabled = 'disabled',
}
```

---

## 4. Aggregate: UserIdentity

### 4.1 정의

User가 **어떤 신원**으로 인증할 수 있는지를 나타냅니다.

```typescript
class UserIdentity {
  readonly id: UserIdentityId;
  readonly userId: UserId;
  readonly type: IdentityType;             // 'email' | 'phone' | 'username' | 'oauth_subject'
  readonly identifier: string;             // 결정적 암호화된 값
  readonly identifierHash: string;         // SHA-256 (검색용)
  readonly verified: boolean;              // 본인 확인 완료 여부
  readonly verifiedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
```

### 4.2 Identifier 처리

| Type | 예시 | 저장 방식 | 검색 방식 |
|---|---|---|---|
| email | `tim@aibg.ge` | 결정적 암호화 (AES-SIV) | HMAC-SHA256 해시로 검색 |
| phone | `+995555123456` | 결정적 암호화 | HMAC-SHA256 해시로 검색 |
| username | `tim_park` | 결정적 암호화 | HMAC-SHA256 해시로 검색 |
| oauth_subject | `google:108012345678901234567` | 평문 (외부 ID는 PII 아님) | 평문 검색 |

> **왜 두 컬럼?**
> - `identifier` (암호화): 평문이 필요한 경우 (이메일 발송 등) 복호화해서 사용
> - `identifierHash`: 검색은 HMAC-SHA256 해시로 (deterministic, 키 분리)
>
> 이렇게 하면 DB가 유출돼도 평문은 복호화 키 없이는 복구 불가 + 검색은 정상 동작

### 4.3 Invariants

```
I-6: (tenantId, type, identifierHash)는 unique. 같은 Tenant 안에서 같은 신원은 1개의 User에게만 속한다.
I-7: UserIdentity는 삭제 가능하지만, 마지막 남은 identity는 삭제 불가 (User 삭제와 함께).
I-8: email/phone type은 verified=true여야 로그인 가능 (Tenant 정책에 따라 다름).
```

### 4.4 Value Objects

```typescript
type UserIdentityId = UUIDv7;

enum IdentityType {
  Email = 'email',
  Phone = 'phone',
  Username = 'username',
  OAuthSubject = 'oauth_subject',
}
```

---

## 5. Aggregate: AuthProvider (Tenant Configuration)

### 5.1 정의

**Tenant 단위**로 사용 가능한 인증 제공자 설정.

```typescript
class AuthProvider {
  readonly id: AuthProviderId;
  readonly tenantId: TenantId;
  readonly type: AuthProviderType;          // 'email' | 'phone' | 'oauth_google' | 'oauth_apple' | ...
  readonly enabled: boolean;
  readonly config: AuthProviderConfig;      // type별 세부 설정
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface AuthProviderConfig {
  // Email
  passwordPolicy?: PasswordPolicy;
  requireVerification?: boolean;

  // Phone
  smsProvider?: string;                    // 'twilio' | 'aligo' | ...
  requireVerification?: boolean;

  // OAuth
  scopes?: string[];
  clientIdRef?: CredentialRef;             // TenantCredentials 참조 (FK)
  clientSecretRef?: CredentialRef;
  redirectUri?: string;

  // TOTP
  issuerName?: string;
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
  digits?: 6 | 8;
  period?: 30 | 60;
}
```

### 5.2 Invariants

```
I-9:  Tenant는 한 type에 대해 enabled인 provider를 최대 1개 가질 수 있다. (중복 비활성화)
I-10: OAuth provider는 enabled=true일 때 clientIdRef와 clientSecretRef가 존재해야 한다.
I-11: 'email'/'phone' provider의 enabled를 false로 바꿀 수 없다 (최소 1개는 항상 활성화 — 단, 다른 인증 수단이 있으면 OK, [D-TENANT-003](./15-identity-decisions.md#d-tenant-003)).
```

### 5.3 확장 (Plugin 추가 시)

새 OAuth Provider 추가는 `provider/<name>/index.ts` 파일 1개 + `AuthProviderType` enum 확장.

```typescript
enum AuthProviderType {
  Email = 'email',
  Phone = 'phone',
  Username = 'username',
  OAuthGoogle = 'oauth_google',
  OAuthApple = 'oauth_apple',
  OAuthFacebook = 'oauth_facebook',
  OAuthKakao = 'oauth_kakao',
  OAuthNaver = 'oauth_naver',
  OAuthLine = 'oauth_line',
  OAuthMicrosoft = 'oauth_microsoft',
  Totp = 'totp',
  // 확장 가능 — 플러그인이 추가
  CustomSaml = 'custom_saml',               // [D-OAUTH-005](./15-identity-decisions.md#d-oauth-005) 참조
}
```

---

## 6. Aggregate: Credential

### 6.1 정의

User가 가진 **실제 인증 수단** (비밀번호 해시 또는 OAuth 토큰).

```typescript
class Credential {
  readonly id: CredentialId;
  readonly userId: UserId;
  readonly type: CredentialType;
  readonly secretHash: string | null;       // 비밀번호: Argon2id, OAuth: null
  readonly oauthTokens: OAuthTokens | null;
  readonly oauthSubject: string | null;     // 'google:108012345678901234567'
  readonly oauthProvider: AuthProviderType | null;
  readonly lastUsedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly expiresAt: Date | null;          // Password expiration
}

interface OAuthTokens {
  readonly accessToken: string;             // 암호화 저장
  readonly refreshToken: string | null;     // 암호화 저장
  readonly idToken: string | null;          // 암호화 저장
  readonly scope: string | null;
  readonly tokenType: 'Bearer';
  readonly expiresAt: Date;
}

enum CredentialType {
  Password = 'password',
  OAuth = 'oauth',
  Totp = 'totp',
}
```

### 6.2 비밀번호 처리

```
저장:  Argon2id(password, salt=16bytes, memory=64MiB, iterations=3, parallelism=1)
검증:  Argon2id.verify(stored, candidate)
순환:  Tenant 정책에 따라 passwordExpiresAt 설정
히스토리: password_history 테이블에 최근 N개 해시 보관
```

### 6.3 Invariants

```
I-12: 한 User는 같은 CredentialType을 최대 1개 가진다. (비밀번호 1개, OAuth는 여러 개 가능)
     → 실제로는 OAuth Subject가 unique하므로 "1 User - N OAuth Credentials (각 provider당 1개)"이 자연스러움
I-13: Password Credential의 secretHash는 Argon2id 포맷 ($argon2id$...)이다.
I-14: OAuth Credential은 oauthTokens의 모든 토큰이 암호화되어 저장된다.
I-15: PasswordHistory는 최근 N개의 해시만 보관 (Tenant 정책).
```

---

## 7. Aggregate: Session

### 7.1 정의

```typescript
class Session {
  readonly id: SessionId;
  readonly userId: UserId;
  readonly tenantId: TenantId;
  readonly token: string;                   // opaque random 256bit (DB에는 해시만 저장)
  readonly tokenHash: string;               // SHA-256(token), 검색용
  readonly deviceFingerprint: string | null;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly country: string | null;          // GeoIP 추정
  readonly isSuspicious: boolean;
  readonly rememberMe: boolean;
  readonly createdAt: Date;
  readonly lastActiveAt: Date;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
  readonly revokedReason: RevokedReason | null;
}

enum RevokedReason {
  UserLogout = 'user_logout',
  AdminForceLogout = 'admin_force_logout',
  PasswordChanged = 'password_changed',     // 보안을 위해 다른 세션 모두 종료
  SuspiciousActivity = 'suspicious_activity',
  Expired = 'expired',
  UserDisabled = 'user_disabled',
}
```

### 7.2 Invariants

```
I-16: Session의 tokenHash는 unique. 평문 token은 클라이언트에게만 한 번 전달된다.
I-17: Session의 expiresAt < now이면 invalid. Session Timeout / Remember Me 만료 자동 처리.
I-18: Session의 userId가 비활성 User에 속하면 무효 처리 (배치 작업으로 정리).
I-19: isSuspicious=true이면 인증은 허용되지만 추가 검증 (2FA 또는 알림 발송) 트리거.
```

---

## 8. Aggregate: VerificationToken

### 8.1 정의

이메일/SMS 인증 코드 (회원가입, 2FA 등).

```typescript
class VerificationToken {
  readonly id: VerificationTokenId;
  readonly tenantId: TenantId;
  readonly userId: UserId | null;           // 회원가입 시점에는 user 없을 수 있음
  readonly identityId: UserIdentityId | null;
  readonly type: VerificationType;
  readonly channel: 'email' | 'sms';
  readonly target: string;                  // 발송 대상 (이메일/전화 — 마스킹 권장)
  readonly codeHash: string;                // SHA-256(code + secretPepper)
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly expiresAt: Date;
  readonly consumedAt: Date | null;
  readonly createdAt: Date;
}

enum VerificationType {
  EmailVerification = 'email_verification',
  SmsVerification = 'sms_verification',
  TotpChallenge = 'totp_challenge',
  PasswordlessLogin = 'passwordless_login',
}
```

### 8.2 Invariants

```
I-20: VerificationToken은 1회용. consumedAt != null이면 재사용 불가.
I-21: attempts >= maxAttempts이면 자동 무효화.
I-22: expiresAt < now이면 무효.
I-23: (channel, target, type)에 대해 active (consumedAt IS NULL AND expiresAt > now) 토큰은 최대 1개.
      → 새 토큰 요청 시 이전 토큰 자동 무효화.
```

---

## 9. Aggregate: PasswordReset

### 9.1 정의

```typescript
class PasswordReset {
  readonly id: PasswordResetId;
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly identityId: UserIdentityId;
  readonly tokenHash: string;               // SHA-256(token)
  readonly channel: 'email' | 'sms';
  readonly target: string;
  readonly expiresAt: Date;                 // 기본 1시간
  readonly consumedAt: Date | null;
  readonly createdAt: Date;
  readonly ipAddress: string | null;
}
```

### 9.2 Invariants

```
I-24: PasswordReset은 1회용. consumed 후 invalid.
I-25: 만료 시 invalid.
I-26: User의 PasswordReset은 Rate Limit 정책 적용 (3 req / 1h).
I-27: PasswordReset 성공 시 모든 다른 활성 Session 종료 + 모든 OAuth Credential 유지 (사용자 선택).
```

---

## 10. Aggregate: SecurityPolicy (Tenant Configuration)

### 10.1 정의

Tenant 단위 보안 정책. **엔진이 따르는 규칙의 SSoT**.

```typescript
class SecurityPolicy {
  readonly tenantId: TenantId;

  // Password
  readonly passwordMinLength: number;               // default: 12
  readonly passwordRequireUppercase: boolean;       // default: true
  readonly passwordRequireLowercase: boolean;       // default: true
  readonly passwordRequireNumber: boolean;          // default: true
  readonly passwordRequireSpecial: boolean;         // default: true
  readonly passwordExpirationDays: number | null;   // null = 무기한
  readonly passwordHistoryCount: number;            // default: 5

  // Lock & Failure
  readonly loginMaxFailures: number;                // default: 5
  readonly lockDurationMinutes: number;             // default: 30
  readonly rateLimitPerIP: RateLimitRule;            // default: 5 / 15min
  readonly rateLimitPerIdentifier: RateLimitRule;   // default: 10 / 15min

  // Session
  readonly sessionTimeoutMinutes: number;           // default: 60
  readonly rememberMeDays: number;                  // default: 30
  readonly maxConcurrentSessions: number | null;    // null = 무제한

  // Verification
  readonly requireEmailVerification: boolean;       // default: false
  readonly requirePhoneVerification: boolean;       // default: false
  readonly verificationExpirationMinutes: number;   // default: 15
  readonly verificationMaxAttempts: number;         // default: 5

  // 2FA
  readonly twoFactorRequired: boolean;              // default: false
  readonly twoFactorMethods: ('email_otp' | 'sms_otp' | 'totp')[];

  // CAPTCHA
  readonly captchaEnabled: boolean;
  readonly captchaProvider: 'hcaptcha' | 'recaptcha' | 'turnstile' | null;
  readonly captchaTriggerAfterFailures: number;      // default: 3

  // Audit
  readonly auditRetentionDays: number | null;       // null = 무기한

  // Verification Flow
  readonly requireAdminApproval: boolean;           // default: false

  updatedAt: Date;
}

interface RateLimitRule {
  readonly maxRequests: number;
  readonly windowSeconds: number;
}
```

### 10.2 Invariants

```
I-28: SecurityPolicy는 Tenant당 정확히 1개. 1:1 관계.
I-29: passwordMinLength는 최소 8 이상이어야 한다 (보안 하한선).
I-30: sessionTimeoutMinutes는 최소 5, 최대 10080 (1주일).
I-31: 모든 시간/카운트 필드는 양수.
```

---

## 11. Aggregate: AuditLog (Append-Only)

### 11.1 정의

```typescript
class AuditLog {
  readonly id: AuditLogId;
  readonly tenantId: TenantId;
  readonly userId: UserId | null;           // 비인증 액션 (예: 익명 로그인 실패) 가능
  readonly sessionId: SessionId | null;
  readonly eventType: AuditEventType;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly result: 'success' | 'failure';
  readonly reason: string | null;           // 실패 시 사유 코드
  readonly context: Record<string, unknown>;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Date;
  readonly hash: string;                    // 이전 로그 + 이 로그의 SHA-256 (해시 체인)
  readonly prevHash: string;
}
```

### 11.2 이벤트 카탈로그 (사장님 확립)

| Event Type | 트리거 | result |
|---|---|---|
| `auth.login.success` | 로그인 성공 | success |
| `auth.login.failure` | 로그인 실패 | failure |
| `auth.logout` | 로그아웃 | success |
| `auth.logout.all` | 모든 세션 종료 | success |
| `auth.register.success` | 가입 성공 | success |
| `auth.register.failure` | 가입 실패 | failure |
| `auth.password.reset.request` | 재설정 요청 | success |
| `auth.password.reset.complete` | 재설정 완료 | success |
| `auth.password.changed` | 비밀번호 변경 | success |
| `auth.email.changed` | 이메일 변경 | success |
| `auth.phone.changed` | 전화 변경 | success |
| `auth.identity.added` | 신원 추가 | success |
| `auth.identity.removed` | 신원 삭제 | success |
| `auth.provider.linked` | OAuth Provider 연결 | success |
| `auth.provider.unlinked` | OAuth Provider 해제 | success |
| `auth.2fa.enabled` | 2FA 활성화 | success |
| `auth.2fa.disabled` | 2FA 비활성화 | success |
| `auth.account.locked` | 계정 잠금 | success |
| `auth.account.unlocked` | 계정 잠금 해제 | success |
| `auth.account.disabled` | 계정 비활성화 | success |
| `auth.session.revoked.admin` | 관리자 강제 종료 | success |
| `auth.session.revoked.password_change` | 비밀번호 변경 시 | success |
| `auth.suspicious_login.detected` | 의심스러운 로그인 감지 | success |
| `auth.rate_limit.exceeded` | Rate Limit 초과 | failure |
| `auth.captcha.failed` | CAPTCHA 실패 | failure |
| `auth.policy.changed` | 정책 변경 (Admin) | success |

### 11.3 Invariants

```
I-32: AuditLog은 절대 UPDATE/DELETE 불가 (Append-Only).
I-33: hash 체인은 무결성 검증에 사용 (변조 감지).
I-34: PII (이메일, 전화)는 context에 평문 저장 금지. identifierHash만 저장.
```

### 11.4 무결성 검증 (Hash Chain)

```typescript
function appendAuditLog(prev: AuditLog, current: Omit<AuditLog, 'hash' | 'prevHash'>): AuditLog {
  const prevHash = prev?.hash ?? '0'.repeat(64);
  const hashInput = JSON.stringify({
    tenantId: current.tenantId,
    eventType: current.eventType,
    result: current.result,
    createdAt: current.createdAt,
    prevHash,
  });
  const hash = sha256(hashInput);
  return { ...current, prevHash, hash };
}
```

> **사장님 확립**: Audit Log는 삭제하지 않고, 무결성 보장을 위해 해시 체인을 사용한다. ADR-006.

---

## 12. Aggregate: TenantCredential

### 12.1 정의

Tenant가 외부 서비스에 접근할 때 사용하는 자격증명.

```typescript
class TenantCredential {
  readonly id: TenantCredentialId;
  readonly tenantId: TenantId;
  readonly purpose: CredentialPurpose;       // 어떤 용도인가
  readonly name: string;                     // 표시용 이름
  readonly encryptedPayload: Buffer;         // AES-256-GCM 암호화된 JSON
  readonly keyId: string;                    // KMS 키 ID
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly expiresAt: Date | null;
}

enum CredentialPurpose {
  OAuthGoogle = 'oauth_google',
  OAuthApple = 'oauth_apple',
  OAuthFacebook = 'oauth_facebook',
  OAuthKakao = 'oauth_kakao',
  OAuthNaver = 'oauth_naver',
  OAuthLine = 'oauth_line',
  OAuthMicrosoft = 'oauth_microsoft',
  SmtpCredentials = 'smtp_credentials',
  SmsCredentials = 'sms_credentials',
  OpenaiApiKey = 'openai_api_key',
  AnthropicApiKey = 'anthropic_api_key',
  // 무한 확장 가능
  CustomWebhook = 'custom_webhook',
}
```

### 12.2 Invariants

```
I-35: TenantCredential은 절대 평문 저장 불가. encryptedPayload는 AES-256-GCM.
I-36: (tenantId, purpose, name) unique.
I-37: expiresAt < now이면 자동 무효화 (배치 작업).
```

### 12.3 Payload Schema (purpose별)

```typescript
// Google OAuth
interface GoogleOAuthPayload {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

// SMTP
interface SmtpPayload {
  host: string;
  port: number;
  username: string;
  password: string;
  fromAddress: string;
  fromName: string;
  tls: 'none' | 'tls' | 'starttls';
}

// SMS (Twilio)
interface TwilioPayload {
  sid: string;
  token: string;
  fromNumber: string;
}

// ... 각 purpose별 페이로드 타입 정의
```

---

## 13. Domain Event (SystemEvent)

Universal Core의 `SystemEvent`를 따릅니다. **Identity Engine이 발행하는 모든 이벤트**는 다음 형식:

```typescript
interface IdentityDomainEvent extends SystemEvent {
  readonly tenantId: TenantId;
  readonly eventType: IdentityEventType;
  readonly entity: 'user' | 'session' | 'credential' | 'identity' | 'policy' | 'audit';
  readonly entityId: string;
  readonly payload: Record<string, unknown>;
  readonly version: string;            // 스키마 버전 (v1.0.0)
}
```

자세한 이벤트 카탈로그와 페이로드는 `07-events.md`.

---

## 14. 비밀번호 해시 (Password Hash) Value Object

```typescript
class PasswordHash {
  private constructor(private readonly value: string) {}

  static fromPlain(plain: string, policy: PasswordPolicy): PasswordHash {
    const violation = policy.evaluate(plain);
    if (violation) throw new InvalidPasswordError(violation);
    const salt = randomBytes(16);
    const hash = argon2id(plain, salt, {
      memory: 64 * 1024,
      iterations: 3,
      parallelism: 1,
    });
    return new PasswordHash(`$argon2id$v=19$m=65536,t=3,p=1$${salt.toBase64()}$${hash.toBase64()}`);
  }

  static fromStored(stored: string): PasswordHash {
    return new PasswordHash(stored);
  }

  verify(plain: string): boolean {
    return argon2idVerify(this.value, plain);
  }
}
```

> **Argon2id 파라미터는 사장님 확립 시 결정 — 기본 제안: memory=64MiB, iterations=3, parallelism=1.**

---

## 15. 토큰 (Token) Value Object

### 15.1 Opaque Token

```typescript
class OpaqueToken {
  static generate(byteLength = 32): { plaintext: string; hash: string } {
    const plaintext = randomBytes(byteLength).toBase64Url();
    const hash = sha256(plaintext);
    return { plaintext, hash };
  }

  static hash(plaintext: string): string {
    return sha256(plaintext);
  }
}
```

### 15.2 사용처

| 토큰 종류 | byteLength | TTL |
|---|---|---|
| Session Token | 32 | session timeout |
| Verification Code | 16 (8 hex chars) | verification expiration |
| Password Reset Token | 32 | 1 hour |
| OAuth State Token | 32 | 10 minutes |
| API Key (TenantCredential) | 32 | 무기한 |

---

## 16. Identifier 정규화

### 16.1 Email

```typescript
function normalizeEmail(raw: string): string {
  // RFC 5321: 로컬 파트 + 도메인, 도메인은 lowercase
  const [local, domain] = raw.toLowerCase().trim().split('@');
  if (!local || !domain) throw new ValidationError('INVALID_EMAIL');
  // Gmail의 경우 + suffix 제거 (선택적 — 정책으로)
  const cleanLocal = local.split('+')[0];
  return `${cleanLocal}@${domain}`;
}
```

### 16.2 Phone (E.164)

```typescript
function normalizePhone(raw: string, defaultCountry: string = 'US'): string {
  // E.164 형식: +[country code][number], 최대 15자리
  // libphonenumber 사용 권장
  return parsePhoneNumber(raw, defaultCountry).format('E.164');
}
```

### 16.3 Username

```typescript
function normalizeUsername(raw: string): string {
  return raw.toLowerCase().trim();
}
```

---

## 17. Entity Relationship 요약

```
Tenant (Universal Core)
  ├── User (1:N)
  │     ├── UserIdentity (1:N)
  │     ├── Credential (1:N)
  │     ├── Session (1:N)
  │     └── AuditLog (1:N)
  ├── SecurityPolicy (1:1)
  ├── AuthProvider (1:N)        -- 사용 가능한 인증 제공자
  ├── TenantCredential (1:N)    -- 외부 서비스 자격증명
  └── VerificationToken (1:N)
```

자세한 ERD는 `05-erd.md`.

---

## 18. 미결정 사항

**모든 미결정 사항은 [`15-identity-decisions.md`](./15-identity-decisions.md)에 canonical로 정리되어 있습니다.**

이 문서에서는 더 이상 미결정 항목을 다루지 않습니다.

---

**End of Domain Model v1.0**