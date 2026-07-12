/**
 * Review Engine — Audit Helper (Catalog Engine 패턴 동일)
 */

import type {
  IReviewAuditRepository,
  ReviewAuditEventType,
  ReviewAuditRecord,
} from '../interfaces/index.js';

export interface ReviewAuditLogInput {
  reviewId?: string;
  replyId?: string;
  reportId?: string;
  organizationId: string;
  tenantId: string;
  actorId: string;
  correlationId: string;
  eventType: ReviewAuditEventType;
  metadata?: Record<string, unknown>;
}

export async function recordReviewAudit(
  repo: IReviewAuditRepository,
  input: ReviewAuditLogInput,
): Promise<ReviewAuditRecord> {
  return repo.insert({
    organizationId: input.organizationId,
    tenantId: input.tenantId,
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventType: input.eventType,
    metadata: input.metadata ?? {},
    ...(input.reviewId !== undefined ? { reviewId: input.reviewId } : {}),
    ...(input.replyId !== undefined ? { replyId: input.replyId } : {}),
    ...(input.reportId !== undefined ? { reportId: input.reportId } : {}),
  });
}
