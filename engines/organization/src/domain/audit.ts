/**
 * Audit Helper — Organization Engine
 *
 * 사장님 확립 — Audit Trail 필수. 모든 변경 사항 기록.
 * User/Identity Engine과 동일 패턴.
 */

import type {
  IOrganizationAuditRepository,
  OrganizationAuditEventType,
  OrganizationAuditRecord,
} from '../interfaces/index.js';

export interface OrganizationAuditLogInput {
  organizationId: string;
  tenantId: string;
  actorId: string;
  correlationId: string;
  eventType: OrganizationAuditEventType;
  metadata?: Record<string, unknown>;
}

export async function recordOrganizationAudit(
  repo: IOrganizationAuditRepository,
  input: OrganizationAuditLogInput,
): Promise<OrganizationAuditRecord> {
  return repo.insert({
    organizationId: input.organizationId,
    tenantId: input.tenantId,
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventType: input.eventType,
    metadata: input.metadata ?? {},
  });
}
