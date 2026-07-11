/**
 * Audit Helper (Sprint 2C-2-5)
 * 사장님 확립 — Audit Trail 필수
 */

import type {
  IAuditLogRepository,
  AuditEventType,
  AuditLogRecord,
} from '../infrastructure/InMemoryAuditLogRepository.js';

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
