/**
 * Review Engine — Public API
 *
 * 사장님 확립 (2026-07-11) Phase 5 — Trust & Reputation Engine.
 *   Platform-wide trust, reputation, moderation system.
 *
 * Sprint 1 Use Cases: 30
 *   Review Core (9) + Rating (2) + Reply (3) + Helpful/Reaction (3) +
 *   Moderation (4) + Report (2) + Reputation (3) + Analytics (1) + Convenience wrappers (3)
 */

// ═══════════════════════════════════════════
// Core SDK Re-exports
// ═══════════════════════════════════════════
export {
  type Result, Ok, Err,
  ValidationError, NotFoundError, ConflictError,
  type EventEnvelope, createEnvelope, z,
} from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Domain Types & Constants
// ═══════════════════════════════════════════
export type {
  Review, ReviewReply, ReviewReport, ReviewReaction, HelpfulVote,
  Reputation, ReviewAnalytics, ReviewAuditRecord, ReviewAuditEventType,
  Rating, TransactionReference, ReviewAttachmentRef,
  ReviewStatus, ReportReason, ReportStatus, ReactionType, ModerationAction,
  ReviewSearchCriteria, ReviewSearchResult, AnalyticsQuery,
  ModerationVerdict,
} from './interfaces/index.js';

// ═══════════════════════════════════════════
// Host Interfaces
// ═══════════════════════════════════════════
export type {
  IClock, IIdGenerator, IEventBus,
  IOrganizationVerifier, IUserVerifier,
  IMediaVerifier, ITransactionVerifier,
  ICustomDataPolicyProvider, IModerationHook,
} from './interfaces/index.js';

// ═══════════════════════════════════════════
// Repository Interfaces
// ═══════════════════════════════════════════
export type {
  IReviewRepository, IReplyRepository,
  IReportRepository, IReactionRepository,
  IHelpfulVoteRepository, IReputationRepository,
  IReviewAuditRepository,
} from './interfaces/index.js';

// ═══════════════════════════════════════════
// Review Core UseCases (9)
// ═══════════════════════════════════════════
export {
  createReviewUseCase, updateReviewUseCase,
  publishReviewUseCase, archiveReviewUseCase,
  restoreReviewUseCase, deleteReviewUseCase,
  getReviewUseCase, searchReviewsUseCase, listReviewsUseCase,
  type CreateReviewInput, type UpdateReviewInput,
  type PublishReviewInput, type ArchiveReviewInput,
  type RestoreReviewInput, type DeleteReviewInput,
  type GetReviewInput, type ListReviewsInput,
} from './use-cases/ReviewCoreUseCases.js';

// ═══════════════════════════════════════════
// Rating UseCases (2)
// ═══════════════════════════════════════════
export {
  changeRatingUseCase, removeRatingUseCase,
  type ChangeRatingInput, type RemoveRatingInput,
} from './use-cases/RatingUseCases.js';

// ═══════════════════════════════════════════
// Reply UseCases (3)
// ═══════════════════════════════════════════
export {
  createReplyUseCase, deleteReplyUseCase, listRepliesUseCase,
  type CreateReplyInput, type DeleteReplyInput,
} from './use-cases/ReplyUseCases.js';

// ═══════════════════════════════════════════
// Engagement (Helpful + Reaction) UseCases (3)
// ═══════════════════════════════════════════
export {
  markHelpfulUseCase, removeHelpfulUseCase, addReactionUseCase,
  type MarkHelpfulInput, type RemoveHelpfulInput, type AddReactionInput,
} from './use-cases/EngagementUseCases.js';

// ═══════════════════════════════════════════
// Moderation + Report UseCases (4+2)
// ═══════════════════════════════════════════
export {
  moderateReviewUseCase, approveReviewUseCase, rejectReviewUseCase, hideReviewUseCase,
  reportReviewUseCase, resolveReportUseCase,
  type ModerateReviewInput, type ApproveReviewInput,
  type RejectReviewInput, type HideReviewInput,
  type ReportReviewInput, type ResolveReportInput,
} from './use-cases/ModerationUseCases.js';

// ═══════════════════════════════════════════
// Reputation UseCases (3)
// ═══════════════════════════════════════════
export {
  calculateReputationUseCase, getReputationUseCase, rebuildReputationUseCase,
  type CalculateReputationInput, type GetReputationInput, type RebuildReputationInput,
} from './use-cases/ReputationUseCases.js';

// ═══════════════════════════════════════════
// Analytics UseCases (1)
// ═══════════════════════════════════════════
export {
  getAnalyticsUseCase,
} from './use-cases/AnalyticsUseCases.js';

// ═══════════════════════════════════════════
// Use Case Deps
// ═══════════════════════════════════════════
export type { ReviewUseCaseDeps } from './use-cases/types.js';

// ═══════════════════════════════════════════
// In-Memory Repositories
// ═══════════════════════════════════════════
export {
  InMemoryReviewRepository,
  InMemoryReplyRepository,
  InMemoryReportRepository,
  InMemoryReactionRepository,
  InMemoryHelpfulVoteRepository,
  InMemoryReputationRepository,
  InMemoryReviewAuditRepository,
} from './infrastructure/InMemoryRepositories.js';

// ═══════════════════════════════════════════
// Host Stubs + EventBus
// ═══════════════════════════════════════════
export {
  InMemoryOrganizationVerifier,
  InMemoryUserVerifier,
  InMemoryMediaVerifier,
  InMemoryTransactionVerifier,
  StaticReviewPolicyProvider,
  MockModerationHook,
  InMemoryEventBus,
  type RecordedEnvelope,
} from './infrastructure/hostAdapters.js';
