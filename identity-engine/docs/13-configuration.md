# Identity Engine — Configuration System

**Version**: v1.0
**Status**: Frozen (사장님 확립, 2026-07-11)

---

## 0. 문서 위치

이 문서는 **Identity Engine이 읽는 모든 설정**의 구조와 로딩 순서를 정의합니다.

설정 출처는 3가지:

1. **Compile-time**: 패키지 코드 내부 상수 (소스 코드)
2. **Boot-time**: 환경변수 (`process.env`)
3. **Runtime**: Database (Tenant별 policy, credential, provider config)

이 문서는 3가지의 우선순위와 로딩 절차를 정의합니다.

---

## 1. 우선순위 (Priority)

```
Runtime (DB)  >  Boot-time (env)  >  Compile-time (defaults)
```

**예시**:
- `session_timeout_minutes`: DB 값 > env 값 > 기본값 60

**단, 일부 설정은 Compile-time only** (아래 표 참조).

---

## 2. Compile-time Defaults

`src/config/defaults.ts`에 정의. **모든 Tenant 공통 기본값**.

```typescript
export const DEFAULTS = {
  // Password
  passwordMinLength: 12,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumber: true,
  passwordRequireSpecial: true,
  passwordExpirationDays: null,         // 무기한
  passwordHistoryCount: 5,

  // Lock & Failure
  loginMaxFailures: 5,
  lockDurationMinutes: 30,
  rateLimitPerIP: { maxRequests: 5, windowSeconds: 900 },
  rateLimitPerIdentifier: { maxRequests: 10, windowSeconds: 900 },

  // Session
  sessionTimeoutMinutes: 60,
  rememberMeDays: 30,
  maxConcurrentSessions: null,          // 무제한

  // Verification
  requireEmailVerification: false,
  requirePhoneVerification: false,
  verificationExpirationMinutes: 15,
  verificationMaxAttempts: 5,

  // 2FA
  twoFactorRequired: false,
  twoFactorMethods: ['totp'],

  // CAPTCHA
  captchaEnabled: false,
  captchaProvider: null,
  captchaTriggerAfterFailures: 3,

  // Audit
  auditRetentionDays: null,             // 무기한

  // Verification Flow
  requireAdminApproval: false,
} as const;
```

---

## 3. Boot-time Environment Variables

| 변수 | 용도 | 필수 | 기본값 |
|---|---|---|---|
| `IDENTITY_DB_URL` | Postgres connection string | ✅ | — |
| `IDENTITY_CACHE_URL` | Redis URL | ✅ | — |
| `IDENTITY_KMS_KEY_ID` | KMS 키 ID | ✅ | — |
| `IDENTITY_KMS_REGION` | KMS 리전 (AWS 등) | ❌ | (auto) |
| `IDENTITY_JWT_PRIVATE_KEY` | JWT RS256 개인키 (PEM) | ✅ | — |
| `IDENTITY_JWT_PUBLIC_KEY` | JWT RS256 공개키 (PEM) | ✅ | — |
| `IDENTITY_JWT_KEY_ID` | JWT kid 헤더 값 | ❌ | (auto) |
| `IDENTITY_JWT_ISSUER` | JWT iss 클레임 | ✅ | — |
| `IDENTITY_JWT_AUDIENCE` | JWT aud 클레임 | ✅ | — |
| `IDENTITY_HASH_PEPPER` | 비밀번호 해시용 pepper (선택) | ❌ | — |
| `IDENTITY_TOKEN_PEPPER` | Verification/PasswordReset 코드 pepper | ❌ | — |
| `IDENTITY_LOG_LEVEL` | trace / debug / info / warn / error | ❌ | info |
| `IDENTITY_LOG_FORMAT` | json / pretty | ❌ | json |
| `IDENTITY_NODE_ENV` | development / production | ✅ | — |
| `IDENTITY_TRUSTED_PROXIES` | 콤마 구분 IP 목록 (X-Forwarded-For 신뢰) | ❌ | — |
| `IDENTITY_SMTP_HOST` | (테스트용 fallback) | ❌ | — |
| `IDENTITY_SMTP_PORT` | | ❌ | 587 |

### 3.1 검증

```typescript
// src/config/env.ts
import { z } from 'zod';

const EnvSchema = z.object({
  IDENTITY_DB_URL: z.string().url(),
  IDENTITY_CACHE_URL: z.string().url(),
  IDENTITY_KMS_KEY_ID: z.string().min(1),
  IDENTITY_JWT_PRIVATE_KEY: z.string().startsWith('-----BEGIN'),
  IDENTITY_JWT_PUBLIC_KEY: z.string().startsWith('-----BEGIN'),
  IDENTITY_JWT_ISSUER: z.string().min(1),
  IDENTITY_JWT_AUDIENCE: z.string().min(1),
  IDENTITY_NODE_ENV: z.enum(['development', 'production', 'test']),
  // ...
});

export const env = EnvSchema.parse(process.env);
```

> 부팅 시점에 검증. 누락 시 즉시 fail.

---

## 4. Runtime Database Configuration

DB에 저장되는 모든 설정:

| 테이블 | 역할 |
|---|---|
| `security_policies` | Tenant별 보안 정책 |
| `auth_providers` | Tenant별 활성화된 인증 Provider |
| `tenant_credentials` | Tenant별 외부 서비스 자격증명 (암호화) |

### 4.1 로딩 흐름

```
Use Case 진입
  ↓
1. SecurityPolicy 조회
   cache.get(`policy:${tenantId}`)
     hit → return
     miss → DB 조회 → cache.set (TTL 300s) → return
  ↓
2. AuthProviders 조회
   DB 조회 (활성화된 것만)
   cache.set (TTL 300s)
  ↓
3. TenantCredentials 조회 (필요 시)
   KMS 호출 → 복호화 → use
   (캐시하지 않음 — 메모리에 평문 노출 최소화)
```

### 4.2 캐시 무효화

```
Policy 변경 API 호출
  ↓
1. DB 업데이트
  ↓
2. cache.delete(`policy:${tenantId}`)
  ↓
3. audit log 발행: auth.policy.changed
```

> 다음 Use Case 호출 시 DB에서 다시 읽음.

---

## 5. Feature Flags

엔진 자체 기능에 대한 feature flag (테스트 / 단계적 출시):

```typescript
// src/config/feature-flags.ts
export interface FeatureFlags {
  /** Enable TOTP MFA (default: true) */
  mfaTotpEnabled: boolean;

  /** Enable SMS MFA (default: true, requires SMS provider) */
  mfaSmsEnabled: boolean;

  /** Enable OAuth account linking (default: true) */
  oauthLinkingEnabled: boolean;

  /** Enable password expiration warning emails (default: false) */
  passwordExpirationWarning: boolean;

  /** Enable suspicious login detection (default: true) */
  suspiciousLoginDetection: boolean;

  /** Enable audit log hash chain (default: true) */
  auditHashChain: boolean;
}
```

> **기본값은 모두 true** (보안 기능 비활성화는 의도적 결정). 비활성화는 신중하게.

---

## 6. Configuration Loading Order

```
[Boot]
  1. Compile-time defaults 로드
  2. Environment variables 검증 및 로드
  3. Engine 인스턴스 생성
  4. DB 연결 (lazy)

[Per Tenant — first access]
  5. SecurityPolicy 조회 (DB → cache)
  6. AuthProviders 조회 (DB → cache)
  7. TenantCredentials 조회 (lazy, KMS 호출)

[Per Request]
  8. Use Case 실행 — 위 설정 사용
```

---

## 7. Hot Reload (Phase 2+)

일부 설정은 재시작 없이 변경 가능:

| 설정 | Hot Reload | 방법 |
|---|---|---|
| SecurityPolicy | ✓ | DB 변경 + cache invalidation |
| AuthProviders | ✓ | DB 변경 + cache invalidation |
| TenantCredentials | ✓ | DB 변경 (다음 사용 시 KMS 재호출) |
| Env vars | ❌ | 재시작 필요 |
| Compile-time defaults | ❌ | 코드 수정 + 배포 |

---

## 8. 환경별 권장 설정

### 8.1 Development

```bash
IDENTITY_DB_URL=postgresql://identity:identity@localhost:5432/identity_dev
IDENTITY_CACHE_URL=redis://localhost:6379
IDENTITY_KMS_KEY_ID=local-dev-key
IDENTITY_JWT_PRIVATE_KEY=... # dev-only
IDENTITY_JWT_PUBLIC_KEY=...
IDENTITY_JWT_ISSUER=http://localhost:3000
IDENTITY_JWT_AUDIENCE=identity-dev
IDENTITY_NODE_ENV=development
IDENTITY_LOG_LEVEL=debug
IDENTITY_LOG_FORMAT=pretty
```

### 8.2 Production

```bash
IDENTITY_DB_URL=postgresql://...
IDENTITY_CACHE_URL=rediss://...  # TLS
IDENTITY_KMS_KEY_ID=arn:aws:kms:...
IDENTITY_JWT_PRIVATE_KEY=<from-secrets-manager>
IDENTITY_JWT_PUBLIC_KEY=<from-secrets-manager>
IDENTITY_JWT_ISSUER=https://api.aibg.ge
IDENTITY_JWT_AUDIENCE=identity-prod
IDENTITY_NODE_ENV=production
IDENTITY_LOG_LEVEL=info
IDENTITY_LOG_FORMAT=json
IDENTITY_TRUSTED_PROXIES=10.0.0.0/8
```

---

## 9. Secrets 관리

### 9.1 절대 금지

```
❌ 코드에 하드코딩
❌ .env 파일을 Git에 commit
❌ 평문 로그
❌ 클라이언트에 노출
```

### 9.2 권장 패턴

| 환경 | 도구 |
|---|---|
| Local dev | `.env` (gitignored) |
| CI/CD | GitHub Actions Secrets |
| Production | AWS Secrets Manager / GCP Secret Manager / HashiCorp Vault |
| 컨테이너 | 환경변수 (Secret Manager에서 마운트) |

---

## 10. Configuration 검증

### 10.1 Schema 검증

```typescript
// src/config/schema.ts
import { z } from 'zod';

const RateLimitRuleSchema = z.object({
  maxRequests: z.number().int().positive().max(1000),
  windowSeconds: z.number().int().positive().max(86400),
});

const SecurityPolicySchema = z.object({
  tenantId: z.string().uuid(),
  passwordMinLength: z.number().int().min(8).max(128),
  passwordRequireUppercase: z.boolean(),
  // ...
  sessionTimeoutMinutes: z.number().int().min(5).max(10080),
  // ...
});

export function validateSecurityPolicy(input: unknown): SecurityPolicy {
  return SecurityPolicySchema.parse(input);
}
```

### 10.2 최소값 강제

```
passwordMinLength >= 8           (사장님 확립: 보안 하한선)
sessionTimeoutMinutes >= 5       (너무 짧으면 UX 저하)
lockDurationMinutes >= 1         (1분 미만은 무의미)
verificationExpirationMinutes >= 1
verificationMaxAttempts >= 1 && <= 10
```

---

## 11. 미결정 사항

**모든 미결정 사항은 [`15-identity-decisions.md`](./15-identity-decisions.md)에 canonical로 정리되어 있습니다.**

이 문서에서는 더 이상 미결정 항목을 다루지 않습니다.

---