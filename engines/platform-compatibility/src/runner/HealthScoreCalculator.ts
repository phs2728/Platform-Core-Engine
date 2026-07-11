/**
 * Health Score Calculator
 *
 * Calculates a 0–100 health score for each engine based on multiple factors:
 *   - Contract violations (critical/warning)
 *   - Event contract status
 *   - Reference contract status
 *   - Dependency health
 *   - API stability
 *   - Engine manifest completeness
 */

import type {
  EngineManifest,
  EngineHealthScore,
  HealthFactor,
  ContractResult,
  EventContractResult,
  ReferenceContractResult,
  DependencyResult,
  ApiDiffResult,
} from '../interfaces/index.js';

/**
 * Calculate health score for a single engine.
 */
export function calculateEngineHealth(
  manifest: EngineManifest,
  contract: ContractResult,
  eventResults: EventContractResult[],
  referenceResults: ReferenceContractResult[],
  dependencyResult: DependencyResult,
  apiDiff: ApiDiffResult | undefined,
): EngineHealthScore {
  const factors: HealthFactor[] = [];

  // Factor 1: Contract violations (30 points)
  {
    const criticalCount = contract.violations.filter((v) => v.severity === 'critical').length;
    const warningCount = contract.violations.filter((v) => v.severity === 'warning').length;
    const penalty = criticalCount * 15 + warningCount * 5;
    const earned = Math.max(0, 30 - penalty);
    factors.push({
      name: 'Contract Violations',
      maxPoints: 30,
      earnedPoints: earned,
      detail: `${criticalCount} critical, ${warningCount} warning`,
    });
  }

  // Factor 2: Event contracts (15 points)
  {
    const engineEvents = eventResults.filter(
      (e) => e.publisher === manifest.id ||
             e.subscribers.includes(manifest.id) ||
             e.orphanedSubscribers.includes(manifest.id),
    );
    const failed = engineEvents.filter((e) => e.status === 'fail').length;
    const warned = engineEvents.filter((e) => e.status === 'warning').length;
    const penalty = failed * 8 + warned * 3;
    const earned = Math.max(0, 15 - penalty);
    factors.push({
      name: 'Event Contracts',
      maxPoints: 15,
      earnedPoints: earned,
      detail: `${engineEvents.length} events, ${failed} failed, ${warned} warning`,
    });
  }

  // Factor 3: Reference contracts (10 points)
  {
    const engineRefs = referenceResults.filter(
      (r) => r.ownerEngine === manifest.id || r.consumerEngines.includes(manifest.id),
    );
    const failed = engineRefs.filter((r) => r.status === 'fail').length;
    const penalty = failed * 10;
    const earned = Math.max(0, 10 - penalty);
    factors.push({
      name: 'Reference Contracts',
      maxPoints: 10,
      earnedPoints: earned,
      detail: `${engineRefs.length} refs, ${failed} failed`,
    });
  }

  // Factor 4: Dependency health (20 points)
  {
    const inCycle = dependencyResult.cycles.some((c) => c.includes(manifest.id));
    const forbiddenFor = dependencyResult.forbiddenImports.find((f) => f.engine === manifest.id);
    const layerViolation = dependencyResult.layerViolations.find((l) => l.engine === manifest.id);
    let penalty = 0;
    if (inCycle) penalty += 20;
    if (forbiddenFor) penalty += 10;
    if (layerViolation) penalty += 5;
    const earned = Math.max(0, 20 - penalty);
    factors.push({
      name: 'Dependency Health',
      maxPoints: 20,
      earnedPoints: earned,
      detail: inCycle ? 'in cycle' : forbiddenFor ? 'forbidden import' : layerViolation ? 'layer violation' : 'clean',
    });
  }

  // Factor 5: API stability (15 points)
  {
    const breakingCount = apiDiff?.diffs.filter((d) => d.breaking).length ?? 0;
    const earned = Math.max(0, 15 - breakingCount * 15);
    factors.push({
      name: 'API Stability',
      maxPoints: 15,
      earnedPoints: earned,
      detail: apiDiff?.hasBreakingChange ? `${breakingCount} breaking change(s)` : 'stable',
    });
  }

  // Factor 6: Manifest completeness (10 points)
  {
    let earned = 10;
    if (manifest.provides.length === 0) earned -= 5;
    if (manifest.events_emitted.length === 0) earned -= 3;
    if (!manifest.strict_boundaries) earned -= 2;
    factors.push({
      name: 'Manifest Completeness',
      maxPoints: 10,
      earnedPoints: Math.max(0, earned),
      detail: `provides: ${manifest.provides.length}, events: ${manifest.events_emitted.length}, boundaries: ${manifest.strict_boundaries ? 'yes' : 'no'}`,
    });
  }

  const totalEarned = factors.reduce((sum, f) => sum + f.earnedPoints, 0);
  const score = Math.min(100, Math.max(0, totalEarned));

  let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';

  return { engineId: manifest.id, score, grade, factors };
}

/**
 * Calculate health scores for all engines.
 */
export function calculateAllHealthScores(
  manifests: EngineManifest[],
  contracts: ContractResult[],
  eventResults: EventContractResult[],
  referenceResults: ReferenceContractResult[],
  dependencyResult: DependencyResult,
  apiDiffs: ApiDiffResult[],
): EngineHealthScore[] {
  const contractMap = new Map(contracts.map((c) => [c.engineId, c]));
  const apiDiffMap = new Map(apiDiffs.map((a) => [a.engineId, a]));

  return manifests
    .map((m) => calculateEngineHealth(
      m,
      contractMap.get(m.id) ?? { engineId: m.id, passed: true, violations: [], checkedAt: '' },
      eventResults,
      referenceResults,
      dependencyResult,
      apiDiffMap.get(m.id),
    ))
    .sort((a, b) => b.score - a.score);
}
