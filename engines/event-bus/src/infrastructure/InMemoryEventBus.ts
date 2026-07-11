/**
 * In-Memory Event Bus Implementation
 *
 * 사장님 확립: Event Bus는 In-Memory로 시작, Phase 후속에서 Redis/Kafka 지원.
 *
 * 기능:
 * - publish/subscribe (pub/sub)
 * - eventType 필터링 + 와일드카드
 * - tenant/engine 필터링
 * - 재시도 (maxRetries)
 * - Dead Letter Queue
 * - 통계
 */

import type {
  IEventBus,
  EventHandler,
  Unsubscribe,
  SubscribeOptions,
  EventBusStats,
  DeadLetterRecord,
} from '../interfaces/index.js';
import type { EventEnvelope } from '@platform/core-sdk';

interface Subscription {
  id: string;
  handler: EventHandler<unknown>;
  options: SubscribeOptions;
}

let subIdCounter = 0;

export class InMemoryEventBus implements IEventBus {
  private readonly subscriptions = new Map<string, Subscription>();
  private readonly deadLetters: DeadLetterRecord[] = [];
  private stats = {
    totalPublished: 0,
    totalDelivered: 0,
    totalFailed: 0,
  };

  async publish<T>(envelope: EventEnvelope<T>): Promise<void> {
    this.stats.totalPublished++;

    // 구독자에게 전달 (비동기, 순서 보장 X — 각 핸들러가 독립)
    const deliveries: Promise<void>[] = [];

    for (const sub of this.subscriptions.values()) {
      if (!this.matchesFilter(envelope, sub.options)) continue;

      deliveries.push(this.deliver(envelope, sub));
    }

    await Promise.allSettled(deliveries);
  }

  subscribe<T>(
    handler: EventHandler<T>,
    options: SubscribeOptions = {},
  ): Unsubscribe {
    const id = `sub-${++subIdCounter}`;
    const sub: Subscription = {
      id,
      handler: handler as EventHandler<unknown>,
      options,
    };
    this.subscriptions.set(id, sub);

    return () => {
      this.subscriptions.delete(id);
    };
  }

  on<T>(eventType: string, handler: EventHandler<T>): Unsubscribe {
    return this.subscribe(handler, { eventType });
  }

  getStats(): EventBusStats {
    return {
      ...this.stats,
      activeSubscribers: this.subscriptions.size,
      deadLetters: this.deadLetters.length,
    };
  }

  getDeadLetters(): DeadLetterRecord[] {
    return [...this.deadLetters];
  }

  // ═══════════════════════════════════════════
  // Private
  // ═══════════════════════════════════════════

  private matchesFilter<T>(
    envelope: EventEnvelope<T>,
    options: SubscribeOptions,
  ): boolean {
    // eventType 정확 매칭
    if (options.eventType && envelope.eventType !== options.eventType) {
      // 와일드카드 체크
      if (options.eventPattern) {
        if (!this.wildcardMatch(options.eventPattern, envelope.eventType)) {
          return false;
        }
      } else {
        return false;
      }
    }

    // eventPattern만 있는 경우
    if (!options.eventType && options.eventPattern) {
      if (!this.wildcardMatch(options.eventPattern, envelope.eventType)) {
        return false;
      }
    }

    // Tenant 필터
    if (options.tenantId && envelope.tenantId !== options.tenantId) {
      return false;
    }

    // Engine 필터
    if (options.engine && envelope.engine !== options.engine) {
      return false;
    }

    return true;
  }

  private wildcardMatch(pattern: string, value: string): boolean {
    // 'identity.*' → /^identity\..+$/
    // Step 1: escape everything except *
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    // Step 2: replace * with .+
    const regex = escaped.replace(/\*/g, '.+');
    return new RegExp(`^${regex}$`).test(value);
  }

  private async deliver<T>(
    envelope: EventEnvelope<T>,
    sub: Subscription,
  ): Promise<void> {
    const maxRetries = sub.options.maxRetries ?? 0;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await sub.handler(envelope);
        this.stats.totalDelivered++;
        return;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        if (attempt < maxRetries) {
          // 재시도 전 대기 (exponential backoff — 간단 버전)
          await new Promise((r) => setTimeout(r, Math.min(100 * (attempt + 1), 1000)));
        }
      }
    }

    // 모든 재시도 실패 → Dead Letter
    this.stats.totalFailed++;
    this.deadLetters.push({
      id: `dlq-${this.deadLetters.length + 1}`,
      envelope: envelope as EventEnvelope<unknown>,
      error: lastError?.message ?? 'Unknown error',
      attempts: maxRetries + 1,
      createdAt: new Date().toISOString(),
    });
  }
}
