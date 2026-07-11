/**
 * Communication Engine — Public API
 *
 * 사장님 확립:
 * "Every communication MUST go through Communication Engine."
 */

// Interfaces
export type * from './interfaces/index.js';

// Use Cases
export {
  sendMessageUseCase,
  deliverMessage,
  type SendMessageInput,
  type SendMessageOutput,
  type SendMessageDeps,
} from './use-cases/SendMessageUseCase.js';

export {
  createTemplateUseCase,
  setPreferenceUseCase,
  type CreateTemplateInput,
  type CreateTemplateDeps,
  type SetPreferenceInput,
  type SetPreferenceDeps,
} from './use-cases/TemplateAndPreferenceUseCases.js';

export {
  subscribeToEvents,
  unsubscribeAll,
  type Unsubscribe,
} from './use-cases/EventBusIntegration.js';

// In-Memory Repositories
export { InMemoryMessageRepository } from './infrastructure/InMemoryMessageRepository.js';
export { InMemoryTemplateRepository } from './infrastructure/InMemoryTemplateRepository.js';
export { InMemoryPreferenceRepository } from './infrastructure/InMemoryPreferenceRepository.js';
export { InMemoryAnalyticsRepository } from './infrastructure/InMemoryAnalyticsRepository.js';
export { InMemoryProviderManager } from './infrastructure/InMemoryProviderManager.js';
export { DefaultTemplateRenderer } from './infrastructure/DefaultTemplateRenderer.js';

// Channel Providers (Plugins)
export {
  InMemoryChannelProvider,
  SmtpEmailProvider,
  TwilioSmsProvider,
  FirebasePushProvider,
  WebhookProvider,
  TelegramProvider,
  SlackProvider,
  DiscordProvider,
} from './infrastructure/ChannelProviders.js';

// Core SDK re-exports
export { type Result, Ok, Err, ValidationError, NotFoundError, ConflictError, type EventEnvelope, createEnvelope, z } from '@platform/core-sdk';
