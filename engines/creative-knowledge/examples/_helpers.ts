/** Creative Knowledge Engine — Example Helpers */
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
import type { KnowledgeUseCaseDeps } from '../src/index.js';
type AnyResult<T = unknown> = { ok: true; value: T } | { ok: false; error: unknown };
export function unwrap<T>(r: AnyResult<T>): T { if (!r.ok) { const e = r.error as { message?: string }; throw new Error(e?.message ?? 'err'); } return r.value; }
export function makeDemoDeps(): KnowledgeUseCaseDeps {
  const organizationVerifier = new InMemoryOrganizationVerifier(); organizationVerifier.add('demo', 'org-demo');
  const policyProvider = new StaticKnowledgePolicyProvider(); policyProvider.set('demo', { maxProjects: 50 });
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
    idGenerator: { generate: () => `demo-${Math.random().toString(36).slice(2, 8)}` },
    clock: { now: () => new Date('2026-07-12T08:00:00.000Z') },
  };
}
