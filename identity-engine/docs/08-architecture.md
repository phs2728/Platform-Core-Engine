# Identity Engine — Module Architecture

**Version**: v1.0
**Status**: Frozen (사장님 확립, 2026-07-11)
**Companion to**: [02-trd.md](./02-trd.md)

---

## 0. 문서 위치

이 문서는 **Identity Engine의 내부 모듈 구조**를 정의합니다.

- **책임**: 어떤 코드가 어디 있어야 하는가
- **의존성**: 어떤 방향으로만 import가 허용되는가
- **경계**: Identity Engine ↔ Universal Core ↔ Host

---

## 1. 핵심 원칙

### 1.1 사장님 확립 (Universal Core에서 상속)

```
80% Universal / 20% Domain
Business modules must never modify the Core
Event First
TypeScript Everywhere
```

### 1.2 Identity Engine 추가 원칙

| 원칙 | 설명 |
|---|---|
| **Engine, Not Application** | 엔진은 라이브러리다. main() 진입점 없음. 호스트가 import해서 사용. |
| **No HTTP, No DB Driver** | 엔진은 Hono/Express/Postgres Client를 import하지 않는다. |
| **Dependency Injection Only** | 모든 외부 의존성은 명시적 파라미터로 주입. 글로벌 상태 없음. |
| **Pure Functions First** | 비즈니스 로직 = 순수 함수. 부수 효과는 가장자리에서. |
| **Tenant as First Argument** | 모든 Use Case의 첫 인자 = `tenantId`. 강제. |
| **Engine Does Not Log PII** | 비밀번호/토큰/API key 절대 로깅 금지. PII 마스킹 강제. |

---

## 2. 레이어드 아키텍처 (Layered)

### 2.1 다이어그램

```
┌──────────────────────────────────────────────────────────────┐
│  Layer 5 — Host Boundary (호스트 영역, 엔진 책임 아님)          │
│  Hono/Next 라우터, Middleware, HTTP 핸들러                      │
└──────────────────────────────────────────────────────────────┘
                          ↑ engine.method() 호출
┌──────────────────────────────────────────────────────────────┐
│  Layer 4 — Engine API (src/engine.ts)                        │
│  Public surface. 입력 검증 (zod) → Use Case 호출 → 결과 반환.  │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│  Layer 3 — Use Cases (src/usecase/)                          │
│  Application service. 트랜잭션 경계, 이벤트 발행.               │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│  Layer 2 — Domain Logic (src/domain/)                        │
│  순수 함수. 비즈니스 규칙 평가, 토큰 생성/검증, 정책 검증.        │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│  Layer 1 — Repositories (src/repository/)                    │
│  IEntityStore 구현. tenantId 강제. 캐시 추상화.                 │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│  Layer 0 — Infrastructure (호스트 제공, import 금지)           │
│  Postgres, Redis, KMS, Email, SMS, OAuth Providers            │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 의존성 방향 (강제)

```
Layer 5 (Host)  →  Layer 4 (Engine)  →  Layer 3 (Use Case)
                                            ↓
                                       Layer 2 (Domain)
                                            ↓
                                       Layer 1 (Repository)
                                            ↓
                                       Layer 0 (Infra)
```

**규칙**:
- 위 → 아래 호출 OK
- 아래 → 위 호출 ❌
- 같은 레벨 간 호출 ❌ (Use Case끼리 직접 호출 금지)
- Layer 2 (Domain)는 Layer 1/0 import 금지 (순수 함수 유지)

### 2.3 Cyclic Dependency 방지

- 모든 import는 **하향식**만 허용
- 같은 레벨 간 통신은 **이벤트 버스** 또는 **콜백**으로
- Type 정의는 별도 `src/types/`에 모아 양방향 import 회피

---

## 3. 모듈 카탈로그

### 3.1 `src/engine.ts` — 진입점

**책임**:
- Identity Engine 인스턴스 생성
- 모든 public 메서드의 시그니처 정의
- 입력 검증 (zod)
- Use Case 호출 + 결과 반환
- 에러 변환

**예시**:
```typescript
export function createIdentityEngine(deps: IdentityEngineDeps): IdentityEngine {
  return {
    async login(input: LoginInput): Promise<LoginResult> {
      const parsed = LoginInputSchema.parse(input);
      return loginUseCase(parsed, deps);
    },
    async register(input: RegisterInput): Promise<RegisterResult> {
      const parsed = RegisterInputSchema.parse(input);
      return registerUseCase(parsed, deps);
    },
    // ...
  };
}
```

### 3.2 `src/domain/` — 순수 도메인 로직

**책임**: 비즈니스 규칙, 결정, 검증. **부수 효과 없음**.

```
domain/
  password/
    policy.ts             # PasswordPolicy.evaluate()
    hash.ts               # PasswordHash.fromPlain(), verify()
    history.ts            # check against history
  identifier/
    normalize.ts          # normalizeEmail, normalizePhone, normalizeUsername
    hash.ts               # deterministicEncrypt, hmacHash
  token/
    opaque.ts             # generate, hash
    jwt.ts                # sign, verify
    totp.ts               # generateSecret, verify
  session/
    timeout.ts            # isExpired, isRememberMeExpired
    risk.ts               # suspiciousLoginScore
  rate-limit/
    check.ts              # checkLimit(key, rule)
  policy/
    security-policy.ts    # SecurityPolicy.evaluate()
```

**예시**:
```typescript
// domain/password/policy.ts
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
}

export type PasswordViolation =
  | { kind: 'too_short'; minLength: number }
  | { kind: 'no_uppercase' }
  | { kind: 'no_lowercase' }
  | { kind: 'no_number' }
  | { kind: 'no_special' };

export function evaluatePassword(password: string, policy: PasswordPolicy): PasswordViolation | null {
  if (password.length < policy.minLength) {
    return { kind: 'too_short', minLength: policy.minLength };
  }
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    return { kind: 'no_uppercase' };
  }
  // ...
  return null;
}
```

> 이 함수는 **순수** — DB도, 시간도, 외부 IO도 호출하지 않음.

### 3.3 `src/usecase/` — 애플리케이션 서비스

**책임**: Use Case 1개 = 비즈니스 의도 1개. 트랜잭션 경계. 이벤트 발행.

```
usecase/
  auth/
    login.ts
    register.ts
    logout.ts
    logout-all.ts
  password/
    reset-request.ts
    reset-confirm.ts
    change.ts
  verification/
    email-request.ts
    email-verify.ts
    sms-request.ts
    sms-verify.ts
  two-factor/
    setup.ts
    verify.ts
    disable.ts
  oauth/
    initiate.ts
    callback.ts
    link.ts
    unlink.ts
  session/
    list.ts
    revoke.ts
  identity/
    me.ts
  admin/
    list-providers.ts
    update-policy.ts
    lock-user.ts
    audit-query.ts
```

**예시**:
```typescript
// usecase/auth/login.ts
export async function loginUseCase(
  input: LoginInput,
  deps: IdentityEngineDeps,
): Promise<LoginResult> {
  // 1. Rate Limit
  await checkRateLimit('login', input, deps);
  // 2. CAPTCHA (필요 시)
  if (deps.policy.captchaEnabled) await verifyCaptcha(input.captchaToken, deps);
  // 3. Identifier → User 찾기
  const identity = await findIdentityByIdentifier(input.tenantId, input.identifier, deps);
  if (!identity) {
    await emitEvent('auth.login.failure', { reason: 'user_not_found' }, deps);
    throw new AuthenticationFailedError();
  }
  const user = await findUserById(identity.userId, deps);
  // 4. Account Status 검사
  if (user.status === 'locked') throw new AccountLockedError();
  // 5. Password 검증
  const credential = await findPasswordCredential(user.id, deps);
  const ok = await verifyPassword(credential, input.password, deps);
  if (!ok) {
    await handleFailedLogin(user, deps);
    throw new AuthenticationFailedError();
  }
  // 6. Verification 확인
  if (requiresVerification(user, deps.policy)) {
    return await startVerificationChallenge(user, deps);
  }
  // 7. 2FA 확인
  if (userHasTotp(user) || deps.policy.twoFactorRequired) {
    return await startTwoFactorChallenge(user, deps);
  }
  // 8. Session 생성
  const session = await createSession(user, input, deps);
  // 9. Event 발행
  await emitEvent('auth.login.success', { userId: user.id, sessionId: session.id, ... }, deps);
  return { session, user, sessionToken: session.tokenPlain };
}
```

### 3.4 `src/repository/` — 데이터 접근

**책임**: IEntityStore 추상화를 통해 DB와 통신. 캐시 추상화.

```
repository/
  user.repository.ts
  user-identity.repository.ts
  credential.repository.ts
  session.repository.ts
  verification-token.repository.ts
  password-reset.repository.ts
  security-policy.repository.ts
  audit-log.repository.ts         # 직접 쓰지 않음 (EventBus 경유)
  tenant-credential.repository.ts
```

**예시**:
```typescript
// repository/user.repository.ts
export interface UserRepository {
  findById(id: UserId, tenantId: TenantId): Promise<User | null>;
  findByIdentifier(tenantId: TenantId, type: IdentityType, identifierHash: Buffer): Promise<{ user: User; identity: UserIdentity } | null>;
  insert(user: NewUser): Promise<User>;
  update(id: UserId, patch: UserPatch): Promise<User>;
  softDelete(id: UserId): Promise<void>;
  incrementLoginFailure(userId: UserId): Promise<number>;
  lock(userId: UserId, until: Date, reason: string): Promise<void>;
  unlock(userId: UserId): Promise<void>;
}
```

> 모든 메서드는 **첫 인자가 tenantId 또는 tenant-aware** (호출자 실수 방지).

### 3.5 `src/provider/` — OAuth Provider 플러그인

**책임**: 각 외부 OAuth Provider와의 통신.

```
provider/
  google/
    index.ts
    config.ts
  apple/
    index.ts
  facebook/
  kakao/
  naver/
  line/
  microsoft/
  registry.ts             # Provider 발견 + 등록
```

**예시 (간략)**:
```typescript
// provider/google/index.ts
export const GoogleProvider: AuthProvider = {
  id: 'google',
  type: 'oauth_google',
  scopes: ['openid', 'email', 'profile'],
  async initiate(state, deps) {
    const creds = await deps.tenantCredentials.get('oauth_google', deps.tenantId);
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', creds.clientId);
    url.searchParams.set('redirect_uri', creds.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', this.scopes.join(' '));
    url.searchParams.set('state', state);
    return { kind: 'redirect', url: url.toString() };
  },
  async callback({ code, state }, deps) {
    // 1. code → access_token
    const tokens = await exchangeCode(code, creds);
    // 2. userinfo fetch
    const profile = await fetchUserInfo(tokens.access_token);
    // 3. normalized identity
    return {
      provider: 'oauth_google',
      subject: `google:${profile.sub}`,
      email: profile.email,
      emailVerified: profile.email_verified,
      displayName: profile.name,           // (저장 X, 호스트에 전달만)
    };
  },
  async refresh(token, deps) { /* ... */ },
  async revoke(token, deps) { /* ... */ },
};
```

### 3.6 `src/crypto/` — 암호화 결정 단일 진입점

**책임**: 모든 암호화/해시 결정이 여기서 일어남. 다른 모듈은 OpenSSL/HMAC을 직접 호출 금지.

```
crypto/
  password.ts             # Argon2id wrap
  identifier.ts           # AES-SIV + HMAC
  token.ts                # Random bytes
  jwt.ts                  # RS256 sign/verify
  envelope.ts             # AES-256-GCM (TenantCredential용)
```

**예시**:
```typescript
// crypto/password.ts
export interface PasswordCrypto {
  hash(plain: string): Promise<string>;          // Argon2id
  verify(stored: string, plain: string): Promise<boolean>;
}
```

### 3.7 `src/policy/` — 정책 평가

**책임**: SecurityPolicy를 동적으로 평가.

```
policy/
  password-policy.ts        # 도메인 로직 평가
  rate-limit-policy.ts      # Redis 카운터
  session-policy.ts         # Session 만료, 동시 세션 수
  verification-policy.ts    # Verification 강제 여부
```

### 3.8 `src/event/` — 이벤트 발행

**책임**: Universal Core EventBus에 도메인 이벤트 발행.

```typescript
// event/emit.ts
export async function emitIdentityEvent(
  type: IdentityEventType,
  payload: Record<string, unknown>,
  deps: IdentityEngineDeps,
): Promise<void> {
  await deps.events.emit({
    tenantId: deps.tenantId,
    eventType: type,
    payload,
    version: '1.0.0',
  });
}
```

### 3.9 `src/error/` — 도메인 에러

**책임**: 도메인 에러 계층 정의.

```
error/
  identity-error.ts        # abstract base
  validation-error.ts
  authentication-failed.ts
  account-locked.ts
  verification-required.ts
  rate-limited.ts
  ...
```

### 3.10 `src/types/` — 외부 노출 타입

**책임**: 호스트가 import하는 public 타입.

```typescript
// types/index.ts
export type { IdentityEngine, IdentityEngineDeps };
export type { LoginInput, LoginResult };
export type { RegisterInput, RegisterResult };
export type { Session, User };
export type { IdentityError, AuthenticationFailedError, ... };
// ...
```

> 내부 구현 타입은 export하지 않음. 캡슐화.

---

## 4. Universal Core와의 경계

### 4.1 Identity Engine이 의존하는 것 (허용)

```typescript
// ✓ Universal Core 인터페이스 사용
import type { IEntityStore, ITenantResolver, IPolicyProvider, SystemEvent, IEventBus } from '@aibg/core';

// ✓ Universal Core 타입 사용
import type { Tenant, TenantId } from '@aibg/core';

// ✗ Universal Core 구현체 import (호스트가 주입)
import { EntityStore } from '@aibg/core';  // ❌ 구현체 직접 import 금지
```

### 4.2 Universal Core가 Identity Engine을 의존 (불허)

```
Universal Core는 Identity Engine을 절대 import하지 않는다.
Universal Core는 Identity Engine의 존재를 모른다.
```

이것이 **Boundary.ts**의 약속입니다.

### 4.3 Plugin Registry 통합

```typescript
// Identity Engine은 자기 자신을 Plugin Manifest로 등록 가능 (선택)
// plugins/identity/manifest.ts
export const identityManifest: PluginManifest = {
  id: 'identity-engine',
  name: 'Identity Engine',
  version: '1.0.0',
  industry: '*',           // Industry-agnostic이므로 '*'
  entities: [],            // Identity는 Plugin Entity를 노출하지 않음
  permissions: [],         // Permission Engine이 담당
  ruleIds: [],
  workflowIds: [],
  notificationRuleIds: [],
};
```

> 옵션: 호스트가 Plugin Registry를 쓴다면 Identity Engine을 매니페스트로 등록할 수 있다. **하지만 강제는 아님**.

---

## 5. Plugin Architecture (Provider 추가)

자세한 내용은 `10-plugin-architecture.md`. 요약:

```
새 OAuth Provider 추가 시:
1. provider/<name>/index.ts 작성 (~200 LOC)
2. provider/registry.ts의 PROVIDER_LIST에 1줄 추가
3. schema.sql의 auth_providers type CHECK 제약 확장 (마이그레이션 1개)
4. 끝. 기존 코드 0줄 수정.
```

---

## 6. 에러 흐름

```
Use Case 내부
  ↓ throw new IdentityError(...)
Error Boundary (engine.ts)
  ↓ 그대로 propagate 또는 변환
호스트의 Error Handler
  ↓ safeToExpose 분기
사용자 (메시지 ID) / 로그 (전체)
```

---

## 7. 트랜잭션 흐름

```typescript
// usecase/auth/login.ts (simplified)
await deps.store.transaction(async (tx) => {
  // 1. 사용자 조회
  const user = await userRepo.findById(tx, userId, tenantId);
  // 2. credential 조회
  const credential = await credentialRepo.findByUserId(tx, userId);
  // 3. password verify (read-only, side-effect 없음)
  const ok = await crypto.password.verify(credential.hash, input.password);
  if (!ok) {
    await userRepo.incrementFailure(tx, userId);  // 같은 트랜잭션
    throw new AuthenticationFailedError();
  }
  // 4. session insert
  const session = await sessionRepo.insert(tx, { userId, ... });
  return { session, user };
});

// 트랜잭션 commit 후 이벤트 발행 (실패해도 비즈니스 로직 자체는 성공)
await emitEvent('auth.login.success', { ... }, deps);
```

**핵심**:
- Audit Log는 EventBus를 통해 **트랜잭션 commit 후** 발행
- 비즈니스 mutation과 audit은 같은 트랜잭션이 아님 (의도적 분리)

---

## 8. 캐시 흐름

```
Read path:
  Use Case
    → Cache.get(key)
    → hit? return
    → miss → Repository.find() → Cache.set(key, value, ttl)

Write path (invalidation):
  Use Case (mutation)
    → Repository.update()
    → Cache.delete(key)
```

**캐시 키 컨벤션**:
- `identity:user:<userId>`
- `identity:session:<tokenHash>`
- `identity:policy:<tenantId>`
- `identity:ratelimit:<scope>:<scopeValue>:<route>`

---

## 9. 의존성 그래프

```
                    engine.ts
                       │
              ┌────────┼────────┐
              ↓        ↓        ↓
           usecase   provider  policy
              │        │        │
              ↓        ↓        ↓
           repository       crypto
              │              │
              ↓              ↓
          IEntityStore   KMS/Random
              │
              ↓
           Universal Core (호스트 주입)
```

**규칙**:
- `usecase`는 `repository`, `provider`, `crypto`, `event`를 import 가능
- `repository`는 `crypto`를 import 가능 (해시 검증 위해)
- `domain`은 어떤 것도 import 하지 않음 (순수)
- `provider`는 `domain` + `crypto`만 import
- `engine.ts`만 모든 곳을 import

---

## 10. 성능 고려사항

### 10.1 Argon2id (CPU-bound)

```
메인 스레드에서 실행 시 응답 시간 100-500ms 추가
→ Worker Thread에서 실행 (호스트 환경에서)
→ 또는 batch로 한 번에 여러 검증 (스트레스 시)
```

엔진은 `crypto/password.ts` 인터페이스만 정의. 실제 구현은 호스트가 Worker Thread 관리.

### 10.2 Audit Log 쓰기

```
이벤트 발행은 EventBus.emit() (비동기)
→ 응답은 Audit 발행 완료를 기다리지 않음
→ Audit 실패는 retry queue로 (호스트가 제공)
```

### 10.3 Rate Limit 검사

```
Redis Lua script (atomic):
  INCR key
  EXPIRE key ttl
  → 1 round trip, race condition 없음
```

---

## 11. [TBD: 사장님 확립 필요]

| 항목 | 기본 제안 |
|---|---|
| Worker Thread 정책 (Node) | 호스트가 결정, 엔진은 추상화만 |
| Audit 재시도 정책 | 호스트가 retry queue 제공 |
| 캐시 TTL 기본값 | Policy 5분, Session 만료까지 |
| 캐시 eviction 정책 | 호스트가 결정 (LRU 권장) |
| 트랜잭션 격리 수준 | Read Committed (Postgres 기본) |

---

**End of Module Architecture v1.0**