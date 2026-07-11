/**
 * Use Case Tests (12)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryInputProvider,
  InMemoryGuardianReportWriter,
  runGuardianScanUseCase,
  runGuardianMergeUseCase,
  runGuardianReleaseUseCase,
  runGuardianRoadmapUseCase,
  runGuardianHealthUseCase,
  runFullGuardianScanWithReportsUseCase,
} from '../src/index.js';
import { cleanInput, brokenInput, emptyInput, largeInput } from './helpers.js';

function makeDeps(input: ReturnType<typeof cleanInput>) {
  return {
    inputProvider: new InMemoryInputProvider(input),
    reportWriter: new InMemoryGuardianReportWriter(),
  };
}

describe('Guardian Use Cases', () => {
  it('runGuardianScanUseCase produces full audit', async () => {
    const deps = makeDeps(cleanInput());
    const r = await runGuardianScanUseCase(deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.score).toBeDefined();
      expect(r.value.architecture).toBeDefined();
      expect(r.value.risk).toBeDefined();
      expect(r.value.technicalDebt).toBeDefined();
      expect(r.value.roadmap).toBeDefined();
      expect(r.value.decision).toBeDefined();
    }
  });

  it('runGuardianMergeUseCase returns decision', async () => {
    const deps = makeDeps(cleanInput());
    const r = await runGuardianMergeUseCase(deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(['APPROVED', 'APPROVED_WITH_CONDITIONS', 'REVIEW_REQUIRED', 'REJECTED']).toContain(r.value.decision);
    }
  });

  it('runGuardianReleaseUseCase returns score', async () => {
    const deps = makeDeps(cleanInput());
    const r = await runGuardianReleaseUseCase(deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.overall).toBeGreaterThanOrEqual(0);
      expect(r.value.grade).toMatch(/AAA|AA|A|B|C|D|F/);
    }
  });

  it('runGuardianRoadmapUseCase returns roadmap', async () => {
    const deps = makeDeps(cleanInput());
    const r = await runGuardianRoadmapUseCase(deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.recommendations.length).toBeGreaterThan(0);
    }
  });

  it('runGuardianHealthUseCase generates reports', async () => {
    const deps = makeDeps(cleanInput());
    const r = await runGuardianHealthUseCase(deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect((deps.reportWriter as InMemoryGuardianReportWriter).getFilenames().length).toBe(5);
    }
  });

  it('runFullGuardianScanWithReportsUseCase returns audit and report names', async () => {
    const deps = makeDeps(cleanInput());
    const r = await runFullGuardianScanWithReportsUseCase(deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.audit).toBeDefined();
      expect(r.value.reports.length).toBe(5);
    }
  });

  it('handles broken platform correctly', async () => {
    const deps = makeDeps(brokenInput());
    const r = await runGuardianScanUseCase(deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.decision.decision).toBe('REJECTED');
      expect(r.value.decision.canMerge).toBe(false);
    }
  });

  it('handles empty platform', async () => {
    const deps = makeDeps(emptyInput());
    const r = await runGuardianScanUseCase(deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.inputSnapshot.totalEngines).toBe(0);
    }
  });

  it('handles large platform', async () => {
    const deps = makeDeps(largeInput());
    const r = await runGuardianScanUseCase(deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.inputSnapshot.totalEngines).toBeGreaterThan(20);
    }
  });

  it('audit has generatedAt timestamp', async () => {
    const deps = makeDeps(cleanInput());
    const r = await runGuardianScanUseCase(deps);
    if (r.ok) {
      expect(r.value.generatedAt).toBeTruthy();
    }
  });

  it('audit has inputSnapshot with correct metrics', async () => {
    const deps = makeDeps(cleanInput());
    const r = await runGuardianScanUseCase(deps);
    if (r.ok) {
      const s = r.value.inputSnapshot;
      expect(s.totalEngines).toBe(cleanInput().manifests.length);
      expect(s.totalPublicApis).toBeGreaterThan(0);
      expect(s.totalEvents).toBeGreaterThan(0);
    }
  });

  it('merge use case for broken platform returns canMerge=false', async () => {
    const deps = makeDeps(brokenInput());
    const r = await runGuardianMergeUseCase(deps);
    if (r.ok) {
      expect(r.value.canMerge).toBe(false);
    }
  });
});
