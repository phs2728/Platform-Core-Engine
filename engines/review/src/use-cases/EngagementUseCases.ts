/**
 * Helpful + Reaction UseCases (3) — markHelpful / removeHelpful / addReaction
 *
 * 사장님 확립: HelpfulVote = 도움이 돼요, Reaction = like/dislike/love/helpful
 */

import {
  Ok, Err, type Result,
  ValidationError, NotFoundError, ConflictError,
  type EventEnvelope,
} from '@platform/core-sdk';

import { recordReviewAudit } from '../domain/audit.js';
import { markHelpfulSchema, removeHelpfulSchema } from '../domain/validation.js';
import { emitReviewEvent } from '../domain/events.js';
import type { ReviewUseCaseDeps } from './types.js';
import type { Review, HelpfulVote, ReviewReaction, ReactionType } from '../interfaces/index.js';

// ════════════════════════════════════════════════════════════════════════════
// MARK HELPFUL
// ════════════════════════════════════════════════════════════════════════════

export interface MarkHelpfulInput {
  tenantId: string; correlationId: string; actorId: string;
  reviewId: string;
  voterId: string;
  helpful: boolean;
}

export async function markHelpfulUseCase(
  input: MarkHelpfulInput,
  deps: ReviewUseCaseDeps,
): Promise<Result<HelpfulVote, ValidationError | NotFoundError | ConflictError>> {
  const v = markHelpfulSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid helpful input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const review = await deps.reviewRepo.findById(d.tenantId, d.reviewId);
  if (!review) return Err(new NotFoundError('Review not found'));

  // Voter 존재 검증
  const voterOk = await deps.userVerifier.verify(d.tenantId, d.voterId);
  if (!voterOk) return Err(new ValidationError('Voter not found', { details: { voterId: d.voterId } }));

  // 기존 vote 확인
  const existing = await deps.helpfulRepo.findByReviewAndVoter(d.tenantId, d.reviewId, d.voterId);
  if (existing) {
    return Err(new ConflictError('Already voted — use removeHelpful first', { details: { existingVoteId: existing.id } }));
  }

  const voteId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();

  const vote: HelpfulVote = {
    id: voteId,
    tenantId: d.tenantId,
    reviewId: d.reviewId,
    voterId: d.voterId,
    helpful: d.helpful,
    createdAt: now,
  };

  await deps.helpfulRepo.insert(vote);

  // review helpfulCount update
  const newCount = d.helpful ? review.helpfulCount + 1 : review.helpfulCount;
  await deps.reviewRepo.update(d.tenantId, d.reviewId, { helpfulCount: newCount, updatedAt: now });

  const envelope: EventEnvelope<{ reviewId: string; voterId: string; helpful: boolean }> =
    await emitReviewEvent(deps,
      { aggregateId: d.reviewId, tenantId: d.tenantId, correlationId: d.correlationId },
      'review.helpful', 'review.helpful.v1',
      { reviewId: d.reviewId, voterId: d.voterId, helpful: d.helpful });
  await deps.eventBus.emit(envelope);

  await recordReviewAudit(deps.auditRepo, {
    organizationId: review.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    reviewId: d.reviewId, eventType: 'review_helpful_voted',
    metadata: { helpful: d.helpful },
  });

  return Ok(vote);
}

// ════════════════════════════════════════════════════════════════════════════
// REMOVE HELPFUL
// ════════════════════════════════════════════════════════════════════════════

export interface RemoveHelpfulInput {
  tenantId: string; correlationId: string; actorId: string;
  reviewId: string;
  voterId: string;
}

export async function removeHelpfulUseCase(
  input: RemoveHelpfulInput,
  deps: ReviewUseCaseDeps,
): Promise<Result<{ removed: boolean }, ValidationError | NotFoundError>> {
  const v = removeHelpfulSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid remove helpful input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const review = await deps.reviewRepo.findById(d.tenantId, d.reviewId);
  if (!review) return Err(new NotFoundError('Review not found'));

  const existing = await deps.helpfulRepo.findByReviewAndVoter(d.tenantId, d.reviewId, d.voterId);
  if (!existing) return Err(new NotFoundError('Vote not found'));

  await deps.helpfulRepo.delete(d.tenantId, existing.id);

  // review helpfulCount decrement
  if (existing.helpful) {
    const newCount = Math.max(0, review.helpfulCount - 1);
    await deps.reviewRepo.update(d.tenantId, d.reviewId, { helpfulCount: newCount, updatedAt: deps.clock.now().toISOString() });
  }

  return Ok({ removed: true });
}

// ════════════════════════════════════════════════════════════════════════════
// ADD REACTION (like/dislike/love/helpful)
// ════════════════════════════════════════════════════════════════════════════

export interface AddReactionInput {
  tenantId: string; correlationId: string; actorId: string;
  reviewId: string;
  userId: string;
  type: ReactionType;
}

export async function addReactionUseCase(
  input: AddReactionInput,
  deps: ReviewUseCaseDeps,
): Promise<Result<ReviewReaction, ValidationError | NotFoundError | ConflictError>> {
  const review = await deps.reviewRepo.findById(input.tenantId, input.reviewId);
  if (!review) return Err(new NotFoundError('Review not found'));

  // User 검증
  const userOk = await deps.userVerifier.verify(input.tenantId, input.userId);
  if (!userOk) return Err(new ValidationError('User not found', { details: { userId: input.userId } }));

  // 기존 reaction 같은 type 있는지 확인
  const existing = await deps.reactionRepo.findByReviewAndUser(input.tenantId, input.reviewId, input.userId, input.type);
  if (existing) {
    return Err(new ConflictError('Reaction already exists for this type'));
  }

  const reactionId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();

  const reaction: ReviewReaction = {
    id: reactionId,
    tenantId: input.tenantId,
    reviewId: input.reviewId,
    userId: input.userId,
    type: input.type,
    createdAt: now,
  };

  await deps.reactionRepo.insert(reaction);

  // review reactionCounts increment
  const newCounts: Record<string, number> = { ...review.reactionCounts };
  newCounts[input.type] = (newCounts[input.type] ?? 0) + 1;
  await deps.reviewRepo.update(input.tenantId, input.reviewId, { reactionCounts: newCounts, updatedAt: now });

  const envelope: EventEnvelope<{ reviewId: string; userId: string; type: ReactionType }> =
    await emitReviewEvent(deps,
      { aggregateId: input.reviewId, tenantId: input.tenantId, correlationId: input.correlationId },
      'review.reaction.added', 'review.reaction.added.v1',
      { reviewId: input.reviewId, userId: input.userId, type: input.type });
  await deps.eventBus.emit(envelope);

  await recordReviewAudit(deps.auditRepo, {
    organizationId: review.organizationId, tenantId: input.tenantId,
    actorId: input.actorId, correlationId: input.correlationId,
    reviewId: input.reviewId, eventType: 'review_reaction_added',
    metadata: { type: input.type, userId: input.userId },
  });

  return Ok(reaction);
}
