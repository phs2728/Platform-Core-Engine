/**
 * Core SDK — Public API
 *
 * 사장님 Platform Owner 확립 (2026-07-11):
 * "Sprint 2B-1 범위: errors / result / logger / validation / event"
 *
 * 헌법 §C-20 (SDK Stability Rule):
 * - Minor 100% 하위 호환
 * - Breaking Change = Major + ADR 필수
 */

// Common Types
export type { EngineName } from './types.js';

// Errors
export {
  PlatformError,
  type PlatformErrorOptions,
  type ErrorResponse,
  ValidationError,
  AuthenticationError,
  type AuthFailureReason,
  AuthorizationError,
  ConflictError,
  NotFoundError,
  InternalError,
} from './errors/index.js';

// Result
export {
  Ok,
  Err,
  isOk,
  isErr,
  map,
  mapErr,
  flatMap,
  andThen,
  unwrap,
  unwrapOr,
  fromPromise,
  fromTry,
  sequence,
  type Result,
} from './result/index.js';

// Logger
export {
  createLogger,
  ConsoleLogger,
  maskPII,
  type ILogger,
  type LogContext,
  type LogLevel,
} from './logger/index.js';

// Validation
export {
  z,
  ZodSchema,
  ZodError,
  validate,
  validateOrThrow,
  Email,
  Phone,
  Password,
} from './validation/index.js';

// Event
export {
  createEnvelope,
  type EventEnvelope,
  type EventTypeDefinition,
  type IEventEmitter,
  type IEventSubscriber,
  type Unsubscribe,
  type CreateEventInput,
} from './event/index.js';

// Trust Architecture (Platform Vision v2 — 사장님 확립 2026-07-13)
export {
  type IndustryType,
  type TrustEvidence,
  type IndustryTrustProfile,
  type TrustStage,
  type TrustJourney,
  type ObjectionMap,
  type EvidencePlacement,
  type ConfidenceJourney,
  type DecisionJourney,
  type TrustChecklistItem,
  type TrustChecklistItemStatus,
  type TrustChecklist,
  type TrustArchitectureReport,
  type CustomerPsychologyReport,
  type EvidencePlacementStrategy,
  FORBIDDEN_UI_PATTERNS,
  validateTrustUIPattern,
} from './trust-architecture.js';
