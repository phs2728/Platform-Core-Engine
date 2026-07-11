/**
 * Audit Helper (Epic 7 Foundation)
 * 사장님 확립 — Audit Trail 필수. 모든 Epic에서 사용.
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
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export async function recordAudit(
  repo: IAuditLogRepository,
  input: AuditLogInput,
): Promise<AuditLogRecord> {
  return repo.insert({
    accountId: input.accountId,
    tenantId: input.tenantId,
    eventType: input.eventType,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    metadata: input.metadata ?? {},
  });
}
