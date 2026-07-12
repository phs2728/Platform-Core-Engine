/**
 * Billing Engine — Audit Helper (Catalog/Pricing Engine 패턴 동일)
 *
 * 사장님 확립: 모든 상태 변경은 Audit 기록.
 */

import type {
  IBillingAuditRepository,
  BillingAuditEventType,
  BillingAuditRecord,
} from '../interfaces/index.js';

export interface BillingAuditLogInput {
  invoiceId?: string;
  organizationId: string;
  tenantId: string;
  actorId: string;
  correlationId: string;
  eventType: BillingAuditEventType;
  metadata?: Record<string, unknown>;
}

export async function recordBillingAudit(
  repo: IBillingAuditRepository,
  input: BillingAuditLogInput,
): Promise<BillingAuditRecord> {
  return repo.insert({
    organizationId: input.organizationId,
    tenantId: input.tenantId,
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventType: input.eventType,
    metadata: input.metadata ?? {},
    ...(input.invoiceId !== undefined ? { invoiceId: input.invoiceId } : {}),
  });
}
