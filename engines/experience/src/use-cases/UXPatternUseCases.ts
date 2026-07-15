/**
 * Experience Engine — UX Pattern Use Cases (Search Experience, Personalization, Patterns, Validate, Score, Recommend)
 *
 * 10 use cases. Reconstructed under Recovery Authorization
 * EXP-RECOVERY-001.
 */
import { Ok, Err, type Result, ValidationError, NotFoundError, z } from '@platform/core-sdk';
import {
  validateExperienceUseCaseSchema, calculateUXScoreUseCaseSchema, recommendExperienceUseCaseSchema,
  createSearchExperienceSchema, updateSearchExperienceSchema, publishSearchExperienceSchema,
  createPersonalizationSchema, updatePersonalizationSchema,
  registerPatternSchema, publishPatternSchema, clonePatternSchema,
} from '../domain/validation.js';
import { EXPERIENCE_EVENTS, EXPERIENCE_EVENT_SCHEMAS } from '../domain/events.js';
import { envelope, auditLog } from './helpers.js';
import type { ExperienceUseCaseDeps } from './types.js';
import type { SearchExperience, PersonalizationProfile, UXPattern, UXScore, RecommendationResult } from '../interfaces/index.js';

export async function validateExperienceUseCase(
  input: z.infer<typeof validateExperienceUseCaseSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ valid: boolean; errors: string[] }, ValidationError | NotFoundError>> {
  const v = validateExperienceUseCaseSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const exp = await deps.experienceRepo.findById(d.tenantId, d.experienceId);
  if (!exp) return Err(new NotFoundError('Experience not found'));
  const errors: string[] = [];
  if (!exp.name) errors.push('name is required');
  if (!exp.layoutRefs || exp.layoutRefs.length === 0) errors.push('at least one layout is required');
  if (exp.type === 'Landing' && (!exp.heroRefs || exp.heroRefs.length === 0)) errors.push('Landing requires at least one hero');
  await deps.eventBus.emit(envelope(deps, d.experienceId, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.UX_VALIDATED, EXPERIENCE_EVENT_SCHEMAS['ux.validated'],
    { experienceId: d.experienceId, valid: errors.length === 0 }));
  return Ok({ valid: errors.length === 0, errors });
}

export async function calculateUXScoreUseCase(
  input: z.infer<typeof calculateUXScoreUseCaseSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<UXScore, ValidationError | NotFoundError>> {
  const v = calculateUXScoreUseCaseSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const exp = await deps.experienceRepo.findById(d.tenantId, d.experienceId);
  if (!exp) return Err(new NotFoundError('Experience not found'));
  const id = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const categoryScores = {
    layout: exp.layoutRefs.length > 0 ? 100 : 0,
    hero: (exp.heroRefs?.length ?? 0) > 0 ? 100 : 0,
    banner: (exp.bannerRefs?.length ?? 0) > 0 ? 100 : 0,
    navigation: (exp.navigationRefs?.length ?? 0) > 0 ? 100 : 0,
    dashboard: (exp.dashboardRefs?.length ?? 0) > 0 ? 100 : 0,
    personalization: (exp.personalizationProfileRefs?.length ?? 0) > 0 ? 100 : 0,
  };
  const overallScore = Math.round(Object.values(categoryScores).reduce((a, b) => a + b, 0) / Object.keys(categoryScores).length);
  const score: UXScore = {
    id, tenantId: d.tenantId, organizationId: exp.organizationId,
    experienceId: d.experienceId, overallScore, categoryScores, computedAt: now,
  };
  await deps.uxScoreRepo.insert(score);
  await deps.eventBus.emit(envelope(deps, d.experienceId, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.UX_SCORED, EXPERIENCE_EVENT_SCHEMAS['ux.scored'],
    { experienceId: d.experienceId, overallScore }));
  return Ok(score);
}

export async function recommendExperienceUseCase(
  input: z.infer<typeof recommendExperienceUseCaseSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<RecommendationResult, ValidationError | NotFoundError>> {
  const v = recommendExperienceUseCaseSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const exp = await deps.experienceRepo.findById(d.tenantId, d.experienceId);
  if (!exp) return Err(new NotFoundError('Experience not found'));
  const rec = await deps.aiEngine.recommend(d.tenantId, d.experienceId, { type: exp.type });
  if (!rec.ok) return Err(new ValidationError('AI recommendation failed'));
  return Ok(rec.value);
}

// ── SEARCH EXPERIENCE ──
export async function createSearchExperienceUseCase(
  input: z.infer<typeof createSearchExperienceSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ searchExperienceId: string; createdAt: string }, ValidationError>> {
  const v = createSearchExperienceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const id = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const se: SearchExperience = {
    id, tenantId: d.tenantId, organizationId: d.organizationId,
    name: d.name, layoutRef: d.layoutRef, features: d.features,
    status: 'Draft', attributes: d.attributes, metadata: d.metadata,
    createdAt: now, updatedAt: now,
  };
  await deps.searchExperienceRepo.insert(se);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.SEARCH_EXPERIENCE_CREATED, EXPERIENCE_EVENT_SCHEMAS['searchExperience.created'],
    { searchExperienceId: id }));
  return Ok({ searchExperienceId: id, createdAt: now });
}

export async function updateSearchExperienceUseCase(
  input: z.infer<typeof updateSearchExperienceSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ searchExperienceId: string; updatedAt: string }, ValidationError | NotFoundError>> {
  const v = updateSearchExperienceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const se = await deps.searchExperienceRepo.findById(d.tenantId, d.searchExperienceId);
  if (!se) return Err(new NotFoundError('SearchExperience not found'));
  const now = deps.clock.now().toISOString();
  const patch: Partial<SearchExperience> = { updatedAt: now };
  if (d.name !== undefined) patch.name = d.name;
  if (d.layoutRef !== undefined) patch.layoutRef = d.layoutRef;
  if (d.features !== undefined) patch.features = d.features;
  if (d.attributes !== undefined) patch.attributes = d.attributes;
  if (d.metadata !== undefined) patch.metadata = d.metadata;
  await deps.searchExperienceRepo.update(d.tenantId, d.searchExperienceId, patch);
  await deps.eventBus.emit(envelope(deps, d.searchExperienceId, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.SEARCH_EXPERIENCE_UPDATED, EXPERIENCE_EVENT_SCHEMAS['searchExperience.updated'],
    { searchExperienceId: d.searchExperienceId }));
  return Ok({ searchExperienceId: d.searchExperienceId, updatedAt: now });
}

export async function publishSearchExperienceUseCase(
  input: z.infer<typeof publishSearchExperienceSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ searchExperienceId: string; publishedAt: string }, ValidationError | NotFoundError>> {
  const v = publishSearchExperienceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const se = await deps.searchExperienceRepo.findById(d.tenantId, d.searchExperienceId);
  if (!se) return Err(new NotFoundError('SearchExperience not found'));
  const now = deps.clock.now().toISOString();
  await deps.searchExperienceRepo.publish(d.tenantId, d.searchExperienceId);
  await deps.searchExperienceRepo.update(d.tenantId, d.searchExperienceId, { status: 'Published', publishedAt: now, updatedAt: now });
  await deps.eventBus.emit(envelope(deps, d.searchExperienceId, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.SEARCH_EXPERIENCE_PUBLISHED, EXPERIENCE_EVENT_SCHEMAS['searchExperience.published'],
    { searchExperienceId: d.searchExperienceId }));
  return Ok({ searchExperienceId: d.searchExperienceId, publishedAt: now });
}

// ── PERSONALIZATION ──
export async function createPersonalizationUseCase(
  input: z.infer<typeof createPersonalizationSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ personalizationId: string; createdAt: string }, ValidationError>> {
  const v = createPersonalizationSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const id = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const p: PersonalizationProfile = {
    id, tenantId: d.tenantId, organizationId: d.organizationId,
    name: d.name, rules: d.rules,
    attributes: d.attributes, metadata: d.metadata,
    createdAt: now, updatedAt: now,
  };
  await deps.personalizationRepo.insert(p);
  return Ok({ personalizationId: id, createdAt: now });
}

export async function updatePersonalizationUseCase(
  input: z.infer<typeof updatePersonalizationSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ personalizationId: string; updatedAt: string }, ValidationError | NotFoundError>> {
  const v = updatePersonalizationSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const p = await deps.personalizationRepo.findById(d.tenantId, d.personalizationId);
  if (!p) return Err(new NotFoundError('PersonalizationProfile not found'));
  const now = deps.clock.now().toISOString();
  const patch: Partial<PersonalizationProfile> = { updatedAt: now };
  if (d.name !== undefined) patch.name = d.name;
  if (d.rules !== undefined) patch.rules = d.rules;
  if (d.attributes !== undefined) patch.attributes = d.attributes;
  if (d.metadata !== undefined) patch.metadata = d.metadata;
  await deps.personalizationRepo.update(d.tenantId, d.personalizationId, patch);
  return Ok({ personalizationId: d.personalizationId, updatedAt: now });
}

// ── PATTERNS ──
export async function registerPatternUseCase(
  input: z.infer<typeof registerPatternSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ patternId: string; createdAt: string }, ValidationError>> {
  const v = registerPatternSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const id = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const p: UXPattern = {
    id, tenantId: d.tenantId, organizationId: d.organizationId,
    name: d.name, category: d.category, reference: d.reference,
    description: d.description, industryTags: d.industryTags ?? [],
    status: 'Draft', attributes: d.attributes, metadata: d.metadata,
    createdAt: now, updatedAt: now,
  };
  await deps.patternRepo.insert(p);
  return Ok({ patternId: id, createdAt: now });
}

export async function publishPatternUseCase(
  input: z.infer<typeof publishPatternSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ patternId: string; publishedAt: string }, ValidationError | NotFoundError>> {
  const v = publishPatternSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const p = await deps.patternRepo.findById(d.tenantId, d.patternId);
  if (!p) return Err(new NotFoundError('Pattern not found'));
  const now = deps.clock.now().toISOString();
  await deps.patternRepo.publish(d.tenantId, d.patternId);
  await deps.patternRepo.update(d.tenantId, d.patternId, { status: 'Published', publishedAt: now, updatedAt: now });
  await deps.eventBus.emit(envelope(deps, d.patternId, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.PATTERN_PUBLISHED, EXPERIENCE_EVENT_SCHEMAS['pattern.published'], { patternId: d.patternId }));
  return Ok({ patternId: d.patternId, publishedAt: now });
}

export async function clonePatternUseCase(
  input: z.infer<typeof clonePatternSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ pattern: UXPattern }, ValidationError | NotFoundError>> {
  const v = clonePatternSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const cloned = await deps.patternRepo.clone(d.tenantId, d.sourcePatternId, d.newName);
  await deps.eventBus.emit(envelope(deps, cloned.id, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.PATTERN_CLONED, EXPERIENCE_EVENT_SCHEMAS['pattern.cloned'],
    { patternId: cloned.id, sourcePatternId: d.sourcePatternId }));
  return Ok({ pattern: cloned });
}


/* =====================================================================
 *  EXPERIENCE ENGINE EVOLUTION RC1 — Use-Case Additions
 *
 *  All existing exports preserved verbatim.
 *  RC1 appends:
 *    1. experienceReviewUseCase — runs the 7-question 사장님 review
 *    2. headerJourneyResolveUseCase — JourneyState → HeaderProfile
 *    3. intentDrivenSearchUseCase — SearchIntent → IndustryAgnostic search
 *    4. learningLoopRegisterUseCase — register WHY-it-works observations
 *    5. applyLearningLoopToReviewUseCase — apply registered observations
 *
 *  No new files. No new use-case files. Append-only.
 * ===================================================================== */

import type {
  ExperienceReview,
  ExperienceReviewQuestion,
  ExperienceReviewAnswer,
  ExperienceContext,
  TrustInventory,
  StorytellingScrollSection,
  CTA,
  JourneyState,
  HeaderProfile,
  HeaderAction,
  IntentDrivenSearchExperience,
  SearchField,
  SearchIntentKind,
  LearningObservation,
  LearningLoopRegistry,
  LearningExtractionKind,
  ExperiencePrinciple,
} from '../interfaces/index.js';

/* ----------------------------------------------------------------- */
/* Experience Review — 7 questions from 사장님                       */
/* ----------------------------------------------------------------- */

export async function experienceReviewUseCase(input: {
  pageId: string;
  context: ExperienceContext;
  primaryCTA?: CTA | undefined;
  trustInventory?: TrustInventory | undefined;
  scrollOrder?: readonly StorytellingScrollSection[] | undefined;
  visibleFieldCount: number;
  totalFieldCount: number;
  hasMotion: boolean;
  hasWhitespace: boolean;
  mobileOptimized: boolean;
  reviewsRendered: number;
}): Promise<ExperienceReview> {
  // Delegate to the runtime helper (interfaces/index.ts).
  const { runExperienceReview } = await import('../interfaces/index.js');
  return runExperienceReview(input);
}

/* ----------------------------------------------------------------- */
/* Header Journey Resolver                                           */
/* ----------------------------------------------------------------- */

export async function headerJourneyResolveUseCase(input: {
  journeyState: JourneyState;
  tenantOverride?: Partial<Record<JourneyState, HeaderProfile>> | undefined;
}): Promise<HeaderProfile> {
  const { resolveHeaderForJourney, DEFAULT_HEADER_JOURNEY_MAP } = await import('../interfaces/index.js');
  // Default fallback to canonical map; tenant override layered on top.
  const fallback = DEFAULT_HEADER_JOURNEY_MAP[input.journeyState];
  if (!input.tenantOverride || !input.tenantOverride[input.journeyState]) {
    return fallback;
  }
  return { ...fallback, ...input.tenantOverride[input.journeyState]! };
}

/* ----------------------------------------------------------------- */
/* Intent-Driven Search Resolver                                       */
/* ----------------------------------------------------------------- */

export async function intentDrivenSearchUseCase(input: {
  intent: SearchIntentKind;
  tenantConfig: IntentDrivenSearchExperience;
}): Promise<IntentDrivenSearchExperience> {
  const { resolveSearchIntent } = await import('../interfaces/index.js');
  return resolveSearchIntent(input);
}

/**
 * buildTenantSearchConfig — convenience helper. Constructs the
 *   IndustryAgnostic SearchExperience from a tenant's intent-specific
 *   field list. The engine never hardcodes field sets — the tenant
 *   provides them via ConfigurationDrivenHeaderMap-equivalent.
 */
export function buildTenantSearchConfig(input: {
  id: string;
  tenantId: string;
  intentKind: SearchIntentKind;
  fields: readonly SearchField[];
  layout?: IntentDrivenSearchExperience['layout'];
  behavior?: IntentDrivenSearchExperience['behavior'];
  resultsLayout?: IntentDrivenSearchExperience['resultsLayout'];
}): IntentDrivenSearchExperience {
  return {
    id: input.id,
    tenantId: input.tenantId,
    intentKind: input.intentKind,
    fields: input.fields,
    layout: input.layout ?? 'inline',
    behavior: input.behavior ?? 'hybrid',
    resultsLayout: input.resultsLayout ?? 'list',
    facets: [],
  };
}

/* ----------------------------------------------------------------- */
/* Learning Loop — register + apply                                  */
/* ----------------------------------------------------------------- */

export async function learningLoopRegisterUseCase(
  input: LearningObservation,
  deps: { registry: LearningLoopRegistry },
): Promise<void> {
  await deps.registry.register(input);
}

export async function applyLearningLoopToReviewUseCase(input: {
  review: ExperienceReview;
  registry: LearningLoopRegistry;
}): Promise<ExperienceReview> {
  return input.registry.applyToReview(input.review);
}

export async function learningLoopListUseCase(input: {
  filter?: { kind?: LearningExtractionKind; mapsToPrinciple?: ExperiencePrinciple } | undefined;
  deps: { registry: LearningLoopRegistry };
}): Promise<readonly LearningObservation[]> {
  return input.deps.registry.list(input.filter);
}


/* =====================================================================
 *  EXPERIENCE ENGINE EVOLUTION RC1.5 — Use-Case Additions
 *
 *  3 new use-cases (사장님 verbatim final directive):
 *
 *    1. adaptiveExperienceResolverUseCase
 *       "Journey State + User Behavior → Experience"
 *
 *    2. intentPredictionUseCase
 *       "Search는 검색창이 아니라 Decision Assistant가 됩니다."
 *
 *    3. continuousExperienceLearningUseCase
 *       "World-class Products + Our Own Products → Experience Knowledge"
 *
 *  Plus: optimizeForUserSuccessUseCase (사장님 closing philosophy)
 *
 *  All existing baseline + RC1 use-cases preserved verbatim.
 *  No new files. Append-only.
 * ===================================================================== */

import type {
  AdaptiveExperienceProfile,
  UserBehaviorProfile,
  BehaviorSignal,
  IntentPredictionConfig,
  IntentPredictionResult,
  ContinuousExperienceLearningRegistry,
  ExperienceObservation,
  ExperienceKnowledge,
  UserSuccessCheckResult,
} from '../interfaces/index.js';

/* ----------------------------------------------------------------- */
/* 1. Adaptive Experience Resolver                                    */
/* ----------------------------------------------------------------- */

export async function adaptiveExperienceResolverUseCase(input: {
  journeyState: JourneyState;
  userBehavior: UserBehaviorProfile;
  baseHeaderProfile?: HeaderProfile | undefined;
  tenantConfig?: Partial<{
    firstVisitTrustEmphasis: number;
    returningTrustEmphasis: number;
    bookingHistoryTrustEmphasis: number;
    postStayTrustEmphasis: number;
  }> | undefined;
}): Promise<AdaptiveExperienceProfile> {
  const { resolveAdaptiveExperience } = await import('../interfaces/index.js');
  return resolveAdaptiveExperience(input);
}

/**
 * applyBehaviorSignal — append a single BehaviorSignal to the user's
 *   behavior profile in real time. Updates visit count / scroll depth /
 *   avg time on page / current intent heuristically.
 */
export function applyBehaviorSignal(
  profile: UserBehaviorProfile,
  signal: BehaviorSignal,
): UserBehaviorProfile {
  // Visit count
  let visitCount = profile.visitCount;
  if (signal.kind === 'visit') {
    visitCount += 1;
  }
  // Search history
  let searchHistory = profile.searchHistory ?? [];
  if (signal.kind === 'search' && typeof signal.value === 'string') {
    searchHistory = [...searchHistory, { query: signal.value, at: signal.at }];
  }
  // Avg scroll depth
  let avgScrollDepth = profile.avgScrollDepth;
  if (signal.kind === 'scroll' && typeof signal.value === 'number') {
    avgScrollDepth = ((profile.avgScrollDepth ?? 0) * profile.visitCount + signal.value)
      / Math.max(1, profile.visitCount);
  }
  // Avg time on page
  let avgTimeOnPageSec = profile.avgTimeOnPageSec;
  if (signal.kind === 'dwell' && typeof signal.value === 'number') {
    avgTimeOnPageSec = ((profile.avgTimeOnPageSec ?? 0) * profile.visitCount + signal.value)
      / Math.max(1, profile.visitCount);
  }
  // Intent inference — heuristic from signals
  let currentIntent: UserBehaviorProfile['currentIntent'] = profile.currentIntent;
  if (signal.kind === 'cta-click') currentIntent = 'ready-to-book';
  if (signal.kind === 'search' && (profile.searchHistory?.length ?? 0) >= 3) currentIntent = 'planning';
  if (signal.kind === 'booking') currentIntent = 'post-stay';
  // Trust tolerance — first-time = low, returning = high
  const trustTolerance: UserBehaviorProfile['trustTolerance'] =
    visitCount <= 1 ? 'low'
    : visitCount <= 3 ? 'medium'
    : 'high';

  return {
    ...profile,
    visitCount,
    bookingCount: signal.kind === 'booking' ? profile.bookingCount + 1 : profile.bookingCount,
    lastVisitedAt: signal.at,
    searchHistory,
    avgScrollDepth,
    avgTimeOnPageSec,
    currentIntent,
    trustTolerance,
  };
}

/* ----------------------------------------------------------------- */
/* 2. Intent Prediction (Decision Assistant)                          */
/* ----------------------------------------------------------------- */

export async function intentPredictionUseCase(input: {
  query: string;
  config: IntentPredictionConfig;
}): Promise<IntentPredictionResult> {
  const { predictIntent } = await import('../interfaces/index.js');
  return predictIntent(input);
}

/**
 * buildEnvoyIntentPredictionConfig — 사장님 verbatim example.
 *   "Hostel에서 Kazbegi 검색 시 Rooms / Tours / Transportation / Blog / Guide를 함께 제안."
 *
 *   Reference example for Envoy Hostel + Tours. Tenants supply their
 *   own vocabulary entries; the engine never hardcodes.
 */
export function buildEnvoyIntentPredictionConfig(input: {
  id: string;
  tenantId: string;
}): IntentPredictionConfig {
  // Reference configuration — tenants customize per their catalog.
  return {
    id: input.id,
    tenantId: input.tenantId,
    vocabulary: [
      {
        query: 'Kazbegi',
        queryAliases: ['Kazbegi Day Trip', 'Mt. Kazbegi', 'Stepantsminda'],
        intentKinds: ['accommodation-search', 'experience-search', 'transportation-search', 'guide-search'],
        suggestions: [
          { kind: 'accommodation-search', label: 'Rooms in Kazbegi', href: '/search?destination=kazbegi&type=rooms', rationale: 'Accommodation in your destination' },
          { kind: 'experience-search', label: 'Kazbegi Day Trip', href: '/tours/kazbegi-day-trip', rationale: 'Most popular tour to this destination' },
          { kind: 'transportation-search', label: 'How to get to Kazbegi', href: '/guide/kazbegi-transport', rationale: 'Transport options to Kazbegi' },
          { kind: 'guide-search', label: 'Kazbegi Travel Guide', href: '/blog/kazbegi-guide', rationale: 'Local-written travel guide' },
        ],
        confidence: 0.95,
      },
    ],
    defaultSuggestions: [],
    confidenceThreshold: 0.5,
  };
}

/* ----------------------------------------------------------------- */
/* 3. Continuous Experience Learning (world-class + our own)          */
/* ----------------------------------------------------------------- */

export async function continuousExperienceLearningCaptureUseCase(
  observation: ExperienceObservation,
  deps: { registry: ContinuousExperienceLearningRegistry },
): Promise<void> {
  await deps.registry.captureObservation(observation);
}

export async function continuousExperienceLearningListUseCase(input: {
  tenantId: string;
  filter?: { axis?: ExperienceObservation['axis']; pageId?: string; since?: string } | undefined;
}, deps: { registry: ContinuousExperienceLearningRegistry }): Promise<readonly ExperienceObservation[]> {
  return deps.registry.listObservations({
    tenantId: input.tenantId,
    ...input.filter,
  });
}

export async function continuousExperienceLearningComputeUseCase(input: {
  tenantId: string;
  axis: ExperienceObservation['axis'];
}, deps: { registry: ContinuousExperienceLearningRegistry }): Promise<ExperienceKnowledge | null> {
  return deps.registry.computeKnowledge(input);
}

export async function continuousExperienceLearningApplyUseCase(input: {
  profile: AdaptiveExperienceProfile;
}, deps: { registry: ContinuousExperienceLearningRegistry }): Promise<AdaptiveExperienceProfile> {
  return deps.registry.applyToAdaptiveProfile(input.profile);
}

/* ----------------------------------------------------------------- */
/* 4. Optimize For User Success (사장님 closing philosophy)          */
/* ----------------------------------------------------------------- */

export async function optimizeForUserSuccessUseCase(input: {
  profile: AdaptiveExperienceProfile;
  hasVisibleSearch: boolean;
  hasPrimaryCTA: boolean;
  trustInventory: TrustInventory;
  scrollDepthReached: number;
}): Promise<UserSuccessCheckResult> {
  const { checkOptimizeForUserSuccess } = await import('../interfaces/index.js');
  return checkOptimizeForUserSuccess(input);
}
