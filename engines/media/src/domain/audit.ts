/**
 * Media Engine — Audit Helper (Catalog Engine 패턴 동일)
 */

import type {
  IMediaAuditRepository,
  MediaAuditEventType,
  MediaAuditRecord,
} from '../interfaces/index.js';

export interface MediaAuditLogInput {
  assetId?: string;
  organizationId: string;
  tenantId: string;
  actorId: string;
  correlationId: string;
  eventType: MediaAuditEventType;
  metadata?: Record<string, unknown>;
}

export async function recordMediaAudit(
  repo: IMediaAuditRepository,
  input: MediaAuditLogInput,
): Promise<MediaAuditRecord> {
  return repo.insert({
    organizationId: input.organizationId,
    tenantId: input.tenantId,
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventType: input.eventType,
    metadata: input.metadata ?? {},
    ...(input.assetId !== undefined ? { assetId: input.assetId } : {}),
  });
}
