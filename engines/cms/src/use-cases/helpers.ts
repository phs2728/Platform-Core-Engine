/** CMS Engine — Shared Helpers */
import type { EventEnvelope } from '@platform/core-sdk';
import type { CMSUseCaseDeps } from './types.js';

export function envelope(
  deps: CMSUseCaseDeps, agg: string, tenant: string, corr: string,
  eventType: string, schemaRef: string, payload: unknown,
): EventEnvelope<unknown> {
  return {
    eventId: deps.idGenerator.generate(), aggregateId: agg, occurredAt: deps.clock.now().toISOString(),
    version: '1.0.0', tenantId: tenant, correlationId: corr, causationId: '',
    engine: 'cms', eventType, schemaRef, payload,
  };
}

export async function auditLog(
  deps: CMSUseCaseDeps, orgId: string, tenantId: string, actorId: string, corr: string,
  eventType: string, meta: Record<string, unknown>, entityType: 'content' | 'page' | 'section' | 'slot' | 'locale' | 'snapshot', entityId?: string,
): Promise<void> {
  const rec: Record<string, unknown> = { organizationId: orgId, tenantId, actorId, correlationId: corr, eventType, metadata: meta, entityType };
  if (entityId !== undefined) rec.entityId = entityId;
  await deps.auditRepo.insert(rec as Parameters<typeof deps.auditRepo.insert>[0]);
}

/** Deterministic hash: same input → same hash. Used for content/layout snapshots. */
export function deterministicHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return `h${h.toString(16)}`;
}