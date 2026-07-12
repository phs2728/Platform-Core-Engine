/**
 * Certification & Release Validator
 *
 * Produces release reports and platform readiness summaries.
 */

import type {
  EngineManifest,
  ReleaseReport,
  ReleaseCheck,
  PlatformReadiness,
  ContractResult,
  EventContractResult,
  ReferenceContractResult,
  DependencyResult,
  ApiDiffResult,
  EngineHealthScore,
  CompatibilityMatrix,
} from '../interfaces/index.js';

/**
 * Generate a release report for a single engine.
 */
export function generateReleaseReport(
  manifest: EngineManifest,
  contract: ContractResult,
  dependencyResult: DependencyResult,
  apiDiff: ApiDiffResult | undefined,
  healthScore: EngineHealthScore,
): ReleaseReport {
  const checks: ReleaseCheck[] = [];

  // Check 1: Contract validation
  const criticalViolations = contract.violations.filter((v) => v.severity === 'critical');
  checks.push({
    name: 'Contract Validation',
    status: criticalViolations.length > 0 ? 'fail' : 'pass',
    detail: `${contract.violations.length} violation(s), ${criticalViolations.length} critical`,
  });

  // Check 2: Dependency health
  const inCycle = dependencyResult.cycles.some((c) => c.includes(manifest.id));
  const forbiddenFor = dependencyResult.forbiddenImports.find((f) => f.engine === manifest.id);
  checks.push({
    name: 'Dependency Validation',
    status: inCycle || forbiddenFor ? 'fail' : 'pass',
    detail: inCycle ? 'circular dependency' : forbiddenFor ? 'forbidden import' : 'no cycles or forbidden imports',
  });

  // Check 3: API stability
  checks.push({
    name: 'API Stability',
    status: apiDiff?.hasBreakingChange ? 'fail' : 'pass',
    detail: apiDiff?.hasBreakingChange
      ? `${apiDiff.diffs.filter((d) => d.breaking).length} breaking change(s)`
      : 'no breaking changes',
  });

  // Check 4: Health score
  checks.push({
    name: 'Health Score',
    status: healthScore.score >= 70 ? 'pass' : healthScore.score >= 50 ? 'warning' : 'fail',
    detail: `${healthScore.score}/100 (${healthScore.grade})`,
  });

  // Check 5: Manifest completeness
  const hasProvides = manifest.provides.length > 0;
  const hasEvents = manifest.events_emitted.length > 0 || manifest.events_subscribed.length > 0;
  const hasBoundaries = !!manifest.strict_boundaries;
  checks.push({
    name: 'Manifest Completeness',
    status: hasProvides && hasEvents ? 'pass' : 'warning',
    detail: `provides: ${manifest.provides.length}, events: ${manifest.events_emitted.length}, boundaries: ${hasBoundaries ? 'yes' : 'no'}`,
  });

  // Determine overall status
  const hasFail = checks.some((c) => c.status === 'fail');
  const hasWarning = checks.some((c) => c.status === 'warning');
  const status = hasFail ? 'FAIL' : hasWarning ? 'WARNING' : 'PASS';

  const passCount = checks.filter((c) => c.status === 'pass').length;
  const summary = `${passCount}/${checks.length} checks passed — ${status}`;

  return {
    engineId: manifest.id,
    version: manifest.version,
    status,
    checks,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate platform readiness from all results.
 */
export function calculatePlatformReadiness(
  manifests: EngineManifest[],
  contracts: ContractResult[],
  eventResults: EventContractResult[],
  referenceResults: ReferenceContractResult[],
  dependencyResult: DependencyResult,
  apiDiffs: ApiDiffResult[],
  healthScores: EngineHealthScore[],
  matrix: CompatibilityMatrix,
): PlatformReadiness {
  const totalEngines = manifests.length;
  const brokenContracts = contracts.filter((c) => !c.passed).length;
  const breakingChanges = apiDiffs.filter((a) => a.hasBreakingChange).length;
  const warnings = contracts.reduce(
    (sum, c) => sum + c.violations.filter((v) => v.severity === 'warning').length, 0,
  );

  const totalPublicApis = manifests.reduce((sum, m) => sum + m.provides.length, 0);
  const totalEvents = manifests.reduce((sum, m) => sum + m.events_emitted.length, 0);
  const totalReferences = referenceResults.length;

  const averageHealthScore = healthScores.length > 0
    ? Math.round(healthScores.reduce((sum, h) => sum + h.score, 0) / healthScores.length)
    : 0;

  // Compatibility percent: how many matrix cells are pass / total non-n/a cells
  let compatCells = 0;
  let passCells = 0;
  for (const row of matrix.cells) {
    for (const cell of row) {
      if (cell.status !== 'n/a') {
        compatCells++;
        if (cell.status === 'pass') passCells++;
      }
    }
  }
  const compatibilityPercent = compatCells > 0
    ? Math.round((passCells / compatCells) * 100)
    : 100;

  const status = brokenContracts > 0 || breakingChanges > 0 || dependencyResult.cycles.length > 0
    ? 'FAIL'
    : warnings > 0 || compatibilityPercent < 100
      ? 'WARNING'
      : 'PASS';

  return {
    totalEngines,
    compatibilityPercent,
    brokenContracts,
    breakingChanges,
    warnings,
    totalPublicApis,
    totalEvents,
    totalReferences,
    averageHealthScore,
    status,
    generatedAt: new Date().toISOString(),
  };
}
