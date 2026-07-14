/**
 * Creative Knowledge Engine — Knowledge, Evidence, Recommendation, Memory Use Cases
 *
 * createKnowledge, updateKnowledge, searchKnowledge, recommendKnowledge,
 * generateRecommendations, generateGapAnalysis, generateEvidence, calculateConfidence,
 * updateResearchMemory, getResearchMemory, searchResearchHistory
 */
import { Ok, Err, type Result, ValidationError, ConflictError, NotFoundError, z } from '@platform/core-sdk';
import {
  createKnowledgeSchema, updateKnowledgeSchema, searchKnowledgeSchema,
  generateRecommendationsSchema, generateGapAnalysisSchema, generateEvidenceSchema,
} from '../domain/validation.js';
import { KNOWLEDGE_EVENTS, KNOWLEDGE_EVENT_SCHEMAS } from '../domain/events.js';
import { envelope, audit, updateMemory } from './helpers.js';
import type { KnowledgeUseCaseDeps } from './types.js';
import type {
  KnowledgeArticle, ResearchRecommendation, ResearchEvidence, GapAnalysis,
  ResearchMemory, Priority,
} from '../interfaces/index.js';

// ═══════════════════════════════════════════
// KNOWLEDGE MANAGEMENT (4)
// ═══════════════════════════════════════════

export async function createKnowledgeUseCase(
  input: z.infer<typeof createKnowledgeSchema>, deps: KnowledgeUseCaseDeps,
): Promise<Result<{ knowledgeId: string }, ValidationError | ConflictError>> {
  const v = createKnowledgeSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } })); const d = v.data;
  const existing = await deps.knowledgeRepo.findBySlug(d.tenantId, d.slug); if (existing) return Err(new ConflictError('slug exists'));

  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  const article: KnowledgeArticle = {
    id, tenantId: d.tenantId, title: d.title, slug: d.slug, category: d.category,
    tags: d.tags ?? [], content: d.content, sources: d.sources ?? [],
    confidence: d.confidence ?? 0.8, attributes: {}, createdAt: now, updatedAt: now,
  };
  await deps.knowledgeRepo.insert(article);

  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, KNOWLEDGE_EVENTS.KNOWLEDGE_CREATED, KNOWLEDGE_EVENT_SCHEMAS['knowledge.created'], { knowledgeId: id }));
  await audit(deps, '', d.tenantId, d.actorId, d.correlationId, 'knowledge_created', { title: d.title });
  return Ok({ knowledgeId: id });
}

export async function updateKnowledgeUseCase(
  input: z.infer<typeof updateKnowledgeSchema>, deps: KnowledgeUseCaseDeps,
): Promise<Result<{ knowledgeId: string }, ValidationError | NotFoundError>> {
  const v = updateKnowledgeSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const a = await deps.knowledgeRepo.findById(d.tenantId, d.knowledgeId); if (!a) return Err(new NotFoundError('Knowledge article not found'));

  const now = deps.clock.now().toISOString();
  const patch: Partial<KnowledgeArticle> = { updatedAt: now };
  if (d.title !== undefined) patch.title = d.title;
  if (d.content !== undefined) patch.content = d.content;
  if (d.tags !== undefined) patch.tags = d.tags;
  await deps.knowledgeRepo.update(d.tenantId, d.knowledgeId, patch);

  await deps.eventBus.emit(envelope(deps, d.knowledgeId, d.tenantId, d.correlationId, KNOWLEDGE_EVENTS.KNOWLEDGE_UPDATED, KNOWLEDGE_EVENT_SCHEMAS['knowledge.updated'], { knowledgeId: d.knowledgeId }));
  return Ok({ knowledgeId: d.knowledgeId });
}

export async function searchKnowledgeUseCase(
  input: z.infer<typeof searchKnowledgeSchema>, deps: KnowledgeUseCaseDeps,
): Promise<Result<{ results: KnowledgeArticle[]; total: number }, ValidationError>> {
  const v = searchKnowledgeSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const all = await deps.knowledgeRepo.findAll(d.tenantId);
  const q = d.query.toLowerCase();
  const results = all.filter((a) => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q) || a.tags.some((t) => t.toLowerCase().includes(q)))
    .slice(0, d.limit ?? 20);
  return Ok({ results, total: results.length });
}

export async function recommendKnowledgeUseCase(
  tenantId: string, projectId: string, deps: KnowledgeUseCaseDeps,
): Promise<Result<{ recommendations: { articleId: string; title: string; reason: string }[] }, NotFoundError>> {
  const p = await deps.researchRepo.findById(tenantId, projectId); if (!p) return Err(new NotFoundError('Project not found'));
  const all = await deps.knowledgeRepo.findAll(tenantId);
  const industryMatches = all.filter((a) => a.tags.includes(p.industry) || a.content.includes(p.industry));
  const recommendations = industryMatches.slice(0, 5).map((a) => ({ articleId: a.id, title: a.title, reason: `Relevant to industry: ${p.industry}` }));
  return Ok({ recommendations });
}

// ═══════════════════════════════════════════
// EVIDENCE (2)
// ═══════════════════════════════════════════

export async function generateEvidenceUseCase(
  input: z.infer<typeof generateEvidenceSchema>, deps: KnowledgeUseCaseDeps,
): Promise<Result<{ evidenceId: string }, ValidationError | NotFoundError>> {
  const v = generateEvidenceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const p = await deps.researchRepo.findById(d.tenantId, d.projectId); if (!p) return Err(new NotFoundError('Project not found'));

  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  const evidence: ResearchEvidence = {
    id, tenantId: d.tenantId, projectId: d.projectId, source: d.source, sourceType: d.sourceType,
    claim: d.claim, data: d.data, confidence: d.confidence, createdAt: now,
  };
  await deps.evidenceRepo.insert(evidence);
  await deps.researchRepo.update(d.tenantId, d.projectId, { evidenceIds: [...p.evidenceIds, id] });

  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, KNOWLEDGE_EVENTS.EVIDENCE_GENERATED, KNOWLEDGE_EVENT_SCHEMAS['evidence.generated'], { evidenceId: id }));
  await audit(deps, p.organizationId, d.tenantId, d.actorId, d.correlationId, 'evidence_generated', { claim: d.claim }, d.projectId);
  return Ok({ evidenceId: id });
}

export async function calculateConfidenceUseCase(
  input: { tenantId: string; projectId: string }, deps: KnowledgeUseCaseDeps,
): Promise<Result<{ overallConfidence: number; evidenceCount: number }, NotFoundError>> {
  const evidence = await deps.evidenceRepo.findByProject(input.tenantId, input.projectId);
  if (evidence.length === 0) return Ok({ overallConfidence: 0, evidenceCount: 0 });
  const overallConfidence = Math.round((evidence.reduce((sum, e) => sum + e.confidence, 0) / evidence.length) * 100) / 100;
  return Ok({ overallConfidence, evidenceCount: evidence.length });
}

// ═══════════════════════════════════════════
// RECOMMENDATIONS (2)
// ═══════════════════════════════════════════

export async function generateRecommendationsUseCase(
  input: z.infer<typeof generateRecommendationsSchema>, deps: KnowledgeUseCaseDeps,
): Promise<Result<{ recommendations: ResearchRecommendation[]; evidenceBacked: boolean }, ValidationError | NotFoundError>> {
  const v = generateRecommendationsSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const p = await deps.researchRepo.findById(d.tenantId, d.projectId); if (!p) return Err(new NotFoundError('Project not found'));

  // Gather audit results
  const audits = await deps.auditResultRepo.findByProject(d.tenantId, d.projectId);
  const evidence = await deps.evidenceRepo.findByProject(d.tenantId, d.projectId);
  const now = deps.clock.now().toISOString();

  const recs: ResearchRecommendation[] = [];
  for (const a of audits) {
    if (a.score < 80) {
      const relatedEvidence = evidence.filter((e) => e.sourceType === 'audit').map((e) => e.id);
      recs.push({
        id: deps.idGenerator.generate(), tenantId: d.tenantId, projectId: d.projectId,
        category: a.type === 'Performance' ? 'technical' : 'design',
        priority: a.score < 60 ? 'critical' : a.score < 75 ? 'high' : 'medium',
        title: `Improve ${a.type} score from ${a.score} to 90+`,
        description: a.recommendations.join('; '),
        evidenceIds: relatedEvidence, confidence: a.confidence,
        reason: `${a.type} audit scored ${a.score}/100 — below the 90-point quality threshold`,
        expectedImpact: Math.round((90 - a.score) * 1.2), createdAt: now,
      });
    }
  }

  // If no audits, generate from interview
  if (recs.length === 0) {
    recs.push({
      id: deps.idGenerator.generate(), tenantId: d.tenantId, projectId: d.projectId,
      category: 'strategy', priority: 'high',
      title: 'Conduct comprehensive website audit',
      description: 'Run all audit types to establish baseline scores',
      evidenceIds: evidence.map((e) => e.id), confidence: 0.9,
      reason: 'No audit data available — audits are required for evidence-based recommendations',
      expectedImpact: 25, createdAt: now,
    });
  }

  for (const r of recs) await deps.recommendationRepo.insert(r);

  await deps.eventBus.emit(envelope(deps, d.projectId, d.tenantId, d.correlationId, KNOWLEDGE_EVENTS.RECOMMENDATION_GENERATED, KNOWLEDGE_EVENT_SCHEMAS['recommendation.generated'], { count: recs.length, evidenceBacked: recs.every((r) => r.evidenceIds.length > 0) }));
  await audit(deps, p.organizationId, d.tenantId, d.actorId, d.correlationId, 'recommendation_generated', { count: recs.length }, d.projectId);
  await updateMemory(deps, d.tenantId, d.projectId, 'recommendations', `Generated ${recs.length} evidence-based recommendations`);
  return Ok({ recommendations: recs, evidenceBacked: recs.every((r) => r.evidenceIds.length > 0) });
}

export async function generateGapAnalysisUseCase(
  input: z.infer<typeof generateGapAnalysisSchema>, deps: KnowledgeUseCaseDeps,
): Promise<Result<{ gapAnalysisId: string; gap: number }, ValidationError | NotFoundError>> {
  const v = generateGapAnalysisSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const p = await deps.researchRepo.findById(d.tenantId, d.projectId); if (!p) return Err(new NotFoundError('Project not found'));

  // Calculate current scores from audits
  const audits = await deps.auditResultRepo.findByProject(d.tenantId, d.projectId);
  const benchmarks = await deps.benchmarkRepo.findByProject(d.tenantId, d.projectId);
  const now = deps.clock.now().toISOString();

  const currentScore = audits.length > 0 ? Math.round(audits.reduce((sum, a) => sum + a.score, 0) / audits.length) : 0;
  const benchmarkScore = benchmarks.length > 0 ? Math.round(benchmarks.reduce((sum, b) => sum + Math.round(Object.values(b.scores).reduce((a, c) => a + c, 0) / Object.values(b.scores).length), 0) / benchmarks.length) : 92;
  const gap = benchmarkScore - currentScore;

  const gaps = audits.map((a) => {
    const benchmarkAvg = 92;
    const areaGap = benchmarkAvg - a.score;
    return { area: a.type, current: a.score, benchmark: benchmarkAvg, gap: areaGap, priority: (areaGap > 30 ? 'critical' : areaGap > 15 ? 'high' : 'medium') as Priority };
  });

  const analysis: GapAnalysis = {
    id: deps.idGenerator.generate(), tenantId: d.tenantId, projectId: d.projectId,
    currentScore, benchmarkScore, gap, gaps,
    recommendations: gaps.filter((g) => g.gap > 0).map((g) => `Close ${g.area} gap: ${g.current} → ${g.benchmark}`),
    createdAt: now,
  };
  await deps.gapAnalysisRepo.insert(analysis);
  await updateMemory(deps, d.tenantId, d.projectId, 'gap-analysis', `Gap analysis: current=${currentScore}, benchmark=${benchmarkScore}, gap=${gap}`);
  return Ok({ gapAnalysisId: analysis.id, gap });
}

// ═══════════════════════════════════════════
// RESEARCH MEMORY (3)
// ═══════════════════════════════════════════

export async function getResearchMemoryUseCase(
  tenantId: string, projectId: string, deps: KnowledgeUseCaseDeps,
): Promise<Result<ResearchMemory, NotFoundError>> {
  const mem = await deps.memoryRepo.findByProject(tenantId, projectId);
  if (!mem) return Err(new NotFoundError('Research memory not found'));
  return Ok(mem);
}

export async function updateResearchMemoryUseCase(
  input: { tenantId: string; projectId: string; action: string; summary: string }, deps: KnowledgeUseCaseDeps,
): Promise<Result<{ updated: boolean }, NotFoundError>> {
  const p = await deps.researchRepo.findById(input.tenantId, input.projectId); if (!p) return Err(new NotFoundError('Project not found'));
  await updateMemory(deps, input.tenantId, input.projectId, input.action, input.summary);
  return Ok({ updated: true });
}

export async function searchResearchHistoryUseCase(
  tenantId: string, projectId: string, query: string, deps: KnowledgeUseCaseDeps,
): Promise<Result<{ results: { action: string; summary: string; timestamp: string }[] }, NotFoundError>> {
  const mem = await deps.memoryRepo.findByProject(tenantId, projectId);
  if (!mem) return Err(new NotFoundError('Research memory not found'));
  const q = query.toLowerCase();
  const results = mem.history.filter((h) => h.action.toLowerCase().includes(q) || h.summary.toLowerCase().includes(q));
  return Ok({ results });
}
