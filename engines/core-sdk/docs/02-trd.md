# Core SDK — Technical Requirements Document

**Version**: v0.1-draft (사장님 확립 대기)
**Status**: 🟡 Draft
**Companion**: [01-prd.md](./01-prd.md)
**Effective Date**: 2026-07-11

---

## 0. 문서 위치

PRD가 "무엇을" 정의한다면, TRD는 "어떻게 인터페이스를 정의할지"를 정의합니다.

사장님 Product Owner 확립 (2026-07-11):
> **"Policy Engine 인터페이스만 정의하세요. Core SDK도 인터페이스만 정의하세요."**

이 문서는 **7개 모듈의 인터페이스 명세**에 집중합니다.

---

## 1. 설계 원칙

### 1.1 SDK, Not Engine

- Core SDK는 **Engine이 아님** (도메인 지식 없음)
- 모든 Engine이 import하는 **공통 라이브러리**
- 호스트는 Core SDK를 통해 모든 Engine에 일관된 기능 제공

### 1.2 Engine, Not Application

- Core SDK도 단독 실행 안 됨
- Engine이 import해서 사용
- 호스트가 Engine을 import할 때 Core SDK도 함께 wiring

### 1.3 Dependency Injection Only

- 7개 모듈 모두 **인터페이스 + 호스트 구현체**
- pino, zod, Universal Core 등을 Core SDK가 직접 import하지 않음 (호스트 주입)
- 테스트 가능성 (mock 가능)

### 1.4 Type-Safety First

- 모든 인터페이스는 TypeScript로 정의
- 제네릭으로 타입 안전 보장
- 런타임 검증은 Validation 모듈이 담당

---

## 2. 모듈별 인터페이스

### 2.1 Logger

```typescript
// ─────────────────────────────────────────────────
// ILogger (사장님 확립, 2026-07-11)
// ─────────────────────────────────────────────────

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
  // 호스트 정의 추가 필드 가능 (tenantId, userId, requestId 등)
}

export interface ILogger {
  trace(msg: string, context?: LogContext): void;
  debug(msg: string, context?: LogContext): void;
  info(msg: string, context?: LogContext): void;
  warn(msg: string, context?: LogContext): void;
  error(msg: string, error?: Error, context?: LogContext): void;
  fatal(msg: string, error?: Error, context?: LogContext): void;

  /** 자식 logger (binding 상속) */
  child(bindings: Record<string, unknown>): ILogger;
}

// ─────────────────────────────────────────────────
// PII 마스킹 규칙 (사장님 확립, 헌법 §C-15)
// ─────────────────────────────────────────────────
// - email: "t***@example.com"
// - phone: "+995****3456"
// - password: "***"
// - token: "<opaque>" (전체 마스킹)
// - api_key: "<redacted>"
```

### 2.2 Config

```typescript
// ─────────────────────────────────────────────────
// IConfigProvider
// ─────────────────────────────────────────────────

export interface IConfigProvider {
  /** 설정 값 조회 (없으면 defaultValue) */
  get<T = string>(key: string, defaultValue?: T): T;

  /** 설정 값 조회 (없으면 throw) */
  require<T = string>(key: string): T;

  /** 타입 검증 (zod schema) */
  parse<T>(schema: import('zod').ZodSchema<T>): T;

  /** 환경 이름 */
  getEnv(): 'development' | 'staging' | 'production' | 'test';
}

// ─────────────────────────────────────────────────
// 환경변수 명명 규칙
// ─────────────────────────────────────────────────
// <ENGINE>_<SECTION>_<KEY>
// 예: IDENTITY_DB_URL, IDENTITY_CACHE_URL, IDENTITY_JWT_ISSUER
```

### 2.3 Policy (C-14 Policy Injection)

```typescript
// ─────────────────────────────────────────────────
// IPolicy
// ─────────────────────────────────────────────────

export type PolicyKey = `${string}.${string}.${string}`;

export interface PolicyContext {
  tenantId?: string;
  engine: 'identity' | 'notification' | 'media' | 'cms' | 'booking' |
          'payment' | 'review' | 'analytics' | 'ai' | 'workflow';
  userId?: string;
}

export interface PolicyResolution<T> {
  value: T;
  source: 'tenant' | 'engine' | 'global';
  resolvedAt: string;
}

export class PolicyNotFoundError extends Error {
  readonly code = 'POLICY_NOT_FOUND';
}

export interface IPolicy {
  /**
   * 정책 값 조회 (3계층 해결)
   * @throws PolicyNotFoundError
   */
  get<T = unknown>(key: PolicyKey): Promise<T>;
  get<T = unknown>(context: PolicyContext, key: PolicyKey): Promise<T>;

  /** 정책 존재 여부 */
  has(key: PolicyKey, context?: PolicyContext): Promise<boolean>;

  /** 메타데이터 (해결 출처) */
  resolve<T = unknown>(
    context: PolicyContext,
    key: PolicyKey
  ): Promise<PolicyResolution<T>>;
}
```

### 2.4 Errors

```typescript
// ─────────────────────────────────────────────────
// DomainError (abstract base)
// ─────────────────────────────────────────────────

export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
  readonly safeToExpose: boolean;
  readonly context?: Record<string, unknown>;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message);
    this.context = context;
    this.name = this.constructor.name;
  }
}

// ─────────────────────────────────────────────────
// 표준 에러 계층
// ─────────────────────────────────────────────────

export class ValidationError extends DomainError {
  readonly code = 'IDENTITY_VALIDATION_FAILED';
  readonly httpStatus = 400;
  readonly safeToExpose = true;
}

export class AuthenticationFailedError extends DomainError {
  readonly code = 'IDENTITY_AUTH_FAILED';
  readonly httpStatus = 401;
  readonly safeToExpose = true;
}

export class AccountLockedError extends DomainError {
  readonly code = 'IDENTITY_ACCOUNT_LOCKED';
  readonly httpStatus = 423;
  readonly safeToExpose = true;
}

export class RateLimitedError extends DomainError {
  readonly code = 'IDENTITY_RATE_LIMITED';
  readonly httpStatus = 429;
  readonly safeToExpose = true;
}

export class InternalError extends DomainError {
  readonly code = 'IDENTITY_INTERNAL_ERROR';
  readonly httpStatus = 500;
  readonly safeToExpose = false;  // 내부 에러, 클라이언트에 상세 노출 안 함
}
```

### 2.5 Result

```typescript
// ─────────────────────────────────────────────────
// Result<T, E> — Type-safe 성공/실패
// ─────────────────────────────────────────────────

export type Result<T, E extends DomainError = DomainError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// ─────────────────────────────────────────────────
// 유틸리티
// ─────────────────────────────────────────────────

export const Result = {
  ok<T>(value: T): Result<T, never> {
    return { ok: true, value };
  },

  err<E extends DomainError>(error: E): Result<never, E> {
    return { ok: false, error };
  },

  /** Promise를 Result로 변환 */
  async fromPromise<T>(promise: Promise<T>): Promise<Result<T, InternalError>> {
    try {
      return Result.ok(await promise);
    } catch (e) {
      if (e instanceof DomainError) {
        return Result.err(e);
      }
      return Result.err(new InternalError((e as Error).message));
    }
  },

  /** Result.map (성공 시에만 함수 적용) */
  map<T, U, E extends DomainError>(
    result: Result<T, E>,
    fn: (value: T) => U
  ): Result<U, E> {
    return result.ok ? Result.ok(fn(result.value)) : result;
  },

  /** Result.flatMap (비동기) */
  async flatMap<T, U, E extends DomainError>(
    result: Result<T, E>,
    fn: (value: T) => Promise<Result<U, E>>
  ): Promise<Result<U, E>> {
    return result.ok ? await fn(result.value) : result;
  },
} as const;
```

### 2.6 Event (C-16 Event First)

```typescript
// ─────────────────────────────────────────────────
// IEventEmitter / IEventSubscriber
// ─────────────────────────────────────────────────

export interface EventEnvelope<T> {
  id: string;
  tenantId?: string;
  eventType: string;
  entity?: string;
  entityId?: string;
  payload: T;
  version: string;        // SemVer
  timestamp: string;      // ISO 8601
}

export interface EventContext {
  tenantId?: string;
  userId?: string;
  requestId?: string;
  traceId?: string;
}

export interface IEventEmitter {
  emit<T>(eventType: string, payload: T): Promise<void>;
  emit<T>(eventType: string, context: EventContext, payload: T): Promise<void>;
}

export type Unsubscribe = () => void;

export interface IEventSubscriber {
  on<T>(
    eventType: string,
    handler: (event: EventEnvelope<T>) => Promise<void>
  ): Unsubscribe;

  once<T>(
    eventType: string,
    handler: (event: EventEnvelope<T>) => Promise<void>
  ): Unsubscribe;
}
```

### 2.7 Validation (zod 통합)

```typescript
// ─────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────

import type { ZodSchema } from 'zod';

export interface ValidationContext {
  /** 다국어 메시지 ID prefix (e.g., 'auth.required.email') */
  messageIdPrefix?: string;
}

export function validate<T>(
  schema: ZodSchema<T>,
  input: unknown,
  context?: ValidationContext
): Result<T, ValidationError> {
  const result = schema.safeParse(input);
  if (result.success) {
    return Result.ok(result.data);
  }
  const violations = result.error.errors.map((e) => ({
    path: e.path.join('.'),
    message: e.message,
    code: e.code,
  }));
  return Result.err(new ValidationError('Validation failed', { violations }));
}

// ─────────────────────────────────────────────────
// 도메인 검증 함수
// ─────────────────────────────────────────────────

export const Email = {
  /** RFC 5321 + 도메인 검증 */
  schema: (): ZodSchema<string> => {
    // zod는 별도 import (호스트 환경)
    throw new Error('Core SDK는 zod schema를 import하지 않음. 호스트가 zod 인스턴스 주입.');
  },
  normalize(raw: string): string {
    // 표준 normalize 로직
    const [local, domain] = raw.toLowerCase().trim().split('@');
    if (!local || !domain) throw new Error('Invalid email');
    return `${local}@${domain}`;
  },
};

export const Phone = {
  normalize(raw: string, defaultCountry: string = 'US'): string {
    // E.164 형식
    // libphonenumber는 호스트가 주입
    throw new Error('Phone normalization은 호스트 주입 libphonenumber 필요.');
  },
};
```

---

## 3. SDK 진입점

```typescript
// engines/core-sdk/src/index.ts
export * from './logger';
export * from './config';
export * from './policy';
export * from './errors';
export * from './result';
export * from './event';
export * from './validation';

// SDK 팩토리
export interface CoreSDKDeps {
  logger: ILogger;                  // 호스트 주입 (pino 등)
  config: IConfigProvider;          // 호스트 주입
  policy: IPolicy;                  // Policy Engine (또는 mock)
  events: IEventEmitter;            // Universal Core EventBus
}

export function createCoreSDK(deps: CoreSDKDeps) {
  return {
    logger: deps.logger,
    config: deps.config,
    policy: deps.policy,
    events: deps.events,
  };
}
```

---

## 4. Engine 통합 패턴

```typescript
// engines/identity/src/engine.ts
import { createCoreSDK, IPolicy, ILogger, IEventEmitter } from '@aibg/core-sdk';

export interface IdentityEngineDeps extends CoreSDKDeps {
  // Identity-specific
  store: IEntityStore;
  crypto: ICryptoProvider;
  cache: ICache;
}

export function createIdentityEngine(deps: IdentityEngineDeps) {
  const sdk = createCoreSDK(deps);
  return {
    // Use Case
    async login(input: LoginInput): Promise<Result<LoginSuccess, AuthenticationFailedError>> {
      const minLength = await sdk.policy.get<number>(
        { tenantId: input.tenantId, engine: 'identity' },
        'security.password.minLength'
      );
      sdk.logger.info('login attempt', { tenantId: input.tenantId });
      // ... use case logic ...
      await sdk.events.emit('auth.login.success', { userId, sessionId });
      return Result.ok({ session, user });
    },
  };
}
```

---

## 5. 사장님 확립 결정 사항

| # | 결정 | 사장님 확립 |
|---|---|---|
| 1 | Core SDK = Platform의 세 번째 엔진 | ✅ (2026-07-11) |
| 2 | 7개 모듈 (Logger/Config/Policy/Errors/Result/Event/Validation) | ✅ (2026-07-11) |
| 3 | 모든 Engine이 Core SDK를 import | ✅ (2026-07-11) |
| 4 | Engine끼리 직접 import 금지 (Core SDK 경유) | ✅ (헌법 §C-10) |
| 5 | 개발 순서: Policy → Core SDK → Identity | ✅ (2026-07-11) |
| 6 | Result<T, E> 사용 (예외 대신) | ✅ (2026-07-11) |
| 7 | PII 자동 마스킹 (Logger) | ✅ (헌법 §C-15) |
| 8 | Event First Architecture | ✅ (헌법 §C-16) |

---

## 6. 미결정 사항 (사장님 확립 대기)

| # | 결정 | Allowed Values | Recommended | Status |
|---|---|---|---|---|
| 1 | Logger 구현체 | `pino` / `bunyan` / `winston` | `pino` | 🟥 Draft |
| 2 | Log format | `json` / `pretty` | `json` (prod) | 🟥 Draft |
| 3 | Result default error | `Error` / `DomainError` | `DomainError` | 🟥 Draft |
| 4 | Validation 메시지 | `messageId` (Core) / 호스트 | `messageId` | 🟥 Draft |
| 5 | Policy 캐시 TTL | `60` / `300` / `600` 초 | `300` | 🟥 Draft |
| 6 | 이벤트 버전 정책 | `SemVer` / `CalVer` | `SemVer` | 🟥 Draft |

---

**End of Core SDK TRD v0.1-draft**

> 사장님 Product Owner 확립: "Core SDK가 Platform Core의 세 번째 엔진이 될 것입니다."