/**
 * Guardian Scorer & Decision Tests (16)
 */

import { describe, it, expect } from 'vitest';
import { calculateGuardianScore, scoreToGrade } from '../src/scorer/GuardianScorer.js';
import { makeGuardianDecision } from '../src/decision/GuardianDecisionMaker.js';
import { analyzeArchitecture } from '../src/analyzers/ArchitectureAnalyzer.js';
import { analyzeRisk } from '../src/analyzers/RiskAnalyzer.js';
import { analyzeTechnicalDebt } from '../src/analyzers/TechnicalDebtAnalyzer.js';
import { cleanInput, brokenInput, circularInput, emptyInput } from './helpers.js';

describe('Guardian Scorer', () => {
  it('calculates score for clean platform', () => {
    const input = cleanInput();
    const arch = analyzeArchitecture(input);
    const risk = analyzeRisk(input);
    const debt = analyzeTechnicalDebt(input);
    const score = calculateGuardianScore(input, arch, risk, debt);
    expect(score.overall).toBeGreaterThan(50);
    expect(score.grade).toMatch(/[A-F]/);
  });

  it('calculates lower score for broken platform', () => {
    const cleanScore = calculateGuardianScore(cleanInput(),
      analyzeArchitecture(cleanInput()), analyzeRisk(cleanInput()), analyzeTechnicalDebt(cleanInput()));
    const brokenScore = calculateGuardianScore(brokenInput(),
      analyzeArchitecture(brokenInput()), analyzeRisk(brokenInput()), analyzeTechnicalDebt(brokenInput()));
    expect(brokenScore.overall).toBeLessThan(cleanScore.overall);
  });

  it('produces all 6 sub-scores', () => {
    const score = calculateGuardianScore(cleanInput(),
      analyzeArchitecture(cleanInput()), analyzeRisk(cleanInput()), analyzeTechnicalDebt(cleanInput()));
    expect(score.architectureScore).toBeGreaterThanOrEqual(0);
    expect(score.architectureScore).toBeLessThanOrEqual(100);
    expect(score.compatibilityScore).toBeGreaterThanOrEqual(0);
    expect(score.maintainabilityScore).toBeGreaterThanOrEqual(0);
    expect(score.securityScore).toBeGreaterThanOrEqual(0);
    expect(score.performanceScore).toBeGreaterThanOrEqual(0);
    expect(score.contractScore).toBeGreaterThanOrEqual(0);
  });

  it('converts score to grade correctly', () => {
    expect(scoreToGrade(100)).toBe('AAA');
    expect(scoreToGrade(97)).toBe('AAA');
    expect(scoreToGrade(96)).toBe('AA');
    expect(scoreToGrade(90)).toBe('AA');
    expect(scoreToGrade(89)).toBe('A');
    expect(scoreToGrade(80)).toBe('A');
    expect(scoreToGrade(79)).toBe('B');
    expect(scoreToGrade(70)).toBe('B');
    expect(scoreToGrade(69)).toBe('C');
    expect(scoreToGrade(60)).toBe('C');
    expect(scoreToGrade(59)).toBe('D');
    expect(scoreToGrade(50)).toBe('D');
    expect(scoreToGrade(49)).toBe('F');
    expect(scoreToGrade(0)).toBe('F');
  });

  it('handles empty platform', () => {
    const score = calculateGuardianScore(emptyInput(),
      analyzeArchitecture(emptyInput()), analyzeRisk(emptyInput()), analyzeTechnicalDebt(emptyInput()));
    expect(score.overall).toBeGreaterThanOrEqual(0);
    expect(score.grade).toBeDefined();
  });
});

describe('Guardian Decision Maker', () => {
  it('APPROVES clean platform', () => {
    const input = cleanInput();
    const arch = analyzeArchitecture(input);
    const risk = analyzeRisk(input);
    const debt = analyzeTechnicalDebt(input);
    const score = calculateGuardianScore(input, arch, risk, debt);
    const decision = makeGuardianDecision(score, risk, debt, arch);
    expect(['APPROVED', 'APPROVED_WITH_CONDITIONS']).toContain(decision.decision);
    expect(decision.canMerge).toBe(true);
  });

  it('REJECTS broken platform', () => {
    const input = brokenInput();
    const arch = analyzeArchitecture(input);
    const risk = analyzeRisk(input);
    const debt = analyzeTechnicalDebt(input);
    const score = calculateGuardianScore(input, arch, risk, debt);
    const decision = makeGuardianDecision(score, risk, debt, arch);
    expect(decision.decision).toBe('REJECTED');
    expect(decision.canMerge).toBe(false);
    expect(decision.blockers.length).toBeGreaterThan(0);
  });

  it('REJECTS platform with circular dependencies', () => {
    const input = circularInput();
    const arch = analyzeArchitecture(input);
    const risk = analyzeRisk(input);
    const debt = analyzeTechnicalDebt(input);
    const score = calculateGuardianScore(input, arch, risk, debt);
    const decision = makeGuardianDecision(score, risk, debt, arch);
    expect(['REJECTED', 'REVIEW_REQUIRED']).toContain(decision.decision);
  });

  it('includes conditions for APPROVED_WITH_CONDITIONS', () => {
    const input = cleanInput();
    // Add some warnings but no critical issues
    input.eventResults.push({
      eventType: 'orphan.event', publisher: '', subscribers: ['user'],
      hasPublisher: false, hasSubscribers: true, orphanedSubscribers: ['user'], status: 'fail',
    });
    const arch = analyzeArchitecture(input);
    const risk = analyzeRisk(input);
    const debt = analyzeTechnicalDebt(input);
    const score = calculateGuardianScore(input, arch, risk, debt);
    const decision = makeGuardianDecision(score, risk, debt, arch);
    // Should have conditions or be rejected due to risk
    expect(decision.conditions.length + decision.blockers.length).toBeGreaterThan(0);
  });

  it('decision has approvedBy set to platform-guardian', () => {
    const input = cleanInput();
    const arch = analyzeArchitecture(input);
    const risk = analyzeRisk(input);
    const debt = analyzeTechnicalDebt(input);
    const score = calculateGuardianScore(input, arch, risk, debt);
    const decision = makeGuardianDecision(score, risk, debt, arch);
    expect(decision.approvedBy).toBe('platform-guardian');
  });

  it('decision has timestamp', () => {
    const input = cleanInput();
    const arch = analyzeArchitecture(input);
    const risk = analyzeRisk(input);
    const debt = analyzeTechnicalDebt(input);
    const score = calculateGuardianScore(input, arch, risk, debt);
    const decision = makeGuardianDecision(score, risk, debt, arch);
    expect(decision.decidedAt).toBeTruthy();
  });

  it('summary contains key information', () => {
    const input = cleanInput();
    const arch = analyzeArchitecture(input);
    const risk = analyzeRisk(input);
    const debt = analyzeTechnicalDebt(input);
    const score = calculateGuardianScore(input, arch, risk, debt);
    const decision = makeGuardianDecision(score, risk, debt, arch);
    expect(decision.summary).toContain('Decision');
    expect(decision.summary).toContain('Grade');
  });

  it('rejects when overall score is below 30', () => {
    const input = brokenInput();
    const arch = analyzeArchitecture(input);
    const risk = analyzeRisk(input);
    const debt = analyzeTechnicalDebt(input);
    const score = { ...calculateGuardianScore(input, arch, risk, debt), overall: 25, grade: 'F' as const };
    const decision = makeGuardianDecision(score, risk, debt, arch);
    expect(decision.decision).toBe('REJECTED');
  });

  it('REVIEW_REQUIRED for grade D', () => {
    const input = cleanInput();
    const arch = analyzeArchitecture(input);
    const risk = analyzeRisk(input);
    const debt = analyzeTechnicalDebt(input);
    const score = { ...calculateGuardianScore(input, arch, risk, debt), overall: 55, grade: 'D' as const };
    const decision = makeGuardianDecision(score, risk, debt, arch);
    expect(decision.decision).toBe('REVIEW_REQUIRED');
    expect(decision.canMerge).toBe(false);
  });
});
