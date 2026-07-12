/**
 * Rating UseCases (2) — changeRating + removeRating
 *
 * 사장님 확립: Rating = 1~maxRating, half rating 지원, 가중치 (verified=2x)
 */

import {
  Ok, Err, type Result,
  ValidationError, NotFoundError, ConflictError,
  type EventEnvelope,
} from '@platform/core-sdk';

import { recordReviewAudit } from '../domain/audit.js';
import { changeRatingSchema } from '../domain/validation.js';
import { emitReviewEvent } from '../domain/events.js';
import { isReviewMutable } from '../domain/statusTransition.js';
import type { ReviewUseCaseDeps } from './types.js';
import type { Review } from '../interfaces/index.js';

// ════════════════════════════════════════════════════════════════════════════
// CHANGE RATING
// ════════════════════════════════════════════════════════════════════════════

export interface ChangeRatingInput {
  tenantId: string; correlationId: string; actorId: string;
  reviewId: string;
  newScore: number;
}

export async function changeRatingUseCase(
  input: ChangeRatingInput,
  deps: ReviewUseCaseDeps,
): Promise<Result<Review, ValidationError | NotFoundError | ConflictError>> {
  const v = changeRatingSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid rating input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.reviewRepo.findById(d.tenantId, d.reviewId);
  if (!existing) return Err(new NotFoundError('Review not found'));
  if (!isReviewMutable(existing.status)) {
    return Err(new ConflictError(`Cannot change rating — status "${existing.status}"`));
  }

  const maxRating = await deps.policyProvider.getMaxRating(d.tenantId);
  if (d.newScore > maxRating) {
    return Err(new ValidationError(`ratingScore ${d.newScore} exceeds maxRating ${maxRating}`));
  }

  const oldScore = existing.rating.score;
  const now = deps.clock.now().toISOString();
  const newRating = { ...existing.rating, score: d.newScore };
  await deps.reviewRepo.update(d.tenantId, d.reviewId, { rating: newRating, updatedAt: now });

  const updated: Review = { ...existing, rating: newRating, updatedAt: now };

  const envelope: EventEnvelope<{ reviewId: string; oldScore: number; newScore: number }> =
    await emitReviewEvent(deps,
      { aggregateId: d.reviewId, tenantId: d.tenantId, correlationId: d.correlationId },
      'review.rating.changed', 'review.rating.changed.v1',
      { reviewId: d.reviewId, oldScore, newScore: d.newScore });
  await deps.eventBus.emit(envelope);

  await recordReviewAudit(deps.auditRepo, {
    organizationId: existing.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    reviewId: d.reviewId, eventType: 'review_rating_changed',
    metadata: { oldScore, newScore: d.newScore },
  });

  return Ok(updated);
}

// ════════════════════════════════════════════════════════════════════════════
// REMOVE RATING (set to 0)
// ════════════════════════════════════════════════════════════════════════════

export interface RemoveRatingInput {
  tenantId: string; correlationId: string; actorId: string;
  reviewId: string;
}

export async function removeRatingUseCase(
  input: RemoveRatingInput,
  deps: ReviewUseCaseDeps,
): Promise<Result<Review, ValidationError | NotFoundError | ConflictError>> {
  const existing = await deps.reviewRepo.findById(input.tenantId, input.reviewId);
  if (!existing) return Err(new NotFoundError('Review not found'));
  if (!isReviewMutable(existing.status)) {
    return Err(new ConflictError(`Cannot remove rating — status "${existing.status}"`));
  }

  const oldScore = existing.rating.score;
  const now = deps.clock.now().toISOString();
  const newRating = { ...existing.rating, score: 0 };
  await deps.reviewRepo.update(input.tenantId, input.reviewId, { rating: newRating, updatedAt: now });

  const updated: Review = { ...existing, rating: newRating, updatedAt: now };

  const envelope: EventEnvelope<{ reviewId: string; oldScore: number }> =
    await emitReviewEvent(deps,
      { aggregateId: input.reviewId, tenantId: input.tenantId, correlationId: input.correlationId },
      'review.rating.changed', 'review.rating.changed.v1',
      { reviewId: input.reviewId, oldScore });
  await deps.eventBus.emit(envelope);

  await recordReviewAudit(deps.auditRepo, {
    organizationId: existing.organizationId, tenantId: input.tenantId,
    actorId: input.actorId, correlationId: input.correlationId,
    reviewId: input.reviewId, eventType: 'review_rating_changed',
    metadata: { oldScore, newScore: 0 },
  });

  return Ok(updated);
}
