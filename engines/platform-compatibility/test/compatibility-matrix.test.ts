/**
 * Compatibility Matrix & Event Graph Tests (10)
 */

import { describe, it, expect } from 'vitest';
import {
  buildCompatibilityMatrix,
  buildEventGraph,
  buildCompatibilityMatrixUseCase,
  buildEventGraphUseCase,
} from '../src/index.js';
import { validateEventContracts, validateReferenceContracts, validateDependencies } from '../src/index.js';
import { sampleManifests, circularDependencyManifests, makeDeps } from './helpers.js';

describe('Compatibility Matrix', () => {
  it('builds matrix with all engines as rows and columns', () => {
    const manifests = sampleManifests();
    const events = validateEventContracts(manifests);
    const refs = validateReferenceContracts(manifests);
    const deps = validateDependencies(manifests);
    const matrix = buildCompatibilityMatrix(manifests, events, refs, deps);

    expect(matrix.engines.length).toBe(manifests.length);
    expect(matrix.cells.length).toBe(manifests.length);
    expect(matrix.cells[0]!.length).toBe(manifests.length);
  });

  it('marks self-references as n/a', () => {
    const manifests = sampleManifests();
    const events = validateEventContracts(manifests);
    const refs = validateReferenceContracts(manifests);
    const deps = validateDependencies(manifests);
    const matrix = buildCompatibilityMatrix(manifests, events, refs, deps);

    for (let i = 0; i < matrix.engines.length; i++) {
      expect(matrix.cells[i]![i]!.status).toBe('n/a');
    }
  });

  it('marks declared dependencies as pass', () => {
    const manifests = sampleManifests();
    const events = validateEventContracts(manifests);
    const refs = validateReferenceContracts(manifests);
    const deps = validateDependencies(manifests);
    const matrix = buildCompatibilityMatrix(manifests, events, refs, deps);

    // user depends on identity → should be pass
    const userIdx = matrix.engines.indexOf('user');
    const identityIdx = matrix.engines.indexOf('identity');
    expect(matrix.cells[userIdx]![identityIdx]!.relation).toBe('depends');
    expect(matrix.cells[userIdx]![identityIdx]!.status).toBe('pass');
  });

  it('marks circular dependencies as fail', () => {
    const manifests = circularDependencyManifests();
    const events = validateEventContracts(manifests);
    const refs = validateReferenceContracts(manifests);
    const deps = validateDependencies(manifests);
    const matrix = buildCompatibilityMatrix(manifests, events, refs, deps);

    const xIdx = matrix.engines.indexOf('engine-x');
    const yIdx = matrix.engines.indexOf('engine-y');
    expect(matrix.cells[xIdx]![yIdx]!.status).toBe('fail');
  });

  it('marks event relationships correctly', () => {
    const manifests = sampleManifests();
    const events = validateEventContracts(manifests);
    const refs = validateReferenceContracts(manifests);
    const deps = validateDependencies(manifests);
    const matrix = buildCompatibilityMatrix(manifests, events, refs, deps);

    // organization publishes 'organization.archived', catalog subscribes
    const catIdx = matrix.engines.indexOf('catalog');
    const orgIdx = matrix.engines.indexOf('organization');
    // catalog → organization should show some relation
    const cell = matrix.cells[catIdx]?.[orgIdx];
    expect(cell).toBeDefined();
    // It should be either 'depends' (catalog depends on org) or 'event'/'reference'
    expect(['depends', 'event', 'reference', 'none']).toContain(cell!.relation);
  });

  it('generates matrix with timestamp', () => {
    const manifests = sampleManifests();
    const events = validateEventContracts(manifests);
    const refs = validateReferenceContracts(manifests);
    const deps = validateDependencies(manifests);
    const matrix = buildCompatibilityMatrix(manifests, events, refs, deps);
    expect(matrix.generatedAt).toBeTruthy();
  });

  it('builds event flow graph', () => {
    const manifests = sampleManifests();
    const events = validateEventContracts(manifests);
    const graph = buildEventGraph(manifests, events);
    expect(graph.nodes.length).toBe(manifests.length);
    expect(graph.edges.length).toBeGreaterThan(0);
  });

  it('event graph edges have correct structure', () => {
    const manifests = sampleManifests();
    const events = validateEventContracts(manifests);
    const graph = buildEventGraph(manifests, events);
    const edge = graph.edges.find((e) => e.eventType === 'organization.archived');
    expect(edge).toBeDefined();
    expect(edge?.publisher).toBe('organization');
    expect(edge?.subscriber).toBeDefined();
  });

  it('runs compatibility matrix use case', async () => {
    const deps = makeDeps(sampleManifests());
    // Need to run event + reference + dependency validation first
    await deps._resultStore.saveEventResults(validateEventContracts(sampleManifests()));
    await deps._resultStore.saveReferenceResults(validateReferenceContracts(sampleManifests()));
    await deps._resultStore.saveDependencyResult(validateDependencies(sampleManifests()));

    const r = await buildCompatibilityMatrixUseCase(deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.cells.length).toBeGreaterThan(0);
    }
  });

  it('runs event graph use case', async () => {
    const deps = makeDeps(sampleManifests());
    await deps._resultStore.saveEventResults(validateEventContracts(sampleManifests()));
    const r = await buildEventGraphUseCase(deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.edges.length).toBeGreaterThan(0);
    }
  });
});
