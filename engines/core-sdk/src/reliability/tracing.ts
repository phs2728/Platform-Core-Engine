/**
 * reliability/tracing.ts — Distributed Trace Context
 *
 * Sprint A-1: Correlation ID + Causation ID + Distributed Trace ID
 */
import { randomUUID } from 'node:crypto';

export interface TraceContext {
  readonly correlationId: string;
  readonly causationId: string;
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string | undefined;
}

export function createTraceContext(parent?: Partial<TraceContext>): TraceContext {
  return {
    correlationId: parent?.correlationId ?? randomUUID(),
    causationId: parent?.causationId ?? '',
    traceId: parent?.traceId ?? randomUUID(),
    spanId: randomUUID(),
    parentSpanId: parent?.spanId,
  };
}

/**
 * Create a child trace context (for downstream calls)
 */
export function createChildTraceContext(parent: TraceContext): TraceContext {
  return {
    correlationId: parent.correlationId,
    causationId: parent.spanId,
    traceId: parent.traceId,
    spanId: randomUUID(),
    parentSpanId: parent.spanId,
  };
}

/**
 * Retry Policy with configurable backoff
 */
export interface RetryPolicy {
  maxAttempts: number;
  backoffBaseMs: number;
  backoffMaxMs: number;
  backoffType: 'exponential' | 'linear' | 'fixed';
  retryableErrors?: string[];  // error codes/messages that should retry
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  backoffBaseMs: 1000,
  backoffMaxMs: 30000,
  backoffType: 'exponential',
};

export function calculateRetryDelay(attempt: number, policy: RetryPolicy): number {
  switch (policy.backoffType) {
    case 'exponential':
      return Math.min(policy.backoffBaseMs * Math.pow(2, attempt), policy.backoffMaxMs);
    case 'linear':
      return Math.min(policy.backoffBaseMs * (attempt + 1), policy.backoffMaxMs);
    case 'fixed':
      return policy.backoffBaseMs;
  }
}

/**
 * Execute with retry — wraps async operations with automatic retry
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < policy.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < policy.maxAttempts - 1) {
        const delay = calculateRetryDelay(attempt, policy);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Event Ordering Guarantees
 */
export type EventOrdering = 'none' | 'causation' | 'sequence';

export interface EventSequence {
  readonly aggregateId: string;
  readonly sequenceNumber: number;
}

/**
 * Event Replay Policy
 */
export interface EventReplayPolicy {
  readonly fromTimestamp: string;
  readonly toTimestamp?: string;
  readonly eventTypes?: string[];
  readonly aggregateIds?: string[];
  readonly batchSize: number;
}

export const DEFAULT_REPLAY_POLICY: Omit<EventReplayPolicy, 'fromTimestamp'> = {
  batchSize: 100,
};