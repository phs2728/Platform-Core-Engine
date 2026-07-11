# Event Envelope 표준

> **사장님 Platform Owner 확립 (2026-07-11)**
> **모든 Engine이 공유하는 Event Envelope. Event Bus 경계 표준.**

**Version**: v1.0
**Status**: 🔒 FROZEN (헌법 §C-13 + §C-19, 변경은 ADR)
**Effective Date**: 2026-07-11
**Owner**: 사장님 (박흥식 / Tim Park)
**Companion**: [Core SDK PRD/TRD](../../engines/core-sdk/docs/)

---

## 0. 목적

> **모든 Engine이 동일한 Envelope 구조로 Event를 발행/구독.**
> Event Bus 구현과 무관하게, Engine 코드 표준화.

```
Engine A
   ↓ (publish)
EventEnvelope { eventId, aggregateId, occurredAt, ... }
   ↓
Event Bus (Universal Core)
   ↓
Engine B (subscribe)
```

---

## 1. EventEnvelope (사장님 지정)

```typescript
/**
 * Event Envelope — 모든 Engine이 공유
 *
 * 사장님 Platform Owner 확립 (2026-07-11):
 * "Event Envelope를 먼저 정의하세요.
 *  eventId, aggregateId, occurredAt, version,
 *  tenantId, correlationId, causationId, payload"
 */
export interface EventEnvelope<TPayload = unknown> {
  /** Unique Event ID (UUID v7 — 시간 정렬 가능) */
  readonly eventId: string;

  /** Aggregate ID (User ID, Booking ID, Policy ID 등) */
  readonly aggregateId: string;

  /** Event 발생 시각 (ISO 8601) */
  readonly occurredAt: string;

  /** Event Schema Version (SemVer) */
  readonly version: string;

  /** Tenant ID (Multi-tenancy) */
  readonly tenantId: string;

  /** Correlation ID (분산 추적) */
  readonly correlationId: string;

  /** Causation ID (이 Event를 발생시킨 Event/Command) */
  readonly causationId: string;

  /** Engine 식별자 (Event 발신자) */
  readonly engine: EngineName;

  /** Event Type (e.g., 'auth.login.success') */
  readonly eventType: string;

  /** Payload (Event별 데이터) */
  readonly payload: TPayload;

  /** Schema Reference (zod schema name — 검증용) */
  readonly schemaRef?: string;
}
```

---

## 2. 필드 상세

### 2.1 eventId (필수)

- **타입**: `string` (UUID v7)
- **용도**: Event의 고유 식별자. Idempotency, Deduplication
- **생성**: Engine이 Event 발행 시 생성 (Universal Core가 아님)

### 2.2 aggregateId (필수)

- **타입**: `string` (UUID v7)
- **용도**: Event가 영향을 미친 Entity의 ID
  - User 이벤트: User ID
  - Policy 이벤트: Policy ID (또는 Tenant ID)
  - Booking 이벤트: Booking ID

### 2.3 occurredAt (필수)

- **타입**: `string` (ISO 8601)
- **용도**: Event 발생 시각
- **중요**: 시스템 시각이 아니라 **Engine 시계** (Test 가능)

### 2.4 version (필수)

- **타입**: `string` (SemVer: "1.0.0")
- **용도**: Event Payload Schema 버전
- **호환성**:
  - Major 변경 → Breaking (Consumer 업데이트 필요)
  - Minor 변경 → 하위 호환 (Optional 필드 추가)
  - Patch 변경 → 하위 호환 (버그 수정)

### 2.5 tenantId (필수)

- **타입**: `string` (UUID v7)
- **용도**: Multi-tenancy 격리 (헌법 §C-2)
- **반드시 존재**: Engine은 Tenant 식별 후 Event 발행

### 2.6 correlationId (필수)

- **타입**: `string` (UUID v7)
- **용도**: 분산 추적 (Distributed Tracing)
- **흐름**: HTTP Request → Engine A → Event → Engine B → Event → ... 모두 같은 correlationId

### 2.7 causationId (필수)

- **타입**: `string` (UUID v7) 또는 빈 문자열 `""`
- **용도**: 인과 관계 (이 Event를 발생시킨 직접 원인)
- **첫 Event**: `""` (empty string)
- **파생 Event**: 원인이 된 Event의 `eventId`

### 2.8 engine (필수)

- **타입**: `EngineName` (Policy / Core SDK / Identity / ...)
- **용도**: Event 발신자 식별

### 2.9 eventType (필수)

- **타입**: `string` (dot-notation, e.g., 'auth.login.success')
- **용도**: Consumer의 라우팅 키

### 2.10 payload (필수)

- **타입**: `TPayload` (Engine-specific)
- **용도**: Event의 실제 데이터
- **검증**: `schemaRef`로 zod schema 검증 (선택)

### 2.11 schemaRef (선택)

- **타입**: `string`
- **용도**: Payload 검증을 위한 zod schema reference

---

## 3. Engine Event 발행 패턴

```typescript
import type { EventEnvelope, EngineName } from '@aibg/core-sdk';
import type { LoginSuccessPayload } from './events';

async function emitLoginSuccess(
  aggregateId: string,
  payload: LoginSuccessPayload,
  ctx: EventContext,
): Promise<EventEnvelope<LoginSuccessPayload>> {
  return {
    eventId: generateUuidV7(),
    aggregateId,
    occurredAt: ctx.clock.now().toISOString(),
    version: '1.0.0',
    tenantId: ctx.tenantId,
    correlationId: ctx.correlationId,
    causationId: ctx.causationId ?? '',
    engine: 'identity',
    eventType: 'auth.login.success',
    payload,
    schemaRef: 'auth.login.success.v1',
  };
}
```

---

## 4. Engine Event 구독 패턴

```typescript
eventBus.on('auth.login.success', async (envelope: EventEnvelope<LoginSuccessPayload>) => {
  // envelope.engine === 'identity' 확인
  // envelope.tenantId 격리
  // envelope.payload 검증 (envelope.schemaRef로 zod schema)
  // envelope.correlationId 로깅
});
```

---

## 5. Event Bus와의 관계

```typescript
/**
 * Event Bus는 EventEnvelope를 받아서 Consumer에게 전달
 * Engine은 Envelope를 직접 다루지 않음 (Core SDK가 wrap/unwrap)
 */
export interface IEventBus {
  /** Envelope 발행 */
  publish<T>(envelope: EventEnvelope<T>): Promise<void>;

  /** EventType + Envelope 구독 */
  on<T>(
    eventType: string,
    handler: (envelope: EventEnvelope<T>) => Promise<void>,
  ): Unsubscribe;
}
```

---

## 6. 사장님 헌법 준수

- **C-16 Event First Architecture**: 모든 Event가 Envelope 사용
- **C-19 Working Software**: Sprint 2B (Core SDK)에서 검증
- **§C-17 Stop Designing Rule**: Envelope 필드 변경 시 ADR 필수

---

## 7. 재사용 검증 (사장님 핵심 질문)

> "이 구현이 다음 10개의 엔진에서도 그대로 재사용될 수 있는가?"

✅ **YES** — 모든 Engine의 Event가 이 Envelope 사용:

```typescript
// Identity Engine
EventEnvelope<LoginSuccessPayload>
EventEnvelope<LoginFailurePayload>

// Policy Engine
EventEnvelope<PolicyUpdatedPayload>

// Notification Engine
EventEnvelope<MessageSentPayload>

// Booking Engine (Phase 5)
EventEnvelope<BookingCreatedPayload>
```

---

**End of Event Envelope Standard v1.0**

> 사장님 Platform Owner 확립: "Event Envelope를 먼저 정의하세요."