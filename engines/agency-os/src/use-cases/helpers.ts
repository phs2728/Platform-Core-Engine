/** Agency OS — Shared Helpers */
import type { EventEnvelope } from '@platform/core-sdk';
import type { AgencyUseCaseDeps } from './types.js';

export function envelope(
  deps: AgencyUseCaseDeps, agg: string, tenant: string, corr: string,
  eventType: string, schemaRef: string, payload: unknown,
): EventEnvelope<unknown> {
  return {
    eventId: deps.idGenerator.generate(), aggregateId: agg, occurredAt: deps.clock.now().toISOString(),
    version: '1.0.0', tenantId: tenant, correlationId: corr, causationId: '',
    engine: 'agency-os', eventType, schemaRef, payload,
  };
}

export async function auditLog(
  deps: AgencyUseCaseDeps, orgId: string, tenantId: string, actorId: string, corr: string,
  eventType: string, meta: Record<string, unknown>, _entityRef: string,
): Promise<void> {
  await deps.auditRepo.insert({ organizationId: orgId, tenantId, actorId, correlationId: corr, eventType: eventType as never, metadata: meta });
}

const now = (deps: AgencyUseCaseDeps) => deps.clock.now().toISOString();
export { now };