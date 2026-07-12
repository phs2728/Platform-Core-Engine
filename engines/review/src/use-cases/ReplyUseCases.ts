/**
 * Reply UseCases (3) — createReply / deleteReply / listReplies
 *
 * 사장님 확립: Reply는 owner/staff/customer/system 역할
 */

import {
  Ok, Err, type Result,
  ValidationError, NotFoundError, ConflictError,
  type EventEnvelope,
} from '@platform/core-sdk';

import { recordReviewAudit } from '../domain/audit.js';
import { createReplySchema, deleteReplySchema } from '../domain/validation.js';
import { emitReviewEvent } from '../domain/events.js';
import type { ReviewUseCaseDeps } from './types.js';
import type { Review, ReviewReply } from '../interfaces/index.js';

// ════════════════════════════════════════════════════════════════════════════
// CREATE REPLY
// ════════════════════════════════════════════════════════════════════════════

export interface CreateReplyInput {
  tenantId: string; correlationId: string; actorId: string;
  reviewId: string;
  authorId: string;
  authorRole: 'owner' | 'staff' | 'customer' | 'system';
  content: string;
}

export async function createReplyUseCase(
  input: CreateReplyInput,
  deps: ReviewUseCaseDeps,
): Promise<Result<ReviewReply, ValidationError | NotFoundError | ConflictError>> {
  const v = createReplySchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid reply input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const review = await deps.reviewRepo.findById(d.tenantId, d.reviewId);
  if (!review) return Err(new NotFoundError('Review not found'));

  // Author 존재 검증
  const userOk = await deps.userVerifier.verify(d.tenantId, d.authorId);
  if (!userOk) return Err(new ValidationError('Author not found', { details: { authorId: d.authorId } }));

  const replyId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();

  const reply: ReviewReply = {
    id: replyId,
    tenantId: d.tenantId,
    reviewId: d.reviewId,
    authorId: d.authorId,
    authorRole: d.authorRole,
    content: d.content,
    status: 'Active',
    helpfulCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await deps.replyRepo.insert(reply);

  // review replyCount increment
  const newReplyCount = review.replyCount + 1;
  await deps.reviewRepo.update(d.tenantId, d.reviewId, { replyCount: newReplyCount, updatedAt: now });

  const envelope: EventEnvelope<{ replyId: string; reviewId: string; authorRole: string }> =
    await emitReviewEvent(deps,
      { aggregateId: d.reviewId, tenantId: d.tenantId, correlationId: d.correlationId },
      'review.reply.created', 'review.reply.created.v1',
      { replyId, reviewId: d.reviewId, authorRole: d.authorRole });
  await deps.eventBus.emit(envelope);

  await recordReviewAudit(deps.auditRepo, {
    organizationId: review.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    reviewId: d.reviewId, replyId,
    eventType: 'review_reply_created',
    metadata: { authorRole: d.authorRole },
  });

  return Ok(reply);
}

// ════════════════════════════════════════════════════════════════════════════
// DELETE REPLY (soft)
// ════════════════════════════════════════════════════════════════════════════

export interface DeleteReplyInput {
  tenantId: string; correlationId: string; actorId: string;
  replyId: string;
}

export async function deleteReplyUseCase(
  input: DeleteReplyInput,
  deps: ReviewUseCaseDeps,
): Promise<Result<{ replyId: string; deleted: boolean }, ValidationError | NotFoundError>> {
  const v = deleteReplySchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid delete reply input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const reply = await deps.replyRepo.findById(d.tenantId, d.replyId);
  if (!reply) return Err(new NotFoundError('Reply not found'));

  const now = deps.clock.now().toISOString();
  await deps.replyRepo.update(d.tenantId, d.replyId, { status: 'Deleted', updatedAt: now });

  // review replyCount decrement
  const review = await deps.reviewRepo.findById(d.tenantId, reply.reviewId);
  if (review) {
    const newCount = Math.max(0, review.replyCount - 1);
    await deps.reviewRepo.update(d.tenantId, reply.reviewId, { replyCount: newCount, updatedAt: now });
  }

  const envelope: EventEnvelope<{ replyId: string; reviewId: string }> =
    await emitReviewEvent(deps,
      { aggregateId: reply.reviewId, tenantId: d.tenantId, correlationId: d.correlationId },
      'review.reply.deleted', 'review.reply.deleted.v1',
      { replyId: d.replyId, reviewId: reply.reviewId });
  await deps.eventBus.emit(envelope);

  await recordReviewAudit(deps.auditRepo, {
    organizationId: review?.organizationId ?? '', tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    reviewId: reply.reviewId, replyId: d.replyId,
    eventType: 'review_reply_deleted',
    metadata: {},
  });

  return Ok({ replyId: d.replyId, deleted: true });
}

// ════════════════════════════════════════════════════════════════════════════
// LIST REPLIES
// ════════════════════════════════════════════════════════════════════════════

export async function listRepliesUseCase(
  tenantId: string,
  reviewId: string,
  deps: ReviewUseCaseDeps,
): Promise<Result<ReviewReply[], ValidationError>> {
  const replies = await deps.replyRepo.findByReview(tenantId, reviewId);
  return Ok(replies.filter((r) => r.status !== 'Deleted'));
}
