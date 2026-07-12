/**
 * Review Engine — Validation Schemas (zod)
 *
 * 사장님 확립 (2026-07-11):
 *  - attributes/metadata = 자유 JSON (Policy가 검증)
 *  - rating = 1~maxRating, half rating 지원
 */

import { z } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Shared Schemas
// ═══════════════════════════════════════════

export const reviewStatusSchema = z.enum([
  'Draft', 'Pending', 'Published',
  'Hidden', 'Reported', 'Rejected',
  'Archived', 'Deleted',
]);

export const reportReasonSchema = z.enum([
  'spam', 'abuse', 'inappropriate',
  'misinformation', 'fraud', 'other',
]);

export const reportStatusSchema = z.enum([
  'Open', 'Investigating', 'Resolved', 'Dismissed',
]);

export const reactionTypeSchema = z.enum([
  'like', 'dislike', 'love', 'helpful',
]);

export const moderationActionSchema = z.enum([
  'approve', 'reject', 'hide', 'restore',
]);

export const ratingSchema = z.object({
  score: z.number().min(0).max(10),
  maxScore: z.number().min(1).max(10),
  weight: z.number().min(0).max(10),
});

export const transactionRefSchema = z.object({
  refType: z.string().min(1).max(128),
  refId: z.string().min(1).max(128),
  verified: z.boolean(),
});

export const attachmentRefSchema = z.object({
  mediaId: z.string().min(1).max(128),
  role: z.enum(['photo', 'video', 'document']),
  displayOrder: z.number().int().min(0),
});

// ═══════════════════════════════════════════
// Review Core Schemas
// ═══════════════════════════════════════════

export const createReviewSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  organizationId: z.string().min(1),
  reviewerId: z.string().min(1),
  targetRef: z.string().min(1).max(256),
  targetType: z.string().min(1).max(100),
  title: z.string().min(1).max(300),
  content: z.string().min(1).max(10000),
  ratingScore: z.number().min(0).max(10),
  language: z.string().min(1).max(10),
  initialStatus: reviewStatusSchema.optional(),
  transactionRefs: z.array(transactionRefSchema).optional(),
  attachments: z.array(attachmentRefSchema).optional(),
  attributes: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateReviewSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  reviewId: z.string().min(1),
  title: z.string().min(1).max(300).optional(),
  content: z.string().min(1).max(10000).optional(),
  attributes: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

export const publishReviewSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  reviewId: z.string().min(1),
});

export const archiveReviewSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  reviewId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export const restoreReviewSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  reviewId: z.string().min(1),
});

export const deleteReviewSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  reviewId: z.string().min(1),
});

export const getReviewSchema = z.object({
  tenantId: z.string().min(1),
  reviewId: z.string().min(1),
});

export const searchReviewsSchema = z.object({
  tenantId: z.string().min(1),
  organizationId: z.string().optional(),
  targetRef: z.string().max(256).optional(),
  targetType: z.string().max(100).optional(),
  reviewerId: z.string().optional(),
  status: reviewStatusSchema.optional(),
  verified: z.boolean().optional(),
  minRating: z.number().min(0).max(10).optional(),
  maxRating: z.number().min(0).max(10).optional(),
  query: z.string().max(200).optional(),
  tags: z.array(z.string()).optional(),
  language: z.string().max(10).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
  sortBy: z.enum(['createdAt', 'rating', 'helpfulCount']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// ═══════════════════════════════════════════
// Rating Schemas
// ═══════════════════════════════════════════

export const changeRatingSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  reviewId: z.string().min(1),
  newScore: z.number().min(0).max(10),
});

// ═══════════════════════════════════════════
// Reply Schemas
// ═══════════════════════════════════════════

export const createReplySchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  reviewId: z.string().min(1),
  authorId: z.string().min(1),
  authorRole: z.enum(['owner', 'staff', 'customer', 'system']),
  content: z.string().min(1).max(5000),
});

export const deleteReplySchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  replyId: z.string().min(1),
});

// ═══════════════════════════════════════════
// Helpful Vote Schemas
// ═══════════════════════════════════════════

export const markHelpfulSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  reviewId: z.string().min(1),
  voterId: z.string().min(1),
  helpful: z.boolean(),
});

export const removeHelpfulSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  reviewId: z.string().min(1),
  voterId: z.string().min(1),
});

// ═══════════════════════════════════════════
// Report Schemas
// ═══════════════════════════════════════════

export const reportReviewSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  reviewId: z.string().min(1),
  reporterId: z.string().min(1),
  reason: reportReasonSchema,
  description: z.string().min(1).max(2000),
});

export const resolveReportSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  reportId: z.string().min(1),
  resolution: z.enum(['published', 'hidden', 'rejected', 'dismissed']),
  note: z.string().max(2000).optional(),
});

// ═══════════════════════════════════════════
// Moderation Schemas
// ═══════════════════════════════════════════

export const moderateReviewSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  reviewId: z.string().min(1),
  action: moderationActionSchema,
  note: z.string().max(2000).optional(),
});

// ═══════════════════════════════════════════
// Reputation Schemas
// ═══════════════════════════════════════════

export const rebuildReputationSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  targetRef: z.string().min(1).max(256),
  targetType: z.string().min(1).max(100),
});

export const getReputationSchema = z.object({
  tenantId: z.string().min(1),
  targetRef: z.string().min(1).max(256),
});
