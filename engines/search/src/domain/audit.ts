/** Search Engine — Audit Helper */
import type { ISearchAuditRepository, SearchAuditEventType, SearchAuditRecord } from '../interfaces/index.js';

export interface SearchAuditLogInput {
  indexId?: string; documentId?: string;
  tenantId: string; actorId: string; correlationId: string;
  eventType: SearchAuditEventType; metadata?: Record<string, unknown>;
}

export async function recordSearchAudit(repo: ISearchAuditRepository, input: SearchAuditLogInput): Promise<SearchAuditRecord> {
  return repo.insert({
    tenantId: input.tenantId, actorId: input.actorId, correlationId: input.correlationId,
    eventType: input.eventType, metadata: input.metadata ?? {},
    ...(input.indexId !== undefined ? { indexId: input.indexId } : {}),
    ...(input.documentId !== undefined ? { documentId: input.documentId } : {}),
  });
}
