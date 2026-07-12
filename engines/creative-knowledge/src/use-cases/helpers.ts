/** Creative Knowledge Engine — Shared Helpers */
import type { EventEnvelope } from '@platform/core-sdk';
import type { KnowledgeUseCaseDeps } from './types.js';

export function envelope(
  deps: KnowledgeUseCaseDeps, agg: string, tenant: string, corr: string,
  eventType: string, schemaRef: string, payload: unknown,
): EventEnvelope<unknown> {
  return {
    eventId: deps.idGenerator.generate(), aggregateId: agg, occurredAt: deps.clock.now().toISOString(),
    version: '1.0.0', tenantId: tenant, correlationId: corr, causationId: '',
    engine: 'creative-knowledge', eventType, schemaRef, payload,
  };
}

export async function audit(
  deps: KnowledgeUseCaseDeps, orgId: string, tenantId: string, actorId: string, corr: string,
  eventType: string, meta: Record<string, unknown>, projectId?: string,
): Promise<void> {
  const rec: Record<string, unknown> = { organizationId: orgId, tenantId, actorId, correlationId: corr, eventType, metadata: meta };
  if (projectId !== undefined) rec.projectId = projectId;
  await deps.auditRepo.insert(rec as Parameters<typeof deps.auditRepo.insert>[0]);
}

export async function updateMemory(
  deps: KnowledgeUseCaseDeps, tenantId: string, projectId: string, action: string, summary: string,
): Promise<void> {
  const entry = { timestamp: deps.clock.now().toISOString(), action, summary };
  await deps.memoryRepo.appendEntry(tenantId, projectId, entry);
  await deps.eventBus.emit(envelope(deps, projectId, tenantId, '', 'memory.updated', 'memory.updated.v1', { action, summary }));
}
