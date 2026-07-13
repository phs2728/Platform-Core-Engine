/**
 * reliability/outbox.ts — Transactional Outbox Pattern
 *
 * Sprint A-1: Every engine that publishes events must use the Outbox.
 * Guarantees at-least-once delivery with idempotent consumers.
 */
import type { EventEnvelope } from '../event/index.js';
import type { IIdempotencyStore } from './idempotency.js';

// ═══════════════════════════════════════════
// Outbox Message
// ═══════════════════════════════════════════

export type OutboxStatus = 'PENDING' | 'DISPATCHED' | 'FAILED' | 'DEAD_LETTER';

export interface OutboxMessage {
  readonly id: string;
  readonly tenantId: string;
  readonly aggregateId: string;
  readonly envelope: EventEnvelope;
  readonly status: OutboxStatus;
  readonly attemptCount: number;
  readonly maxAttempts: number;
  readonly lastError?: string;
  readonly nextAttemptAt: string;
  readonly createdAt: string;
  readonly dispatchedAt?: string;
}

// ═══════════════════════════════════════════
// Outbox Repository Interface
// ═══════════════════════════════════════════

export interface IOutboxRepository {
  /** Save message within the same transaction as business write */
  save(message: OutboxMessage): Promise<void>;
  /** Find pending messages ready for dispatch */
  findPending(limit: number, before: Date): Promise<OutboxMessage[]>;
  /** Mark as dispatched */
  markDispatched(id: string, at: Date): Promise<void>;
  /** Mark as failed, increment attempt count */
  markFailed(id: string, error: string, nextAttemptAt: Date): Promise<void>;
  /** Move to dead letter queue */
  markDeadLetter(id: string, error: string): Promise<void>;
  /** Count by status (for monitoring) */
  countByStatus(status: OutboxStatus): Promise<number>;
}

// ═══════════════════════════════════════════
// Outbox Dispatcher
// ═══════════════════════════════════════════

export interface OutboxDispatcherOptions {
  batchSize: number;          // messages per poll cycle
  pollIntervalMs: number;     // poll frequency
  maxAttempts: number;        // before dead-letter
  backoffBaseMs: number;      // exponential backoff base
  backoffMaxMs: number;       // backoff cap
}

export const DEFAULT_DISPATCHER_OPTIONS: OutboxDispatcherOptions = {
  batchSize: 50,
  pollIntervalMs: 1000,
  maxAttempts: 5,
  backoffBaseMs: 1000,
  backoffMaxMs: 60000,
};

export interface OutboxDispatcherDeps {
  repository: IOutboxRepository;
  eventBus: { emit<T>(e: EventEnvelope<T>): Promise<void> };
  idempotencyStore: IIdempotencyStore;
  clock: () => Date;
}

/**
 * OutboxDispatcher — polls outbox, dispatches to event bus, handles retries.
 *
 * Lifecycle:
 * 1. Poll pending messages
 * 2. For each: check idempotency key
 * 3. Emit to event bus
 * 4. Mark dispatched or increment retry
 * 5. After maxAttempts → dead letter
 */
export class OutboxDispatcher {
  private running = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly deps: OutboxDispatcherDeps,
    private readonly options: OutboxDispatcherOptions = DEFAULT_DISPATCHER_OPTIONS,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.timer = setInterval(() => { this.poll().catch(() => {}); }, this.options.pollIntervalMs);
  }

  stop(): void {
    this.running = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  /** Single dispatch cycle — can be called manually in tests */
  async poll(): Promise<{ dispatched: number; failed: number; deadLettered: number }> {
    const now = this.deps.clock();
    const messages = await this.deps.repository.findPending(this.options.batchSize, now);
    let dispatched = 0, failed = 0, deadLettered = 0;

    for (const msg of messages) {
      try {
        // Idempotency check
        const idempotencyKey = `outbox:${msg.id}`;
        const alreadyProcessed = await this.deps.idempotencyStore.check(idempotencyKey);
        if (alreadyProcessed) {
          await this.deps.repository.markDispatched(msg.id, this.deps.clock());
          dispatched++;
          continue;
        }
        // Emit
        await this.deps.eventBus.emit(msg.envelope);
        // Record idempotency
        await this.deps.idempotencyStore.record(idempotencyKey, { messageId: msg.id });
        // Mark dispatched
        await this.deps.repository.markDispatched(msg.id, this.deps.clock());
        dispatched++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const newAttemptCount = msg.attemptCount + 1;
        if (newAttemptCount >= msg.maxAttempts) {
          await this.deps.repository.markDeadLetter(msg.id, errorMsg);
          deadLettered++;
        } else {
          const backoff = Math.min(
            this.options.backoffBaseMs * Math.pow(2, newAttemptCount),
            this.options.backoffMaxMs,
          );
          const nextAttempt = new Date(this.deps.clock().getTime() + backoff);
          await this.deps.repository.markFailed(msg.id, errorMsg, nextAttempt);
          failed++;
        }
      }
    }
    return { dispatched, failed, deadLettered };
  }
}

// ═══════════════════════════════════════════
// Exponential Backoff Calculator
// ═══════════════════════════════════════════

export function calculateBackoff(attempt: number, baseMs: number, maxMs: number): number {
  return Math.min(baseMs * Math.pow(2, attempt), maxMs);
}

// ═══════════════════════════════════════════
// Poison Message Detection
// ═══════════════════════════════════════════

export function isPoisonMessage(msg: OutboxMessage, maxAttempts: number): boolean {
  return msg.attemptCount >= maxAttempts;
}

// ═══════════════════════════════════════════
// Dead Letter Queue Interface
// ═══════════════════════════════════════════

export interface DeadLetterEntry {
  readonly id: string;
  readonly originalMessageId: string;
  readonly tenantId: string;
  readonly envelope: EventEnvelope;
  readonly error: string;
  readonly attemptCount: number;
  readonly deadLetteredAt: string;
}

export interface IDeadLetterQueue {
  enqueue(entry: DeadLetterEntry): Promise<void>;
  dequeue(): Promise<DeadLetterEntry | null>;
  peek(limit: number): Promise<DeadLetterEntry[]>;
  size(): Promise<number>;
  /** Replay a dead-lettered message back into outbox */
  replay(id: string): Promise<void>;
}