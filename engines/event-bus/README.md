# Universal Event Bus

> **Platform Core — Universal Event Bus**
>
> 모든 Engine이 Pub/Sub로 통신하는 중앙 이벤트 버스.
>
> **Industry-Agnostic**

**Version**: 0.1.0 (Draft)
**Phase**: 1

---

## 목적

사장님 확립 (2026-07-11):
> "Event Bus가 먼저 안정되면 이후 엔진들이 훨씬 단순해진다."

```
Identity Engine
      │
      ▼
Universal Event Bus
      │
 ┌────┼────┐
 ▼    ▼    ▼
Notification  Audit  Analytics
```

모든 Engine은 Event Bus를 통해서만 통신 (헌법 §C-10, §C-16).

---

## 기능

- **Publish/Subscribe** — EventEnvelope 기반
- **EventType 필터링** — 정확 매칭 + 와일드카드 (`identity.*`)
- **Tenant 격리** — tenantId 필터
- **재시도** — maxRetries 옵션
- **Dead Letter Queue** — 실패한 이벤트 추적
- **통계** — 발행/전달/실패 카운트

---

## 빠른 시작

```typescript
import { InMemoryEventBus, createEnvelope } from '@platform/engine-event-bus';

const bus = new InMemoryEventBus();

// 구독
bus.on('identity.login.success', async (envelope) => {
  console.log('User logged in:', envelope.payload.accountId);
});

// 와일드카드 구독
bus.subscribe(async (envelope) => {
  console.log('All identity events:', envelope.eventType);
}, { eventPattern: 'identity.*' });

// 발행
await bus.publish(createEnvelope({
  eventId: 'evt-001',
  aggregateId: 'user-123',
  occurredAt: new Date().toISOString(),
  tenantId: 'tenant-a',
  correlationId: 'req-456',
  causationId: '',
  engine: 'identity',
  eventType: 'identity.login.success',
  schemaRef: 'identity.login.success.v1',
  payload: { accountId: 'user-123', sessionId: 'sess-789' },
}));
```

---

## Tests

```bash
pnpm test
```
