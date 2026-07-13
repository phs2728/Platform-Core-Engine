/**
 * reliability/idempotency.ts — Idempotency Key Store
 *
 * Sprint A-1: Ensures at-least-once delivery doesn't cause duplicate side effects.
 */
export interface IdempotencyRecord {
  readonly key: string;
  readonly result: unknown;
  readonly createdAt: string;
  readonly expiresAt: string;
}

export interface IIdempotencyStore {
  /** Check if a key has been processed */
  check(key: string): Promise<boolean>;
  /** Record a processed key with optional result */
  record(key: string, result?: unknown, ttlSeconds?: number): Promise<void>;
  /** Get the result for a key */
  get<T = unknown>(key: string): Promise<IdempotencyRecord | null>;
  /** Remove a key (for testing/cleanup) */
  invalidate(key: string): Promise<void>;
}

/**
 * In-Memory Idempotency Store — for tests and development.
 * Production should use Redis adapter.
 */
export class InMemoryIdempotencyStore implements IIdempotencyStore {
  private store = new Map<string, IdempotencyRecord>();
  private defaultTtlSeconds = 86400; // 24h

  async check(key: string): Promise<boolean> {
    const record = this.store.get(key);
    if (!record) return false;
    if (new Date(record.expiresAt) < new Date()) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  async record(key: string, result?: unknown, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.defaultTtlSeconds;
    const now = new Date();
    const expires = new Date(now.getTime() + ttl * 1000);
    this.store.set(key, {
      key, result,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    });
  }

  async get<T = unknown>(key: string): Promise<IdempotencyRecord | null> {
    const record = this.store.get(key);
    if (!record) return null;
    if (new Date(record.expiresAt) < new Date()) {
      this.store.delete(key);
      return null;
    }
    return record as IdempotencyRecord;
  }

  async invalidate(key: string): Promise<void> {
    this.store.delete(key);
  }

  clear(): void { this.store.clear(); }
}