/**
 * Learning Engine — Pattern, Trend, Model, Confidence Use Cases
 *
 * learnSuccessPattern, learnFailurePattern, detectTrend, updateLearningModel, calculateConfidence,
 * getPattern, listPatterns, getTrend, listTrends
 */
import { Ok, Err, type Result, ValidationError, NotFoundError, z } from '@platform/core-sdk';
import { learnPatternSchema, detectTrendSchema, updateModelSchema } from '../domain/validation.js';
import { LEARNING_EVENTS, LEARNING_EVENT_SCHEMAS } from '../domain/events.js';
import { envelope, auditLog, updateMemory, createEvidence } from './helpers.js';
import type { LearningUseCaseDeps } from './types.js';
import type {
  LearningPattern, Trend, LearningModel, ConfidenceScore, PatternType, PatternCategory,
} from '../interfaces/index.js';

// ═══════════════════════════════════════════
// PATTERN LEARNING (2)
// ═══════════════════════════════════════════

export async function learnPatternUseCase(
  input: z.infer<typeof learnPatternSchema>, deps: LearningUseCaseDeps,
): Promise<Result<{ patternId: string; evidenceId: string }, ValidationError | NotFoundError>> {
  const v = learnPatternSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } })); const d = v.data;
  const p = await deps.learningRepo.findById(d.tenantId, d.projectId); if (!p) return Err(new NotFoundError('Project not found'));

  // Create evidence from observation
  const evidenceId = await createEvidence(deps, d.tenantId, d.projectId, 'observation', 'observation', d.observation, { category: d.category, impact: d.impact }, d.type === 'Success' ? 0.85 : 0.75);

  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  const pattern: LearningPattern = {
    id, tenantId: d.tenantId, projectId: d.projectId, type: d.type, category: d.category,
    name: d.name, description: d.description, observation: d.observation,
    evidenceIds: [evidenceId], confidence: d.type === 'Success' ? 0.85 : 0.75,
    impact: d.impact, frequency: d.frequency, applicableContexts: d.contexts,
    attributes: {}, createdAt: now, updatedAt: now,
  };
  await deps.patternRepo.insert(pattern);
  await deps.learningRepo.update(d.tenantId, d.projectId, { patternIds: [...p.patternIds, id] });

  // Update design memory if it's a design-related success
  if (d.type === 'Success' && (d.category === 'Design' || d.category === 'UX')) {
    await deps.memoryRepo.addDesignMemory(d.tenantId, d.projectId, {
      designType: d.category, description: d.description, qualityScore: d.impact, sourceRef: p.sourceRef,
    });
  }

  // Update statistics
  const stats = await deps.statisticsRepo.findByProject(d.tenantId, d.projectId);
  if (stats) {
    const allPatterns = await deps.patternRepo.findByProject(d.tenantId, d.projectId);
    await deps.statisticsRepo.upsert({ ...stats, totalPatterns: allPatterns.length, updatedAt: now });
  }

  const eventKey = LEARNING_EVENTS.PATTERN_LEARNED;
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, eventKey, LEARNING_EVENT_SCHEMAS['pattern.learned'], { patternId: id, type: d.type, category: d.category }));
  await auditLog(deps, p.organizationId, d.tenantId, d.actorId, d.correlationId, 'pattern_learned', { type: d.type, name: d.name }, d.projectId);
  await updateMemory(deps, d.tenantId, d.projectId, 'pattern', `Learned ${d.type} pattern: ${d.name}`);
  return Ok({ patternId: id, evidenceId });
}

export async function learnSuccessPatternUseCase(
  input: Omit<z.infer<typeof learnPatternSchema>, 'type'>, deps: LearningUseCaseDeps,
): Promise<Result<{ patternId: string; evidenceId: string }, ValidationError | NotFoundError>> {
  return learnPatternUseCase({ ...input, type: 'Success' as PatternType }, deps);
}

export async function learnFailurePatternUseCase(
  input: Omit<z.infer<typeof learnPatternSchema>, 'type'>, deps: LearningUseCaseDeps,
): Promise<Result<{ patternId: string; evidenceId: string }, ValidationError | NotFoundError>> {
  return learnPatternUseCase({ ...input, type: 'Failure' as PatternType }, deps);
}

// ═══════════════════════════════════════════
// TREND DETECTION (1)
// ═══════════════════════════════════════════

export async function detectTrendUseCase(
  input: z.infer<typeof detectTrendSchema>, deps: LearningUseCaseDeps,
): Promise<Result<{ trendIds: string[]; count: number }, ValidationError | NotFoundError>> {
  const v = detectTrendSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const p = await deps.learningRepo.findById(d.tenantId, d.projectId); if (!p) return Err(new NotFoundError('Project not found'));

  const trendResult = await deps.trendProvider.detectTrends(d.category, d.region);
  const trends = trendResult.ok ? trendResult.value.trends : [];
  const now = deps.clock.now().toISOString();
  const trendIds: string[] = [];

  for (const t of trends) {
    const id = deps.idGenerator.generate();
    const evidenceId = await createEvidence(deps, d.tenantId, d.projectId, d.region, 'benchmark', `Trend: ${t.name} going ${t.direction}`, { magnitude: t.magnitude, direction: t.direction }, t.confidence);
    const trend: Trend = {
      id, tenantId: d.tenantId, projectId: d.projectId, category: d.category,
      name: t.name, direction: t.direction, magnitude: t.magnitude, confidence: t.confidence,
      description: `${t.name} trend in ${d.category} for ${d.region}`, evidenceIds: [evidenceId], detectedAt: now,
    };
    await deps.trendRepo.insert(trend);
    trendIds.push(id);
  }
  await deps.learningRepo.update(d.tenantId, d.projectId, { trendIds: [...p.trendIds, ...trendIds] });

  await deps.eventBus.emit(envelope(deps, d.projectId, d.tenantId, d.correlationId, LEARNING_EVENTS.TREND_DETECTED, LEARNING_EVENT_SCHEMAS['trend.detected'], { count: trendIds.length }));
  await auditLog(deps, p.organizationId, d.tenantId, d.actorId, d.correlationId, 'trend_detected', { count: trendIds.length }, d.projectId);
  await updateMemory(deps, d.tenantId, d.projectId, 'trend', `Detected ${trendIds.length} trends in ${d.category}`);
  return Ok({ trendIds, count: trendIds.length });
}

// ═══════════════════════════════════════════
// LEARNING MODEL (1)
// ═══════════════════════════════════════════

export async function updateLearningModelUseCase(
  input: z.infer<typeof updateModelSchema>, deps: LearningUseCaseDeps,
): Promise<Result<{ modelId: string; accuracy: number; coverage: number }, ValidationError | NotFoundError>> {
  const v = updateModelSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const p = await deps.learningRepo.findById(d.tenantId, d.projectId); if (!p) return Err(new NotFoundError('Project not found'));

  const existing = await deps.modelRepo.findByCategory(d.tenantId, d.projectId, d.category);
  const patterns = await deps.patternRepo.findByCategory(d.tenantId, d.projectId, d.category);
  const version = existing ? existing.version + 1 : 1;
  const accuracy = patterns.length > 0 ? Math.min(100, Math.round(patterns.reduce((sum, pat) => sum + pat.confidence * 100, 0) / patterns.length)) : 0;
  const coverage = Math.min(100, patterns.length * 10);

  const id = existing ? existing.id : deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const model: LearningModel = {
    id, tenantId: d.tenantId, projectId: d.projectId, category: d.category, version,
    accuracy, coverage, patterns: patterns.map((pat) => pat.id), lastUpdated: now,
  };
  if (existing) {
    await deps.modelRepo.update(d.tenantId, id, { version, accuracy, coverage, patterns: model.patterns, lastUpdated: now });
  } else {
    await deps.modelRepo.insert(model);
  }

  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, LEARNING_EVENTS.PATTERN_UPDATED, LEARNING_EVENT_SCHEMAS['pattern.updated'], { modelId: id, version }));
  await auditLog(deps, p.organizationId, d.tenantId, d.actorId, d.correlationId, 'pattern_updated', { category: d.category, version }, d.projectId);
  await updateMemory(deps, d.tenantId, d.projectId, 'model', `Updated ${d.category} model v${version} (accuracy: ${accuracy}%)`);
  return Ok({ modelId: id, accuracy, coverage });
}

// ═══════════════════════════════════════════
// CONFIDENCE CALCULATION (1)
// ═══════════════════════════════════════════

export async function calculateConfidenceUseCase(
  input: { tenantId: string; projectId: string; ref?: string; refType?: string }, deps: LearningUseCaseDeps,
): Promise<Result<{ score: number; evidenceCount: number; factors: { name: string; weight: number; value: number }[] }, NotFoundError>> {
  const evidence = await deps.evidenceRepo.findByProject(input.tenantId, input.projectId);
  const patterns = await deps.patternRepo.findByProject(input.tenantId, input.projectId);

  if (evidence.length === 0 && patterns.length === 0) {
    return Ok({ score: 0, evidenceCount: 0, factors: [] });
  }

  const evidenceFactor = { name: 'evidence', weight: 0.4, value: Math.min(100, evidence.length * 10) };
  const patternFactor = { name: 'patterns', weight: 0.35, value: patterns.length > 0 ? Math.round(patterns.reduce((s, p) => s + p.confidence * 100, 0) / patterns.length) : 0 };
  const consistencyFactor = { name: 'consistency', weight: 0.25, value: evidence.length > 0 ? Math.round(evidence.reduce((s, e) => s + e.confidence * 100, 0) / evidence.length) : 0 };
  const factors = [evidenceFactor, patternFactor, consistencyFactor];
  const score = Math.round(factors.reduce((sum, f) => sum + f.value * f.weight, 0));

  const id = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const ref = input.ref ?? `project-${input.projectId}`;
  const refType = input.refType ?? 'project';
  const confScore: ConfidenceScore = {
    id, tenantId: input.tenantId, projectId: input.projectId, ref, refType,
    score, evidenceCount: evidence.length, factors, updatedAt: now,
  };
  await deps.confidenceRepo.upsert(confScore);

  await deps.eventBus.emit(envelope(deps, id, input.tenantId, '', LEARNING_EVENTS.CONFIDENCE_UPDATED, LEARNING_EVENT_SCHEMAS['confidence.updated'], { score, evidenceCount: evidence.length }));
  return Ok({ score, evidenceCount: evidence.length, factors });
}

// ═══════════════════════════════════════════
// PATTERN/TREND QUERIES (4)
// ═══════════════════════════════════════════

export async function getPatternUseCase(
  tenantId: string, patternId: string, deps: LearningUseCaseDeps,
): Promise<Result<LearningPattern, NotFoundError>> {
  const p = await deps.patternRepo.findById(tenantId, patternId);
  if (!p) return Err(new NotFoundError('Pattern not found'));
  return Ok(p);
}

export async function listPatternsUseCase(
  tenantId: string, projectId: string, deps: LearningUseCaseDeps,
): Promise<Result<LearningPattern[], NotFoundError>> {
  return Ok(await deps.patternRepo.findByProject(tenantId, projectId));
}

export async function getTrendUseCase(
  tenantId: string, trendId: string, deps: LearningUseCaseDeps,
): Promise<Result<Trend, NotFoundError>> {
  const t = await deps.trendRepo.findById(tenantId, trendId);
  if (!t) return Err(new NotFoundError('Trend not found'));
  return Ok(t);
}

export async function listTrendsUseCase(
  tenantId: string, projectId: string, deps: LearningUseCaseDeps,
): Promise<Result<Trend[], NotFoundError>> {
  return Ok(await deps.trendRepo.findByProject(tenantId, projectId));
}
