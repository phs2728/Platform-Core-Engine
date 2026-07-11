/**
 * Report Generator — 8 Markdown Reports
 *
 * Generates:
 *   1. compatibility-report.md   — Platform-wide compatibility matrix + readiness
 *   2. contract-report.md         — Per-engine contract violations
 *   3. dependency-report.md       — Dependency graph, cycles, violations
 *   4. event-report.md            — Event contract status + event flow graph
 *   5. reference-report.md        — Reference contract status
 *   6. api-report.md              — API snapshot diffs + breaking changes
 *   7. release-report.md          — Per-engine release certification
 *   8. health-report.md           — Engine health scores + platform readiness
 */

import type {
  ContractResult,
  EventContractResult,
  ReferenceContractResult,
  DependencyResult,
  ApiDiffResult,
  EngineHealthScore,
  CompatibilityMatrix,
  EventGraph,
  ReleaseReport,
  PlatformReadiness,
  IReportWriter,
} from '../interfaces/index.js';

export async function generateCompatibilityReport(
  writer: IReportWriter,
  matrix: CompatibilityMatrix,
  readiness: PlatformReadiness,
): Promise<void> {
  const lines: string[] = [];
  lines.push('# Platform Compatibility Report');
  lines.push('');
  lines.push(`**Generated**: ${readiness.generatedAt}`);
  lines.push('');
  lines.push('## Platform Readiness');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| Status | **${readiness.status}** |`);
  lines.push(`| Total Engines | ${readiness.totalEngines} |`);
  lines.push(`| Compatibility | ${readiness.compatibilityPercent}% |`);
  lines.push(`| Broken Contracts | ${readiness.brokenContracts} |`);
  lines.push(`| Breaking Changes | ${readiness.breakingChanges} |`);
  lines.push(`| Warnings | ${readiness.warnings} |`);
  lines.push(`| Avg Health Score | ${readiness.averageHealthScore}/100 |`);
  lines.push(`| Public APIs | ${readiness.totalPublicApis} |`);
  lines.push(`| Events | ${readiness.totalEvents} |`);
  lines.push(`| References | ${readiness.totalReferences} |`);
  lines.push('');
  lines.push('## Compatibility Matrix');
  lines.push('');
  if (matrix.engines.length > 0 && matrix.cells.length > 0) {
    lines.push(`| From → To | ${matrix.engines.map((e) => e).join(' | ')} |`);
    lines.push(`|${'---|'.repeat(matrix.engines.length + 1)}`);
    for (let i = 0; i < matrix.cells.length; i++) {
      const row = matrix.cells[i]!;
      const from = matrix.engines[i]!;
      const cells = row.map((c) => {
        if (c.status === 'n/a') return '—';
        const icon = c.status === 'pass' ? '✅' : c.status === 'fail' ? '❌' : c.status === 'warning' ? '⚠️' : '—';
        return icon;
      });
      lines.push(`| **${from}** | ${cells.join(' | ')} |`);
    }
  } else {
    lines.push('_No compatibility data available._');
  }
  lines.push('');

  await writer.writeReport('compatibility-report.md', lines.join('\n'));
}

export async function generateContractReport(
  writer: IReportWriter,
  contracts: ContractResult[],
): Promise<void> {
  const lines: string[] = [];
  lines.push('# Contract Report');
  lines.push('');
  lines.push('## Per-Engine Contract Status');
  lines.push('');
  lines.push('| Engine | Status | Critical | Warning | Info |');
  lines.push('|---|---|---|---|---|');
  for (const c of contracts) {
    const critical = c.violations.filter((v) => v.severity === 'critical').length;
    const warning = c.violations.filter((v) => v.severity === 'warning').length;
    const info = c.violations.filter((v) => v.severity === 'info').length;
    const icon = c.passed ? '✅' : '❌';
    lines.push(`| ${c.engineId} | ${icon} ${c.passed ? 'PASS' : 'FAIL'} | ${critical} | ${warning} | ${info} |`);
  }
  lines.push('');

  const failed = contracts.filter((c) => !c.passed);
  if (failed.length > 0) {
    lines.push('## Violations Detail');
    lines.push('');
    for (const c of failed) {
      const crit = c.violations.filter((v) => v.severity === 'critical');
      if (crit.length > 0) {
        lines.push(`### ${c.engineId}`);
        lines.push('');
        for (const v of crit) {
          lines.push(`- **[${v.contractType}]** ${v.rule}: ${v.message}`);
        }
        lines.push('');
      }
    }
  }

  await writer.writeReport('contract-report.md', lines.join('\n'));
}

export async function generateDependencyReport(
  writer: IReportWriter,
  dependency: DependencyResult,
): Promise<void> {
  const lines: string[] = [];
  lines.push('# Dependency Report');
  lines.push('');
  lines.push(`**Status**: ${dependency.status}`);
  lines.push('');

  lines.push('## Dependency Edges');
  lines.push('');
  lines.push('| From | To | Declared |');
  lines.push('|---|---|---|');
  for (const e of dependency.edges) {
    lines.push(`| ${e.from} | ${e.to} | ${e.declared ? '✅' : '❌'} |`);
  }
  lines.push('');

  if (dependency.cycles.length > 0) {
    lines.push('## ⚠️ Circular Dependencies');
    lines.push('');
    for (const cycle of dependency.cycles) {
      lines.push(`- ${cycle.join(' → ')}`);
    }
    lines.push('');
  } else {
    lines.push('## ✅ No Circular Dependencies');
    lines.push('');
  }

  if (dependency.forbiddenImports.length > 0) {
    lines.push('## Forbidden Imports');
    lines.push('');
    for (const fi of dependency.forbiddenImports) {
      lines.push(`- **${fi.engine}** → ${fi.imports.join(', ')}`);
    }
    lines.push('');
  }

  if (dependency.layerViolations.length > 0) {
    lines.push('## Layer Violations');
    lines.push('');
    for (const lv of dependency.layerViolations) {
      lines.push(`- **${lv.engine}**: ${lv.detail}`);
    }
    lines.push('');
  }

  await writer.writeReport('dependency-report.md', lines.join('\n'));
}

export async function generateEventReport(
  writer: IReportWriter,
  events: EventContractResult[],
  graph: EventGraph | null,
): Promise<void> {
  const lines: string[] = [];
  lines.push('# Event Report');
  lines.push('');
  lines.push('## Event Contract Status');
  lines.push('');
  lines.push('| Event Type | Publisher | Subscribers | Status |');
  lines.push('|---|---|---|---|');
  for (const e of events) {
    const icon = e.status === 'pass' ? '✅' : e.status === 'fail' ? '❌' : '⚠️';
    lines.push(`| ${e.eventType} | ${e.publisher || '—'} | ${e.subscribers.join(', ') || '—'} | ${icon} ${e.status} |`);
  }
  lines.push('');

  if (graph) {
    lines.push('## Event Flow Graph');
    lines.push('');
    lines.push('```');
    for (const edge of graph.edges) {
      lines.push(`${edge.publisher} →${edge.eventType}→ ${edge.subscriber}`);
    }
    lines.push('```');
    lines.push('');
  }

  await writer.writeReport('event-report.md', lines.join('\n'));
}

export async function generateReferenceReport(
  writer: IReportWriter,
  references: ReferenceContractResult[],
): Promise<void> {
  const lines: string[] = [];
  lines.push('# Reference Report');
  lines.push('');
  lines.push('## Reference Contract Status');
  lines.push('');
  lines.push('| Reference Type | Owner | Consumers | Owner Exists | Status |');
  lines.push('|---|---|---|---|---|');
  for (const r of references) {
    const icon = r.status === 'pass' ? '✅' : '❌';
    lines.push(`| ${r.refType} | ${r.ownerEngine} | ${r.consumerEngines.join(', ') || '—'} | ${r.ownerExists ? '✅' : '❌'} | ${icon} ${r.status} |`);
  }
  lines.push('');

  await writer.writeReport('reference-report.md', lines.join('\n'));
}

export async function generateApiReport(
  writer: IReportWriter,
  apiDiffs: ApiDiffResult[],
): Promise<void> {
  const lines: string[] = [];
  lines.push('# API Report');
  lines.push('');
  lines.push('## API Snapshot Diffs');
  lines.push('');
  lines.push('| Engine | Baseline Hash | Current Hash | Breaking | Diffs |');
  lines.push('|---|---|---|---|---|');
  for (const a of apiDiffs) {
    lines.push(`| ${a.engineId} | ${a.baseline?.hash ?? '—'} | ${a.current.hash} | ${a.hasBreakingChange ? '❌ YES' : '✅ NO'} | ${a.diffs.length} |`);
  }
  lines.push('');

  const breaking = apiDiffs.filter((a) => a.hasBreakingChange);
  if (breaking.length > 0) {
    lines.push('## ⚠️ Breaking Changes');
    lines.push('');
    for (const a of breaking) {
      lines.push(`### ${a.engineId}`);
      for (const d of a.diffs.filter((d) => d.breaking)) {
        lines.push(`- **${d.kind}**: ${d.detail}`);
      }
      lines.push('');
    }
  }

  await writer.writeReport('api-report.md', lines.join('\n'));
}

export async function generateReleaseReport(
  writer: IReportWriter,
  reports: ReleaseReport[],
): Promise<void> {
  const lines: string[] = [];
  lines.push('# Release Report');
  lines.push('');
  lines.push('## Engine Certification');
  lines.push('');
  lines.push('| Engine | Version | Status | Summary |');
  lines.push('|---|---|---|---|');
  for (const r of reports) {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️';
    lines.push(`| ${r.engineId} | ${r.version} | ${icon} ${r.status} | ${r.summary} |`);
  }
  lines.push('');

  for (const r of reports) {
    lines.push(`## ${r.engineId} (v${r.version}) — ${r.status}`);
    lines.push('');
    lines.push('| Check | Status | Detail |');
    lines.push('|---|---|---|');
    for (const c of r.checks) {
      const icon = c.status === 'pass' ? '✅' : c.status === 'fail' ? '❌' : '⚠️';
      lines.push(`| ${c.name} | ${icon} ${c.status} | ${c.detail} |`);
    }
    lines.push('');
  }

  await writer.writeReport('release-report.md', lines.join('\n'));
}

export async function generateHealthReport(
  writer: IReportWriter,
  healthScores: EngineHealthScore[],
  readiness: PlatformReadiness,
): Promise<void> {
  const lines: string[] = [];
  lines.push('# Health Report');
  lines.push('');
  lines.push('## Engine Health Scores');
  lines.push('');
  lines.push('| Engine | Score | Grade |');
  lines.push('|---|---|---|');
  for (const h of healthScores) {
    const bar = '█'.repeat(Math.floor(h.score / 10)) + '░'.repeat(10 - Math.floor(h.score / 10));
    lines.push(`| ${h.engineId} | ${bar} ${h.score}/100 | ${h.grade} |`);
  }
  lines.push('');

  lines.push('## Platform Readiness');
  lines.push('');
  lines.push(`- **Status**: ${readiness.status}`);
  lines.push(`- **Compatibility**: ${readiness.compatibilityPercent}%`);
  lines.push(`- **Average Health Score**: ${readiness.averageHealthScore}/100`);
  lines.push(`- **Broken Contracts**: ${readiness.brokenContracts}`);
  lines.push(`- **Breaking Changes**: ${readiness.breakingChanges}`);
  lines.push(`- **Warnings**: ${readiness.warnings}`);
  lines.push('');

  lines.push('## Factor Breakdown');
  lines.push('');
  for (const h of healthScores) {
    lines.push(`### ${h.engineId} (${h.score}/100, Grade ${h.grade})`);
    lines.push('');
    lines.push('| Factor | Points | Detail |');
    lines.push('|---|---|---|');
    for (const f of h.factors) {
      lines.push(`| ${f.name} | ${f.earnedPoints}/${f.maxPoints} | ${f.detail} |`);
    }
    lines.push('');
  }

  await writer.writeReport('health-report.md', lines.join('\n'));
}

/**
 * Generate all 8 reports.
 */
export async function generateAllReports(
  writer: IReportWriter,
  data: {
    contracts: ContractResult[];
    events: EventContractResult[];
    references: ReferenceContractResult[];
    dependency: DependencyResult;
    apiDiffs: ApiDiffResult[];
    healthScores: EngineHealthScore[];
    matrix: CompatibilityMatrix;
    eventGraph: EventGraph | null;
    releaseReports: ReleaseReport[];
    readiness: PlatformReadiness;
  },
): Promise<void> {
  await generateCompatibilityReport(writer, data.matrix, data.readiness);
  await generateContractReport(writer, data.contracts);
  await generateDependencyReport(writer, data.dependency);
  await generateEventReport(writer, data.events, data.eventGraph);
  await generateReferenceReport(writer, data.references);
  await generateApiReport(writer, data.apiDiffs);
  await generateReleaseReport(writer, data.releaseReports);
  await generateHealthReport(writer, data.healthScores, data.readiness);
}
