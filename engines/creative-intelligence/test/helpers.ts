/** Test fixtures — Creative Intelligence RC2 */
import type { CreativeUseCaseDeps } from '../src/index.js';
import {
  InMemoryArtDirectionRepository, InMemoryPremiumReviewRepository,
  InMemoryDesignCritiqueRepository, InMemoryDesignRecommendationRepository,
  InMemoryAIArtifactDetectionRepository, InMemoryLuxuryScoreRepository,
  InMemoryCreativeApprovalRepository, InMemoryCreativeAuditRepository,
  InMemoryOrganizationVerifier, MockCreativeKnowledgeReader, InMemoryEventBus,
  MockCreativeDirector,
} from '../src/index.js';

export function makeClock() {
  let o = 0;
  return { now: () => new Date(new Date('2026-07-13T08:00:00.000Z').getTime() + o++ * 1000) };
}

export function makeDeps(): CreativeUseCaseDeps & {
  artDirectionRepo: InMemoryArtDirectionRepository;
  premiumReviewRepo: InMemoryPremiumReviewRepository;
  designCritiqueRepo: InMemoryDesignCritiqueRepository;
  designRecommendationRepo: InMemoryDesignRecommendationRepository;
  aiArtifactRepo: InMemoryAIArtifactDetectionRepository;
  luxuryScoreRepo: InMemoryLuxuryScoreRepository;
  creativeApprovalRepo: InMemoryCreativeApprovalRepository;
  auditRepo: InMemoryCreativeAuditRepository;
  eventBus: InMemoryEventBus;
  organizationVerifier: InMemoryOrganizationVerifier;
  creativeKnowledgeReader: MockCreativeKnowledgeReader;
  creativeDirector: MockCreativeDirector;
} {
  const organizationVerifier = new InMemoryOrganizationVerifier();
  organizationVerifier.add('t-1', 'org-1');
  const creativeKnowledgeReader = new MockCreativeKnowledgeReader();
  const creativeDirector = new MockCreativeDirector();
  let idCounter = 0;
  return {
    artDirectionRepo: new InMemoryArtDirectionRepository(),
    premiumReviewRepo: new InMemoryPremiumReviewRepository(),
    designCritiqueRepo: new InMemoryDesignCritiqueRepository(),
    designRecommendationRepo: new InMemoryDesignRecommendationRepository(),
    aiArtifactRepo: new InMemoryAIArtifactDetectionRepository(),
    luxuryScoreRepo: new InMemoryLuxuryScoreRepository(),
    creativeApprovalRepo: new InMemoryCreativeApprovalRepository(),
    auditRepo: new InMemoryCreativeAuditRepository(),
    eventBus: new InMemoryEventBus(),
    organizationVerifier, creativeKnowledgeReader, creativeDirector,
    idGenerator: { generate: () => `id-${Date.now()}-${++idCounter}-${Math.floor(Math.random() * 1e6).toString(36)}` },
    clock: makeClock(),
  } as ReturnType<typeof makeDeps>;
}

export const baseInput = {
  tenantId: 't-1',
  organizationId: 'org-1',
  correlationId: 'corr-1',
  actorId: 'user-1',
};

export function unwrap<T>(r: { ok: boolean; value?: T; error?: unknown }): T {
  if (!r.ok) throw new Error(`Expected Ok but got Err: ${JSON.stringify(r.error)}`);
  return r.value!;
}