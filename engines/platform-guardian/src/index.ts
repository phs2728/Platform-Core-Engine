/**
 * Platform Guardian — Public API
 *
 * 사장님 확립 (2026-07-11): "Platform Guardian은 Platform의 CTO 역할을 수행한다.
 *  코드를 작성하는 것이 목적이 아니다. Platform의 품질과 안정성을 보호하는 것이 목적이다."
 *
 * Consumes all Compatibility Suite results and produces:
 *   - Guardian Audit (score, architecture, risk, debt, roadmap, decision)
 *   - 5 Markdown reports
 *   - Merge gate decision (APPROVED / CONDITIONS / REVIEW / REJECTED)
 *
 * NO BUSINESS LOGIC. PLATFORM GOVERNANCE ONLY.
 */

// ═══════════════════════════════════════════
// Core SDK Re-exports
// ═══════════════════════════════════════════
export { type Result, Ok, Err } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════
export type {
  GuardianInput,
  EngineManifestSummary,
  CompatibilityMatrixSummary,
  CompatibilityCellSummary,
  ContractResultSummary,
  ContractViolationSummary,
  EventContractSummary,
  ReferenceContractSummary,
  DependencySummary,
  DependencyEdgeSummary,
  ApiDiffSummary,
  HealthScoreSummary,
  ReleaseReportSummary,
  PlatformReadinessSummary,
  GuardianGrade,
  GuardianScore,
  ArchitectureIssueLevel,
  ArchitectureIssue,
  ArchitectureAnalysis,
  RiskLevel,
  RiskItem,
  RiskAnalysis,
  DebtSeverity,
  TechnicalDebtItem,
  TechnicalDebtAnalysis,
  RoadmapPriority,
  RoadmapRecommendation,
  RoadmapAnalysis,
  MigrationPlan,
  GuardianDecisionType,
  GuardianCondition,
  GuardianDecision,
  GuardianAudit,
  IGuardianReportWriter,
  IGuardianInputProvider,
} from './interfaces/index.js';

// ═══════════════════════════════════════════
// Analyzers
// ═══════════════════════════════════════════
export { analyzeArchitecture } from './analyzers/ArchitectureAnalyzer.js';
export { analyzeRisk, resetRiskIdCounter } from './analyzers/RiskAnalyzer.js';
export { analyzeTechnicalDebt, resetDebtIdCounter } from './analyzers/TechnicalDebtAnalyzer.js';
export { generateRoadmap, resetRoadmapIdCounter } from './analyzers/RoadmapGenerator.js';

// ═══════════════════════════════════════════
// Scorer + Decision
// ═══════════════════════════════════════════
export { calculateGuardianScore, scoreToGrade } from './scorer/GuardianScorer.js';
export { makeGuardianDecision } from './decision/GuardianDecisionMaker.js';

// ═══════════════════════════════════════════
// Report Generator
// ═══════════════════════════════════════════
export {
  generateGuardianReport,
  generateArchitectureReport,
  generateTechnicalDebtReport,
  generateRiskReport,
  generateRoadmapReport,
  generateAllGuardianReports,
} from './report/GuardianReportGenerator.js';

// ═══════════════════════════════════════════
// Use Cases
// ═══════════════════════════════════════════
export type { GuardianDeps } from './use-cases/GuardianUseCases.js';
export {
  runGuardianScanUseCase,
  runGuardianMergeUseCase,
  runGuardianReleaseUseCase,
  runGuardianRoadmapUseCase,
  runGuardianHealthUseCase,
  runFullGuardianScanWithReportsUseCase,
} from './use-cases/GuardianUseCases.js';

// ═══════════════════════════════════════════
// Infrastructure
// ═══════════════════════════════════════════
export {
  InMemoryInputProvider,
  CompatibilitySuiteBridge,
  FileSystemGuardianReportWriter,
  InMemoryGuardianReportWriter,
} from './infrastructure/GuardianInfrastructure.js';
