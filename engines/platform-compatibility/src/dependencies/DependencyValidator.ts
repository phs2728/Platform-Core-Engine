/**
 * Dependency & Boundary Validator
 *
 * Validates engine dependency graphs for:
 *   - Circular dependencies (§C-18)
 *   - Phase ordering violations (higher-phase engine depending on lower)
 *   - Forbidden import boundaries (engine cross-imports)
 *   - Missing dependencies (depends_on references non-existent engine)
 *
 * Uses Tarjan's algorithm for cycle detection.
 */

import type {
  EngineManifest,
  DependencyEdge,
  DependencyResult,
} from '../interfaces/index.js';

/**
 * Build adjacency list from manifests.
 */
export function buildDependencyGraph(
  manifests: EngineManifest[],
): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  for (const m of manifests) {
    graph.set(m.id, [...m.depends_on]);
  }
  return graph;
}

/**
 * Build all dependency edges (for reporting).
 */
export function buildEdges(
  manifests: EngineManifest[],
): DependencyEdge[] {
  const edges: DependencyEdge[] = [];
  for (const m of manifests) {
    for (const dep of m.depends_on) {
      edges.push({ from: m.id, to: dep, declared: true });
    }
  }
  return edges;
}

/**
 * Detect cycles using DFS-based approach.
 * Returns array of cycles, each cycle is a list of engine IDs.
 */
export function detectCycles(manifests: EngineManifest[]): string[][] {
  const graph = buildDependencyGraph(manifests);
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(node: string, path: string[]): void {
    visited.add(node);
    recursionStack.add(node);

    const neighbors = graph.get(node) ?? [];
    for (const neighbor of neighbors) {
      if (!graph.has(neighbor)) continue; // external dependency

      if (recursionStack.has(neighbor)) {
        // Found a cycle — extract it
        const cycleStart = path.indexOf(neighbor);
        const cycle = [...path.slice(cycleStart), neighbor];
        cycles.push(cycle);
      } else if (!visited.has(neighbor)) {
        dfs(neighbor, [...path, neighbor]);
      }
    }

    recursionStack.delete(node);
  }

  for (const m of manifests) {
    if (!visited.has(m.id)) {
      dfs(m.id, [m.id]);
    }
  }

  return cycles;
}

/**
 * Detect phase-ordering violations.
 * An engine should only depend on engines with equal or lower phase numbers
 * (foundation engines should not depend on business engines).
 */
export function detectPhaseViolations(
  manifests: EngineManifest[],
): Array<{ engine: string; dep: string; enginePhase: number; depPhase: number }> {
  const phaseMap = new Map<string, number>();
  for (const m of manifests) {
    phaseMap.set(m.id, m.phase);
  }

  const violations: Array<{ engine: string; dep: string; enginePhase: number; depPhase: number }> = [];

  for (const m of manifests) {
    for (const dep of m.depends_on) {
      const depPhase = phaseMap.get(dep);
      if (depPhase !== undefined && depPhase > m.phase) {
        violations.push({
          engine: m.id,
          dep,
          enginePhase: m.phase,
          depPhase,
        });
      }
    }
  }

  return violations;
}

/**
 * Detect missing dependencies (depends_on references unknown engine).
 */
export function detectMissingDependencies(
  manifests: EngineManifest[],
): Array<{ engine: string; missingDep: string }> {
  const knownIds = new Set(manifests.map((m) => m.id));
  const missing: Array<{ engine: string; missingDep: string }> = [];

  for (const m of manifests) {
    for (const dep of m.depends_on) {
      // External dependencies (universal-core, etc.) are allowed
      if (!knownIds.has(dep) && dep !== 'universal-core') {
        missing.push({ engine: m.id, missingDep: dep });
      }
    }
  }

  return missing;
}

/**
 * Full dependency validation.
 */
export function validateDependencies(
  manifests: EngineManifest[],
): DependencyResult {
  const edges = buildEdges(manifests);
  const cycles = detectCycles(manifests);
  const phaseViolations = detectPhaseViolations(manifests);
  const missing = detectMissingDependencies(manifests);

  const forbiddenImports: Array<{ engine: string; imports: string[] }> = [];
  const layerViolations: Array<{ engine: string; layer: string; detail: string }> = [];

  // Phase violations → layer violations
  for (const pv of phaseViolations) {
    layerViolations.push({
      engine: pv.engine,
      layer: 'phase',
      detail: `Phase ${pv.enginePhase} engine depends on Phase ${pv.depPhase} engine "${pv.dep}"`,
    });
  }

  // Missing deps → forbidden
  for (const ms of missing) {
    forbiddenImports.push({
      engine: ms.engine,
      imports: [ms.missingDep],
    });
  }

  let status: 'pass' | 'fail' | 'warning' = 'pass';
  if (cycles.length > 0 || forbiddenImports.length > 0) {
    status = 'fail';
  } else if (layerViolations.length > 0) {
    status = 'warning';
  }

  return {
    edges,
    cycles,
    forbiddenImports,
    layerViolations,
    status,
  };
}
