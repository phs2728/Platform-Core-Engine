/**
 * TEMPLATE_TITLE Engine — Public API
 */

export type { IClock, IIdGenerator, IEventBus } from './interfaces/index.js';

export {
  sampleActionUseCase,
  type SampleActionInput,
  type SampleActionOutput,
  type SampleActionDeps,
} from './use-cases/SampleActionUseCase.js';

// Core SDK re-exports
export { type Result, Ok, Err, ValidationError, type EventEnvelope, createEnvelope, z } from '@platform/core-sdk';
