# event/

> **EventEnvelope + 버전 관리. eventType/version/schemaRef 필수.**

---

## 목적

- 모든 Engine이 동일한 Envelope 구조
- Event 버전 관리 (SemVer)
- Schema Reference (zod schema)

---

## EventEnvelope (사장님 지정 8개 필드)

| 필드 | 용도 |
|---|---|
| `eventId` | UUID v7 — Event 고유 식별 |
| `aggregateId` | 영향받은 Entity ID |
| `occurredAt` | ISO 8601 |
| `version` | SemVer (사장님 확립) |
| `tenantId` | Multi-tenancy |
| `correlationId` | 분산 추적 |
| `causationId` | 인과 관계 |
| `engine` | 발신자 식별 |
| `eventType` | `auth.login.success` 형식 |
| `schemaRef` | zod schema reference |
| `payload` | Event 데이터 |

---

## 사용법

### 1. Event 발행

```ts
import { createEnvelope, type EventEnvelope } from '@platform/core-sdk/event';

const envelope: EventEnvelope<LoginSuccessPayload> = createEnvelope({
  eventId: '01HXXX...', // UUID v7
  aggregateId: 'user-123',
  occurredAt: new Date().toISOString(),
  tenantId: 'tenant-123',
  correlationId: 'req-789',
  causationId: '',
  engine: 'identity',
  eventType: 'auth.login.success',
  schemaRef: 'auth.login.success.v1',
  payload: { userId: 'user-123', sessionId: 'sess-456' },
});

await eventBus.emit(envelope);
```

### 2. Event 구독

```ts
eventBus.on('auth.login.success', async (envelope) => {
  console.log(envelope.tenantId); // tenant-123
  console.log(envelope.payload); // { userId, sessionId }
});
```

### 3. 버전 관리 (사장님 확립)

```
eventType: 'auth.login.success'
version:    '1.0.0'
schemaRef:  'auth.login.success.v1'
```

**호환성 규칙**:
- Major 변경 (1.x → 2.0) → Breaking. ADR 필수.
- Minor 변경 (1.0 → 1.1) → 새 Optional 필드 추가.
- Patch 변경 (1.0.0 → 1.0.1) → 버그 수정.

---

## 예제

자세한 예제: [`examples/`](./examples/)

- `examples/01-create-envelope.ts` — Envelope 생성
- `examples/02-subscribe.ts` — 구독 + 처리
- `examples/03-versioning.ts` — 버전 관리

---

## 하지 말아야 할 사용법

### ❌ Envelope 없이 Event 발행
```ts
eventBus.emit('user-login', { userId }); // 금지 — 타입 안전 X
```

### ✅ Envelope 사용
```ts
eventBus.emit(createEnvelope({ ... })); // 타입 안전 + 버전 관리
```

### ❌ Schema Reference 없이 발행
```ts
eventBus.emit({
  eventType: 'auth.login.success',
  // schemaRef 없음 — 검증 불가
  payload: { ... },
});
```

### ✅ schemaRef 필수
```ts
eventBus.emit(createEnvelope({
  eventType: 'auth.login.success',
  schemaRef: 'auth.login.success.v1',
  payload: { ... },
}));
```

---

**End of event/ README**
