/**
 * Projection UseCases (7) —
 *   createProjection / rebuildProjection / refreshProjection /
 *   archiveProjection / deleteProjection / processEvent / getProjection
 */
import {
  Ok, Err, type Result,
  ValidationError, NotFoundError, ConflictError,
  type EventEnvelope,
} from '@platform/core-sdk';
import { recordQueryAudit } from '../domain/audit.js';
import {
  createProjectionSchema, rebuildProjectionSchema, refreshProjectionSchema,
  archiveProjectionSchema, processEventSchema,
} from '../domain/validation.js';
import { emitQueryEvent } from '../domain/events.js';
import { isEventProcessed, nextVersion } from '../domain/statusTransition.js';
import type { QueryUseCaseDeps } from './types.js';
import type { Projection, FeedEvent, Checkpoint } from '../interfaces/index.js';

// CREATE
export interface CreateProjectionInput {
  tenantId: string; correlationId: string; actorId: string;
  name: string;
  type: 'realtime' | 'scheduled' | 'snapshot' | 'incremental' | 'full_rebuild';
  sourceEngine: string;
  sourceEventTypes: string[];
  targetType: string;
  targetRef: string;
}

export async function createProjectionUseCase(
  input: CreateProjectionInput, deps: QueryUseCaseDeps,
): Promise<Result<{ projectionId: string; createdAt: string }, ValidationError | ConflictError>> {
  const v = createProjectionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid projection input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const allowed = await deps.policyProvider.getAllowedProjectionTypes(d.tenantId);
  if (!allowed.includes(d.targetType)) {
    return Err(new ValidationError(`targetType "${d.targetType}" not allowed`, { details: { allowed } }));
  }

  // Check existing
  const existing = await deps.projectionRepo.findByTarget(d.tenantId, d.targetType, d.targetRef);
  if (existing && existing.status !== 'Archived') {
    return Err(new ConflictError('Projection already exists for this target', { details: { targetRef: d.targetRef } }));
  }

  const pid = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();

  const projection: Projection = {
    id: pid, tenantId: d.tenantId, name: d.name,
    type: d.type, status: 'Building',
    sourceEngine: d.sourceEngine, sourceEventTypes: d.sourceEventTypes,
    targetType: d.targetType, targetRef: d.targetRef,
    data: {}, version: 0, checkpoint: -1, eventCount: 0,
    lastEventAt: null, lastBuildAt: null, lastError: null,
    metadata: {}, createdAt: now, updatedAt: now,
  };
  await deps.projectionRepo.insert(projection);

  // Init checkpoint
  const cpId = deps.idGenerator.generate();
  const cp: Checkpoint = {
    id: cpId, tenantId: d.tenantId, projectionId: pid,
    engine: d.sourceEngine, position: -1, eventCount: 0, updatedAt: now,
  };
  await deps.checkpointRepo.insert(cp);

  const env: EventEnvelope<{ projectionId: string; targetType: string }> =
    await emitQueryEvent(deps, { aggregateId: pid, tenantId: d.tenantId, correlationId: d.correlationId },
      'projection.created', 'projection.created.v1', { projectionId: pid, targetType: d.targetType });
  await deps.eventBus.emit(env);

  await recordQueryAudit(deps.auditRepo, {
    tenantId: d.tenantId, projectionId: pid, actorId: d.actorId, correlationId: d.correlationId,
    eventType: 'projection_created', metadata: { targetType: d.targetType },
  });

  return Ok({ projectionId: pid, createdAt: now });
}

// PROCESS EVENT (incremental update)
export interface ProcessEventInput {
  tenantId: string; correlationId: string; actorId: string;
  projectionId: string;
  event: FeedEvent;
}

export async function processEventUseCase(
  input: ProcessEventInput, deps: QueryUseCaseDeps,
): Promise<Result<{ processed: boolean; version: number }, ValidationError | NotFoundError | ConflictError>> {
  const v = processEventSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const projection = await deps.projectionRepo.findById(d.tenantId, d.projectionId);
  if (!projection) return Err(new NotFoundError('Projection not found'));
  if (projection.status === 'Archived') return Err(new ConflictError('Cannot process events for archived projection'));

  // Idempotency check
  if (isEventProcessed(projection.checkpoint, d.event.position)) {
    return Ok({ processed: false, version: projection.version });
  }

  // Check if event type is in the projection's subscription list
  if (!projection.sourceEventTypes.includes(d.event.eventType) && !projection.sourceEventTypes.includes('*')) {
    return Ok({ processed: false, version: projection.version });
  }

  // Update projection data (merge event payload)
  const newVersion = nextVersion(projection.version);
  const newData = { ...projection.data };
  // Generic merge: store events by type
  const eventTypeKey = d.event.eventType.replace(/\./g, '_');
  const existingList = Array.isArray(newData[eventTypeKey]) ? newData[eventTypeKey] as unknown[] : [];
  existingList.push(d.event.payload);
  newData[eventTypeKey] = existingList;
  newData.lastProcessedEvent = { eventId: d.event.eventId, type: d.event.eventType, at: d.event.occurredAt };

  const now = deps.clock.now().toISOString();
  await deps.projectionRepo.update(d.tenantId, d.projectionId, {
    data: newData, version: newVersion, checkpoint: d.event.position,
    eventCount: projection.eventCount + 1,
    lastEventAt: d.event.occurredAt,
    status: 'Ready', updatedAt: now,
  });

  // Update checkpoint
  const cp = await deps.checkpointRepo.findByProjection(d.tenantId, d.projectionId, projection.sourceEngine);
  if (cp) {
    await deps.checkpointRepo.update(d.tenantId, cp.id, {
      position: d.event.position, eventCount: cp.eventCount + 1, updatedAt: now,
    });
  }

  const env: EventEnvelope<{ projectionId: string; version: number }> =
    await emitQueryEvent(deps, { aggregateId: d.projectionId, tenantId: d.tenantId, correlationId: d.correlationId },
      'projection.updated', 'projection.updated.v1', { projectionId: d.projectionId, version: newVersion });
  await deps.eventBus.emit(env);

  return Ok({ processed: true, version: newVersion });
}

// REBUILD (full rebuild from event history)
export async function rebuildProjectionUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; projectionId: string },
  deps: QueryUseCaseDeps,
): Promise<Result<{ projectionId: string; eventCount: number; version: number }, ValidationError | NotFoundError>> {
  const v = rebuildProjectionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const projection = await deps.projectionRepo.findById(d.tenantId, d.projectionId);
  if (!projection) return Err(new NotFoundError('Projection not found'));

  // Reset to building state
  const now = deps.clock.now().toISOString();
  await deps.projectionRepo.update(d.tenantId, d.projectionId, {
    status: 'Building', data: {}, version: 0, checkpoint: -1, eventCount: 0, lastBuildAt: now, updatedAt: now,
  });

  // Fetch all events from source engine
  const events = await deps.eventFeedProvider.getEventsSince(projection.sourceEngine, -1, 10000);

  let processedCount = 0;
  let newData: Record<string, unknown> = {};
  let maxPosition = -1;

  for (const event of events) {
    // Filter by event types
    if (!projection.sourceEventTypes.includes(event.eventType) && !projection.sourceEventTypes.includes('*')) continue;

    processedCount++;
    maxPosition = Math.max(maxPosition, event.position);

    const eventTypeKey = event.eventType.replace(/\./g, '_');
    const existingList = Array.isArray(newData[eventTypeKey]) ? newData[eventTypeKey] as unknown[] : [];
    existingList.push(event.payload);
    newData[eventTypeKey] = existingList;
  }
  newData.lastProcessedEvent = events.length > 0 ? { lastEventId: events[events.length - 1]!.eventId, count: events.length } : null;

  const newVersion = processedCount > 0 ? 1 : 0;
  await deps.projectionRepo.update(d.tenantId, d.projectionId, {
    data: newData, version: newVersion, checkpoint: maxPosition,
    eventCount: processedCount,
    lastEventAt: events.length > 0 ? events[events.length - 1]!.occurredAt : null,
    status: 'Ready', updatedAt: deps.clock.now().toISOString(),
  });

  const env: EventEnvelope<{ projectionId: string; eventCount: number }> =
    await emitQueryEvent(deps, { aggregateId: d.projectionId, tenantId: d.tenantId, correlationId: d.correlationId },
      'projection.rebuilt', 'projection.rebuilt.v1', { projectionId: d.projectionId, eventCount: processedCount });
  await deps.eventBus.emit(env);

  await recordQueryAudit(deps.auditRepo, {
    tenantId: d.tenantId, projectionId: d.projectionId, actorId: d.actorId, correlationId: d.correlationId,
    eventType: 'projection_rebuilt', metadata: { eventCount: processedCount },
  });

  return Ok({ projectionId: d.projectionId, eventCount: processedCount, version: newVersion });
}

// REFRESH (incremental update from checkpoint)
export async function refreshProjectionUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; projectionId: string },
  deps: QueryUseCaseDeps,
): Promise<Result<{ projectionId: string; newEvents: number }, ValidationError | NotFoundError>> {
  const v = refreshProjectionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const projection = await deps.projectionRepo.findById(d.tenantId, d.projectionId);
  if (!projection) return Err(new NotFoundError('Projection not found'));

  const events = await deps.eventFeedProvider.getEventsSince(projection.sourceEngine, projection.checkpoint, 1000);
  let newEvents = 0;

  for (const event of events) {
    if (!projection.sourceEventTypes.includes(event.eventType) && !projection.sourceEventTypes.includes('*')) continue;
    const r = await processEventUseCase({
      tenantId: d.tenantId, correlationId: d.correlationId, actorId: d.actorId,
      projectionId: d.projectionId, event,
    }, deps);
    if (r.ok && r.value.processed) newEvents++;
  }

  const env: EventEnvelope<{ projectionId: string; newEvents: number }> =
    await emitQueryEvent(deps, { aggregateId: d.projectionId, tenantId: d.tenantId, correlationId: d.correlationId },
      'projection.refreshed', 'projection.refreshed.v1', { projectionId: d.projectionId, newEvents });
  await deps.eventBus.emit(env);

  await recordQueryAudit(deps.auditRepo, {
    tenantId: d.tenantId, projectionId: d.projectionId, actorId: d.actorId, correlationId: d.correlationId,
    eventType: 'projection_refreshed', metadata: { newEvents },
  });

  return Ok({ projectionId: d.projectionId, newEvents });
}

// ARCHIVE
export async function archiveProjectionUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; projectionId: string },
  deps: QueryUseCaseDeps,
): Promise<Result<{ projectionId: string; archived: boolean }, ValidationError | NotFoundError>> {
  const v = archiveProjectionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const p = await deps.projectionRepo.findById(d.tenantId, d.projectionId);
  if (!p) return Err(new NotFoundError('Projection not found'));

  await deps.projectionRepo.update(d.tenantId, d.projectionId, {
    status: 'Archived', updatedAt: deps.clock.now().toISOString(),
  });

  await recordQueryAudit(deps.auditRepo, {
    tenantId: d.tenantId, projectionId: d.projectionId, actorId: d.actorId, correlationId: d.correlationId,
    eventType: 'projection_archived', metadata: {},
  });

  return Ok({ projectionId: d.projectionId, archived: true });
}

// GET
export async function getProjectionUseCase(
  tenantId: string, projectionId: string, deps: QueryUseCaseDeps,
): Promise<Result<Projection | null, ValidationError>> {
  if (!tenantId || !projectionId) return Err(new ValidationError('tenantId and projectionId required'));
  return Ok(await deps.projectionRepo.findById(tenantId, projectionId));
}
