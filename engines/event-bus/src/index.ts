/**
 * Universal Event Bus — Public API
 */

export type {
  IEventBus,
  EventHandler,
  Unsubscribe,
  SubscribeOptions,
  EventBusStats,
  DeadLetterRecord,
} from './interfaces/index.js';

export { InMemoryEventBus } from './infrastructure/InMemoryEventBus.js';

export { type EventEnvelope, type Result, Ok, Err, createEnvelope } from '@platform/core-sdk';
