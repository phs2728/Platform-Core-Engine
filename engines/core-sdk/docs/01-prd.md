# Core SDK — Product Requirements Document

**Version**: v0.1-draft (사장님 확립 대기)
**Status**: 🟡 Draft
**Effective Date**: 2026-07-11
**Owner**: 사장님 (박흥식 / Tim Park)
**Companion**: [README.md](./README.md)

---

## 0. 문서 위치

이 문서는 **Core SDK PRD**입니다. Platform Core의 세 번째 엔진 (실제로는 SDK)로, 모든 엔진에 공통 기능을 제공합니다.

사장님 Product Owner 확립 (2026-07-11):
> **"Core SDK가 Logger, Config, Policy, Errors, Result, Event, Validation을 제공합니다."**

---

## 1. Mission

> **Core SDK는 모든 엔진이 공유하는 공통 기능을 단일화하여, 일관된 동작과 코드 재사용을 보장한다.**

- Engine이 Logger/Config/Errors/Result를 각자 구현하지 않도록 방지
- 모든 Engine이 동일한 로깅 포맷, 에러 처리, Result 타입을 사용
- Audit/Notification 등 횡단 관심사(cross-cutting concern)를 한 곳에서 처리

---

## 2. 책임 범위

### 2.1 In Scope (7개 모듈)

| # | 모듈 | 책임 |
|---|---|---|
| 1 | **Logger** | 구조화 로그 (JSON), 레벨/필드/마스킹 |
| 2 | **Config** | 환경변수 로딩, 검증, 타입 변환 |
| 3 | **Policy** | IPolicyProvider 래퍼 (Policy Engine 호출) |
| 4 | **Errors** | 도메인 에러 계층 (IdentityError, PolicyError 등) |
| 5 | **Result** | Type-safe Result<T, E> (성공/실패) |
| 6 | **Event** | IEventBus 래퍼 (Universal Core 호출) |
| 7 | **Validation** | zod 스키마 통합 |

### 2.2 Out of Scope

- ❌ 도메인 로직 (각 Engine의 책임)
- ❌ 데이터 저장 (DB 접근은 Engine의 Repository)
- ❌ HTTP 핸들러 (호스트 책임)
- ❌ 인증/세션 (Identity Engine 책임)
- ❌ 정책 값 자체 (Policy Engine 책임)

---

## 3. 모듈별 요구사항

### 3.1 Logger

- 구조화 로그 (JSON Lines)
- 레벨: trace, debug, info, warn, error
- 필드: timestamp, level, tenantId?, userId?, requestId?, message, context
- **PII 마스킹** 강제 (email, phone, password, token)
- 호스트가 logger 구현 주입 (pino, winston 등)

```typescript
interface ILogger {
  trace(msg: string, context?: Record<string, unknown>): void;
  debug(msg: string, context?: Record<string, unknown>): void;
  info(msg: string, context?: Record<string, unknown>): void;
  warn(msg: string, context?: Record<string, unknown>): void;
  error(msg: string, error?: Error, context?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): ILogger;
}
```

### 3.2 Config

- 환경변수 로딩 (zod 스키마)
- Boot-time vs Runtime 구분
- 타입 안전 (compile-time + runtime)

```typescript
interface IConfigProvider {
  get<T>(key: string): T;
  get<T>(key: string, defaultValue: T): T;
  require<T>(key: string): T;  // 없으면 throw
}
```

### 3.3 Policy

- IPolicyProvider 래퍼
- Policy Engine 호출 (헌법 §C-14)
- 캐싱 (호스트 제공)
- Hot Reload 옵션

```typescript
interface IPolicy {
  get<T>(key: PolicyKey): Promise<T>;
  get<T>(context: PolicyContext, key: PolicyKey): Promise<T>;
  has(key: PolicyKey, context?: PolicyContext): Promise<boolean>;
}
```

### 3.4 Errors

- 도메인 에러 계층 (abstract base)
- HTTP status, error code, safeToExpose

```typescript
abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
  readonly safeToExpose: boolean;
}

// 구체 에러 (각 Engine이 정의)
// IdentityError, PolicyError, NotificationError, etc.
```

### 3.5 Result

- Type-safe 성공/실패 타입
- 예외 대신 Result 사용 (성공 경로 명시)

```typescript
type Result<T, E = DomainError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// 사용
const result: Result<User, AuthenticationError> = await loginUseCase(input);
if (result.ok) {
  // 성공
} else {
  // 실패 (타입 안전)
}
```

### 3.6 Event

- IEventBus 래퍼 (Universal Core 호출)
- Type-safe 이벤트 발행/구독
- 헌법 §C-16 Event First Architecture 준수

```typescript
interface IEventEmitter {
  emit<T>(eventType: EventType, payload: T): Promise<void>;
  emit<T>(eventType: EventType, context: EventContext, payload: T): Promise<void>;
}

interface IEventSubscriber {
  on<T>(eventType: EventType, handler: (event: SystemEvent<T>) => Promise<void>): Unsubscribe;
}
```

### 3.7 Validation

- zod 스키마 통합
- 도메인 검증 (이메일 정규화, 전화번호 등)
- 에러 메시지 다국어 (messageId)

```typescript
import { z } from 'zod';

const emailSchema = z.string().email().max(254);
const passwordSchema = z.string().min(12).max(1024);

function validate<T>(schema: z.ZodSchema<T>, input: unknown): Result<T, ValidationError> {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, value: result.data };
  return { ok: false, error: new ValidationError(result.error) };
}
```

---

## 4. 사용 패턴

### 4.1 Engine Use Case에서 사용

```typescript
// engines/identity/src/usecase/auth/login.ts
import { IPolicy, ILogger, Result, DomainError, IEventEmitter } from '@aibg/core-sdk';

async function loginUseCase(
  input: LoginInput,
  ctx: { policy: IPolicy; logger: ILogger; events: IEventEmitter }
): Promise<Result<LoginSuccess, AuthenticationError>> {
  const minLength = await ctx.policy.get<number>(
    { tenantId: input.tenantId, engine: 'identity' },
    'security.password.minLength'
  );
  // ...
  await ctx.events.emit('auth.login.success', { userId, sessionId });
  ctx.logger.info('login succeeded', { userId });
  return { ok: true, value: { session, user } };
}
```

### 4.2 Engine은 Core SDK만 import

```typescript
// engines/identity/src/usecase/auth/login.ts
import { ILogger, IPolicy, IEventEmitter } from '@aibg/core-sdk';
// engines/notification/, engines/booking/ 등을 import ❌
```

---

## 5. 인터페이스 명세

전체 인터페이스는 [02-trd.md](./02-trd.md)에 정의됨 (사장님 명령: "구현은 하지 말고 인터페이스만 정의").

---

## 6. 사장님 확립 결정 사항

| # | 결정 | 사장님 확립 |
|---|---|---|
| 1 | Core SDK는 Platform Core의 세 번째 엔진 | ✅ (2026-07-11) |
| 2 | 7개 모듈 (Logger, Config, Policy, Errors, Result, Event, Validation) | ✅ (2026-07-11) |
| 3 | 모든 Engine이 Core SDK를 import | ✅ (2026-07-11) |
| 4 | Engine끼리 직접 import 금지 (Core SDK 경유) | ✅ (헌법 §C-10) |
| 5 | 개발 순서: Policy → Core SDK → Identity | ✅ (2026-07-11) |

---

## 7. 미결정 사항 (사장님 확립 대기)

| # | 결정 | Allowed Values | Recommended | Status |
|---|---|---|---|---|
| 1 | Logger 구현체 (pino vs bunyan vs winston) | `pino` / `bunyan` / `winston` | `pino` (성능) | 🟥 Draft |
| 2 | Log format (JSON vs pretty) | `json` / `pretty` | `json` (prod) | 🟥 Draft |
| 3 | Result의 default error type | `Error` / `DomainError` | `DomainError` | 🟥 Draft |
| 4 | Validation 에러 메시지 (i18n) | `messageId` (Core SDK) / 호스트 책임 | `messageId` | 🟥 Draft |
| 5 | Policy 캐시 TTL | `60` / `300` / `600` 초 | `300` (5분) | 🟥 Draft |

---

**End of Core SDK PRD v0.1-draft**