/**
 * Audit Helper — User Engine
 *
 * 사장님 확립 — Audit Trail 필수. 모든 변경 사항 기록.
 * Identity Engine과 동일 패턴.
 */

import type {
  IAuditLogRepository,
  AuditEventType,
  AuditLogRecord,
} from '../interfaces/index.js';

export interface AuditLogInput {
  userId: string | null;
  tenantId: string;
  eventType: AuditEventType;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(
  repo: IAuditLogRepository,
  input: AuditLogInput,
): Promise<AuditLogRecord> {
  return repo.insert({
    userId: input.userId,
    tenantId: input.tenantId,
    eventType: input.eventType,
    metadata: input.metadata ?? {},
  });
}
