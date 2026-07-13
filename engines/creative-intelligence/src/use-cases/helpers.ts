/** Creative Intelligence RC2 — Shared Helpers */
import type { EventEnvelope } from '@platform/core-sdk';
import type { CreativeUseCaseDeps } from './types.js';

export function envelope(
  deps: CreativeUseCaseDeps, agg: string, tenant: string, corr: string,
  eventType: string, schemaRef: string, payload: unknown,
): EventEnvelope<unknown> {
  return {
    eventId: deps.idGenerator.generate(), aggregateId: agg, occurredAt: deps.clock.now().toISOString(),
    version: '1.0.0', tenantId: tenant, correlationId: corr, causationId: '',
    engine: 'creative-intelligence', eventType, schemaRef, payload,
  };
}

export async function auditLog(
  deps: CreativeUseCaseDeps, orgId: string, tenantId: string, actorId: string, corr: string,
  eventType: string, meta: Record<string, unknown>, entityRef: string,
): Promise<void> {
  const rec: Record<string, unknown> = { organizationId: orgId, tenantId, actorId, correlationId: corr, eventType, metadata: meta, entityRef };
  await deps.auditRepo.insert(rec as Parameters<typeof deps.auditRepo.insert>[0]);
}

const now = (deps: CreativeUseCaseDeps) => deps.clock.now().toISOString();
export { now };

/** Average of numeric scores */
export function average(scores: number[]): number {
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}