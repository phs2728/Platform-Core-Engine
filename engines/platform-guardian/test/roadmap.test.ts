/**
 * Roadmap Generator Tests (12)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { generateRoadmap, resetRoadmapIdCounter } from '../src/analyzers/RoadmapGenerator.js';
import { analyzeArchitecture } from '../src/analyzers/ArchitectureAnalyzer.js';
import { analyzeRisk } from '../src/analyzers/RiskAnalyzer.js';
import { analyzeTechnicalDebt } from '../src/analyzers/TechnicalDebtAnalyzer.js';
import { cleanInput, brokenInput, emptyInput } from './helpers.js';

describe('Roadmap Generator', () => {
  beforeEach(() => { resetRoadmapIdCounter(); });

  it('generates recommendations for clean platform', () => {
    const input = cleanInput();
    const arch = analyzeArchitecture(input);
    const risk = analyzeRisk(input);
    const debt = analyzeTechnicalDebt(input);
    const roadmap = generateRoadmap(input, arch, risk, debt);
    expect(roadmap.recommendations.length).toBeGreaterThan(0);
  });

  it('recommends new engines (payment, review, workflow)', () => {
    const input = cleanInput();
    const arch = analyzeArchitecture(input);
    const risk = analyzeRisk(input);
    const debt = analyzeTechnicalDebt(input);
    const roadmap = generateRoadmap(input, arch, risk, debt);
    expect(roadmap.nextEngines.length).toBeGreaterThan(0);
    // Should recommend some standard engines
    const titles = roadmap.recommendations.map((r) => r.title);
    expect(titles.some((t) => t.includes('Payment') || t.includes('Review') || t.includes('Workflow'))).toBe(true);
  });

  it('generates RFC recommendations for broken platform', () => {
    const input = brokenInput();
    const arch = analyzeArchitecture(input);
    const risk = analyzeRisk(input);
    const debt = analyzeTechnicalDebt(input);
    const roadmap = generateRoadmap(input, arch, risk, debt);
    expect(roadmap.nextRFCs.length).toBeGreaterThan(0);
  });

  it('generates migration plans for breaking changes', () => {
    const input = brokenInput();
    const arch = analyzeArchitecture(input);
    const risk = analyzeRisk(input);
    const debt = analyzeTechnicalDebt(input);
    const roadmap = generateRoadmap(input, arch, risk, debt);
    expect(roadmap.migrationPlans.length).toBeGreaterThan(0);
  });

  it('recommends stabilization for low-health engines', () => {
    const input = brokenInput();
    const arch = analyzeArchitecture(input);
    const risk = analyzeRisk(input);
    const debt = analyzeTechnicalDebt(input);
    const roadmap = generateRoadmap(input, arch, risk, debt);
    const stabilizeRecs = roadmap.recommendations.filter((r) => r.type === 'stabilize');
    expect(stabilizeRecs.length).toBeGreaterThan(0);
  });

  it('sorts recommendations by priority', () => {
    const input = brokenInput();
    const arch = analyzeArchitecture(input);
    const risk = analyzeRisk(input);
    const debt = analyzeTechnicalDebt(input);
    const roadmap = generateRoadmap(input, arch, risk, debt);
    const order = { P0: 0, P1: 1, P2: 2, P3: 3 };
    for (let i = 1; i < roadmap.recommendations.length; i++) {
      expect(order[roadmap.recommendations[i]!.priority]).toBeGreaterThanOrEqual(order[roadmap.recommendations[i - 1]!.priority]);
    }
  });

  it('handles empty platform', () => {
    const input = emptyInput();
    const arch = analyzeArchitecture(input);
    const risk = analyzeRisk(input);
    const debt = analyzeTechnicalDebt(input);
    const roadmap = generateRoadmap(input, arch, risk, debt);
    // Even empty platform gets new-engine recommendations
    expect(roadmap.recommendations.length).toBeGreaterThan(0);
  });

  it('recommendations have unique IDs', () => {
    const input = cleanInput();
    const arch = analyzeArchitecture(input);
    const risk = analyzeRisk(input);
    const debt = analyzeTechnicalDebt(input);
    const roadmap = generateRoadmap(input, arch, risk, debt);
    const ids = roadmap.recommendations.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('P0 recommendations only for critical issues', () => {
    const input = brokenInput();
    const arch = analyzeArchitecture(input);
    const risk = analyzeRisk(input);
    const debt = analyzeTechnicalDebt(input);
    const roadmap = generateRoadmap(input, arch, risk, debt);
    const p0 = roadmap.recommendations.filter((r) => r.priority === 'P0');
    for (const rec of p0) {
      expect(['migration', 'stabilize']).toContain(rec.type);
    }
  });

  it('migration plans have steps', () => {
    const input = brokenInput();
    const arch = analyzeArchitecture(input);
    const risk = analyzeRisk(input);
    const debt = analyzeTechnicalDebt(input);
    const roadmap = generateRoadmap(input, arch, risk, debt);
    for (const plan of roadmap.migrationPlans) {
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.affectedEngines.length).toBeGreaterThan(0);
    }
  });

  it('all recommendations have rationale', () => {
    const input = cleanInput();
    const arch = analyzeArchitecture(input);
    const risk = analyzeRisk(input);
    const debt = analyzeTechnicalDebt(input);
    const roadmap = generateRoadmap(input, arch, risk, debt);
    for (const rec of roadmap.recommendations) {
      expect(rec.rationale).toBeTruthy();
      expect(rec.rationale.length).toBeGreaterThan(5);
    }
  });

  it('nextEngines contains unique values', () => {
    const input = cleanInput();
    const arch = analyzeArchitecture(input);
    const risk = analyzeRisk(input);
    const debt = analyzeTechnicalDebt(input);
    const roadmap = generateRoadmap(input, arch, risk, debt);
    expect(new Set(roadmap.nextEngines).size).toBe(roadmap.nextEngines.length);
  });
});
