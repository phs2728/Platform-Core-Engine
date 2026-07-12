/**
 * Technical Debt Analyzer
 *
 * 사장님 확립: "Guardian은 Platform의 기술 부채를 자동 분석한다."
 *
 * Identifies:
 *   - Engines without strict_boundaries
 *   - Phase violations
 *   - Orphan events
 *   - Draft-status engines
 *   - Low health engines
 *   - Over-coupled engines
 *   - Missing engine.json manifests
 *   - Deprecated APIs
 */

import type {
  GuardianInput,
  TechnicalDebtAnalysis,
  TechnicalDebtItem,
  DebtSeverity,
} from '../interfaces/index.js';

let debtIdCounter = 0;

function nextDebtId(): string {
  debtIdCounter += 1;
  return `DEBT-${String(debtIdCounter).padStart(4, '0')}`;
}

export function resetDebtIdCounter(): void {
  debtIdCounter = 0;
}

/**
 * Analyze technical debt across the platform.
 */
export function analyzeTechnicalDebt(input: GuardianInput): TechnicalDebtAnalysis {
  resetDebtIdCounter();
  const items: TechnicalDebtItem[] = [];

  // 1. Missing boundaries
  items.push(...findMissingBoundaries(input));

  // 2. Phase violations
  items.push(...findPhaseViolations(input));

  // 3. Orphan events
  items.push(...findOrphanEvents(input));

  // 4. Draft status engines
  items.push(...findDraftEngines(input));

  // 5. Low health engines
  items.push(...findLowHealthEngines(input));

  // 6. Over-coupled engines
  items.push(...findOverCoupledEngines(input));

  // 7. Missing manifests
  items.push(...findMissingManifests(input));

  // 8. Deprecated APIs
  items.push(...findDeprecatedApis(input));

  const highSeverity = items.filter((i) => i.severity === 'high').length;
  const mediumSeverity = items.filter((i) => i.severity === 'medium').length;
  const lowSeverity = items.filter((i) => i.severity === 'low').length;

  // Debt score: weighted by severity
  const debtScore = Math.min(100,
    highSeverity * 20 + mediumSeverity * 8 + lowSeverity * 2,
  );

  return {
    totalDebtItems: items.length,
    highSeverity,
    mediumSeverity,
    lowSeverity,
    debtScore,
    items: items.sort((a, b) => {
      const order: Record<DebtSeverity, number> = { high: 0, medium: 1, low: 2 };
      return order[a.severity] - order[b.severity];
    }),
  };
}

function findMissingBoundaries(input: GuardianInput): TechnicalDebtItem[] {
  const items: TechnicalDebtItem[] = [];

  for (const m of input.manifests) {
    if (!m.strict_boundaries) {
      items.push({
        id: nextDebtId(),
        severity: m.phase <= 2 ? 'high' : 'medium',
        category: 'missing-boundaries',
        engineId: m.id,
        title: `Engine "${m.id}" has no strict_boundaries defined`,
        detail: 'Without strict_boundaries, this engine may accidentally own concepts that belong to other engines.',
        estimatedEffort: 'S',
      });
    }
  }

  return items;
}

function findPhaseViolations(input: GuardianInput): TechnicalDebtItem[] {
  const items: TechnicalDebtItem[] = [];
  const dep = input.dependencyResult;
  if (!dep) return items;

  for (const lv of dep.layerViolations) {
    items.push({
      id: nextDebtId(),
      severity: 'medium',
      category: 'phase-violation',
      engineId: lv.engine,
      title: `Phase violation in "${lv.engine}"`,
      detail: lv.detail,
      estimatedEffort: 'M',
    });
  }

  return items;
}

function findOrphanEvents(input: GuardianInput): TechnicalDebtItem[] {
  const items: TechnicalDebtItem[] = [];

  for (const evt of input.eventResults) {
    if (evt.orphanedSubscribers.length > 0) {
      items.push({
        id: nextDebtId(),
        severity: 'high',
        category: 'orphan-events',
        title: `Event "${evt.eventType}" is orphaned`,
        detail: `Subscribers: ${evt.orphanedSubscribers.join(', ')}. No publisher exists.`,
        estimatedEffort: 'S',
      });
    }
  }

  return items;
}

function findDraftEngines(input: GuardianInput): TechnicalDebtItem[] {
  const items: TechnicalDebtItem[] = [];

  for (const m of input.manifests) {
    if (m.status === 'Draft' || m.status === undefined) {
      items.push({
        id: nextDebtId(),
        severity: 'low',
        category: 'draft-status',
        engineId: m.id,
        title: `Engine "${m.id}" is in Draft status`,
        detail: `Version ${m.version}. Should be stabilized before platform-wide release.`,
        estimatedEffort: m.phase <= 2 ? 'M' : 'L',
      });
    }
  }

  return items;
}

function findLowHealthEngines(input: GuardianInput): TechnicalDebtItem[] {
  const items: TechnicalDebtItem[] = [];

  for (const h of input.healthScores) {
    if (h.score < 60) {
      items.push({
        id: nextDebtId(),
        severity: h.score < 40 ? 'high' : 'medium',
        category: 'low-health',
        engineId: h.engineId,
        title: `Engine "${h.engineId}" has low health (${h.score}/100, ${h.grade})`,
        detail: h.factors
          .filter((f) => f.earnedPoints < f.maxPoints * 0.5)
          .map((f) => `${f.name}: ${f.detail}`)
          .join('; '),
        estimatedEffort: 'M',
      });
    }
  }

  return items;
}

function findOverCoupledEngines(input: GuardianInput): TechnicalDebtItem[] {
  const items: TechnicalDebtItem[] = [];
  const knownIds = new Set(input.manifests.map((m) => m.id));

  for (const m of input.manifests) {
    const deps = m.depends_on.filter((d) => knownIds.has(d));
    if (deps.length > 5) {
      items.push({
        id: nextDebtId(),
        severity: 'low',
        category: 'over-coupled',
        engineId: m.id,
        title: `Engine "${m.id}" has high coupling (${deps.length} dependencies)`,
        detail: `Dependencies: ${deps.join(', ')}`,
        estimatedEffort: 'L',
      });
    }
  }

  return items;
}

function findMissingManifests(input: GuardianInput): TechnicalDebtItem[] {
  // This would check for engines that exist as directories but lack engine.json.
  // In the current model, manifests are already loaded, so this is a placeholder
  // for future file-system scanning.
  return [];
}

function findDeprecatedApis(input: GuardianInput): TechnicalDebtItem[] {
  const items: TechnicalDebtItem[] = [];

  for (const api of input.apiDiffResults) {
    const removedExports = api.diffs.filter((d) => d.kind === 'removed' && !d.breaking);
    if (removedExports.length > 0) {
      items.push({
        id: nextDebtId(),
        severity: 'low',
        category: 'deprecated-api',
        engineId: api.engineId,
        title: `Engine "${api.engineId}" has deprecated APIs`,
        detail: `${removedExports.length} export(s) removed: ${removedExports.map((d) => d.exportName).join(', ')}`,
        estimatedEffort: 'S',
      });
    }
  }

  return items;
}
