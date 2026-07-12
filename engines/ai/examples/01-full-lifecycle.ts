/** AI Engine — Demo */
import {
  startConversationUseCase, chatUseCase, askUseCase, explainUseCase,
  generateInsightUseCase, recommendUseCase, nextBestActionUseCase,
  generateUseCase, translateUseCase, classifyUseCase,
  createPromptUseCase, ingestKnowledgeUseCase, queryKnowledgeUseCase,
  InMemoryConversationRepository, InMemoryPromptRepository, InMemoryKnowledgeRepository,
  InMemoryRecommendationRepository, InMemoryInsightRepository, InMemoryPredictionRepository,
  InMemoryAIAuditRepository,
  MockLLMProvider, MockEmbeddingProvider, MockVectorProvider, MockPromptProvider,
  MockKnowledgeProvider, MockTranslationProvider, MockAIContextProvider, MockSearchResultProvider,
  StaticAIPolicyProvider, InMemoryEventBus,
} from '../src/index.js';

async function main() {
  console.log('═══ AI Engine — Demo ═══\n');
  const deps = {
    conversationRepo: new InMemoryConversationRepository(),
    promptRepo: new InMemoryPromptRepository(),
    knowledgeRepo: new InMemoryKnowledgeRepository(),
    recommendationRepo: new InMemoryRecommendationRepository(),
    insightRepo: new InMemoryInsightRepository(),
    predictionRepo: new InMemoryPredictionRepository(),
    auditRepo: new InMemoryAIAuditRepository(),
    eventBus: new InMemoryEventBus(),
    llmProvider: new MockLLMProvider(),
    embeddingProvider: new MockEmbeddingProvider(),
    vectorProvider: new MockVectorProvider(),
    promptProvider: new MockPromptProvider(),
    knowledgeProvider: new MockKnowledgeProvider(),
    translationProvider: new MockTranslationProvider(),
    contextProvider: new MockAIContextProvider(),
    searchProvider: new MockSearchResultProvider(),
    policyProvider: new StaticAIPolicyProvider(),
    idGenerator: { generate: () => `demo-${Math.random().toString(36).slice(2)}` },
    clock: { now: () => new Date('2026-07-11T08:00:00.000Z') },
  };
  deps.policyProvider.set('demo', {});
  deps.contextProvider.addContext('customer::cust-1', { contextType: 'customer', targetRef: 'cust-1', summary: 'VIP customer', facts: { bookings: 12 }, sentiment: 0.8, riskLevel: 'low' });
  deps.searchProvider.addDoc({ documentId: 'd-1', sourceType: 'catalog_item', sourceId: 's-1', title: 'Grand Hotel', content: '5-star', score: 0.9 });

  const u = <T>(r: { ok: boolean; value?: T }): T => r.value as T;

  console.log('▶ 1) Ask AI');
  const answer = u(await askUseCase({ tenantId: 'demo', correlationId: 'd-1', actorId: 'user', question: 'What are my recent bookings?' }, deps));
  console.log(`  ✓ answer: ${answer.answer.slice(0, 60)}...\n`);

  console.log('▶ 2) Start Conversation + Chat');
  const conv = u(await startConversationUseCase({ tenantId: 'demo', correlationId: 'd-2', actorId: 'user', userId: 'u-1', assistantType: 'booking' }, deps));
  const chat = u(await chatUseCase({ tenantId: 'demo', correlationId: 'd-3', actorId: 'user', conversationId: conv.conversationId, message: 'I want to book a room' }, deps));
  console.log(`  ✓ reply: ${chat.reply.slice(0, 60)}...\n`);

  console.log('▶ 3) Generate Insight');
  const insight = u(await generateInsightUseCase({ tenantId: 'demo', correlationId: 'd-4', actorId: 'user', type: 'revenue', targetRef: 'org-1' }, deps));
  console.log(`  ✓ insight: ${insight.title}, confidence: ${insight.confidence}\n`);

  console.log('▶ 4) Recommend');
  const rec = u(await recommendUseCase({ tenantId: 'demo', correlationId: 'd-5', actorId: 'user', type: 'personalized', targetRef: 'cust-1' }, deps));
  console.log(`  ✓ ${rec.items.length} recommendations\n`);

  console.log('▶ 5) Generate Description');
  const gen = u(await generateUseCase({ tenantId: 'demo', correlationId: 'd-6', actorId: 'user', type: 'description', input: 'Ocean view suite' }, deps));
  console.log(`  ✓ generated (${gen.tokensUsed} tokens)\n`);

  console.log('▶ 6) Translate');
  const tr = u(await translateUseCase({ tenantId: 'demo', correlationId: 'd-7', actorId: 'user', text: 'Welcome', from: 'en', to: 'ko' }, deps));
  console.log(`  ✓ ${tr.translated}\n`);

  console.log('▶ 7) Ingest Knowledge + Query');
  u(await ingestKnowledgeUseCase({ tenantId: 'demo', correlationId: 'd-8', content: 'Cancellation is free within 24 hours', source: 'policy' }, deps));
  const kq = u(await queryKnowledgeUseCase({ tenantId: 'demo', query: 'cancellation', limit: 3 }, deps));
  console.log(`  ✓ ${kq.chunks.length} knowledge chunks found\n`);

  console.log('═══ Events Emitted ═══');
  const counts = new Map<string, number>();
  for (const r of deps.eventBus.emitted) counts.set(r.envelope.eventType, (counts.get(r.envelope.eventType) ?? 0) + 1);
  for (const [type, count] of [...counts.entries()].sort()) console.log(`  ${type}: ${count}`);
  console.log('\n═══ Demo Complete ═══');
}
main().catch((e) => { console.error(e); process.exit(1); });
