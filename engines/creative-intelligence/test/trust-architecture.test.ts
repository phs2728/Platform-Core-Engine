/**
 * Creative Intelligence RC3 — Trust Architecture Tests
 *
 * Platform Vision v2 검증:
 * 1. 5 Industries (Restaurant/Hotel/Travel/Hospital/SaaS) Trust Profile
 * 2. 7 신규 산출물 (Trust Architecture Report 등)
 * 3. 점수 표시 금지 (validateTrustUIPattern)
 * 4. Industry별 Trust Evidence 매핑
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { makeDeps, baseInput, unwrap } from './helpers.js';
import {
  generateTrustArchitectureReportUseCase,
  generateCustomerPsychologyReportUseCase,
  generateEvidencePlacementStrategyUseCase,
  generateObjectionMapUseCase,
  generateConfidenceJourneyUseCase,
  generateDecisionJourneyUseCase,
  generateTrustChecklistUseCase,
  getIndustryTrustProfileUseCase,
  INDUSTRY_TRUST_PROFILES,
} from '../src/index.js';
import { validateTrustUIPattern } from '@platform/core-sdk';

type Deps = ReturnType<typeof makeDeps>;

// ═══════════════════════════════════════════
// INDUSTRY TRUST PROFILES (5 industries)
// ═══════════════════════════════════════════

describe('Industry Trust Profiles (5 Industries)', () => {
  it('Restaurant: 실제 음식 사진, 셰프, 리뷰, 예약, 위치 등 8개 evidence', () => {
    const profile = INDUSTRY_TRUST_PROFILES.Restaurant;
    expect(profile.requiredEvidence.length).toBe(8);
    expect(profile.requiredEvidence.some(e => e.id === 'r-photos')).toBe(true);
    expect(profile.requiredEvidence.some(e => e.id === 'r-reviews')).toBe(true);
    expect(profile.requiredEvidence.some(e => e.id === 'r-reservation')).toBe(true);
  });

  it('Hotel: 실제 객실, Booking Reviews, Awards, Best Price 등 9개 evidence', () => {
    const profile = INDUSTRY_TRUST_PROFILES.Hotel;
    expect(profile.requiredEvidence.length).toBe(9);
    expect(profile.requiredEvidence.some(e => e.id === 'h-rooms')).toBe(true);
    expect(profile.requiredEvidence.some(e => e.id === 'h-booking-reviews')).toBe(true);
    expect(profile.requiredEvidence.some(e => e.id === 'h-best-price')).toBe(true);
  });

  it('Travel: 현지 운영, 실제 가이드, 투어 사진, 긴급 연락 등 8개 evidence', () => {
    const profile = INDUSTRY_TRUST_PROFILES.Travel;
    expect(profile.requiredEvidence.length).toBe(8);
    expect(profile.requiredEvidence.some(e => e.id === 't-local')).toBe(true);
    expect(profile.requiredEvidence.some(e => e.id === 't-guide')).toBe(true);
    expect(profile.requiredEvidence.some(e => e.id === 't-emergency')).toBe(true);
  });

  it('Hospital: 의사, 학회, 경력, 인증 등 7개 evidence', () => {
    const profile = INDUSTRY_TRUST_PROFILES.Hospital;
    expect(profile.requiredEvidence.length).toBe(7);
    expect(profile.requiredEvidence.some(e => e.id === 'm-doctor')).toBe(true);
    expect(profile.requiredEvidence.some(e => e.id === 'm-cert')).toBe(true);
  });

  it('SaaS: Enterprise, SOC2, 99.99% 등 8개 evidence', () => {
    const profile = INDUSTRY_TRUST_PROFILES.SaaS;
    expect(profile.requiredEvidence.length).toBe(8);
    expect(profile.requiredEvidence.some(e => e.id === 's-enterprise')).toBe(true);
    expect(profile.requiredEvidence.some(e => e.id === 's-soc2')).toBe(true);
    expect(profile.requiredEvidence.some(e => e.id === 's-uptime')).toBe(true);
  });

  it('All industries have topSignals', () => {
    const industries = Object.keys(INDUSTRY_TRUST_PROFILES) as Array<keyof typeof INDUSTRY_TRUST_PROFILES>;
    for (const ind of industries) {
      expect(INDUSTRY_TRUST_PROFILES[ind].topSignals.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════
// 7 신규 산출물 (Trust Architecture UCs)
// ═══════════════════════════════════════════

describe('7 Trust Architecture Deliverables', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('1. Trust Architecture Report', async () => {
    const r = await generateTrustArchitectureReportUseCase({
      ...baseInput, industry: 'Restaurant', existingPageRefs: ['hero', 'menu'],
    }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Real photos are in 'menu' but reviews in 'hero-secondary' (not placed)
      expect(r.value.coverage).toBeGreaterThan(0);
    }
  });

  it('2. Customer Psychology Report (5 stages)', async () => {
    const r = await generateCustomerPsychologyReportUseCase({ ...baseInput, industry: 'Hotel' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.stageCount).toBe(5); // Anxiety→Discovery→Evaluation→Confidence→Action
  });

  it('3. Evidence Placement Strategy', async () => {
    const r = await generateEvidencePlacementStrategyUseCase({
      ...baseInput, industry: 'Restaurant', pageRef: 'hero',
    }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.placementCount).toBeGreaterThan(0);
  });

  it('4. Objection Map', async () => {
    const r = await generateObjectionMapUseCase({ ...baseInput, industry: 'Hospital' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.objectionCount).toBeGreaterThan(0);
  });

  it('5. Confidence Journey', async () => {
    const r = await generateConfidenceJourneyUseCase({
      ...baseInput, industry: 'SaaS', pageRef: 'footer',
    }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.totalGain).toBeGreaterThan(0);
  });

  it('6. Decision Journey (5 steps)', async () => {
    const r = await generateDecisionJourneyUseCase({
      ...baseInput, industry: 'Travel', pageRef: 'tours',
    }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.steps).toBe(5);
  });

  it('7. Trust Checklist', async () => {
    const r = await generateTrustChecklistUseCase({
      ...baseInput, industry: 'Hotel', pageRef: 'home',
      placedEvidence: ['h-rooms', 'h-booking-reviews', 'h-official'],
    }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.passed).toBe(3);
      expect(r.value.failed).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════
// 점수 표시 금지 (V2 Vision Enforcement)
// ═══════════════════════════════════════════

describe('점수 표시 금지 (Platform Vision v2)', () => {
  it('"Trust Score" is forbidden', () => {
    expect(validateTrustUIPattern('Trust Score')).toBe(false);
  });

  it('"Premium Score" is forbidden', () => {
    expect(validateTrustUIPattern('Premium Score')).toBe(false);
  });

  it('"Luxury Score" is forbidden', () => {
    expect(validateTrustUIPattern('Luxury Score')).toBe(false);
  });

  it('"95/100" is forbidden', () => {
    expect(validateTrustUIPattern('Premium: 95/100')).toBe(false);
  });

  it('"AI Score" is forbidden', () => {
    expect(validateTrustUIPattern('AI Score')).toBe(false);
  });

  it('"Company Score" is forbidden', () => {
    expect(validateTrustUIPattern('Company Score')).toBe(false);
  });

  it('"신뢰할 수 있는 회사" is allowed', () => {
    expect(validateTrustUIPattern('신뢰할 수 있는 회사')).toBe(true);
  });

  it('"이 회사를 믿게 만드는 핵심 요소" is allowed', () => {
    expect(validateTrustUIPattern('이 회사를 믿게 만드는 핵심 요소')).toBe(true);
  });

  it('empty string is allowed', () => {
    expect(validateTrustUIPattern('')).toBe(true);
  });
});

// ═══════════════════════════════════════════
// Get Industry Trust Profile
// ═══════════════════════════════════════════

describe('getIndustryTrustProfile', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('returns Restaurant profile', async () => {
    const r = await getIndustryTrustProfileUseCase({ industry: 'Restaurant' }, deps);
    if (r.ok) {
      expect(r.value.industry).toBe('Restaurant');
      expect(r.value.evidenceCount).toBe(8);
    }
  });

  it('returns Hotel profile', async () => {
    const r = await getIndustryTrustProfileUseCase({ industry: 'Hotel' }, deps);
    if (r.ok) expect(r.value.evidenceCount).toBe(9);
  });

  it('rejects invalid input', async () => {
    const r = await getIndustryTrustProfileUseCase({ industry: '' as 'Restaurant' }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// Customer Psychology Pathway (RC3 핵심)
// ═══════════════════════════════════════════

describe('Customer Psychology Pathway (5 stages)', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('모든 산업이 5단계 pathway를 가짐', async () => {
    const industries: Array<'Restaurant' | 'Hotel' | 'Travel' | 'Hospital' | 'SaaS'> = ['Restaurant', 'Hotel', 'Travel', 'Hospital', 'SaaS'];
    for (const ind of industries) {
      const r = await generateCustomerPsychologyReportUseCase({ ...baseInput, industry: ind }, deps);
      if (r.ok) expect(r.value.stageCount).toBe(5);
    }
  });
});

// ═══════════════════════════════════════════
// Trust Checklist Coverage (RC3 핵심)
// ═══════════════════════════════════════════

describe('Trust Checklist Coverage', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('모든 evidence가 배치된 경우 → 100% Pass', async () => {
    const profile = INDUSTRY_TRUST_PROFILES.Hotel;
    const allEvidence = profile.requiredEvidence.map(e => e.id);
    const r = await generateTrustChecklistUseCase({
      ...baseInput, industry: 'Hotel', pageRef: 'home', placedEvidence: allEvidence,
    }, deps);
    if (r.ok) {
      expect(r.value.passed).toBe(allEvidence.length);
      expect(r.value.failed).toBe(0);
    }
  });

  it('evidence 0개 배치된 경우 → priority 1 모두 fail', async () => {
    const r = await generateTrustChecklistUseCase({
      ...baseInput, industry: 'Restaurant', pageRef: 'home', placedEvidence: [],
    }, deps);
    if (r.ok) {
      expect(r.value.failed).toBeGreaterThan(0);
      expect(r.value.passed).toBe(0);
    }
  });
});