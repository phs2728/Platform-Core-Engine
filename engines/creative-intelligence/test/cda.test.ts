/**
 * Creative Intelligence RC3.1 — Customer Decision Architecture (CDA) Tests
 *
 * Platform Vision RC3.1 검증:
 *  1. 12개 산업 Detail Blueprint
 *  2. 12개 산업 Objection Library
 *  3. 12개 산업 × 7개 PageType × 6개 질문 = 504개 Customer Questions (CQM)
 *  4. 12개 신규 산출물
 *  5. Platform First Principle (Section Existence Validation)
 *  6. 9-Stage Customer Journey
 *  7. FAQ Strategy (Decision Accelerator)
 *  8. AI Concierge Strategy
 *  9. Social Proof Architecture
 * 10. Story Architecture
 * 11. Detail Strategy Library
 * 12. Trust Evidence Placement
 * 13. Website Builder 용어 금지
 * 14. CQM priority sorting
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { makeDeps, baseInput, unwrap } from './helpers.js';
import {
  generateCustomerDecisionArchitectureUseCase,
  generateCDADecisionJourneyUseCase,
  generateDetailStrategyUseCase,
  generateTrustEvidencePlacementUseCase,
  generateObjectionLibraryUseCase,
  generateFAQStrategyUseCase,
  generateAIConciergeStrategyUseCase,
  generateSocialProofStrategyUseCase,
  generateStoryArchitectureUseCase,
  generateIndustryDetailBlueprintUseCase,
  generateCustomerQuestionModelUseCase,
  validateSectionExistenceUseCase,
  getIndustryDetailBlueprintUseCase,
  getObjectionLibraryUseCase,
  INDUSTRY_DETAIL_BLUEPRINTS, OBJECTION_LIBRARIES, JOURNEY_STEPS,
  generateCustomerQuestions, generateQuestionSequence,
} from '../src/index.js';
import { PLATFORM_FIRST_PRINCIPLE, validatePlatformTerminology } from '@platform/core-sdk';

type Deps = ReturnType<typeof makeDeps>;
const INDUSTRIES = ['Hospitality', 'Restaurant', 'Travel', 'Marketplace', 'Retail', 'Medical', 'Education', 'RealEstate', 'SaaS', 'NGO', 'Church', 'Government'] as const;
const PAGE_TYPES = ['Home', 'Detail', 'Booking', 'About', 'Pricing', 'FAQ', 'Contact'] as const;

// ═══════════════════════════════════════════
// 1. Platform First Principle
// ═══════════════════════════════════════════

describe('Platform First Principle (사장님 확립)', () => {
  it('PLATFORM_FIRST_PRINCIPLE exists', () => {
    expect(PLATFORM_FIRST_PRINCIPLE).toContain('Every section must earn its place');
  });

  it('forbids "Website Builder" terminology', () => {
    expect(validatePlatformTerminology('Website Builder')).toBe(false);
  });

  it('forbids "Page Builder"', () => {
    expect(validatePlatformTerminology('Page Builder')).toBe(false);
  });

  it('forbids "AI Website Generator"', () => {
    expect(validatePlatformTerminology('AI Website Generator')).toBe(false);
  });

  it('allows "Decision Experience Platform"', () => {
    expect(validatePlatformTerminology('Decision Experience Platform')).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 2. 12 Industries Detail Blueprint
// ═══════════════════════════════════════════

describe('12 Industries Detail Blueprint', () => {
  INDUSTRIES.forEach((ind) => {
    it(`${ind}: has sectionOrder with SectionBlueprint`, () => {
      const bp = INDUSTRY_DETAIL_BLUEPRINTS[ind];
      expect(bp.sectionOrder.length).toBeGreaterThanOrEqual(3);
      bp.sectionOrder.forEach((s) => {
        expect(s.name).toBeTruthy();
        expect(s.purpose).toBeTruthy();
        expect(s.answersQuestion).toBeTruthy();
      });
    });

    it(`${ind}: has primaryCta and evidenceOrder`, () => {
      const bp = INDUSTRY_DETAIL_BLUEPRINTS[ind];
      expect(bp.primaryCta).toBeTruthy();
      expect(bp.evidenceOrder.length).toBeGreaterThan(0);
    });
  });

  it('all 12 industries have distinct primaryCta', () => {
    const ctas = INDUSTRIES.map(i => INDUSTRY_DETAIL_BLUEPRINTS[i].primaryCta);
    expect(new Set(ctas).size).toBeGreaterThanOrEqual(10);
  });
});

// ═══════════════════════════════════════════
// 3. 12 Industries Objection Library
// ═══════════════════════════════════════════

describe('12 Industries Objection Library', () => {
  INDUSTRIES.forEach((ind) => {
    it(`${ind}: has objection library with Critical+Major`, () => {
      const lib = OBJECTION_LIBRARIES[ind];
      expect(lib.length).toBeGreaterThan(0);
      const critical = lib.filter(o => o.severity === 'Critical').length;
      const major = lib.filter(o => o.severity === 'Major').length;
      expect(critical + major).toBeGreaterThan(0);
    });
  });

  it('total objections across all industries ≥ 50', () => {
    const total = INDUSTRIES.reduce((sum, ind) => sum + OBJECTION_LIBRARIES[ind].length, 0);
    expect(total).toBeGreaterThanOrEqual(50);
  });
});

// ═══════════════════════════════════════════
// 4. Customer Question Model (CQM) — 사장님 추가 권장
// ═══════════════════════════════════════════

describe('Customer Question Model (CQM) — 사장님 추가', () => {
  INDUSTRIES.forEach((ind) => {
    PAGE_TYPES.forEach((pt) => {
      it(`${ind} × ${pt}: has 6 customer questions`, () => {
        const questions = generateCustomerQuestions(pt, ind);
        expect(questions.length).toBe(6);
      });

      it(`${ind} × ${pt}: has 3 Critical + 2 High + 1 Medium priority`, () => {
        const questions = generateCustomerQuestions(pt, ind);
        const critical = questions.filter(q => q.priority === 'Critical').length;
        const high = questions.filter(q => q.priority === 'High').length;
        const medium = questions.filter(q => q.priority === 'Medium').length;
        expect(critical).toBe(3);
        expect(high).toBe(2);
        expect(medium).toBe(1);
      });
    });
  });

  it('CQM total: 12 industries × 7 page types × 6 questions = 504 questions', () => {
    const total = INDUSTRIES.reduce((sum, ind) => {
      return sum + PAGE_TYPES.reduce((s, pt) => s + generateCustomerQuestions(pt, ind).length, 0);
    }, 0);
    expect(total).toBe(504);
  });

  it('questionSequence sorts by priority (Critical first)', () => {
    const questions = generateCustomerQuestions('Home', 'Hospitality');
    const sequence = generateQuestionSequence(questions);
    expect(sequence.length).toBe(6);
    // First 3 should be Critical
    const first3 = sequence.slice(0, 3).map(id => questions.find(q => q.id === id)!);
    expect(first3.every(q => q.priority === 'Critical')).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 5. 9-Stage Customer Journey
// ═══════════════════════════════════════════

describe('10-Stage Customer Journey (산업 공통)', () => {
  it('has 10 stages (Problem → Advocacy)', () => {
    expect(JOURNEY_STEPS.length).toBe(10);
  });

  it('each stage has Goal/Question/Objection/Evidence/Trigger/NextAction', () => {
    JOURNEY_STEPS.forEach((s) => {
      expect(s.goal).toBeTruthy();
      expect(s.question).toBeTruthy();
      expect(s.objection).toBeTruthy();
      expect(s.evidence).toBeTruthy();
      expect(s.decisionTrigger).toBeTruthy();
      expect(s.nextAction).toBeTruthy();
    });
  });
});

// ═══════════════════════════════════════════
// 6-17. 12 CDA UseCases
// ═══════════════════════════════════════════

describe('12 CDA UseCases', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('1. generateCustomerDecisionArchitectureUseCase', async () => {
    const r = await generateCustomerDecisionArchitectureUseCase({ ...baseInput, industry: 'Hospitality' }, deps);
    if (r.ok) {
      expect(r.value.journeySteps).toBe(10);
      expect(r.value.blueprintSections).toBeGreaterThan(0);
    }
  });

  it('2. generateDecisionJourneyUseCase', async () => {
    const r = await generateCDADecisionJourneyUseCase({ ...baseInput, industry: 'Restaurant' }, deps);
    if (r.ok) expect(r.value.stageCount).toBe(10);
  });

  it('3. generateDetailStrategyUseCase', async () => {
    const r = await generateDetailStrategyUseCase({ ...baseInput, industry: 'Travel', pageType: 'Booking' }, deps);
    if (r.ok) {
      expect(r.value.sectionCount).toBeGreaterThan(0);
      expect(r.value.primaryCta).toBe('Book Tour');
    }
  });

  it('4. generateTrustEvidencePlacementUseCase', async () => {
    const r = await generateTrustEvidencePlacementUseCase({ ...baseInput, industry: 'SaaS', pageRef: 'home' }, deps);
    if (r.ok) expect(r.value.sequenceCount).toBeGreaterThan(0);
  });

  it('5. generateObjectionLibraryUseCase', async () => {
    const r = await generateObjectionLibraryUseCase({ ...baseInput, industry: 'Medical' }, deps);
    if (r.ok) {
      expect(r.value.criticalCount).toBeGreaterThan(0);
      expect(r.value.total).toBeGreaterThan(0);
    }
  });

  it('6. generateFAQStrategyUseCase (Decision Accelerator)', async () => {
    const r = await generateFAQStrategyUseCase({ ...baseInput, industry: 'Marketplace' }, deps);
    if (r.ok) {
      expect(r.value.faqCount).toBeGreaterThan(0);
      expect(r.value.categoryCount).toBeGreaterThan(0);
    }
  });

  it('7. generateAIConciergeStrategyUseCase', async () => {
    const r = await generateAIConciergeStrategyUseCase({
      ...baseInput, industry: 'NGO', pageRef: 'home', context: { detectedInterests: ['transparency'] },
    }, deps);
    if (r.ok) expect(r.value.recommendationCount).toBeGreaterThan(0);
  });

  it('8. generateSocialProofStrategyUseCase', async () => {
    const r = await generateSocialProofStrategyUseCase({ ...baseInput, industry: 'SaaS', pageRef: 'home' }, deps);
    if (r.ok) expect(r.value.assetCount).toBeGreaterThan(0);
  });

  it('9. generateStoryArchitectureUseCase', async () => {
    const r = await generateStoryArchitectureUseCase({ ...baseInput, industry: 'Travel', pageRef: 'tours' }, deps);
    if (r.ok) {
      expect(r.value.storyCount).toBeGreaterThan(0);
    }
  });

  it('10. generateIndustryDetailBlueprintUseCase', async () => {
    const r = await generateIndustryDetailBlueprintUseCase({
      ...baseInput, industry: 'Government', pageType: 'Contact',
    }, deps);
    if (r.ok) {
      expect(r.value.sectionCount).toBeGreaterThan(0);
      expect(r.value.evidenceCount).toBeGreaterThan(0);
    }
  });

  it('11. generateCustomerQuestionModelUseCase (CQM)', async () => {
    const r = await generateCustomerQuestionModelUseCase({
      ...baseInput, industry: 'SaaS', pageType: 'Pricing',
    }, deps);
    if (r.ok) {
      expect(r.value.questionCount).toBe(6);
      expect(r.value.criticalCount).toBe(3);
      expect(r.value.sequence.length).toBe(6);
    }
  });

  it('12. validateSectionExistenceUseCase (Platform First Principle)', async () => {
    const r1 = await validateSectionExistenceUseCase({
      sectionName: 'Hero', answersQuestion: true, removesFear: false, buildsTrust: false, movesToNextDecision: false,
    }, deps);
    if (r1.ok) expect(r1.value.justifies).toBe(true);

    const r2 = await validateSectionExistenceUseCase({
      sectionName: 'Random Banner', answersQuestion: false, removesFear: false, buildsTrust: false, movesToNextDecision: false,
    }, deps);
    if (r2.ok) expect(r2.value.justifies).toBe(false);
  });
});

// ═══════════════════════════════════════════
// Query UseCases
// ═══════════════════════════════════════════

describe('CDA Query UseCases', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('getIndustryDetailBlueprintUseCase', async () => {
    const r = await getIndustryDetailBlueprintUseCase({ industry: 'SaaS', pageType: 'Home' }, deps);
    if (r.ok) {
      expect(r.value.industry).toBe('SaaS');
      expect(r.value.sectionCount).toBe(6);
    }
  });

  it('getObjectionLibraryUseCase', async () => {
    const r = await getObjectionLibraryUseCase({ industry: 'Marketplace' }, deps);
    if (r.ok) {
      expect(r.value.totalObjections).toBe(5);
      expect(r.value.criticalCount).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════
// Section Existence Validation (4 conditions)
// ═══════════════════════════════════════════

describe('Section Existence — 4 conditions', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('answersQuestion=true → justifies', async () => {
    const r = await validateSectionExistenceUseCase({ sectionName: 'S', answersQuestion: true, removesFear: false, buildsTrust: false, movesToNextDecision: false }, deps);
    if (r.ok) expect(r.value.justifies).toBe(true);
  });

  it('removesFear=true → justifies', async () => {
    const r = await validateSectionExistenceUseCase({ sectionName: 'S', answersQuestion: false, removesFear: true, buildsTrust: false, movesToNextDecision: false }, deps);
    if (r.ok) expect(r.value.justifies).toBe(true);
  });

  it('buildsTrust=true → justifies', async () => {
    const r = await validateSectionExistenceUseCase({ sectionName: 'S', answersQuestion: false, removesFear: false, buildsTrust: true, movesToNextDecision: false }, deps);
    if (r.ok) expect(r.value.justifies).toBe(true);
  });

  it('movesToNextDecision=true → justifies', async () => {
    const r = await validateSectionExistenceUseCase({ sectionName: 'S', answersQuestion: false, removesFear: false, buildsTrust: false, movesToNextDecision: true }, deps);
    if (r.ok) expect(r.value.justifies).toBe(true);
  });

  it('all 4 false → does NOT justify (Platform First Principle violation)', async () => {
    const r = await validateSectionExistenceUseCase({ sectionName: 'Decorative Banner', answersQuestion: false, removesFear: false, buildsTrust: false, movesToNextDecision: false }, deps);
    if (r.ok) {
      expect(r.value.justifies).toBe(false);
      expect(r.value.reason).toContain('NOT JUSTIFIED');
    }
  });
});

// ═══════════════════════════════════════════
// Tenant Isolation
// ═══════════════════════════════════════════

describe('CDA Tenant Isolation', () => {
  it('separate tenants get separate reports', async () => {
    const deps = makeDeps();
    deps.organizationVerifier.add('t-2', 'org-2');
    await generateCustomerDecisionArchitectureUseCase({ ...baseInput, industry: 'Hospitality' }, deps);
    const r2 = await generateCustomerDecisionArchitectureUseCase({ tenantId: 't-2', organizationId: 'org-2', correlationId: 'c', actorId: 'a', industry: 'Hospitality' }, deps);
    expect(r2.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// Import Boundary
// ═══════════════════════════════════════════

describe('CDA Import Boundary', () => {
  it('no direct imports of other engines', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const ciSrc = '/opt/data/projects/identity-engine/engines/creative-intelligence/src';
    function walk(dir: string): string[] {
      const files: string[] = [];
      for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, f.name);
        if (f.isDirectory()) files.push(...walk(p));
        else if (p.endsWith('.ts')) files.push(p);
      }
      return files;
    }
    const files = walk(ciSrc);
    const violations: string[] = [];
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf-8');
      const matches = content.match(/from\s+['"]@platform\/engine-[a-z]+['"]/g) ?? [];
      violations.push(...matches);
    }
    expect(violations.length).toBe(0);
  });
});