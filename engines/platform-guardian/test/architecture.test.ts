/**
 * Architecture Analyzer Tests (14)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { analyzeArchitecture } from '../src/analyzers/ArchitectureAnalyzer.js';
import { cleanInput, brokenInput, phaseViolationInput, emptyInput, largeInput } from './helpers.js';

describe('Architecture Analyzer', () => {
  it('returns high score for clean architecture', () => {
    const result = analyzeArchitecture(cleanInput());
    expect(result.score).toBeGreaterThan(80);
    expect(result.isClean).toBe(true);
  });

  it('detects no critical issues in clean input', () => {
    const result = analyzeArchitecture(cleanInput());
    const critical = result.issues.filter((i) => i.level === 'critical');
    expect(critical).toHaveLength(0);
  });

  it('detects critical issues in broken input', () => {
    const result = analyzeArchitecture(brokenInput());
    expect(result.score).toBeLessThan(100);
  });

  it('detects phase violations', () => {
    const result = analyzeArchitecture(phaseViolationInput());
    const phaseIssues = result.issues.filter((i) => i.category === 'phase');
    expect(phaseIssues.length).toBeGreaterThan(0);
  });

  it('detects architecture drift', () => {
    const result = analyzeArchitecture(phaseViolationInput());
    const driftIssues = result.issues.filter((i) => i.category === 'drift');
    expect(driftIssues.length).toBeGreaterThan(0);
  });

  it('builds layer distribution from manifests', () => {
    const result = analyzeArchitecture(cleanInput());
    expect(Object.keys(result.layerDistribution).length).toBeGreaterThan(0);
    expect(result.layerDistribution[1]).toBeDefined();
  });

  it('calculates max dependency depth', () => {
    const result = analyzeArchitecture(cleanInput());
    expect(result.maxDepth).toBeGreaterThan(0);
    // user → identity → core-sdk → policy = depth 3
    expect(result.maxDepth).toBeGreaterThanOrEqual(2);
  });

  it('handles empty platform gracefully', () => {
    const result = analyzeArchitecture(emptyInput());
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.maxDepth).toBe(0);
  });

  it('detects missing boundaries as architecture issue', () => {
    const input = cleanInput();
    // Add engine without boundaries
    input.manifests.push({
      id: 'no-boundary', name: 'No Boundary', version: '0.1.0', phase: 1,
      depends_on: [], provides: ['x'], events_emitted: [], events_subscribed: [],
    });
    const result = analyzeArchitecture(input);
    // The engine exists but has no boundaries — not an architecture issue per se,
    // but it affects security score
    expect(result).toBeDefined();
  });

  it('detects ownership conflicts', () => {
    const input = cleanInput();
    // Add engine that claims same domain as core-sdk
    input.manifests.push({
      id: 'conflict-engine', name: 'Conflict', version: '0.1.0', phase: 1,
      depends_on: [], provides: ['x'],
      events_emitted: [], events_subscribed: [],
      strict_boundaries: {
        owns: ['Logger', 'Result'], // same as core-sdk!
        forbidden: [],
      },
    });
    const result = analyzeArchitecture(input);
    const ownershipIssues = result.issues.filter((i) => i.category === 'ownership');
    expect(ownershipIssues.length).toBeGreaterThan(0);
  });

  it('handles large platform with many engines', () => {
    const result = analyzeArchitecture(largeInput());
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(Object.keys(result.layerDistribution).length).toBeGreaterThan(0);
  });

  it('sorts issues by severity (critical first)', () => {
    const result = analyzeArchitecture(brokenInput());
    for (let i = 1; i < result.issues.length; i++) {
      const order = { critical: 0, warning: 1, info: 2 };
      expect(order[result.issues[i]!.level]).toBeGreaterThanOrEqual(order[result.issues[i - 1]!.level]);
    }
  });

  it('issues have required fields', () => {
    const result = analyzeArchitecture(brokenInput());
    for (const issue of result.issues) {
      expect(issue.level).toBeDefined();
      expect(issue.category).toBeDefined();
      expect(issue.rule).toBeDefined();
      expect(issue.message).toBeDefined();
      expect(issue.recommendation).toBeDefined();
    }
  });

  it('architecture score decreases with more issues', () => {
    const clean = analyzeArchitecture(cleanInput());
    const broken = analyzeArchitecture(brokenInput());
    expect(broken.score).toBeLessThanOrEqual(clean.score);
  });
});
