/**
 * Creative Intelligence RC2 — Use Case Deps
 */
import type {
  IClock, IIdGenerator, IEventBus, IOrganizationVerifier,
  ICreativeKnowledgeReader,
  IArtDirectionRepository, IPremiumReviewRepository, IDesignCritiqueRepository,
  IDesignRecommendationRepository, IAIArtifactDetectionRepository,
  ILuxuryScoreRepository, ICreativeApprovalRepository, ICreativeAuditRepository,
} from '../interfaces/index.js';
import type { MockCreativeDirector } from '../infrastructure/hostAdapters.js';

export interface CreativeUseCaseDeps {
  artDirectionRepo: IArtDirectionRepository;
  premiumReviewRepo: IPremiumReviewRepository;
  designCritiqueRepo: IDesignCritiqueRepository;
  designRecommendationRepo: IDesignRecommendationRepository;
  aiArtifactRepo: IAIArtifactDetectionRepository;
  luxuryScoreRepo: ILuxuryScoreRepository;
  creativeApprovalRepo: ICreativeApprovalRepository;
  auditRepo: ICreativeAuditRepository;
  eventBus: IEventBus;
  organizationVerifier: IOrganizationVerifier;
  creativeKnowledgeReader: ICreativeKnowledgeReader;
  creativeDirector: MockCreativeDirector;  // Senior Art Director simulation
  idGenerator: IIdGenerator;
  clock: IClock;
}