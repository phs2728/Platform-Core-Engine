/**
 * Component Engine — Intelligence & Marketplace Use Cases
 *
 * Learning, Analytics, Recommendation, Marketplace, Report
 */
import { Ok, Err, type Result, ValidationError, NotFoundError, z } from '@platform/core-sdk';
import {
  registerMarketplaceSchema, installMarketplaceSchema, recordOutcomeSchema,
} from '../domain/validation.js';
import { COMPONENT_EVENTS, COMPONENT_EVENT_SCHEMAS } from '../domain/events.js';
import { envelope, auditLog } from './helpers.js';
import type { ComponentUseCaseDeps } from './types.js';
import type {
  ExperienceComponent, MarketplaceEntry, MarketplaceTier,
} from '../interfaces/index.js';

// ═══════════════════════════════════════════
// LEARNING (2)
// ═══════════════════════════════════════════

export async function learnComponentUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; componentId: string },
  deps: ComponentUseCaseDeps,
): Promise<Result<{ componentId: string; patternId: string | null; confidence: number }, NotFoundError>> {
  const c = await deps.componentRepo.findById(input.tenantId, input.componentId);
  if (!c) return Err(new NotFoundError('Component not found'));
  // get outcome from learning provider
  const outcomeResult = await deps.learningProvider.getComponentOutcome(input.tenantId, input.componentId);
  let confidence = 0;
  let patternId: string | null = null;
  if (outcomeResult.ok) {
    confidence = outcomeResult.value.userSatisfaction;
  }
  // also check learning plugin for patterns
  const learnResult = await deps.learningPluginProvider.learn({
    componentId: input.componentId,
    outcome: confidence >= 70 ? 'success' : 'failure',
    context: { conversionRate: outcomeResult.ok ? outcomeResult.value.conversionRate : 0 },
  });
  if (learnResult.ok) {
    patternId = learnResult.value.patternId;
    confidence = Math.max(confidence, learnResult.value.confidence);
  }
  await deps.eventBus.emit(envelope(deps, input.componentId, input.tenantId, input.correlationId, COMPONENT_EVENTS.COMPONENT_LEARNED, COMPONENT_EVENT_SCHEMAS['component.learned'], { componentId: input.componentId, patternId, confidence }));
  await auditLog(deps, c.organizationId, input.tenantId, input.actorId, input.correlationId, 'component_learned', { patternId, confidence }, input.componentId);
  return Ok({ componentId: input.componentId, patternId, confidence });
}

export async function recordComponentOutcomeUseCase(
  input: z.infer<typeof recordOutcomeSchema>, deps: ComponentUseCaseDeps,
): Promise<Result<{ componentId: string; recorded: boolean }, ValidationError | NotFoundError>> {
  const v = recordOutcomeSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const c = await deps.componentRepo.findById(d.tenantId, d.componentId);
  if (!c) return Err(new NotFoundError('Component not found'));
  // record via learning provider
  await deps.learningProvider.recordOutcome(d.tenantId, d.componentId, {
    componentId: d.componentId,
    conversionRate: d.outcome === 'success' ? 75 : 20,
    userSatisfaction: d.outcome === 'success' ? 85 : 40,
    usageCount: 1,
  });
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'component_learned', { outcome: d.outcome }, d.componentId);
  return Ok({ componentId: d.componentId, recorded: true });
}

// ═══════════════════════════════════════════
// ANALYTICS & RECOMMENDATION (3)
// ═══════════════════════════════════════════

export async function recommendComponentUseCase(
  input: { tenantId: string; industry: string; experience: string; style: string },
  deps: ComponentUseCaseDeps,
): Promise<Result<{ componentId: string; confidence: number; reason: string } | null, NotFoundError>> {
  const aiResult = await deps.aiProvider.recommendComponent(input.tenantId, {
    industry: input.industry, experience: input.experience, style: input.style,
  });
  if (aiResult.ok) {
    return Ok({ componentId: aiResult.value.componentId, confidence: aiResult.value.confidence, reason: aiResult.value.reason });
  }
  // fallback: search for matching components
  const searchResult = await deps.searchProvider.searchComponents(input.tenantId, `${input.experience} ${input.style}`);
  if (searchResult.ok && searchResult.value.length > 0) {
    const best = searchResult.value[0]!;
    return Ok({ componentId: best.componentId, confidence: best.score / 100, reason: `Best match for ${input.experience}` });
  }
  return Ok(null);
}

export async function findBestComponentUseCase(
  input: { tenantId: string; componentType: string; limit?: number },
  deps: ComponentUseCaseDeps,
): Promise<Result<ExperienceComponent[], NotFoundError>> {
  const components = await deps.componentRepo.findByType(input.tenantId, input.componentType);
  // sort by score (if available) then by name
  const withScores = await Promise.all(
    components.map(async c => {
      const score = await deps.scoreRepo.findByComponent(input.tenantId, c.id);
      return { component: c, overall: score?.overall ?? 0 };
    }),
  );
  withScores.sort((a, b) => b.overall - a.overall);
  const limit = input.limit ?? 10;
  return Ok(withScores.slice(0, limit).map(ws => ws.component));
}

export async function generateComponentReportUseCase(
  input: { tenantId: string; componentId: string },
  deps: ComponentUseCaseDeps,
): Promise<Result<ComponentReport, NotFoundError>> {
  const c = await deps.componentRepo.findById(input.tenantId, input.componentId);
  if (!c) return Err(new NotFoundError('Component not found'));
  const variants = await deps.variantRepo.findByComponent(input.tenantId, input.componentId);
  const presets = await deps.presetRepo.findByComponent(input.tenantId, input.componentId);
  const states = await deps.stateRepo.findByComponent(input.tenantId, input.componentId);
  const animations = await deps.animationRepo.findByComponent(input.tenantId, input.componentId);
  const behaviors = await deps.behaviorRepo.findByComponent(input.tenantId, input.componentId);
  const score = await deps.scoreRepo.findByComponent(input.tenantId, input.componentId);
  const reviews = await deps.reviewRepo.findByComponent(input.tenantId, input.componentId);
  const compositions = await deps.compositionRepo.findByComponent(input.tenantId, input.componentId);
  const versions = await deps.versionRepo.findByComponent(input.tenantId, input.componentId);
  const marketplace = await deps.marketplaceRepo.findByComponent(input.tenantId, input.componentId);

  return Ok({
    component: c,
    variantCount: variants.length,
    presetCount: presets.length,
    stateCount: states.length,
    animationCount: animations.length,
    behaviorCount: behaviors.length,
    compositionCount: compositions.length,
    versionCount: versions.length,
    score: score?.overall ?? null,
    meetsThreshold: score?.meetsThreshold ?? false,
    reviewCount: reviews.length,
    reviewStatus: reviews.length > 0 ? reviews[reviews.length - 1]!.status : 'Pending',
    marketplaceTier: marketplace?.tier ?? c.marketplaceTier,
    marketplaceVerified: marketplace?.verified ?? false,
  });
}

export interface ComponentReport {
  component: ExperienceComponent;
  variantCount: number;
  presetCount: number;
  stateCount: number;
  animationCount: number;
  behaviorCount: number;
  compositionCount: number;
  versionCount: number;
  score: number | null;
  meetsThreshold: boolean;
  reviewCount: number;
  reviewStatus: string;
  marketplaceTier: MarketplaceTier;
  marketplaceVerified: boolean;
}

// ═══════════════════════════════════════════
// MARKETPLACE (3)
// ═══════════════════════════════════════════

export async function registerMarketplaceComponentUseCase(
  input: z.infer<typeof registerMarketplaceSchema>, deps: ComponentUseCaseDeps,
): Promise<Result<{ marketplaceId: string; tier: MarketplaceTier }, ValidationError | NotFoundError>> {
  const v = registerMarketplaceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const c = await deps.componentRepo.findById(d.tenantId, d.componentId);
  if (!c) return Err(new NotFoundError('Component not found'));
  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  // get score for quality rating
  const score = await deps.scoreRepo.findByComponent(d.tenantId, d.componentId);
  const qualityScore = score?.overall ?? 0;
  const entry: MarketplaceEntry = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, componentId: d.componentId,
    tier: d.tier, name: d.name, description: d.description, version: c.version,
    qualityScore, downloadCount: 0, usageCount: 0, compatibilityInfo: d.compatibilityInfo,
    verified: d.tier === 'Official', attributes: {}, createdAt: now, updatedAt: now,
  };
  await deps.marketplaceRepo.insert(entry);
  await deps.componentRepo.update(d.tenantId, d.componentId, { marketplaceTier: d.tier, updatedAt: now });
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, COMPONENT_EVENTS.COMPONENT_MARKETPLACE_REGISTERED, COMPONENT_EVENT_SCHEMAS['component.marketplace.registered'], { marketplaceId: id, tier: d.tier }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'marketplace_registered', { tier: d.tier, name: d.name }, d.componentId);
  return Ok({ marketplaceId: id, tier: d.tier });
}

export async function installMarketplaceComponentUseCase(
  input: z.infer<typeof installMarketplaceSchema>, deps: ComponentUseCaseDeps,
): Promise<Result<{ componentId: string; installed: boolean }, ValidationError | NotFoundError>> {
  const v = installMarketplaceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const entry = await deps.marketplaceRepo.findById(d.tenantId, d.marketplaceId);
  if (!entry) return Err(new NotFoundError('Marketplace entry not found'));
  // increment download count
  await deps.marketplaceRepo.update(d.tenantId, d.marketplaceId, {
    downloadCount: entry.downloadCount + 1, updatedAt: deps.clock.now().toISOString(),
  });
  return Ok({ componentId: entry.componentId, installed: true });
}

export async function listMarketplaceComponentsUseCase(
  tenantId: string, tier: MarketplaceTier | 'all', deps: ComponentUseCaseDeps,
): Promise<Result<MarketplaceEntry[], NotFoundError>> {
  if (tier === 'all') {
    return Ok(await deps.marketplaceRepo.findAll(tenantId));
  }
  return Ok(await deps.marketplaceRepo.findByTier(tenantId, tier));
}
