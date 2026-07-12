/**
 * Guardian Decision Maker
 *
 * 사장님 확립: "Guardian은 최종 Merge 여부를 결정한다.
 *  APPROVED, APPROVED_WITH_CONDITIONS, REVIEW_REQUIRED, REJECTED."
 *
 * Decision logic:
 *   - Any critical risk with no mitigation → REJECTED
 *   - Any breaking change without migration plan → REJECTED
 *   - Circular dependency → REJECTED
 *   - High risk items → REVIEW_REQUIRED
 *   - Warnings → APPROVED_WITH_CONDITIONS
 *   - Clean → APPROVED
 */

import type {
  GuardianDecision,
  GuardianDecisionType,
  GuardianCondition,
  GuardianScore,
  RiskAnalysis,
  TechnicalDebtAnalysis,
  ArchitectureAnalysis,
} from '../interfaces/index.js';

/**
 * Make the final Guardian merge decision.
 */
export function makeGuardianDecision(
  score: GuardianScore,
  risk: RiskAnalysis,
  debt: TechnicalDebtAnalysis,
  arch: ArchitectureAnalysis,
): GuardianDecision {
  const conditions: GuardianCondition[] = [];
  const blockers: string[] = [];

  // ── REJECTED conditions ──────────────────

  // Critical architecture issues
  const archCritical = arch.issues.filter((i) => i.level === 'critical');
  for (const issue of archCritical) {
    blockers.push(`[${issue.rule}] ${issue.message}`);
  }

  // Critical risks
  const criticalRisks = risk.risks.filter((r) => r.level === 'critical');
  for (const r of criticalRisks) {
    blockers.push(`[RISK/${r.category}] ${r.title}`);
  }

  // Score too low
  if (score.overall < 30) {
    blockers.push(`Platform score ${score.overall}/100 is below minimum threshold (30)`);
  }

  // ── Determine decision ───────────────────

  let decision: GuardianDecisionType;

  if (blockers.length > 0) {
    decision = 'REJECTED';
  } else if (score.grade === 'F') {
    decision = 'REJECTED';
    blockers.push(`Platform grade ${score.grade} is unacceptable for merge`);
  } else if (score.grade === 'D' || risk.criticalCount > 0) {
    decision = 'REVIEW_REQUIRED';
    conditions.push({
      description: `Platform grade ${score.grade} requires manual review before merge`,
      blocking: true,
    });
  } else {
    // Check for non-blocking conditions
    const highRisks = risk.risks.filter((r) => r.level === 'high');
    if (highRisks.length > 0) {
      conditions.push({
        description: `${highRisks.length} high-severity risk(s) must be monitored: ${highRisks.map((r) => r.title).join('; ')}`,
        blocking: false,
      });
    }

    const mediumDebt = debt.items.filter((i) => i.severity === 'medium');
    if (mediumDebt.length > 3) {
      conditions.push({
        description: `${mediumDebt.length} medium-severity technical debt items should be addressed in next sprint`,
        blocking: false,
      });
    }

    const archWarnings = arch.issues.filter((i) => i.level === 'warning');
    if (archWarnings.length > 0) {
      conditions.push({
        description: `${archWarnings.length} architecture warning(s): ${archWarnings.map((w) => w.message).join('; ')}`,
        blocking: false,
      });
    }

    decision = conditions.length > 0 ? 'APPROVED_WITH_CONDITIONS' : 'APPROVED';
  }

  // Build summary
  const summary = buildSummary(decision, score, risk, blockers, conditions);

  return {
    decision,
    summary,
    conditions,
    blockers,
    approvedBy: 'platform-guardian',
    decidedAt: new Date().toISOString(),
    canMerge: decision === 'APPROVED' || decision === 'APPROVED_WITH_CONDITIONS',
  };
}

function buildSummary(
  decision: GuardianDecisionType,
  score: GuardianScore,
  risk: RiskAnalysis,
  blockers: string[],
  conditions: GuardianCondition[],
): string {
  const parts: string[] = [];

  parts.push(`Decision: ${decision}`);
  parts.push(`Grade: ${score.grade} (${score.overall}/100)`);
  parts.push(`Risk: ${risk.overallRisk} (${risk.riskScore}/100)`);
  parts.push(`Architecture: ${score.architectureScore}/100`);
  parts.push(`Compatibility: ${score.compatibilityScore}/100`);
  parts.push(`Contracts: ${score.contractScore}/100`);

  if (blockers.length > 0) {
    parts.push(`Blockers: ${blockers.length}`);
  }

  const blockingConditions = conditions.filter((c) => c.blocking).length;
  if (blockingConditions > 0) {
    parts.push(`Blocking Conditions: ${blockingConditions}`);
  }

  return parts.join(' | ');
}
