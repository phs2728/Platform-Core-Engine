/**
 * Guardian Report Generator — 5 Markdown Reports
 *
 * Generates:
 *   1. guardian-report.md       — Full Guardian audit (decision + scores)
 *   2. architecture-report.md   — Architecture analysis
 *   3. technical-debt.md         — Technical debt items
 *   4. risk-report.md            — Risk analysis
 *   5. roadmap.md                — Roadmap recommendations
 */

import type {
  IGuardianReportWriter,
  GuardianAudit,
  GuardianScore,
  ArchitectureAnalysis,
  RiskAnalysis,
  TechnicalDebtAnalysis,
  RoadmapAnalysis,
  GuardianDecision,
} from '../interfaces/index.js';

export async function generateGuardianReport(
  writer: IGuardianReportWriter,
  audit: GuardianAudit,
): Promise<void> {
  const lines: string[] = [];
  lines.push('# Platform Guardian Report');
  lines.push('');
  lines.push(`**Generated**: ${audit.generatedAt}`);
  lines.push('');

  // Decision banner
  const d = audit.decision;
  const icon = d.decision === 'APPROVED' ? '✅'
    : d.decision === 'APPROVED_WITH_CONDITIONS' ? '⚠️'
    : d.decision === 'REVIEW_REQUIRED' ? '🔍'
    : '❌';
  lines.push(`## ${icon} Guardian Decision: ${d.decision}`);
  lines.push('');
  lines.push(`**Can Merge**: ${d.canMerge ? 'YES' : 'NO'}`);
  lines.push(`**Approved By**: ${d.approvedBy}`);
  lines.push(`**Decided At**: ${d.decidedAt}`);
  lines.push('');
  lines.push(`> ${d.summary}`);
  lines.push('');

  if (d.blockers.length > 0) {
    lines.push('### ❌ Blockers');
    lines.push('');
    for (const b of d.blockers) {
      lines.push(`- ${b}`);
    }
    lines.push('');
  }

  if (d.conditions.length > 0) {
    lines.push('### ⚠️ Conditions');
    lines.push('');
    for (const c of d.conditions) {
      lines.push(`- ${c.blocking ? '🔒' : '⚠️'} ${c.description}`);
    }
    lines.push('');
  }

  // Scores
  lines.push('## Guardian Score');
  lines.push('');
  lines.push('| Dimension | Score |');
  lines.push('|---|---|');
  lines.push(`| **Overall** | **${audit.score.overall}/100 (${audit.score.grade})** |`);
  lines.push(`| Architecture | ${audit.score.architectureScore}/100 |`);
  lines.push(`| Compatibility | ${audit.score.compatibilityScore}/100 |`);
  lines.push(`| Maintainability | ${audit.score.maintainabilityScore}/100 |`);
  lines.push(`| Security | ${audit.score.securityScore}/100 |`);
  lines.push(`| Performance | ${audit.score.performanceScore}/100 |`);
  lines.push(`| Contracts | ${audit.score.contractScore}/100 |`);
  lines.push('');

  // Input snapshot
  const s = audit.inputSnapshot;
  lines.push('## Platform Snapshot');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| Engines | ${s.totalEngines} |`);
  lines.push(`| Public APIs | ${s.totalPublicApis} |`);
  lines.push(`| Events | ${s.totalEvents} |`);
  lines.push(`| Broken Contracts | ${s.brokenContracts} |`);
  lines.push(`| Breaking Changes | ${s.breakingChanges} |`);
  lines.push(`| Circular Dependencies | ${s.cycles} |`);
  lines.push('');

  await writer.writeReport('guardian-report.md', lines.join('\n'));
}

export async function generateArchitectureReport(
  writer: IGuardianReportWriter,
  arch: ArchitectureAnalysis,
): Promise<void> {
  const lines: string[] = [];
  lines.push('# Architecture Report');
  lines.push('');
  lines.push(`**Architecture Score**: ${arch.score}/100`);
  lines.push(`**Status**: ${arch.isClean ? '✅ Clean' : '⚠️ Issues Found'}`);
  lines.push(`**Max Dependency Depth**: ${arch.maxDepth}`);
  lines.push('');

  // Layer distribution
  lines.push('## Layer Distribution');
  lines.push('');
  lines.push('| Phase | Engines |');
  lines.push('|---|---|');
  for (const phase of Object.keys(arch.layerDistribution).map(Number).sort((a, b) => a - b)) {
    lines.push(`| Phase ${phase} | ${arch.layerDistribution[phase]!.join(', ')} |`);
  }
  lines.push('');

  // Issues
  if (arch.issues.length > 0) {
    lines.push('## Architecture Issues');
    lines.push('');
    lines.push('| Level | Category | Rule | Engine | Message | Recommendation |');
    lines.push('|---|---|---|---|---|---|');
    for (const issue of arch.issues) {
      const icon = issue.level === 'critical' ? '❌' : issue.level === 'warning' ? '⚠️' : 'ℹ️';
      lines.push(`| ${icon} ${issue.level} | ${issue.category} | ${issue.rule} | ${issue.engineId ?? '—'} | ${issue.message} | ${issue.recommendation} |`);
    }
    lines.push('');
  } else {
    lines.push('## ✅ No Architecture Issues');
    lines.push('');
  }

  await writer.writeReport('architecture-report.md', lines.join('\n'));
}

export async function generateTechnicalDebtReport(
  writer: IGuardianReportWriter,
  debt: TechnicalDebtAnalysis,
): Promise<void> {
  const lines: string[] = [];
  lines.push('# Technical Debt Report');
  lines.push('');
  lines.push(`**Debt Score**: ${debt.debtScore}/100`);
  lines.push(`**Total Items**: ${debt.totalDebtItems}`);
  lines.push(`- High: ${debt.highSeverity}`);
  lines.push(`- Medium: ${debt.mediumSeverity}`);
  lines.push(`- Low: ${debt.lowSeverity}`);
  lines.push('');

  if (debt.items.length > 0) {
    lines.push('## Debt Items');
    lines.push('');
    lines.push('| ID | Severity | Category | Engine | Title | Effort |');
    lines.push('|---|---|---|---|---|---|');
    for (const item of debt.items) {
      const icon = item.severity === 'high' ? '🔴' : item.severity === 'medium' ? '🟡' : '🟢';
      lines.push(`| ${item.id} | ${icon} ${item.severity} | ${item.category} | ${item.engineId ?? '—'} | ${item.title} | ${item.estimatedEffort} |`);
    }
    lines.push('');

    lines.push('## Details');
    lines.push('');
    for (const item of debt.items) {
      lines.push(`### ${item.id}: ${item.title}`);
      lines.push(`- **Severity**: ${item.severity}`);
      lines.push(`- **Category**: ${item.category}`);
      lines.push(`- **Detail**: ${item.detail}`);
      lines.push(`- **Effort**: ${item.estimatedEffort}`);
      lines.push('');
    }
  }

  await writer.writeReport('technical-debt.md', lines.join('\n'));
}

export async function generateRiskReport(
  writer: IGuardianReportWriter,
  risk: RiskAnalysis,
): Promise<void> {
  const lines: string[] = [];
  lines.push('# Risk Report');
  lines.push('');
  lines.push(`**Overall Risk**: ${risk.overallRisk}`);
  lines.push(`**Risk Score**: ${risk.riskScore}/100`);
  lines.push('');
  lines.push('| Level | Count |');
  lines.push('|---|---|');
  lines.push(`| Critical | ${risk.criticalCount} |`);
  lines.push(`| High | ${risk.highCount} |`);
  lines.push(`| Medium | ${risk.mediumCount} |`);
  lines.push(`| Low | ${risk.lowCount} |`);
  lines.push('');

  if (risk.risks.length > 0) {
    lines.push('## Risk Items');
    lines.push('');
    lines.push('| ID | Level | Category | Title | Affected | Mitigation |');
    lines.push('|---|---|---|---|---|---|');
    for (const r of risk.risks) {
      const icon = r.level === 'critical' ? '🔴' : r.level === 'high' ? '🟠' : r.level === 'medium' ? '🟡' : '🟢';
      lines.push(`| ${r.id} | ${icon} ${r.level} | ${r.category} | ${r.title} | ${r.affectedEngines.join(', ')} | ${r.mitigation} |`);
    }
    lines.push('');
  }

  await writer.writeReport('risk-report.md', lines.join('\n'));
}

export async function generateRoadmapReport(
  writer: IGuardianReportWriter,
  roadmap: RoadmapAnalysis,
): Promise<void> {
  const lines: string[] = [];
  lines.push('# Platform Roadmap');
  lines.push('');
  lines.push('## Recommendations');
  lines.push('');
  lines.push('| ID | Priority | Type | Title | Effort |');
  lines.push('|---|---|---|---|---|');
  for (const r of roadmap.recommendations) {
    const icon = r.priority === 'P0' ? '🔴' : r.priority === 'P1' ? '🟠' : r.priority === 'P2' ? '🟡' : '🟢';
    lines.push(`| ${r.id} | ${icon} ${r.priority} | ${r.type} | ${r.title} | ${r.estimatedEffort} |`);
  }
  lines.push('');

  lines.push('## Next Engines to Build');
  lines.push('');
  if (roadmap.nextEngines.length > 0) {
    for (const e of roadmap.nextEngines) {
      lines.push(`- ${e}`);
    }
  } else {
    lines.push('_No new engines recommended at this time._');
  }
  lines.push('');

  lines.push('## RFC Recommendations');
  lines.push('');
  if (roadmap.nextRFCs.length > 0) {
    for (const rfc of roadmap.nextRFCs) {
      lines.push(`- ${rfc}`);
    }
  } else {
    lines.push('_No RFCs recommended at this time._');
  }
  lines.push('');

  if (roadmap.migrationPlans.length > 0) {
    lines.push('## Migration Plans');
    lines.push('');
    for (const plan of roadmap.migrationPlans) {
      lines.push(`### ${plan.title}`);
      lines.push(`- **From**: ${plan.from}`);
      lines.push(`- **To**: ${plan.to}`);
      lines.push(`- **Reason**: ${plan.reason}`);
      lines.push(`- **Steps**:`);
      for (const step of plan.steps) {
        lines.push(`  - ${step}`);
      }
      lines.push('');
    }
  }

  // Detailed recommendations
  lines.push('## Recommendation Details');
  lines.push('');
  for (const r of roadmap.recommendations) {
    lines.push(`### ${r.id}: ${r.title}`);
    lines.push(`- **Priority**: ${r.priority}`);
    lines.push(`- **Type**: ${r.type}`);
    lines.push(`- **Description**: ${r.description}`);
    lines.push(`- **Rationale**: ${r.rationale}`);
    lines.push(`- **Effort**: ${r.estimatedEffort}`);
    if (r.targetEngines && r.targetEngines.length > 0) {
      lines.push(`- **Target Engines**: ${r.targetEngines.join(', ')}`);
    }
    if (r.prerequisites && r.prerequisites.length > 0) {
      lines.push(`- **Prerequisites**: ${r.prerequisites.join('; ')}`);
    }
    lines.push('');
  }

  await writer.writeReport('roadmap.md', lines.join('\n'));
}

/**
 * Generate all 5 Guardian reports.
 */
export async function generateAllGuardianReports(
  writer: IGuardianReportWriter,
  audit: GuardianAudit,
): Promise<void> {
  await generateGuardianReport(writer, audit);
  await generateArchitectureReport(writer, audit.architecture);
  await generateTechnicalDebtReport(writer, audit.technicalDebt);
  await generateRiskReport(writer, audit.risk);
  await generateRoadmapReport(writer, audit.roadmap);
}
