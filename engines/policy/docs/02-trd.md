# Policy Engine — Technical Requirements Document

**Version**: v0.1-draft (사장님 확립 대기)
**Status**: 🟡 Draft
**Companion**: [01-prd.md](./01-prd.md)
**Effective Date**: 2026-07-11 (Sprint 1 동결)

---

## 0. 문서 위치

PRD가 "무엇을" 정의한다면, TRD는 "어떻게 인터페이스를 정의할지"를 정의합니다.

사장님 Platform CTO 확립 (2026-07-11):
> **"구현은 하지 말고 인터페이스만 정의하세요. Policy Engine이 Platform Core의 두 번째 엔진이 될 것입니다."**

이 문서는 **Policy Engine의 인터페이스 명세**에 집중합니다.

---

## 1. 설계 원칙

### 1.1 사장님 확립 헌법 적용

```
C-14 Policy Injection: Engine은 Configuration 직접 조회 금지
C-15 Zero Business Logic in Database: DB는 데이터 저장만
C-16 Event First Architecture: 모든 변경은 Event 발생
```

### 1.2 Engine, Not Application

Policy Engine은 라이브러리다. 단독으로 실행되지 않음. 호스트가 import해서 사용.

### 1.3 Dependency Injection Only

모든 외부 의존성 (DB, Cache, Event Bus)은 명시적 파라미터로 주입.

### 1.4 Pure Resolution (3계층 해결)

해결 알고리즘 자체는 순수 함수. DB/Cache 호출은 Repository가 담당.

---

## 2. 핵심 인터페이스 (사장님 우선 지정)

사장님 Platform CTO가 직접 명시한 3개 인터페이스:

```typescript
// ─────────────────────────────────────────────────
// IPolicyProvider
// ─────────────────────────────────────────────────
// 정책 값을 조회하는 메인 인터페이스
// 3계층 해결: Tenant → Engine → Global

export interface IPolicyProvider {
  /**
   * 정책 값 조회 (3계층 해결)
   * @throws PolicyNotFoundError 정책이 없을 때
   */
  get<T = unknown>(key: PolicyKey): Promise<T>;

  /**
   * 정책 값 조회 (Context 명시)
   * @param context tenantId, engine 등
   */
  get<T = unknown>(context: PolicyContext, key: PolicyKey): Promise<T>;

  /**
   * 정책 존재 여부 확인
   */
  has(key: PolicyKey): Promise<boolean>;
  has(context: PolicyContext, key: PolicyKey): Promise<boolean>;

  /**
   * 정책 메타데이터 (해결 출처 포함)
   */
  getMeta(key: PolicyKey, context?: PolicyContext): Promise<PolicyMeta>;
}

// ─────────────────────────────────────────────────
// IConfigurationProvider
// ─────────────────────────────────────────────────
// 글로벌 설정 조회 + Hot Reload (watch API)

export interface IConfigurationProvider {
  /**
   * 글로벌 설정 값 조회
   */
  get<T = unknown>(key: ConfigKey): Promise<T>;

  /**
   * Context 기반 설정 조회
   */
  get<T = unknown>(context: ConfigContext, key: ConfigKey): Promise<T>;

  /**
   * 설정 변경 감시 (Hot Reload)
   * @returns unsubscribe 함수
   */
  watch<T = unknown>(
    key: ConfigKey,
    callback: (newValue: T, oldValue: T) => void
  ): Unsubscribe;

  /**
   * Context 단위 일괄 감시
   */
  watchAll(
    context: ConfigContext,
    callback: (changes: ConfigChange[]) => void
  ): Unsubscribe;
}

// ─────────────────────────────────────────────────
// ITenantPolicyResolver
// ─────────────────────────────────────────────────
// 특정 Tenant의 모든 정책을 한 번에 해결 (캐시 효율성)

export interface ITenantPolicyResolver {
  /**
   * 특정 Tenant의 특정 Engine 정책 일괄 해결
   * @returns ResolvedPolicySet (key-value 쌍)
   */
  resolveAll(
    tenantId: TenantId,
    engine: EngineName
  ): Promise<ResolvedPolicySet>;

  /**
   * 단일 정책 해결 (3계층)
   */
  resolve<T = unknown>(
    tenantId: TenantId,
    engine: EngineName,
    key: PolicyKey
  ): Promise<PolicyResolution<T>>;

  /**
   * 캐시 무효화
   * @param scope tenantId | engine | global
   */
  invalidate(scope: PolicyInvalidationScope): Promise<void>;
}
```

---

## 3. 보조 타입 (Support Types)

```typescript
// ─────────────────────────────────────────────────
// Policy Keys
// ─────────────────────────────────────────────────

/**
 * 정책 키 — dot-notation (e.g., 'security.password.minLength')
 */
export type PolicyKey = `${string}.${string}.${string}`;

export type ConfigKey = `${string}.${string}`;

// ─────────────────────────────────────────────────
// Context Types
// ─────────────────────────────────────────────────

export interface PolicyContext {
  tenantId?: TenantId;
  engine: EngineName;
  userId?: UserId;
}

export interface ConfigContext {
  tenantId?: TenantId;
  engine?: EngineName;
}

// ─────────────────────────────────────────────────
// Engine Identification
// ─────────────────────────────────────────────────

export type EngineName =
  | 'identity'
  | 'notification'
  | 'media'
  | 'cms'
  | 'booking'
  | 'payment'
  | 'review'
  | 'analytics'
  | 'ai'
  | 'workflow';

// ─────────────────────────────────────────────────
// Resolution Result
// ─────────────────────────────────────────────────

export interface PolicyResolution<T> {
  value: T;
  source: PolicySource;        // 'tenant' | 'engine' | 'global'
  policyId?: string;            // 어디서 왔는지 추적
  resolvedAt: string;           // ISO 8601
  schemaRef?: string;           // zod schema reference
}

export type PolicySource = 'tenant' | 'engine' | 'global';

export interface ResolvedPolicySet {
  tenantId: TenantId;
  engine: EngineName;
  policies: Record<string, PolicyResolution<unknown>>;
  resolvedAt: string;
  version: number;              // 캐시 키
}

export interface PolicyMeta {
  key: PolicyKey;
  source: PolicySource;
  exists: boolean;
  description?: string;
  schemaRef?: string;
  version?: number;
}

// ─────────────────────────────────────────────────
// Hot Reload Types
// ─────────────────────────────────────────────────

export type Unsubscribe = () => void;

export interface ConfigChange {
  key: ConfigKey;
  oldValue: unknown;
  newValue: unknown;
  changedAt: string;
  changedBy: string;
}

export interface PolicyInvalidationScope {
  tenantId?: TenantId;
  engine?: EngineName;
  key?: PolicyKey;
  /** 'all' = 전체 무효화 */
  all?: boolean;
}

// ─────────────────────────────────────────────────
// Error Types
// ─────────────────────────────────────────────────

export class PolicyError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly safeToExpose: boolean;
}

export class PolicyNotFoundError extends PolicyError {
  readonly code = 'POLICY_NOT_FOUND';
  readonly httpStatus = 404;
  readonly safeToExpose = true;
  constructor(key: PolicyKey) {
    super(`Policy not found: ${key}`);
  }
}

export class PolicySchemaError extends PolicyError {
  readonly code = 'POLICY_SCHEMA_INVALID';
  readonly httpStatus = 422;
  readonly safeToExpose = true;
}

export class PolicyConflictError extends PolicyError {
  readonly code = 'POLICY_CONFLICT';
  readonly httpStatus = 409;
  readonly safeToExpose = true;
}
```

---

## 4. Engine 의존성 (호스트 제공)

```typescript
export interface PolicyEngineDeps {
  // 저장소
  store: IEntityStore;                  // Universal Core 추상화
  cache: IPolicyCache;                   // 호스트 제공 (Redis)

  // 이벤트
  events: IEventBus;                     // Universal Core

  // 시간 / 난수 (테스트 가능성)
  clock: IClock;
  random: IRandom;

  // 로깅
  logger: ILogger;
}

// ─────────────────────────────────────────────────
// Cache Interface
// ─────────────────────────────────────────────────

export interface IPolicyCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
  invalidateByPrefix(prefix: string): Promise<number>;
}
```

---

## 5. 해결 알고리즘 (3계층)

```typescript
/**
 * 3계층 해결 알고리즘
 *
 * 사장님 확립 (2026-07-11):
 *   Tenant Policy → Engine Policy → Global Policy
 *
 * @returns 가장 specific한 (가장 위에 있는) 정책 값
 */
async function resolvePolicy<T>(
  tenantId: TenantId,
  engine: EngineName,
  key: PolicyKey,
  deps: PolicyEngineDeps
): Promise<PolicyResolution<T>> {
  // 1. Cache 확인
  const cacheKey = `policy:${tenantId}:${engine}:${key}`;
  const cached = await deps.cache.get<PolicyResolution<T>>(cacheKey);
  if (cached) return cached;

  // 2. Tenant Policy (가장 specific)
  const tenantPolicy = await deps.store.findOne('tenant_policies', {
    tenant_id: tenantId,
    engine,
    key,
  });
  if (tenantPolicy) {
    const resolution: PolicyResolution<T> = {
      value: tenantPolicy.value as T,
      source: 'tenant',
      policyId: tenantPolicy.id,
      resolvedAt: deps.clock.now().toISOString(),
    };
    await deps.cache.set(cacheKey, resolution, 300); // 5분
    return resolution;
  }

  // 3. Engine Policy
  const enginePolicy = await deps.store.findOne('engine_policies', {
    engine,
    key,
  });
  if (enginePolicy) {
    const resolution: PolicyResolution<T> = {
      value: enginePolicy.value as T,
      source: 'engine',
      policyId: enginePolicy.id,
      resolvedAt: deps.clock.now().toISOString(),
    };
    await deps.cache.set(cacheKey, resolution, 300);
    return resolution;
  }

  // 4. Global Policy (가장 general, 항상 존재)
  const globalPolicy = await deps.store.findOne('platform_policies', {
    key,
  });
  if (globalPolicy) {
    const resolution: PolicyResolution<T> = {
      value: globalPolicy.value as T,
      source: 'global',
      policyId: globalPolicy.id,
      resolvedAt: deps.clock.now().toISOString(),
    };
    await deps.cache.set(cacheKey, resolution, 300);
    return resolution;
  }

  // 5. Not found
  throw new PolicyNotFoundError(key);
}
```

---

## 6. Use Case 시나리오 (Identity Engine 예시)

### 6.1 Login 시 Password 검증 정책 가져오기

```typescript
// engines/identity/src/usecase/auth/login.ts
async function loginUseCase(input: LoginInput, ctx: EngineContext) {
  // Policy Engine을 통해 정책 조회 (C-14 준수)
  const minLength = await ctx.policy.get<number>(
    { tenantId: input.tenantId, engine: 'identity' },
    'security.password.minLength'
  );
  // ^ Restaurant Tenant는 8, Tour Tenant는 12, Bank Tenant는 16

  const requireVerification = await ctx.policy.get<boolean>(
    { tenantId: input.tenantId, engine: 'identity' },
    'verification.email.required'
  );

  // 정책을 받아서 비즈니스 로직 수행
  // ... Identity Engine은 policy 값을 알 필요 없음
  //     Policy Engine이 3계층 해결해서 적절한 값 반환
}
```

### 6.2 Engine은 정책 출처를 모름

```typescript
// Identity Engine은 이 정보가 필요 없음:
// - 이 정책이 Tenant Override인지
// - Engine 기본값인지
// - Global 기본값인지
//
// PolicyResolution.source는 Audit/디버깅용으로만 제공
// 비즈니스 로직에는 사용 안 함
```

### 6.3 Hot Reload

```typescript
// Policy Engine을 직접 사용하는 Engine (Admin Console)
const unsubscribe = policy.watch<number>(
  'security.password.minLength',
  (newValue, oldValue) => {
    logger.info('Password policy changed', { newValue, oldValue });
    // 새 값으로 동작 변경
  }
);

// 나중에 정리
unsubscribe();
```

---

## 7. Type-Safe Policy Schema (zod)

```typescript
import { z } from 'zod';

// 모든 Policy Key는 zod schema와 1:1 매핑
export const PolicySchemas = {
  'security.password.minLength': z.number().int().min(8).max(128),
  'security.password.requireUppercase': z.boolean(),
  'security.password.requireLowercase': z.boolean(),
  'security.password.requireNumber': z.boolean(),
  'security.password.requireSpecial': z.boolean(),
  'security.login.maxFailures': z.number().int().min(1).max(100),
  'security.lock.durationMinutes': z.number().int().min(1).max(10080),
  'security.rateLimit.perIP.max': z.number().int().min(1).max(1000),
  'security.rateLimit.perIP.windowSeconds': z.number().int().min(1).max(86400),

  'session.timeoutMinutes': z.number().int().min(5).max(10080),
  'session.rememberMeDays': z.number().int().min(1).max(365),
  'session.maxConcurrent': z.number().int().min(1).nullable(),

  'verification.email.required': z.boolean(),
  'verification.phone.required': z.boolean(),
  'verification.expirationMinutes': z.number().int().min(1).max(60),
  'verification.maxAttempts': z.number().int().min(1).max(10),

  'mfa.required': z.boolean(),
  'mfa.methods': z.array(z.enum(['totp', 'email_otp', 'sms_otp'])),

  'identity.oauth.google.enabled': z.boolean(),
  'identity.oauth.kakao.enabled': z.boolean(),
  // ... 각 Provider별

  // Phase 2: 엔진별 추가 정책
  'notification.email.provider': z.enum(['smtp', 'sendgrid', 'resend']),
  'notification.sms.provider': z.enum(['twilio', 'aligo']),
  'media.storage.provider': z.enum(['s3', 'gcs', 'local']),
  // ...
} as const;

export type PolicySchemas = typeof PolicySchemas;

/**
 * 정책 값 검증
 */
export function validatePolicy<T extends keyof PolicySchemas>(
  key: T,
  value: unknown
): PolicySchemas[T] {
  return PolicySchemas[key].parse(value);
}
```

---

## 8. 이벤트 (C-16 Event First)

Policy Engine은 다음 Event 발행:

| Event | 시점 | Payload | v1.0.0 Payload Schema |
|---|---|---|---|
| `policy.created` | 새 정책 생성 | policyId, key, value, scope, actor |  |
| `policy.updated` | 정책 값 변경 | policyId, key, oldValue, newValue, scope, actor |  |
| `policy.deleted` | 정책 삭제 | policyId, key, scope, actor |  |
| `policy.cache.invalidated` | 캐시 무효화 | tenantId, engine, reason |  |
| `policy.resolved` | (선택, Audit) 3계층 해결 | tenantId, engine, key, source |  |

```typescript
// 이벤트 발행
await deps.events.emit({
  tenantId,
  eventType: 'policy.updated',
  entity: 'policy',
  entityId: policyId,
  payload: {
    key,
    oldValue,
    newValue,
    scope: 'tenant' | 'engine' | 'global',
    actor: 'admin-user-uuid',
  },
  version: '1.0.0',
});
```

---

## 9. 데이터 도메인

```sql
-- Global Policy (Platform 기본값)
CREATE TABLE platform_policies (
  id              uuid PRIMARY KEY,
  key             text NOT NULL UNIQUE,         -- 'security.password.minLength'
  value           jsonb NOT NULL,                -- 정책 값 (DEFAULT 없음, C-15)
  description     text,
  schema_ref      text,                          -- zod schema reference
  created_at      timestamptz NOT NULL DEFAULT clock_timestamp(),  -- C-15 허용
  updated_at      timestamptz NOT NULL DEFAULT clock_timestamp(),  -- C-15 허용
  version         bigint NOT NULL DEFAULT 1                          -- C-15 허용
);

-- Engine Policy (엔진별 기본값)
CREATE TABLE engine_policies (
  id              uuid PRIMARY KEY,
  engine          text NOT NULL,                 -- 'identity', 'notification', ...
  key             text NOT NULL,                 -- 정책 값 (DEFAULT 없음)
  value           jsonb NOT NULL,
  description     text,
  schema_ref      text,
  created_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
  version         bigint NOT NULL DEFAULT 1,
  UNIQUE (engine, key)
);

-- Tenant Policy (테넌트별 override)
CREATE TABLE tenant_policies (
  id              uuid PRIMARY KEY,
  tenant_id       uuid NOT NULL,
  engine          text NOT NULL,
  key             text NOT NULL,                 -- 정책 값 (DEFAULT 없음)
  value           jsonb NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
  version         bigint NOT NULL DEFAULT 1,
  UNIQUE (tenant_id, engine, key)
);

-- Policy Audit (변경 이력)
CREATE TABLE policy_audit (
  id              uuid PRIMARY KEY,
  policy_id       uuid,
  tenant_id       uuid,                          -- null이면 Global/Engine
  engine          text,
  key             text NOT NULL,
  old_value       jsonb,
  new_value       jsonb,
  actor           text NOT NULL,                 -- 'admin-user-uuid' | 'system'
  reason          text,
  created_at      timestamptz NOT NULL DEFAULT clock_timestamp()
);
```

> **C-15 (Zero Business Logic in Database) 준수**:
> - `value` 컬럼에는 DEFAULT 없음 (application이 명시적으로 insert)
> - 기술적 필드 (created_at, updated_at, version)만 DEFAULT

---

## 10. 사장님 확립 결정 사항

| # | 결정 | 사장님 확립 |
|---|---|---|
| 1 | Policy Engine이 Platform의 두 번째 엔진 | ✅ (2026-07-11) |
| 2 | 3계층: Global / Engine / Tenant | ✅ (2026-07-11) |
| 3 | Engine은 Policy Engine을 통해 정책 주입 | ✅ (헌법 §C-14) |
| 4 | DB DEFAULT는 기술 필드만 | ✅ (헌법 §C-15) |
| 5 | Event First Architecture | ✅ (헌법 §C-16) |
| 6 | Restaurant = 8, Tour = 12, Bank = 16 예시 | ✅ (2026-07-11) |
| 7 | Tenant Policy가 가장 specific (우선) | ✅ (2026-07-11) |

---

## 11. 미결정 사항 (사장님 확립 대기)

| # | 결정 | 사장님 확립 |
|---|---|---|
| 1 | Platform Global Default 값 (Password=12, Session=60, etc.) | ❓ |
| 2 | Cache TTL (Policy / Configuration) | ❓ |
| 3 | Hot Reload 방식 (Pub/Sub vs Polling) | ❓ |
| 4 | Policy Versioning 보관 기간 | ❓ |
| 5 | Type-Safe Policy Schema 자동 생성 도구 여부 | ❓ |
| 6 | Policy Engine 인스턴스 위치 (별도 서버 vs 임베디드) | ❓ |
| 7 | 멀티 리전 정책 동기화 (Phase 2+) | ❓ |

---

**End of Policy Engine TRD v0.1-draft**

> 사장님 확립: "Policy Engine이 Platform Core의 두 번째 엔진이 될 것입니다."