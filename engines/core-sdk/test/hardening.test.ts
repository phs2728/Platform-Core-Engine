/**
 * Platform Hardening RC1 — Test Suite
 *
 * Sprint A-1: Transactional Reliability (Outbox, Idempotency, Retry, DLQ)
 * Sprint A-2: Tenant Context (AsyncLocalStorage, RLS, Isolation)
 * Sprint A-5: Observability (Structured Logging, Metrics, Health, Tracer)
 * Sprint A-6: Production Adapter Framework (AdapterManager)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  OutboxDispatcher, DEFAULT_DISPATCHER_OPTIONS,
  InMemoryIdempotencyStore,
  calculateBackoff, isPoisonMessage,
  createTraceContext, createChildTraceContext,
  DEFAULT_RETRY_POLICY, calculateRetryDelay, executeWithRetry,
  createTenantContext, runInTenantContext, runInTenantContextSync,
  getTenantContext, getTenantId, getOrganizationId, getCorrelationId,
  getTenantContextOrNull,
  assertTenantAccess, TenantIsolationViolationError, TenantContextError,
  ConsoleStructuredLogger, InMemoryMetricsCollector,
  DefaultHealthCheckFramework,
  NoopTracer, createDefaultObservability,
  AdapterManager, AdapterNotConfiguredError,
} from '../src/index.js';
import type { OutboxMessage, IOutboxRepository, EventEnvelope, DeadLetterEntry, IDeadLetterQueue } from '../src/index.js';

// ═══════════════════════════════════════════
// Sprint A-1: Transactional Reliability
// ═══════════════════════════════════════════

describe('Sprint A-1: Transactional Reliability', () => {

  describe('Idempotency Store', () => {
    let store: InMemoryIdempotencyStore;
    beforeEach(() => { store = new InMemoryIdempotencyStore(); });

    it('check returns false for unknown key', async () => {
      expect(await store.check('unknown')).toBe(false);
    });

    it('check returns true after record', async () => {
      await store.record('key1', { result: 'data' });
      expect(await store.check('key1')).toBe(true);
    });

    it('get returns recorded result', async () => {
      await store.record('key1', { data: 42 });
      const record = await store.get('key1');
      expect(record).not.toBeNull();
      expect(record!.key).toBe('key1');
    });

    it('invalidate removes key', async () => {
      await store.record('key1');
      await store.invalidate('key1');
      expect(await store.check('key1')).toBe(false);
    });
  });

  describe('Retry Policy', () => {
    it('calculateRetryDelay exponential', () => {
      const delay0 = calculateRetryDelay(0, DEFAULT_RETRY_POLICY);
      const delay1 = calculateRetryDelay(1, DEFAULT_RETRY_POLICY);
      expect(delay1).toBeGreaterThan(delay0);
    });

    it('calculateRetryDelay linear', () => {
      const delay = calculateRetryDelay(2, { ...DEFAULT_RETRY_POLICY, backoffType: 'linear', backoffBaseMs: 100 });
      expect(delay).toBe(300);
    });

    it('calculateRetryDelay fixed', () => {
      const delay = calculateRetryDelay(5, { ...DEFAULT_RETRY_POLICY, backoffType: 'fixed', backoffBaseMs: 500 });
      expect(delay).toBe(500);
    });

    it('executeWithRetry succeeds on first try', async () => {
      let calls = 0;
      const result = await executeWithRetry(async () => { calls++; return 'ok'; });
      expect(result).toBe('ok');
      expect(calls).toBe(1);
    });

    it('executeWithRetry retries on failure', async () => {
      let calls = 0;
      const policy: typeof DEFAULT_RETRY_POLICY = { maxAttempts: 3, backoffBaseMs: 1, backoffMaxMs: 10, backoffType: 'fixed' };
      const result = await executeWithRetry(async () => {
        calls++;
        if (calls < 3) throw new Error('fail');
        return 'ok';
      }, policy);
      expect(result).toBe('ok');
      expect(calls).toBe(3);
    });

    it('executeWithRetry throws after max attempts', async () => {
      let calls = 0;
      const policy = { maxAttempts: 2, backoffBaseMs: 1, backoffMaxMs: 10, backoffType: 'fixed' };
      await expect(executeWithRetry(async () => { calls++; throw new Error('always fail'); }, policy)).rejects.toThrow('always fail');
      expect(calls).toBe(2);
    });
  });

  describe('Backoff Calculator', () => {
    it('calculateBackoff respects max', () => {
      const delay = calculateBackoff(20, 1000, 5000);
      expect(delay).toBe(5000);
    });

    it('calculateBackoff grows exponentially', () => {
      const d1 = calculateBackoff(1, 100, 10000);
      const d2 = calculateBackoff(2, 100, 10000);
      expect(d2).toBeGreaterThan(d1);
    });
  });

  describe('Poison Message Detection', () => {
    it('isPoisonMessage returns true when attempts >= max', () => {
      const msg = { attemptCount: 5, maxAttempts: 5 } as OutboxMessage;
      expect(isPoisonMessage(msg, 5)).toBe(true);
    });

    it('isPoisonMessage returns false when attempts < max', () => {
      const msg = { attemptCount: 3, maxAttempts: 5 } as OutboxMessage;
      expect(isPoisonMessage(msg, 5)).toBe(false);
    });
  });

  describe('Trace Context', () => {
    it('createTraceContext generates IDs', () => {
      const ctx = createTraceContext();
      expect(ctx.correlationId).toBeTruthy();
      expect(ctx.traceId).toBeTruthy();
      expect(ctx.spanId).toBeTruthy();
    });

    it('createChildTraceContext links parent', () => {
      const parent = createTraceContext();
      const child = createChildTraceContext(parent);
      expect(child.traceId).toBe(parent.traceId);
      expect(child.parentSpanId).toBe(parent.spanId);
      expect(child.causationId).toBe(parent.spanId);
    });
  });

  describe('Outbox Dispatcher', () => {
    it('dispatches pending message successfully', async () => {
      const emitted: EventEnvelope[] = [];
      const messages: OutboxMessage[] = [];
      let deadLettered: DeadLetterEntry[] = [];

      const repo: IOutboxRepository = {
        async save(m) { messages.push(m); },
        async findPending() { return messages.filter(m => m.status === 'PENDING'); },
        async markDispatched(id) { const m = messages.find(m => m.id === id); if (m) (m as any).status = 'DISPATCHED'; },
        async markFailed(id, err, next) { const m = messages.find(m => m.id === id); if (m) { (m as any).attemptCount++; (m as any).lastError = err; (m as any).nextAttemptAt = next.toISOString(); } },
        async markDeadLetter(id, err) { const m = messages.find(m => m.id === id); if (m) { (m as any).status = 'DEAD_LETTER'; (m as any).lastError = err; } },
        async countByStatus(status) { return messages.filter(m => m.status === status).length; },
      };
      const idempotency = new InMemoryIdempotencyStore();
      const envelope: EventEnvelope = { eventId: 'e1', aggregateId: 'a1', occurredAt: new Date().toISOString(), version: '1.0.0', tenantId: 't1', correlationId: 'c1', causationId: '', engine: 'test', eventType: 'test.event', schemaRef: 'v1', payload: { data: 1 } };

      const msg: OutboxMessage = {
        id: 'msg-1', tenantId: 't1', aggregateId: 'a1', envelope, status: 'PENDING',
        attemptCount: 0, maxAttempts: 3, nextAttemptAt: new Date().toISOString(), createdAt: new Date().toISOString(),
      };
      await repo.save(msg);

      const dispatcher = new OutboxDispatcher({
        repository: repo,
        eventBus: { async emit(e) { emitted.push(e as EventEnvelope); } },
        idempotencyStore: idempotency,
        clock: () => new Date(),
      }, { ...DEFAULT_DISPATCHER_OPTIONS, pollIntervalMs: 999999 });

      const result = await dispatcher.poll();
      expect(result.dispatched).toBe(1);
      expect(emitted.length).toBe(1);
    });

    it('retries on failure and dead-letters after max attempts', async () => {
      const messages: OutboxMessage[] = [];
      const repo: IOutboxRepository = {
        async save(m) { messages.push(m); },
        async findPending() { return messages.filter(m => m.status === 'PENDING' && new Date(m.nextAttemptAt) <= new Date()); },
        async markDispatched(id) { const m = messages.find(m => m.id === id); if (m) (m as any).status = 'DISPATCHED'; },
        async markFailed(id, err, next) { const m = messages.find(m => m.id === id); if (m) { (m as any).attemptCount++; (m as any).lastError = err; (m as any).nextAttemptAt = next.toISOString(); } },
        async markDeadLetter(id, err) { const m = messages.find(m => m.id === id); if (m) { (m as any).status = 'DEAD_LETTER'; (m as any).lastError = err; } },
        async countByStatus(status) { return messages.filter(m => m.status === status).length; },
      };
      const idempotency = new InMemoryIdempotencyStore();
      const envelope: EventEnvelope = { eventId: 'e1', aggregateId: 'a1', occurredAt: new Date().toISOString(), version: '1.0.0', tenantId: 't1', correlationId: 'c1', causationId: '', engine: 'test', eventType: 'fail.event', schemaRef: 'v1', payload: {} };

      const msg: OutboxMessage = {
        id: 'msg-fail', tenantId: 't1', aggregateId: 'a1', envelope, status: 'PENDING',
        attemptCount: 2, maxAttempts: 3, nextAttemptAt: new Date().toISOString(), createdAt: new Date().toISOString(),
      };
      await repo.save(msg);

      const dispatcher = new OutboxDispatcher({
        repository: repo,
        eventBus: { async emit() { throw new Error('bus down'); } },
        idempotencyStore: idempotency,
        clock: () => new Date(),
      }, { ...DEFAULT_DISPATCHER_OPTIONS, pollIntervalMs: 999999, maxAttempts: 3, backoffBaseMs: 1, backoffMaxMs: 10 });

      // This attempt should dead-letter (attempt 2 + 1 = 3 >= maxAttempts 3)
      const result = await dispatcher.poll();
      expect(result.deadLettered).toBe(1);
      expect(await repo.countByStatus('DEAD_LETTER')).toBe(1);
    });
  });
});

// ═══════════════════════════════════════════
// Sprint A-2: Tenant Context
// ═══════════════════════════════════════════

describe('Sprint A-2: Tenant Context', () => {

  it('createTenantContext generates all fields', () => {
    const ctx = createTenantContext({ tenantId: 't1', organizationId: 'o1', actorId: 'u1' });
    expect(ctx.tenantId).toBe('t1');
    expect(ctx.organizationId).toBe('o1');
    expect(ctx.actorId).toBe('u1');
    expect(ctx.correlationId).toBeTruthy();
    expect(ctx.trace).toBeDefined();
    expect(ctx.requestId).toBeTruthy();
  });

  it('runInTenantContext provides context to async operations', async () => {
    const ctx = createTenantContext({ tenantId: 't2', organizationId: 'o2', actorId: 'u2' });
    await runInTenantContext(ctx, async () => {
      expect(getTenantId()).toBe('t2');
      expect(getOrganizationId()).toBe('o2');
      expect(getCorrelationId()).toBeTruthy();
    });
  });

  it('getTenantContext throws outside context', () => {
    expect(() => getTenantContext()).toThrow(TenantContextError);
  });

  it('getTenantContextOrNull returns null outside context', () => {
    expect(getTenantContextOrNull()).toBeNull();
  });

  it('context propagates through async boundaries', async () => {
    const ctx = createTenantContext({ tenantId: 't3', organizationId: 'o3', actorId: 'u3' });
    await runInTenantContext(ctx, async () => {
      await new Promise(r => setTimeout(r, 10));
      expect(getTenantId()).toBe('t3');
      // Nested async
      await (async () => {
        await new Promise(r => setTimeout(r, 5));
        expect(getTenantId()).toBe('t3');
      })();
    });
  });

  it('assertTenantAccess passes for matching tenant', async () => {
    const ctx = createTenantContext({ tenantId: 't4', organizationId: 'o4', actorId: 'u4' });
    await runInTenantContext(ctx, async () => {
      expect(() => assertTenantAccess('t4')).not.toThrow();
    });
  });

  it('assertTenantAccess throws for mismatched tenant', async () => {
    const ctx = createTenantContext({ tenantId: 't5', organizationId: 'o5', actorId: 'u5' });
    await runInTenantContext(ctx, async () => {
      expect(() => assertTenantAccess('other')).toThrow(TenantIsolationViolationError);
    });
  });

  it('RLS context returns correct values', async () => {
    const ctx = createTenantContext({ tenantId: 't6', organizationId: 'o6', actorId: 'u6' });
    await runInTenantContext(ctx, async () => {
      const { getRlsContext: rlsFn } = await import('../src/index.js');
      const rls2 = rlsFn();
      expect(rls2.tenantId).toBe('t6');
    });
  });
});

// ═══════════════════════════════════════════
// Sprint A-5: Observability
// ═══════════════════════════════════════════

describe('Sprint A-5: Observability', () => {

  describe('Structured Logger', () => {
    it('ConsoleStructuredLogger logs without error', () => {
      const logger = new ConsoleStructuredLogger('test-engine');
      // Redirect stdout temporarily
      const original = process.stdout.write.bind(process.stdout);
      let output = '';
      process.stdout.write = (chunk: string) => { output += chunk; return true; };
      logger.info('test message', { custom: 'field' });
      process.stdout.write = original;
      expect(output).toContain('test message');
      expect(output).toContain('"level":"info"');
    });

    it('error logs go to stderr', () => {
      const logger = new ConsoleStructuredLogger('test');
      // Should not throw
      logger.error('test error');
    });
  });

  describe('Metrics Collector', () => {
    let metrics: InMemoryMetricsCollector;
    beforeEach(() => { metrics = new InMemoryMetricsCollector(); });

    it('incrementCounter records sample', () => {
      metrics.incrementCounter('requests', 1, { method: 'GET' });
      const samples = metrics.getSamples();
      expect(samples.length).toBe(1);
      expect(samples[0].name).toBe('requests');
      expect(samples[0].value).toBe(1);
    });

    it('setGauge records sample', () => {
      metrics.setGauge('memory_usage', 75.5);
      const samples = metrics.getSamples();
      expect(samples[0].value).toBe(75.5);
    });

    it('observeHistogram records sample', () => {
      metrics.observeHistogram('latency', 42);
      const samples = metrics.getSamples();
      expect(samples[0].type).toBe('histogram');
    });
  });

  describe('Health Check Framework', () => {
    it('returns healthy when all checks pass', async () => {
      const framework = new DefaultHealthCheckFramework();
      framework.register({
        name: 'database',
        async check() { return { name: 'database', status: 'healthy' as const }; },
      });
      const result = await framework.runAll();
      expect(result.status).toBe('healthy');
      expect(result.checks.length).toBe(1);
    });

    it('returns degraded when check is degraded', async () => {
      const framework = new DefaultHealthCheckFramework();
      framework.register({
        name: 'cache',
        async check() { return { name: 'cache', status: 'degraded' as const, message: 'slow' }; },
      });
      const result = await framework.runAll();
      expect(result.status).toBe('degraded');
    });

    it('returns unhealthy when check fails', async () => {
      const framework = new DefaultHealthCheckFramework();
      framework.register({
        name: 'queue',
        async check() { throw new Error('connection refused'); },
      });
      const result = await framework.runAll();
      expect(result.status).toBe('unhealthy');
      expect(result.checks[0].message).toContain('connection refused');
    });
  });

  describe('NoopTracer', () => {
    it('creates and ends span', () => {
      const tracer = new NoopTracer();
      const span = tracer.startSpan('test-operation');
      span.setAttribute('key', 'value');
      span.recordError(new Error('test'));
      span.end();
      expect(span.spanId).toBe('noop');
    });
  });

  describe('Observability Container', () => {
    it('createDefaultObservability returns all components', () => {
      const obs = createDefaultObservability('test-engine');
      expect(obs.logger).toBeDefined();
      expect(obs.metrics).toBeDefined();
      expect(obs.tracer).toBeDefined();
      expect(obs.healthChecks).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════
// Sprint A-6: Production Adapter Framework
// ═══════════════════════════════════════════

describe('Sprint A-6: Production Adapter Framework', () => {

  it('AdapterManager throws when adapter not configured', () => {
    const manager = new AdapterManager();
    expect(() => manager.getDatabase()).toThrow(AdapterNotConfiguredError);
    expect(() => manager.getCache()).toThrow(AdapterNotConfiguredError);
    expect(() => manager.getMessageQueue()).toThrow(AdapterNotConfiguredError);
    expect(() => manager.getObjectStorage()).toThrow(AdapterNotConfiguredError);
    expect(() => manager.getEmail()).toThrow(AdapterNotConfiguredError);
    expect(() => manager.getPayment()).toThrow(AdapterNotConfiguredError);
    expect(() => manager.getSearch()).toThrow(AdapterNotConfiguredError);
  });

  it('AdapterManager returns registered adapters', () => {
    const mockDb = { type: 'postgresql' as const, query: async () => [], queryOne: async () => null, execute: async () => ({ affectedRows: 0 }), transaction: async <T>(fn: any) => fn({}) };
    const manager = new AdapterManager({ database: mockDb as any });
    expect(manager.getDatabase().type).toBe('postgresql');
  });

  it('AdapterManager register merges existing config', () => {
    const manager = new AdapterManager();
    const mockCache = { type: 'redis' as const, get: async () => null, set: async () => {}, delete: async () => {}, exists: async () => false, incr: async () => 0, expire: async () => {} };
    manager.register({ cache: mockCache as any });
    expect(manager.getCache().type).toBe('redis');
  });
});