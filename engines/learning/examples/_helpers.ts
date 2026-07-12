/** Learning Engine — Example Helpers */
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
import type { LearningUseCaseDeps } from '../src/index.js';
type AnyResult<T = unknown> = { ok: true; value: T } | { ok: false; error: unknown };
export function unwrap<T>(r: AnyResult<T>): T { if (!r.ok) { const e = r.error as { message?: string }; throw new Error(e?.message ?? 'err'); } return r.value; }
export function makeDemoDeps(): LearningUseCaseDeps {
  const organizationVerifier = new InMemoryOrganizationVerifier(); organizationVerifier.add('demo', 'org-demo');
  const policyProvider = new StaticLearningPolicyProvider(); policyProvider.set('demo', { maxProjects: 50 });
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
    idGenerator: { generate: () => `demo-${Math.random().toString(36).slice(2, 8)}` },
    clock: { now: () => new Date('2026-07-12T08:00:00.000Z') },
  };
}
