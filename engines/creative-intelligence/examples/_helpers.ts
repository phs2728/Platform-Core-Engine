/** Example helpers — Creative Intelligence RC2 */
import type { CreativeUseCaseDeps } from '../src/index.js';
import {
  InMemoryArtDirectionRepository, InMemoryPremiumReviewRepository,
  InMemoryDesignCritiqueRepository, InMemoryDesignRecommendationRepository,
  InMemoryAIArtifactDetectionRepository, InMemoryLuxuryScoreRepository,
  InMemoryCreativeApprovalRepository, InMemoryCreativeAuditRepository,
  InMemoryOrganizationVerifier, MockCreativeKnowledgeReader, InMemoryEventBus,
  MockCreativeDirector,
} from '../src/index.js';
import type { Result } from '../src/index.js';

export function makeDemoDeps(): CreativeUseCaseDeps {
  const organizationVerifier = new InMemoryOrganizationVerifier();
  organizationVerifier.add('demo', 'org-demo');
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
    idGenerator: { generate: () => `demo-${Date.now()}-${++idCounter}-${Math.floor(Math.random() * 1e6).toString(36)}` },
    clock: { now: () => new Date('2026-07-13T08:00:00.000Z') },
  };
}

export function unwrap<T>(r: Result<T, Error>): T {
  if (!r.ok) throw new Error(`Expected Ok but got Err: ${JSON.stringify(r.error)}`);
  return r.value;
}

export const base = {
  tenantId: 'demo',
  organizationId: 'org-demo',
  correlationId: 'demo-ci',
  actorId: 'demo-user',
};