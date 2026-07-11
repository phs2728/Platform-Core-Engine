/**
 * Guardian Scorer
 *
 * 사장님 확립: "Guardian은 6개 서브스코어로 Platform 점수를 계산하고
 *  AAA, AA, A, B, C, D, F 등급을 부여한다."
 *
 * Sub-scores:
 *   1. Architecture Score  — layering, boundaries, coupling, drift
 *   2. Compatibility Score — matrix pass rate, event/reference health
 *   3. Maintainability Score — health scores, technical debt
 *   4. Security Score       — boundary violations, forbidden imports
 *   5. Performance Score    — dependency depth, coupling overhead
 *   6. Contract Score       — contract violations, breaking changes
 */

import type {
  GuardianInput,
  GuardianScore,
  GuardianGrade,
  ArchitectureAnalysis,
  RiskAnalysis,
  TechnicalDebtAnalysis,
} from '../interfaces/index.js';

/**
 * Calculate the full Guardian score from all analysis results.
 */
export function calculateGuardianScore(
  input: GuardianInput,
  arch: ArchitectureAnalysis,
  risk: RiskAnalysis,
  debt: TechnicalDebtAnalysis,
): GuardianScore {
  const architectureScore = calcArchitectureScore(input, arch);
  const compatibilityScore = calcCompatibilityScore(input);
  const maintainabilityScore = calcMaintainabilityScore(input, debt);
  const securityScore = calcSecurityScore(input, arch);
  const performanceScore = calcPerformanceScore(input, arch);
  const contractScore = calcContractScore(input);

  // Weighted overall score
  const overall = Math.round(
    architectureScore * 0.20 +
    compatibilityScore * 0.20 +
    maintainabilityScore * 0.15 +
    securityScore * 0.15 +
    performanceScore * 0.10 +
    contractScore * 0.20,
  );

  const grade = scoreToGrade(overall);

  return {
    overall,
    grade,
    architectureScore,
    compatibilityScore,
    maintainabilityScore,
    securityScore,
    performanceScore,
    contractScore,
  };
}

function calcArchitectureScore(input: GuardianInput, arch: ArchitectureAnalysis): number {
  return arch.score;
}

function calcCompatibilityScore(input: GuardianInput): number {
  if (!input.platformReadiness) return 0;
  const readiness = input.platformReadiness;

  // Base: compatibility percent from matrix
  let score = readiness.compatibilityPercent;

  // Penalty for broken contracts
  score -= readiness.brokenContracts * 5;

  // Penalty for broken event contracts
  const failedEvents = input.eventResults.filter((e) => e.status === 'fail').length;
  score -= failedEvents * 3;

  // Penalty for broken reference contracts
  const failedRefs = input.referenceResults.filter((r) => r.status === 'fail').length;
  score -= failedRefs * 3;

  return Math.max(0, Math.min(100, score));
}

function calcMaintainabilityScore(input: GuardianInput, debt: TechnicalDebtAnalysis): number {
  // Base: average health score
  const avgHealth = input.platformReadiness?.averageHealthScore ?? 0;
  let score = avgHealth;

  // Penalty for technical debt
  score -= debt.debtScore * 0.3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function calcSecurityScore(input: GuardianInput, arch: ArchitectureAnalysis): number {
  let score = 100;

  // Boundary violations = security risk
  const boundaryIssues = arch.issues.filter((i) => i.category === 'boundary').length;
  score -= boundaryIssues * 15;

  // Ownership conflicts = security risk
  const ownershipIssues = arch.issues.filter((i) => i.category === 'ownership').length;
  score -= ownershipIssues * 20;

  // Forbidden imports = security risk
  const forbiddenCount = input.dependencyResult?.forbiddenImports.length ?? 0;
  score -= forbiddenCount * 10;

  // Missing boundaries = security risk
  const missingBoundaries = input.manifests.filter((m) => !m.strict_boundaries).length;
  score -= missingBoundaries * 2;

  return Math.max(0, Math.min(100, score));
}

function calcPerformanceScore(input: GuardianInput, arch: ArchitectureAnalysis): number {
  let score = 100;

  // Deep dependency chains hurt performance (initialization, startup)
  if (arch.maxDepth > 5) score -= (arch.maxDepth - 5) * 10;

  // Over-coupling hurts performance (more init-time overhead)
  const overCoupled = arch.issues.filter((i) => i.category === 'coupling').length;
  score -= overCoupled * 5;

  return Math.max(0, Math.min(100, score));
}

function calcContractScore(input: GuardianInput): number {
  let score = 100;

  // Critical contract violations
  const criticalViolations = input.contractResults.flatMap((c) => c.violations)
    .filter((v) => v.severity === 'critical').length;
  score -= criticalViolations * 15;

  // Breaking API changes
  const breakingChanges = input.apiDiffResults.filter((a) => a.hasBreakingChange).length;
  score -= breakingChanges * 20;

  // Warnings
  const warningViolations = input.contractResults.flatMap((c) => c.violations)
    .filter((v) => v.severity === 'warning').length;
  score -= warningViolations * 3;

  return Math.max(0, Math.min(100, score));
}

/**
 * Convert a 0–100 score to a Guardian grade.
 */
export function scoreToGrade(score: number): GuardianGrade {
  if (score >= 97) return 'AAA';
  if (score >= 90) return 'AA';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}
