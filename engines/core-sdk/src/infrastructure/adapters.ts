/**
 * infrastructure/adapters.ts — Production Adapter Host Interfaces
 *
 * Sprint A-6: Support PostgreSQL/MySQL/Redis/RabbitMQ/Kafka/S3/SMTP/Stripe/Elasticsearch
 * Do NOT tightly couple the Platform to any implementation.
 */

// ═══════════════════════════════════════════
// Database Adapter
// ═══════════════════════════════════════════

export interface DatabaseAdapter {
  readonly type: 'postgresql' | 'mysql';
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  queryOne<T = unknown>(sql: string, params?: unknown[]): Promise<T | null>;
  execute(sql: string, params?: unknown[]): Promise<{ affectedRows: number }>;
  transaction<T>(fn: (tx: DatabaseTransaction) => Promise<T>): Promise<T>;
}

export interface DatabaseTransaction {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  queryOne<T = unknown>(sql: string, params?: unknown[]): Promise<T | null>;
  execute(sql: string, params?: unknown[]): Promise<{ affectedRows: number }>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

// ═══════════════════════════════════════════
// Key-Value / Cache Adapter
// ═══════════════════════════════════════════

export interface CacheAdapter {
  readonly type: 'redis' | 'memory';
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<void>;
}

// ═══════════════════════════════════════════
// Message Queue Adapter
// ═══════════════════════════════════════════

export interface MessageQueueAdapter {
  readonly type: 'rabbitmq' | 'kafka' | 'sqs';
  publish(topic: string, message: unknown, options?: { key?: string; headers?: Record<string, string> }): Promise<void>;
  subscribe(topic: string, handler: (message: unknown) => Promise<void>): Promise<() => void>;
  createTopic(topic: string): Promise<void>;
}

// ═══════════════════════════════════════════
// Object Storage Adapter
// ═══════════════════════════════════════════

export interface ObjectStorageAdapter {
  readonly type: 's3' | 'gcs' | 'azure';
  put(bucket: string, key: string, data: Buffer | string, contentType?: string): Promise<{ url: string; etag: string }>;
  get(bucket: string, key: string): Promise<Buffer>;
  delete(bucket: string, key: string): Promise<void>;
  presignGet(bucket: string, key: string, expiresIn: number): Promise<string>;
  presignPut(bucket: string, key: string, expiresIn: number): Promise<string>;
  list(bucket: string, prefix: string): Promise<{ key: string; size: number; modified: string }[]>;
}

// ═══════════════════════════════════════════
// Email Adapter
// ═══════════════════════════════════════════

export interface EmailAdapter {
  readonly type: 'smtp' | 'ses' | 'sendgrid';
  send(input: {
    from: string;
    to: string | string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string;
    attachments?: { filename: string; content: Buffer | string; contentType?: string }[];
  }): Promise<{ messageId: string; accepted: string[]; rejected: string[] }>;
}

// ═══════════════════════════════════════════
// Payment Adapter
// ═══════════════════════════════════════════

export interface PaymentAdapter {
  readonly type: 'stripe' | 'paypal' | 'toss';
  createCustomer(input: { email: string; name?: string; metadata?: Record<string, string> }): Promise<{ customerId: string }>;
  createPaymentIntent(input: {
    amount: number;
    currency: string;
    customerId?: string;
    description?: string;
    metadata?: Record<string, string>;
    idempotencyKey: string;
  }): Promise<{ intentId: string; clientSecret: string; status: string }>;
  confirmPayment(intentId: string, paymentMethodId: string): Promise<{ status: string; transactionId?: string }>;
  refund(paymentId: string, amount?: number, reason?: string): Promise<{ refundId: string; status: string }>;
  webhookConstruct(rawBody: string | Buffer, signature: string, secret: string): Promise<unknown>;
}

// ═══════════════════════════════════════════
// Search Adapter
// ═══════════════════════════════════════════

export interface SearchAdapter {
  readonly type: 'elasticsearch' | 'opensearch' | 'meilisearch';
  index(index: string, id: string, document: Record<string, unknown>): Promise<void>;
  update(index: string, id: string, partial: Record<string, unknown>): Promise<void>;
  delete(index: string, id: string): Promise<void>;
  search<T = unknown>(index: string, query: unknown, options?: { from?: number; size?: number }): Promise<{ hits: T[]; total: number }>;
  createIndex(index: string, mappings?: Record<string, unknown>): Promise<void>;
}

// ═══════════════════════════════════════════
// Adapter Registry
// ═══════════════════════════════════════════

export interface AdapterRegistry {
  database?: DatabaseAdapter;
  cache?: CacheAdapter;
  messageQueue?: MessageQueueAdapter;
  objectStorage?: ObjectStorageAdapter;
  email?: EmailAdapter;
  payment?: PaymentAdapter;
  search?: SearchAdapter;
}

/**
 * Adapter Manager — registers and provides adapters at runtime.
 * Engines access adapters via Host Interface, never direct instantiation.
 */
export class AdapterManager {
  constructor(private registry: AdapterRegistry = {}) {}

  getDatabase(): DatabaseAdapter {
    if (!this.registry.database) throw new AdapterNotConfiguredError('database');
    return this.registry.database;
  }
  getCache(): CacheAdapter {
    if (!this.registry.cache) throw new AdapterNotConfiguredError('cache');
    return this.registry.cache;
  }
  getMessageQueue(): MessageQueueAdapter {
    if (!this.registry.messageQueue) throw new AdapterNotConfiguredError('messageQueue');
    return this.registry.messageQueue;
  }
  getObjectStorage(): ObjectStorageAdapter {
    if (!this.registry.objectStorage) throw new AdapterNotConfiguredError('objectStorage');
    return this.registry.objectStorage;
  }
  getEmail(): EmailAdapter {
    if (!this.registry.email) throw new AdapterNotConfiguredError('email');
    return this.registry.email;
  }
  getPayment(): PaymentAdapter {
    if (!this.registry.payment) throw new AdapterNotConfiguredError('payment');
    return this.registry.payment;
  }
  getSearch(): SearchAdapter {
    if (!this.registry.search) throw new AdapterNotConfiguredError('search');
    return this.registry.search;
  }

  register(registry: Partial<AdapterRegistry>): void {
    this.registry = { ...this.registry, ...registry };
  }
}

export class AdapterNotConfiguredError extends Error {
  constructor(adapterName: string) {
    super(`Adapter '${adapterName}' is not configured. Register it via AdapterManager.register().`);
    this.name = 'AdapterNotConfiguredError';
  }
}