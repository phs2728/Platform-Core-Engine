/** Component Engine — Shared Helpers */
import type { EventEnvelope } from '@platform/core-sdk';
import type { ComponentUseCaseDeps } from './types.js';

export function envelope(
  deps: ComponentUseCaseDeps, agg: string, tenant: string, corr: string,
  eventType: string, schemaRef: string, payload: unknown,
): EventEnvelope<unknown> {
  return {
    eventId: deps.idGenerator.generate(), aggregateId: agg, occurredAt: deps.clock.now().toISOString(),
    version: '1.0.0', tenantId: tenant, correlationId: corr, causationId: '',
    engine: 'component', eventType, schemaRef, payload,
  };
}

export async function auditLog(
  deps: ComponentUseCaseDeps, orgId: string, tenantId: string, actorId: string, corr: string,
  eventType: string, meta: Record<string, unknown>, componentId?: string,
): Promise<void> {
  const rec: Record<string, unknown> = { organizationId: orgId, tenantId, actorId, correlationId: corr, eventType, metadata: meta };
  if (componentId !== undefined) rec.componentId = componentId;
  await deps.auditRepo.insert(rec as Parameters<typeof deps.auditRepo.insert>[0]);
}

/** Quality threshold — all components must score 90+ to pass */
export const QUALITY_THRESHOLD = 90;

/** Calculate overall score from 9 dimensions */
export function calculateOverall(scores: {
  professional: number; premium: number; accessibility: number; performance: number;
  trust: number; conversion: number; emotion: number; consistency: number; responsive: number;
}): number {
  return Math.round((
    scores.professional + scores.premium + scores.accessibility + scores.performance +
    scores.trust + scores.conversion + scores.emotion + scores.consistency + scores.responsive
  ) / 9);
}
