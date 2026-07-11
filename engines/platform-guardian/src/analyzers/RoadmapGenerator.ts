/**
 * Roadmap Generator
 *
 * 사장님 확립: "Guardian은 다음 Engine 추천, RFC 우선순위,
 *  Deprecated API Migration Plan을 자동 생성한다."
 *
 * Generates strategic recommendations for platform evolution.
 */

import type {
  GuardianInput,
  RoadmapAnalysis,
  RoadmapRecommendation,
  RoadmapPriority,
  MigrationPlan,
} from '../interfaces/index.js';
import type { ArchitectureAnalysis, RiskAnalysis, TechnicalDebtAnalysis } from '../interfaces/index.js';

let roadmapIdCounter = 0;

function nextRoadmapId(): string {
  roadmapIdCounter += 1;
  return `ROADMAP-${String(roadmapIdCounter).padStart(4, '0')}`;
}

export function resetRoadmapIdCounter(): void {
  roadmapIdCounter = 0;
}

/**
 * Known platform-standard engines and their phases.
 */
const PLANNED_ENGINES: ReadonlyArray<{
  id: string;
  name: string;
  phase: number;
  dependsOn: string[];
  rationale: string;
}> = [
  { id: 'payment', name: 'Payment Engine', phase: 5, dependsOn: ['core-sdk', 'policy', 'organization', 'billing'], rationale: 'Completes the Business trio (Order→Billing→Payment).' },
  { id: 'review', name: 'Review Engine', phase: 6, dependsOn: ['core-sdk', 'policy', 'organization', 'catalog'], rationale: 'Enables post-transaction feedback and quality control.' },
  { id: 'workflow', name: 'Workflow Engine', phase: 7, dependsOn: ['core-sdk', 'event-bus'], rationale: 'Universal orchestration layer for all engines.' },
  { id: 'analytics', name: 'Analytics Engine', phase: 7, dependsOn: ['core-sdk', 'event-bus'], rationale: 'Platform-wide insights and reporting.' },
  { id: 'notification', name: 'Notification Engine', phase: 3, dependsOn: ['core-sdk', 'communication'], rationale: 'User-facing notification center with preferences.' },
];

/**
 * Generate roadmap recommendations based on platform analysis.
 */
export function generateRoadmap(
  input: GuardianInput,
  arch: ArchitectureAnalysis,
  risk: RiskAnalysis,
  debt: TechnicalDebtAnalysis,
): RoadmapAnalysis {
  resetRoadmapIdCounter();
  const recommendations: RoadmapRecommendation[] = [];

  const existingIds = new Set(input.manifests.map((m) => m.id));

  // 1. Recommend new engines based on dependency gaps
  recommendations.push(...recommendNewEngines(input, existingIds));

  // 2. Recommend RFCs based on risk and debt
  recommendations.push(...recommendRFCs(input, risk, debt));

  // 3. Recommend migrations for deprecated/breaking APIs
  recommendations.push(...recommendMigrations(input));

  // 4. Recommend stabilization for low-health engines
  recommendations.push(...recommendStabilization(input));

  // 5. Recommend refactoring for over-coupled engines
  recommendations.push(...recommendRefactoring(input, debt));

  // Sort by priority
  const priorityOrder: Record<RoadmapPriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Extract next engines
  const nextEngines = recommendations
    .filter((r) => r.type === 'new-engine')
    .map((r) => r.targetEngines ?? [])
    .flat();

  // Extract next RFCs
  const nextRFCs = recommendations
    .filter((r) => r.type === 'rfc')
    .map((r) => r.title);

  // Migration plans
  const migrationPlans = generateMigrationPlans(input);

  return {
    recommendations,
    nextEngines: [...new Set(nextEngines)],
    nextRFCs,
    migrationPlans,
  };
}

function recommendNewEngines(
  input: GuardianInput,
  existingIds: Set<string>,
): RoadmapRecommendation[] {
  const recs: RoadmapRecommendation[] = [];

  for (const planned of PLANNED_ENGINES) {
    if (existingIds.has(planned.id)) continue;

    // Check if all dependencies exist
    const missingDeps = planned.dependsOn.filter((d) => !existingIds.has(d) && d !== 'core-sdk' && d !== 'policy');
    const allDepsMet = missingDeps.length === 0;

    let priority: RoadmapPriority = 'P3';
    if (allDepsMet && planned.phase <= 5) priority = 'P1';
    else if (allDepsMet) priority = 'P2';
    else priority = 'P3';

    const rec: RoadmapRecommendation = {
      id: nextRoadmapId(),
      priority,
      type: 'new-engine',
      title: `Build ${planned.name} (Phase ${planned.phase})`,
      description: `Create engine "${planned.id}" — ${planned.rationale}`,
      rationale: planned.rationale,
      targetEngines: [planned.id],
      estimatedEffort: planned.phase <= 3 ? 'L' : 'XL',
    };
    if (missingDeps.length > 0) {
      rec.prerequisites = [`Build ${missingDeps.join(', ')} first`];
    }
    recs.push(rec);
  }

  return recs;
}

function recommendRFCs(
  input: GuardianInput,
  risk: RiskAnalysis,
  debt: TechnicalDebtAnalysis,
): RoadmapRecommendation[] {
  const recs: RoadmapRecommendation[] = [];

  // RFC for orphan events
  const orphanCount = risk.risks.filter((r) => r.category === 'event').length;
  if (orphanCount > 0) {
    recs.push({
      id: nextRoadmapId(),
      priority: 'P1',
      type: 'rfc',
      title: `RFC: Event Contract Standardization (${orphanCount} orphan events)`,
      description: 'Standardize event naming, publishing, and subscription patterns across the platform.',
      rationale: `${orphanCount} event-related risks detected. Standardization will prevent future orphans.`,
      estimatedEffort: 'M',
    });
  }

  // RFC for technical debt
  if (debt.highSeverity > 3) {
    recs.push({
      id: nextRoadmapId(),
      priority: 'P2',
      type: 'rfc',
      title: `RFC: Technical Debt Reduction (${debt.highSeverity} high-severity items)`,
      description: 'Create a systematic plan to reduce high-severity technical debt.',
      rationale: `${debt.totalDebtItems} debt items detected (${debt.highSeverity} high). Platform health requires proactive debt management.`,
      estimatedEffort: 'L',
    });
  }

  // RFC for missing boundaries
  const missingBoundaries = debt.items.filter((i) => i.category === 'missing-boundaries');
  if (missingBoundaries.length > 0) {
    recs.push({
      id: nextRoadmapId(),
      priority: 'P2',
      type: 'rfc',
      title: `RFC: Boundary Definition Standard (${missingBoundaries.length} engines without boundaries)`,
      description: 'Define strict_boundaries for all engines to prevent ownership conflicts.',
      rationale: 'Without strict_boundaries, the platform risks concept ownership conflicts as it grows.',
      targetEngines: missingBoundaries.map((i) => i.engineId).filter(Boolean) as string[],
      estimatedEffort: 'M',
    });
  }

  return recs;
}

function recommendMigrations(input: GuardianInput): RoadmapRecommendation[] {
  const recs: RoadmapRecommendation[] = [];

  for (const api of input.apiDiffResults) {
    if (api.hasBreakingChange) {
      recs.push({
        id: nextRoadmapId(),
        priority: 'P0',
        type: 'migration',
        title: `Urgent: Breaking API change in "${api.engineId}"`,
        description: `${api.diffs.filter((d) => d.breaking).length} breaking change(s) detected. Consumers must be migrated.`,
        rationale: 'Breaking changes without migration plans will cause consumer failures.',
        targetEngines: [api.engineId],
        estimatedEffort: 'M',
      });
    }
  }

  return recs;
}

function recommendStabilization(input: GuardianInput): RoadmapRecommendation[] {
  const recs: RoadmapRecommendation[] = [];

  for (const h of input.healthScores) {
    if (h.score < 60) {
      recs.push({
        id: nextRoadmapId(),
        priority: h.score < 40 ? 'P0' : 'P1',
        type: 'stabilize',
        title: `Stabilize engine "${h.engineId}" (${h.score}/100)`,
        description: `Address health factors: ${h.factors.filter((f) => f.earnedPoints < f.maxPoints * 0.5).map((f) => f.name).join(', ')}`,
        rationale: `Engine health is ${h.score}/100 (Grade ${h.grade}). Critical for platform stability.`,
        targetEngines: [h.engineId],
        estimatedEffort: 'M',
      });
    }
  }

  return recs;
}

function recommendRefactoring(
  input: GuardianInput,
  debt: TechnicalDebtAnalysis,
): RoadmapRecommendation[] {
  const recs: RoadmapRecommendation[] = [];

  const overCoupled = debt.items.filter((i) => i.category === 'over-coupled');
  for (const item of overCoupled) {
    recs.push({
      id: nextRoadmapId(),
      priority: 'P3',
      type: 'refactor',
      title: `Reduce coupling in "${item.engineId}"`,
      description: item.detail,
      rationale: 'High coupling increases blast radius of changes.',
      targetEngines: [item.engineId!],
      estimatedEffort: 'L',
    });
  }

  return recs;
}

function generateMigrationPlans(input: GuardianInput): MigrationPlan[] {
  const plans: MigrationPlan[] = [];

  for (const api of input.apiDiffResults) {
    if (api.hasBreakingChange) {
      const removed = api.diffs.filter((d) => d.kind === 'removed' && d.breaking);
      plans.push({
        id: `MIGRATION-${api.engineId}`,
        title: `Migration plan for ${api.engineId} API changes`,
        from: removed.map((d) => d.exportName).join(', '),
        to: '(removed — no replacement)',
        reason: 'Breaking change detected by Compatibility Suite',
        steps: [
          `1. Identify all consumers of removed exports: ${removed.map((d) => d.exportName).join(', ')}`,
          '2. Provide replacement APIs or adapters',
          '3. Notify consuming teams',
          '4. Schedule deprecation period if possible',
          '5. Remove exports in next major version',
        ],
        affectedEngines: [api.engineId],
      });
    }
  }

  return plans;
}
