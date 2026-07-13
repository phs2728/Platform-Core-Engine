/**
 * Quality Execution Standard v1 — Test Suite
 */
import { describe, it, expect } from 'vitest';
import {
  EXECUTION_LEVEL_ORDER, levelRank, meetsMinimumLevel,
  ALL_QUALITY_CATEGORIES,
  AI_SMELL_RULES, detectAISmell,
  compareAgainstGoldenReference,
  ALL_REVIEWER_ROLES, runProfessionalReview,
  aggregateVerdicts, determineExecutionLevel,
  generateImprovementTasks, assessPage,
  PAGE_QUALITY_MATRIX,
  QESContinuousImprovement,
} from '../src/index.js';

// ═══════════════════════════════════════════
// Part 1: Execution Levels
// ═══════════════════════════════════════════

describe('Part 1: Execution Levels', () => {
  it('has 7 levels in order', () => {
    expect(EXECUTION_LEVEL_ORDER.length).toBe(7);
    expect(EXECUTION_LEVEL_ORDER[0]).toBe('Bronze');
    expect(EXECUTION_LEVEL_ORDER[6]).toBe('World Class');
  });

  it('levelRank returns correct index', () => {
    expect(levelRank('Bronze')).toBe(0);
    expect(levelRank('World Class')).toBe(6);
  });

  it('meetsMinimumLevel: Gold meets Silver', () => {
    expect(meetsMinimumLevel('Gold', 'Silver')).toBe(true);
  });

  it('meetsMinimumLevel: Silver does not meet Gold', () => {
    expect(meetsMinimumLevel('Silver', 'Gold')).toBe(false);
  });
});

// ═══════════════════════════════════════════
// Part 2: Quality Categories
// ═══════════════════════════════════════════

describe('Part 2: Quality Categories', () => {
  it('has 20 categories', () => {
    expect(ALL_QUALITY_CATEGORIES.length).toBe(20);
  });

  it('includes all key categories', () => {
    expect(ALL_QUALITY_CATEGORIES).toContain('Accessibility');
    expect(ALL_QUALITY_CATEGORIES).toContain('SEO');
    expect(ALL_QUALITY_CATEGORIES).toContain('Performance');
    expect(ALL_QUALITY_CATEGORIES).toContain('Trust Evidence');
    expect(ALL_QUALITY_CATEGORIES).toContain('Customer Psychology');
  });
});

// ═══════════════════════════════════════════
// Part 3: Page Quality Matrix
// ═══════════════════════════════════════════

describe('Part 3: Page Quality Matrix', () => {
  it('Homepage standard exists', () => {
    const s = PAGE_QUALITY_MATRIX['Homepage'];
    expect(s).toBeDefined();
    expect(s.minimumLevel).toBe('Premium');
    expect(s.requiredSections.length).toBeGreaterThan(0);
  });

  it('Hotel Room requires Agency Grade', () => {
    expect(PAGE_QUALITY_MATRIX['Hotel Room'].minimumLevel).toBe('Agency Grade');
  });

  it('Checkout requires Enterprise Grade', () => {
    expect(PAGE_QUALITY_MATRIX['Checkout'].minimumLevel).toBe('Enterprise Grade');
  });

  it('FAQ requires Gold', () => {
    expect(PAGE_QUALITY_MATRIX['FAQ'].minimumLevel).toBe('Gold');
  });
});

// ═══════════════════════════════════════════
// Part 4: AI Smell Detection
// ═══════════════════════════════════════════

describe('Part 4: AI Smell Detection', () => {
  it('AI_SMELL_RULES has 13 rules', () => {
    expect(AI_SMELL_RULES.length).toBe(13);
  });

  it('detects AI gradient', () => {
    const findings = detectAISmell({ sections: [], gradient: 'purple-blue-pink' });
    expect(findings.some(f => f.type === 'AI Gradient')).toBe(true);
    expect(findings[0]!.severity).toBe('reject');
  });

  it('detects repeated cards (4+ same layout)', () => {
    const findings = detectAISmell({
      sections: [
        { type: 'feature', layout: 'card' },
        { type: 'feature', layout: 'card' },
        { type: 'feature', layout: 'card' },
        { type: 'feature', layout: 'card' },
      ],
    });
    expect(findings.some(f => f.type === 'Repeated Cards')).toBe(true);
  });

  it('detects placeholder copy', () => {
    const findings = detectAISmell({ sections: [], copy: ['lorem ipsum dolor sit amet'] });
    expect(findings.some(f => f.type === 'Placeholder Copy')).toBe(true);
  });

  it('detects poor CTA', () => {
    const findings = detectAISmell({ sections: [], ctaText: 'Submit' });
    expect(findings.some(f => f.type === 'Poor CTA')).toBe(true);
  });

  it('detects missing trust evidence', () => {
    const findings = detectAISmell({ sections: [], hasReviews: false, hasTestimonials: false });
    expect(findings.some(f => f.type === 'Missing Trust Evidence')).toBe(true);
  });

  it('clean page has no findings', () => {
    const findings = detectAISmell({
      sections: [{ type: 'hero' }, { type: 'features' }],
      ctaText: 'Book Now', hasReviews: true,
    });
    expect(findings.length).toBe(0);
  });
});

// ═══════════════════════════════════════════
// Part 5: Golden Reference Comparison
// ═══════════════════════════════════════════

describe('Part 5: Golden Reference Comparison', () => {
  it('PASS when observed meets reference', () => {
    const result = compareAgainstGoldenReference({
      referenceName: 'Apple', category: 'Whitespace',
      observedLevel: 'World Class', referenceLevel: 'World Class',
      gapDescription: 'No gap',
    });
    expect(result.verdict).toBe('PASS');
  });

  it('FAIL when far from reference', () => {
    const result = compareAgainstGoldenReference({
      referenceName: 'Aman Resorts', category: 'Visual Hierarchy',
      observedLevel: 'Bronze', referenceLevel: 'World Class',
      gapDescription: 'Hierarchy completely missing',
    });
    expect(result.verdict).toBe('FAIL');
  });

  it('WARNING when close to reference', () => {
    const result = compareAgainstGoldenReference({
      referenceName: 'Stripe', category: 'Conversion',
      observedLevel: 'Premium', referenceLevel: 'World Class',
      gapDescription: 'CTA placement slightly different',
    });
    expect(result.verdict).toBe('WARNING');
  });
});

// ═══════════════════════════════════════════
// Part 6: Professional Review
// ═══════════════════════════════════════════

describe('Part 6: Professional Review', () => {
  it('ALL_REVIEWER_ROLES has 9 reviewers', () => {
    expect(ALL_REVIEWER_ROLES.length).toBe(9);
  });

  it('all reviewers produce verdicts', () => {
    const reviews = runProfessionalReview({
      pageType: 'Homepage',
      pageSnapshot: { hasVisualHierarchy: true, hasAccessibilityAudit: true, hasSEOSchema: true, hasPerformanceBudget: true, hasConversionStrategy: true, hasBrandVoice: true, hasCopyReview: true, hasInteractionDesign: true },
    });
    expect(reviews.length).toBe(9);
    reviews.forEach(r => {
      expect(['PASS', 'WARNING', 'FAIL']).toContain(r.verdict);
    });
  });

  it('Art Director FAILs without hierarchy', () => {
    const reviews = runProfessionalReview({ pageType: 'Homepage', pageSnapshot: {} });
    const ad = reviews.find(r => r.reviewer === 'Art Director')!;
    expect(ad.verdict).toBe('FAIL');
  });

  it('all PASS when everything is present', () => {
    const reviews = runProfessionalReview({
      pageType: 'Homepage',
      pageSnapshot: { hasVisualHierarchy: true, hasAccessibilityAudit: true, hasSEOSchema: true, hasPerformanceBudget: true, hasConversionStrategy: true, hasBrandVoice: true, hasCopyReview: true, hasInteractionDesign: true },
    });
    reviews.forEach(r => expect(r.verdict).toBe('PASS'));
  });
});

// ═══════════════════════════════════════════
// Part 7: Aggregation + Assessment
// ═══════════════════════════════════════════

describe('Part 7: Verdict Aggregation', () => {
  it('FAIL dominates', () => {
    expect(aggregateVerdicts(['PASS', 'FAIL', 'PASS'])).toBe('FAIL');
  });

  it('WARNING when no FAIL', () => {
    expect(aggregateVerdicts(['PASS', 'WARNING', 'PASS'])).toBe('WARNING');
  });

  it('PASS when all PASS', () => {
    expect(aggregateVerdicts(['PASS', 'PASS'])).toBe('PASS');
  });
});

describe('Part 7: Execution Level Determination', () => {
  it('rejects AI smell → Bronze', () => {
    const result = determineExecutionLevel({
      categoryVerdicts: {} as never,
      reviewVerdicts: ['PASS'],
      aiSmellFindings: [{ type: 'AI Gradient' as never, severity: 'reject', evidence: '', recommendation: '' }],
      requiredLevel: 'Premium',
    });
    expect(result.achieved).toBe('Bronze');
    expect(result.passed).toBe(false);
  });

  it('all PASS → meets required level', () => {
    const result = determineExecutionLevel({
      categoryVerdicts: {} as never,
      reviewVerdicts: ['PASS'],
      aiSmellFindings: [],
      requiredLevel: 'Premium',
    });
    expect(result.achieved).toBe('Premium');
    expect(result.passed).toBe(true);
  });

  it('WARNING → Gold cap', () => {
    const result = determineExecutionLevel({
      categoryVerdicts: {} as never,
      reviewVerdicts: ['WARNING'],
      aiSmellFindings: [],
      requiredLevel: 'Premium',
    });
    expect(result.achieved).toBe('Gold');
    expect(result.passed).toBe(false); // Gold < Premium
  });
});

// ═══════════════════════════════════════════
// Part 8: Full Page Assessment (E2E)
// ═══════════════════════════════════════════

describe('Part 8: Full assessPage (E2E)', () => {
  it('clean page → PASS with required level', () => {
    const result = assessPage({
      pageType: 'Homepage',
      pageSnapshot: {
        sections: [{ type: 'hero' }, { type: 'features' }],
        ctaText: 'Book Now', hasReviews: true, hasTestimonials: true,
        hasVisualHierarchy: true, hasAccessibilityAudit: true, hasSEOSchema: true,
        hasPerformanceBudget: true, hasConversionStrategy: true, hasBrandVoice: true,
        hasCopyReview: true, hasInteractionDesign: true,
      },
    });
    expect(result.executionLevel).toBe('Premium');
  });

  it('AI smell → FAIL', () => {
    const result = assessPage({
      pageType: 'Homepage',
      pageSnapshot: {
        sections: [], gradient: 'purple-blue', hasReviews: false, hasTestimonials: false,
        ctaText: 'Submit',
      },
    });
    expect(result.overallVerdict).toBe('FAIL');
    expect(result.aiSmellFindings.length).toBeGreaterThan(0);
    expect(result.improvementTasks.length).toBeGreaterThan(0);
  });

  it('missing accessibility → FAIL', () => {
    const result = assessPage({
      pageType: 'Homepage',
      pageSnapshot: {
        sections: [{ type: 'hero' }], ctaText: 'Book Now', hasReviews: true,
        hasVisualHierarchy: true, hasAccessibilityAudit: false,
        hasSEOSchema: true, hasPerformanceBudget: true, hasConversionStrategy: true,
        hasBrandVoice: true, hasCopyReview: true, hasInteractionDesign: true,
      },
    });
    expect(result.overallVerdict).toBe('FAIL');
    expect(result.improvementTasks.some(t => t.includes('accessibility') || t.includes('WCAG'))).toBe(true);
  });
});

// ═══════════════════════════════════════════
// Part 8: Continuous Improvement
// ═══════════════════════════════════════════

describe('Part 8: Continuous Improvement', () => {
  it('accepts evidence-based updates', () => {
    const ci = new QESContinuousImprovement();
    ci.proposeUpdate({
      id: 'u-1', type: 'level_adjusted',
      description: 'Homepage minimum level raised to Agency Grade',
      evidence: 'After analyzing 50 production homepages, Premium-level homepages still had 23% bounce rate',
      timestamp: new Date().toISOString(),
    });
    expect(ci.count()).toBe(1);
  });

  it('rejects updates without evidence', () => {
    const ci = new QESContinuousImprovement();
    expect(() => ci.proposeUpdate({
      id: 'u-1', type: 'rule_added', description: 'test', evidence: 'short', timestamp: new Date().toISOString(),
    })).toThrow();
  });
});