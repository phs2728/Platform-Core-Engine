/**
 * Risk Analyzer
 *
 * 사장님 확립: "Guardian은 Platform의 Risk를 자동 평가한다.
 *  Contract 위반, 순환참조, Breaking Change, Orphan Event 등을
 *  critical/high/medium/low/negligible로 분류한다."
 */

import type {
  GuardianInput,
  RiskAnalysis,
  RiskItem,
  RiskLevel,
} from '../interfaces/index.js';

let riskIdCounter = 0;

function nextRiskId(): string {
  riskIdCounter += 1;
  return `RISK-${String(riskIdCounter).padStart(4, '0')}`;
}

export function resetRiskIdCounter(): void {
  riskIdCounter = 0;
}

/**
 * Analyze platform risk from all input sources.
 */
export function analyzeRisk(input: GuardianInput): RiskAnalysis {
  resetRiskIdCounter();
  const risks: RiskItem[] = [];

  // 1. Broken contracts → critical/high
  risks.push(...analyzeContractRisks(input));

  // 2. Circular dependencies → critical
  risks.push(...analyzeDependencyRisks(input));

  // 3. Breaking API changes → critical/high
  risks.push(...analyzeApiRisks(input));

  // 4. Orphan events → high/medium
  risks.push(...analyzeEventRisks(input));

  // 5. Missing reference owners → high
  risks.push(...analyzeReferenceRisks(input));

  // 6. Architecture issues → medium/low
  risks.push(...analyzeArchitectureRisks(input));

  // 7. Operational risks → low
  risks.push(...analyzeOperationalRisks(input));

  const criticalCount = risks.filter((r) => r.level === 'critical').length;
  const highCount = risks.filter((r) => r.level === 'high').length;
  const mediumCount = risks.filter((r) => r.level === 'medium').length;
  const lowCount = risks.filter((r) => r.level === 'low').length;

  // Risk score: weighted sum
  const riskScore = Math.min(100,
    criticalCount * 30 + highCount * 15 + mediumCount * 5 + lowCount * 1,
  );

  // Overall risk level
  let overallRisk: RiskLevel = 'negligible';
  if (criticalCount > 0) overallRisk = 'critical';
  else if (highCount > 0) overallRisk = 'high';
  else if (mediumCount > 0) overallRisk = 'medium';
  else if (lowCount > 0) overallRisk = 'low';

  return {
    overallRisk,
    riskScore,
    risks: risks.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3, negligible: 4 };
      return order[a.level] - order[b.level];
    }),
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
  };
}

function analyzeContractRisks(input: GuardianInput): RiskItem[] {
  const risks: RiskItem[] = [];

  for (const contract of input.contractResults) {
    if (!contract.passed) {
      const criticalViolations = contract.violations.filter((v) => v.severity === 'critical');
      if (criticalViolations.length > 0) {
        risks.push({
          id: nextRiskId(),
          level: 'critical',
          category: 'contract',
          title: `Engine "${contract.engineId}" has ${criticalViolations.length} critical contract violation(s)`,
          description: criticalViolations.map((v) => v.message).join('; '),
          affectedEngines: [contract.engineId],
          mitigation: 'Fix all critical contract violations before merge.',
        });
      }
    }
  }

  return risks;
}

function analyzeDependencyRisks(input: GuardianInput): RiskItem[] {
  const risks: RiskItem[] = [];
  const dep = input.dependencyResult;
  if (!dep) return risks;

  for (const cycle of dep.cycles) {
    risks.push({
      id: nextRiskId(),
      level: 'critical',
      category: 'dependency',
      title: `Circular dependency detected: ${cycle.join(' → ')}`,
      description: `Engines ${cycle.join(', ')} form a dependency cycle. This violates §C-18.`,
      affectedEngines: cycle,
      mitigation: 'Break the cycle by introducing an interface or restructuring dependencies.',
    });
  }

  for (const fi of dep.forbiddenImports) {
    risks.push({
      id: nextRiskId(),
      level: 'high',
      category: 'dependency',
      title: `Engine "${fi.engine}" depends on unknown engine(s): ${fi.imports.join(', ')}`,
      description: `Dependency on non-existent engine(s) will cause runtime failures.`,
      affectedEngines: [fi.engine],
      mitigation: 'Create the missing engine or remove the dependency.',
    });
  }

  return risks;
}

function analyzeApiRisks(input: GuardianInput): RiskItem[] {
  const risks: RiskItem[] = [];

  for (const api of input.apiDiffResults) {
    if (api.hasBreakingChange) {
      const breakingDiffs = api.diffs.filter((d) => d.breaking);
      risks.push({
        id: nextRiskId(),
        level: 'critical',
        category: 'api',
        title: `Breaking API change in engine "${api.engineId}"`,
        description: `${breakingDiffs.length} breaking change(s): ${breakingDiffs.map((d) => d.detail).join('; ')}`,
        affectedEngines: [api.engineId],
        mitigation: 'Restore removed exports or create a migration plan for consumers.',
      });
    }
  }

  return risks;
}

function analyzeEventRisks(input: GuardianInput): RiskItem[] {
  const risks: RiskItem[] = [];

  for (const evt of input.eventResults) {
    if (evt.orphanedSubscribers.length > 0) {
      risks.push({
        id: nextRiskId(),
        level: 'high',
        category: 'event',
        title: `Event "${evt.eventType}" has orphaned subscriber(s)`,
        description: `Subscribers ${evt.orphanedSubscribers.join(', ')} subscribe to "${evt.eventType}" but no engine publishes it.`,
        affectedEngines: evt.orphanedSubscribers,
        mitigation: 'Create a publisher for this event or remove the subscription.',
      });
    }
  }

  return risks;
}

function analyzeReferenceRisks(input: GuardianInput): RiskItem[] {
  const risks: RiskItem[] = [];

  for (const ref of input.referenceResults) {
    if (!ref.ownerExists) {
      risks.push({
        id: nextRiskId(),
        level: 'high',
        category: 'reference',
        title: `Reference type "${ref.refType}" has no owner engine`,
        description: `Owner engine "${ref.ownerEngine}" does not exist in the platform.`,
        affectedEngines: ref.consumerEngines,
        mitigation: `Create engine "${ref.ownerEngine}" or reassign ownership.`,
      });
    }
  }

  return risks;
}

function analyzeArchitectureRisks(input: GuardianInput): RiskItem[] {
  const risks: RiskItem[] = [];
  const dep = input.dependencyResult;
  if (!dep) return risks;

  for (const lv of dep.layerViolations) {
    risks.push({
      id: nextRiskId(),
      level: 'medium',
      category: 'architecture',
      title: `Layer violation in engine "${lv.engine}"`,
      description: lv.detail,
      affectedEngines: [lv.engine],
      mitigation: 'Restructure to respect phase ordering.',
    });
  }

  return risks;
}

function analyzeOperationalRisks(input: GuardianInput): RiskItem[] {
  const risks: RiskItem[] = [];

  // Engines with low health scores
  for (const health of input.healthScores) {
    if (health.score < 50) {
      risks.push({
        id: nextRiskId(),
        level: 'medium',
        category: 'operational',
        title: `Engine "${health.engineId}" has critically low health score (${health.score}/100)`,
        description: `Grade: ${health.grade}. Factors: ${health.factors.map((f) => `${f.name}=${f.earnedPoints}/${f.maxPoints}`).join(', ')}`,
        affectedEngines: [health.engineId],
        mitigation: 'Address the failing health factors before the next release.',
      });
    }
  }

  // Engines in Draft status with many public APIs
  for (const m of input.manifests) {
    if ((m.status === 'Draft' || m.status === undefined) && m.provides.length > 15) {
      risks.push({
        id: nextRiskId(),
        level: 'low',
        category: 'operational',
        title: `Engine "${m.id}" is in Draft but exposes ${m.provides.length} APIs`,
        description: 'Large public surface area in Draft status increases future breaking change risk.',
        affectedEngines: [m.id],
        mitigation: 'Stabilize the engine or reduce its public surface area.',
      });
    }
  }

  return risks;
}
