/** Test fixtures — AI Engine */
import type { AIUseCaseDeps } from '../src/use-cases/types.js';
import {
  InMemoryConversationRepository, InMemoryPromptRepository, InMemoryKnowledgeRepository,
  InMemoryRecommendationRepository, InMemoryInsightRepository, InMemoryPredictionRepository,
  InMemoryAIAuditRepository,
  MockLLMProvider, MockEmbeddingProvider, MockVectorProvider, MockPromptProvider,
  MockKnowledgeProvider, MockTranslationProvider, MockAIContextProvider, MockSearchResultProvider,
  StaticAIPolicyProvider, InMemoryEventBus,
} from '../src/index.js';

export function makeClock() {
  let offset = 0;
  const base = new Date('2026-07-11T08:00:00.000Z');
  return { now: () => new Date(base.getTime() + offset++ * 1000) };
}

export function makeDeps(): AIUseCaseDeps & {
  conversationRepo: InMemoryConversationRepository; promptRepo: InMemoryPromptRepository;
  knowledgeRepo: InMemoryKnowledgeRepository; recommendationRepo: InMemoryRecommendationRepository;
  insightRepo: InMemoryInsightRepository; predictionRepo: InMemoryPredictionRepository;
  auditRepo: InMemoryAIAuditRepository;
  llmProvider: MockLLMProvider; embeddingProvider: MockEmbeddingProvider;
  vectorProvider: MockVectorProvider; promptProvider: MockPromptProvider;
  knowledgeProvider: MockKnowledgeProvider; translationProvider: MockTranslationProvider;
  contextProvider: MockAIContextProvider; searchProvider: MockSearchResultProvider;
  policyProvider: StaticAIPolicyProvider; eventBus: InMemoryEventBus;
  idGenerator: { generate(): string }; clock: { now(): Date };
} {
  const conversationRepo = new InMemoryConversationRepository();
  const promptRepo = new InMemoryPromptRepository();
  const knowledgeRepo = new InMemoryKnowledgeRepository();
  const recommendationRepo = new InMemoryRecommendationRepository();
  const insightRepo = new InMemoryInsightRepository();
  const predictionRepo = new InMemoryPredictionRepository();
  const auditRepo = new InMemoryAIAuditRepository();
  const eventBus = new InMemoryEventBus();
  const llmProvider = new MockLLMProvider();
  const embeddingProvider = new MockEmbeddingProvider();
  const vectorProvider = new MockVectorProvider();
  const promptProvider = new MockPromptProvider();
  const knowledgeProvider = new MockKnowledgeProvider();
  const translationProvider = new MockTranslationProvider();
  const contextProvider = new MockAIContextProvider();
  const searchProvider = new MockSearchResultProvider();
  const policyProvider = new StaticAIPolicyProvider();

  policyProvider.set('t-1', {});
  contextProvider.addContext('customer::cust-1', {
    contextType: 'customer', targetRef: 'cust-1',
    summary: 'Active customer with 5 bookings', facts: { bookings: 5 },
    sentiment: 0.7, riskLevel: 'low',
  });
  searchProvider.addDoc({ documentId: 'd-1', sourceType: 'catalog_item', sourceId: 's-1', title: 'Luxury Hotel', content: '5-star hotel', score: 0.9 });
  searchProvider.addDoc({ documentId: 'd-2', sourceType: 'catalog_item', sourceId: 's-2', title: 'Budget Hostel', content: 'affordable', score: 0.6 });

  let idCounter = 0;
  const idGenerator = {
    generate(): string { idCounter++; return `id-${Date.now()}-${idCounter}-${Math.floor(Math.random() * 1e6).toString(36)}`; },
  };

  return {
    conversationRepo, promptRepo, knowledgeRepo, recommendationRepo, insightRepo, predictionRepo,
    auditRepo, eventBus, llmProvider, embeddingProvider, vectorProvider, promptProvider,
    knowledgeProvider, translationProvider, contextProvider, searchProvider, policyProvider,
    idGenerator, clock: makeClock(),
  };
}
