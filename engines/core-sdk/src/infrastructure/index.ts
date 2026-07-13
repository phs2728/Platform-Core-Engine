/**
 * infrastructure/index.ts — Public API
 */
export {
  type DatabaseAdapter, type DatabaseTransaction,
  type CacheAdapter,
  type MessageQueueAdapter,
  type ObjectStorageAdapter,
  type EmailAdapter,
  type PaymentAdapter,
  type SearchAdapter,
  type AdapterRegistry, AdapterManager, AdapterNotConfiguredError,
} from './adapters.js';