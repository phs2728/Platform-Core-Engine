/** Learning Engine — Shared Helpers */
import type { EventEnvelope } from '@platform/core-sdk';
import type { LearningUseCaseDeps } from './types.js';

export function envelope(
  deps: LearningUseCaseDeps, agg: string, tenant: string, corr: string,
  eventType: string, schemaRef: string, payload: unknown,
): EventEnvelope<unknown> {
  return {
    eventId: deps.idGenerator.generate(), aggregateId: agg, occurredAt: deps.clock.now().toISOString(),
    version: '1.0.0', tenantId: tenant, correlationId: corr, causationId: '',
    engine: 'learning', eventType, schemaRef, payload,
  };
}

export async function auditLog(
  deps: LearningUseCaseDeps, orgId: string, tenantId: string, actorId: string, corr: string,
  eventType: string, meta: Record<string, unknown>, projectId?: string,
): Promise<void> {
  const rec: Record<string, unknown> = { organizationId: orgId, tenantId, actorId, correlationId: corr, eventType, metadata: meta };
  if (projectId !== undefined) rec.projectId = projectId;
  await deps.auditRepo.insert(rec as Parameters<typeof deps.auditRepo.insert>[0]);
}

export async function updateMemory(
  deps: LearningUseCaseDeps, tenantId: string, projectId: string, action: string, summary: string,
): Promise<void> {
  const entry = { timestamp: deps.clock.now().toISOString(), action, summary };
  await deps.memoryRepo.appendEntry(tenantId, projectId, entry);
  await deps.eventBus.emit(envelope(deps, projectId, tenantId, '', LEARNING_EVENTS.MEMORY_UPDATED, 'memory.updated.v1', { action, summary }));
}

export async function createEvidence(
  deps: LearningUseCaseDeps, tenantId: string, projectId: string,
  source: string, sourceType: 'analytics' | 'behavior' | 'feedback' | 'ab_test' | 'observation' | 'benchmark' | 'outcome',
  claim: string, data: Record<string, unknown>, confidence: number,
): Promise<string> {
  const id = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  await deps.evidenceRepo.insert({
    id, tenantId, projectId, source, sourceType, claim, data, confidence, createdAt: now,
  });
  return id;
}

// Constants imported here to avoid circular deps in helpers
import { LEARNING_EVENTS } from '../domain/events.js';
