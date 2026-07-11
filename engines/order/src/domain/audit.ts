/**
 * Order Engine — Audit Helper (Catalog/Media Engine 패턴 동일)
 *
 * 사장님 확립: 모든 상태 변경은 Audit 기록.
 */

import type {
  IOrderAuditRepository,
  OrderAuditEventType,
  OrderAuditRecord,
} from '../interfaces/index.js';

export interface OrderAuditLogInput {
  orderId?: string;
  organizationId: string;
  tenantId: string;
  actorId: string;
  correlationId: string;
  eventType: OrderAuditEventType;
  metadata?: Record<string, unknown>;
}

export async function recordOrderAudit(
  repo: IOrderAuditRepository,
  input: OrderAuditLogInput,
): Promise<OrderAuditRecord> {
  return repo.insert({
    organizationId: input.organizationId,
    tenantId: input.tenantId,
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventType: input.eventType,
    metadata: input.metadata ?? {},
    ...(input.orderId !== undefined ? { orderId: input.orderId } : {}),
  });
}
