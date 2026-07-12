/**
 * Analytics UseCases (1) — getAnalytics
 *
 * 사장님 확립: Analytics = average, distribution, trend, topReviews, recentReviews
 */

import {
  Ok, Err, type Result,
  ValidationError,
} from '@platform/core-sdk';

import type { ReviewUseCaseDeps } from './types.js';
import type { ReviewAnalytics, AnalyticsQuery, ReactionType } from '../interfaces/index.js';

// ════════════════════════════════════════════════════════════════════════════
// GET ANALYTICS
// ════════════════════════════════════════════════════════════════════════════

export async function getAnalyticsUseCase(
  query: AnalyticsQuery,
  deps: ReviewUseCaseDeps,
): Promise<Result<ReviewAnalytics, ValidationError>> {
  if (!query.tenantId || query.tenantId.length === 0) {
    return Err(new ValidationError('tenantId required'));
  }

  // Get all reviews for this tenant + optional filters
  const allReviews = await deps.reviewRepo.findByOrganization(query.tenantId, query.organizationId ?? '');

  let reviews = allReviews;
  if (query.targetRef !== undefined) {
    reviews = reviews.filter((r) => r.targetRef === query.targetRef);
  }
  if (query.targetType !== undefined) {
    reviews = reviews.filter((r) => r.targetType === query.targetType);
  }
  if (query.startDate !== undefined) {
    reviews = reviews.filter((r) => r.createdAt >= query.startDate!);
  }
  if (query.endDate !== undefined) {
    reviews = reviews.filter((r) => r.createdAt <= query.endDate!);
  }

  const published = reviews.filter((r) => r.status === 'Published');
  const pending = reviews.filter((r) => r.status === 'Pending');
  const reported = reviews.filter((r) => r.status === 'Reported');
  const rejected = reviews.filter((r) => r.status === 'Rejected');

  const totalReviews = reviews.length;
  const verifiedCount = published.filter((r) => r.verified).length;
  const verifiedRatio = published.length > 0 ? verifiedCount / published.length : 0;

  // average rating (weighted)
  const ratingSum = published.reduce((sum, r) => sum + r.rating.score * r.rating.weight, 0);
  const weightSum = published.reduce((sum, r) => sum + r.rating.weight, 0);
  const averageRating = weightSum > 0 ? ratingSum / weightSum : 0;

  // distribution
  const ratingDistribution: Record<number, number> = {};
  for (const r of published) {
    const bucket = Math.ceil(r.rating.score);
    ratingDistribution[bucket] = (ratingDistribution[bucket] ?? 0) + 1;
  }

  // totals
  const totalReplies = published.reduce((sum, r) => sum + r.replyCount, 0);
  const totalHelpfulVotes = published.reduce((sum, r) => sum + r.helpfulCount, 0);

  const totalReactions: Record<ReactionType, number> = { like: 0, dislike: 0, love: 0, helpful: 0 };
  for (const r of published) {
    totalReactions.like += r.reactionCounts.like ?? 0;
    totalReactions.dislike += r.reactionCounts.dislike ?? 0;
    totalReactions.love += r.reactionCounts.love ?? 0;
    totalReactions.helpful += r.reactionCounts.helpful ?? 0;
  }

  // top reviews (by helpfulCount)
  const topReviews = [...published]
    .sort((a, b) => b.helpfulCount - a.helpfulCount)
    .slice(0, 10);

  // recent reviews (by createdAt desc)
  const recentReviews = [...published]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10);

  const analytics: ReviewAnalytics = {
    totalReviews,
    publishedReviews: published.length,
    pendingReviews: pending.length,
    reportedReviews: reported.length,
    rejectedReviews: rejected.length,
    averageRating,
    ratingDistribution,
    verifiedRatio,
    totalReplies,
    totalHelpfulVotes,
    totalReactions,
    topReviews,
    recentReviews,
  };

  return Ok(analytics);
}
