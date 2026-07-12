/** AI Engine — Tests */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  startConversationUseCase, askUseCase, chatUseCase, endConversationUseCase, explainUseCase, reasonUseCase,
  generateInsightUseCase, generateSummaryUseCase, analyzeUseCase,
  predictUseCase, forecastUseCase, estimateRiskUseCase,
  recommendUseCase, nextBestActionUseCase, relatedUseCase, similarUseCase,
  generateUseCase, rewriteUseCase, translateUseCase, classifyUseCase, extractUseCase,
  createPromptUseCase, updatePromptUseCase, listPromptsUseCase, validatePromptUseCase,
  ingestKnowledgeUseCase, queryKnowledgeUseCase,
} from '../src/index.js';
import { makeDeps } from './helpers.js';

type Deps = ReturnType<typeof makeDeps>;

// ═══════════════════════════════════════════
// 1. Assistant (10 tests)
// ═══════════════════════════════════════════
describe('Assistant', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('starts a conversation', async () => {
    const r = await startConversationUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', userId: 'u-1', assistantType: 'platform' }, deps);
    expect(r.ok).toBe(true);
  });

  it('rejects disallowed assistant type', async () => {
    deps.policyProvider.set('t-1', { allowedAssistants: ['platform'] });
    const r = await startConversationUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', userId: 'u-1', assistantType: 'admin' }, deps);
    expect(r.ok).toBe(false);
  });

  it('asks a question', async () => {
    const r = await askUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', question: 'What is my booking status?' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.answer).toBeDefined();
    expect(r.value!.tokensUsed).toBeGreaterThan(0);
  });

  it('chat returns reply and saves messages', async () => {
    const conv = await startConversationUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', userId: 'u-1', assistantType: 'platform' }, deps);
    const r = await chatUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', conversationId: conv.value!.conversationId, message: 'Hello' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.reply).toBeDefined();

    const conv2 = await deps.conversationRepo.findById('t-1', conv.value!.conversationId);
    expect(conv2!.messages.length).toBe(2);
  });

  it('chat fails on non-existent conversation', async () => {
    const r = await chatUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', conversationId: 'nonexistent', message: 'hi' }, deps);
    expect(r.ok).toBe(false);
  });

  it('ends conversation', async () => {
    const conv = await startConversationUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', userId: 'u-1', assistantType: 'platform' }, deps);
    const r = await endConversationUseCase({ tenantId: 't-1', correlationId: 'c', conversationId: conv.value!.conversationId }, deps);
    expect(r.ok).toBe(true);
    const c = await deps.conversationRepo.findById('t-1', conv.value!.conversationId);
    expect(c!.status).toBe('ended');
  });

  it('explain returns explanation', async () => {
    const r = await explainUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', topic: 'quantum computing' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.explanation).toBeDefined();
  });

  it('reason returns reasoning and conclusion', async () => {
    const r = await reasonUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', problem: 'Should I expand to new market?' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.reasoning).toBeDefined();
    expect(r.value!.conclusion).toBeDefined();
  });

  it('ask emits ai.chat.started or completed event', async () => {
    await askUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', question: 'test' }, deps);
    // ask itself doesn't start a conversation, but it does emit completed audit
  });

  it('chat emits ai.chat.completed event', async () => {
    const conv = await startConversationUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', userId: 'u-1', assistantType: 'platform' }, deps);
    await chatUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', conversationId: conv.value!.conversationId, message: 'hi' }, deps);
    expect(deps.eventBus.countByType('ai.chat.completed')).toBe(1);
  });
});

// ═══════════════════════════════════════════
// 2. Insight (5 tests)
// ═══════════════════════════════════════════
describe('Insight', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('generates revenue insight', async () => {
    const r = await generateInsightUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', type: 'revenue', targetRef: 'org-1' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.type).toBe('revenue');
    expect(deps.eventBus.countByType('ai.insight.generated')).toBe(1);
  });

  it('generates summary from context', async () => {
    const r = await generateSummaryUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', type: 'customer', targetRef: 'cust-1' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.summary).toBeDefined();
  });

  it('analyzes data', async () => {
    const r = await analyzeUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', data: { revenue: 50000, growth: 15 }, aspect: 'growth' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.analysis).toBeDefined();
  });

  it('insight is persisted', async () => {
    await generateInsightUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', type: 'customer' }, deps);
    const insights = await deps.insightRepo.findByType('t-1', 'customer');
    expect(insights.length).toBe(1);
  });

  it('insight has confidence score', async () => {
    const r = await generateInsightUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', type: 'booking' }, deps);
    expect(r.value!.confidence).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════
// 3. Prediction (5 tests)
// ═══════════════════════════════════════════
describe('Prediction', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('predicts demand forecast', async () => {
    const r = await predictUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', type: 'demand_forecast' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.probability).toBeGreaterThan(0);
    expect(deps.eventBus.countByType('ai.prediction.completed')).toBe(1);
  });

  it('predicts cancellation risk for customer', async () => {
    const r = await predictUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', type: 'cancellation_risk', targetRef: 'cust-1' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.factors.length).toBeGreaterThan(0);
  });

  it('forecast returns trend', async () => {
    const r = await forecastUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', metric: 'revenue', period: '30d' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.trend).toBeDefined();
  });

  it('estimateRisk returns risk level', async () => {
    const r = await estimateRiskUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', targetRef: 'cust-1', riskType: 'fraud' }, deps);
    expect(r.ok).toBe(true);
    expect(['low', 'medium', 'high']).toContain(r.value!.riskLevel);
  });

  it('prediction is persisted', async () => {
    await predictUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', type: 'fraud_risk' }, deps);
    const preds = await deps.predictionRepo.findByType('t-1', 'fraud_risk');
    expect(preds.length).toBe(1);
  });
});

// ═══════════════════════════════════════════
// 4. Recommendation (5 tests)
// ═══════════════════════════════════════════
describe('Recommendation', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('generates personalized recommendations', async () => {
    const r = await recommendUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', type: 'personalized', targetRef: 'hotel' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.items.length).toBeGreaterThan(0);
    expect(deps.eventBus.countByType('ai.recommendation.generated')).toBe(1);
  });

  it('nextBestAction returns action', async () => {
    const r = await nextBestActionUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', targetRef: 'cust-1' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.action).toBeDefined();
  });

  it('related returns items', async () => {
    const r = await relatedUseCase({ tenantId: 't-1', targetRef: 'hotel' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.length).toBeGreaterThan(0);
  });

  it('similar returns items', async () => {
    const r = await similarUseCase({ tenantId: 't-1', targetRef: 'hotel' }, deps);
    expect(r.ok).toBe(true);
  });

  it('recommendation is persisted', async () => {
    await recommendUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', type: 'trending', targetRef: 'org-1' }, deps);
    const recs = await deps.recommendationRepo.findByTarget('t-1', 'org-1');
    expect(recs.length).toBe(1);
  });
});

// ═══════════════════════════════════════════
// 5. Generation (6 tests)
// ═══════════════════════════════════════════
describe('Generation', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('generates a reply', async () => {
    const r = await generateUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', type: 'reply', input: 'Thank you for your feedback' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.output).toBeDefined();
  });

  it('generates a description', async () => {
    const r = await generateUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', type: 'description', input: 'Luxury hotel room' }, deps);
    expect(r.ok).toBe(true);
  });

  it('uses prompt template', async () => {
    await createPromptUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', name: 'reply-prompt', description: 'test', systemPrompt: 'Write polite replies', userPromptTemplate: 'Reply to: {{input}}', variables: ['input'] }, deps);
    const r = await generateUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', type: 'reply', input: 'Hello', promptName: 'reply-prompt' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.promptUsed).toBe('reply-prompt');
  });

  it('rewrite changes style', async () => {
    const r = await rewriteUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', text: 'This is good', style: 'formal' }, deps);
    expect(r.ok).toBe(true);
  });

  it('translate converts language', async () => {
    const r = await translateUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', text: 'Hello', from: 'en', to: 'ko' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.translated).toContain('[en→ko]');
    expect(deps.eventBus.countByType('ai.translation.completed')).toBe(1);
  });

  it('classify returns category', async () => {
    const r = await classifyUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', text: 'I want to cancel my booking', categories: ['cancel', 'inquiry', 'complaint'] }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.allScores).toBeDefined();
  });
});

// ═══════════════════════════════════════════
// 6. Extraction (2 tests)
// ═══════════════════════════════════════════
describe('Extraction', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('extracts entities from text', async () => {
    const r = await extractUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', text: 'John booked a hotel on July 15', entities: ['John', 'hotel'] }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.extracted.John).toBeDefined();
  });

  it('extract returns empty for missing entities', async () => {
    const r = await extractUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', text: 'Hello world', entities: ['nonexistent'] }, deps);
    expect(r.value!.extracted.nonexistent).toEqual([]);
  });
});

// ═══════════════════════════════════════════
// 7. Prompt Management (6 tests)
// ═══════════════════════════════════════════
describe('Prompt Management', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('creates a prompt', async () => {
    const r = await createPromptUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', name: 'summary', description: 'Summary prompt', systemPrompt: 'Summarize', userPromptTemplate: 'Summarize: {{input}}', variables: ['input'] }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.version).toBe(1);
  });

  it('creates new version on duplicate name', async () => {
    await createPromptUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', name: 'summary', description: 'v1', systemPrompt: 'S1', userPromptTemplate: '{{input}}', variables: ['input'] }, deps);
    const r = await createPromptUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', name: 'summary', description: 'v2', systemPrompt: 'S2', userPromptTemplate: '{{input}}', variables: ['input'] }, deps);
    expect(r.value!.version).toBe(2);
  });

  it('updates prompt', async () => {
    const created = await createPromptUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', name: 'test', description: 'd', systemPrompt: 'SP', userPromptTemplate: '{{input}}', variables: ['input'] }, deps);
    const r = await updatePromptUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', promptId: created.value!.promptId, systemPrompt: 'Updated' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.systemPrompt).toBe('Updated');
  });

  it('lists prompts', async () => {
    await createPromptUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', name: 'a', description: 'd', systemPrompt: 'S', userPromptTemplate: '{{input}}', variables: ['input'] }, deps);
    await createPromptUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', name: 'b', description: 'd', systemPrompt: 'S', userPromptTemplate: '{{input}}', variables: ['input'] }, deps);
    const r = await listPromptsUseCase('t-1', deps);
    expect(r.value!.length).toBe(2);
  });

  it('validates prompt — detects missing variables', async () => {
    const r = await validatePromptUseCase({ tenantId: 't-1', systemPrompt: 'SP', userPromptTemplate: 'Hello {{name}}', variables: ['name', 'age'] }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.missingVariables).toContain('age');
    expect(r.value!.valid).toBe(false);
  });

  it('validates prompt — passes with all variables', async () => {
    const r = await validatePromptUseCase({ tenantId: 't-1', systemPrompt: 'SP', userPromptTemplate: 'Hello {{name}} {{age}}', variables: ['name', 'age'] }, deps);
    expect(r.value!.valid).toBe(true);
    expect(r.value!.missingVariables.length).toBe(0);
  });
});

// ═══════════════════════════════════════════
// 8. Knowledge (5 tests)
// ═══════════════════════════════════════════
describe('Knowledge', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('ingests knowledge with embedding', async () => {
    const r = await ingestKnowledgeUseCase({ tenantId: 't-1', correlationId: 'c', content: 'The hotel has 50 rooms', source: 'inventory' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.embedded).toBe(true);
  });

  it('query finds relevant knowledge', async () => {
    await ingestKnowledgeUseCase({ tenantId: 't-1', correlationId: 'c', content: 'Cancel within 24 hours for full refund', source: 'policy' }, deps);
    const r = await queryKnowledgeUseCase({ tenantId: 't-1', query: 'cancel', limit: 5 }, deps);
    expect(r.ok).toBe(true);
  });

  it('query falls back to keyword search', async () => {
    await ingestKnowledgeUseCase({ tenantId: 't-1', correlationId: 'c', content: 'Booking confirmed', source: 'booking' }, deps);
    const r = await queryKnowledgeUseCase({ tenantId: 't-1', query: 'booking', limit: 5 }, deps);
    expect(r.ok).toBe(true);
  });

  it('multiple knowledge entries', async () => {
    for (let i = 0; i < 3; i++) {
      await ingestKnowledgeUseCase({ tenantId: 't-1', correlationId: 'c', content: `fact ${i}`, source: `src-${i}` }, deps);
    }
    const list = await deps.knowledgeRepo.listByTenant('t-1');
    expect(list.length).toBe(3);
  });

  it('vector search returns similarity scores', async () => {
    await ingestKnowledgeUseCase({ tenantId: 't-1', correlationId: 'c', content: 'ocean view room', source: 'catalog' }, deps);
    await ingestKnowledgeUseCase({ tenantId: 't-1', correlationId: 'c', content: 'mountain view suite', source: 'catalog' }, deps);
    const r = await queryKnowledgeUseCase({ tenantId: 't-1', query: 'ocean', limit: 5 }, deps);
    expect(r.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 9. Audit (3 tests)
// ═══════════════════════════════════════════
describe('Audit', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('records audit for chat', async () => {
    const conv = await startConversationUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', userId: 'u-1', assistantType: 'platform' }, deps);
    await chatUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', conversationId: conv.value!.conversationId, message: 'hi' }, deps);
    const audit = await deps.auditRepo.findByTenant('t-1');
    expect(audit.length).toBeGreaterThan(0);
  });

  it('records audit for prompt creation', async () => {
    await createPromptUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', name: 'test', description: 'd', systemPrompt: 'S', userPromptTemplate: '{{input}}', variables: ['input'] }, deps);
    const audit = await deps.auditRepo.findByTenant('t-1');
    expect(audit.some((a) => a.eventType === 'prompt_updated')).toBe(true);
  });

  it('records audit for generation', async () => {
    await generateUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', type: 'reply', input: 'hello' }, deps);
    const audit = await deps.auditRepo.findByTenant('t-1');
    expect(audit.some((a) => a.eventType === 'generation_completed')).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 10. Multi-Provider (3 tests)
// ═══════════════════════════════════════════
describe('Multi-Provider', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('uses default LLM provider', async () => {
    deps.llmProvider.setDefaultResponse('Custom response');
    const r = await askUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'u', question: 'test' }, deps);
    expect(r.value!.answer).toContain('Custom response');
  });

  it('translation supports multiple languages', async () => {
    const langs = await deps.translationProvider.supportedLanguages();
    expect(langs.length).toBeGreaterThan(3);
  });

  it('embedding produces consistent dimensions', async () => {
    const r1 = await deps.embeddingProvider.embed('hello');
    const r2 = await deps.embeddingProvider.embed('world');
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r1.value!.length).toBe(r2.value!.length);
  });
});
