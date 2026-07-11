/**
 * InMemoryEventBus — Test/Demo only
 *
 * 단위 테스트에서 eventBus.emit 호출 시 envelope를 수집.
 */

import type { EventEnvelope } from '@platform/core-sdk';

export interface RecordedEnvelope<T = unknown> {
  envelope: EventEnvelope<T>;
  recordedAt: number;
}

export class InMemoryEventBus {
  public readonly emitted: RecordedEnvelope[] = [];

  async emit<T>(envelope: EventEnvelope<T>): Promise<void> {
    this.emitted.push({
      envelope,
      recordedAt: Date.now(),
    });
  }

  /** eventType 기준으로 필터링 */
  byType(eventType: string): RecordedEnvelope[] {
    return this.emitted.filter((r) => r.envelope.eventType === eventType);
  }

  /** aggregateId 기준 필터 */
  byAggregate(aggregateId: string): RecordedEnvelope[] {
    return this.emitted.filter((r) => r.envelope.aggregateId === aggregateId);
  }

  clear(): void {
    this.emitted.length = 0;
  }

  countByType(eventType: string): number {
    return this.byType(eventType).length;
  }
}
