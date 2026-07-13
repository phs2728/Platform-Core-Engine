/**
 * Creative Intelligence RC3.1 — Customer Decision Architecture (CDA) Use Cases
 *
 * 11대 Framework + Customer Question Model (CQM) — 사장님 Platform Vision RC3.1
 *
 * 12개 산업 Detail Blueprint
 * 12개 산업 Objection Library
 * 12개 산업 Customer Question Model
 * 12개 Page Type (Home/Detail/Booking/About/Pricing/FAQ/Contact) × 12개 산업
 *
 * UseCases (12):
 *  1. generateCustomerDecisionArchitectureUseCase (CDA 통합)
 *  2. generateDecisionJourneyUseCase
 *  3. generateDetailStrategyUseCase
 *  4. generateTrustEvidencePlacementUseCase
 *  5. generateObjectionLibraryUseCase
 *  6. generateFAQStrategyUseCase (Decision Accelerator)
 *  7. generateAIConciergeStrategyUseCase
 *  8. generateSocialProofStrategyUseCase
 *  9. generateStoryArchitectureUseCase
 * 10. generateIndustryDetailBlueprintUseCase
 * 11. generateCustomerQuestionModelUseCase (CQM, 사장님 추가)
 * 12. validateSectionExistenceUseCase (Platform First Principle)
 */
import { Ok, Err, type Result, ValidationError, z } from '@platform/core-sdk';
import { CREATIVE_EVENTS, CREATIVE_EVENT_SCHEMAS } from '../domain/events.js';
import { envelope, auditLog, now } from './helpers.js';
import type { CreativeUseCaseDeps } from './types.js';
import {
  INDUSTRY_DETAIL_BLUEPRINTS, OBJECTION_LIBRARIES,
  generateCustomerQuestions, generateQuestionSequence, JOURNEY_STEPS,
} from '../infrastructure/hostAdapters.js';
import type {
  IndustryBlueprint, IndustryDetailBlueprint, SectionJustification,
  CustomerQuestionModel, Objection, FAQItem, ConciergeRecommendation,
  SocialProofAsset, StoryArchitecture, CustomerDecisionArchitectureReport,
  DecisionJourneyReport, DetailStrategyReport, TrustEvidencePlacementReport,
  ObjectionLibraryReport, FAQStrategyReport, AIConciergeStrategy,
  SocialProofStrategy, StoryArchitectureReport, IndustryDetailBlueprintEntity,
  CustomerQuestionModelReport,
} from '../interfaces/index.js';

const baseInput = {
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  organizationId: z.string().min(1),
};
const industrySchema = z.enum(['Hospitality', 'Restaurant', 'Travel', 'Marketplace', 'Retail', 'Medical', 'Education', 'RealEstate', 'SaaS', 'NGO', 'Church', 'Government']);
const pageTypeSchema = z.enum(['Home', 'Detail', 'Booking', 'About', 'Pricing', 'FAQ', 'Contact']);

// ═══════════════════════════════════════════
// 1. Customer Decision Architecture Report (CDA 통합)
// ═══════════════════════════════════════════

export async function generateCustomerDecisionArchitectureUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; organizationId: string; industry: IndustryBlueprint; pageRef?: string },
  deps: CreativeUseCaseDeps,
): Promise<Result<{ reportId: string; journeySteps: number; blueprintSections: number; objectionCount: number }, ValidationError>> {
  const parsed = z.object({ ...baseInput, industry: industrySchema, pageRef: z.string().optional() }).safeParse(input);
  if (!parsed.success) return Err(new ValidationError('Invalid input'));
  const d = parsed.data;
  const blueprint = INDUSTRY_DETAIL_BLUEPRINTS[d.industry];
  const objections = OBJECTION_LIBRARIES[d.industry];
  const id = deps.idGenerator.generate();
  const report: CustomerDecisionArchitectureReport = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, industry: d.industry,
    journeySteps: JOURNEY_STEPS,
    totalQuestions: blueprint.faqTopics.length,
    criticalQuestionsCovered: blueprint.sectionOrder.filter(s => s.answersQuestion).length,
    createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, 'ci.cda.report_generated', CREATIVE_EVENT_SCHEMAS['ci.art_direction.created'], { reportId: id, industry: d.industry }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'art_direction_created', { type: 'cda_report' }, id);
  return Ok({ reportId: id, journeySteps: JOURNEY_STEPS.length, blueprintSections: blueprint.sectionOrder.length, objectionCount: objections.length });
}

// ═══════════════════════════════════════════
// 2. Decision Journey Report
// ═══════════════════════════════════════════

export async function generateDecisionJourneyUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; organizationId: string; industry: IndustryBlueprint },
  deps: CreativeUseCaseDeps,
): Promise<Result<{ journeyId: string; stageCount: number }, ValidationError>> {
  const parsed = z.object({ ...baseInput, industry: industrySchema }).safeParse(input);
  if (!parsed.success) return Err(new ValidationError('Invalid input'));
  const d = parsed.data;
  const id = deps.idGenerator.generate();
  const blueprint = INDUSTRY_DETAIL_BLUEPRINTS[d.industry];
  const stages = JOURNEY_STEPS.map(s => ({
    stage: s.stage, question: s.question, evidence: s.evidence, nextAction: s.nextAction,
  }));
  const report: DecisionJourneyReport = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: 'journey',
    stages, createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, 'ci.decision_journey.generated', CREATIVE_EVENT_SCHEMAS['ci.art_direction.created'], { journeyId: id }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'art_direction_created', { type: 'decision_journey' }, id);
  return Ok({ journeyId: id, stageCount: stages.length });
}

// ═══════════════════════════════════════════
// 3. Detail Strategy Report
// ═══════════════════════════════════════════

export async function generateDetailStrategyUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; organizationId: string; industry: IndustryBlueprint; pageType: IndustryDetailBlueprint['pageType'] },
  deps: CreativeUseCaseDeps,
): Promise<Result<{ strategyId: string; sectionCount: number; primaryCta: string }, ValidationError>> {
  const parsed = z.object({ ...baseInput, industry: industrySchema, pageType: pageTypeSchema }).safeParse(input);
  if (!parsed.success) return Err(new ValidationError('Invalid input'));
  const d = parsed.data;
  const blueprint = INDUSTRY_DETAIL_BLUEPRINTS[d.industry];
  const id = deps.idGenerator.generate();
  const report: DetailStrategyReport = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, industry: d.industry, pageType: d.pageType, blueprint,
    createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, 'ci.detail_strategy.generated', CREATIVE_EVENT_SCHEMAS['ci.art_direction.created'], { strategyId: id }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'art_direction_created', { type: 'detail_strategy' }, id);
  return Ok({ strategyId: id, sectionCount: blueprint.sectionOrder.length, primaryCta: blueprint.primaryCta });
}

// ═══════════════════════════════════════════
// 4. Trust Evidence Placement Report
// ═══════════════════════════════════════════

export async function generateTrustEvidencePlacementUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; organizationId: string; industry: IndustryBlueprint; pageRef: string },
  deps: CreativeUseCaseDeps,
): Promise<Result<{ reportId: string; sequenceCount: number }, ValidationError>> {
  const parsed = z.object({ ...baseInput, industry: industrySchema, pageRef: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return Err(new ValidationError('Invalid input'));
  const d = parsed.data;
  const blueprint = INDUSTRY_DETAIL_BLUEPRINTS[d.industry];
  const id = deps.idGenerator.generate();
  const placements = blueprint.evidenceOrder.map((eid, idx) => ({
    evidenceId: eid, pageRef: d.pageRef, placement: idx === 0 ? 'hero-above-fold' as const : idx < 2 ? 'hero-secondary' as const : idx < 4 ? 'section-mid' as const : 'before-cta' as const,
    sequence: idx + 1, rationale: `${idx + 1}순위로 배치 — 우선순위 기반`,
  }));
  const report: TrustEvidencePlacementReport = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: d.pageRef, placements, sequenceCount: placements.length,
    createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, 'ci.evidence_placement.report_generated', CREATIVE_EVENT_SCHEMAS['ci.art_direction.created'], { reportId: id }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'art_direction_created', { type: 'evidence_placement_report' }, id);
  return Ok({ reportId: id, sequenceCount: placements.length });
}

// ═══════════════════════════════════════════
// 5. Objection Library Report
// ═══════════════════════════════════════════

export async function generateObjectionLibraryUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; organizationId: string; industry: IndustryBlueprint },
  deps: CreativeUseCaseDeps,
): Promise<Result<{ reportId: string; criticalCount: number; majorCount: number; total: number }, ValidationError>> {
  const parsed = z.object({ ...baseInput, industry: industrySchema }).safeParse(input);
  if (!parsed.success) return Err(new ValidationError('Invalid input'));
  const d = parsed.data;
  const objections = OBJECTION_LIBRARIES[d.industry];
  const id = deps.idGenerator.generate();
  const report: ObjectionLibraryReport = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, industry: d.industry, objections,
    criticalCount: objections.filter(o => o.severity === 'Critical').length,
    majorCount: objections.filter(o => o.severity === 'Major').length,
    createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, 'ci.objection_library.report_generated', CREATIVE_EVENT_SCHEMAS['ci.art_direction.created'], { reportId: id }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'art_direction_created', { type: 'objection_library_report' }, id);
  return Ok({ reportId: id, criticalCount: report.criticalCount, majorCount: report.majorCount, total: objections.length });
}

// ═══════════════════════════════════════════
// 6. FAQ Strategy Report (Decision Accelerator)
// ═══════════════════════════════════════════

export async function generateFAQStrategyUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; organizationId: string; industry: IndustryBlueprint },
  deps: CreativeUseCaseDeps,
): Promise<Result<{ reportId: string; faqCount: number; categoryCount: number }, ValidationError>> {
  const parsed = z.object({ ...baseInput, industry: industrySchema }).safeParse(input);
  if (!parsed.success) return Err(new ValidationError('Invalid input'));
  const d = parsed.data;
  const blueprint = INDUSTRY_DETAIL_BLUEPRINTS[d.industry];
  const objections = OBJECTION_LIBRARIES[d.industry];
  const id = deps.idGenerator.generate();
  // FAQ: 각 objection마다 1개 FAQ = Decision Accelerator
  const faqs: FAQItem[] = objections.map((o, idx) => ({
    id: `faq-${o.id}`,
    question: o.text,
    category: o.type as FAQItem['category'],
    customerQuestion: o.text,
    resolvesObjection: o.id,
    decisionAccelerator: `${o.text} 해소 → ${blueprint.primaryCta}로 진행`,
    priority: o.severity === 'Critical' ? 1 : o.severity === 'Major' ? 2 : 3,
    draftAnswer: `${o.text}에 대한 답변 (${o.resolvedBy.length}개 evidence 기반)`,
  }));
  const categoryCount = new Set(faqs.map(f => f.category)).size;
  const categoryCounts = faqs.reduce((acc, f) => {
    acc[f.category] = (acc[f.category] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const report: FAQStrategyReport = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: 'faq', faqs,
    categoryCounts: categoryCounts as FAQStrategyReport['categoryCounts'],
    createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, 'ci.faq_strategy.report_generated', CREATIVE_EVENT_SCHEMAS['ci.art_direction.created'], { reportId: id }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'art_direction_created', { type: 'faq_strategy_report' }, id);
  return Ok({ reportId: id, faqCount: faqs.length, categoryCount });
}

// ═══════════════════════════════════════════
// 7. AI Concierge Strategy
// ═══════════════════════════════════════════

export async function generateAIConciergeStrategyUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; organizationId: string; industry: IndustryBlueprint; pageRef: string; context?: { detectedInterests?: string[] } },
  deps: CreativeUseCaseDeps,
): Promise<Result<{ reportId: string; recommendationCount: number }, ValidationError>> {
  const parsed = z.object({ ...baseInput, industry: industrySchema, pageRef: z.string().min(1), context: z.object({ detectedInterests: z.array(z.string()).optional() }).optional() }).safeParse(input);
  if (!parsed.success) return Err(new ValidationError('Invalid input'));
  const d = parsed.data;
  const blueprint = INDUSTRY_DETAIL_BLUEPRINTS[d.industry];
  const objections = OBJECTION_LIBRARIES[d.industry];
  const id = deps.idGenerator.generate();
  // AI Concierge: 각 critical objection마다 1개 recommendation
  const criticalObjections = objections.filter(o => o.severity === 'Critical' || o.severity === 'Major').slice(0, 3);
  const recommendations: ConciergeRecommendation[] = criticalObjections.map((o, idx) => ({
    id: `concierge-${o.id}`,
    context: {
      currentPage: d.pageRef, currentJourneyStage: 'Evaluation' as never,
      detectedBehavior: ['scroll-50'], detectedInterests: d.context?.detectedInterests ?? [],
      detectedObjections: [o.id],
    },
    message: `${o.text}에 대해 ${o.resolvedBy[0] ?? 'evidence'}를 보여드릴까요?`,
    answersQuestion: o.text, resolvesObjection: o.id,
    nextBestAction: blueprint.primaryCta,
    trigger: 'scroll-50' as never,
  }));
  const report: AIConciergeStrategy = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: d.pageRef, recommendations, createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, 'ci.concierge.strategy_generated', CREATIVE_EVENT_SCHEMAS['ci.art_direction.created'], { reportId: id }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'art_direction_created', { type: 'concierge_strategy' }, id);
  return Ok({ reportId: id, recommendationCount: recommendations.length });
}

// ═══════════════════════════════════════════
// 8. Social Proof Strategy
// ═══════════════════════════════════════════

export async function generateSocialProofStrategyUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; organizationId: string; industry: IndustryBlueprint; pageRef: string },
  deps: CreativeUseCaseDeps,
): Promise<Result<{ reportId: string; assetCount: number }, ValidationError>> {
  const parsed = z.object({ ...baseInput, industry: industrySchema, pageRef: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return Err(new ValidationError('Invalid input'));
  const d = parsed.data;
  const blueprint = INDUSTRY_DETAIL_BLUEPRINTS[d.industry];
  const id = deps.idGenerator.generate();
  const assets: SocialProofAsset[] = blueprint.socialProofTypes.map((type, idx) => ({
    id: `sp-${type.toLowerCase()}`,
    type: type as SocialProofAsset['type'],
    answersQuestion: `${type} 증거는?`,
    priority: idx + 1, placement: idx === 0 ? 'hero-above-fold' as const : 'hero-secondary' as const,
  }));
  const report: SocialProofStrategy = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: d.pageRef, assets, createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, 'ci.social_proof.strategy_generated', CREATIVE_EVENT_SCHEMAS['ci.art_direction.created'], { reportId: id }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'art_direction_created', { type: 'social_proof_strategy' }, id);
  return Ok({ reportId: id, assetCount: assets.length });
}

// ═══════════════════════════════════════════
// 9. Story Architecture Report
// ═══════════════════════════════════════════

export async function generateStoryArchitectureUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; organizationId: string; industry: IndustryBlueprint; pageRef: string },
  deps: CreativeUseCaseDeps,
): Promise<Result<{ reportId: string; storyCount: number }, ValidationError>> {
  const parsed = z.object({ ...baseInput, industry: industrySchema, pageRef: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return Err(new ValidationError('Invalid input'));
  const d = parsed.data;
  const blueprint = INDUSTRY_DETAIL_BLUEPRINTS[d.industry];
  const id = deps.idGenerator.generate();
  const stories: StoryArchitecture[] = [{
    id: `story-${d.pageRef}`,
    pageRef: d.pageRef,
    stages: [
      { stage: 'Emotion', content: '고객이 공감하는 감정 (불안/기대)', transition: '이 회사를 믿을 수 있는가?' },
      { stage: 'Evidence', content: '구체적 증거 (사진/리뷰/인증)', transition: '실제로 작동하는가?' },
      { stage: 'Trust', content: '신뢰 형성 (사회적 증거)', transition: '믿을만하다' },
      { stage: 'Decision', content: '결정', transition: '지금 행동해야' },
      { stage: 'Action', content: `${blueprint.primaryCta}`, transition: '행동' },
    ],
    flow: blueprint.storyFlow,
    questionSequence: blueprint.sectionOrder.map(s => s.answersQuestion).filter(Boolean),
  }];
  const report: StoryArchitectureReport = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: d.pageRef, stories, createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, 'ci.story_architecture.generated', CREATIVE_EVENT_SCHEMAS['ci.art_direction.created'], { reportId: id }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'art_direction_created', { type: 'story_architecture' }, id);
  return Ok({ reportId: id, storyCount: stories.length });
}

// ═══════════════════════════════════════════
// 10. Industry Detail Blueprint (12개 산업 × 7개 pageType)
// ═══════════════════════════════════════════

export async function generateIndustryDetailBlueprintUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; organizationId: string; industry: IndustryBlueprint; pageType: IndustryDetailBlueprint['pageType'] },
  deps: CreativeUseCaseDeps,
): Promise<Result<{ blueprintId: string; sectionCount: number; evidenceCount: number; primaryCta: string }, ValidationError>> {
  const parsed = z.object({ ...baseInput, industry: industrySchema, pageType: pageTypeSchema }).safeParse(input);
  if (!parsed.success) return Err(new ValidationError('Invalid input'));
  const d = parsed.data;
  const blueprint = INDUSTRY_DETAIL_BLUEPRINTS[d.industry];
  const id = deps.idGenerator.generate();
  const entity: IndustryDetailBlueprintEntity = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, industry: d.industry, pageType: d.pageType, blueprint,
    createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, 'ci.industry_blueprint.generated', CREATIVE_EVENT_SCHEMAS['ci.art_direction.created'], { blueprintId: id }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'art_direction_created', { type: 'industry_blueprint' }, id);
  return Ok({ blueprintId: id, sectionCount: blueprint.sectionOrder.length, evidenceCount: blueprint.evidenceOrder.length, primaryCta: blueprint.primaryCta });
}

// ═══════════════════════════════════════════
// 11. Customer Question Model (CQM) ⭐ 사장님 추가
// ═══════════════════════════════════════════

export async function generateCustomerQuestionModelUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; organizationId: string; industry: IndustryBlueprint; pageType: IndustryDetailBlueprint['pageType'] },
  deps: CreativeUseCaseDeps,
): Promise<Result<{ modelId: string; questionCount: number; criticalCount: number; sequence: string[] }, ValidationError>> {
  const parsed = z.object({ ...baseInput, industry: industrySchema, pageType: pageTypeSchema }).safeParse(input);
  if (!parsed.success) return Err(new ValidationError('Invalid input'));
  const d = parsed.data;
  const questions = generateCustomerQuestions(d.pageType, d.industry);
  const sequence = generateQuestionSequence(questions);
  const id = deps.idGenerator.generate();
  const model: CustomerQuestionModel = {
    pageRef: d.pageType, questions, questionSequence: sequence,
    coverage: questions.filter(q => q.priority === 'Critical').length > 0 ? 100 : 0,
  };
  const report: CustomerQuestionModelReport = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: d.pageType, model, createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, 'ci.cqm.generated', CREATIVE_EVENT_SCHEMAS['ci.art_direction.created'], { modelId: id, questionCount: questions.length }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'art_direction_created', { type: 'cqm' }, id);
  const criticalCount = questions.filter(q => q.priority === 'Critical').length;
  return Ok({ modelId: id, questionCount: questions.length, criticalCount, sequence });
}

// ═══════════════════════════════════════════
// 12. Section Existence Validation (Platform First Principle)
// ═══════════════════════════════════════════

export async function validateSectionExistenceUseCase(
  input: { sectionName: string; answersQuestion: boolean; removesFear: boolean; buildsTrust: boolean; movesToNextDecision: boolean },
  _deps: CreativeUseCaseDeps,
): Promise<Result<{ justifies: boolean; reason: string }, ValidationError>> {
  if (!input.sectionName) return Err(new ValidationError('Section name required'));
  const j: SectionJustification = input as SectionJustification;
  const justifies = j.answersQuestion || j.removesFear || j.buildsTrust || j.movesToNextDecision;
  let reason = '';
  if (justifies) {
    const reasons: string[] = [];
    if (j.answersQuestion) reasons.push('customer question에 답함');
    if (j.removesFear) reasons.push('fear 제거');
    if (j.buildsTrust) reasons.push('trust 구축');
    if (j.movesToNextDecision) reasons.push('다음 결정으로 이동');
    reason = `✅ Justified: ${reasons.join(', ')}`;
  } else {
    reason = '❌ NOT JUSTIFIED — 이 section은 존재할 수 없습니다. (Platform First Principle)';
  }
  return Ok({ justifies, reason });
}

// ═══════════════════════════════════════════
// Query UseCases (Framework 조회)
// ═══════════════════════════════════════════

export async function getIndustryDetailBlueprintUseCase(
  input: { industry: IndustryBlueprint; pageType: IndustryDetailBlueprint['pageType'] }, _deps: CreativeUseCaseDeps,
): Promise<Result<{ industry: IndustryBlueprint; sectionCount: number; primaryCta: string }, ValidationError>> {
  if (!input.industry) return Err(new ValidationError('Industry required'));
  const blueprint = INDUSTRY_DETAIL_BLUEPRINTS[input.industry];
  if (!blueprint) return Err(new ValidationError('Unknown industry'));
  return Ok({ industry: blueprint.industry, sectionCount: blueprint.sectionOrder.length, primaryCta: blueprint.primaryCta });
}

export async function getObjectionLibraryUseCase(
  input: { industry: IndustryBlueprint }, _deps: CreativeUseCaseDeps,
): Promise<Result<{ industry: IndustryBlueprint; totalObjections: number; criticalCount: number; majorCount: number }, ValidationError>> {
  if (!input.industry) return Err(new ValidationError('Industry required'));
  const lib = OBJECTION_LIBRARIES[input.industry];
  if (!lib) return Err(new ValidationError('Unknown industry'));
  return Ok({
    industry: input.industry,
    totalObjections: lib.length,
    criticalCount: lib.filter(o => o.severity === 'Critical').length,
    majorCount: lib.filter(o => o.severity === 'Major').length,
  });
}