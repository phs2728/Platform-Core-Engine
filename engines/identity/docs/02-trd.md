# Identity Engine — Technical Requirements Document (TRD)

**Version**: v1.0
**Status**: Frozen (사장님 확립, 2026-07-11)
**Companion to**: [01-prd.md](./01-prd.md)
**Effective Date**: 2026-07-11

---

## 0. 문서 위치

PRD가 **무엇을** 만드는지 정의한다면, TRD는 **어떻게** 만드는지를 정의합니다.

이 문서는 **엔진 자체의 기술적 결정**만 다룹니다. 도메인 스키마는 `04-db-schema.md`, API는 `06-api-spec.yaml`, 이벤트는 `07-events.md` 참조.

---

## 1. 설계 헌법 (Architectural Constitution)

### 1.1 사장님 확립 원칙 (Universal Core로부터 상속)

```
80% Universal / 20% Domain
Business modules must never modify the Core
Event First — 모든 중요 액션은 도메인 이벤트를 발생시킨다
TypeScript Everywhere
```

### 1.2 Identity Engine 추가 원칙

| 원칙 | 설명 |
|---|---|
| **Engine, Not Application** | 엔진은 라이브러리다. 단독으로 실행되지 않는다. 호스트(Hono/Next.js 등)가 임포트해서 사용한다. |
| **Host-Agnostic** | 특정 웹 프레임워크에 종속되지 않는다. 인터페이스로 격리한다. |
| **DB-Agnostic** | SQL을 직접 쓰지 않는다. Repository 패턴 + IEntityStore 추상화로 격리한다. |
| **Tenant-Aware by Default** | 모든 Repository 메서드는 첫 인자로 `tenantId`를 받는다. 강제. |
| **Stateless API Surface** | 엔진은 상태를 내부 캐싱하지 않는다 (단, 성능상 명시적으로 주입받은 캐시는 OK). |
| **Pure Functions First** | 비즈니스 로직은 순수 함수로 작성한다. 부수 효과(IO, 시간, 난수)는 인자로 주입. |
| **Cryptographic Purity** | 암호화 결정은 한 곳에 집중한다. `crypto/index.ts` 외에는 OpenSSL/HMAC을 직접 호출하지 않는다. |
| **Audit By Default** | 모든 mutation 함수는 Audit Log를 발행해야 한다. 누락 시 정적 분석으로 잡는다. |

---

## 2. 기술 스택 (Technology Stack)

### 2.1 언어 및 런타임

| 항목 | 선택 | 비고 |
|---|---|---|
| 언어 | **TypeScript 5.4+** | strict mode, `noUncheckedIndexedAccess: true` |
| 모듈 시스템 | ESM (ES2022) | CJS 미지원 |
| 런타임 | **Node.js 20 LTS / Bun 1.x / Deno 1.40+** 모두 호환 | [D-CONFIG-001](./15-identity-decisions.md#d-config-001) |
| 테스트 | Vitest | 단위 + 통합 |
| E2E | Playwright | 호스트 통합 시 |

### 2.2 핵심 의존성 (Engine Core)

| 의존성 | 용도 | 강제? |
|---|---|---|
| `@aibg/core` | Universal Core (Tenant, Event, Entity) | ✅ |
| `@aibg/engine-permission` | 권한 검사 | ✅ |
| `@aibg/engine-audit` | Audit Log 발행/조회 | ✅ |
| `@aibg/engine-notification` | 알림 발송 | ✅ |
| `zod` | 입력 검증 (schema runtime + type) | ✅ |
| `@noble/hashes` | Argon2id, SHA-256, HMAC (의존성 작음, 감사됨) | ✅ |
| `@noble/ciphers` | AES-256-GCM, ChaCha20-Poly1305 | ✅ |
| `jose` | JWT, JWS, JWE, JWKS | ✅ |

### 2.3 호스트가 제공해야 하는 의존성 (Host-Provided)

엔진 자체는 다음을 **직접 import하지 않는다**. 호스트(Hono/Next.js 등)가 인스턴스를 주입한다:

- Database Driver (예: `postgres-js`, `pg`, `drizzle-orm`)
- Cache Driver (예: `ioredis`, `upstash-redis`)
- HTTP Server (예: `hono`, `next`, `express`)
- Email Provider (예: `nodemailer`, `resend`, `sendgrid`)
- SMS Provider (예: `twilio`)
- OAuth Provider (엔진은 플러그인 인터페이스만 정의)
- KMS / Secrets (예: AWS KMS, Vault)
- Logger (예: `pino`)

### 2.4 의존성 정책

- ❌ Lodash, Moment, Axios, node-fetch → **금지** (네이티브 또는 더 작은 라이브러리 사용)
- ❌ 외부 SaaS 강제 의존 (Supabase, Clerk 등) → **금지** (어댑터 패턴으로 격리)
- ❌ CommonJS 의존성 → **금지** (ESM only)
- ✅ 모든 신규 의존성은 `package.json` 추가 전 ADR 필요

---

## 3. 모듈 구조 (Module Architecture)

### 3.1 계층 구조

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 5: HTTP / RPC Boundary (호스트에 위임)                  │
│  - Engine은 HTTP 핸들러를 export하지 않음                       │
│  - 호스트(Hono/Next)가 engine.method()를 호출                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 4: Public API (engine.ts)                            │
│  - Engine 진입점. 모든 public 메서드의 시그니처 정의          │
│  - 입력 검증 (zod) → 도메인 객체 변환 → 결과 반환             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Use Cases / Application Services                  │
│  - LoginUseCase, RegisterUseCase, VerifyUseCase 등           │
│  - 한 가지 비즈니스 의도를 가진 단위                           │
│  - 트랜잭션 경계, 이벤트 발행                                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Domain Logic (순수 함수)                            │
│  - PasswordPolicy.evaluate(password, policy) → Pass/Fail    │
│  - SessionToken.generate() / verify()                         │
│  - RateLimit.check(key, policy) → Allow/Deny                 │
│  - Side-effect 없음. 모두 의존성 주입.                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Repository (IEntityStore 구현)                     │
│  - UserRepository, SessionRepository, ...                    │
│  - tenantId 강제                                              │
│  - 캐시 추상화 (CacheAside 패턴)                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 0: Infrastructure (호스트 제공)                        │
│  - Postgres, Redis, KMS, Email, SMS                          │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 패키지 레이아웃

자세한 폴더 구조는 `09-folder-structure.md`. 요약:

```
@aibg/engine-identity
├── src/
│   ├── engine.ts              # 진입점
│   ├── domain/                # 순수 도메인 로직
│   ├── usecase/               # 애플리케이션 서비스
│   ├── repository/            # IEntityStore 구현
│   ├── provider/              # OAuth Provider 플러그인
│   ├── crypto/                # 암호화 결정 단일 진입점
│   ├── policy/                # SecurityPolicy 평가
│   ├── event/                 # SystemEvent 발행자
│   ├── error/                 # 도메인 에러 정의
│   └── types/                 # 외부 노출 타입
├── test/
│   ├── unit/
│   ├── integration/
│   └── security/
└── examples/                  # 호스트 통합 예시
```

---

## 4. 의존성 주입 (Dependency Injection)

엔진은 **DI 컨테이너 없이**, 명시적 파라미터로 의존성을 받습니다.

```typescript
// 엔진 진입점
interface IdentityEngineDeps {
  store: IEntityStore;          // Universal Core 추상화
  cache: ICache;                // 호스트 제공 (Redis 어댑터)
  crypto: ICryptoProvider;      // 호스트 제공 (KMS 어댑터 가능)
  events: IEventBus;            // Universal Core
  audit: IAuditWriter;          // Audit Engine
  notify: INotificationSender;  // Notification Engine
  policy: IPolicyProvider;      // Universal Core
  logger: ILogger;              // 호스트 제공
  clock: IClock;                // 시간 주입 (테스트용)
  random: IRandom;              // 난수 주입 (테스트용)
}

const engine = createIdentityEngine(deps);
```

**이유**:

- 테스트가 쉽다 (모든 부수 효과를 mock 가능)
- 런타임 종속이 없다
- 호스트가 어떤 DB/캐시를 쓰든 OK

---

## 5. 입력 검증 (Input Validation)

### 5.1 정책

- **모든 외부 입력**은 `zod` 스키마로 검증한다.
- 검증은 **Use Case 진입 시점**에 한다 (Controller 미들웨어 아님 — 엔진은 HTTP를 모름).
- 검증 실패는 `ValidationError` (사장님 확립 도메인 에러)로 throw.
- SQL Injection, NoSQL Injection, ReDoS 등 차단.

### 5.2 예시

```typescript
const LoginInputSchema = z.object({
  tenantId: z.string().uuid(),
  identifier: z.string().min(3).max(254),  // email | phone | username
  password: z.string().min(1).max(1024),
  deviceFingerprint: z.string().max(256).optional(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().max(2048).optional(),
});

type LoginInput = z.infer<typeof LoginInputSchema>;

async function login(input: LoginInput, ctx: EngineContext): Promise<LoginResult> {
  const parsed = LoginInputSchema.parse(input);
  // ...
}
```

---

## 6. 에러 처리 (Error Handling)

### 6.1 도메인 에러 계층

```typescript
// error/index.ts
export abstract class IdentityError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
  readonly safeToExpose: boolean;  // true: 사용자에게 노출, false: 내부 로깅만
}

export class ValidationError extends IdentityError {
  readonly code = 'IDENTITY_VALIDATION_FAILED';
  readonly httpStatus = 400;
  readonly safeToExpose = true;
}

export class AuthenticationFailedError extends IdentityError {
  readonly code = 'IDENTITY_AUTH_FAILED';
  readonly httpStatus = 401;
  readonly safeToExpose = true;
}

export class AccountLockedError extends IdentityError {
  readonly code = 'IDENTITY_ACCOUNT_LOCKED';
  readonly httpStatus = 423;
  readonly safeToExpose = true;
}

export class VerificationRequiredError extends IdentityError {
  readonly code = 'IDENTITY_VERIFICATION_REQUIRED';
  readonly httpStatus = 403;
  readonly safeToExpose = true;
}

export class RateLimitedError extends IdentityError {
  readonly code = 'IDENTITY_RATE_LIMITED';
  readonly httpStatus = 429;
  readonly safeToExpose = true;
}

export class ProviderError extends IdentityError {
  readonly code = 'IDENTITY_PROVIDER_ERROR';
  readonly httpStatus = 502;
  readonly safeToExpose = false;  // 내부 상세는 로깅만
}

export class InternalError extends IdentityError {
  readonly code = 'IDENTITY_INTERNAL_ERROR';
  readonly httpStatus = 500;
  readonly safeToExpose = false;
}
```

### 6.2 정책

- **도메인 에러는 사용자에게 노출 가능** (코드 + 사용자 친화적 메시지)
- **내부 에러는 로깅만** (사용자에게는 generic 500)
- **스택 트레이스는 절대 클라이언트에 반환하지 않음**
- **모든 에러는 Audit Log에 기록** (특히 인증 실패)

---

## 7. 동시성 (Concurrency)

### 7.1 정책

- 모든 mutation은 **낙관적 잠금(optimistic locking)** 사용
- `version` 컬럼 또는 `updated_at` 기반 동시성 검사
- 동시에 두 번의 비밀번호 변경 요청이 들어오면 하나만 성공, 나머지는 `ConflictError`

### 7.2 트랜잭션

- Use Case 내 여러 Repository 호출은 **단일 트랜잭션**으로 묶음
- Audit Log 발행은 **트랜잭션 commit 후** (실패해도 비즈니스 로직 자체는 롤백 안 함 — Audit 누락은 별도 retry queue로)

---

## 8. 캐싱 전략

### 8.1 정책

| 데이터 | 캐시 | TTL | 무효화 |
|---|---|---|---|
| SecurityPolicy (per Tenant) | Cache (Redis) | 5분 | 정책 변경 시 즉시 무효화 |
| Active Session | Cache | Session 만료까지 | Logout 시 즉시 무효화 |
| Rate Limit Counter | Cache | 정책 TTL | 자동 만료 |
| User (Identity 핵심 정보) | ❌ 캐시 안 함 | — | DB가 source of truth |
| OAuth Credential | ❌ 캐시 안 함 | — | KMS 호출 (느리지만 안전) |

### 8.2 Cache Aside 패턴

```typescript
async function getSecurityPolicy(tenantId: string): Promise<SecurityPolicy> {
  const cached = await cache.get(`policy:${tenantId}`);
  if (cached) return SecurityPolicy.parse(cached);
  const policy = await repo.findSecurityPolicy(tenantId);
  await cache.set(`policy:${tenantId}`, JSON.stringify(policy), 300);
  return policy;
}
```

---

## 9. 보안 모델 (Security Model)

자세한 내용은 `14-security.md`. 요약:

### 9.1 데이터 분류

| 분류 | 예시 | 처리 |
|---|---|---|
| Critical | Password hash, API keys, OAuth secrets | Argon2id / AES-256-GCM |
| Sensitive | Email, phone, IP | 결정적 암호화 또는 토큰화 (검색 가능) |
| Internal | User ID, Tenant ID | 평문 (FK로 사용) |
| Public | Display name (저장 안 함) | — |

### 9.2 전송 보안

- 모든 통신: TLS 1.2+ (TLS 1.3 권장)
- 내부 RPC: mTLS 또는 VPC 내부 격리
- JWT: 서명 검증 + 만료 + audience 확인

### 9.3 비밀번호

- 해시: **Argon2id**
  - memory: 64 MiB
  - iterations: 3
  - parallelism: 1
- 평문 저장: **절대 금지**
- 로깅: **절대 금지**

### 9.4 토큰

| 토큰 종류 | 형식 | TTL |
|---|---|---|
| Access Token (JWT) | RS256 서명 | 15분 |
| Refresh Token | Opaque random (256bit) | 30일 |
| Session Token | Opaque random (256bit) | Session Timeout |
| Verification Token (Email/SMS) | Opaque random (128bit) | 15분 |
| Password Reset Token | Opaque random (256bit) | 1시간 |
| API Key (Credential) | Random prefix + body | 무기한 (호스트가 회전) |

### 9.5 Rate Limiting

| Endpoint | 정책 (기본) |
|---|---|
| `POST /auth/login` | 5 req / 15min / IP, 10 req / 15min / identifier |
| `POST /auth/register` | 3 req / 1h / IP |
| `POST /auth/password/reset` | 3 req / 1h / email |
| `POST /auth/verify/sms/request` | 3 req / 1h / phone |
| `POST /auth/oauth/{provider}/callback` | 10 req / 1min / IP |

[상세는 §10 Rate Limit 정책 + `14-security.md` §6]

---

## 10. 성능 (Performance)

### 10.1 목표 ([D-CONFIG Scalability](./15-identity-decisions.md#11-configuration-policy) 참조)

| 항목 | p50 | p95 | p99 |
|---|---|---|---|
| Login | < 100ms | < 300ms | < 800ms |
| Register | < 200ms | < 500ms | < 1.5s |
| Logout | < 50ms | < 150ms | < 400ms |
| Session Verify | < 10ms | < 50ms | < 100ms |
| Token Refresh | < 80ms | < 200ms | < 500ms |
| OAuth Callback | < 300ms | < 800ms | < 2s |

### 10.2 최적화 전략

- 비밀번호 검증 (Argon2id): Worker Thread로 분리 (메인 응답 안 막게)
- Audit Log: 비동기 발행 (Event Bus 후처리)
- Session 검증: JWT (서명 검증만, DB 조회 안 함)
- Rate Limit: Redis Lua script (atomic)

---

## 11. 옵저버빌리티 (Observability)

### 11.1 로깅

- 구조화 로그 (JSON)
- 필드: `timestamp`, `level`, `tenantId`, `userId?`, `requestId`, `eventType`, `message`, `context`
- 비밀번호, 토큰, API key는 **절대 로깅 금지**
- PII는 마스킹 (`email: "t***@example.com"`)

### 11.2 메트릭 (Prometheus 호환)

- `identity_login_total{tenant_id, result}` (counter)
- `identity_login_duration_seconds{tenant_id, result}` (histogram)
- `identity_session_active{tenant_id}` (gauge)
- `identity_rate_limit_blocked_total{tenant_id, route}` (counter)
- `identity_audit_event_total{event_type}` (counter)
- `identity_crypto_duration_seconds{algorithm}` (histogram)

### 11.3 트레이싱 (OpenTelemetry)

- Span: `identity.login`, `identity.register`, `identity.password.verify`, `identity.crypto.argon2id`
- 속성: `tenant.id`, `user.id`, `provider.id`, `result`
- 비밀번호 평문/해시는 절대 속성에 포함하지 않음

### 11.4 헬스 체크

- `GET /health` — DB ping, Redis ping, KMS ping
- `GET /health/ready` — 모든 의존성 OK
- `GET /health/live` — 프로세스 살아있음

---

## 12. 국제화 (i18n)

- Identity Engine은 **메시지 ID만 반환**한다 (사용자 친화적 문장은 호스트가 번역)
- 예: `{ code: 'IDENTITY_AUTH_FAILED', messageId: 'auth.failed.invalid_credentials' }`
- 호스트는 `messageId`를 보고 자신의 i18n 시스템으로 번역
- 이렇게 분리하는 이유: Identity Engine이 도메인 지식을 가지지 않으면서 다국어 지원 가능

---

## 13. 배포 (Deployment)

### 13.1 권장 환경

- **컨테이너**: Docker (멀티스테이지 빌드, distroless 또는 alpine)
- **오케스트레이션**: Kubernetes / Fly.io / Railway / Vercel (Serverless)
- **Database**: Postgres 15+ (Supabase, RDS, Neon 등)
- **Cache**: Redis 7+ (Upstash, ElastiCache)
- **KMS**: AWS KMS / GCP KMS / Vault

### 13.2 Serverless 호환성

엔진은 **Serverless에서 동작 가능하도록** 설계:

- 콜드 스타트 시 lazy 초기화
- 글로벌 상태 없음 (DI로 받음)
- Worker Thread는 컨테이너 환경에서만 (Serverless는 자체 처리)

### 13.3 환경 변수

| 변수 | 용도 | 필수 |
|---|---|---|
| `IDENTITY_DB_URL` | Postgres connection string | ✅ |
| `IDENTITY_CACHE_URL` | Redis URL | ✅ |
| `IDENTITY_KMS_KEY_ID` | KMS 키 ID (또는 로컬 키) | ✅ |
| `IDENTITY_JWT_PRIVATE_KEY` | JWT 서명용 (RS256) | ✅ |
| `IDENTITY_JWT_PUBLIC_KEY` | JWT 검증용 | ✅ |
| `IDENTITY_ENV` | `dev` / `staging` / `prod` | ✅ |

> 시크릿은 **절대 코드/GitHub에 저장 금지**.

---

## 14. 미결정 사항

**모든 미결정 사항은 [`15-identity-decisions.md`](./15-identity-decisions.md)에 canonical로 정리되어 있습니다.**

이 문서에서는 더 이상 미결정 항목을 다루지 않습니다. Performance 목표치, Scalability 목표치, 기본 정책값 등은 `15-identity-decisions.md`의 Configuration Policy 섹션 (D-CONFIG-*) 참조.

---

**End of TRD v1.0**