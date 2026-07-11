import { describe, it, expect } from 'vitest';
import { InMemoryEventBus, createEnvelope, type EventEnvelope } from '../src/index.js';

describe('Universal Event Bus', () => {
  it('publish/subscribe: 기본 전달', async () => {
    const bus = new InMemoryEventBus();
    const received: EventEnvelope<unknown>[] = [];

    bus.on('test.event', async (envelope) => {
      received.push(envelope as EventEnvelope<unknown>);
    });

    const envelope = createEnvelope({
      eventId: 'evt-1',
      aggregateId: 'agg-1',
      occurredAt: new Date().toISOString(),
      tenantId: 't-1',
      correlationId: 'corr-1',
      causationId: '',
      engine: 'test',
      eventType: 'test.event',
      schemaRef: 'test.event.v1',
      payload: { hello: 'world' },
    });

    await bus.publish(envelope);

    expect(received).toHaveLength(1);
    expect(received[0]!.payload).toEqual({ hello: 'world' });
  });

  it('eventType 필터: 다른 eventType은 무시', async () => {
    const bus = new InMemoryEventBus();
    const received: string[] = [];

    bus.on('a.event', async () => { received.push('a'); });
    bus.on('b.event', async () => { received.push('b'); });

    await bus.publish(createEnvelope({
      eventId: 'e-1', aggregateId: 'a', occurredAt: new Date().toISOString(),
      tenantId: 't', correlationId: 'c', causationId: '', engine: 'test',
      eventType: 'a.event', schemaRef: 'v1', payload: {},
    }));

    expect(received).toEqual(['a']);
  });

  it('와일드카드 패턴: identity.* 매칭', async () => {
    const bus = new InMemoryEventBus();
    const received: string[] = [];

    bus.subscribe(async (e) => { received.push(e.eventType); }, { eventPattern: 'identity.*' });

    await bus.publish(createEnvelope({
      eventId: 'e-1', aggregateId: 'a', occurredAt: new Date().toISOString(),
      tenantId: 't', correlationId: 'c', causationId: '', engine: 'identity',
      eventType: 'identity.login.success', schemaRef: 'v1', payload: {},
    }));
    await bus.publish(createEnvelope({
      eventId: 'e-2', aggregateId: 'a', occurredAt: new Date().toISOString(),
      tenantId: 't', correlationId: 'c', causationId: '', engine: 'other',
      eventType: 'other.something', schemaRef: 'v1', payload: {},
    }));

    expect(received).toEqual(['identity.login.success']);
  });

  it('Tenant 필터: 다른 tenant 이벤트 무시', async () => {
    const bus = new InMemoryEventBus();
    const received: string[] = [];

    bus.subscribe(async (e) => { received.push(e.tenantId); }, { tenantId: 'tenant-a' });

    await bus.publish(createEnvelope({
      eventId: 'e-1', aggregateId: 'a', occurredAt: new Date().toISOString(),
      tenantId: 'tenant-a', correlationId: 'c', causationId: '', engine: 'test',
      eventType: 'test.event', schemaRef: 'v1', payload: {},
    }));
    await bus.publish(createEnvelope({
      eventId: 'e-2', aggregateId: 'a', occurredAt: new Date().toISOString(),
      tenantId: 'tenant-b', correlationId: 'c', causationId: '', engine: 'test',
      eventType: 'test.event', schemaRef: 'v1', payload: {},
    }));

    expect(received).toEqual(['tenant-a']);
  });

  it('Dead Letter Queue: 핸들러 실패 시 기록', async () => {
    const bus = new InMemoryEventBus();

    bus.subscribe(async () => { throw new Error('Handler failed'); }, {
      eventType: 'failing.event',
      maxRetries: 2,
    });

    await bus.publish(createEnvelope({
      eventId: 'e-1', aggregateId: 'a', occurredAt: new Date().toISOString(),
      tenantId: 't', correlationId: 'c', causationId: '', engine: 'test',
      eventType: 'failing.event', schemaRef: 'v1', payload: {},
    }));

    const dlq = bus.getDeadLetters();
    expect(dlq).toHaveLength(1);
    expect(dlq[0]!.error).toBe('Handler failed');
    expect(dlq[0]!.attempts).toBe(3); // 1 initial + 2 retries
  });

  it('Unsubscribe: 구독 해제 후 이벤트 미수신', async () => {
    const bus = new InMemoryEventBus();
    const received: string[] = [];

    const unsub = bus.on('test.event', async (e) => { received.push(e.eventId); });

    await bus.publish(createEnvelope({
      eventId: 'e-1', aggregateId: 'a', occurredAt: new Date().toISOString(),
      tenantId: 't', correlationId: 'c', causationId: '', engine: 'test',
      eventType: 'test.event', schemaRef: 'v1', payload: {},
    }));
    expect(received).toHaveLength(1);

    unsub();

    await bus.publish(createEnvelope({
      eventId: 'e-2', aggregateId: 'a', occurredAt: new Date().toISOString(),
      tenantId: 't', correlationId: 'c', causationId: '', engine: 'test',
      eventType: 'test.event', schemaRef: 'v1', payload: {},
    }));
    expect(received).toHaveLength(1); // 여전히 1
  });

  it('통계: 발행/전달/실패 카운트', async () => {
    const bus = new InMemoryEventBus();

    bus.on('ok.event', async () => {});
    bus.subscribe(async () => { throw new Error('fail'); }, {
      eventType: 'bad.event',
      maxRetries: 0,
    });

    await bus.publish(createEnvelope({
      eventId: 'e-1', aggregateId: 'a', occurredAt: new Date().toISOString(),
      tenantId: 't', correlationId: 'c', causationId: '', engine: 'test',
      eventType: 'ok.event', schemaRef: 'v1', payload: {},
    }));
    await bus.publish(createEnvelope({
      eventId: 'e-2', aggregateId: 'a', occurredAt: new Date().toISOString(),
      tenantId: 't', correlationId: 'c', causationId: '', engine: 'test',
      eventType: 'bad.event', schemaRef: 'v1', payload: {},
    }));

    const stats = bus.getStats();
    expect(stats.totalPublished).toBe(2);
    expect(stats.totalDelivered).toBe(1);
    expect(stats.totalFailed).toBe(1);
    expect(stats.deadLetters).toBe(1);
    expect(stats.activeSubscribers).toBe(2);
  });
});
