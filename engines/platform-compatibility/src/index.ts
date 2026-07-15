/**
 * Platform Compatibility Suite — Public API
 *
 * 사장님 확립 (2026-07-11): "Platform이 커질수록 Engine 간 계약(Contract)이
 * 깨지는 것이 더 위험합니다. 호환성과 품질을 자동 검증하는 QA Engine을 만드세요."
 *
 * NO BUSINESS LOGIC. QA ONLY.
 * Validates contracts, events, references, APIs, dependencies across all engines.
 */

// ═══════════════════════════════════════════
// Core SDK Re-exports
// ═══════════════════════════════════════════
export { type Result, Ok, Err } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════
export type {
  EngineManifest,
  ContractType, Severity, ContractViolation, ContractResult,
  EventContract, EventContractResult,
  ReferenceContract, ReferenceContractResult,
  ApiSnapshot, ApiDiffEntry, ApiDiffResult,
  DependencyEdge, DependencyResult,
  CompatibilityCell, CompatibilityMatrix,
  EngineHealthScore, HealthFactor,
  ReleaseStatus, ReleaseReport, ReleaseCheck,
  PlatformReadiness,
  EventGraphEdge, EventGraph,
  IEngineManifestLoader, IApiSnapshotStore, IReportWriter, ICompatibilityResultStore,
  ManifestLoadResult,
} from './interfaces/index.js';

// ═══════════════════════════════════════════
// Validators (domain)
// ═══════════════════════════════════════════
export {
  validateEventContracts, buildEventPublisherMap, buildEventSubscriberMap,
  extractEventContracts,
} from './events/EventContractValidator.js';

export {
  validateReferenceContracts, extractReferenceContracts,
  REFERENCE_OWNERSHIP, getReferenceRequiredFields, extractReferenceConsumers,
} from './references/ReferenceContractValidator.js';

export {
  validateDependencies, buildDependencyGraph, buildEdges,
  detectCycles, detectPhaseViolations, detectMissingDependencies,
} from './dependencies/DependencyValidator.js';

export {
  captureSnapshot, captureAllSnapshots, diffSnapshots, diffAllSnapshots,
  hashExports,
} from './apis/ApiCompatibilityValidator.js';

export { aggregateContractResults } from './contracts/ContractValidator.js';

// ═══════════════════════════════════════════
// Runner (matrix + graph + health)
// ═══════════════════════════════════════════
export {
  buildCompatibilityMatrix, buildEventGraph,
} from './runner/CompatibilityMatrixBuilder.js';

export {
  calculateEngineHealth, calculateAllHealthScores,
} from './runner/HealthScoreCalculator.js';

export {
  generateReleaseReport, calculatePlatformReadiness,
} from './certification/CertificationValidator.js';

// ═══════════════════════════════════════════
// Use Cases
// ═══════════════════════════════════════════
export type { CompatibilitySuiteDeps } from './use-cases/types.js';

export {
  runEventValidationUseCase,
  runReferenceValidationUseCase,
  runDependencyValidationUseCase,
  runApiValidationUseCase,
  runContractValidationUseCase,
  buildCompatibilityMatrixUseCase,
  buildEventGraphUseCase,
  calculateHealthScoresUseCase,
  generateReleaseReportsUseCase,
  calculatePlatformReadinessUseCase,
  runFullPlatformScanUseCase,
} from './use-cases/ValidationUseCases.js';

// ═══════════════════════════════════════════
// Report Generator
// ═══════════════════════════════════════════
export {
  generateCompatibilityReport,
  generateContractReport,
  generateDependencyReport,
  generateEventReport,
  generateReferenceReport,
  generateApiReport,
  generateReleaseReport as generateReleaseReportDoc,
  generateHealthReport,
  generateAllReports,
} from './report/ReportGenerator.js';

// ═══════════════════════════════════════════
// Infrastructure
// ═══════════════════════════════════════════
export {
  FileSystemEngineManifestLoader, InMemoryManifestLoader,
} from './infrastructure/ManifestLoader.js';

export { InMemoryResultStore } from './infrastructure/ResultStore.js';

export { InMemoryApiSnapshotStore } from './infrastructure/SnapshotStore.js';

export {
  FileSystemReportWriter, InMemoryReportWriter,
} from './infrastructure/ReportWriter.js';
