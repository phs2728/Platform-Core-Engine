/** Test fixtures — Creative Knowledge Engine */
import type { KnowledgeUseCaseDeps } from '../src/index.js';
import {
  InMemoryResearchRepository, InMemoryInterviewRepository, InMemoryBusinessProfileRepository,
  InMemoryAuditResultRepository, InMemoryCompetitorRepository, InMemoryKnowledgeRepository,
  InMemoryEvidenceRepository, InMemoryRecommendationRepository, InMemoryBenchmarkRepository,
  InMemoryPatternRepository, InMemoryBriefRepository, InMemoryMemoryRepository,
  InMemoryGapAnalysisRepository, InMemoryKnowledgeAuditRepository,
  InMemoryOrganizationVerifier, StaticKnowledgePolicyProvider,
  MockWebsiteAuditProvider, MockCompetitorProvider, MockScreenshotProvider,
  MockHTMLProvider, MockSEOProvider, MockPerformanceProvider, MockAccessibilityProvider,
  MockResearchProvider, MockLLMProvider, InMemoryEventBus,
} from '../src/index.js';

export function makeClock() { let o = 0; return { now: () => new Date(new Date('2026-07-12T08:00:00.000Z').getTime() + o++ * 1000) }; }

export function makeDeps(): KnowledgeUseCaseDeps & {
  researchRepo: InMemoryResearchRepository; interviewRepo: InMemoryInterviewRepository;
  businessProfileRepo: InMemoryBusinessProfileRepository; auditResultRepo: InMemoryAuditResultRepository;
  competitorRepo: InMemoryCompetitorRepository; knowledgeRepo: InMemoryKnowledgeRepository;
  evidenceRepo: InMemoryEvidenceRepository; recommendationRepo: InMemoryRecommendationRepository;
  benchmarkRepo: InMemoryBenchmarkRepository; patternRepo: InMemoryPatternRepository;
  briefRepo: InMemoryBriefRepository; memoryRepo: InMemoryMemoryRepository;
  gapAnalysisRepo: InMemoryGapAnalysisRepository; auditRepo: InMemoryKnowledgeAuditRepository;
  eventBus: InMemoryEventBus; organizationVerifier: InMemoryOrganizationVerifier;
  policyProvider: StaticKnowledgePolicyProvider;
} {
  const organizationVerifier = new InMemoryOrganizationVerifier(); organizationVerifier.add('t-1', 'org-1');
  const policyProvider = new StaticKnowledgePolicyProvider(); policyProvider.set('t-1', { maxProjects: 50 });
  let idCounter = 0;
  return {
    researchRepo: new InMemoryResearchRepository(), interviewRepo: new InMemoryInterviewRepository(),
    businessProfileRepo: new InMemoryBusinessProfileRepository(), auditResultRepo: new InMemoryAuditResultRepository(),
    competitorRepo: new InMemoryCompetitorRepository(), knowledgeRepo: new InMemoryKnowledgeRepository(),
    evidenceRepo: new InMemoryEvidenceRepository(), recommendationRepo: new InMemoryRecommendationRepository(),
    benchmarkRepo: new InMemoryBenchmarkRepository(), patternRepo: new InMemoryPatternRepository(),
    briefRepo: new InMemoryBriefRepository(), memoryRepo: new InMemoryMemoryRepository(),
    gapAnalysisRepo: new InMemoryGapAnalysisRepository(), auditRepo: new InMemoryKnowledgeAuditRepository(),
    eventBus: new InMemoryEventBus(), organizationVerifier, policyProvider,
    websiteAuditProvider: new MockWebsiteAuditProvider(), competitorProvider: new MockCompetitorProvider(),
    screenshotProvider: new MockScreenshotProvider(), htmlProvider: new MockHTMLProvider(),
    seoProvider: new MockSEOProvider(), performanceProvider: new MockPerformanceProvider(),
    accessibilityProvider: new MockAccessibilityProvider(), researchProvider: new MockResearchProvider(),
    llmProvider: new MockLLMProvider(),
    idGenerator: { generate: () => `id-${Date.now()}-${++idCounter}-${Math.floor(Math.random()*1e6).toString(36)}` },
    clock: makeClock(),
  } as ReturnType<typeof makeDeps>;
}
