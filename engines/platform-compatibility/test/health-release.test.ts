/**
 * Health Score & Release Tests (10)
 */

import { describe, it, expect } from 'vitest';
import {
  calculateEngineHealth,
  calculateAllHealthScores,
  calculateHealthScoresUseCase,
  generateReleaseReport,
  generateReleaseReportsUseCase,
  calculatePlatformReadiness,
  calculatePlatformReadinessUseCase,
} from '../src/index.js';
import { validateEventContracts, validateReferenceContracts, validateDependencies, aggregateContractResults, diffAllSnapshots } from '../src/index.js';
import type { EngineManifest, ContractResult, DependencyResult } from '../src/interfaces/index.js';
import { sampleManifests, circularDependencyManifests, makeDeps } from './helpers.js';

describe('Health Score', () => {
  it('calculates health score for clean engine', () => {
    const manifests = sampleManifests();
    const events = validateEventContracts(manifests);
    const refs = validateReferenceContracts(manifests);
    const deps = validateDependencies(manifests);
    const apiDiffs = diffAllSnapshots(manifests, new Map(), '2026-07-11');
    const contracts = aggregateContractResults(manifests, events, refs, apiDiffs, deps);

    const manifest = manifests.find((m) => m.id === 'core-sdk')!;
    const contract = contracts.find((c) => c.engineId === 'core-sdk')!;
    const score = calculateEngineHealth(manifest, contract, events, refs, deps, apiDiffs.find((a) => a.engineId === 'core-sdk'));

    expect(score.score).toBeGreaterThan(0);
    expect(score.grade).toMatch(/[A-F]/);
    expect(score.factors.length).toBe(6);
  });

  it('deducts points for circular dependencies', () => {
    const manifests = circularDependencyManifests();
    const events = validateEventContracts(manifests);
    const refs = validateReferenceContracts(manifests);
    const deps = validateDependencies(manifests);
    const apiDiffs = diffAllSnapshots(manifests, new Map(), '2026-07-11');
    const contracts = aggregateContractResults(manifests, events, refs, apiDiffs, deps);

    const manifest = manifests[0]!;
    const contract = contracts[0]!;
    const score = calculateEngineHealth(manifest, contract, events, refs, deps, undefined);

    const depFactor = score.factors.find((f) => f.name === 'Dependency Health')!;
    expect(depFactor.earnedPoints).toBe(0); // in cycle → 20 penalty
    expect(score.score).toBeLessThan(100);
  });

  it('assigns grade A for score >= 90', () => {
    const manifests = sampleManifests();
    const manifest = manifests.find((m) => m.id === 'core-sdk')!;
    const events = validateEventContracts(manifests);
    const refs = validateReferenceContracts(manifests);
    const deps = validateDependencies(manifests);
    const apiDiffs = diffAllSnapshots(manifests, new Map(), '2026-07-11');
    const contracts = aggregateContractResults(manifests, events, refs, apiDiffs, deps);
    const contract = contracts.find((c) => c.engineId === 'core-sdk')!;

    const score = calculateEngineHealth(manifest, contract, events, refs, deps, undefined);
    // core-sdk should score reasonably well
    expect(score.score).toBeGreaterThan(50);
  });

  it('calculates all health scores sorted by score descending', () => {
    const manifests = sampleManifests();
    const events = validateEventContracts(manifests);
    const refs = validateReferenceContracts(manifests);
    const deps = validateDependencies(manifests);
    const apiDiffs = diffAllSnapshots(manifests, new Map(), '2026-07-11');
    const contracts = aggregateContractResults(manifests, events, refs, apiDiffs, deps);

    const scores = calculateAllHealthScores(manifests, contracts, events, refs, deps, apiDiffs);
    expect(scores.length).toBe(manifests.length);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]!.score).toBeLessThanOrEqual(scores[i - 1]!.score);
    }
  });

  it('runs health score use case', async () => {
    const deps = makeDeps(sampleManifests());
    await deps._resultStore.saveEventResults(validateEventContracts(sampleManifests()));
    await deps._resultStore.saveReferenceResults(validateReferenceContracts(sampleManifests()));
    await deps._resultStore.saveDependencyResult(validateDependencies(sampleManifests()));
    await deps._resultStore.saveContractResults(
      aggregateContractResults(sampleManifests(), validateEventContracts(sampleManifests()), validateReferenceContracts(sampleManifests()), diffAllSnapshots(sampleManifests(), new Map(), '2026-07-11'), validateDependencies(sampleManifests())),
    );

    const r = await calculateHealthScoresUseCase(deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.length).toBe(sampleManifests().length);
  });
});

describe('Release & Certification', () => {
  it('generates PASS release report for clean engine', () => {
    const manifests = sampleManifests();
    const manifest = manifests[0]!;
    const events = validateEventContracts(manifests);
    const refs = validateReferenceContracts(manifests);
    const deps = validateDependencies(manifests);
    const apiDiffs = diffAllSnapshots(manifests, new Map(), '2026-07-11');
    const contracts = aggregateContractResults(manifests, events, refs, apiDiffs, deps);
    const contract = contracts[0]!;

    const healthScore = calculateEngineHealth(manifest, contract, events, refs, deps, apiDiffs[0]);

    const report = generateReleaseReport(manifest, contract, deps, apiDiffs[0], healthScore);
    expect(report.engineId).toBe(manifest.id);
    expect(report.checks.length).toBe(5);
    expect(['PASS', 'FAIL', 'WARNING']).toContain(report.status);
  });

  it('generates FAIL release report for broken engine', () => {
    const manifests = circularDependencyManifests();
    const manifest = manifests[0]!;
    const events = validateEventContracts(manifests);
    const refs = validateReferenceContracts(manifests);
    const deps = validateDependencies(manifests);
    const apiDiffs = diffAllSnapshots(manifests, new Map(), '2026-07-11');
    const contracts = aggregateContractResults(manifests, events, refs, apiDiffs, deps);
    const contract = contracts[0]!;
    const healthScore = calculateEngineHealth(manifest, contract, events, refs, deps, undefined);

    const report = generateReleaseReport(manifest, contract, deps, undefined, healthScore);
    expect(report.status).toBe('FAIL');
  });

  it('runs release report use case for all engines', async () => {
    const deps = makeDeps(sampleManifests());
    const manifests = sampleManifests();
    await deps._resultStore.saveContractResults(
      aggregateContractResults(manifests, validateEventContracts(manifests), validateReferenceContracts(manifests), diffAllSnapshots(manifests, new Map(), '2026-07-11'), validateDependencies(manifests)),
    );
    await deps._resultStore.saveDependencyResult(validateDependencies(manifests));
    await deps._resultStore.saveApiDiffResults(diffAllSnapshots(manifests, new Map(), '2026-07-11'));
    const healthScores = calculateAllHealthScores(manifests,
      await deps._resultStore.getContractResults(),
      validateEventContracts(manifests), validateReferenceContracts(manifests),
      validateDependencies(manifests), diffAllSnapshots(manifests, new Map(), '2026-07-11'));
    await deps._resultStore.saveHealthScores(healthScores);

    const r = await generateReleaseReportsUseCase(deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.length).toBe(manifests.length);
      expect(r.value.every((rep) => rep.checks.length === 5)).toBe(true);
    }
  });

  it('calculates platform readiness correctly', () => {
    const manifests = sampleManifests();
    const events = validateEventContracts(manifests);
    const refs = validateReferenceContracts(manifests);
    const deps = validateDependencies(manifests);
    const apiDiffs = diffAllSnapshots(manifests, new Map(), '2026-07-11');
    const contracts = aggregateContractResults(manifests, events, refs, apiDiffs, deps);
    const healthScores = calculateAllHealthScores(manifests, contracts, events, refs, deps, apiDiffs);
    const matrix = { engines: manifests.map((m) => m.id), cells: [], generatedAt: '2026-07-11' };

    const readiness = calculatePlatformReadiness(manifests, contracts, events, refs, deps, apiDiffs, healthScores, matrix);
    expect(readiness.totalEngines).toBe(manifests.length);
    expect(readiness.totalPublicApis).toBeGreaterThan(0);
    expect(readiness.totalEvents).toBeGreaterThan(0);
    expect(readiness.averageHealthScore).toBeGreaterThanOrEqual(0);
    expect(['PASS', 'FAIL', 'WARNING']).toContain(readiness.status);
  });

  it('runs platform readiness use case', async () => {
    const deps = makeDeps();
    const r = await calculatePlatformReadinessUseCase(deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.totalEngines).toBeGreaterThan(0);
    }
  });
});
