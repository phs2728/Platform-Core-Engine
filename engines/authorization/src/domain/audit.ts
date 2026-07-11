/**
 * Audit Helper — Authorization Engine
 * Identity Engine과 동일 패턴.
 */

import type {
  IAuditLogRepository,
  AuditEventType,
  AuditLogRecord,
} from '../interfaces/index.js';

export interface AuditLogInput {
  accountId: string | null;
  tenantId: string;
  eventType: AuditEventType;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(
  repo: IAuditLogRepository,
  input: AuditLogInput,
): Promise<AuditLogRecord> {
  return repo.insert({
    accountId: input.accountId,
    tenantId: input.tenantId,
    eventType: input.eventType,
    metadata: input.metadata ?? {},
  });
}
