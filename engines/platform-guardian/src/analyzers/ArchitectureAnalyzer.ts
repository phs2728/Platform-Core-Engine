/**
 * Architecture Analyzer
 *
 * 사장님 확립: "Guardian은 Architecture Drift, Layer 위반, Boundary 위반,
 *  순환참조, 소유권 침해를 자동 검사한다."
 *
 * Analyzes the platform's architecture health by examining:
 *   - Layer distribution (phase adherence)
 *   - Coupling depth
 *   - Boundary violations (engine owns forbidden concept)
 *   - Architecture drift (engines at wrong phase)
 *   - Dependency layering (phase ordering)
 */

import type {
  GuardianInput,
  ArchitectureAnalysis,
  ArchitectureIssue,
} from '../interfaces/index.js';

/**
 * Analyze platform architecture from Guardian input.
 */
export function analyzeArchitecture(input: GuardianInput): ArchitectureAnalysis {
  const issues: ArchitectureIssue[] = [];

  // 1. Phase layering — check if engines are at the right phase
  issues.push(...detectPhaseIssues(input));

  // 2. Boundary violations — engine claims ownership of forbidden concepts
  issues.push(...detectBoundaryViolations(input));

  // 3. Architecture drift — engines that have drifted from their intended layer
  issues.push(...detectArchitectureDrift(input));

  // 4. Over-coupling — engines with too many dependencies
  issues.push(...detectOverCoupling(input));

  // 5. Ownership conflicts — two engines claim the same domain
  issues.push(...detectOwnershipConflicts(input));

  // Build layer distribution
  const layerDistribution: Record<number, string[]> = {};
  for (const m of input.manifests) {
    const phase = m.phase;
    if (!layerDistribution[phase]) layerDistribution[phase] = [];
    layerDistribution[phase].push(m.id);
  }

  // Calculate max dependency depth
  const maxDepth = calculateMaxDepth(input);

  // Calculate score
  const criticalCount = issues.filter((i) => i.level === 'critical').length;
  const warningCount = issues.filter((i) => i.level === 'warning').length;
  let score = 100;
  score -= criticalCount * 20;
  score -= warningCount * 5;
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    issues: issues.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.level] - order[b.level];
    }),
    layerDistribution,
    maxDepth,
    isClean: criticalCount === 0,
  };
}

function detectPhaseIssues(input: GuardianInput): ArchitectureIssue[] {
  const issues: ArchitectureIssue[] = [];
  const dep = input.dependencyResult;
  if (!dep) return issues;

  for (const lv of dep.layerViolations) {
    issues.push({
      level: 'warning',
      category: 'phase',
      engineId: lv.engine,
      rule: 'ARCH-PHASE-001',
      message: lv.detail,
      recommendation: `Move dependency "${lv.detail}" to a lower-phase engine or restructure "${lv.engine}" to a higher phase.`,
    });
  }

  return issues;
}

function detectBoundaryViolations(input: GuardianInput): ArchitectureIssue[] {
  const issues: ArchitectureIssue[] = [];

  for (const m of input.manifests) {
    if (!m.strict_boundaries) continue;

    // Check if any forbidden concept appears in the engine's provides
    const providesStr = m.provides.join(' ').toLowerCase();
    for (const forbidden of m.strict_boundaries.forbidden) {
      const forbiddenLower = forbidden.toLowerCase();
      if (providesStr.includes(forbiddenLower) && forbiddenLower.length > 3) {
        issues.push({
          level: 'critical',
          category: 'boundary',
          engineId: m.id,
          rule: 'ARCH-BOUNDARY-001',
          message: `Engine "${m.id}" provides functionality that includes forbidden concept "${forbidden}"`,
          recommendation: `Remove "${forbidden}" related functionality from "${m.id}" or update boundaries.`,
        });
      }
    }
  }

  return issues;
}

function detectArchitectureDrift(input: GuardianInput): ArchitectureIssue[] {
  const issues: ArchitectureIssue[] = [];

  for (const m of input.manifests) {
    // Phase 1-2 engines should not depend on Phase 4+ engines
    if (m.phase <= 2) {
      for (const dep of m.depends_on) {
        const depManifest = input.manifests.find((x) => x.id === dep);
        if (depManifest && depManifest.phase >= 4) {
          issues.push({
            level: 'warning',
            category: 'drift',
            engineId: m.id,
            rule: 'ARCH-DRIFT-001',
            message: `Foundation engine "${m.id}" (Phase ${m.phase}) depends on business engine "${dep}" (Phase ${depManifest.phase})`,
            recommendation: `Invert the dependency or introduce an interface in a lower phase.`,
          });
        }
      }
    }
  }

  return issues;
}

function detectOverCoupling(input: GuardianInput): ArchitectureIssue[] {
  const issues: ArchitectureIssue[] = [];
  const maxDeps = 6;

  for (const m of input.manifests) {
    const engineDeps = m.depends_on.filter((d) =>
      input.manifests.some((x) => x.id === d),
    );
    if (engineDeps.length > maxDeps) {
      issues.push({
        level: 'warning',
        category: 'coupling',
        engineId: m.id,
        rule: 'ARCH-COUPLING-001',
        message: `Engine "${m.id}" has ${engineDeps.length} dependencies (max recommended: ${maxDeps})`,
        recommendation: 'Consider splitting the engine or reducing dependencies through interface segregation.',
      });
    }
  }

  return issues;
}

function detectOwnershipConflicts(input: GuardianInput): ArchitectureIssue[] {
  const issues: ArchitectureIssue[] = [];
  const ownershipMap = new Map<string, string[]>();  // domain → engine IDs

  for (const m of input.manifests) {
    if (!m.strict_boundaries) continue;
    for (const own of m.strict_boundaries.owns) {
      const existing = ownershipMap.get(own) ?? [];
      existing.push(m.id);
      ownershipMap.set(own, existing);
    }
  }

  for (const [domain, engines] of ownershipMap) {
    if (engines.length > 1) {
      issues.push({
        level: 'critical',
        category: 'ownership',
        rule: 'ARCH-OWNERSHIP-001',
        message: `Domain "${domain}" is claimed by ${engines.length} engines: ${engines.join(', ')}`,
        recommendation: `Designate a single owner for "${domain}" and have others reference it.`,
      });
    }
  }

  return issues;
}

function calculateMaxDepth(input: GuardianInput): number {
  const depMap = new Map<string, string[]>();
  const knownIds = new Set(input.manifests.map((m) => m.id));
  for (const m of input.manifests) {
    depMap.set(m.id, m.depends_on.filter((d) => knownIds.has(d)));
  }

  const memo = new Map<string, number>();

  function depth(engineId: string, visiting: Set<string>): number {
    if (memo.has(engineId)) return memo.get(engineId)!;
    if (visiting.has(engineId)) return 0; // cycle guard
    const deps = depMap.get(engineId) ?? [];
    if (deps.length === 0) {
      memo.set(engineId, 0);
      return 0;
    }
    visiting.add(engineId);
    const maxChildDepth = Math.max(...deps.map((d) => depth(d, visiting)));
    visiting.delete(engineId);
    const result = 1 + maxChildDepth;
    memo.set(engineId, result);
    return result;
  }

  let maxDepth = 0;
  for (const m of input.manifests) {
    maxDepth = Math.max(maxDepth, depth(m.id, new Set()));
  }
  return maxDepth;
}
