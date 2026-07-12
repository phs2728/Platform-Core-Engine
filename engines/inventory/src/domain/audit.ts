/**
 * Inventory Engine — Audit Helper (Catalog Engine 패턴 동일)
 */

import type {
  IInventoryAuditRepository,
  InventoryAuditEventType,
  InventoryAuditRecord,
} from '../interfaces/index.js';

export interface InventoryAuditLogInput {
  inventoryId?: string;
  organizationId: string;
  tenantId: string;
  actorId: string;
  correlationId: string;
  eventType: InventoryAuditEventType;
  metadata?: Record<string, unknown>;
}

export async function recordInventoryAudit(
  repo: IInventoryAuditRepository,
  input: InventoryAuditLogInput,
): Promise<InventoryAuditRecord> {
  return repo.insert({
    organizationId: input.organizationId,
    tenantId: input.tenantId,
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventType: input.eventType,
    metadata: input.metadata ?? {},
    ...(input.inventoryId !== undefined ? { inventoryId: input.inventoryId } : {}),
  });
}
