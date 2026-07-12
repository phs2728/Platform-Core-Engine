/** Test fixtures — Learning Engine */
import type { LearningUseCaseDeps } from '../src/index.js';
import {
  InMemoryLearningRepository, InMemoryPatternRepository, InMemoryTrendRepository,
  InMemoryFeedbackRepository, InMemoryInsightRepository,
  InMemoryKnowledgeEvolutionRepository, InMemoryEvidenceRepository, InMemoryModelRepository,
  InMemoryConfidenceRepository, InMemoryPersonalizationRepository, InMemoryStatisticsRepository,
  InMemoryMemoryRepository, InMemoryLearningAuditRepository,
  InMemoryOrganizationVerifier, StaticLearningPolicyProvider,
  MockLearningProvider, MockAnalyticsProvider, MockBehaviorProvider,
  MockTrendProvider, MockEvidenceProvider, MockFeedbackProvider, MockKnowledgeProvider,
  InMemoryEventBus,
} from '../src/index.js';

export function makeClock() { let o = 0; return { now: () => new Date(new Date('2026-07-12T08:00:00.000Z').getTime() + o++ * 1000) }; }

export function makeDeps(): LearningUseCaseDeps & {
  learningRepo: InMemoryLearningRepository; patternRepo: InMemoryPatternRepository;
  trendRepo: InMemoryTrendRepository; feedbackRepo: InMemoryFeedbackRepository;
  insightRepo: InMemoryInsightRepository; knowledgeEvoRepo: InMemoryKnowledgeEvolutionRepository;
  evidenceRepo: InMemoryEvidenceRepository; modelRepo: InMemoryModelRepository;
  confidenceRepo: InMemoryConfidenceRepository; personalizationRepo: InMemoryPersonalizationRepository;
  statisticsRepo: InMemoryStatisticsRepository; memoryRepo: InMemoryMemoryRepository;
  auditRepo: InMemoryLearningAuditRepository; eventBus: InMemoryEventBus;
  organizationVerifier: InMemoryOrganizationVerifier; policyProvider: StaticLearningPolicyProvider;
} {
  const organizationVerifier = new InMemoryOrganizationVerifier(); organizationVerifier.add('t-1', 'org-1');
  const policyProvider = new StaticLearningPolicyProvider(); policyProvider.set('t-1', { maxProjects: 50 });
  let idCounter = 0;
  return {
    learningRepo: new InMemoryLearningRepository(), patternRepo: new InMemoryPatternRepository(),
    trendRepo: new InMemoryTrendRepository(), feedbackRepo: new InMemoryFeedbackRepository(),
    insightRepo: new InMemoryInsightRepository(), knowledgeEvoRepo: new InMemoryKnowledgeEvolutionRepository(),
    evidenceRepo: new InMemoryEvidenceRepository(), modelRepo: new InMemoryModelRepository(),
    confidenceRepo: new InMemoryConfidenceRepository(), personalizationRepo: new InMemoryPersonalizationRepository(),
    statisticsRepo: new InMemoryStatisticsRepository(), memoryRepo: new InMemoryMemoryRepository(),
    auditRepo: new InMemoryLearningAuditRepository(), eventBus: new InMemoryEventBus(),
    organizationVerifier, policyProvider,
    learningProvider: new MockLearningProvider(), analyticsProvider: new MockAnalyticsProvider(),
    behaviorProvider: new MockBehaviorProvider(), trendProvider: new MockTrendProvider(),
    evidenceProvider: new MockEvidenceProvider(), feedbackProvider: new MockFeedbackProvider(),
    knowledgeProvider: new MockKnowledgeProvider(),
    idGenerator: { generate: () => `id-${Date.now()}-${++idCounter}-${Math.floor(Math.random()*1e6).toString(36)}` },
    clock: makeClock(),
  } as ReturnType<typeof makeDeps>;
}
