/**
 * Catalog Engine — Audit Helper (Organization Engine 패턴 동일)
 */

import type {
  ICatalogAuditRepository,
  CatalogAuditEventType,
  CatalogAuditRecord,
} from '../interfaces/index.js';

export interface CatalogAuditLogInput {
  catalogId?: string;
  categoryId?: string;
  variantId?: string;
  bundleId?: string;
  organizationId: string;
  tenantId: string;
  actorId: string;
  correlationId: string;
  eventType: CatalogAuditEventType;
  metadata?: Record<string, unknown>;
}

export async function recordCatalogAudit(
  repo: ICatalogAuditRepository,
  input: CatalogAuditLogInput,
): Promise<CatalogAuditRecord> {
  return repo.insert({
    organizationId: input.organizationId,
    tenantId: input.tenantId,
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventType: input.eventType,
    metadata: input.metadata ?? {},
    ...(input.catalogId !== undefined ? { catalogId: input.catalogId } : {}),
    ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    ...(input.variantId !== undefined ? { variantId: input.variantId } : {}),
    ...(input.bundleId !== undefined ? { bundleId: input.bundleId } : {}),
  });
}
