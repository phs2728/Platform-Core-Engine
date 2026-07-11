# Logger Context 표준

> **사장님 Platform Owner 확립 (2026-07-11)**
> **처음부터 Context 4개를 Logger에 포함. 모든 Engine이 공유.**

**Version**: v1.0
**Status**: 🔒 FROZEN (헌법 §C-13 + §C-19, 변경은 ADR)
**Effective Date**: 2026-07-11
**Owner**: 사장님 (박흥식 / Tim Park)
**Companion**: [Core SDK PRD/TRD](../../engines/core-sdk/docs/)

---

## 0. 목적

> **처음부터 Context 4개를 Logger에 포함.**
> `tenantId`, `requestId`, `userId`, `engine` — 거의 항상 필요.

```
❌ 금지 — Context 없는 Logger
logger.info('login success')  // 누가? 언제? 어느 Tenant?

✅ 표준 — Context 자동 주입
logger.info('login success', { tenantId, requestId, userId, engine })
```

---

## 1. ILogger 인터페이스 (사장님 확립)

```typescript
/**
 * ILogger — 모든 Engine이 공유
 *
 * 사장님 Platform Owner 확립 (2026-07-11):
 * "Logger도 처음부터 Context를 넣으세요.
 *  tenantId, requestId, userId, engine"
 */

export interface LogContext {
  // === 사장님 확립 4개 (필수) ===
  /** Tenant ID (Multi-tenancy 격리) */
  tenantId?: string;
  /** Request ID (HTTP request trace) */
  requestId?: string;
  /** User ID (인증된 사용자) */
  userId?: string;
  /** Engine 식별자 (Identity, Policy, ...) */
  engine: EngineName;

  // === 추가 컨텍스트 (선택) ===
  /** 추가 필드 (PII 금지) */
  [key: string]: unknown;
}

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface ILogger {
  /** TRACE (가장 상세) */
  trace(msg: string, context?: LogContext): void;

  /** DEBUG (개발용) */
  debug(msg: string, context?: LogContext): void;

  /** INFO (일반 정보) */
  info(msg: string, context?: LogContext): void;

  /** WARN (경고) */
  warn(msg: string, context?: LogContext): void;

  /** ERROR (오류) */
  error(msg: string, error?: Error, context?: LogContext): void;

  /** FATAL (치명적) */
  fatal(msg: string, error?: Error, context?: LogContext): void;

  /** 자식 Logger (Context 상속) */
  child(bindings: Partial<LogContext>): ILogger;
}
```

---

## 2. Logger Context 자동 주입 패턴

### 2.1 Engine 진입점에서 Context 생성

```typescript
// Engine Use Case 진입점
async function loginUseCase(
  input: LoginInput,
  ctx: UseCaseContext,  // Logger, Clock, Policy, Events 포함
): Promise<Result<Session, AuthenticationError>> {
  // Context 자동 주입
  const log = ctx.logger.child({
    tenantId: input.tenantId,
    requestId: input.requestId,
    userId: input.identifier,  // Optional (인증 전)
    engine: 'identity',
  });

  log.info('login attempt', { identifier: input.identifier });
  // ...
}
```

### 2.2 자식 Logger (Bindings 상속)

```typescript
// 기본 Logger (Engine 시작 시)
const baseLogger = logger.child({ engine: 'identity' });

// Tenant별 Logger
const tenantLogger = baseLogger.child({ tenantId: 'tenant-123' });

// Request별 Logger
const requestLogger = tenantLogger.child({ requestId: 'req-456' });

// 이후 모든 호출에 Context 자동 포함
requestLogger.info('login attempt');
// → { engine: 'identity', tenantId: 'tenant-123', requestId: 'req-456' }
```

---

## 3. PII 마스킹 규칙 (헌법 §C-15)

```typescript
/**
 * 자동 PII 마스킹
 * - email: "t***@example.com"
 * - phone: "+995****3456"
 * - password: "***"
 * - token: "<opaque>"
 * - api_key: "<redacted>"
 */
export const PII_FIELDS = new Set([
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'idToken',
  'apiKey',
  'secret',
  'authorization',
  'cookie',
]);

export function maskPII(context: LogContext): LogContext {
  const masked: LogContext = { ...context };
  for (const key of Object.keys(masked)) {
    if (PII_FIELDS.has(key.toLowerCase())) {
      masked[key] = '<redacted>';
    }
  }
  // Email 정규식 마스킹
  if (typeof masked.email === 'string') {
    masked.email = maskEmail(masked.email);
  }
  return masked;
}
```

---

## 4. Logger 구현체 (호스트 제공)

```typescript
/**
 * 호스트가 제공할 Logger 구현체
 * - pino, winston, bunyan 등
 * - JSON Lines 포맷 권장 (production)
 */
export interface ILoggerImpl extends ILogger {
  /** 내부 Logger 인스턴스 (pino 등) */
  readonly inner: unknown;
}
```

---

## 5. Core SDK 책임

Core SDK는 다음을 제공:

1. **ILogger 인터페이스** (위 정의)
2. **PII 마스킹** 헬퍼 (`maskPII`)
3. **Context 빌더** (`createLoggerContext`)

```typescript
// Core SDK 제공
export function createLoggerContext(
  base: LogContext,
  overrides?: Partial<LogContext>,
): LogContext {
  return { ...base, ...overrides };
}
```

Engine은 직접 Logger를 만들지 않음. **Core SDK의 헬퍼 사용**.

---

## 6. Use Case 패턴

```typescript
// ❌ 금지 — Context 없는 Logger
logger.info('User created');

// ❌ 금지 — Engine 식별 없는 Context
logger.info('User created', { tenantId, userId });

// ✅ 표준 — 4개 Context 모두 포함
logger.info('User created', {
  engine: 'identity',  // 필수
  tenantId,            // 거의 항상
  userId,              // 인증 후
  requestId,           // HTTP trace
});
```

---

## 7. 사장님 헌법 준수

- **C-15 Zero Business Logic**: PII 마스킹 강제
- **C-19 Working Software**: Sprint 2B에서 검증
- **§C-17 Stop Designing Rule**: ILogger 필드 변경 시 ADR 필수

---

## 8. 재사용 검증 (사장님 핵심 질문)

> "이 구현이 다음 10개의 엔진에서도 그대로 재사용될 수 있는가?"

✅ **YES** — 모든 Engine의 Logger가 4개 Context 자동 포함:

```typescript
// Identity Engine
logger.info('login attempt', { engine: 'identity', tenantId, requestId, userId });

// Policy Engine
logger.info('policy resolved', { engine: 'policy', tenantId, requestId, policyKey });

// Notification Engine
logger.info('message sent', { engine: 'notification', tenantId, requestId, userId, messageId });
```

---

**End of Logger Context Standard v1.0**

> 사장님 Platform Owner 확립: "Logger도 처음부터 Context를 넣으세요."