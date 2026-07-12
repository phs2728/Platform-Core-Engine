/**
 * Moderation + Report UseCases (4+2) —
 *   approveReview / rejectReview / hideReview / restoreReview(moderation) /
 *   reportReview / resolveReport
 *
 * 사장님 확립: Moderation = Auto/Manual/AI Hook/Admin
 */

import {
  Ok, Err, type Result,
  ValidationError, NotFoundError, ConflictError,
  type EventEnvelope,
} from '@platform/core-sdk';

import { recordReviewAudit } from '../domain/audit.js';
import { reportReviewSchema, resolveReportSchema, moderateReviewSchema } from '../domain/validation.js';
import { emitReviewEvent } from '../domain/events.js';
import type { ReviewUseCaseDeps } from './types.js';
import type { Review, ReviewReport, ReviewStatus, ModerationAction } from '../interfaces/index.js';

// ════════════════════════════════════════════════════════════════════════════
// MODERATE (generic — covers approve/reject/hide/restore)
// ════════════════════════════════════════════════════════════════════════════

export interface ModerateReviewInput {
  tenantId: string; correlationId: string; actorId: string;
  reviewId: string;
  action: ModerationAction;
  note?: string;
}

export async function moderateReviewUseCase(
  input: ModerateReviewInput,
  deps: ReviewUseCaseDeps,
): Promise<Result<Review, ValidationError | NotFoundError | ConflictError>> {
  const v = moderateReviewSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid moderation input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.reviewRepo.findById(d.tenantId, d.reviewId);
  if (!existing) return Err(new NotFoundError('Review not found'));

  const now = deps.clock.now().toISOString();
  let newStatus: ReviewStatus;
  let moderationAction: ModerationAction;
  let eventType: string;
  let auditType: 'review_moderated' | 'review_hidden';

  switch (d.action) {
    case 'approve':
      newStatus = 'Published';
      moderationAction = 'approve';
      eventType = 'review.moderated';
      auditType = 'review_moderated';
      break;
    case 'reject':
      newStatus = 'Rejected';
      moderationAction = 'reject';
      eventType = 'review.moderated';
      auditType = 'review_moderated';
      break;
    case 'hide':
      newStatus = 'Hidden';
      moderationAction = 'hide';
      eventType = 'review.hidden';
      auditType = 'review_hidden';
      break;
    case 'restore':
      newStatus = 'Published';
      moderationAction = 'restore';
      eventType = 'review.moderated';
      auditType = 'review_moderated';
      break;
  }

  const publishedAt = (newStatus === 'Published' && existing.publishedAt === null) ? now : existing.publishedAt;

  await deps.reviewRepo.update(d.tenantId, d.reviewId, {
    status: newStatus,
    moderationAction,
    moderatedBy: d.actorId,
    moderatedAt: now,
    ...(d.note !== undefined ? { moderationNote: d.note } : {}),
    publishedAt,
    updatedAt: now,
  });

  const updated: Review = {
    ...existing,
    status: newStatus,
    moderationAction,
    moderatedBy: d.actorId,
    moderatedAt: now,
    ...(d.note !== undefined ? { moderationNote: d.note } : {}),
    publishedAt,
    updatedAt: now,
  };

  const envelope: EventEnvelope<{ reviewId: string; action: ModerationAction; status: ReviewStatus }> =
    await emitReviewEvent(deps,
      { aggregateId: d.reviewId, tenantId: d.tenantId, correlationId: d.correlationId },
      eventType, `${eventType}.v1`,
      { reviewId: d.reviewId, action: moderationAction, status: newStatus });
  await deps.eventBus.emit(envelope);

  await recordReviewAudit(deps.auditRepo, {
    organizationId: existing.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    reviewId: d.reviewId, eventType: auditType,
    metadata: { action: moderationAction, previousStatus: existing.status, newStatus },
  });

  return Ok(updated);
}

// Convenience wrappers
export interface ApproveReviewInput { tenantId: string; correlationId: string; actorId: string; reviewId: string; note?: string; }
export async function approveReviewUseCase(input: ApproveReviewInput, deps: ReviewUseCaseDeps) {
  return moderateReviewUseCase({ ...input, action: 'approve' as ModerationAction }, deps);
}

export interface RejectReviewInput { tenantId: string; correlationId: string; actorId: string; reviewId: string; note?: string; }
export async function rejectReviewUseCase(input: RejectReviewInput, deps: ReviewUseCaseDeps) {
  return moderateReviewUseCase({ ...input, action: 'reject' as ModerationAction }, deps);
}

export interface HideReviewInput { tenantId: string; correlationId: string; actorId: string; reviewId: string; note?: string; }
export async function hideReviewUseCase(input: HideReviewInput, deps: ReviewUseCaseDeps) {
  return moderateReviewUseCase({ ...input, action: 'hide' as ModerationAction }, deps);
}

// ════════════════════════════════════════════════════════════════════════════
// REPORT REVIEW
// ════════════════════════════════════════════════════════════════════════════

export interface ReportReviewInput {
  tenantId: string; correlationId: string; actorId: string;
  reviewId: string;
  reporterId: string;
  reason: 'spam' | 'abuse' | 'inappropriate' | 'misinformation' | 'fraud' | 'other';
  description: string;
}

export async function reportReviewUseCase(
  input: ReportReviewInput,
  deps: ReviewUseCaseDeps,
): Promise<Result<ReviewReport, ValidationError | NotFoundError>> {
  const v = reportReviewSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid report input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const review = await deps.reviewRepo.findById(d.tenantId, d.reviewId);
  if (!review) return Err(new NotFoundError('Review not found'));

  const reporterOk = await deps.userVerifier.verify(d.tenantId, d.reporterId);
  if (!reporterOk) return Err(new ValidationError('Reporter not found', { details: { reporterId: d.reporterId } }));

  const reportId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();

  const report: ReviewReport = {
    id: reportId,
    tenantId: d.tenantId,
    reviewId: d.reviewId,
    reporterId: d.reporterId,
    reason: d.reason,
    description: d.description,
    status: 'Open',
    resolvedBy: null,
    resolution: null,
    resolvedAt: null,
    createdAt: now,
  };

  await deps.reportRepo.insert(report);

  // review status → Reported (if currently Published)
  if (review.status === 'Published') {
    await deps.reviewRepo.update(d.tenantId, d.reviewId, { status: 'Reported', updatedAt: now });
  }

  const envelope: EventEnvelope<{ reviewId: string; reportId: string; reason: string }> =
    await emitReviewEvent(deps,
      { aggregateId: d.reviewId, tenantId: d.tenantId, correlationId: d.correlationId },
      'review.reported', 'review.reported.v1',
      { reviewId: d.reviewId, reportId, reason: d.reason });
  await deps.eventBus.emit(envelope);

  await recordReviewAudit(deps.auditRepo, {
    organizationId: review.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    reviewId: d.reviewId, reportId,
    eventType: 'review_reported',
    metadata: { reason: d.reason },
  });

  return Ok(report);
}

// ════════════════════════════════════════════════════════════════════════════
// RESOLVE REPORT
// ════════════════════════════════════════════════════════════════════════════

export interface ResolveReportInput {
  tenantId: string; correlationId: string; actorId: string;
  reportId: string;
  resolution: 'published' | 'hidden' | 'rejected' | 'dismissed';
  note?: string;
}

export async function resolveReportUseCase(
  input: ResolveReportInput,
  deps: ReviewUseCaseDeps,
): Promise<Result<ReviewReport, ValidationError | NotFoundError>> {
  const v = resolveReportSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid resolve input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const report = await deps.reportRepo.findById(d.tenantId, d.reportId);
  if (!report) return Err(new NotFoundError('Report not found'));

  const review = await deps.reviewRepo.findById(d.tenantId, report.reviewId);
  if (!review) return Err(new NotFoundError('Review not found'));

  const now = deps.clock.now().toISOString();
  const reportStatus = d.resolution === 'dismissed' ? 'Dismissed' : 'Resolved';

  await deps.reportRepo.update(d.tenantId, d.reportId, {
    status: reportStatus,
    resolvedBy: d.actorId,
    resolution: d.resolution,
    resolvedAt: now,
  });

  // review status update based on resolution
  let newReviewStatus: ReviewStatus | null = null;
  if (d.resolution === 'published') newReviewStatus = 'Published';
  else if (d.resolution === 'hidden') newReviewStatus = 'Hidden';
  else if (d.resolution === 'rejected') newReviewStatus = 'Rejected';

  if (newReviewStatus !== null) {
    await deps.reviewRepo.update(d.tenantId, report.reviewId, { status: newReviewStatus, updatedAt: now });
  }

  const updatedReport: ReviewReport = {
    ...report,
    status: reportStatus,
    resolvedBy: d.actorId,
    resolution: d.resolution,
    resolvedAt: now,
  };

  const envelope: EventEnvelope<{ reportId: string; reviewId: string; resolution: string }> =
    await emitReviewEvent(deps,
      { aggregateId: report.reviewId, tenantId: d.tenantId, correlationId: d.correlationId },
      'review.report.resolved', 'review.report.resolved.v1',
      { reportId: d.reportId, reviewId: report.reviewId, resolution: d.resolution });
  await deps.eventBus.emit(envelope);

  await recordReviewAudit(deps.auditRepo, {
    organizationId: review.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    reviewId: report.reviewId, reportId: d.reportId,
    eventType: 'review_report_resolved',
    metadata: { resolution: d.resolution },
  });

  return Ok(updatedReport);
}
