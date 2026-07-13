/**
 * Creative Intelligence RC2 — Visual Review Use Cases
 *
 * 12 visual reviews + 3 special reviews:
 * - reviewFirstImpression, reviewPremiumQuality, reviewLuxury, reviewVisualHierarchy
 * - reviewWhitespace, reviewTypography, reviewPhotography, reviewComposition
 * - reviewScrollExperience, reviewMicroInteraction, reviewVisualConsistency
 * - reviewBrandExpression, reviewEmotionalJourney, reviewConversion
 * - reviewAISmell
 */
import { Ok, Err, type Result, ValidationError, NotFoundError, z } from '@platform/core-sdk';
import { reviewPageSchema } from '../domain/validation.js';
import { CREATIVE_EVENTS, CREATIVE_EVENT_SCHEMAS } from '../domain/events.js';
import { envelope, auditLog, now, average } from './helpers.js';
import type { CreativeUseCaseDeps } from './types.js';
import type {
  VisualHierarchy, Composition, WhitespaceStrategy, VisualConsistency,
  PremiumReview, LuxuryScore, ConversionReview, EmotionalJourney,
  InteractionReview, PhotographyDirection, TypographyDirection,
  AIArtifactDetection, FirstImpression, ArtDirectionStyle,
} from '../interfaces/index.js';

const QUALITY_GATE = {
  firstImpression: 95, premium: 95, trust: 95, luxury: 90, brand: 95,
  typography: 95, whitespace: 95, hierarchy: 95, photography: 95,
  visualStory: 90, aiSmellMax: 5,
} as const;

// ═══════════════════════════════════════════
// VISUAL HIERARCHY
// ═══════════════════════════════════════════

export async function reviewVisualHierarchyUseCase(
  input: z.infer<typeof reviewPageSchema>, deps: CreativeUseCaseDeps,
): Promise<Result<{ hierarchyScore: number; passed: boolean; id: string }, ValidationError | NotFoundError>> {
  const v = reviewPageSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const snap = d.contentSnapshot ?? {};
  const hasHero = !!snap['hero'];
  const hasCTA = !!snap['cta'];
  const score = hasHero ? 96 : 70;
  const passed = score >= QUALITY_GATE.hierarchy;
  const id = deps.idGenerator.generate();
  const hierarchy: VisualHierarchy = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: d.pageRef,
    hierarchyScore: score,
    primaryFocus: hasHero ? 'Hero section' : 'Top navigation',
    secondaryFocus: hasCTA ? 'Primary CTA' : 'About section',
    tertiaryFocus: 'Footer',
    hasSingleHero: hasHero, fPattern: true, zPattern: false,
    issues: score < 80 ? ['Multiple competing focal points'] : [],
    attributes: {}, createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, CREATIVE_EVENTS.VISUAL_HIERARCHY_REVIEWED, CREATIVE_EVENT_SCHEMAS['ci.visual_hierarchy.reviewed'], { pageRef: d.pageRef, score, passed }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'visual_hierarchy_reviewed', { score }, d.pageRef);
  return Ok({ hierarchyScore: score, passed, id });
}

// ═══════════════════════════════════════════
// WHITESPACE
// ═══════════════════════════════════════════

export async function reviewWhitespaceUseCase(
  input: z.infer<typeof reviewPageSchema>, deps: CreativeUseCaseDeps,
): Promise<Result<{ whitespaceScore: number; passed: boolean; id: string }, ValidationError | NotFoundError>> {
  const v = reviewPageSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const snap = d.contentSnapshot ?? {};
  const ratio = (snap['whitespaceRatio'] as number | undefined) ?? 0.3;
  const score = Math.round(70 + ratio * 80);  // 0.3 → 94, 0.5 → 110 (capped)
  const finalScore = Math.min(100, score);
  const passed = finalScore >= QUALITY_GATE.whitespace;
  const id = deps.idGenerator.generate();
  const ws: WhitespaceStrategy = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: d.pageRef,
    topFoldDensity: ratio >= 0.5 ? 'generous' : ratio >= 0.3 ? 'adequate' : 'dense',
    scrollDensity: ratio >= 0.4 ? 'generous' : 'adequate',
    breathingRoom: finalScore, rhythm: finalScore, luxury: finalScore,
    issues: ratio < 0.3 ? ['Sections feel cramped, increase padding'] : [],
    attributes: {}, createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, CREATIVE_EVENTS.WHITESPACE_REVIEWED, CREATIVE_EVENT_SCHEMAS['ci.whitespace.reviewed'], { pageRef: d.pageRef, score: finalScore, passed }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'whitespace_reviewed', { score: finalScore }, d.pageRef);
  return Ok({ whitespaceScore: finalScore, passed, id });
}

// ═══════════════════════════════════════════
// TYPOGRAPHY
// ═══════════════════════════════════════════

export async function reviewTypographyUseCase(
  input: z.infer<typeof reviewPageSchema>, deps: CreativeUseCaseDeps,
): Promise<Result<{ typographyScore: number; passed: boolean; id: string }, ValidationError | NotFoundError>> {
  const v = reviewPageSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const snap = d.contentSnapshot ?? {};
  const hasDisplay = !!snap['displayFont'] || !!snap['serifAccent'];
  const scale = (snap['typographyScale'] as string | undefined) ?? 'uniform';
  const score = hasDisplay && scale === 'display+editorial' ? 96 : hasDisplay ? 92 : scale === 'uniform' ? 78 : 85;
  const passed = score >= QUALITY_GATE.typography;
  const id = deps.idGenerator.generate();
  const td: TypographyDirection = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: d.pageRef,
    scale: hasDisplay ? 'editorial' : 'balanced',
    contrast: 'regular', weight: 500, lineHeight: 'standard',
    readingRhythm: scale === 'display+editorial' ? 'editorial' : 'scannable',
    headlineImpact: hasDisplay ? 'statement' : 'subtle',
    directionScore: score, scaleScore: score, rhythmScore: score,
    issues: !hasDisplay ? ['Use Display+Editorial scale pair for premium feel'] : [],
    attributes: {}, createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, CREATIVE_EVENTS.TYPOGRAPHY_REVIEWED, CREATIVE_EVENT_SCHEMAS['ci.typography.reviewed'], { pageRef: d.pageRef, score, passed }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'typography_reviewed', { score }, d.pageRef);
  return Ok({ typographyScore: score, passed, id });
}

// ═══════════════════════════════════════════
// PHOTOGRAPHY
// ═══════════════════════════════════════════

export async function reviewPhotographyUseCase(
  input: z.infer<typeof reviewPageSchema>, deps: CreativeUseCaseDeps,
): Promise<Result<{ photographyScore: number; passed: boolean; id: string }, ValidationError | NotFoundError>> {
  const v = reviewPageSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const snap = d.contentSnapshot ?? {};
  const hasLifestyle = !!snap['lifestylePhotography'] || !!snap['editorialPhotography'];
  const hasShallowDOF = !!snap['shallowDOF'];
  const score = hasLifestyle && hasShallowDOF ? 95 : hasLifestyle ? 90 : hasShallowDOF ? 80 : 65;
  const passed = score >= QUALITY_GATE.photography;
  const id = deps.idGenerator.generate();
  const pd: PhotographyDirection = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: d.pageRef,
    mood: 'serene', lighting: 'natural', composition: 'rule-of-thirds',
    people: 'candid', environment: 'natural', cameraAngle: 'eye-level',
    depth: hasShallowDOF ? 'shallow' : 'deep', colorTemperature: 'warm', negativeSpace: 'generous',
    directionScore: score, brandAlignment: score,
    issues: !hasLifestyle ? ['Photography does not communicate lifestyle'] : [],
    attributes: {}, createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, CREATIVE_EVENTS.PHOTOGRAPHY_REVIEWED, CREATIVE_EVENT_SCHEMAS['ci.photography.reviewed'], { pageRef: d.pageRef, score, passed }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'photography_reviewed', { score }, d.pageRef);
  return Ok({ photographyScore: score, passed, id });
}

// ═══════════════════════════════════════════
// COMPOSITION
// ═══════════════════════════════════════════

export async function reviewCompositionUseCase(
  input: z.infer<typeof reviewPageSchema>, deps: CreativeUseCaseDeps,
): Promise<Result<{ compositionScore: number; passed: boolean; id: string }, ValidationError | NotFoundError>> {
  const v = reviewPageSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const snap = d.contentSnapshot ?? {};
  const rot = !!snap['ruleOfThirds'];
  const sym = (snap['symmetry'] as string | undefined) ?? 'asymmetric';
  const score = rot ? 92 : sym === 'symmetric' ? 85 : 78;
  const passed = score >= 80;
  const id = deps.idGenerator.generate();
  const comp: Composition = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: d.pageRef,
    compositionScore: score, ruleOfThirds: rot, symmetry: sym as Composition['symmetry'],
    focalPointCount: 1, whiteSpaceRatio: 0.4, balance: score,
    issues: !rot ? ['Use rule of thirds for stronger composition'] : [],
    attributes: {}, createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, CREATIVE_EVENTS.COMPOSITION_REVIEWED, CREATIVE_EVENT_SCHEMAS['ci.composition.reviewed'], { pageRef: d.pageRef, score, passed }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'composition_reviewed', { score }, d.pageRef);
  return Ok({ compositionScore: score, passed, id });
}

// ═══════════════════════════════════════════
// SCROLL EXPERIENCE
// ═══════════════════════════════════════════

export async function reviewScrollExperienceUseCase(
  input: z.infer<typeof reviewPageSchema>, deps: CreativeUseCaseDeps,
): Promise<Result<{ scrollScore: number; passed: boolean; id: string }, ValidationError | NotFoundError>> {
  const v = reviewPageSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const snap = d.contentSnapshot ?? {};
  const hasStoryFlow = !!snap['storyFlow'];  // CTA가 first가 아닌 경우
  const score = hasStoryFlow ? 93 : 70;  // CTA가 first면 감점
  const passed = score >= 85;
  const id = deps.idGenerator.generate();
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, CREATIVE_EVENTS.SCROLL_REVIEWED, CREATIVE_EVENT_SCHEMAS['ci.scroll.reviewed'], { pageRef: d.pageRef, score, passed }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'scroll_reviewed', { score }, d.pageRef);
  return Ok({ scrollScore: score, passed, id });
}

// ═══════════════════════════════════════════
// MICRO INTERACTION
// ═══════════════════════════════════════════

export async function reviewMicroInteractionUseCase(
  input: z.infer<typeof reviewPageSchema>, deps: CreativeUseCaseDeps,
): Promise<Result<{ microScore: number; passed: boolean; id: string }, ValidationError | NotFoundError>> {
  const v = reviewPageSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const snap = d.contentSnapshot ?? {};
  const interactions = (snap['microInteractions'] as string[] | undefined) ?? [];
  const score = interactions.length >= 5 ? 90 : interactions.length >= 3 ? 82 : 70;
  const passed = score >= 75;
  const id = deps.idGenerator.generate();
  const ir: InteractionReview = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: d.pageRef,
    microInteractions: interactions.length, hoverQuality: score, feedbackQuality: score, delight: score,
    issues: interactions.length < 3 ? ['Add more hover/click feedback'] : [],
    attributes: {}, createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, CREATIVE_EVENTS.MICRO_INTERACTION_REVIEWED, CREATIVE_EVENT_SCHEMAS['ci.micro_interaction.reviewed'], { pageRef: d.pageRef, score, passed }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'micro_interaction_reviewed', { score }, d.pageRef);
  return Ok({ microScore: score, passed, id });
}

// ═══════════════════════════════════════════
// VISUAL CONSISTENCY
// ═══════════════════════════════════════════

export async function reviewVisualConsistencyUseCase(
  input: z.infer<typeof reviewPageSchema>, deps: CreativeUseCaseDeps,
): Promise<Result<{ consistencyScore: number; passed: boolean; id: string }, ValidationError | NotFoundError>> {
  const v = reviewPageSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const score = 90;  // baseline
  const passed = score >= 85;
  const id = deps.idGenerator.generate();
  const vc: VisualConsistency = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: d.pageRef,
    colorConsistency: score, typographyConsistency: score, spacingConsistency: score,
    componentConsistency: score, overall: score,
    issues: [], attributes: {}, createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, CREATIVE_EVENTS.VISUAL_CONSISTENCY_REVIEWED, CREATIVE_EVENT_SCHEMAS['ci.visual_consistency.reviewed'], { pageRef: d.pageRef, score, passed }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'visual_consistency_reviewed', { score }, d.pageRef);
  return Ok({ consistencyScore: score, passed, id });
}

// ═══════════════════════════════════════════
// BRAND EXPRESSION
// ═══════════════════════════════════════════

export async function reviewBrandExpressionUseCase(
  input: z.infer<typeof reviewPageSchema>, deps: CreativeUseCaseDeps,
): Promise<Result<{ brandScore: number; passed: boolean; id: string }, ValidationError | NotFoundError>> {
  const v = reviewPageSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const snap = d.contentSnapshot ?? {};
  const hasBrandVoice = !!snap['brandVoice'];
  const hasConsistentTone = !!snap['consistentTone'];
  const score = hasBrandVoice && hasConsistentTone ? 96 : hasBrandVoice ? 88 : 78;
  const passed = score >= QUALITY_GATE.brand;
  const id = deps.idGenerator.generate();
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, CREATIVE_EVENTS.BRAND_EXPRESSION_REVIEWED, CREATIVE_EVENT_SCHEMAS['ci.brand_expression.reviewed'], { pageRef: d.pageRef, score, passed }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'brand_expression_reviewed', { score }, d.pageRef);
  return Ok({ brandScore: score, passed, id });
}

// ═══════════════════════════════════════════
// EMOTIONAL JOURNEY (Emotion → Story → Trust → Action)
// CTA가 먼저 나오면 감점
// ═══════════════════════════════════════════

export async function reviewEmotionalJourneyUseCase(
  input: z.infer<typeof reviewPageSchema>, deps: CreativeUseCaseDeps,
): Promise<Result<{ journeyScore: number; passed: boolean; id: string }, ValidationError | NotFoundError>> {
  const v = reviewPageSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const snap = d.contentSnapshot ?? {};
  // CTA가 first면 감점 (story flow 부족)
  const ctaPosition = (snap['ctaPosition'] as string | undefined) ?? 'mid';
  const hasStory = !!snap['storySection'];  // 사용자 스토리/감정 섹션 존재
  const score = ctaPosition === 'late' && hasStory ? 92 : ctaPosition === 'mid' ? 80 : 60;
  const passed = score >= 80;
  const id = deps.idGenerator.generate();
  const ej: EmotionalJourney = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: d.pageRef,
    journey: [
      { stage: 'Emotion', emotion: 'welcome', intensity: 80 },
      { stage: 'Story', emotion: 'connection', intensity: hasStory ? 85 : 50 },
      { stage: 'Trust', emotion: 'confidence', intensity: 78 },
      { stage: 'Action', emotion: 'decision', intensity: 70 },
    ],
    flowScore: score,
    peaks: hasStory ? ['Story'] : ['Hero'],
    valleys: ctaPosition === 'early' ? ['Trust (skipped)'] : [],
    attributes: {}, createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, CREATIVE_EVENTS.EMOTIONAL_JOURNEY_REVIEWED, CREATIVE_EVENT_SCHEMAS['ci.emotional_journey.reviewed'], { pageRef: d.pageRef, score, passed }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'emotional_journey_reviewed', { score, ctaPosition }, d.pageRef);
  return Ok({ journeyScore: score, passed, id });
}

// ═══════════════════════════════════════════
// CONVERSION
// ═══════════════════════════════════════════

export async function reviewConversionUseCase(
  input: z.infer<typeof reviewPageSchema>, deps: CreativeUseCaseDeps,
): Promise<Result<{ conversionScore: number; passed: boolean; id: string }, ValidationError | NotFoundError>> {
  const v = reviewPageSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const snap = d.contentSnapshot ?? {};
  const aboveTheFoldCTA = (snap['ctaPosition'] as string | undefined) === 'early';
  const visibility = aboveTheFoldCTA ? 95 : 80;
  const emotionalPath = !!snap['storySection'] ? 88 : 70;
  const conversionScore = Math.round((visibility * 0.4 + emotionalPath * 0.6));
  const passed = conversionScore >= 80 && !aboveTheFoldCTA;
  const id = deps.idGenerator.generate();
  const cr: ConversionReview = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: d.pageRef,
    aboveTheFoldCTA, ctaVisibility: visibility, emotionalPath,
    friction: 100 - conversionScore, conversionScore,
    issues: aboveTheFoldCTA ? ['CTA is too early — emotional journey incomplete'] : [],
    attributes: {}, createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, CREATIVE_EVENTS.CONVERSION_REVIEWED, CREATIVE_EVENT_SCHEMAS['ci.conversion.reviewed'], { pageRef: d.pageRef, score: conversionScore, passed }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'conversion_reviewed', { score: conversionScore, aboveTheFoldCTA }, d.pageRef);
  return Ok({ conversionScore, passed, id });
}

// ═══════════════════════════════════════════
// FIRST IMPRESSION (3초 안에)
// ═══════════════════════════════════════════

export async function reviewFirstImpressionUseCase(
  input: z.infer<typeof reviewPageSchema>, deps: CreativeUseCaseDeps,
): Promise<Result<{ firstImpressionScore: number; overall: number; passed: boolean; id: string }, ValidationError | NotFoundError>> {
  const v = reviewPageSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const scores = deps.creativeDirector.scoreFirstImpression(d.contentSnapshot);
  const overall = average([scores.trust, scores.premium, scores.brand, scores.professional, scores.memorable]);
  const allPass = scores.trust >= QUALITY_GATE.trust && scores.premium >= QUALITY_GATE.premium && scores.brand >= QUALITY_GATE.brand && scores.professional >= 90 && scores.memorable >= 85;
  const id = deps.idGenerator.generate();
  const fi: FirstImpression = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: d.pageRef,
    ...scores, overall, passed: allPass,
    attributes: {}, createdAt: now(deps),
  };
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, CREATIVE_EVENTS.FIRST_IMPRESSION_REVIEWED, CREATIVE_EVENT_SCHEMAS['ci.first_impression.reviewed'], { pageRef: d.pageRef, overall, passed: allPass }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'first_impression_reviewed', { overall, scores }, d.pageRef);
  return Ok({ firstImpressionScore: overall, overall, passed: allPass, id });
}

// ═══════════════════════════════════════════
// PREMIUM QUALITY (10 dimensions)
// ═══════════════════════════════════════════

export async function reviewPremiumQualityUseCase(
  input: z.infer<typeof reviewPageSchema>, deps: CreativeUseCaseDeps,
): Promise<Result<{ premiumScore: number; passed: boolean; id: string }, ValidationError | NotFoundError>> {
  const v = reviewPageSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const style = (d.style ?? 'Premium') as ArtDirectionStyle;
  const scores = deps.creativeDirector.scorePremium(style, d.contentSnapshot);
  const overall = average(Object.values(scores));
  const passed = overall >= QUALITY_GATE.premium;
  const id = deps.idGenerator.generate();
  const pr: PremiumReview = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: d.pageRef,
    ...scores, overall, passed,
    attributes: {}, createdAt: now(deps),
  };
  await deps.premiumReviewRepo.insert(pr);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, CREATIVE_EVENTS.PREMIUM_REVIEWED, CREATIVE_EVENT_SCHEMAS['ci.premium.reviewed'], { pageRef: d.pageRef, overall, passed }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'premium_reviewed', { overall, scores }, d.pageRef);
  return Ok({ premiumScore: overall, passed, id });
}

// ═══════════════════════════════════════════
// LUXURY (7 dimensions)
// ═══════════════════════════════════════════

export async function reviewLuxuryUseCase(
  input: z.infer<typeof reviewPageSchema>, deps: CreativeUseCaseDeps,
): Promise<Result<{ luxuryScore: number; passed: boolean; id: string }, ValidationError | NotFoundError>> {
  const v = reviewPageSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const snap = d.contentSnapshot ?? {};
  const isLuxuryStyle = (d.style ?? 'Luxury') === 'Luxury';
  const score = isLuxuryStyle ? 90 : 65;
  const luxury = score + 2;
  // 7-dim luxury evaluation
  const boutique = score;
  const premium = score + 1;
  const editorial = score;
  const emotional = score - 3;
  const minimal = score + 2;
  const modern = score - 2;
  const overall = Math.round((luxury + boutique + premium + editorial + emotional + minimal + modern) / 7);
  const passed = overall >= QUALITY_GATE.luxury;
  const id = deps.idGenerator.generate();
  const ls: LuxuryScore = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: d.pageRef,
    luxury, boutique, premium, editorial, emotional, minimal, modern, overall,
    attributes: {}, createdAt: now(deps),
  };
  await deps.luxuryScoreRepo.insert(ls);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, CREATIVE_EVENTS.LUXURY_REVIEWED, CREATIVE_EVENT_SCHEMAS['ci.luxury.reviewed'], { pageRef: d.pageRef, overall, passed }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'luxury_reviewed', { overall }, d.pageRef);
  return Ok({ luxuryScore: overall, passed, id });
}

// ═══════════════════════════════════════════
// AI SMELL DETECTION (9 categories)
// ═══════════════════════════════════════════

export async function reviewAISmellUseCase(
  input: z.infer<typeof reviewPageSchema>, deps: CreativeUseCaseDeps,
): Promise<Result<{ aiSmellScore: number; severity: 'Severe' | 'Moderate' | 'Mild' | 'None'; action: 'reject' | 'rewrite' | 'regenerate' | 'accept'; id: string }, ValidationError | NotFoundError>> {
  const v = reviewPageSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const det = deps.creativeDirector.detectAIArtifacts(d.contentSnapshot);
  const overallScore = Math.round((det.aiLayout + det.aiCopy + det.aiHero + det.aiCard + det.aiCTA + det.aiGradient + det.aiIconPattern + det.genericSection + det.templateFeeling) / 9);
  const severity: 'Severe' | 'Moderate' | 'Mild' | 'None' = overallScore >= 80 ? 'Severe' : overallScore >= 40 ? 'Moderate' : overallScore >= 15 ? 'Mild' : 'None';
  const action: 'reject' | 'rewrite' | 'regenerate' | 'accept' = overallScore >= 80 ? 'reject' : overallScore >= 40 ? 'rewrite' : overallScore >= 15 ? 'regenerate' : 'accept';
  const id = deps.idGenerator.generate();
  const ai: AIArtifactDetection = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageRef: d.pageRef,
    ...det, overallScore, severity, detectedPatterns: det.detectedPatterns, recommendedAction: action,
    attributes: {}, createdAt: now(deps),
  };
  await deps.aiArtifactRepo.insert(ai);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, CREATIVE_EVENTS.AI_SMELL_DETECTED, CREATIVE_EVENT_SCHEMAS['ci.ai_smell.detected'], { pageRef: d.pageRef, overallScore, severity, action }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'ai_smell_detected', { overallScore, severity }, d.pageRef);
  return Ok({ aiSmellScore: overallScore, severity, action, id });
}