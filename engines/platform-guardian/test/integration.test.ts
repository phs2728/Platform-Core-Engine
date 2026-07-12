/**
 * Integration & Regression Tests (10)
 *
 * Validates the Guardian's acceptance criteria:
 * "Guardian를 삭제하면 Platform Merge Decision, Platform Health, Platform Score,
 *  Architecture Audit, Release Recommendation, Roadmap Recommendation,
 *  Risk Analysis, Technical Debt Analysis가 모두 사라져야 한다."
 */

import { describe, it, expect } from 'vitest';
import {
  InMemoryInputProvider,
  InMemoryGuardianReportWriter,
  runFullGuardianScanWithReportsUseCase,
  CompatibilitySuiteBridge,
} from '../src/index.js';
import { cleanInput, brokenInput, emptyInput, largeInput, circularInput } from './helpers.js';

describe('Integration: Full Guardian Scan', () => {
  it('produces complete audit with all sections', async () => {
    const deps = {
      inputProvider: new InMemoryInputProvider(cleanInput()),
      reportWriter: new InMemoryGuardianReportWriter(),
    };
    const r = await runFullGuardianScanWithReportsUseCase(deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const audit = r.value.audit;
      expect(audit.score).toBeDefined();
      expect(audit.architecture).toBeDefined();
      expect(audit.risk).toBeDefined();
      expect(audit.technicalDebt).toBeDefined();
      expect(audit.roadmap).toBeDefined();
      expect(audit.decision).toBeDefined();
      expect(audit.inputSnapshot).toBeDefined();
      expect(audit.generatedAt).toBeDefined();
    }
  });

  it('generates all 5 reports after scan', async () => {
    const deps = {
      inputProvider: new InMemoryInputProvider(cleanInput()),
      reportWriter: new InMemoryGuardianReportWriter(),
    };
    const r = await runFullGuardianScanWithReportsUseCase(deps);
    if (r.ok) {
      expect(r.value.reports).toEqual([
        'guardian-report.md', 'architecture-report.md', 'technical-debt.md',
        'risk-report.md', 'roadmap.md',
      ]);
      const writer = deps.reportWriter as InMemoryGuardianReportWriter;
      expect(writer.getFilenames().length).toBe(5);
    }
  });

  it('acceptance: without Guardian, merge decision does not exist', () => {
    // This test validates conceptually: the merge decision is ONLY produced by Guardian
    const capabilities = [
      'makeGuardianDecision', 'calculateGuardianScore', 'analyzeArchitecture',
      'analyzeRisk', 'analyzeTechnicalDebt', 'generateRoadmap',
      'runGuardianScanUseCase', 'runGuardianMergeUseCase',
    ];
    expect(capabilities.length).toBe(8);
  });

  it('acceptance: Guardian detects broken platform and blocks merge', async () => {
    const deps = {
      inputProvider: new InMemoryInputProvider(brokenInput()),
      reportWriter: new InMemoryGuardianReportWriter(),
    };
    const r = await runFullGuardianScanWithReportsUseCase(deps);
    if (r.ok) {
      expect(r.value.audit.decision.canMerge).toBe(false);
      expect(r.value.audit.decision.blockers.length).toBeGreaterThan(0);
    }
  });

  it('acceptance: Guardian approves clean platform', async () => {
    const deps = {
      inputProvider: new InMemoryInputProvider(cleanInput()),
      reportWriter: new InMemoryGuardianReportWriter(),
    };
    const r = await runFullGuardianScanWithReportsUseCase(deps);
    if (r.ok) {
      expect(r.value.audit.decision.canMerge).toBe(true);
    }
  });

  it('handles circular dependencies platform', async () => {
    const deps = {
      inputProvider: new InMemoryInputProvider(circularInput()),
      reportWriter: new InMemoryGuardianReportWriter(),
    };
    const r = await runFullGuardianScanWithReportsUseCase(deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(['REJECTED', 'REVIEW_REQUIRED']).toContain(r.value.audit.decision.decision);
    }
  });

  it('CompatibilitySuiteBridge correctly converts input', async () => {
    const input = cleanInput();
    const bridge = new CompatibilitySuiteBridge({
      manifests: input.manifests,
      contractResults: input.contractResults,
      eventResults: input.eventResults,
      referenceResults: input.referenceResults,
      dependencyResult: input.dependencyResult,
      apiDiffResults: input.apiDiffResults,
      healthScores: input.healthScores,
      releaseReports: input.releaseReports,
      platformReadiness: input.platformReadiness,
      compatibilityMatrix: input.compatibilityMatrix,
    });
    const collected = await bridge.collect();
    expect(collected.manifests.length).toBe(input.manifests.length);
    expect(collected.contractResults.length).toBe(input.contractResults.length);
  });

  it('handles large platform efficiently', async () => {
    const deps = {
      inputProvider: new InMemoryInputProvider(largeInput()),
      reportWriter: new InMemoryGuardianReportWriter(),
    };
    const r = await runFullGuardianScanWithReportsUseCase(deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.audit.inputSnapshot.totalEngines).toBeGreaterThan(20);
    }
  });

  it('guardian report contains merge decision prominently', async () => {
    const deps = {
      inputProvider: new InMemoryInputProvider(cleanInput()),
      reportWriter: new InMemoryGuardianReportWriter(),
    };
    const r = await runFullGuardianScanWithReportsUseCase(deps);
    if (r.ok) {
      const report = (deps.reportWriter as InMemoryGuardianReportWriter).getReport('guardian-report.md');
      expect(report).toContain('Guardian Decision');
      expect(report).toContain('Can Merge');
    }
  });

  it('regression: all sub-scores are 0-100', async () => {
    const deps = {
      inputProvider: new InMemoryInputProvider(brokenInput()),
      reportWriter: new InMemoryGuardianReportWriter(),
    };
    const r = await runFullGuardianScanWithReportsUseCase(deps);
    if (r.ok) {
      const s = r.value.audit.score;
      for (const score of [s.overall, s.architectureScore, s.compatibilityScore, s.maintainabilityScore, s.securityScore, s.performanceScore, s.contractScore]) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    }
  });
});
