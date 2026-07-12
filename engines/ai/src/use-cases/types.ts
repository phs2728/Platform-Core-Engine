/** AI Engine — Shared Use Case Deps */
import type {
  IClock, IIdGenerator, IEventBus,
  IConversationRepository, IPromptRepository, IKnowledgeRepository,
  IRecommendationRepository, IInsightRepository, IPredictionRepository, IAIAuditRepository,
  ILLMProvider, IEmbeddingProvider, IVectorProvider, IPromptProvider,
  IKnowledgeProvider, ITranslationProvider, IAIContextProvider, ISearchResultProvider,
  ICustomDataPolicyProvider,
} from '../interfaces/index.js';

export interface AIUseCaseDeps {
  conversationRepo: IConversationRepository;
  promptRepo: IPromptRepository;
  knowledgeRepo: IKnowledgeRepository;
  recommendationRepo: IRecommendationRepository;
  insightRepo: IInsightRepository;
  predictionRepo: IPredictionRepository;
  auditRepo: IAIAuditRepository;
  // Host providers
  llmProvider: ILLMProvider;
  embeddingProvider: IEmbeddingProvider;
  vectorProvider: IVectorProvider;
  promptProvider: IPromptProvider;
  knowledgeProvider: IKnowledgeProvider;
  translationProvider: ITranslationProvider;
  contextProvider: IAIContextProvider;
  searchProvider: ISearchResultProvider;
  policyProvider: ICustomDataPolicyProvider;
  // Infra
  eventBus: IEventBus;
  idGenerator: IIdGenerator;
  clock: IClock;
}
