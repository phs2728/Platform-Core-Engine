/**
 * Customer Decision Architecture (CDA) — Platform Vision RC3.1
 *
 * 사장님 확립 2026-07-13
 * "Platform은 웹사이트를 만드는 시스템이 아니라, 사람의 의사결정을 설계하는 시스템이다."
 *
 * 11대 Framework + Customer Question Model (CQM)
 */

import type { IndustryType, TrustEvidence } from './trust-architecture.js';

// ═══════════════════════════════════════════
// 9-Stage Customer Journey (산업 공통)
// ═══════════════════════════════════════════

export type JourneyStage = 'Problem' | 'Discovery' | 'Comparison' | 'Evaluation' | 'Trust' | 'Decision' | 'Action' | 'Experience' | 'Loyalty' | 'Advocacy';

export const JOURNEY_STAGES: JourneyStage[] = ['Problem', 'Discovery', 'Comparison', 'Evaluation', 'Trust', 'Decision', 'Action', 'Experience', 'Loyalty', 'Advocacy'];

// ═══════════════════════════════════════════
// Framework 1+2. Customer Journey + Customer Psychology
// ═══════════════════════════════════════════

export interface JourneyStep {
  stage: JourneyStage;
  goal: string;
  question: string;       // 이 단계에서 고객이 가장 궁금해할 것
  objection: string;     // 이 단계에서 고객의 우려
  evidence: string;       // 이 단계를 위한 trust evidence
  decisionTrigger: string;  // 이 단계에서 다음 단계로 가는 trigger
  nextAction: string;     // 다음 단계로의 행동
}

// ═══════════════════════════════════════════
// Framework 3. Objection Library
// ═══════════════════════════════════════════

export type ObjectionSeverity = 'Critical' | 'Major' | 'Minor' | 'Latent';
export type ObjectionType = 'Risk' | 'Fear' | 'Confusion' | 'Comparison' | 'Cost' | 'Expectation' | 'Support';

export interface Objection {
  id: string;
  industry: string;        // IndustryType (V2) or IndustryBlueprint (RC3.1) — string union
  text: string;
  type: ObjectionType;
  severity: ObjectionSeverity;
  /** 이 우려를 해소하는 evidence ID (TrustEvidence.id) */
  resolvedBy: string[];
}

// ═══════════════════════════════════════════
// Framework 4. Trust Evidence Placement
// ═══════════════════════════════════════════

export type PlacementStrategy = 'hero-above-fold' | 'hero-secondary' | 'section-mid' | 'before-cta' | 'footer' | 'sidebar' | 'modal' | 'inline';

export interface EvidencePlacementSpec {
  evidenceId: string;
  pageRef: string;
  placement: PlacementStrategy;
  sequence: number;        // 배치 순서 (낮을수록 위)
  rationale: string;
}

// ═══════════════════════════════════════════
// Framework 5+10. Detail Strategy Library + Industry Detail Blueprint (12개 산업)
// ═══════════════════════════════════════════

export type IndustryBlueprint =
  | 'Hospitality' | 'Restaurant' | 'Travel' | 'Marketplace' | 'Retail' | 'Medical'
  | 'Education' | 'RealEstate' | 'SaaS' | 'NGO' | 'Church' | 'Government';

export interface SectionBlueprint {
  order: number;
  name: string;          // e.g., 'Hero', 'TrustEvidence', 'FAQ', 'CTA'
  purpose: string;       // 심리적 목적
  required: boolean;
  /** CQM: 이 섹션이 답하는 customer question */
  answersQuestion: string;
  /** Placement strategy */
  placement: PlacementStrategy;
}

export interface IndustryDetailBlueprint {
  industry: IndustryBlueprint;
  pageType: 'Home' | 'Detail' | 'Booking' | 'About' | 'Pricing' | 'FAQ' | 'Contact';
  sectionOrder: SectionBlueprint[];
  storyFlow: string;        // Emotion → Evidence → Trust → Decision → Action
  evidenceOrder: string[];  // 우선순위 순 evidence IDs
  faqTopics: string[];      // FAQ topics
  primaryCta: string;       // 주요 CTA
  socialProofTypes: string[];
  galleryStrategy: string;
  objectionPriority: string[]; // 우선 해소할 objection IDs
  comparisonStrategy?: string;
  relatedItemsStrategy?: string;
  crossSellStrategy?: string;
  upsellStrategy?: string;
}

// ═══════════════════════════════════════════
// Framework 6. FAQ Strategy (Decision Accelerator)
// ═══════════════════════════════════════════

export type FAQCategory = 'Risk' | 'Fear' | 'Confusion' | 'Comparison' | 'Cost' | 'Expectation' | 'Support';

export interface FAQItem {
  id: string;
  question: string;
  category: FAQCategory;
  /** 이 FAQ가 답하는 customer question (CQM) */
  customerQuestion: string;
  /** 이 FAQ가 해소하는 objection ID */
  resolvesObjection: string;
  /** Decision Accelerator: 이 FAQ로 인해 다음 단계로 가는 trigger */
  decisionAccelerator: string;
  priority: number;        // 1=critical
  draftAnswer: string;
}

// ═══════════════════════════════════════════
// Framework 7. AI Concierge Framework
// ═══════════════════════════════════════════

export type ConciergeTrigger = 'page-load' | 'scroll-50' | 'time-on-page' | 'exit-intent' | 'cta-hover' | 'pricing-view';

export interface ConciergeContext {
  currentPage: string;
  currentJourneyStage: JourneyStage;
  detectedBehavior: string[];
  detectedInterests: string[];
  detectedObjections: string[];
}

export interface ConciergeRecommendation {
  id: string;
  context: ConciergeContext;
  message: string;          // "3명이시군요. Dormitory와 Private 비교해 드릴까요?"
  /** 이 추천이 해결하는 customer question (CQM) */
  answersQuestion: string;
  /** 이 추천이 해소하는 objection */
  resolvesObjection?: string;
  /** Next best action 추천 */
  nextBestAction: string;
  trigger: ConciergeTrigger;
}

// ═══════════════════════════════════════════
// Framework 8. Social Proof Architecture
// ═══════════════════════════════════════════

export type SocialProofType =
  | 'Review' | 'Award' | 'Media' | 'Partner' | 'GuestStory' | 'Instagram' | 'YouTube'
  | 'Google' | 'TripAdvisor' | 'Booking' | 'Community' | 'Press' | 'Certification';

export interface SocialProofAsset {
  id: string;
  type: SocialProofType;
  /** 이 asset이 답하는 customer question (CQM) */
  answersQuestion: string;
  priority: number;
  placement: PlacementStrategy;
}

// ═══════════════════════════════════════════
// Framework 9. Story Architecture
// ═══════════════════════════════════════════

export type StoryStage = 'Emotion' | 'Evidence' | 'Trust' | 'Decision' | 'Action';

export interface StoryArchitecture {
  id: string;
  pageRef: string;
  stages: { stage: StoryStage; content: string; transition: string }[];
  flow: string;  // Emotion → Evidence → Trust → Decision → Action
  /** Story가 답하는 customer question sequence (CQM) */
  questionSequence: string[];
}

// ═══════════════════════════════════════════
// Framework 11. Customer Question Model (CQM) ⭐ 사장님 추가
// ═══════════════════════════════════════════

export type QuestionPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export interface CustomerQuestion {
  id: string;
  pageRef: string;
  question: string;             // "안전한가?"
  priority: QuestionPriority;
  /** 이 질문을 답하는 section/evidence */
  answeredBy?: { sectionName: string; evidenceIds: string[] };
  /** 이 질문을 답하기 위해 필요한 social proof */
  requiredProof?: SocialProofType[];
  /** 이 질문이 어느 Journey stage에 속하는지 */
  journeyStage: JourneyStage;
}

export interface CustomerQuestionModel {
  pageRef: string;
  questions: CustomerQuestion[];
  /** Question Sequence (답할 순서) */
  questionSequence: string[];
  /** 모든 critical question이 다 답해졌는지 */
  coverage: number;
}

// ═══════════════════════════════════════════
// 11대 신규 산출물 (Reports)
// ═══════════════════════════════════════════

export interface CustomerDecisionArchitectureReport {
  id: string;
  tenantId: string;
  organizationId: string;
  industry: IndustryBlueprint;
  journeySteps: JourneyStep[];
  totalQuestions: number;
  criticalQuestionsCovered: number;
  createdAt: string;
}

export interface DecisionJourneyReport {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  stages: { stage: JourneyStage; question: string; evidence: string; nextAction: string }[];
  createdAt: string;
}

export interface DetailStrategyReport {
  id: string;
  tenantId: string;
  organizationId: string;
  industry: IndustryBlueprint;
  pageType: IndustryDetailBlueprint['pageType'];
  blueprint: IndustryDetailBlueprint;
  createdAt: string;
}

export interface TrustEvidencePlacementReport {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  placements: EvidencePlacementSpec[];
  sequenceCount: number;
  createdAt: string;
}

export interface ObjectionLibraryReport {
  id: string;
  tenantId: string;
  organizationId: string;
  industry: IndustryBlueprint;
  objections: Objection[];
  criticalCount: number;
  majorCount: number;
  createdAt: string;
}

export interface FAQStrategyReport {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  faqs: FAQItem[];
  categoryCounts: Record<FAQCategory, number>;
  createdAt: string;
}

export interface AIConciergeStrategy {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  recommendations: ConciergeRecommendation[];
  createdAt: string;
}

export interface SocialProofStrategy {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  assets: SocialProofAsset[];
  createdAt: string;
}

export interface StoryArchitectureReport {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  stories: StoryArchitecture[];
  createdAt: string;
}

export interface IndustryDetailBlueprintEntity {
  id: string;
  tenantId: string;
  organizationId: string;
  industry: IndustryBlueprint;
  pageType: IndustryDetailBlueprint['pageType'];
  blueprint: IndustryDetailBlueprint;
  createdAt: string;
}

export interface CustomerQuestionModelReport {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  model: CustomerQuestionModel;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Platform First Principle
// ═══════════════════════════════════════════

/**
 * Every section must earn its place.
 * If a section does not answer a customer question,
 * remove a fear, build trust, or move the customer to the next decision,
 * it should not exist.
 */
export const PLATFORM_FIRST_PRINCIPLE = `Every section must earn its place. If a section does not answer a customer question, remove a fear, build trust, or move the customer to the next decision, it should not exist.`;

/**
 * Section justification — 이 section이 존재할 수 있는지 검증
 * - answersQuestion: 고객 질문에 답하는가
 * - removesFear: 두려움을 제거하는가
 * - buildsTrust: 신뢰를 구축하는가
 * - movesToNextDecision: 다음 결정으로 이동시키는가
 *
 * 4개 중 하나라도 true여야 section 존재 가능
 */
export interface SectionJustification {
  sectionName: string;
  answersQuestion: boolean;
  removesFear: boolean;
  buildsTrust: boolean;
  movesToNextDecision: boolean;
  justifies: boolean;  // 4개 중 1개 이상 true
}

export function validateSectionExistence(j: SectionJustification): boolean {
  return j.answersQuestion || j.removesFear || j.buildsTrust || j.movesToNextDecision;
}

// ═══════════════════════════════════════════
// Forbidden: Website Builder terminology
// ═══════════════════════════════════════════

export const FORBIDDEN_V2_TERMS = [
  'Website Builder',
  'Page Builder',
  'AI Website Generator',
] as const;

export function validatePlatformTerminology(term: string): boolean {
  return !FORBIDDEN_V2_TERMS.some(forbidden => term.toLowerCase().includes(forbidden.toLowerCase()));
}