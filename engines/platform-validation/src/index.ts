/**
 * Platform Validation Engine — Public API
 *
 * 사장님 확립 (2026-07-11) Phase 6 — Platform Validation Engine.
 *   The platform's self-validation capability.
 *
 * Sprint 1 Use Cases: 25+
 *   Validation Execution (6) + Scenario CRUD (7) + Report/Health (6) + convenience (6)
 */

// ═══════════════════════════════════════════
// Core SDK Re-exports
// ═══════════════════════════════════════════
export {
  type Result, Ok, Err,
  ValidationError, NotFoundError, ConflictError,
  type EventEnvelope, createEnvelope, z,
} from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Domain Types
// ═══════════════════════════════════════════
export type {
  Scenario, ScenarioStep, StepExpectation,
  ValidationRun, ValidationResult,
  ValidationReport, ReportSummary, ScenarioResult, ValidationMetrics,
  Certification, CertificationCategory,
  PlatformHealth, EngineHealthItem, BusinessFlow,
  ValidationStatus, StepStatus, ValidationType, ReportType, Severity,
  ScenarioSearchCriteria, ScenarioSearchResult,
  ValidationAuditRecord, ValidationAuditEventType,
  EngineManifest, EngineActionInput, EngineActionOutput,
} from './interfaces/index.js';

// ═══════════════════════════════════════════
// Host Interfaces
// ═══════════════════════════════════════════
export type {
  IClock, IIdGenerator, IEventBus,
  IEngineManifestProvider, IEngineActionProvider,
  IGuardianProvider, ICompatibilityProvider,
  ICustomDataPolicyProvider,
} from './interfaces/index.js';

// ═══════════════════════════════════════════
// Repository Interfaces
// ═══════════════════════════════════════════
export type {
  IScenarioRepository, IValidationRepository,
  IReportRepository, IMetricsRepository,
  ICertificationRepository, IValidationAuditRepository,
} from './interfaces/index.js';

// ═══════════════════════════════════════════
// Validation Execution UseCases (6)
// ═══════════════════════════════════════════
export {
  runValidationUseCase, runScenarioUseCase,
  runRegressionUseCase, runSmokeTestUseCase,
  runCertificationUseCase, runReleaseValidationUseCase,
  type RunValidationInput, type RunScenarioInput,
  type RunCertificationInput,
} from './use-cases/ValidationUseCases.js';

// ═══════════════════════════════════════════
// Scenario CRUD UseCases (7)
// ═══════════════════════════════════════════
export {
  createScenarioUseCase, updateScenarioUseCase, deleteScenarioUseCase,
  getScenarioUseCase, listScenariosUseCase, searchScenariosUseCase,
  seedBuiltinScenariosUseCase,
  type CreateScenarioInput, type UpdateScenarioInput, type DeleteScenarioInput,
} from './use-cases/ScenarioUseCases.js';

// ═══════════════════════════════════════════
// Report + Health UseCases (6)
// ═══════════════════════════════════════════
export {
  generateReportUseCase, generateMetricsUseCase, generateSummaryUseCase,
  calculateHealthUseCase, calculateCoverageUseCase, calculateReadinessUseCase,
  type GenerateReportInput,
} from './use-cases/ReportHealthUseCases.js';

// ═══════════════════════════════════════════
// Built-in Scenario Library
// ═══════════════════════════════════════════
export {
  getBuiltinScenarios,
  fullLifecycleScenario, cancellationFlowScenario,
  paymentFailureScenario, archiveChainScenario,
  authorizationDenyScenario, mediaFlowScenario,
  communicationFailureScenario, identityLoginScenario,
} from './scenario/builtinScenarios.js';

// ═══════════════════════════════════════════
// Use Case Deps
// ═══════════════════════════════════════════
export type { ValidationUseCaseDeps } from './use-cases/types.js';

// ═══════════════════════════════════════════
// In-Memory Repositories
// ═══════════════════════════════════════════
export {
  InMemoryScenarioRepository,
  InMemoryValidationRepository,
  InMemoryReportRepository,
  InMemoryMetricsRepository,
  InMemoryCertificationRepository,
  InMemoryValidationAuditRepository,
} from './infrastructure/InMemoryRepositories.js';

// ═══════════════════════════════════════════
// Host Stubs + EventBus
// ═══════════════════════════════════════════
export {
  MockEngineManifestProvider,
  MockEngineActionProvider,
  MockGuardianProvider,
  MockCompatibilityProvider,
  StaticValidationPolicyProvider,
  InMemoryEventBus,
  type RecordedEnvelope,
} from './infrastructure/hostAdapters.js';
