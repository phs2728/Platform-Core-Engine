/**
 * Pricing Engine — Audit Helper (Catalog/Organization Engine 패턴 동일)
 *
 * 사장님 확립 — 모든 상태 변경은 Audit 기록.
 */

import type {
  IPricingAuditRepository,
  PricingAuditEventType,
  PricingAuditRecord,
} from '../interfaces/index.js';

export interface PricingAuditLogInput {
  organizationId: string;
  tenantId: string;
  actorId: string;
  correlationId: string;
  eventType: PricingAuditEventType;
  metadata?: Record<string, unknown>;
  planId?: string;
}

export async function recordPricingAudit(
  repo: IPricingAuditRepository,
  input: PricingAuditLogInput,
): Promise<PricingAuditRecord> {
  return repo.insert({
    organizationId: input.organizationId,
    tenantId: input.tenantId,
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventType: input.eventType,
    metadata: input.metadata ?? {},
    ...(input.planId !== undefined ? { planId: input.planId } : {}),
  });
}
