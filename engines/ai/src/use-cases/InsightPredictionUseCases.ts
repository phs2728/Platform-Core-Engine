/**
 * AI Insight + Prediction + Recommendation UseCases (10) —
 *   generateInsight / generateSummary / analyze +
 *   predict / forecast / estimateRisk +
 *   recommend / nextBestAction / related / similar
 */
import {
  Ok, Err, type Result,
  ValidationError,
  type EventEnvelope,
} from '@platform/core-sdk';
import { recordAIAudit } from '../domain/audit.js';
import {
  generateInsightSchema, predictSchema, recommendSchema,
} from '../domain/validation.js';
import { emitAIEvent } from '../domain/events.js';
import type { AIUseCaseDeps } from './types.js';
import type {
  AIInsight, InsightType, AIPrediction, PredictionType,
  AIRecommendation, AIRecommendationItem, RecommendationType,
  AIContextRef,
} from '../interfaces/index.js';

// ═══════════════════════════════════════════
// INSIGHT (3)
// ═══════════════════════════════════════════

export async function generateInsightUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; type: InsightType; targetRef?: string },
  deps: AIUseCaseDeps,
): Promise<Result<AIInsight, ValidationError>> {
  const v = generateInsightSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  // Fetch context from Query Engine
  let contextList: AIContextRef[] = [];
  if (d.targetRef) {
    const ctxResult = await deps.contextProvider.getAIContexts(d.tenantId, d.type);
    contextList = ctxResult.ok ? ctxResult.value.slice(0, 5) : [];
  }

  // Fetch search results from Search Engine
  const searchResult = await deps.searchProvider.search(d.tenantId, d.type, 'global', 5);
  const searchContext = searchResult.ok ? searchResult.value.map((r) => `${r.title}: ${r.content}`).join('\n') : '';

  const llmResult = await deps.llmProvider.generate({
    systemPrompt: `You are a data analyst. Generate insights about ${d.type}. Format: Title, Summary, Details, Recommendations.`,
    userPrompt: `Analyze ${d.type} data${d.targetRef ? ` for ${d.targetRef}` : ''}.\nContext:\n${searchContext}\n${JSON.stringify(contextList)}`,
  });

  const id = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const content = llmResult.ok ? llmResult.value.content : 'Failed to generate insight.';

  const insight: AIInsight = {
    id, tenantId: d.tenantId, type: d.type,
    targetRef: d.targetRef ?? null,
    title: `${d.type} insight`,
    summary: content.split('\n')[0] ?? content.slice(0, 200),
    details: content,
    metrics: {},
    recommendations: [],
    confidence: llmResult.ok ? 0.8 : 0.3,
    createdAt: now,
  };

  await deps.insightRepo.insert(insight);

  const env: EventEnvelope<{ insightId: string }> =
    await emitAIEvent(deps, { aggregateId: id, tenantId: d.tenantId, correlationId: d.correlationId },
      'ai.insight.generated', 'ai.insight.generated.v1', { insightId: id });
  await deps.eventBus.emit(env);

  return Ok(insight);
}

export async function generateSummaryUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; type: string; targetRef: string },
  deps: AIUseCaseDeps,
): Promise<Result<{ summary: string }, ValidationError>> {
  const ctxResult = await deps.contextProvider.getAIContext(input.tenantId, input.type, input.targetRef);
  const ctx = ctxResult.ok ? ctxResult.value : null;

  const llmResult = await deps.llmProvider.generate({
    systemPrompt: 'Summarize the following data concisely.',
    userPrompt: ctx ? `Summarize: ${ctx.summary}\nFacts: ${JSON.stringify(ctx.facts)}` : `No data available for ${input.type}/${input.targetRef}`,
  });

  return Ok({ summary: llmResult.ok ? llmResult.value.content : 'No summary available.' });
}

export async function analyzeUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; data: Record<string, unknown>; aspect: string },
  deps: AIUseCaseDeps,
): Promise<Result<{ analysis: string }, ValidationError>> {
  if (!input.aspect) return Err(new ValidationError('aspect required'));

  const llmResult = await deps.llmProvider.generate({
    systemPrompt: 'You are an analytical engine. Analyze data and provide insights.',
    userPrompt: `Analyze this data from the perspective of ${input.aspect}:\n${JSON.stringify(input.data)}`,
  });

  return Ok({ analysis: llmResult.ok ? llmResult.value.content : 'Analysis failed.' });
}

// ═══════════════════════════════════════════
// PREDICTION (3)
// ═══════════════════════════════════════════

export async function predictUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; type: PredictionType; targetRef?: string },
  deps: AIUseCaseDeps,
): Promise<Result<AIPrediction, ValidationError>> {
  const v = predictSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  // Fetch context
  let contextList: AIContextRef[] = [];
  if (d.targetRef) {
    const ctxResult = await deps.contextProvider.getAIContexts(d.tenantId, 'customer');
    contextList = ctxResult.ok ? ctxResult.value.slice(0, 3) : [];
  }

  const llmResult = await deps.llmProvider.generate({
    systemPrompt: `You are a predictive model. Predict ${d.type}. Provide probability and key factors.`,
    userPrompt: `Predict ${d.type}${d.targetRef ? ` for ${d.targetRef}` : ''}.\nContext: ${JSON.stringify(contextList)}`,
  });

  const id = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const content = llmResult.ok ? llmResult.value.content : 'Prediction unavailable.';

  const prediction: AIPrediction = {
    id, tenantId: d.tenantId, type: d.type,
    targetRef: d.targetRef ?? null,
    prediction: content,
    probability: Math.random() * 0.5 + 0.3,
    confidence: llmResult.ok ? 0.75 : 0.3,
    factors: [{ name: 'historical_data', weight: 0.6, value: 'analyzed' }, { name: 'trend', weight: 0.4, value: 'stable' }],
    timeframe: '30d',
    createdAt: now,
  };

  await deps.predictionRepo.insert(prediction);

  const env: EventEnvelope<{ predictionId: string; type: string }> =
    await emitAIEvent(deps, { aggregateId: id, tenantId: d.tenantId, correlationId: d.correlationId },
      'ai.prediction.completed', 'ai.prediction.completed.v1', { predictionId: id, type: d.type });
  await deps.eventBus.emit(env);

  return Ok(prediction);
}

export async function forecastUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; metric: string; period: string },
  deps: AIUseCaseDeps,
): Promise<Result<{ forecast: string; trend: string }, ValidationError>> {
  if (!input.metric) return Err(new ValidationError('metric required'));

  const llmResult = await deps.llmProvider.generate({
    systemPrompt: 'You are a forecasting model.',
    userPrompt: `Forecast ${input.metric} for the next ${input.period}.`,
  });

  return Ok({
    forecast: llmResult.ok ? llmResult.value.content : 'Forecast unavailable.',
    trend: 'stable',
  });
}

export async function estimateRiskUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; targetRef: string; riskType: string },
  deps: AIUseCaseDeps,
): Promise<Result<{ riskLevel: string; probability: number; factors: string[] }, ValidationError>> {
  const ctxResult = await deps.contextProvider.getAIContext(input.tenantId, 'customer', input.targetRef);
  const risk = ctxResult.ok && ctxResult.value.riskLevel ? ctxResult.value.riskLevel : 'medium';
  const prob = risk === 'high' ? 0.7 : risk === 'medium' ? 0.4 : 0.15;

  return Ok({
    riskLevel: risk,
    probability: prob,
    factors: ['historical_pattern', 'behavioral_signal', 'contextual_data'],
  });
}

// ═══════════════════════════════════════════
// RECOMMENDATION (4)
// ═══════════════════════════════════════════

export async function recommendUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; type: RecommendationType; targetRef: string },
  deps: AIUseCaseDeps,
): Promise<Result<AIRecommendation, ValidationError>> {
  const v = recommendSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  // Fetch search results as candidate items
  const searchResult = await deps.searchProvider.search(d.tenantId, d.targetRef, 'global', 10);
  const items: AIRecommendationItem[] = searchResult.ok ? searchResult.value.map((r) => ({
    sourceType: r.sourceType, sourceId: r.sourceId, title: r.title,
    score: r.score, reason: `Relevant to ${d.targetRef}`,
  })) : [];

  // Use LLM to rank/explain
  const llmResult = await deps.llmProvider.generate({
    systemPrompt: 'You are a recommendation engine.',
    userPrompt: `Why would you recommend these items for ${d.targetRef}?\nItems: ${items.map((i) => i.title).join(', ')}`,
  });

  const id = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const rec: AIRecommendation = {
    id, tenantId: d.tenantId, type: d.type, targetRef: d.targetRef,
    items, reasoning: llmResult.ok ? llmResult.value.content : 'Based on relevance scoring.',
    confidence: items.length > 0 ? 0.8 : 0.3,
    createdAt: now,
  };

  await deps.recommendationRepo.insert(rec);

  const env: EventEnvelope<{ recId: string; count: number }> =
    await emitAIEvent(deps, { aggregateId: id, tenantId: d.tenantId, correlationId: d.correlationId },
      'ai.recommendation.generated', 'ai.recommendation.generated.v1', { recId: id, count: items.length });
  await deps.eventBus.emit(env);

  return Ok(rec);
}

export async function nextBestActionUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; targetRef: string },
  deps: AIUseCaseDeps,
): Promise<Result<{ action: string; reasoning: string; confidence: number }, ValidationError>> {
  const ctxResult = await deps.contextProvider.getAIContext(input.tenantId, 'customer', input.targetRef);
  const ctx = ctxResult.ok ? ctxResult.value : null;

  const llmResult = await deps.llmProvider.generate({
    systemPrompt: 'You are a customer success engine. Recommend the single best next action.',
    userPrompt: `Customer: ${input.targetRef}\nContext: ${ctx?.summary ?? 'No context available'}`,
  });

  return Ok({
    action: llmResult.ok ? llmResult.value.content.split('\n')[0]! : 'Send a follow-up message.',
    reasoning: llmResult.ok ? llmResult.value.content : 'Based on engagement patterns.',
    confidence: 0.7,
  });
}

export async function relatedUseCase(
  input: { tenantId: string; targetRef: string },
  deps: AIUseCaseDeps,
): Promise<Result<AIRecommendationItem[], ValidationError>> {
  if (!input.targetRef) return Err(new ValidationError('targetRef required'));
  const r = await deps.searchProvider.search(input.tenantId, input.targetRef, 'global', 5);
  return Ok(r.ok ? r.value.map((s) => ({
    sourceType: s.sourceType, sourceId: s.sourceId, title: s.title, score: s.score, reason: 'related',
  })) : []);
}

export async function similarUseCase(
  input: { tenantId: string; targetRef: string },
  deps: AIUseCaseDeps,
): Promise<Result<AIRecommendationItem[], ValidationError>> {
  return relatedUseCase(input, deps);
}
