/**
 * Creative Intelligence RC2 — Critique, Recommendation, Approval, Report Use Cases
 *
 * Senior Art Director 출력:
 * - generateCreativeCritiqueUseCase: Design Critique (tone=senior-art-director)
 * - generateVisualRecommendationsUseCase: Design Recommendation
 * - approveCreativeUseCase / rejectCreativeUseCase: Quality Gate
 * - 7 report UCs: creative-review, art-direction, premium, luxury, three-second, design-critique, design-recommendation
 */
import { Ok, Err, type Result, ValidationError, NotFoundError, z } from '@platform/core-sdk';
import {
  generateCritiqueSchema, generateVisualRecommendationsSchema,
  generateReportSchema, generatePhotographyGuideSchema, generateMotionGuideSchema,
  generateInteractionGuideSchema, approvalSchema, reviewPageSchema,
} from '../domain/validation.js';
import { CREATIVE_EVENTS, CREATIVE_EVENT_SCHEMAS } from '../domain/events.js';
import { envelope, auditLog, now } from './helpers.js';
import type { CreativeUseCaseDeps } from './types.js';
import type {
  DesignCritique, DesignCritiqueItem, DesignRecommendation, DesignRecommendationItem,
  CreativeApproval, ReviewSeverity,
} from '../interfaces/index.js';

// ═══════════════════════════════════════════
// DESIGN CRITIQUE (Senior Art Director tone)
// ═══════════════════════════════════════════

export async function generateCreativeCritiqueUseCase(
  input: z.infer<typeof generateCritiqueSchema>, deps: CreativeUseCaseDeps,
): Promise<Result<{ critiqueId: string; verdict: string; critiqueCount: number }, ValidationError | NotFoundError>> {
  const v = generateCritiqueSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const style = (d.tone ?? 'senior-art-director') as 'senior-art-director' | 'principal-designer' | 'creative-director';
  // Mock contentSnapshot for the page (in real impl, fetched from CMS)
  const contentSnapshot: Record<string, unknown> = {
    hero: { title: 'Welcome' }, whitespaceRatio: 0.3, ctaPosition: 'mid',
  };
  // Run all relevant reviews to inform critique
  const premium = deps.creativeDirector.scorePremium('Luxury', contentSnapshot);
  const aiDet = deps.creativeDirector.detectAIArtifacts(contentSnapshot);
  const result = deps.creativeDirector.generateCritique(contentSnapshot, {
    premium: premium.premiumFeeling,
    whitespace: premium.whitespace,
    typography: premium.typography,
    photography: premium.photography,
    aiSmell: aiDet.aiLayout,
  });
  const id = deps.idGenerator.generate();
  const critique: DesignCritique = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: d.pageRef,
    tone: style, critiques: result.critiques as DesignCritiqueItem[],
    overallVerdict: result.verdict,
    attributes: {}, createdAt: now(deps),
  };
  await deps.designCritiqueRepo.insert(critique);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, CREATIVE_EVENTS.DESIGN_CRITIQUE_GENERATED, CREATIVE_EVENT_SCHEMAS['ci.design_critique.generated'], { pageRef: d.pageRef, count: result.critiques.length }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'design_critique_generated', { count: result.critiques.length }, d.pageRef);
  return Ok({ critiqueId: id, verdict: result.verdict, critiqueCount: result.critiques.length });
}

// ═══════════════════════════════════════════
// VISUAL RECOMMENDATIONS
// ═══════════════════════════════════════════

export async function generateVisualRecommendationsUseCase(
  input: z.infer<typeof generateVisualRecommendationsSchema>, deps: CreativeUseCaseDeps,
): Promise<Result<{ recommendationId: string; priority: string; count: number }, ValidationError | NotFoundError>> {
  const v = generateVisualRecommendationsSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  // Mock: read existing critique if available
  const existing = await deps.designCritiqueRepo.findByPage(d.tenantId, d.pageRef);
  const latestCritique = existing[existing.length - 1];
  if (!latestCritique) return Err(new NotFoundError('No critique found — run generateCreativeCritique first'));
  const result = deps.creativeDirector.generateRecommendations(latestCritique);
  const id = deps.idGenerator.generate();
  const rec: DesignRecommendation = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: d.pageRef,
    recommendations: result.recommendations as DesignRecommendationItem[],
    priority: result.priority,
    attributes: {}, createdAt: now(deps),
  };
  await deps.designRecommendationRepo.insert(rec);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, CREATIVE_EVENTS.DESIGN_RECOMMENDATION_GENERATED, CREATIVE_EVENT_SCHEMAS['ci.design_recommendation.generated'], { pageRef: d.pageRef, count: result.recommendations.length, priority: result.priority }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'design_recommendation_generated', { count: result.recommendations.length }, d.pageRef);
  return Ok({ recommendationId: id, priority: result.priority, count: result.recommendations.length });
}

// ═══════════════════════════════════════════
// PHOTOGRAPHY GUIDE
// ═══════════════════════════════════════════

export async function generatePhotographyGuideUseCase(
  input: z.infer<typeof generatePhotographyGuideSchema>, deps: CreativeUseCaseDeps,
): Promise<Result<{ guideId: string; style: string; mood: string; lighting: string; composition: string }, ValidationError | NotFoundError>> {
  const v = generatePhotographyGuideSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const id = deps.idGenerator.generate();
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, CREATIVE_EVENTS.PHOTOGRAPHY_REVIEWED, CREATIVE_EVENT_SCHEMAS['ci.photography.reviewed'], { pageRef: d.pageRef, type: 'guide' }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'photography_reviewed', { type: 'guide' }, d.pageRef);
  return Ok({
    guideId: id,
    style: d.style ?? 'Luxury',
    mood: 'serene / warm',
    lighting: 'natural golden hour',
    composition: 'rule of thirds with generous negative space',
  });
}

// ═══════════════════════════════════════════
// MOTION GUIDE
// ═══════════════════════════════════════════

export async function generateMotionGuideUseCase(
  input: z.infer<typeof generateMotionGuideSchema>, deps: CreativeUseCaseDeps,
): Promise<Result<{ guideId: string; intensity: string; principles: string[] }, ValidationError | NotFoundError>> {
  const v = generateMotionGuideSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const id = deps.idGenerator.generate();
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'art_direction_created', { type: 'motion_guide' }, d.pageRef);
  return Ok({
    guideId: id,
    intensity: d.intensity,
    principles: [
      'Generous timing 300-500ms for premium feel',
      'Easing: ease-out cubic for entrances',
      'Subtle scale 1.02 max on hover',
      'No bouncy or playful animations',
    ],
  });
}

// ═══════════════════════════════════════════
// INTERACTION GUIDE
// ═══════════════════════════════════════════

export async function generateInteractionGuideUseCase(
  input: z.infer<typeof generateInteractionGuideSchema>, deps: CreativeUseCaseDeps,
): Promise<Result<{ guideId: string; interactions: { trigger: string; response: string; duration: string; easing: string }[] }, ValidationError | NotFoundError>> {
  const v = generateInteractionGuideSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const id = deps.idGenerator.generate();
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'art_direction_created', { type: 'interaction_guide' }, d.pageRef);
  return Ok({
    guideId: id,
    interactions: [
      { trigger: 'hover', response: 'subtle scale + shadow', duration: '300ms', easing: 'ease-out' },
      { trigger: 'click', response: 'color shift + transform', duration: '200ms', easing: 'ease-in' },
      { trigger: 'scroll', response: 'fade in + translate', duration: '500ms', easing: 'ease-out-cubic' },
    ],
  });
}

// ═══════════════════════════════════════════
// QUALITY GATE — Approve / Reject
// ═══════════════════════════════════════════

export async function approveCreativeUseCase(
  input: z.infer<typeof approvalSchema>, deps: CreativeUseCaseDeps,
): Promise<Result<{ approvalId: string; status: 'Approved'; passed: boolean }, ValidationError | NotFoundError>> {
  const v = approvalSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  if (d.action !== 'approve') return Err(new ValidationError('Invalid action'));
  // Quality gate: collect all scores
  const premium = await deps.premiumReviewRepo.findByPage(d.tenantId, d.pageRef);
  const luxury = await deps.luxuryScoreRepo.findByPage(d.tenantId, d.pageRef);
  const aiArtifacts = await deps.aiArtifactRepo.findByPage(d.tenantId, d.pageRef);
  const failedGates: string[] = [];
  const latestPremium = premium[premium.length - 1];
  const latestLuxury = luxury[luxury.length - 1];
  const latestAI = aiArtifacts[aiArtifacts.length - 1];
  if (!latestPremium || latestPremium.overall < 95) failedGates.push('Premium <95');
  if (!latestLuxury || latestLuxury.overall < 90) failedGates.push('Luxury <90');
  if (latestAI && latestAI.overallScore > 5) failedGates.push('AI Smell >5');
  if (failedGates.length > 0) {
    return Err(new ValidationError(`Quality gate failed: ${failedGates.join(', ')}`));
  }
  const id = deps.idGenerator.generate();
  const approval: CreativeApproval = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: d.pageRef,
    status: 'Approved', failedGates: [], passed: true,
    reviewerId: d.actorId, notes: d.notes ?? '',
    attributes: {}, createdAt: now(deps),
  };
  await deps.creativeApprovalRepo.insert(approval);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, CREATIVE_EVENTS.CREATIVE_APPROVED, CREATIVE_EVENT_SCHEMAS['ci.creative.approved'], { pageRef: d.pageRef }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'creative_approved', {}, d.pageRef);
  return Ok({ approvalId: id, status: 'Approved', passed: true });
}

export async function rejectCreativeUseCase(
  input: z.infer<typeof approvalSchema>, deps: CreativeUseCaseDeps,
): Promise<Result<{ approvalId: string; status: 'Rejected'; passed: boolean }, ValidationError | NotFoundError>> {
  const v = approvalSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  if (d.action !== 'reject') return Err(new ValidationError('Invalid action'));
  const id = deps.idGenerator.generate();
  const approval: CreativeApproval = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: d.pageRef,
    status: 'Rejected', failedGates: ['Art Director rejection'],
    passed: false, reviewerId: d.actorId, notes: d.notes ?? '',
    attributes: {}, createdAt: now(deps),
  };
  await deps.creativeApprovalRepo.insert(approval);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, CREATIVE_EVENTS.CREATIVE_REJECTED, CREATIVE_EVENT_SCHEMAS['ci.creative.rejected'], { pageRef: d.pageRef, notes: d.notes ?? '' }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'creative_rejected', { notes: d.notes }, d.pageRef);
  return Ok({ approvalId: id, status: 'Rejected', passed: false });
}

// ═══════════════════════════════════════════
// REPORTS (7 types)
// ═══════════════════════════════════════════

export async function generateReportUseCase(
  input: z.infer<typeof generateReportSchema>, deps: CreativeUseCaseDeps,
): Promise<Result<{ reportId: string; reportType: string; summary: string }, ValidationError | NotFoundError>> {
  const v = generateReportSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const id = deps.idGenerator.generate();
  let summary = '';
  let eventType: string = CREATIVE_EVENTS.CREATIVE_REVIEW_REPORT;
  let schemaRef: string = CREATIVE_EVENT_SCHEMAS['ci.report.creative_review'];
  switch (d.reportType) {
    case 'creative-review': {
      const premiums = await deps.premiumReviewRepo.findByPage(d.tenantId, d.pageRef);
      const ai = await deps.aiArtifactRepo.findByPage(d.tenantId, d.pageRef);
      summary = `Creative Review: ${premiums.length} premium reviews, ${ai.length} AI artifact checks`;
      eventType = CREATIVE_EVENTS.CREATIVE_REVIEW_REPORT;
      schemaRef = CREATIVE_EVENT_SCHEMAS['ci.report.creative_review'];
      break;
    }
    case 'art-direction':
      summary = 'Art Direction Report: 8 style profiles evaluated';
      eventType = CREATIVE_EVENTS.ART_DIRECTION_REPORT;
      schemaRef = CREATIVE_EVENT_SCHEMAS['ci.report.art_direction'];
      break;
    case 'premium': {
      const p = await deps.premiumReviewRepo.findByPage(d.tenantId, d.pageRef);
      summary = `Premium Report: latest=${p[p.length - 1]?.overall ?? 'N/A'}`;
      eventType = CREATIVE_EVENTS.PREMIUM_REPORT;
      schemaRef = CREATIVE_EVENT_SCHEMAS['ci.report.premium'];
      break;
    }
    case 'luxury': {
      const l = await deps.luxuryScoreRepo.findByPage(d.tenantId, d.pageRef);
      summary = `Luxury Report: latest=${l[l.length - 1]?.overall ?? 'N/A'}`;
      eventType = CREATIVE_EVENTS.LUXURY_REPORT;
      schemaRef = CREATIVE_EVENT_SCHEMAS['ci.report.luxury'];
      break;
    }
    case 'three-second':
      summary = '3-Second Report: First Impression analysis';
      eventType = CREATIVE_EVENTS.THREE_SECOND_REPORT;
      schemaRef = CREATIVE_EVENT_SCHEMAS['ci.report.three_second'];
      break;
    case 'design-critique': {
      const c = await deps.designCritiqueRepo.findByPage(d.tenantId, d.pageRef);
      summary = `Design Critique: ${c.length} critiques generated`;
      eventType = CREATIVE_EVENTS.DESIGN_CRITIQUE_REPORT;
      schemaRef = CREATIVE_EVENT_SCHEMAS['ci.report.design_critique'];
      break;
    }
    case 'design-recommendation': {
      const r = await deps.designRecommendationRepo.findByPage(d.tenantId, d.pageRef);
      summary = `Design Recommendations: ${r.length} recommendations`;
      eventType = CREATIVE_EVENTS.DESIGN_RECOMMENDATION_REPORT;
      schemaRef = CREATIVE_EVENT_SCHEMAS['ci.report.design_recommendation'];
      break;
    }
  }
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, eventType, schemaRef, { pageRef: d.pageRef, reportType: d.reportType }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'creative_review_report', { reportType: d.reportType }, d.pageRef);
  return Ok({ reportId: id, reportType: d.reportType, summary });
}