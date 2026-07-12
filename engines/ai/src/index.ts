/** AI Engine — Public API */
export { type Result, Ok, Err, ValidationError, NotFoundError, ConflictError, type EventEnvelope, createEnvelope, z } from '@platform/core-sdk';

export type {
  Conversation, ConversationMessage, PromptTemplate,
  AIRecommendation, AIRecommendationItem, AIInsight, AIPrediction,
  AIGeneration, KnowledgeEntry,
  AssistantType, InsightType, PredictionType, RecommendationType, GenerationType,
  LLMProviderType, LLMInput, LLMOutput, ChatInput, ChatOutput, ChatMessage,
  EmbedInput, VectorMatch, KnowledgeChunk, AIContextRef, SearchResultRef,
  AIAuditRecord, AIAuditEventType,
  ILLMProvider, IEmbeddingProvider, IVectorProvider, IPromptProvider,
  IKnowledgeProvider, ITranslationProvider, IAIContextProvider, ISearchResultProvider,
  ICustomDataPolicyProvider,
  IClock, IIdGenerator, IEventBus,
  IConversationRepository, IPromptRepository, IKnowledgeRepository,
  IRecommendationRepository, IInsightRepository, IPredictionRepository, IAIAuditRepository,
} from './interfaces/index.js';

// Assistant UseCases (6)
export {
  startConversationUseCase, askUseCase, chatUseCase,
  endConversationUseCase, explainUseCase, reasonUseCase,
  type StartConversationInput,
} from './use-cases/AssistantUseCases.js';

// Insight + Prediction + Recommendation (10)
export {
  generateInsightUseCase, generateSummaryUseCase, analyzeUseCase,
  predictUseCase, forecastUseCase, estimateRiskUseCase,
  recommendUseCase, nextBestActionUseCase, relatedUseCase, similarUseCase,
} from './use-cases/InsightPredictionUseCases.js';

// Generation + Prompt + Knowledge (11)
export {
  generateUseCase, rewriteUseCase, translateUseCase, classifyUseCase, extractUseCase,
  createPromptUseCase, updatePromptUseCase, listPromptsUseCase, validatePromptUseCase,
  ingestKnowledgeUseCase, queryKnowledgeUseCase,
} from './use-cases/GenerationPromptUseCases.js';

export type { AIUseCaseDeps } from './use-cases/types.js';

// In-Memory Repositories
export {
  InMemoryConversationRepository, InMemoryPromptRepository, InMemoryKnowledgeRepository,
  InMemoryRecommendationRepository, InMemoryInsightRepository, InMemoryPredictionRepository,
  InMemoryAIAuditRepository,
} from './infrastructure/InMemoryRepositories.js';

// Host Stubs
export {
  MockLLMProvider, MockEmbeddingProvider, MockVectorProvider, MockPromptProvider,
  MockKnowledgeProvider, MockTranslationProvider, MockAIContextProvider, MockSearchResultProvider,
  StaticAIPolicyProvider, InMemoryEventBus, type RecordedEnvelope,
} from './infrastructure/hostAdapters.js';
