/**
 * Review Core UseCases (9) — 사장님 확립 Sprint 1
 *
 *   createReview / updateReview / publishReview / archiveReview /
 *   restoreReview / deleteReview / getReview / searchReviews / listReviews
 *
 * 5-Step Use Case Pattern:
 *   1. zod validate
 *   2. Repo lookup + uniqueness + Organization Ownership 검증
 *   3. Business logic (CustomDataPolicy = Use Case 진입 시 1회)
 *   4. Repo write
 *   5. EventEnvelope + Audit + Result<T,E>
 */

import {
  Ok, Err, type Result,
  ValidationError, ConflictError, NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';

import { recordReviewAudit } from '../domain/audit.js';
import {
  createReviewSchema, updateReviewSchema,
  publishReviewSchema, archiveReviewSchema, restoreReviewSchema, deleteReviewSchema,
  getReviewSchema, searchReviewsSchema,
} from '../domain/validation.js';
import { emitReviewEvent } from '../domain/events.js';
import { isReviewMutable } from '../domain/statusTransition.js';
import type { ReviewUseCaseDeps } from './types.js';
import type {
  Review, ReviewSearchCriteria, ReviewSearchResult, ReviewStatus,
  Rating, TransactionReference, ReviewAttachmentRef,
} from '../interfaces/index.js';

// ════════════════════════════════════════════════════════════════════════════
// helper: build reactionCounts default
function emptyReactionCounts(): Record<string, number> {
  return { like: 0, dislike: 0, love: 0, helpful: 0 };
}

// ════════════════════════════════════════════════════════════════════════════
// CREATE
// ════════════════════════════════════════════════════════════════════════════

export interface CreateReviewInput {
  tenantId: string; correlationId: string; actorId: string;
  organizationId: string;
  reviewerId: string;
  targetRef: string;
  targetType: string;
  title: string;
  content: string;
  ratingScore: number;
  language: string;
  initialStatus?: ReviewStatus;
  transactionRefs?: TransactionReference[];
  attachments?: ReviewAttachmentRef[];
  attributes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export async function createReviewUseCase(
  input: CreateReviewInput,
  deps: ReviewUseCaseDeps,
): Promise<Result<{ reviewId: string; createdAt: string }, ValidationError | ConflictError>> {
  const v = createReviewSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid review input', { details: { issues: v.error.errors } }));
  const d = v.data;

  // Organization Ownership 검증
  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found', { details: { organizationId: d.organizationId } }));

  // Reviewer 존재 검증
  const userOk = await deps.userVerifier.verify(d.tenantId, d.reviewerId);
  if (!userOk) return Err(new ValidationError('Reviewer not found', { details: { reviewerId: d.reviewerId } }));

  // Duplicate review 검증
  const allowDup = await deps.policyProvider.isDuplicateReviewAllowed(d.tenantId);
  if (!allowDup) {
    const exists = await deps.reviewRepo.existsByReviewerAndTarget(d.tenantId, d.reviewerId, d.targetRef);
    if (exists) {
      return Err(new ConflictError('Duplicate review — reviewer already reviewed this target', { details: { targetRef: d.targetRef } }));
    }
  }

  // CustomDataPolicy = Use Case 진입 시 1회 (사장님 확립)
  const allowedTypes = await deps.policyProvider.getAllowedReviewTypes(d.tenantId);
  if (!allowedTypes.includes(d.targetType)) {
    return Err(new ValidationError(`targetType "${d.targetType}" not allowed`, { details: { allowed: allowedTypes } }));
  }
  const attrs = d.attributes ?? {};
  const policyResult = await deps.policyProvider.validateAttributes(d.tenantId, d.targetType, attrs);
  if (!policyResult.ok) return Err(new ValidationError('CustomDataPolicy rejected attributes', { details: { reason: String(policyResult.error) } }));

  // Rating validation
  const maxRating = await deps.policyProvider.getMaxRating(d.tenantId);
  if (d.ratingScore > maxRating) {
    return Err(new ValidationError(`ratingScore ${d.ratingScore} exceeds maxRating ${maxRating}`));
  }

  // Transaction reference 검증 → verified
  const rawRefs = d.transactionRefs ?? [];
  const verifiedRefs: TransactionReference[] = [];
  let isVerified = false;
  for (const ref of rawRefs) {
    const refOk = await deps.transactionVerifier.verify(d.tenantId, ref.refType, ref.refId);
    const vRef: TransactionReference = { refType: ref.refType, refId: ref.refId, verified: refOk };
    verifiedRefs.push(vRef);
    if (refOk) isVerified = true;
  }

  // Attachment media 검증
  const rawAttachments = d.attachments ?? [];
  for (const att of rawAttachments) {
    const mediaOk = await deps.mediaVerifier.verify(d.tenantId, att.mediaId);
    if (!mediaOk) {
      return Err(new ValidationError(`Media not found: ${att.mediaId}`, { details: { mediaId: att.mediaId } }));
    }
  }

  const reviewId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const initialStatus: ReviewStatus = d.initialStatus ?? 'Pending';

  const rating: Rating = {
    score: d.ratingScore,
    maxScore: maxRating,
    weight: isVerified ? 2 : 1,
  };

  const review: Review = {
    id: reviewId,
    tenantId: d.tenantId,
    organizationId: d.organizationId,
    reviewerId: d.reviewerId,
    targetRef: d.targetRef,
    targetType: d.targetType,
    title: d.title,
    content: d.content,
    status: initialStatus,
    rating,
    verified: isVerified,
    transactionRefs: verifiedRefs,
    attachments: rawAttachments,
    attributes: policyResult.value,
    metadata: d.metadata ?? {},
    tags: d.tags ?? [],
    helpfulCount: 0,
    reactionCounts: emptyReactionCounts() as Record<string, number>,
    replyCount: 0,
    moderationAction: null,
    moderatedBy: null,
    moderatedAt: null,
    moderationNote: null,
    language: d.language,
    createdBy: d.actorId,
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    archivedAt: null,
    deletedAt: null,
  };

  await deps.reviewRepo.insert(review);

  const envelope: EventEnvelope<{ reviewId: string; targetType: string; status: ReviewStatus; verified: boolean }> =
    await emitReviewEvent(deps,
      { aggregateId: reviewId, tenantId: d.tenantId, correlationId: d.correlationId },
      'review.created', 'review.created.v1',
      { reviewId, targetType: d.targetType, status: initialStatus, verified: isVerified });
  await deps.eventBus.emit(envelope);

  await recordReviewAudit(deps.auditRepo, {
    organizationId: d.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    reviewId, eventType: 'review_created',
    metadata: { targetType: d.targetType, status: initialStatus, verified: isVerified, rating: d.ratingScore },
  });

  return Ok({ reviewId, createdAt: now });
}

// ════════════════════════════════════════════════════════════════════════════
// UPDATE
// ════════════════════════════════════════════════════════════════════════════

export interface UpdateReviewInput {
  tenantId: string; correlationId: string; actorId: string; reviewId: string;
  title?: string; content?: string;
  attributes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export async function updateReviewUseCase(
  input: UpdateReviewInput,
  deps: ReviewUseCaseDeps,
): Promise<Result<Review, ValidationError | NotFoundError | ConflictError>> {
  const v = updateReviewSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid update input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.reviewRepo.findById(d.tenantId, d.reviewId);
  if (!existing) return Err(new NotFoundError('Review not found'));
  if (!isReviewMutable(existing.status)) {
    return Err(new ConflictError(`Cannot update — status "${existing.status}"`));
  }

  // CustomDataPolicy (attributes 변경 시 1회)
  let validatedAttrs = existing.attributes;
  if (d.attributes !== undefined) {
    const pr = await deps.policyProvider.validateAttributes(d.tenantId, existing.targetType, d.attributes);
    if (!pr.ok) return Err(new ValidationError('CustomDataPolicy rejected attributes'));
    validatedAttrs = pr.value;
  }

  const now = deps.clock.now().toISOString();
  const updated: Review = { ...existing, updatedAt: now };
  if (d.title !== undefined) updated.title = d.title;
  if (d.content !== undefined) updated.content = d.content;
  updated.attributes = validatedAttrs;
  if (d.metadata !== undefined) updated.metadata = d.metadata;
  if (d.tags !== undefined) updated.tags = d.tags;

  await deps.reviewRepo.update(d.tenantId, d.reviewId, {
    ...(d.title !== undefined ? { title: d.title } : {}),
    ...(d.content !== undefined ? { content: d.content } : {}),
    attributes: validatedAttrs,
    ...(d.metadata !== undefined ? { metadata: d.metadata } : {}),
    ...(d.tags !== undefined ? { tags: d.tags } : {}),
    updatedAt: now,
  });

  const envelope: EventEnvelope<{ reviewId: string }> =
    await emitReviewEvent(deps,
      { aggregateId: d.reviewId, tenantId: d.tenantId, correlationId: d.correlationId },
      'review.updated', 'review.updated.v1',
      { reviewId: d.reviewId });
  await deps.eventBus.emit(envelope);

  await recordReviewAudit(deps.auditRepo, {
    organizationId: existing.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    reviewId: d.reviewId, eventType: 'review_updated',
    metadata: {},
  });

  return Ok(updated);
}

// ════════════════════════════════════════════════════════════════════════════
// PUBLISH
// ════════════════════════════════════════════════════════════════════════════

export interface PublishReviewInput {
  tenantId: string; correlationId: string; actorId: string; reviewId: string;
}

export async function publishReviewUseCase(
  input: PublishReviewInput,
  deps: ReviewUseCaseDeps,
): Promise<Result<Review, ValidationError | NotFoundError | ConflictError>> {
  const v = publishReviewSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid publish input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.reviewRepo.findById(d.tenantId, d.reviewId);
  if (!existing) return Err(new NotFoundError('Review not found'));

  // Auto-moderation hook
  const autoMod = await deps.policyProvider.isAutoModerationEnabled(d.tenantId);
  if (autoMod) {
    const modResult = await deps.moderationHook.moderate(d.tenantId, d.reviewId, existing.content);
    if (modResult.ok) {
      if (modResult.value.action === 'reject') {
        await deps.reviewRepo.update(d.tenantId, d.reviewId, { status: 'Rejected', moderationAction: 'reject', moderatedBy: d.actorId });
        return Err(new ConflictError(`Review rejected by moderation: ${modResult.value.reason}`));
      }
      if (modResult.value.action === 'flag') {
        await deps.reviewRepo.update(d.tenantId, d.reviewId, { status: 'Pending', moderationAction: 'approve', moderatedBy: d.actorId });
        const flagEnvelope = await emitReviewEvent(deps,
          { aggregateId: d.reviewId, tenantId: d.tenantId, correlationId: d.correlationId },
          'review.moderated', 'review.moderated.v1',
          { reviewId: d.reviewId, action: 'flag', reason: modResult.value.reason });
        await deps.eventBus.emit(flagEnvelope);
        return Err(new ConflictError(`Review flagged: ${modResult.value.reason}`));
      }
    }
  }

  const now = deps.clock.now().toISOString();
  await deps.reviewRepo.update(d.tenantId, d.reviewId, {
    status: 'Published', publishedAt: now, updatedAt: now,
  });

  const updated: Review = { ...existing, status: 'Published', publishedAt: now, updatedAt: now };

  const envelope: EventEnvelope<{ reviewId: string; rating: number; verified: boolean }> =
    await emitReviewEvent(deps,
      { aggregateId: d.reviewId, tenantId: d.tenantId, correlationId: d.correlationId },
      'review.published', 'review.published.v1',
      { reviewId: d.reviewId, rating: existing.rating.score, verified: existing.verified });
  await deps.eventBus.emit(envelope);

  await recordReviewAudit(deps.auditRepo, {
    organizationId: existing.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    reviewId: d.reviewId, eventType: 'review_published',
    metadata: { rating: existing.rating.score, verified: existing.verified },
  });

  return Ok(updated);
}

// ════════════════════════════════════════════════════════════════════════════
// ARCHIVE
// ════════════════════════════════════════════════════════════════════════════

export interface ArchiveReviewInput {
  tenantId: string; correlationId: string; actorId: string; reviewId: string;
  reason?: string;
}

export async function archiveReviewUseCase(
  input: ArchiveReviewInput,
  deps: ReviewUseCaseDeps,
): Promise<Result<Review, ValidationError | NotFoundError | ConflictError>> {
  const v = archiveReviewSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid archive input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.reviewRepo.findById(d.tenantId, d.reviewId);
  if (!existing) return Err(new NotFoundError('Review not found'));
  if (existing.status === 'Archived') return Err(new ConflictError('Already archived'));
  if (existing.status === 'Deleted') return Err(new ConflictError('Cannot archive deleted'));

  const now = deps.clock.now().toISOString();
  await deps.reviewRepo.update(d.tenantId, d.reviewId, { status: 'Archived', archivedAt: now, updatedAt: now });
  const updated: Review = { ...existing, status: 'Archived', archivedAt: now, updatedAt: now };

  const envelope: EventEnvelope<{ reviewId: string }> =
    await emitReviewEvent(deps,
      { aggregateId: d.reviewId, tenantId: d.tenantId, correlationId: d.correlationId },
      'review.archived', 'review.archived.v1',
      { reviewId: d.reviewId });
  await deps.eventBus.emit(envelope);

  await recordReviewAudit(deps.auditRepo, {
    organizationId: existing.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    reviewId: d.reviewId, eventType: 'review_archived',
    metadata: { previousStatus: existing.status },
  });

  return Ok(updated);
}

// ════════════════════════════════════════════════════════════════════════════
// RESTORE
// ════════════════════════════════════════════════════════════════════════════

export interface RestoreReviewInput {
  tenantId: string; correlationId: string; actorId: string; reviewId: string;
}

export async function restoreReviewUseCase(
  input: RestoreReviewInput,
  deps: ReviewUseCaseDeps,
): Promise<Result<Review, ValidationError | NotFoundError | ConflictError>> {
  const v = restoreReviewSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid restore input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.reviewRepo.findById(d.tenantId, d.reviewId);
  if (!existing) return Err(new NotFoundError('Review not found'));
  if (existing.status !== 'Archived') return Err(new ConflictError(`Cannot restore from "${existing.status}"`));

  const now = deps.clock.now().toISOString();
  await deps.reviewRepo.update(d.tenantId, d.reviewId, { status: 'Published', archivedAt: null, updatedAt: now });
  const updated: Review = { ...existing, status: 'Published', archivedAt: null, updatedAt: now };

  const envelope: EventEnvelope<{ reviewId: string }> =
    await emitReviewEvent(deps,
      { aggregateId: d.reviewId, tenantId: d.tenantId, correlationId: d.correlationId },
      'review.restored', 'review.restored.v1',
      { reviewId: d.reviewId });
  await deps.eventBus.emit(envelope);

  await recordReviewAudit(deps.auditRepo, {
    organizationId: existing.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    reviewId: d.reviewId, eventType: 'review_restored',
    metadata: {},
  });

  return Ok(updated);
}

// ════════════════════════════════════════════════════════════════════════════
// DELETE (soft)
// ════════════════════════════════════════════════════════════════════════════

export interface DeleteReviewInput {
  tenantId: string; correlationId: string; actorId: string; reviewId: string;
}

export async function deleteReviewUseCase(
  input: DeleteReviewInput,
  deps: ReviewUseCaseDeps,
): Promise<Result<{ reviewId: string; deletedAt: string }, ValidationError | NotFoundError | ConflictError>> {
  const v = deleteReviewSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid delete input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.reviewRepo.findById(d.tenantId, d.reviewId);
  if (!existing) return Err(new NotFoundError('Review not found'));
  if (existing.status === 'Deleted') return Err(new ConflictError('Already deleted'));

  const now = deps.clock.now().toISOString();
  await deps.reviewRepo.update(d.tenantId, d.reviewId, { status: 'Deleted', deletedAt: now, updatedAt: now });

  const envelope: EventEnvelope<{ reviewId: string }> =
    await emitReviewEvent(deps,
      { aggregateId: d.reviewId, tenantId: d.tenantId, correlationId: d.correlationId },
      'review.deleted', 'review.deleted.v1',
      { reviewId: d.reviewId });
  await deps.eventBus.emit(envelope);

  await recordReviewAudit(deps.auditRepo, {
    organizationId: existing.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    reviewId: d.reviewId, eventType: 'review_deleted',
    metadata: { previousStatus: existing.status },
  });

  return Ok({ reviewId: d.reviewId, deletedAt: now });
}

// ════════════════════════════════════════════════════════════════════════════
// GET / SEARCH / LIST
// ════════════════════════════════════════════════════════════════════════════

export interface GetReviewInput { tenantId: string; reviewId: string; }

export async function getReviewUseCase(
  input: GetReviewInput,
  deps: ReviewUseCaseDeps,
): Promise<Result<Review | null, ValidationError>> {
  const v = getReviewSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid get input', { details: { issues: v.error.errors } }));
  const d = v.data;
  return Ok(await deps.reviewRepo.findById(d.tenantId, d.reviewId));
}

export async function searchReviewsUseCase(
  input: ReviewSearchCriteria,
  deps: ReviewUseCaseDeps,
): Promise<Result<ReviewSearchResult, ValidationError>> {
  const v = searchReviewsSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid search input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const criteria: ReviewSearchCriteria = {
    tenantId: d.tenantId,
    ...(d.organizationId !== undefined ? { organizationId: d.organizationId } : {}),
    ...(d.targetRef !== undefined ? { targetRef: d.targetRef } : {}),
    ...(d.targetType !== undefined ? { targetType: d.targetType } : {}),
    ...(d.reviewerId !== undefined ? { reviewerId: d.reviewerId } : {}),
    ...(d.status !== undefined ? { status: d.status } : {}),
    ...(d.verified !== undefined ? { verified: d.verified } : {}),
    ...(d.minRating !== undefined ? { minRating: d.minRating } : {}),
    ...(d.maxRating !== undefined ? { maxRating: d.maxRating } : {}),
    ...(d.query !== undefined ? { query: d.query } : {}),
    ...(d.tags !== undefined ? { tags: d.tags } : {}),
    ...(d.language !== undefined ? { language: d.language } : {}),
    ...(d.limit !== undefined ? { limit: d.limit } : {}),
    ...(d.offset !== undefined ? { offset: d.offset } : {}),
    ...(d.sortBy !== undefined ? { sortBy: d.sortBy } : {}),
    ...(d.sortOrder !== undefined ? { sortOrder: d.sortOrder } : {}),
  };
  return Ok(await deps.reviewRepo.search(criteria));
}

export interface ListReviewsInput {
  tenantId: string; organizationId: string;
  limit?: number; offset?: number;
}

export async function listReviewsUseCase(
  input: ListReviewsInput,
  deps: ReviewUseCaseDeps,
): Promise<Result<ReviewSearchResult, ValidationError>> {
  return Ok(await deps.reviewRepo.search({
    tenantId: input.tenantId,
    organizationId: input.organizationId,
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
    ...(input.offset !== undefined ? { offset: input.offset } : {}),
  }));
}
