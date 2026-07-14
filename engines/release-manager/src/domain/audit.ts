/** Release Manager — Audit Helper */
import type { IReleaseAuditRepository, ReleaseAuditEventType, ReleaseAuditRecord } from '../interfaces/index.js';

export interface ReleaseAuditLogInput {
  releaseId?: string; tagId?: string;
  tenantId: string; actorId: string; correlationId: string;
  eventType: ReleaseAuditEventType; metadata?: Record<string, unknown>;
}

export async function recordReleaseAudit(repo: IReleaseAuditRepository, input: ReleaseAuditLogInput): Promise<ReleaseAuditRecord> {
  return repo.insert({
    tenantId: input.tenantId, actorId: input.actorId, correlationId: input.correlationId,
    eventType: input.eventType, metadata: input.metadata ?? {},
    ...(input.releaseId !== undefined ? { releaseId: input.releaseId } : {}),
    ...(input.tagId !== undefined ? { tagId: input.tagId } : {}),
  });
}
