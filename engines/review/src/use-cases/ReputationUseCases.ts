/**
 * Reputation UseCases (3) — calculateReputation / getReputation / rebuildReputation
 *
 * 사장님 확립: Reputation = averageRating, reviewCount, helpfulScore, trustScore, verifiedRatio
 *
 * trustScore = verifiedRatio * 30 + helpfulScore * 30 + volumeFactor * 20 + avgRating/maxRating * 20
 * (0~100 범위)
 */

import {
  Ok, Err, type Result,
  ValidationError, NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';

import { recordReviewAudit } from '../domain/audit.js';
import { rebuildReputationSchema, getReputationSchema } from '../domain/validation.js';
import { emitReviewEvent } from '../domain/events.js';
import type { ReviewUseCaseDeps } from './types.js';
import type { Reputation, Review } from '../interfaces/index.js';

// ════════════════════════════════════════════════════════════════════════════
// helper: compute reputation from reviews
// ════════════════════════════════════════════════════════════════════════════

function computeReputationFromReviews(
  reviews: Review[],
  targetRef: string,
  targetType: string,
  tenantId: string,
  id: string,
  computedAt: string,
): Reputation {
  const published = reviews.filter((r) => r.status === 'Published');

  const totalReviews = published.length;
  const totalVerified = published.filter((r) => r.verified).length;
  const verifiedRatio = totalReviews > 0 ? totalVerified / totalReviews : 0;

  const ratingSum = published.reduce((sum, r) => sum + r.rating.score * r.rating.weight, 0);
  const weightSum = published.reduce((sum, r) => sum + r.rating.weight, 0);
  const averageRating = weightSum > 0 ? ratingSum / weightSum : 0;

  // rating distribution
  const ratingDistribution: Record<number, number> = {};
  for (const r of published) {
    const bucket = Math.ceil(r.rating.score);
    ratingDistribution[bucket] = (ratingDistribution[bucket] ?? 0) + 1;
  }

  // helpful score
  const totalHelpful = published.reduce((sum, r) => sum + r.helpfulCount, 0);
  const totalReactions = published.reduce((sum, r) =>
    sum + r.reactionCounts.like + r.reactionCounts.helpful + r.reactionCounts.love, 0);
  const helpfulScore = totalReactions > 0 ? Math.min(1, totalHelpful / totalReactions) : 0;

  // trust score (0~100)
  const maxRating = published.length > 0 ? published[0]!.rating.maxScore : 5;
  const ratingFactor = maxRating > 0 ? averageRating / maxRating : 0;
  const volumeFactor = Math.min(1, totalReviews / 50);  // 50 reviews = full volume score
  const trustScore = Math.round(
    verifiedRatio * 30 + helpfulScore * 30 + volumeFactor * 20 + ratingFactor * 20,
  );

  const lastReviewAt = published.length > 0
    ? published.map((r) => r.createdAt).sort().reverse()[0]!
    : null;

  return {
    id,
    tenantId,
    targetRef,
    targetType,
    averageRating,
    totalReviews,
    totalVerified,
    verifiedRatio,
    helpfulScore,
    trustScore,
    ratingDistribution,
    ratingSum,
    lastReviewAt,
    computedAt,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// CALCULATE REPUTATION (returns computed, does not persist)
// ════════════════════════════════════════════════════════════════════════════

export interface CalculateReputationInput {
  tenantId: string;
  targetRef: string;
  targetType: string;
}

export async function calculateReputationUseCase(
  input: CalculateReputationInput,
  deps: ReviewUseCaseDeps,
): Promise<Result<Reputation, ValidationError>> {
  const reviews = await deps.reviewRepo.findByTarget(input.tenantId, input.targetRef);
  const now = deps.clock.now().toISOString();
  const repId = deps.idGenerator.generate();
  return Ok(computeReputationFromReviews(reviews, input.targetRef, input.targetType, input.tenantId, repId, now));
}

// ════════════════════════════════════════════════════════════════════════════
// GET REPUTATION (from cache)
// ════════════════════════════════════════════════════════════════════════════

export interface GetReputationInput {
  tenantId: string;
  targetRef: string;
}

export async function getReputationUseCase(
  input: GetReputationInput,
  deps: ReviewUseCaseDeps,
): Promise<Result<Reputation | null, ValidationError>> {
  const v = getReputationSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  return Ok(await deps.reputationRepo.findByTarget(d.tenantId, d.targetRef));
}

// ════════════════════════════════════════════════════════════════════════════
// REBUILD REPUTATION (compute + persist)
// ════════════════════════════════════════════════════════════════════════════

export interface RebuildReputationInput {
  tenantId: string; correlationId: string; actorId: string;
  targetRef: string;
  targetType: string;
}

export async function rebuildReputationUseCase(
  input: RebuildReputationInput,
  deps: ReviewUseCaseDeps,
): Promise<Result<Reputation, ValidationError>> {
  const v = rebuildReputationSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid rebuild input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const reviews = await deps.reviewRepo.findByTarget(d.tenantId, d.targetRef);
  const now = deps.clock.now().toISOString();

  // Check existing
  const existing = await deps.reputationRepo.findByTarget(d.tenantId, d.targetRef);
  const repId = existing?.id ?? deps.idGenerator.generate();

  const reputation = computeReputationFromReviews(reviews, d.targetRef, d.targetType, d.tenantId, repId, now);

  if (existing) {
    await deps.reputationRepo.update(d.tenantId, repId, {
      averageRating: reputation.averageRating,
      totalReviews: reputation.totalReviews,
      totalVerified: reputation.totalVerified,
      verifiedRatio: reputation.verifiedRatio,
      helpfulScore: reputation.helpfulScore,
      trustScore: reputation.trustScore,
      ratingDistribution: reputation.ratingDistribution,
      ratingSum: reputation.ratingSum,
      lastReviewAt: reputation.lastReviewAt,
      computedAt: now,
    });
  } else {
    await deps.reputationRepo.insert(reputation);
  }

  const envelope: EventEnvelope<{ targetRef: string; trustScore: number; totalReviews: number }> =
    await emitReviewEvent(deps,
      { aggregateId: repId, tenantId: d.tenantId, correlationId: d.correlationId },
      'review.reputation.updated', 'review.reputation.updated.v1',
      { targetRef: d.targetRef, trustScore: reputation.trustScore, totalReviews: reputation.totalReviews });
  await deps.eventBus.emit(envelope);

  // Audit — reputation updates are system-level events, use system org
  await recordReviewAudit(deps.auditRepo, {
    organizationId: 'system', tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    eventType: 'review_reputation_updated',
    metadata: { targetRef: d.targetRef, trustScore: reputation.trustScore, totalReviews: reputation.totalReviews },
  });

  return Ok(reputation);
}
