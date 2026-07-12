/**
 * Query Engine — Audit Helper
 */
import type { IQueryAuditRepository, QueryAuditEventType, QueryAuditRecord } from '../interfaces/index.js';

export interface QueryAuditLogInput {
  projectionId?: string;
  dashboardId?: string;
  summaryId?: string;
  tenantId: string;
  actorId: string;
  correlationId: string;
  eventType: QueryAuditEventType;
  metadata?: Record<string, unknown>;
}

export async function recordQueryAudit(
  repo: IQueryAuditRepository,
  input: QueryAuditLogInput,
): Promise<QueryAuditRecord> {
  return repo.insert({
    tenantId: input.tenantId,
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventType: input.eventType,
    metadata: input.metadata ?? {},
    ...(input.projectionId !== undefined ? { projectionId: input.projectionId } : {}),
    ...(input.dashboardId !== undefined ? { dashboardId: input.dashboardId } : {}),
    ...(input.summaryId !== undefined ? { summaryId: input.summaryId } : {}),
  });
}
