/**
 * Risk Analyzer Tests (14)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { analyzeRisk, resetRiskIdCounter } from '../src/analyzers/RiskAnalyzer.js';
import { cleanInput, brokenInput, circularInput, emptyInput, largeInput } from './helpers.js';

describe('Risk Analyzer', () => {
  beforeEach(() => { resetRiskIdCounter(); });

  it('returns low risk for clean platform (except missing ref owner)', () => {
    const result = analyzeRisk(cleanInput());
    // OrganizationReference owner doesn't exist in our test data → high risk
    // But critical count should be 0
    expect(result.criticalCount).toBe(0);
    const refRisks = result.risks.filter((r) => r.category === 'reference');
    expect(refRisks.length).toBeGreaterThan(0);
  });

  it('detects critical risks in broken platform', () => {
    const result = analyzeRisk(brokenInput());
    expect(result.criticalCount).toBeGreaterThan(0);
    expect(result.overallRisk).toBe('critical');
  });

  it('detects contract risks', () => {
    const result = analyzeRisk(brokenInput());
    const contractRisks = result.risks.filter((r) => r.category === 'contract');
    expect(contractRisks.length).toBeGreaterThan(0);
    expect(contractRisks.some((r) => r.level === 'critical')).toBe(true);
  });

  it('detects dependency risks (circular)', () => {
    const result = analyzeRisk(circularInput());
    const depRisks = result.risks.filter((r) => r.category === 'dependency');
    expect(depRisks.length).toBeGreaterThan(0);
  });

  it('detects dependency risks (forbidden imports)', () => {
    const result = analyzeRisk(brokenInput());
    const depRisks = result.risks.filter((r) => r.category === 'dependency');
    expect(depRisks.some((r) => r.title.includes('unknown engine'))).toBe(true);
  });

  it('detects API risks (breaking changes)', () => {
    const result = analyzeRisk(brokenInput());
    const apiRisks = result.risks.filter((r) => r.category === 'api');
    expect(apiRisks.length).toBeGreaterThan(0);
    expect(apiRisks[0]!.level).toBe('critical');
  });

  it('detects event risks (orphaned subscribers)', () => {
    const result = analyzeRisk(brokenInput());
    const eventRisks = result.risks.filter((r) => r.category === 'event');
    expect(eventRisks.length).toBeGreaterThan(0);
    expect(eventRisks[0]!.level).toBe('high');
  });

  it('detects reference risks (missing owner)', () => {
    const result = analyzeRisk(cleanInput());
    const refRisks = result.risks.filter((r) => r.category === 'reference');
    expect(refRisks.length).toBeGreaterThan(0);
    expect(refRisks[0]!.title).toContain('OrganizationReference');
  });

  it('detects operational risks (low health)', () => {
    const result = analyzeRisk(brokenInput());
    const opRisks = result.risks.filter((r) => r.category === 'operational');
    expect(opRisks.some((r) => r.title.includes('low health'))).toBe(true);
  });

  it('calculates risk score correctly', () => {
    const clean = analyzeRisk(cleanInput());
    const broken = analyzeRisk(brokenInput());
    expect(broken.riskScore).toBeGreaterThan(clean.riskScore);
  });

  it('handles empty platform', () => {
    const result = analyzeRisk(emptyInput());
    expect(result.riskScore).toBe(0);
    expect(result.risks).toHaveLength(0);
  });

  it('handles large platform', () => {
    const result = analyzeRisk(largeInput());
    expect(result.risks.length).toBeGreaterThan(0);
  });

  it('sorts risks by level (critical first)', () => {
    const result = analyzeRisk(brokenInput());
    for (let i = 1; i < result.risks.length; i++) {
      const order = { critical: 0, high: 1, medium: 2, low: 3, negligible: 4 };
      expect(order[result.risks[i]!.level]).toBeGreaterThanOrEqual(order[result.risks[i - 1]!.level]);
    }
  });

  it('all risk items have mitigation', () => {
    const result = analyzeRisk(brokenInput());
    for (const risk of result.risks) {
      expect(risk.mitigation).toBeTruthy();
      expect(risk.mitigation.length).toBeGreaterThan(5);
    }
  });
});
