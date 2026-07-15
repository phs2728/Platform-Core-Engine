/** Experience Engine — Shared Helpers */
import type { EventEnvelope } from '@platform/core-sdk';
import type { ExperienceAuditRecord, ExperienceAuditEventType } from '../interfaces/index.js';
import type { ExperienceUseCaseDeps } from './types.js';

export function envelope(
  deps: ExperienceUseCaseDeps, agg: string, tenant: string, corr: string,
  eventType: string, schemaRef: string, payload: unknown,
): EventEnvelope<unknown> {
  return {
    eventId: deps.idGenerator.generate(),
    aggregateId: agg,
    occurredAt: deps.clock.now().toISOString(),
    version: '1.0.0',
    tenantId: tenant,
    correlationId: corr,
    causationId: '',
    engine: 'experience',
    eventType,
    schemaRef,
    payload,
  };
}

export async function auditLog(
  deps: ExperienceUseCaseDeps, orgId: string, tenantId: string, actorId: string, corr: string,
  eventType: string, meta: Record<string, unknown>, experienceId?: string,
): Promise<void> {
  const rec: ExperienceAuditRecord = {
    id: deps.idGenerator.generate(),
    organizationId: orgId, tenantId, actorId, correlationId: corr,
    eventType: eventType as ExperienceAuditEventType,
    metadata: meta,
    createdAt: deps.clock.now().toISOString(),
  };
  if (experienceId !== undefined) rec.experienceId = experienceId;
  await deps.auditRepo.insert(rec);
}
