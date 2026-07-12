/**
 * Review Engine — Public Interfaces
 *
 * 사장님 확립 (2026-07-11) Phase 5 — Trust & Reputation Engine.
 * 8-state machine: Draft→Pending→Published (+Hidden/Reported/Rejected/Archived/Deleted)
 *
 * NOT just star ratings — Platform-wide trust, reputation, moderation system.
 *
 * Entities: Review, Rating, ReviewReply, ReviewReport, Reaction,
 *           HelpfulVote, ReviewAttachment, ReviewAnalytics, Reputation
 */

import type { Result, EventEnvelope } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Core Infra (모든 Engine 공통)
// ═══════════════════════════════════════════

export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IEventBus { emit<T>(envelope: EventEnvelope<T>): Promise<void>; }

// ═══════════════════════════════════════════
// Engine-Specific Host Interfaces (3-Layer DI)
// ═══════════════════════════════════════════

/**
 * Organization 존재 검증 (Organization Engine 직접 호출 ❌).
 */
export interface IOrganizationVerifier {
  verify(tenantId: string, organizationId: string): Promise<boolean>;
}

/**
 * User 존재 검증 (User Engine 직접 호출 ❌).
 */
export interface IUserVerifier {
  verify(tenantId: string, userId: string): Promise<boolean>;
}

/**
 * Media ID 검증 (Media Engine 직접 호출 ❌ — Sprint 1에서는 느슨한 검증).
 */
export interface IMediaVerifier {
  verify(tenantId: string, mediaId: string): Promise<boolean>;
}

/**
 * Transaction Reference 검증 — 실제 거래가 있는 경우만 Verified Review.
 * refType: generic cross-engine type identifier (e.g. transaction, catalog, scheduling).
 */
export interface ITransactionVerifier {
  verify(tenantId: string, refType: string, refId: string): Promise<boolean>;
}

/**
 * Custom Data Policy — 사장님 확립 표준.
 * Use Case 진입 시 1회 호출 (Business Logic 중간 호출 ❌ — 복잡도 방지).
 */
export interface ICustomDataPolicyProvider {
  validateAttributes(
    tenantId: string,
    type: string,
    attributes: Record<string, unknown>,
  ): Promise<Result<Record<string, unknown>, Error>>;

  /** Tenant가 허용하는 review type 목록. */
  getAllowedReviewTypes(tenantId: string): Promise<readonly string[]>;

  /** Tenant 내 Review 수 제한. */
  getMaxReviewsPerOrg(tenantId: string): Promise<number>;

  /** Rating 범위 (기본 5). */
  getMaxRating(tenantId: string): Promise<number>;

  /** 자동 모더레이션 활성화 여부. */
  isAutoModerationEnabled(tenantId: string): Promise<boolean>;

  /** 중복 리뷰 허용 여부 (동일 reviewer + 동일 target). */
  isDuplicateReviewAllowed(tenantId: string): Promise<boolean>;
}

/**
 * Moderation Hook — AI / Manual / Admin moderation via plugin.
 * Engine defines interface; Host implements.
 */
export interface IModerationHook {
  moderate(
    tenantId: string,
    reviewId: string,
    content: string,
  ): Promise<Result<ModerationVerdict, Error>>;
}

export interface ModerationVerdict {
  action: 'approve' | 'flag' | 'reject';
  reason: string;
  confidence: number;
  categories: string[];
}

// ═══════════════════════════════════════════
// Value Objects & Enums
// ═══════════════════════════════════════════

export type ReviewStatus =
  | 'Draft' | 'Pending' | 'Published'
  | 'Hidden' | 'Reported' | 'Rejected'
  | 'Archived' | 'Deleted';

export type ReportReason =
  | 'spam' | 'abuse' | 'inappropriate'
  | 'misinformation' | 'fraud' | 'other';

export type ReportStatus = 'Open' | 'Investigating' | 'Resolved' | 'Dismissed';

export type ReactionType = 'like' | 'dislike' | 'love' | 'helpful';

export type ModerationAction =
  | 'approve' | 'reject' | 'hide' | 'restore';

/**
 * Rating — 1~maxRating (기본 5), half rating 지원 (0.5 단위).
 */
export interface Rating {
  score: number;        // e.g. 4.5
  maxScore: number;     // e.g. 5
  weight: number;       // 가중치 (verified review = higher weight)
}

/**
 * Cross-engine reference — foreign engine ID만 보관 (foreign engine 직접 import ❌).
 */
export interface TransactionReference {
  refType: string;      // generic cross-engine type identifier
  refId: string;
  verified: boolean;    // 실제 거래 확인 여부
}

/**
 * Media attachment reference — Media Engine ID만 보관 (실제 파일 ❌).
 */
export interface ReviewAttachmentRef {
  mediaId: string;
  role: 'photo' | 'video' | 'document';
  displayOrder: number;
}

// ═══════════════════════════════════════════
// Core Entities
// ═══════════════════════════════════════════

/**
 * Review — the aggregate root.
 * targetRef: 리뷰 대상 (catalog item, service, experience 등 — generic ref).
 */
export interface Review {
  id: string;
  tenantId: string;
  organizationId: string;            // 👈 Org Required (사장님 확립)

  reviewerId: string;                // User ID (작성자)

  targetRef: string;                 // 리뷰 대상 식별자 (generic: catalog-item, service, experience 등)
  targetType: string;                // 대상 type (free-form: 'item', 'service', 'experience', 'stay')

  title: string;
  content: string;
  status: ReviewStatus;

  rating: Rating;

  verified: boolean;                 // 실제 거래 확인 시 true
  transactionRefs: TransactionReference[];

  attachments: ReviewAttachmentRef[];

  attributes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  tags: string[];

  helpfulCount: number;
  reactionCounts: Record<ReactionType, number>;
  replyCount: number;

  moderationAction: ModerationAction | null;
  moderatedBy: string | null;
  moderatedAt: string | null;
  moderationNote: string | null;

  language: string;                  // 'ko', 'en', 'ka', etc.

  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
}

/**
 * ReviewReply — 리뷰에 대한 답글 (조직 측 또는 다른 사용자).
 */
export interface ReviewReply {
  id: string;
  tenantId: string;
  reviewId: string;
  authorId: string;
  authorRole: 'owner' | 'staff' | 'customer' | 'system';
  content: string;
  status: 'Active' | 'Hidden' | 'Deleted';
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * ReviewReport — 신고.
 */
export interface ReviewReport {
  id: string;
  tenantId: string;
  reviewId: string;
  reporterId: string;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  resolvedBy: string | null;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

/**
 * HelpfulVote — 도움이 돼요 투표.
 */
export interface HelpfulVote {
  id: string;
  tenantId: string;
  reviewId: string;
  voterId: string;
  helpful: boolean;                  // true = helpful, false = not helpful
  createdAt: string;
}

/**
 * Reaction — 리뷰 반응 (like/dislike/love/helpful).
 */
export interface ReviewReaction {
  id: string;
  tenantId: string;
  reviewId: string;
  userId: string;
  type: ReactionType;
  createdAt: string;
}

/**
 * Reputation — 리뷰 대상의 평판 점수 (cached, rebuilt on demand).
 */
export interface Reputation {
  id: string;
  tenantId: string;
  targetRef: string;
  targetType: string;

  averageRating: number;
  totalReviews: number;
  totalVerified: number;
  verifiedRatio: number;
  helpfulScore: number;              // helpfulCount / total votes
  trustScore: number;                // 종합 신뢰도 (0~100)

  ratingDistribution: Record<number, number>;  // {1: 2, 2: 0, 3: 5, 4: 10, 5: 30}
  ratingSum: number;

  lastReviewAt: string | null;
  computedAt: string;
}

// ═══════════════════════════════════════════
// Analytics
// ═══════════════════════════════════════════

export interface ReviewAnalytics {
  totalReviews: number;
  publishedReviews: number;
  pendingReviews: number;
  reportedReviews: number;
  rejectedReviews: number;

  averageRating: number;
  ratingDistribution: Record<number, number>;

  verifiedRatio: number;
  totalReplies: number;
  totalHelpfulVotes: number;
  totalReactions: Record<ReactionType, number>;

  topReviews: Review[];              // helpfulCount 내림차순
  recentReviews: Review[];           // createdAt 내림차순
}

export interface AnalyticsQuery {
  tenantId: string;
  organizationId?: string;
  targetRef?: string;
  targetType?: string;
  startDate?: string;
  endDate?: string;
}

// ═══════════════════════════════════════════
// Search
// ═══════════════════════════════════════════

export interface ReviewSearchCriteria {
  tenantId: string;
  organizationId?: string;
  targetRef?: string;
  targetType?: string;
  reviewerId?: string;
  status?: ReviewStatus;
  verified?: boolean;
  minRating?: number;
  maxRating?: number;
  query?: string;                    // title/content 검색
  tags?: string[];
  language?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'rating' | 'helpfulCount';
  sortOrder?: 'asc' | 'desc';
}

export interface ReviewSearchResult {
  reviews: Review[];
  total: number;
  limit: number;
  offset: number;
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export type ReviewAuditEventType =
  | 'review_created'
  | 'review_updated'
  | 'review_published'
  | 'review_archived'
  | 'review_restored'
  | 'review_deleted'
  | 'review_rating_changed'
  | 'review_reported'
  | 'review_report_resolved'
  | 'review_hidden'
  | 'review_moderated'
  | 'review_reply_created'
  | 'review_reply_deleted'
  | 'review_helpful_voted'
  | 'review_reaction_added'
  | 'review_reputation_updated';

export interface ReviewAuditRecord {
  id: string;
  tenantId: string;
  organizationId: string;
  reviewId?: string;
  replyId?: string;
  reportId?: string;
  actorId: string;
  correlationId: string;
  eventType: ReviewAuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Repositories
// ═══════════════════════════════════════════

export interface IReviewRepository {
  insert(review: Review): Promise<void>;
  findById(tenantId: string, id: string): Promise<Review | null>;
  findByTarget(tenantId: string, targetRef: string): Promise<Review[]>;
  findByReviewer(tenantId: string, reviewerId: string): Promise<Review[]>;
  update(tenantId: string, id: string, patch: Partial<Review>): Promise<void>;
  search(criteria: ReviewSearchCriteria): Promise<ReviewSearchResult>;
  existsByReviewerAndTarget(tenantId: string, reviewerId: string, targetRef: string, excludeId?: string): Promise<boolean>;
  findByOrganization(tenantId: string, organizationId: string): Promise<Review[]>;
}

export interface IReplyRepository {
  insert(reply: ReviewReply): Promise<void>;
  findById(tenantId: string, id: string): Promise<ReviewReply | null>;
  findByReview(tenantId: string, reviewId: string): Promise<ReviewReply[]>;
  update(tenantId: string, id: string, patch: Partial<ReviewReply>): Promise<void>;
}

export interface IReportRepository {
  insert(report: ReviewReport): Promise<void>;
  findById(tenantId: string, id: string): Promise<ReviewReport | null>;
  findByReview(tenantId: string, reviewId: string): Promise<ReviewReport[]>;
  findByStatus(tenantId: string, status: ReportStatus): Promise<ReviewReport[]>;
  update(tenantId: string, id: string, patch: Partial<ReviewReport>): Promise<void>;
}

export interface IReactionRepository {
  insert(reaction: ReviewReaction): Promise<void>;
  findById(tenantId: string, id: string): Promise<ReviewReaction | null>;
  findByReviewAndUser(tenantId: string, reviewId: string, userId: string, type: ReactionType): Promise<ReviewReaction | null>;
  findByReview(tenantId: string, reviewId: string): Promise<ReviewReaction[]>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface IHelpfulVoteRepository {
  insert(vote: HelpfulVote): Promise<void>;
  findByReviewAndVoter(tenantId: string, reviewId: string, voterId: string): Promise<HelpfulVote | null>;
  findByReview(tenantId: string, reviewId: string): Promise<HelpfulVote[]>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface IReputationRepository {
  insert(rep: Reputation): Promise<void>;
  findByTarget(tenantId: string, targetRef: string): Promise<Reputation | null>;
  update(tenantId: string, id: string, patch: Partial<Reputation>): Promise<void>;
  listByTenant(tenantId: string, limit?: number): Promise<Reputation[]>;
}

export interface IReviewAuditRepository {
  insert(record: Omit<ReviewAuditRecord, 'id' | 'createdAt'>): Promise<ReviewAuditRecord>;
  findByTenant(tenantId: string, limit?: number): Promise<ReviewAuditRecord[]>;
  findByReview(tenantId: string, reviewId: string, limit?: number): Promise<ReviewAuditRecord[]>;
}

export { type Result, type EventEnvelope };
