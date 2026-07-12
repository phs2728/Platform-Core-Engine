/**
 * Host Stubs + EventBus — Test/Demo only
 */
import type { EventEnvelope } from '@platform/core-sdk';
import type {
  IEventFeedProvider, IDataProvider, ICustomDataPolicyProvider,
  FeedEvent,
} from '../interfaces/index.js';
import { Ok, Err, type Result } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Event Feed Provider (Mock)
// ═══════════════════════════════════════════

export class MockEventFeedProvider implements IEventFeedProvider {
  private events: FeedEvent[] = [];
  private subscribers: ((e: FeedEvent) => Promise<void>)[] = [];

  /** Push events for testing. */
  push(events: FeedEvent[]): void {
    this.events.push(...events);
    // notify subscribers
    for (const e of events) {
      for (const sub of this.subscribers) {
        void sub(e).catch(() => {});
      }
    }
  }

  /** Push a single event with auto-incrementing position. */
  pushEvent(engine: string, eventType: string, aggregateId: string, tenantId: string, payload: Record<string, unknown> = {}): FeedEvent {
    const e: FeedEvent = {
      eventId: `evt-${this.events.length + 1}`,
      engine, eventType, aggregateId, tenantId, payload,
      occurredAt: new Date().toISOString(),
      position: this.events.length,
    };
    this.events.push(e);
    for (const sub of this.subscribers) void sub(e).catch(() => {});
    return e;
  }

  async getEventsSince(engine: string, position: number, limit: number): Promise<FeedEvent[]> {
    return this.events
      .filter((e) => e.engine === engine && e.position > position)
      .slice(0, limit);
  }

  async getEventsByAggregate(engine: string, aggregateId: string): Promise<FeedEvent[]> {
    return this.events.filter((e) => e.engine === engine && e.aggregateId === aggregateId);
  }

  async getEventCount(engine: string): Promise<number> {
    return this.events.filter((e) => e.engine === engine).length;
  }

  subscribe(handler: (e: FeedEvent) => Promise<void>): void {
    this.subscribers.push(handler);
  }

  clear(): void { this.events = []; this.subscribers = []; }
}

// ═══════════════════════════════════════════
// Data Provider (Mock)
// ═══════════════════════════════════════════

export class MockDataProvider implements IDataProvider {
  private supported = new Set<string>();
  private data = new Map<string, Record<string, unknown>>();

  addEngine(engineId: string): void { this.supported.add(engineId); }
  setData(key: string, value: Record<string, unknown>): void { this.data.set(key, value); }

  async query(engineId: string, queryName: string, params: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>> {
    const k = `${engineId}::${queryName}::${JSON.stringify(params)}`;
    const d = this.data.get(k);
    if (d) return Ok(d);
    return Ok({ engineId, queryName, result: 'ok' });
  }

  supports(engineId: string): boolean { return this.supported.has(engineId); }

  clear(): void { this.supported.clear(); this.data.clear(); }
}

// ═══════════════════════════════════════════
// CustomDataPolicy
// ═══════════════════════════════════════════

export class StaticQueryPolicyProvider implements ICustomDataPolicyProvider {
  private config = new Map<string, {
    allowedTypes: readonly string[];
    maxProjections: number;
    refreshIntervalMs: number;
  }>();

  set(tenantId: string, c: Partial<{ allowedTypes: readonly string[]; maxProjections: number; refreshIntervalMs: number }>): void {
    const prev = this.config.get(tenantId);
    this.config.set(tenantId, {
      allowedTypes: c.allowedTypes ?? prev?.allowedTypes ?? ['customer_dashboard', 'booking_summary', 'payment_summary'],
      maxProjections: c.maxProjections ?? prev?.maxProjections ?? 1000,
      refreshIntervalMs: c.refreshIntervalMs ?? prev?.refreshIntervalMs ?? 60000,
    });
  }

  async validateAttributes(_t: string, _type: string, attrs: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>> {
    return Ok(attrs);
  }
  async getAllowedProjectionTypes(t: string): Promise<readonly string[]> {
    return this.config.get(t)?.allowedTypes ?? ['customer_dashboard'];
  }
  async getMaxProjectionsPerTenant(t: string): Promise<number> { return this.config.get(t)?.maxProjections ?? 1000; }
  async getDefaultRefreshIntervalMs(t: string): Promise<number> { return this.config.get(t)?.refreshIntervalMs ?? 60000; }
  clear(): void { this.config.clear(); }
}

// ═══════════════════════════════════════════
// EventBus
// ═══════════════════════════════════════════

export interface RecordedEnvelope<T = unknown> { envelope: EventEnvelope<T>; recordedAt: number; }

export class InMemoryEventBus {
  readonly emitted: RecordedEnvelope[] = [];
  async emit<T>(e: EventEnvelope<T>): Promise<void> { this.emitted.push({ envelope: e, recordedAt: Date.now() }); }
  byType(t: string): RecordedEnvelope[] { return this.emitted.filter((r) => r.envelope.eventType === t); }
  countByType(t: string): number { return this.byType(t).length; }
  clear(): void { this.emitted.length = 0; }
}
