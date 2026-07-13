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

// Customer Decision Architecture (Platform Vision RC3.1 — 사장님 확립 2026-07-13)
export {
  type JourneyStage,
  JOURNEY_STAGES,
  type JourneyStep,
  type Objection,
  type ObjectionSeverity,
  type ObjectionType,
  type PlacementStrategy,
  type EvidencePlacementSpec,
  type IndustryBlueprint,
  type SectionBlueprint,
  type IndustryDetailBlueprint,
  type FAQItem,
  type FAQCategory,
  type ConciergeContext,
  type ConciergeRecommendation,
  type ConciergeTrigger,
  type SocialProofType,
  type SocialProofAsset,
  type StoryStage,
  type StoryArchitecture,
  type CustomerQuestion,
  type CustomerQuestionModel,
  type QuestionPriority,
  type CustomerDecisionArchitectureReport,
  type DecisionJourneyReport,
  type DetailStrategyReport,
  type TrustEvidencePlacementReport,
  type ObjectionLibraryReport,
  type FAQStrategyReport,
  type AIConciergeStrategy,
  type SocialProofStrategy,
  type StoryArchitectureReport,
  type IndustryDetailBlueprintEntity,
  type CustomerQuestionModelReport,
  type SectionJustification,
  PLATFORM_FIRST_PRINCIPLE,
  validateSectionExistence,
  FORBIDDEN_V2_TERMS,
  validatePlatformTerminology,
} from './cda.js';

// Agency OS (Platform Agency OS RC1 — 사장님 확립 2026-07-13)
export {
  AGENCY_FIRST_PRINCIPLE,
  type DecisionPhase, DECISION_PIPELINE, type DecisionGate,
  type ExecutiveRole, type ExecutiveAgent, type ExecutiveDecision,
  type SwarmType, type SwarmSpecialist, type Swarm,
  type TaskStatus, type TaskPriority, type AgencyTask, type TaskResult,
  type DebateStance, type DebateOpinion, type ExpertDebate,
  type WorkflowPhase, WORKFLOW_PHASES, type WorkflowStatus, type AgencyWorkflow,
  type WorkflowTemplateType, type WorkflowTemplate,
  type MemoryCategory, type ExecutiveMemory,
  type AgencyExecutionReport, type SwarmCollaborationReport,
  type DebateSummaryReport, type DecisionLogReport,
  type ExecutiveMemoryReport, type LearningEvolutionReport,
  type AgencyAuditEventType, type AgencyAuditRecord,
} from './agency-os.js';

// ═══════════════════════════════════════════
// Platform Hardening RC1 (Sprint A-1 ~ A-6)
// ═══════════════════════════════════════════

// Sprint A-1: Transactional Reliability
export {
  type OutboxStatus, type OutboxMessage, type IOutboxRepository,
  type OutboxDispatcherOptions, DEFAULT_DISPATCHER_OPTIONS,
  type OutboxDispatcherDeps, OutboxDispatcher,
  calculateBackoff, isPoisonMessage,
  type DeadLetterEntry, type IDeadLetterQueue,
  type IdempotencyRecord, type IIdempotencyStore, InMemoryIdempotencyStore,
  type TraceContext, createTraceContext, createChildTraceContext,
  type RetryPolicy, DEFAULT_RETRY_POLICY,
  calculateRetryDelay, executeWithRetry,
  type EventOrdering, type EventSequence,
  type EventReplayPolicy, DEFAULT_REPLAY_POLICY,
} from './reliability/index.js';

// Sprint A-2: Tenant Context
export {
  type TenantContext, createTenantContext,
  runInTenantContext, runInTenantContextSync,
  getTenantContext, getTenantContextOrNull,
  getTenantId, getOrganizationId, getActorId, getCorrelationId,
  TenantContextError,
  getRlsContext,
  assertTenantAccess, TenantIsolationViolationError,
} from './tenant/index.js';

// Sprint A-5: Observability
export {
  type LogLevel as ObservabilityLogLevel, type StructuredLogEntry, type IStructuredLogger,
  ConsoleStructuredLogger,
  type MetricType, type MetricSample, type IMetricsCollector,
  InMemoryMetricsCollector,
  type HealthStatus, type HealthCheckResult, type HealthCheck, type HealthCheckFramework,
  DefaultHealthCheckFramework,
  type ITracer, type ISpan, NoopTracer,
  type ObservabilityContainer, createDefaultObservability,
} from './observability/index.js';

// Sprint A-6: Production Adapter Framework
export {
  type DatabaseAdapter, type DatabaseTransaction,
  type CacheAdapter,
  type MessageQueueAdapter,
  type ObjectStorageAdapter,
  type EmailAdapter,
  type PaymentAdapter,
  type SearchAdapter,
  type AdapterRegistry, AdapterManager, AdapterNotConfiguredError,
} from './infrastructure/index.js';

// Sprint A-3: Architecture Enforcement
export {
  type ArchitectureRule,
  NO_DIRECT_ENGINE_IMPORT, NO_INTERFACE_TO_USECASE, NO_DOMAIN_TO_INFRA,
  ALL_ARCHITECTURE_RULES,
  type ArchitectureViolation,
  type BoundaryCheckResult, verifyBoundaries,
  type CircularDependency, detectCircularDependencies,
  type EngineManifest, type ManifestValidationResult, validateManifest,
} from './architecture/index.js';

// Sprint A-4: Contract Testing
export {
  type EventContract, type ContractRegistry, InMemoryContractRegistry,
  type SchemaCompatibilityResult, checkSchemaCompatibility,
  type ConsumerContractTest, type ConsumerTestResult, runConsumerContractTest,
  isVersionCompatible,
} from './contracts/index.js';

// ═══════════════════════════════════════════
// Platform Capability Upgrade RC1 (7 Capabilities)
// ═══════════════════════════════════════════

// Capability 1: BFF / Host Gateway
export {
  type BFFProtocol, type FrontendFramework,
  type HostGatewayConfig, type BFFQuery, type BFFQueryResult,
  type BFFBatchQuery, type BFFBatchResult,
  type AggregationPattern, type CachingStrategy, type StreamingStrategy,
  type HostGatewaySpec, DEFAULT_BFF_CONFIG,
  createBFFQuery, shouldCache,
} from './host/index.js';

// Capability 2: Localization Framework
export {
  type LocaleCode, type LocalizationConfig, type LocaleManifest,
  type LocalizedContent, type LocalizationProvider, type LocalizationStrategy,
  type AILocalizationRequest, type AILocalizationResult,
  DEFAULT_LOCALE_CONFIG, detectLocaleFromHeaders, buildHreflangTags, formatCurrency,
} from './localization/index.js';

// Capability 3: Contract First Automation
export {
  type ContractTarget, ALL_CONTRACT_TARGETS,
  type ZodSchemaInfo, type OpenAPISpec, type JSONSchemaExport,
  type SDKFile, type MCPToolDef, type AIPromptSchema,
  type ContractGenerationPipeline, type ContractGenerationResult,
  zodToJSONSchema, jsonSchemaToOpenAPI, generateContractPipeline,
  checkBackwardCompatibility,
} from './contract_gen/index.js';

// Capability 4: AI Frontend Generation Contract
export {
  type FrontendOutputTarget, ALL_FRONTEND_TARGETS,
  type FrontendGenerationContract,
  type ThemeManifestForAI, type ExperienceManifestForAI, type ComponentManifestForAI,
  type CMSSchemaForAI, type APIContractForAI, type LocalizationContractForAI,
  type AccessibilityRulesForAI, type SEORulesForAI, type AnimationRulesForAI,
  type ResponsiveRulesForAI, type ImageRulesForAI, type TypographyRulesForAI,
  type InteractionRulesForAI,
  createFrontendGenerationContract, validateGenerationContract,
} from './frontend_gen/index.js';

// Capability 5: Design Detail Strategy
export {
  type DetailPageIndustry, type DetailSection, type DetailPageStrategy,
  DETAIL_STRATEGY_LIBRARY, getDetailStrategy, listAllDetailStrategies,
} from './detail_strategy/index.js';

// Capability 6: Customer Assistance Layer
export {
  type AssistanceChannel, type ConversationIntent, type EscalationLevel,
  type ConversationMessage, type ConversationSession, type ConversationContext,
  type IAssistanceProvider, type AssistanceResponse,
  type SuggestedAction, type NextActionRecommendation,
  type EscalationRule, DEFAULT_ESCALATION_RULES,
  evaluateEscalation,
  type ConversationStrategy, DEFAULT_CONVERSATION_STRATEGY,
} from './assistance/index.js';

// Capability 7: Platform Validation
export {
  type ValidationSeverity, type ValidationFinding, type ValidationReport,
  type ValidationRule, PLATFORM_VALIDATION_RULES,
  APPROVED_ENGINES,
  validateNoDuplicateEngine, validateNoNewBusinessEngine,
  validateNoIndustryCoupling, validatePreservedEngines,
  runPlatformValidation,
} from './validation_suite/index.js';
