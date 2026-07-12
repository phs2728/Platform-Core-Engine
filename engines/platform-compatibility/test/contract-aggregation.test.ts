/**
 * Contract Aggregation Tests (8)
 */

import { describe, it, expect } from 'vitest';
import {
  aggregateContractResults,
  runContractValidationUseCase,
  runFullPlatformScanUseCase,
} from '../src/index.js';
import { sampleManifests, brokenEventManifests, makeDeps } from './helpers.js';
import {
  validateEventContracts,
  validateReferenceContracts,
  validateDependencies,
} from '../src/index.js';
import { diffAllSnapshots } from '../src/index.js';

describe('Contract Aggregation', () => {
  it('aggregates contract results per engine', () => {
    const manifests = sampleManifests();
    const events = validateEventContracts(manifests);
    const refs = validateReferenceContracts(manifests);
    const deps = validateDependencies(manifests);
    const apiDiffs = diffAllSnapshots(manifests, new Map(), '2026-07-11');
    const results = aggregateContractResults(manifests, events, refs, apiDiffs, deps);
    expect(results.length).toBe(manifests.length);
    expect(results.every((r) => r.engineId)).toBeTruthy();
  });

  it('marks engine as passed when no critical violations', () => {
    const manifests = sampleManifests();
    const events = validateEventContracts(manifests);
    const refs = validateReferenceContracts(manifests);
    const deps = validateDependencies(manifests);
    const apiDiffs = diffAllSnapshots(manifests, new Map(), '2026-07-11');
    const results = aggregateContractResults(manifests, events, refs, apiDiffs, deps);
    const coreSdk = results.find((r) => r.engineId === 'core-sdk');
    expect(coreSdk?.passed).toBe(true);
  });

  it('marks engine as failed when event contract is broken', () => {
    const broken = brokenEventManifests();
    const events = validateEventContracts(broken);
    const refs = validateReferenceContracts(broken);
    const deps = validateDependencies(broken);
    const apiDiffs = diffAllSnapshots(broken, new Map(), '2026-07-11');
    const results = aggregateContractResults(broken, events, refs, apiDiffs, deps);
    const engineA = results.find((r) => r.engineId === 'engine-a');
    expect(engineA?.passed).toBe(false);
    expect(engineA?.violations.some((v) => v.contractType === 'event')).toBe(true);
  });

  it('includes dependency cycle violations', () => {
    const circular = [
      { id: 'a', name: 'A', version: '0.1', phase: 1, depends_on: ['b'], provides: [], events_emitted: [], events_subscribed: [] },
      { id: 'b', name: 'B', version: '0.1', phase: 1, depends_on: ['a'], provides: [], events_emitted: [], events_subscribed: [] },
    ];
    const events = validateEventContracts(circular);
    const refs = validateReferenceContracts(circular);
    const deps = validateDependencies(circular);
    const apiDiffs = diffAllSnapshots(circular, new Map(), '2026-07-11');
    const results = aggregateContractResults(circular, events, refs, apiDiffs, deps);
    const engineA = results.find((r) => r.engineId === 'a');
    expect(engineA?.passed).toBe(false);
    expect(engineA?.violations.some((v) => v.rule === 'dependency.circular')).toBe(true);
  });

  it('includes API breaking change violations', () => {
    const manifests = sampleManifests();
    const idManifest = manifests.find((m) => m.id === 'identity')!;
    const baselines = new Map([['identity', {
      engineId: 'identity', capturedAt: '2026-01-01',
      exports: [...idManifest.provides, 'removedExport'].sort(),
      exportCount: idManifest.provides.length + 1,
      hash: 'old',
    }]]);
    const events = validateEventContracts(manifests);
    const refs = validateReferenceContracts(manifests);
    const deps = validateDependencies(manifests);
    const apiDiffs = diffAllSnapshots(manifests, baselines, '2026-07-11');
    const results = aggregateContractResults(manifests, events, refs, apiDiffs, deps);
    const identity = results.find((r) => r.engineId === 'identity');
    expect(identity?.passed).toBe(false);
    expect(identity?.violations.some((v) => v.rule === 'api.breaking_change')).toBe(true);
  });

  it('sorts results by engineId', () => {
    const manifests = sampleManifests();
    const events = validateEventContracts(manifests);
    const refs = validateReferenceContracts(manifests);
    const deps = validateDependencies(manifests);
    const apiDiffs = diffAllSnapshots(manifests, new Map(), '2026-07-11');
    const results = aggregateContractResults(manifests, events, refs, apiDiffs, deps);
    for (let i = 1; i < results.length; i++) {
      expect(results[i]!.engineId.localeCompare(results[i - 1]!.engineId)).toBeGreaterThanOrEqual(0);
    }
  });

  it('runs contract validation use case end-to-end', async () => {
    const deps = makeDeps(sampleManifests());
    const r = await runContractValidationUseCase(deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.length).toBe(sampleManifests().length);
    }
    const stored = await deps._resultStore.getContractResults();
    expect(stored.length).toBe(sampleManifests().length);
  });

  it('runs full platform scan and produces readiness', async () => {
    const deps = makeDeps(sampleManifests());
    const r = await runFullPlatformScanUseCase(deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.totalEngines).toBe(sampleManifests().length);
      expect(r.value.status).toBeDefined();
      expect(r.value.totalPublicApis).toBeGreaterThan(0);
      expect(r.value.totalEvents).toBeGreaterThan(0);
    }
  });
});
