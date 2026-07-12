/** Theme Engine — Shared Helpers */
import type { EventEnvelope } from '@platform/core-sdk';
import type { ThemeUseCaseDeps } from './types.js';

export function envelope(
  deps: ThemeUseCaseDeps, agg: string, tenant: string, corr: string,
  eventType: string, schemaRef: string, payload: unknown,
): EventEnvelope<unknown> {
  return {
    eventId: deps.idGenerator.generate(), aggregateId: agg, occurredAt: deps.clock.now().toISOString(),
    version: '1.0.0', tenantId: tenant, correlationId: corr, causationId: '',
    engine: 'theme', eventType, schemaRef, payload,
  };
}

export async function auditLog(
  deps: ThemeUseCaseDeps, orgId: string, tenantId: string, actorId: string, corr: string,
  eventType: string, meta: Record<string, unknown>, themeId?: string,
): Promise<void> {
  const rec: Record<string, unknown> = { organizationId: orgId, tenantId, actorId, correlationId: corr, eventType, metadata: meta };
  if (themeId !== undefined) rec.themeId = themeId;
  await deps.auditRepo.insert(rec as Parameters<typeof deps.auditRepo.insert>[0]);
}
