/**
 * Report Generation Tests (12)
 */

import { describe, it, expect } from 'vitest';
import {
  generateGuardianReport,
  generateArchitectureReport,
  generateTechnicalDebtReport,
  generateRiskReport,
  generateRoadmapReport,
  generateAllGuardianReports,
} from '../src/report/GuardianReportGenerator.js';
import { InMemoryGuardianReportWriter } from '../src/infrastructure/GuardianInfrastructure.js';
import { analyzeArchitecture } from '../src/analyzers/ArchitectureAnalyzer.js';
import { analyzeRisk } from '../src/analyzers/RiskAnalyzer.js';
import { analyzeTechnicalDebt } from '../src/analyzers/TechnicalDebtAnalyzer.js';
import { generateRoadmap } from '../src/analyzers/RoadmapGenerator.js';
import { calculateGuardianScore } from '../src/scorer/GuardianScorer.js';
import { makeGuardianDecision } from '../src/decision/GuardianDecisionMaker.js';
import { cleanInput, brokenInput } from './helpers.js';
import type { GuardianAudit } from '../src/interfaces/index.js';

function computeAudit(input: ReturnType<typeof cleanInput>): GuardianAudit {
  const arch = analyzeArchitecture(input);
  const risk = analyzeRisk(input);
  const debt = analyzeTechnicalDebt(input);
  const roadmap = generateRoadmap(input, arch, risk, debt);
  const score = calculateGuardianScore(input, arch, risk, debt);
  const decision = makeGuardianDecision(score, risk, debt, arch);
  return {
    score, architecture: arch, risk, technicalDebt: debt, roadmap, decision,
    inputSnapshot: {
      totalEngines: input.manifests.length,
      totalPublicApis: input.manifests.reduce((s, m) => s + m.provides.length, 0),
      totalEvents: input.manifests.reduce((s, m) => s + m.events_emitted.length, 0),
      brokenContracts: input.contractResults.filter((c) => !c.passed).length,
      breakingChanges: input.apiDiffResults.filter((a) => a.hasBreakingChange).length,
      cycles: input.dependencyResult?.cycles.length ?? 0,
    },
    generatedAt: '2026-07-11T12:00:00.000Z',
  };
}

describe('Report Generation', () => {
  it('generates guardian report with decision and scores', async () => {
    const audit = computeAudit(cleanInput());
    const writer = new InMemoryGuardianReportWriter();
    await generateGuardianReport(writer, audit);
    const report = writer.getReport('guardian-report.md');
    expect(report).toBeDefined();
    expect(report).toContain('Platform Guardian Report');
    expect(report).toContain('Guardian Decision');
    expect(report).toContain('Guardian Score');
  });

  it('generates architecture report', async () => {
    const audit = computeAudit(cleanInput());
    const writer = new InMemoryGuardianReportWriter();
    await generateArchitectureReport(writer, audit.architecture);
    const report = writer.getReport('architecture-report.md');
    expect(report).toBeDefined();
    expect(report).toContain('Architecture Report');
    expect(report).toContain('Architecture Score');
    expect(report).toContain('Layer Distribution');
  });

  it('generates technical debt report', async () => {
    const audit = computeAudit(brokenInput());
    const writer = new InMemoryGuardianReportWriter();
    await generateTechnicalDebtReport(writer, audit.technicalDebt);
    const report = writer.getReport('technical-debt.md');
    expect(report).toBeDefined();
    expect(report).toContain('Technical Debt Report');
    expect(report).toContain('Debt Score');
  });

  it('generates risk report', async () => {
    const audit = computeAudit(brokenInput());
    const writer = new InMemoryGuardianReportWriter();
    await generateRiskReport(writer, audit.risk);
    const report = writer.getReport('risk-report.md');
    expect(report).toBeDefined();
    expect(report).toContain('Risk Report');
    expect(report).toContain('Overall Risk');
  });

  it('generates roadmap report', async () => {
    const audit = computeAudit(cleanInput());
    const writer = new InMemoryGuardianReportWriter();
    await generateRoadmapReport(writer, audit.roadmap);
    const report = writer.getReport('roadmap.md');
    expect(report).toBeDefined();
    expect(report).toContain('Platform Roadmap');
    expect(report).toContain('Recommendations');
  });

  it('generates all 5 reports', async () => {
    const audit = computeAudit(cleanInput());
    const writer = new InMemoryGuardianReportWriter();
    await generateAllGuardianReports(writer, audit);
    const filenames = writer.getFilenames();
    expect(filenames.length).toBe(5);
    expect(filenames).toContain('guardian-report.md');
    expect(filenames).toContain('architecture-report.md');
    expect(filenames).toContain('technical-debt.md');
    expect(filenames).toContain('risk-report.md');
    expect(filenames).toContain('roadmap.md');
  });

  it('guardian report shows blockers when rejected', async () => {
    const audit = computeAudit(brokenInput());
    const writer = new InMemoryGuardianReportWriter();
    await generateGuardianReport(writer, audit);
    const report = writer.getReport('guardian-report.md');
    expect(report).toContain('Blockers');
  });

  it('guardian report shows merge decision', async () => {
    const audit = computeAudit(cleanInput());
    const writer = new InMemoryGuardianReportWriter();
    await generateGuardianReport(writer, audit);
    const report = writer.getReport('guardian-report.md');
    expect(report).toContain('Can Merge');
  });

  it('risk report lists all risk items', async () => {
    const audit = computeAudit(brokenInput());
    const writer = new InMemoryGuardianReportWriter();
    await generateRiskReport(writer, audit.risk);
    const report = writer.getReport('risk-report.md');
    for (const risk of audit.risk.risks) {
      expect(report).toContain(risk.id);
    }
  });

  it('debt report lists all debt items', async () => {
    const audit = computeAudit(brokenInput());
    const writer = new InMemoryGuardianReportWriter();
    await generateTechnicalDebtReport(writer, audit.technicalDebt);
    const report = writer.getReport('technical-debt.md');
    expect(report).toContain('Debt Items');
  });

  it('roadmap report has next engines and RFCs', async () => {
    const audit = computeAudit(cleanInput());
    const writer = new InMemoryGuardianReportWriter();
    await generateRoadmapReport(writer, audit.roadmap);
    const report = writer.getReport('roadmap.md');
    expect(report).toContain('Next Engines');
    expect(report).toContain('RFC');
  });

  it('architecture report has max depth', async () => {
    const audit = computeAudit(cleanInput());
    const writer = new InMemoryGuardianReportWriter();
    await generateArchitectureReport(writer, audit.architecture);
    const report = writer.getReport('architecture-report.md');
    expect(report).toContain('Max Dependency Depth');
  });
});
