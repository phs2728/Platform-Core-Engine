/**
 * reliability/index.ts — Public API
 */
export {
  type OutboxStatus, type OutboxMessage, type IOutboxRepository,
  type OutboxDispatcherOptions, DEFAULT_DISPATCHER_OPTIONS,
  type OutboxDispatcherDeps, OutboxDispatcher,
  calculateBackoff, isPoisonMessage,
  type DeadLetterEntry, type IDeadLetterQueue,
} from './outbox.js';

export {
  type IdempotencyRecord, type IIdempotencyStore,
  InMemoryIdempotencyStore,
} from './idempotency.js';

export {
  type TraceContext, createTraceContext, createChildTraceContext,
  type RetryPolicy, DEFAULT_RETRY_POLICY,
  calculateRetryDelay, executeWithRetry,
  type EventOrdering, type EventSequence,
  type EventReplayPolicy, DEFAULT_REPLAY_POLICY,
} from './tracing.js';