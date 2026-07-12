/**
 * Dependency & Boundary Tests (12)
 */

import { describe, it, expect } from 'vitest';
import {
  validateDependencies,
  buildDependencyGraph,
  buildEdges,
  detectCycles,
  detectPhaseViolations,
  detectMissingDependencies,
  runDependencyValidationUseCase,
} from '../src/index.js';
import {
  sampleManifests,
  circularDependencyManifests,
  missingDependencyManifests,
  phaseViolationManifests,
  makeDeps,
} from './helpers.js';

describe('Dependency Validation', () => {
  it('builds adjacency list from manifests', () => {
    const graph = buildDependencyGraph(sampleManifests());
    expect(graph.get('user')).toEqual(['core-sdk', 'policy', 'identity']);
    expect(graph.get('core-sdk')).toEqual(['policy', 'universal-core']);
  });

  it('builds all dependency edges', () => {
    const edges = buildEdges(sampleManifests());
    expect(edges.length).toBeGreaterThan(0);
    const userEdge = edges.find((e) => e.from === 'user' && e.to === 'identity');
    expect(userEdge?.declared).toBe(true);
  });

  it('detects no cycles in clean manifests', () => {
    const cycles = detectCycles(sampleManifests());
    expect(cycles).toHaveLength(0);
  });

  it('detects circular dependencies', () => {
    const cycles = detectCycles(circularDependencyManifests());
    expect(cycles.length).toBeGreaterThan(0);
    const cycle = cycles[0]!;
    expect(cycle).toContain('engine-x');
    expect(cycle).toContain('engine-y');
  });

  it('detects 3-node circular dependencies', () => {
    const manifests = [
      { id: 'a', name: 'A', version: '0.1', phase: 1, depends_on: ['b'], provides: [], events_emitted: [], events_subscribed: [] },
      { id: 'b', name: 'B', version: '0.1', phase: 1, depends_on: ['c'], provides: [], events_emitted: [], events_subscribed: [] },
      { id: 'c', name: 'C', version: '0.1', phase: 1, depends_on: ['a'], provides: [], events_emitted: [], events_subscribed: [] },
    ];
    const cycles = detectCycles(manifests);
    expect(cycles.length).toBeGreaterThan(0);
  });

  it('detects no phase violations in clean manifests', () => {
    const violations = detectPhaseViolations(sampleManifests());
    // Our sample manifests are well-ordered
    expect(violations.length).toBe(0);
  });

  it('detects phase-ordering violations', () => {
    const violations = detectPhaseViolations(phaseViolationManifests());
    expect(violations.length).toBeGreaterThan(0);
    const v = violations[0]!;
    expect(v.engine).toBe('foundation-engine');
    expect(v.dep).toBe('business-engine');
    expect(v.enginePhase).toBe(1);
    expect(v.depPhase).toBe(4);
  });

  it('detects missing dependencies', () => {
    const missing = detectMissingDependencies(missingDependencyManifests());
    expect(missing.length).toBe(1);
    expect(missing[0]!.engine).toBe('engine-p');
    expect(missing[0]!.missingDep).toBe('engine-nonexistent');
  });

  it('does not flag universal-core as missing', () => {
    const missing = detectMissingDependencies(sampleManifests());
    const ucMissing = missing.filter((m) => m.missingDep === 'universal-core');
    expect(ucMissing).toHaveLength(0);
  });

  it('full dependency validation returns pass for clean manifests', () => {
    const result = validateDependencies(sampleManifests());
    expect(result.cycles).toHaveLength(0);
    expect(result.forbiddenImports).toHaveLength(0);
    expect(result.status).toBe('pass');
  });

  it('full dependency validation returns fail for cycles', () => {
    const result = validateDependencies(circularDependencyManifests());
    expect(result.cycles.length).toBeGreaterThan(0);
    expect(result.status).toBe('fail');
  });

  it('runs dependency validation use case and saves results', async () => {
    const deps = makeDeps(sampleManifests());
    const r = await runDependencyValidationUseCase(deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.status).toBe('pass');
    }
    const stored = await deps._resultStore.getDependencyResult();
    expect(stored).not.toBeNull();
  });
});
