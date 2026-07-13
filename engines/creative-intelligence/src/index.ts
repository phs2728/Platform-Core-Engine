/**
 * Creative Intelligence Engine RC2 — Public API
 *
 * Sprint: Senior Art Director Upgrade
 * - Art Direction (8 styles: Luxury/Premium/Editorial/Boutique/Corporate/Minimal/Modern/Playful)
 * - Visual Review (12+3 dimensions)
 * - Design Critique + Recommendation
 * - AI Artifact Detection (9 categories)
 * - Quality Gate (Approve/Reject)
 * - 7 Reports
 */

// Core SDK re-exports
export { type Result, Ok, Err, ValidationError, NotFoundError, ConflictError, type EventEnvelope, createEnvelope, z } from '@platform/core-sdk';

// Types
export type {
  ArtDirection, ArtDirectionRule, ArtDirectionStyle, ArtDirectionStatus,
  VisualStory, FirstImpression,
  VisualHierarchy, Composition, PhotographyDirection, TypographyDirection,
  WhitespaceStrategy, GridSystem, VisualRhythm, VisualConsistency,
  PremiumReview, DesignCritique, DesignCritiqueItem, DesignRecommendation, DesignRecommendationItem,
  ConversionReview, EmotionalJourney, InteractionReview, MicroInteractionProfile, MotionDirection,
  AIArtifactDetection, AIArtifactSeverity, BrandEmotion, BrandExpression, LuxuryScore,
  CreativeApproval, ReviewStatus, ReviewSeverity,
  CompetitorResearch, DesignTrend,
} from './interfaces/index.js';

// RC3: Trust Architecture types re-exported from interfaces (which re-exports from core-sdk)
// No duplicate export needed

// Interface types
export type {
  IClock, IIdGenerator, IEventBus, IOrganizationVerifier,
  ICreativeKnowledgeReader,
  IArtDirectionRepository, IPremiumReviewRepository, IDesignCritiqueRepository,
  IDesignRecommendationRepository, IAIArtifactDetectionRepository,
  ILuxuryScoreRepository, ICreativeApprovalRepository, ICreativeAuditRepository,
} from './interfaces/index.js';

// Use Cases — Art Direction
export {
  createArtDirectionUseCase, activateArtDirectionUseCase, getArtDirectionByStyleUseCase,
  generateArtDirectionUseCase,
} from './use-cases/ArtDirectionUseCases.js';

// Use Cases — Visual Review (12 + 3)
export {
  reviewVisualHierarchyUseCase, reviewWhitespaceUseCase, reviewTypographyUseCase,
  reviewPhotographyUseCase, reviewCompositionUseCase, reviewScrollExperienceUseCase,
  reviewMicroInteractionUseCase, reviewVisualConsistencyUseCase,
  reviewBrandExpressionUseCase, reviewEmotionalJourneyUseCase, reviewConversionUseCase,
  reviewFirstImpressionUseCase, reviewPremiumQualityUseCase, reviewLuxuryUseCase,
  reviewAISmellUseCase,
} from './use-cases/VisualReviewUseCases.js';

// Use Cases — Critique, Approval, Report
export {
  generateCreativeCritiqueUseCase, generateVisualRecommendationsUseCase,
  generatePhotographyGuideUseCase, generateMotionGuideUseCase, generateInteractionGuideUseCase,
  approveCreativeUseCase, rejectCreativeUseCase, generateReportUseCase,
} from './use-cases/CritiqueApprovalUseCases.js';

// Use Cases — Trust Architecture (RC3 Platform Vision v2)
export {
  generateTrustArchitectureReportUseCase,
  generateCustomerPsychologyReportUseCase,
  generateEvidencePlacementStrategyUseCase,
  generateObjectionMapUseCase,
  generateConfidenceJourneyUseCase,
  generateDecisionJourneyUseCase,
  generateTrustChecklistUseCase,
  getIndustryTrustProfileUseCase,
} from './use-cases/TrustArchitectureUseCases.js';

// Use Cases — Customer Decision Architecture (RC3.1 Platform Vision)
export {
  generateCustomerDecisionArchitectureUseCase,
  generateDecisionJourneyUseCase as generateCDADecisionJourneyUseCase,
  generateDetailStrategyUseCase,
  generateTrustEvidencePlacementUseCase,
  generateObjectionLibraryUseCase,
  generateFAQStrategyUseCase,
  generateAIConciergeStrategyUseCase,
  generateSocialProofStrategyUseCase,
  generateStoryArchitectureUseCase,
  generateIndustryDetailBlueprintUseCase,
  generateCustomerQuestionModelUseCase,
  validateSectionExistenceUseCase,
  getIndustryDetailBlueprintUseCase,
  getObjectionLibraryUseCase,
} from './use-cases/CDAUseCases.js';

// Trust Industry Profiles (5 industries, RC3) + Industry Detail Blueprints (12 industries, RC3.1)
export { INDUSTRY_TRUST_PROFILES, INDUSTRY_DETAIL_BLUEPRINTS, OBJECTION_LIBRARIES, JOURNEY_STEPS, generateCustomerQuestions, generateQuestionSequence } from './infrastructure/hostAdapters.js';

// Events
export { CREATIVE_EVENTS, type CreativeEventType, CREATIVE_EVENT_SCHEMAS } from './domain/events.js';

export type { CreativeUseCaseDeps } from './use-cases/types.js';

// In-Memory Repositories
export {
  InMemoryArtDirectionRepository, InMemoryPremiumReviewRepository,
  InMemoryDesignCritiqueRepository, InMemoryDesignRecommendationRepository,
  InMemoryAIArtifactDetectionRepository, InMemoryLuxuryScoreRepository,
  InMemoryCreativeApprovalRepository, InMemoryCreativeAuditRepository,
} from './infrastructure/InMemoryRepositories.js';

// Host Adapters + Mock Creative Director
export {
  InMemoryOrganizationVerifier, MockCreativeKnowledgeReader, InMemoryEventBus, type RecordedEnvelope,
  MockCreativeDirector,
} from './infrastructure/hostAdapters.js';