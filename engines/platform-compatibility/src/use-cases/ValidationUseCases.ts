/**
 * Validation Use Cases
 *
 * The core use cases that run each validation type and store results.
 * Each use case loads manifests, runs the appropriate validator,
 * and saves results to the result store.
 */

import { Ok, Err, type Result } from '@platform/core-sdk';
import type { CompatibilitySuiteDeps } from './types.js';
import { validateEventContracts } from '../events/EventContractValidator.js';
import { validateReferenceContracts } from '../references/ReferenceContractValidator.js';
import { validateDependencies } from '../dependencies/DependencyValidator.js';
import { captureAllSnapshots, diffAllSnapshots } from '../apis/ApiCompatibilityValidator.js';
import { aggregateContractResults } from '../contracts/ContractValidator.js';
import { buildCompatibilityMatrix, buildEventGraph } from '../runner/CompatibilityMatrixBuilder.js';
import { calculateAllHealthScores } from '../runner/HealthScoreCalculator.js';
import { generateReleaseReport, calculatePlatformReadiness } from '../certification/CertificationValidator.js';
import type {
  EngineManifest,
  EventContractResult,
  ReferenceContractResult,
  DependencyResult,
  ApiDiffResult,
  ContractResult,
  CompatibilityMatrix,
  EventGraph,
  EngineHealthScore,
  ReleaseReport,
  PlatformReadiness,
} from '../interfaces/index.js';

// ════════════════════════════════════════════════════════════════════════════
// Individual Validation Use Cases
// ════════════════════════════════════════════════════════════════════════════

export async function runEventValidationUseCase(
  deps: CompatibilitySuiteDeps,
): Promise<Result<EventContractResult[], Error>> {
  const manifests = await deps.manifestLoader.loadAll();
  const results = validateEventContracts(manifests);
  await deps.resultStore.saveEventResults(results);
  return Ok(results);
}

export async function runReferenceValidationUseCase(
  deps: CompatibilitySuiteDeps,
): Promise<Result<ReferenceContractResult[], Error>> {
  const manifests = await deps.manifestLoader.loadAll();
  const results = validateReferenceContracts(manifests);
  await deps.resultStore.saveReferenceResults(results);
  return Ok(results);
}

export async function runDependencyValidationUseCase(
  deps: CompatibilitySuiteDeps,
): Promise<Result<DependencyResult, Error>> {
  const manifests = await deps.manifestLoader.loadAll();
  const result = validateDependencies(manifests);
  await deps.resultStore.saveDependencyResult(result);
  return Ok(result);
}

export async function runApiValidationUseCase(
  deps: CompatibilitySuiteDeps,
): Promise<Result<ApiDiffResult[], Error>> {
  const manifests = await deps.manifestLoader.loadAll();
  const capturedAt = new Date().toISOString();

  // Load existing baselines
  const baselinesList = await deps.snapshotStore.listAll();
  const baselines = new Map(baselinesList.map((s) => [s.engineId, s]));

  const results = diffAllSnapshots(manifests, baselines, capturedAt);
  await deps.resultStore.saveApiDiffResults(results);

  // Save current snapshots as new baselines
  const snapshots = captureAllSnapshots(manifests, capturedAt);
  for (const snap of snapshots) {
    await deps.snapshotStore.saveBaseline(snap.engineId, snap);
  }

  return Ok(results);
}

export async function runContractValidationUseCase(
  deps: CompatibilitySuiteDeps,
): Promise<Result<ContractResult[], Error>> {
  const manifests = await deps.manifestLoader.loadAll();

  // Ensure sub-validations have run (or run them now)
  const events = (await deps.resultStore.getEventResults()).length > 0
    ? await deps.resultStore.getEventResults()
    : validateEventContracts(manifests);

  const references = (await deps.resultStore.getReferenceResults()).length > 0
    ? await deps.resultStore.getReferenceResults()
    : validateReferenceContracts(manifests);

  const dependency = (await deps.resultStore.getDependencyResult())
    ?? validateDependencies(manifests);

  const capturedAt = new Date().toISOString();
  const baselinesList = await deps.snapshotStore.listAll();
  const baselines = new Map(baselinesList.map((s) => [s.engineId, s]));
  const apiDiffs = diffAllSnapshots(manifests, baselines, capturedAt);

  const results = aggregateContractResults(manifests, events, references, apiDiffs, dependency);
  await deps.resultStore.saveContractResults(results);
  return Ok(results);
}

// ════════════════════════════════════════════════════════════════════════════
// Matrix + Graph Use Cases
// ════════════════════════════════════════════════════════════════════════════

export async function buildCompatibilityMatrixUseCase(
  deps: CompatibilitySuiteDeps,
): Promise<Result<CompatibilityMatrix, Error>> {
  const manifests = await deps.manifestLoader.loadAll();

  const events = await deps.resultStore.getEventResults();
  const references = await deps.resultStore.getReferenceResults();
  const dependency = await deps.resultStore.getDependencyResult();

  const matrix = buildCompatibilityMatrix(
    manifests,
    events,
    references,
    dependency ?? { status: 'pass', cycles: [], edges: [], forbiddenImports: [], layerViolations: [] } as DependencyResult,
  );
  await deps.resultStore.saveCompatibilityMatrix(matrix);
  return Ok(matrix);
}

export async function buildEventGraphUseCase(
  deps: CompatibilitySuiteDeps,
): Promise<Result<EventGraph, Error>> {
  const manifests = await deps.manifestLoader.loadAll();
  const events = await deps.resultStore.getEventResults();
  const graph = buildEventGraph(manifests, events);
  await deps.resultStore.saveEventGraph(graph);
  return Ok(graph);
}

// ════════════════════════════════════════════════════════════════════════════
// Health + Release Use Cases
// ════════════════════════════════════════════════════════════════════════════

export async function calculateHealthScoresUseCase(
  deps: CompatibilitySuiteDeps,
): Promise<Result<EngineHealthScore[], Error>> {
  const manifests = await deps.manifestLoader.loadAll();
  const contracts = await deps.resultStore.getContractResults();
  const events = await deps.resultStore.getEventResults();
  const references = await deps.resultStore.getReferenceResults();
  const dependency = (await deps.resultStore.getDependencyResult())
    ?? { status: 'pass' as const, cycles: [], edges: [], forbiddenImports: [], layerViolations: [] };
  const apiDiffs = await deps.resultStore.getApiDiffResults();

  const scores = calculateAllHealthScores(manifests, contracts, events, references, dependency, apiDiffs);
  await deps.resultStore.saveHealthScores(scores);
  return Ok(scores);
}

export async function generateReleaseReportsUseCase(
  deps: CompatibilitySuiteDeps,
): Promise<Result<ReleaseReport[], Error>> {
  const manifests = await deps.manifestLoader.loadAll();
  const contracts = await deps.resultStore.getContractResults();
  const contractMap = new Map(contracts.map((c) => [c.engineId, c]));
  const dependency = (await deps.resultStore.getDependencyResult())
    ?? { status: 'pass' as const, cycles: [], edges: [], forbiddenImports: [], layerViolations: [] };
  const apiDiffs = await deps.resultStore.getApiDiffResults();
  const apiDiffMap = new Map(apiDiffs.map((a) => [a.engineId, a]));
  const healthScores = await deps.resultStore.getHealthScores();
  const healthMap = new Map(healthScores.map((h) => [h.engineId, h]));

  const reports: ReleaseReport[] = [];
  for (const m of manifests) {
    const contract = contractMap.get(m.id) ?? { engineId: m.id, passed: true, violations: [], checkedAt: '' };
    const apiDiff = apiDiffMap.get(m.id);
    const health = healthMap.get(m.id) ?? { engineId: m.id, score: 0, grade: 'F' as const, factors: [] };
    reports.push(generateReleaseReport(m, contract, dependency, apiDiff, health));
  }

  return Ok(reports.sort((a, b) => a.engineId.localeCompare(b.engineId)));
}

export async function calculatePlatformReadinessUseCase(
  deps: CompatibilitySuiteDeps,
): Promise<Result<PlatformReadiness, Error>> {
  const manifests = await deps.manifestLoader.loadAll();
  const contracts = await deps.resultStore.getContractResults();
  const events = await deps.resultStore.getEventResults();
  const references = await deps.resultStore.getReferenceResults();
  const dependency = (await deps.resultStore.getDependencyResult())
    ?? { status: 'pass' as const, cycles: [], edges: [], forbiddenImports: [], layerViolations: [] };
  const apiDiffs = await deps.resultStore.getApiDiffResults();
  const healthScores = await deps.resultStore.getHealthScores();
  const matrix = await deps.resultStore.getCompatibilityMatrix()
    ?? { engines: manifests.map((m) => m.id), cells: [], generatedAt: '' };

  const readiness = calculatePlatformReadiness(
    manifests, contracts, events, references, dependency, apiDiffs, healthScores, matrix,
  );
  await deps.resultStore.savePlatformReadiness(readiness);
  return Ok(readiness);
}

// ════════════════════════════════════════════════════════════════════════════
// Full Platform Scan — runs all validations in order
// ════════════════════════════════════════════════════════════════════════════

export async function runFullPlatformScanUseCase(
  deps: CompatibilitySuiteDeps,
): Promise<Result<PlatformReadiness, Error>> {
  // Run all validations in order
  await runEventValidationUseCase(deps);
  await runReferenceValidationUseCase(deps);
  await runDependencyValidationUseCase(deps);
  await runApiValidationUseCase(deps);
  await runContractValidationUseCase(deps);
  await buildCompatibilityMatrixUseCase(deps);
  await buildEventGraphUseCase(deps);
  await calculateHealthScoresUseCase(deps);
  const readiness = await calculatePlatformReadinessUseCase(deps);
  if (!readiness.ok) return readiness;
  const manifests = await deps.manifestLoader.loadAll();
  const totalPublicApis = manifests.reduce((sum, manifest) => sum + manifest.provides.length, 0);
  const totalEvents = manifests.reduce((sum, manifest) => sum + manifest.events_emitted.length, 0);
  if (manifests.length === 0 || totalPublicApis === 0 || totalEvents === 0) {
    return Err(new Error('Manifest discovery failed: engines, public APIs, and events must all be discovered'));
  }
  return readiness;
}
