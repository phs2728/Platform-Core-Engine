import type {
  IAnalyticsRepository,
  IAnalyticsEvent,
  AnalyticsStats,
} from '../interfaces/index.js';

export class InMemoryAnalyticsRepository implements IAnalyticsRepository {
  private readonly events: IAnalyticsEvent[] = [];

  async insert(event: IAnalyticsEvent): Promise<void> {
    this.events.push(event);
  }

  async findByMessage(messageId: string): Promise<IAnalyticsEvent[]> {
    return this.events.filter((e) => e.messageId === messageId);
  }

  async findByTenant(tenantId: string, limit = 1000): Promise<IAnalyticsEvent[]> {
    return this.events.filter((e) => e.tenantId === tenantId).slice(0, limit);
  }

  async getStats(tenantId: string): Promise<AnalyticsStats> {
    const tenantEvents = this.events.filter((e) => e.tenantId === tenantId);
    const latencies = tenantEvents
      .filter((e) => e.latency !== null)
      .map((e) => e.latency as number);

    return {
      total: tenantEvents.length,
      delivered: tenantEvents.filter((e) => e.status === 'delivered').length,
      opened: tenantEvents.filter((e) => e.status === 'opened').length,
      clicked: tenantEvents.filter((e) => e.status === 'clicked').length,
      failed: tenantEvents.filter((e) => e.status === 'failed').length,
      bounce: tenantEvents.filter((e) => e.status === 'bounce').length,
      spam: tenantEvents.filter((e) => e.status === 'spam').length,
      avgLatency: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null,
    };
  }
}
