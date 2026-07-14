/**
 * Learning Engine — Recommendation, Design, Knowledge, Analytics, Memory Use Cases
 *
 * recordRecommendationResult, learnRecommendation, recommendImprovement,
 * learnDesign, learnUX, learnCopy, learnSearch,
 * updateKnowledge, evolveKnowledge, generateLearningReport, searchLearningMemory,
 * calculateLearningScore, calculateImprovementRate, generateTrendAnalysis,
 * getLearningMemory, updateLearningMemory, getLearningStatistics,
 * recordOutcome, getDesignMemory, getPersonalizationProfile
 */
import { Ok, Err, type Result, ValidationError, NotFoundError, z } from '@platform/core-sdk';
import {
  recordRecommendationSchema, learnRecommendationSchema, recommendImprovementSchema,
  learnDesignSchema, learnInsightSchema,
  updateKnowledgeSchema, evolveKnowledgeSchema, searchMemorySchema,
  calculateScoreSchema, trendAnalysisSchema, recordOutcomeSchema,
} from '../domain/validation.js';
import { LEARNING_EVENTS, LEARNING_EVENT_SCHEMAS } from '../domain/events.js';
import { envelope, auditLog, updateMemory, createEvidence } from './helpers.js';
import type { LearningUseCaseDeps } from './types.js';
import type {
  RecommendationFeedback, DesignInsight, UXInsight, CopyInsight, SearchInsight,
  KnowledgeEvolution, LearningStatistics, PatternCategory,
} from '../interfaces/index.js';

// ═══════════════════════════════════════════
// RECOMMENDATION FEEDBACK (3)
// ═══════════════════════════════════════════

export async function recordRecommendationResultUseCase(
  input: z.infer<typeof recordRecommendationSchema>, deps: LearningUseCaseDeps,
): Promise<Result<{ feedbackId: string; evidenceId: string }, ValidationError | NotFoundError>> {
  const v = recordRecommendationSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const p = await deps.learningRepo.findById(d.tenantId, d.projectId); if (!p) return Err(new NotFoundError('Project not found'));

  const evidenceId = await createEvidence(deps, d.tenantId, d.projectId, d.contextRef, 'feedback', `Recommendation ${d.outcome}`, { impactScore: d.impactScore, recommendationId: d.recommendationId }, d.outcome === 'accepted' ? 0.9 : 0.6);

  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  const feedback: RecommendationFeedback = {
    id, tenantId: d.tenantId, projectId: d.projectId, recommendationId: d.recommendationId,
    category: d.category, outcome: d.outcome, impactScore: d.impactScore, contextRef: d.contextRef,
    evidenceIds: [evidenceId], notes: d.notes, recordedAt: now,
  };
  await deps.feedbackRepo.insert(feedback);
  await deps.learningRepo.update(d.tenantId, d.projectId, { recommendationIds: [...p.recommendationIds, d.recommendationId] });

  // Auto-learn success/failure pattern from outcome
  if (d.outcome === 'accepted' && d.impactScore > 70) {
    await updateMemory(deps, d.tenantId, d.projectId, 'success-outcome', `Recommendation ${d.recommendationId} accepted with high impact (${d.impactScore})`);
  } else if (d.outcome === 'rejected') {
    await updateMemory(deps, d.tenantId, d.projectId, 'failure-outcome', `Recommendation ${d.recommendationId} rejected: ${d.notes}`);
  }

  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, LEARNING_EVENTS.RECOMMENDATION_LEARNED, LEARNING_EVENT_SCHEMAS['recommendation.learned'], { feedbackId: id, outcome: d.outcome }));
  await auditLog(deps, p.organizationId, d.tenantId, d.actorId, d.correlationId, 'recommendation_learned', { outcome: d.outcome }, d.projectId);
  return Ok({ feedbackId: id, evidenceId });
}

export async function recordOutcomeUseCase(
  input: z.infer<typeof recordOutcomeSchema>, deps: LearningUseCaseDeps,
): Promise<Result<{ feedbackId: string; evidenceId: string }, ValidationError | NotFoundError>> {
  // Alias for recordRecommendationResult — the Outcome Feedback Loop entry point
  return recordRecommendationResultUseCase(input, deps);
}

export async function learnRecommendationUseCase(
  input: z.infer<typeof learnRecommendationSchema>, deps: LearningUseCaseDeps,
): Promise<Result<{ accuracy: number; total: number; accepted: number; rejected: number; ignored: number }, ValidationError | NotFoundError>> {
  const v = learnRecommendationSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const p = await deps.learningRepo.findById(d.tenantId, d.projectId); if (!p) return Err(new NotFoundError('Project not found'));

  const allFeedback = await deps.feedbackRepo.findByProject(d.tenantId, d.projectId);
  const accepted = allFeedback.filter((f) => f.outcome === 'accepted').length;
  const rejected = allFeedback.filter((f) => f.outcome === 'rejected').length;
  const ignored = allFeedback.filter((f) => f.outcome === 'ignored').length;
  const total = allFeedback.length;
  const accuracy = total > 0 ? Math.round((accepted / total) * 100) : 0;

  // Update statistics
  const stats = await deps.statisticsRepo.findByProject(d.tenantId, d.projectId);
  if (stats) {
    const now = deps.clock.now().toISOString();
    await deps.statisticsRepo.upsert({ ...stats, recommendationAccuracy: accuracy, updatedAt: now });
  }

  await updateMemory(deps, d.tenantId, d.projectId, 'recommendation-learning', `Learned from ${total} recommendations (accuracy: ${accuracy}%)`);
  return Ok({ accuracy, total, accepted, rejected, ignored });
}

export async function recommendImprovementUseCase(
  input: z.infer<typeof recommendImprovementSchema>, deps: LearningUseCaseDeps,
): Promise<Result<{ recommendations: { title: string; reason: string; confidence: number; expectedImpact: number }[] }, ValidationError | NotFoundError>> {
  const v = recommendImprovementSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const p = await deps.learningRepo.findById(d.tenantId, d.projectId); if (!p) return Err(new NotFoundError('Project not found'));

  // Gather patterns in the requested category
  const patterns = await deps.patternRepo.findByCategory(d.tenantId, d.projectId, d.category as PatternCategory);
  const successPatterns = patterns.filter((pat) => pat.type === 'Success');
  const failurePatterns = patterns.filter((pat) => pat.type === 'Failure');

  const recommendations: { title: string; reason: string; confidence: number; expectedImpact: number }[] = [];

  // Recommend based on success patterns
  for (const sp of successPatterns.slice(0, 3)) {
    recommendations.push({
      title: `Apply: ${sp.name}`,
      reason: `Success pattern learned: ${sp.description} (impact: ${sp.impact})`,
      confidence: sp.confidence,
      expectedImpact: sp.impact,
    });
  }

  // Recommend fixing failure patterns
  for (const fp of failurePatterns.slice(0, 2)) {
    recommendations.push({
      title: `Fix: ${fp.name}`,
      reason: `Failure pattern detected: ${fp.description} — avoid this approach`,
      confidence: fp.confidence,
      expectedImpact: fp.impact,
    });
  }

  // If no patterns, recommend gathering data
  if (recommendations.length === 0) {
    recommendations.push({
      title: `Gather ${d.category} data`,
      reason: `No patterns learned yet for ${d.category} — start by recording outcomes`,
      confidence: 0.5,
      expectedImpact: 20,
    });
  }

  await updateMemory(deps, d.tenantId, d.projectId, 'recommend', `Generated ${recommendations.length} improvement recommendations for ${d.category}`);
  return Ok({ recommendations });
}

// ═══════════════════════════════════════════
// DESIGN / UX / COPY / SEARCH LEARNING (4)
// ═══════════════════════════════════════════

export async function learnDesignUseCase(
  input: z.infer<typeof learnDesignSchema>, deps: LearningUseCaseDeps,
): Promise<Result<{ insightId: string; evidenceId: string }, ValidationError | NotFoundError>> {
  const v = learnDesignSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const p = await deps.learningRepo.findById(d.tenantId, d.projectId); if (!p) return Err(new NotFoundError('Project not found'));

  const evidenceId = await createEvidence(deps, d.tenantId, d.projectId, d.sourceRef, 'observation', `Design insight: ${d.insight}`, { designType: d.designType, score: d.score }, 0.82);
  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  const insight: DesignInsight = {
    id, tenantId: d.tenantId, projectId: d.projectId, designType: d.designType,
    insight: d.insight, qualityScore: d.score, evidenceIds: [evidenceId],
    successfulContexts: [d.sourceRef], attributes: {}, createdAt: now,
  };
  await deps.insightRepo.insertDesign(insight);

  // Also add to design memory
  await deps.memoryRepo.addDesignMemory(d.tenantId, d.projectId, { designType: d.designType, description: d.insight, qualityScore: d.score, sourceRef: d.sourceRef });
  await updateMemory(deps, d.tenantId, d.projectId, 'design', `Learned design insight: ${d.insight} (${d.score}/100)`);
  return Ok({ insightId: id, evidenceId });
}

export async function learnUXUseCase(
  input: z.infer<typeof learnInsightSchema>, deps: LearningUseCaseDeps,
): Promise<Result<{ insightId: string; evidenceId: string }, ValidationError | NotFoundError>> {
  const v = learnInsightSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const p = await deps.learningRepo.findById(d.tenantId, d.projectId); if (!p) return Err(new NotFoundError('Project not found'));

  const evidenceId = await createEvidence(deps, d.tenantId, d.projectId, d.sourceRef, 'observation', `UX insight: ${d.insight}`, { score: d.score }, 0.8);
  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  const insight: UXInsight = {
    id, tenantId: d.tenantId, projectId: d.projectId, insight: d.insight, usabilityScore: d.score,
    evidenceIds: [evidenceId], attributes: {}, createdAt: now,
  };
  await deps.insightRepo.insertUX(insight);
  await updateMemory(deps, d.tenantId, d.projectId, 'ux', `Learned UX insight: ${d.insight} (${d.score}/100)`);
  return Ok({ insightId: id, evidenceId });
}

export async function learnCopyUseCase(
  input: z.infer<typeof learnInsightSchema>, deps: LearningUseCaseDeps,
): Promise<Result<{ insightId: string; evidenceId: string }, ValidationError | NotFoundError>> {
  const v = learnInsightSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const p = await deps.learningRepo.findById(d.tenantId, d.projectId); if (!p) return Err(new NotFoundError('Project not found'));

  const evidenceId = await createEvidence(deps, d.tenantId, d.projectId, d.sourceRef, 'observation', `Copy insight: ${d.insight}`, { score: d.score }, 0.78);
  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  const insight: CopyInsight = {
    id, tenantId: d.tenantId, projectId: d.projectId, insight: d.insight, effectivenessScore: d.score,
    evidenceIds: [evidenceId], attributes: {}, createdAt: now,
  };
  await deps.insightRepo.insertCopy(insight);
  await updateMemory(deps, d.tenantId, d.projectId, 'copy', `Learned copy insight: ${d.insight} (${d.score}/100)`);
  return Ok({ insightId: id, evidenceId });
}

export async function learnSearchUseCase(
  input: z.infer<typeof learnInsightSchema>, deps: LearningUseCaseDeps,
): Promise<Result<{ insightId: string; evidenceId: string }, ValidationError | NotFoundError>> {
  const v = learnInsightSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const p = await deps.learningRepo.findById(d.tenantId, d.projectId); if (!p) return Err(new NotFoundError('Project not found'));

  const evidenceId = await createEvidence(deps, d.tenantId, d.projectId, d.sourceRef, 'observation', `Search insight: ${d.insight}`, { score: d.score }, 0.8);
  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  const insight: SearchInsight = {
    id, tenantId: d.tenantId, projectId: d.projectId, insight: d.insight, relevanceScore: d.score,
    evidenceIds: [evidenceId], attributes: {}, createdAt: now,
  };
  await deps.insightRepo.insertSearch(insight);
  await updateMemory(deps, d.tenantId, d.projectId, 'search', `Learned search insight: ${d.insight} (${d.score}/100)`);
  return Ok({ insightId: id, evidenceId });
}

// ═══════════════════════════════════════════
// KNOWLEDGE EVOLUTION (2) + REPORT (1) + SEARCH (1)
// ═══════════════════════════════════════════

export async function updateKnowledgeUseCase(
  input: z.infer<typeof updateKnowledgeSchema>, deps: LearningUseCaseDeps,
): Promise<Result<{ evolutionId: string }, ValidationError | NotFoundError>> {
  const v = updateKnowledgeSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const p = await deps.learningRepo.findById(d.tenantId, d.projectId); if (!p) return Err(new NotFoundError('Project not found'));

  const previousEvolutions = await deps.knowledgeEvoRepo.findByKnowledge(d.tenantId, d.knowledgeId);
  const previousVersion = previousEvolutions.length > 0 ? Math.max(...previousEvolutions.map((e) => e.version)) : 0;
  const version = previousVersion + 1;

  const evidenceId = await createEvidence(deps, d.tenantId, d.projectId, d.knowledgeId, 'observation', `Knowledge update: ${d.change}`, { knowledgeId: d.knowledgeId, reason: d.reason }, 0.85);
  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  const evolution: KnowledgeEvolution = {
    id, tenantId: d.tenantId, projectId: d.projectId, knowledgeId: d.knowledgeId,
    version, previousVersion, change: d.change, reason: d.reason, evidenceIds: [evidenceId],
    confidenceDelta: 0.05, newConfidence: Math.min(1, 0.7 + version * 0.05), evolvedAt: now,
  };
  await deps.knowledgeEvoRepo.insert(evolution);

  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, LEARNING_EVENTS.KNOWLEDGE_EVOLVED, LEARNING_EVENT_SCHEMAS['knowledge.evolved'], { evolutionId: id, version }));
  await auditLog(deps, p.organizationId, d.tenantId, d.actorId, d.correlationId, 'knowledge_evolved', { knowledgeId: d.knowledgeId, version }, d.projectId);
  await updateMemory(deps, d.tenantId, d.projectId, 'knowledge', `Knowledge ${d.knowledgeId} evolved to v${version}: ${d.change}`);
  return Ok({ evolutionId: id });
}

export async function evolveKnowledgeUseCase(
  input: z.infer<typeof evolveKnowledgeSchema>, deps: LearningUseCaseDeps,
): Promise<Result<{ evolutionId: string }, ValidationError | NotFoundError>> {
  return updateKnowledgeUseCase(input, deps);
}

export async function generateLearningReportUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; projectId: string }, deps: LearningUseCaseDeps,
): Promise<Result<{ reportId: string; summary: string; metrics: Record<string, number> }, NotFoundError>> {
  const p = await deps.learningRepo.findById(input.tenantId, input.projectId);
  if (!p) return Err(new NotFoundError('Project not found'));

  const patterns = await deps.patternRepo.findByProject(input.tenantId, input.projectId);
  const trends = await deps.trendRepo.findByProject(input.tenantId, input.projectId);
  const feedback = await deps.feedbackRepo.findByProject(input.tenantId, input.projectId);
  const evidence = await deps.evidenceRepo.findByProject(input.tenantId, input.projectId);
  const stats = await deps.statisticsRepo.findByProject(input.tenantId, input.projectId);

  const successCount = patterns.filter((pat) => pat.type === 'Success').length;
  const failureCount = patterns.filter((pat) => pat.type === 'Failure').length;
  const acceptedCount = feedback.filter((f) => f.outcome === 'accepted').length;

  const metrics: Record<string, number> = {
    totalPatterns: patterns.length,
    successPatterns: successCount,
    failurePatterns: failureCount,
    totalTrends: trends.length,
    totalFeedback: feedback.length,
    acceptedRate: feedback.length > 0 ? Math.round((acceptedCount / feedback.length) * 100) : 0,
    totalEvidence: evidence.length,
    improvementRate: stats?.improvementRate ?? 0,
    avgConfidence: stats?.avgConfidence ?? 0,
  };

  const summary = `Learning Report: ${patterns.length} patterns (${successCount} success, ${failureCount} failure), ${trends.length} trends, ${feedback.length} feedback entries. Evidence: ${evidence.length}.`;

  const reportId = deps.idGenerator.generate();
  await deps.eventBus.emit(envelope(deps, reportId, input.tenantId, input.correlationId, LEARNING_EVENTS.REPORT_GENERATED, LEARNING_EVENT_SCHEMAS['learning.report.generated'], { reportId, patternCount: patterns.length }));
  await auditLog(deps, p.organizationId, input.tenantId, input.actorId, input.correlationId, 'report_generated', { patterns: patterns.length }, input.projectId);
  await updateMemory(deps, input.tenantId, input.projectId, 'report', `Generated learning report with ${patterns.length} patterns`);
  return Ok({ reportId, summary, metrics });
}

export async function searchLearningMemoryUseCase(
  input: z.infer<typeof searchMemorySchema>, deps: LearningUseCaseDeps,
): Promise<Result<{ results: { action: string; summary: string; timestamp: string }[] }, NotFoundError>> {
  const mem = await deps.memoryRepo.findByProject(input.tenantId, input.projectId);
  if (!mem) return Err(new NotFoundError('Learning memory not found'));
  const q = input.query.toLowerCase();
  const results = mem.history.filter((h) => h.action.toLowerCase().includes(q) || h.summary.toLowerCase().includes(q));
  return Ok({ results });
}

// ═══════════════════════════════════════════
// ANALYTICS (3)
// ═══════════════════════════════════════════

export async function calculateLearningScoreUseCase(
  input: z.infer<typeof calculateScoreSchema>, deps: LearningUseCaseDeps,
): Promise<Result<{ score: number; breakdown: Record<string, number> }, NotFoundError>> {
  const p = await deps.learningRepo.findById(input.tenantId, input.projectId);
  if (!p) return Err(new NotFoundError('Project not found'));

  const patterns = await deps.patternRepo.findByProject(input.tenantId, input.projectId);
  const evidence = await deps.evidenceRepo.findByProject(input.tenantId, input.projectId);
  const feedback = await deps.feedbackRepo.findByProject(input.tenantId, input.projectId);
  const trends = await deps.trendRepo.findByProject(input.tenantId, input.projectId);

  const patternScore = Math.min(30, patterns.length * 3);
  const evidenceScore = Math.min(25, evidence.length * 2.5);
  const feedbackScore = Math.min(25, feedback.length * 5);
  const trendScore = Math.min(20, trends.length * 4);
  const score = Math.round(patternScore + evidenceScore + feedbackScore + trendScore);

  return Ok({ score, breakdown: { patterns: patternScore, evidence: evidenceScore, feedback: feedbackScore, trends: trendScore } });
}

export async function calculateImprovementRateUseCase(
  input: z.infer<typeof calculateScoreSchema>, deps: LearningUseCaseDeps,
): Promise<Result<{ rate: number; trend: string }, NotFoundError>> {
  const p = await deps.learningRepo.findById(input.tenantId, input.projectId);
  if (!p) return Err(new NotFoundError('Project not found'));

  const feedback = await deps.feedbackRepo.findByProject(input.tenantId, input.projectId);
  const accepted = feedback.filter((f) => f.outcome === 'accepted');
  const rate = feedback.length > 0 ? Math.round((accepted.length / feedback.length) * 100) : 0;
  const trend = rate >= 70 ? 'improving' : rate >= 40 ? 'stable' : 'needs_attention';

  // Update statistics
  const stats = await deps.statisticsRepo.findByProject(input.tenantId, input.projectId);
  if (stats) {
    const now = deps.clock.now().toISOString();
    await deps.statisticsRepo.upsert({ ...stats, improvementRate: rate, updatedAt: now });
  }

  if (trend === 'improving') {
    await deps.eventBus.emit(envelope(deps, input.projectId, input.tenantId, '', LEARNING_EVENTS.IMPROVEMENT_DETECTED, LEARNING_EVENT_SCHEMAS['improvement.detected'], { rate }));
  }

  return Ok({ rate, trend });
}

export async function generateTrendAnalysisUseCase(
  input: z.infer<typeof trendAnalysisSchema>, deps: LearningUseCaseDeps,
): Promise<Result<{ analysis: { category: string; direction: string; count: number }[]; dominantDirection: string }, ValidationError | NotFoundError>> {
  const v = trendAnalysisSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const p = await deps.learningRepo.findById(d.tenantId, d.projectId); if (!p) return Err(new NotFoundError('Project not found'));

  const trends = await deps.trendRepo.findByProject(d.tenantId, d.projectId);
  const byCategory = new Map<string, { direction: string; count: number }>();
  for (const t of trends) {
    const key = t.category;
    const existing = byCategory.get(key);
    if (existing) { existing.count++; }
    else { byCategory.set(key, { direction: t.direction, count: 1 }); }
  }
  const analysis: { category: string; direction: string; count: number }[] = [];
  byCategory.forEach((val, category) => { analysis.push({ category, direction: val.direction, count: val.count }); });
  const upCount = trends.filter((t) => t.direction === 'up').length;
  const dominantDirection = upCount > trends.length / 2 ? 'up' : trends.filter((t) => t.direction === 'down').length > trends.length / 2 ? 'down' : 'stable';

  await deps.eventBus.emit(envelope(deps, d.projectId, d.tenantId, d.correlationId, LEARNING_EVENTS.ANALYTICS_UPDATED, LEARNING_EVENT_SCHEMAS['analytics.updated'], { trendCount: trends.length }));
  await updateMemory(deps, d.tenantId, d.projectId, 'trend-analysis', `Analyzed ${trends.length} trends (dominant: ${dominantDirection})`);
  return Ok({ analysis, dominantDirection });
}

// ═══════════════════════════════════════════
// MEMORY & QUERIES (4)
// ═══════════════════════════════════════════

export async function getLearningMemoryUseCase(
  tenantId: string, projectId: string, deps: LearningUseCaseDeps,
): Promise<Result<{ history: { action: string; summary: string; timestamp: string }[]; designMemory: { designType: string; description: string; qualityScore: number }[]; successfulStrategies: string[]; failedStrategies: string[] }, NotFoundError>> {
  const mem = await deps.memoryRepo.findByProject(tenantId, projectId);
  if (!mem) return Err(new NotFoundError('Learning memory not found'));
  return Ok({
    history: mem.history,
    designMemory: mem.designMemory,
    successfulStrategies: mem.successfulStrategies,
    failedStrategies: mem.failedStrategies,
  });
}

export async function updateLearningMemoryUseCase(
  input: { tenantId: string; projectId: string; action: string; summary: string }, deps: LearningUseCaseDeps,
): Promise<Result<{ updated: boolean }, NotFoundError>> {
  const p = await deps.learningRepo.findById(input.tenantId, input.projectId); if (!p) return Err(new NotFoundError('Project not found'));
  await updateMemory(deps, input.tenantId, input.projectId, input.action, input.summary);
  return Ok({ updated: true });
}

export async function getLearningStatisticsUseCase(
  tenantId: string, projectId: string, deps: LearningUseCaseDeps,
): Promise<Result<LearningStatistics, NotFoundError>> {
  const stats = await deps.statisticsRepo.findByProject(tenantId, projectId);
  if (!stats) return Err(new NotFoundError('Statistics not found'));
  return Ok(stats);
}

export async function getDesignMemoryUseCase(
  tenantId: string, projectId: string, deps: LearningUseCaseDeps,
): Promise<Result<{ entries: { designType: string; description: string; qualityScore: number; sourceRef: string }[] }, NotFoundError>> {
  const mem = await deps.memoryRepo.findByProject(tenantId, projectId);
  if (!mem) return Err(new NotFoundError('Learning memory not found'));
  return Ok({ entries: mem.designMemory });
}

export async function getPersonalizationProfileUseCase(
  tenantId: string, scope: 'Organization' | 'Tenant' | 'User' | 'Region' | 'Language' | 'Industry', scopeRef: string, deps: LearningUseCaseDeps,
): Promise<Result<{ preferences: Record<string, unknown>; learnedPatterns: string[]; confidence: number }, NotFoundError>> {
  const profile = await deps.personalizationRepo.findByScope(tenantId, scope, scopeRef);
  if (!profile) return Err(new NotFoundError('Personalization profile not found'));
  return Ok({ preferences: profile.preferences, learnedPatterns: profile.learnedPatterns, confidence: profile.confidence });
}
