/**
 * architecture/index.ts — Architecture Enforcement Framework
 *
 * Sprint A-3: CI must fail on architecture violations.
 * ESLint no-restricted-imports + Dependency rules + Circular dependency detection.
 */

// ═══════════════════════════════════════════
// Architecture Rules
// ═══════════════════════════════════════════

export interface ArchitectureRule {
  readonly id: string;
  readonly description: string;
  readonly severity: 'error' | 'warn';
  readonly check: (source: string, target: string) => boolean;
}

/**
 * Rule: Engines must not import from other engines directly.
 * Only @platform/core-sdk is allowed.
 */
export const NO_DIRECT_ENGINE_IMPORT: ArchitectureRule = {
  id: 'no-direct-engine-import',
  description: 'Engines must not import from other engines. Use Host Interfaces via core-sdk.',
  severity: 'error',
  check: (source, target) => {
    if (!source.startsWith('engines/')) return true;
    if (!target.startsWith('@platform/engine-')) return true;
    return false;
  },
};

/**
 * Rule: Interface layer must not import from use-cases.
 */
export const NO_INTERFACE_TO_USECASE: ArchitectureRule = {
  id: 'no-interface-to-usecase',
  description: 'Interface layer must not import from use-cases layer.',
  severity: 'error',
  check: (source, target) => {
    if (!source.includes('/interfaces/')) return true;
    return !target.includes('/use-cases/');
  },
};

/**
 * Rule: Domain layer must not import from infrastructure.
 */
export const NO_DOMAIN_TO_INFRA: ArchitectureRule = {
  id: 'no-domain-to-infra',
  description: 'Domain layer must not import from infrastructure.',
  severity: 'error',
  check: (source, target) => {
    if (!source.includes('/domain/')) return true;
    return !target.includes('/infrastructure/');
  },
};

export const ALL_ARCHITECTURE_RULES: ArchitectureRule[] = [
  NO_DIRECT_ENGINE_IMPORT,
  NO_INTERFACE_TO_USECASE,
  NO_DOMAIN_TO_INFRA,
];

// ═══════════════════════════════════════════
// Violation
// ═══════════════════════════════════════════

export interface ArchitectureViolation {
  readonly ruleId: string;
  readonly severity: 'error' | 'warn';
  readonly source: string;
  readonly target: string;
  readonly message: string;
}

// ═══════════════════════════════════════════
// Boundary Verification
// ═══════════════════════════════════════════

export interface BoundaryCheckResult {
  readonly passed: boolean;
  readonly violations: ArchitectureViolation[];
  readonly checkedCount: number;
}

export function verifyBoundaries(
  imports: { source: string; target: string }[],
  rules: ArchitectureRule[] = ALL_ARCHITECTURE_RULES,
): BoundaryCheckResult {
  const violations: ArchitectureViolation[] = [];
  for (const { source, target } of imports) {
    for (const rule of rules) {
      if (!rule.check(source, target)) {
        violations.push({
          ruleId: rule.id,
          severity: rule.severity,
          source, target,
          message: `${rule.description}: ${source} → ${target}`,
        });
      }
    }
  }
  return {
    passed: violations.filter(v => v.severity === 'error').length === 0,
    violations,
    checkedCount: imports.length,
  };
}

// ═══════════════════════════════════════════
// Circular Dependency Detection
// ═══════════════════════════════════════════

export interface CircularDependency {
  readonly cycle: string[];
}

export function detectCircularDependencies(
  graph: Map<string, string[]>,
): CircularDependency[] {
  const cycles: CircularDependency[] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): void {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = graph.get(node) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (recursionStack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart).concat(neighbor);
        cycles.push({ cycle });
      }
    }

    path.pop();
    recursionStack.delete(node);
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) dfs(node);
  }

  return cycles;
}

// ═══════════════════════════════════════════
// Manifest Validation
// ═══════════════════════════════════════════

export interface EngineManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly status: string;
  readonly provides: string[];
  readonly events_emitted: string[];
  readonly strict_boundaries: {
    readonly owns: string[];
    readonly forbidden: string[];
  };
}

export interface ManifestValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

export function validateManifest(manifest: EngineManifest): ManifestValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!manifest.id) errors.push('Manifest missing id');
  if (!manifest.name) errors.push('Manifest missing name');
  if (!manifest.version) errors.push('Manifest missing version');
  if (!manifest.provides || manifest.provides.length === 0) warnings.push('Manifest has no provided use-cases');
  if (!manifest.strict_boundaries?.owns || manifest.strict_boundaries.owns.length === 0) {
    warnings.push('Manifest has no owned entities');
  }

  return { valid: errors.length === 0, errors, warnings };
}