/**
 * Creative Intelligence RC3 — Trust Architecture Use Cases
 *
 * Platform Vision v2 (사장님 확립 2026-07-13):
 * - AI는 점수를 매기지 않는다
 * - Trust Evidence를 배치한다
 * - Customer Psychology Director 역할 수행
 *
 * 7대 신규 산출물:
 * 1. Trust Architecture Report
 * 2. Customer Psychology Report
 * 3. Evidence Placement Strategy
 * 4. Objection Map
 * 5. Confidence Journey
 * 6. Decision Journey
 * 7. Trust Checklist
 */
import { Ok, Err, type Result, ValidationError, z } from '@platform/core-sdk';
import { CREATIVE_EVENTS, CREATIVE_EVENT_SCHEMAS } from '../domain/events.js';
import { envelope, auditLog, now } from './helpers.js';
import type { CreativeUseCaseDeps } from './types.js';
import { INDUSTRY_TRUST_PROFILES } from '../infrastructure/hostAdapters.js';
import type {
  IndustryType, TrustChecklist,
  TrustArchitectureReport, CustomerPsychologyReport, EvidencePlacementStrategy,
} from '../interfaces/index.js';

const baseInput = {
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  organizationId: z.string().min(1),
};
const industrySchema = z.enum(['Restaurant', 'Hotel', 'Travel', 'Hospital', 'SaaS', 'Marketplace', 'Generic']);

// ═══════════════════════════════════════════
// 1. Trust Architecture Report
// ═══════════════════════════════════════════

export async function generateTrustArchitectureReportUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; organizationId: string; industry: IndustryType; existingPageRefs?: string[] },
  deps: CreativeUseCaseDeps,
): Promise<Result<{ reportId: string; coverage: number; gaps: string[] }, ValidationError>> {
  const parsed = z.object({ ...baseInput, industry: industrySchema, existingPageRefs: z.array(z.string()).optional() }).safeParse(input);
  if (!parsed.success) return Err(new ValidationError('Invalid input'));
  const d = parsed.data;
  const profile = INDUSTRY_TRUST_PROFILES[d.industry];
  const existing = new Set(d.existingPageRefs ?? []);
  const coverage: { evidenceRef: string; placed: boolean; placementRef?: string }[] = profile.requiredEvidence.map(e => ({
    evidenceRef: e.id, placed: e.naturalPages.some(p => existing.has(p)),
  }));
  const gaps = profile.requiredEvidence.filter(e => e.naturalPages.every(p => !existing.has(p))).map(e => e.name);
  const id = deps.idGenerator.generate();
  const report: TrustArchitectureReport = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, industry: d.industry,
    requiredEvidence: profile.requiredEvidence, coverage, gaps, recommendations: gaps.map(g => `${g} 추가 권장`),
    createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, 'ci.trust_architecture.report_generated', CREATIVE_EVENT_SCHEMAS['ci.art_direction.created'], { reportId: id, industry: d.industry, gapCount: gaps.length }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'art_direction_created', { type: 'trust_architecture_report' }, id);
  return Ok({ reportId: id, coverage: Math.round((coverage.filter(c => c.placed).length / coverage.length) * 100), gaps });
}

// ═══════════════════════════════════════════
// 2. Customer Psychology Report
// ═══════════════════════════════════════════

export async function generateCustomerPsychologyReportUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; organizationId: string; industry: IndustryType },
  deps: CreativeUseCaseDeps,
): Promise<Result<{ reportId: string; stageCount: number }, ValidationError>> {
  const parsed = z.object({ ...baseInput, industry: industrySchema }).safeParse(input);
  if (!parsed.success) return Err(new ValidationError('Invalid input'));
  const d = parsed.data;
  const id = deps.idGenerator.generate();
  const stageMap: Record<IndustryType, { motivations: string[]; fears: string[]; triggers: string[] }> = {
    Restaurant: { motivations: ['맛집', '특별한 날'], fears: ['실망', '위생'], triggers: ['음식 사진', '셰프 후기', '예약 가능'] },
    Hotel: { motivations: ['휴식', '여행'], fears: ['불편', '안전'], triggers: ['실제 후기', '공식 사이트', '베스트 프라이스'] },
    Travel: { motivations: ['경험', '모험'], fears: ['문제 발생', '안전'], triggers: ['현지 가이드', '긴급 연락', '리얼 후기'] },
    Hospital: { motivations: ['치료', '건강'], fears: ['잘못된 진단', '부작용'], triggers: ['의사 경력', '학회', '인증'] },
    SaaS: { motivations: ['효율', '자동화'], fears: ['장애', '데이터 유출'], triggers: ['SOC2', '99.99%', 'Enterprise 로고'] },
    Marketplace: { motivations: ['저렴', '편리'], fears: ['가짜', '환불 불가'], triggers: ['Verified Seller', 'Escrow', '리뷰'] },
    Generic: { motivations: ['구매', '문의'], fears: ['믿을 수 있는가'], triggers: ['회사 정보', '연락처', '후기'] },
  };
  const profile = stageMap[d.industry];
  const report: CustomerPsychologyReport = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, industry: d.industry,
    customerProfile: {
      demographics: [`Industry: ${d.industry} 고객`],
      primaryMotivations: profile.motivations,
      primaryFears: profile.fears,
      decisionTriggers: profile.triggers,
    },
    psychologyPathway: [
      { stage: 'Anxiety', psychologicalState: '불안 — 이 회사를 믿을 수 있는가?', designIntent: '신뢰 요소 시각화' },
      { stage: 'Discovery', psychologicalState: '탐색 — 실제로 어떤 회사인가?', designIntent: '회사 정보 투명 공개' },
      { stage: 'Evaluation', psychologicalState: '평가 — 다른 선택지와 비교', designIntent: '차별점 강조' },
      { stage: 'Confidence', psychologicalState: '확신 — 여기면 될 것 같다', designIntent: '사회적 증거/리뷰' },
      { stage: 'Action', psychologicalState: '행동 — 문의/예약/구매', designIntent: '명확한 CTA' },
    ],
    createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, 'ci.customer_psychology.report_generated', CREATIVE_EVENT_SCHEMAS['ci.art_direction.created'], { reportId: id }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'art_direction_created', { type: 'customer_psychology_report' }, id);
  return Ok({ reportId: id, stageCount: report.psychologyPathway.length });
}

// ═══════════════════════════════════════════
// 3. Evidence Placement Strategy
// ═══════════════════════════════════════════

export async function generateEvidencePlacementStrategyUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; organizationId: string; industry: IndustryType; pageRef: string },
  deps: CreativeUseCaseDeps,
): Promise<Result<{ strategyId: string; placementCount: number }, ValidationError>> {
  const parsed = z.object({ ...baseInput, industry: industrySchema, pageRef: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return Err(new ValidationError('Invalid input'));
  const d = parsed.data;
  const profile = INDUSTRY_TRUST_PROFILES[d.industry];
  const id = deps.idGenerator.generate();
  const placements = profile.requiredEvidence
    .filter(e => e.naturalPages.includes(d.pageRef))
    .map((e) => ({
      evidenceRef: e.id, slot: e.naturalPages[0] ?? d.pageRef, why: `${e.name} — ${e.description}`, visualHint: `${e.naturalPages[0] ?? d.pageRef} 영역에 배치`,
    }));
  const strategy: EvidencePlacementStrategy = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: d.pageRef,
    placements,
    priorityOrder: profile.requiredEvidence.filter(e => e.priority === 1).map(e => e.id),
    createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, 'ci.evidence_placement.strategy_generated', CREATIVE_EVENT_SCHEMAS['ci.art_direction.created'], { strategyId: id, pageRef: d.pageRef }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'art_direction_created', { type: 'evidence_placement_strategy' }, id);
  return Ok({ strategyId: id, placementCount: placements.length });
}

// ═══════════════════════════════════════════
// 4. Objection Map
// ═══════════════════════════════════════════

export async function generateObjectionMapUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; organizationId: string; industry: IndustryType },
  deps: CreativeUseCaseDeps,
): Promise<Result<{ mapId: string; objectionCount: number }, ValidationError>> {
  const parsed = z.object({ ...baseInput, industry: industrySchema }).safeParse(input);
  if (!parsed.success) return Err(new ValidationError('Invalid input'));
  const d = parsed.data;
  const profile = INDUSTRY_TRUST_PROFILES[d.industry];
  const objections = profile.requiredEvidence.map(e => ({
    concern: e.objectionAddressed[0] ?? '신뢰 부족',
    severity: (e.priority === 1 ? 'High' : e.priority === 2 ? 'Medium' : 'Low') as 'High' | 'Medium' | 'Low',
    resolution: e.description,
    evidenceRef: e.id,
  }));
  const id = deps.idGenerator.generate();
  const map = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, industry: d.industry,
    objections, createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, 'ci.objection_map.generated', CREATIVE_EVENT_SCHEMAS['ci.art_direction.created'], { mapId: id }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'art_direction_created', { type: 'objection_map' }, id);
  return Ok({ mapId: id, objectionCount: objections.length });
}

// ═══════════════════════════════════════════
// 5. Confidence Journey
// ═══════════════════════════════════════════

export async function generateConfidenceJourneyUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; organizationId: string; industry: IndustryType; pageRef: string },
  deps: CreativeUseCaseDeps,
): Promise<Result<{ journeyId: string; steps: number; totalGain: number }, ValidationError>> {
  const parsed = z.object({ ...baseInput, industry: industrySchema, pageRef: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return Err(new ValidationError('Invalid input'));
  const d = parsed.data;
  const profile = INDUSTRY_TRUST_PROFILES[d.industry];
  const steps = profile.requiredEvidence
    .filter(e => e.naturalPages.includes(d.pageRef))
    .map(e => ({ step: e.name, evidence: e.id, confidenceGain: e.priority === 1 ? 30 : e.priority === 2 ? 20 : 10 }));
  const total = steps.reduce((sum, s) => sum + s.confidenceGain, 0);
  const id = deps.idGenerator.generate();
  const journey = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: d.pageRef,
    steps, totalConfidenceGain: total, createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, 'ci.confidence_journey.generated', CREATIVE_EVENT_SCHEMAS['ci.art_direction.created'], { journeyId: id }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'art_direction_created', { type: 'confidence_journey' }, id);
  return Ok({ journeyId: id, steps: steps.length, totalGain: total });
}

// ═══════════════════════════════════════════
// 6. Decision Journey
// ═══════════════════════════════════════════

export async function generateDecisionJourneyUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; organizationId: string; industry: IndustryType; pageRef: string },
  deps: CreativeUseCaseDeps,
): Promise<Result<{ journeyId: string; steps: number }, ValidationError>> {
  const parsed = z.object({ ...baseInput, industry: industrySchema, pageRef: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return Err(new ValidationError('Invalid input'));
  const d = parsed.data;
  const id = deps.idGenerator.generate();
  const decisionSteps = [
    { step: '신뢰 형성', trigger: '실제 음식/객실 사진', outcome: '믿을만한 회사' },
    { step: '사회적 증거', trigger: '리뷰/평점', outcome: '다른 사람도 만족' },
    { step: '실용성 확인', trigger: '예약/영업시간', outcome: '내가 이용 가능' },
    { step: '마지막 질문 해소', trigger: 'FAQ/연락처', outcome: '불안 제거' },
    { step: '행동', trigger: 'CTA', outcome: '문의/예약/구매' },
  ];
  const journey = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: d.pageRef,
    decisionSteps, createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, 'ci.decision_journey.generated', CREATIVE_EVENT_SCHEMAS['ci.art_direction.created'], { journeyId: id }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'art_direction_created', { type: 'decision_journey' }, id);
  return Ok({ journeyId: id, steps: decisionSteps.length });
}

// ═══════════════════════════════════════════
// 7. Trust Checklist (최종 검증)
// ═══════════════════════════════════════════

export async function generateTrustChecklistUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; organizationId: string; industry: IndustryType; pageRef: string; placedEvidence: string[] },
  deps: CreativeUseCaseDeps,
): Promise<Result<{ checklistId: string; passed: number; failed: number; warning: number }, ValidationError>> {
  const parsed = z.object({ ...baseInput, industry: industrySchema, pageRef: z.string().min(1), placedEvidence: z.array(z.string()) }).safeParse(input);
  if (!parsed.success) return Err(new ValidationError('Invalid input'));
  const d = parsed.data;
  const profile = INDUSTRY_TRUST_PROFILES[d.industry];
  const placedSet = new Set(d.placedEvidence);
  const items = profile.requiredEvidence.map(e => ({
    id: e.id,
    category: 'Evidence' as const,
    description: `${e.name} 배치 여부`,
    status: (placedSet.has(e.id) ? 'Pass' : e.priority === 1 ? 'Fail' : 'Warning') as 'Pass' | 'Fail' | 'Warning',
    evidenceRef: e.id,
    notes: placedSet.has(e.id) ? '배치됨' : `${e.naturalPages.join('/')}에 배치 권장`,
  }));
  const passed = items.filter(i => i.status === 'Pass').length;
  const failed = items.filter(i => i.status === 'Fail').length;
  const warning = items.filter(i => i.status === 'Warning').length;
  const id = deps.idGenerator.generate();
  const checklist: TrustChecklist = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: d.pageRef,
    items, passedCount: passed, failedCount: failed, warningCount: warning,
    internalHealthScore: Math.round((passed / items.length) * 100),
    createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, 'ci.trust_checklist.generated', CREATIVE_EVENT_SCHEMAS['ci.art_direction.created'], { checklistId: id, passed, failed }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'art_direction_created', { type: 'trust_checklist' }, id);
  return Ok({ checklistId: id, passed, failed, warning });
}

// ═══════════════════════════════════════════
// Trust Profile Query (산업별 신뢰 요소 조회)
// ═══════════════════════════════════════════

export async function getIndustryTrustProfileUseCase(
  input: { industry: IndustryType }, _deps: CreativeUseCaseDeps,
): Promise<Result<{ industry: IndustryType; description: string; evidenceCount: number; topSignals: string[] }, ValidationError>> {
  if (!input.industry) return Err(new ValidationError('Industry required'));
  const profile = INDUSTRY_TRUST_PROFILES[input.industry];
  if (!profile) return Err(new ValidationError('Unknown industry'));
  return Ok({
    industry: profile.industry,
    description: profile.description,
    evidenceCount: profile.requiredEvidence.length,
    topSignals: profile.topSignals,
  });
}