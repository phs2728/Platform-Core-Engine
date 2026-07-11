/**
 * Audit Helper — Address Engine
 */

import type {
  IAuditLogRepository,
  AuditEventType,
  AuditLogRecord,
} from '../interfaces/index.js';

export interface AuditLogInput {
  addressId: string | null;
  tenantId: string;
  eventType: AuditEventType;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(
  repo: IAuditLogRepository,
  input: AuditLogInput,
): Promise<AuditLogRecord> {
  return repo.insert({
    addressId: input.addressId,
    tenantId: input.tenantId,
    eventType: input.eventType,
    metadata: input.metadata ?? {},
  });
}
