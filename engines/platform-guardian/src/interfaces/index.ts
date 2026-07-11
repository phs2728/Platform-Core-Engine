/**
 * Platform Guardian — Core Types
 *
 * 사장님 확립 (2026-07-11): "Platform Guardian은 Platform의 CTO 역할을 수행한다.
 *  코드를 작성하는 것이 목적이 아니다. Platform의 품질과 안정성을 보호하는 것이 목적이다."
 *
 * Guardian은 Compatibility Suite의 모든 결과를 종합하여
 * 최종 Merge 여부를 결정하는 AI의 데이터 모델이다.
 *
 * NO BUSINESS LOGIC. PLATFORM GOVERNANCE ONLY.
 */

// ═══════════════════════════════════════════
// Guardian Input (from Compatibility Suite)
// ═══════════════════════════════════════════

export interface GuardianInput {
  manifests: EngineManifestSummary[];
  compatibilityMatrix: CompatibilityMatrixSummary | null;
  contractResults: ContractResultSummary[];
  eventResults: EventContractSummary[];
  referenceResults: ReferenceContractSummary[];
  dependencyResult: DependencySummary | null;
  apiDiffResults: ApiDiffSummary[];
  healthScores: HealthScoreSummary[];
  releaseReports: ReleaseReportSummary[];
  platformReadiness: PlatformReadinessSummary | null;
}

export interface EngineManifestSummary {
  id: string;
  name: string;
  version: string;
  phase: number;
  status?: string;
  depends_on: string[];
  provides: string[];
  events_emitted: string[];
  events_subscribed: string[];
  strict_boundaries?: { owns: string[]; forbidden: string[] };
}

export interface CompatibilityMatrixSummary {
  engines: string[];
  cells: CompatibilityCellSummary[][];
}

export interface CompatibilityCellSummary {
  from: string;
  to: string;
  relation: string;
  status: string;
  detail: string;
}

export interface ContractResultSummary {
  engineId: string;
  passed: boolean;
  violations: ContractViolationSummary[];
}

export interface ContractViolationSummary {
  engineId: string;
  contractType: string;
  severity: 'critical' | 'warning' | 'info';
  rule: string;
  message: string;
}

export interface EventContractSummary {
  eventType: string;
  publisher: string;
  subscribers: string[];
  hasPublisher: boolean;
  hasSubscribers: boolean;
  orphanedSubscribers: string[];
  status: 'pass' | 'fail' | 'warning';
}

export interface ReferenceContractSummary {
  refType: string;
  ownerEngine: string;
  consumerEngines: string[];
  ownerExists: boolean;
  status: 'pass' | 'fail' | 'warning';
}

export interface DependencySummary {
  edges: DependencyEdgeSummary[];
  cycles: string[][];
  forbiddenImports: { engine: string; imports: string[] }[];
  layerViolations: { engine: string; layer: string; detail: string }[];
  status: 'pass' | 'fail' | 'warning';
}

export interface DependencyEdgeSummary {
  from: string;
  to: string;
  declared: boolean;
}

export interface ApiDiffSummary {
  engineId: string;
  hasBreakingChange: boolean;
  diffs: { kind: string; exportName: string; detail: string; breaking: boolean }[];
}

export interface HealthScoreSummary {
  engineId: string;
  score: number;
  grade: string;
  factors: { name: string; maxPoints: number; earnedPoints: number; detail: string }[];
}

export interface ReleaseReportSummary {
  engineId: string;
  version: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  checks: { name: string; status: string; detail: string }[];
  summary: string;
}

export interface PlatformReadinessSummary {
  totalEngines: number;
  compatibilityPercent: number;
  brokenContracts: number;
  breakingChanges: number;
  warnings: number;
  totalPublicApis: number;
  totalEvents: number;
  totalReferences: number;
  averageHealthScore: number;
  status: 'PASS' | 'FAIL' | 'WARNING';
}

// ═══════════════════════════════════════════
// Guardian Scores
// ═══════════════════════════════════════════

export type GuardianGrade = 'AAA' | 'AA' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface GuardianScore {
  overall: number;              // 0–100
  grade: GuardianGrade;
  architectureScore: number;    // 0–100
  compatibilityScore: number;   // 0–100
  maintainabilityScore: number; // 0–100
  securityScore: number;        // 0–100
  performanceScore: number;     // 0–100
  contractScore: number;        // 0–100
}

// ═══════════════════════════════════════════
// Architecture Analysis
// ═══════════════════════════════════════════

export type ArchitectureIssueLevel = 'critical' | 'warning' | 'info';

export interface ArchitectureIssue {
  level: ArchitectureIssueLevel;
  category: 'layering' | 'coupling' | 'boundary' | 'phase' | 'ownership' | 'drift';
  engineId?: string;
  rule: string;
  message: string;
  recommendation: string;
}

export interface ArchitectureAnalysis {
  score: number;
  issues: ArchitectureIssue[];
  layerDistribution: Record<number, string[]>;  // phase → engine IDs
  maxDepth: number;
  isClean: boolean;
}

// ═══════════════════════════════════════════
// Risk Analysis
// ═══════════════════════════════════════════

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'negligible';

export interface RiskItem {
  id: string;
  level: RiskLevel;
  category: 'contract' | 'dependency' | 'api' | 'event' | 'reference' | 'architecture' | 'operational';
  title: string;
  description: string;
  affectedEngines: string[];
  mitigation: string;
}

export interface RiskAnalysis {
  overallRisk: RiskLevel;
  riskScore: number;           // 0–100 (higher = more risk)
  risks: RiskItem[];
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

// ═══════════════════════════════════════════
// Technical Debt Analysis
// ═══════════════════════════════════════════

export type DebtSeverity = 'high' | 'medium' | 'low';

export interface TechnicalDebtItem {
  id: string;
  severity: DebtSeverity;
  category: 'missing-boundaries' | 'missing-tests' | 'phase-violation'
    | 'orphan-events' | 'draft-status' | 'low-health' | 'over-coupled'
    | 'missing-manifest' | 'deprecated-api';
  engineId?: string;
  title: string;
  detail: string;
  estimatedEffort: 'S' | 'M' | 'L';
}

export interface TechnicalDebtAnalysis {
  totalDebtItems: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
  debtScore: number;            // 0–100 (higher = more debt)
  items: TechnicalDebtItem[];
}

// ═══════════════════════════════════════════
// Roadmap
// ═══════════════════════════════════════════

export type RoadmapPriority = 'P0' | 'P1' | 'P2' | 'P3';

export interface RoadmapRecommendation {
  id: string;
  priority: RoadmapPriority;
  type: 'new-engine' | 'rfc' | 'migration' | 'refactor' | 'stabilize' | 'deprecate';
  title: string;
  description: string;
  rationale: string;
  targetEngines?: string[];
  estimatedEffort: 'S' | 'M' | 'L' | 'XL';
  prerequisites?: string[];
}

export interface RoadmapAnalysis {
  recommendations: RoadmapRecommendation[];
  nextEngines: string[];
  nextRFCs: string[];
  migrationPlans: MigrationPlan[];
}

export interface MigrationPlan {
  id: string;
  title: string;
  from: string;
  to: string;
  reason: string;
  steps: string[];
  affectedEngines: string[];
}

// ═══════════════════════════════════════════
// Guardian Decision
// ═══════════════════════════════════════════

export type GuardianDecisionType =
  | 'APPROVED'
  | 'APPROVED_WITH_CONDITIONS'
  | 'REVIEW_REQUIRED'
  | 'REJECTED';

export interface GuardianCondition {
  description: string;
  blocking: boolean;
}

export interface GuardianDecision {
  decision: GuardianDecisionType;
  summary: string;
  conditions: GuardianCondition[];
  blockers: string[];
  approvedBy: string;          // 'platform-guardian'
  decidedAt: string;
  canMerge: boolean;
}

// ═══════════════════════════════════════════
// Guardian Audit (the full output)
// ═══════════════════════════════════════════

export interface GuardianAudit {
  score: GuardianScore;
  architecture: ArchitectureAnalysis;
  risk: RiskAnalysis;
  technicalDebt: TechnicalDebtAnalysis;
  roadmap: RoadmapAnalysis;
  decision: GuardianDecision;
  inputSnapshot: {
    totalEngines: number;
    totalPublicApis: number;
    totalEvents: number;
    brokenContracts: number;
    breakingChanges: number;
    cycles: number;
  };
  generatedAt: string;
}

// ═══════════════════════════════════════════
// Port Interfaces (DI)
// ═══════════════════════════════════════════

export interface IGuardianReportWriter {
  writeReport(filename: string, content: string): Promise<void>;
}

export interface IGuardianInputProvider {
  collect(): Promise<GuardianInput>;
}
