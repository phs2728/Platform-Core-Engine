/**
 * Workflow Engine — Task + Timer + History + Reference UseCases (11)
 *
 * createTask, assignTask, completeTask, cancelTask, reassignTask,
 * scheduleTimer, cancelTimer,
 * getHistory, getTimeline,
 * attachReference, appendTimeline
 */

import {
  Ok, Err, type Result,
  ValidationError, NotFoundError, ConflictError,
  type EventEnvelope,
} from '@platform/core-sdk';
import {
  createTaskSchema, assignTaskSchema, completeTaskSchema,
  cancelTaskSchema, reassignTaskSchema,
  scheduleTimerSchema, cancelTimerSchema,
  getHistorySchema, getTimelineSchema,
  attachReferenceSchema, appendTimelineSchema,
} from '../domain/validation.js';
import type { WorkflowUseCaseDeps } from './types.js';
import type {
  WorkflowTask, WorkflowTimer,
  WorkflowHistoryEntry, WorkflowTimelineEntry,
} from '../interfaces/index.js';

function env(deps: WorkflowUseCaseDeps, agg: string, tenant: string, corr: string, eventType: string, schemaRef: string, payload: unknown): EventEnvelope<unknown> {
  return {
    eventId: deps.idGenerator.generate(), aggregateId: agg, occurredAt: deps.clock.now().toISOString(),
    version: '1.0.0', tenantId: tenant, correlationId: corr, causationId: '',
    engine: 'workflow', eventType, schemaRef, payload,
  };
}

async function audit(deps: WorkflowUseCaseDeps, orgId: string, tenantId: string, actorId: string, corr: string, eventType: string, meta: Record<string, unknown>, workflowId?: string, instanceId?: string) {
  const rec: Record<string, unknown> = { organizationId: orgId, tenantId, actorId, correlationId: corr, eventType, metadata: meta };
  if (workflowId !== undefined) rec.workflowId = workflowId;
  if (instanceId !== undefined) rec.instanceId = instanceId;
  await deps.auditRepo.insert(rec as Parameters<typeof deps.auditRepo.insert>[0]);
}

// ════════════════════════════════════════════════════════════════════════════
// TASK LIFECYCLE (5)
// ════════════════════════════════════════════════════════════════════════════

export async function createTaskUseCase(
  input: {
    tenantId: string; correlationId: string; actorId: string;
    instanceId: string; workflowId: string; organizationId: string;
    title: string; description?: string;
    assigneeId?: string; assigneeRole?: string;
    priority?: 'Low' | 'Normal' | 'High' | 'Critical';
    dueDate?: string;
    attributes?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  },
  deps: WorkflowUseCaseDeps,
): Promise<Result<WorkflowTask, ValidationError | NotFoundError>> {
  const v = createTaskSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  // Verify instance exists
  const inst = await deps.instanceRepo.findById(d.tenantId, d.instanceId);
  if (!inst) return Err(new NotFoundError('Instance not found'));

  // Verify assignee if provided
  if (d.assigneeId !== undefined) {
    const userOk = await deps.userVerifier.verify(d.tenantId, d.assigneeId);
    if (!userOk) return Err(new ValidationError('Assignee not found'));
  }

  const taskId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();

  const task: WorkflowTask = {
    id: taskId, tenantId: d.tenantId, organizationId: d.organizationId,
    instanceId: d.instanceId, workflowId: d.workflowId,
    title: d.title, description: d.description ?? '',
    status: d.assigneeId !== undefined ? 'Assigned' : 'Pending',
    assigneeId: d.assigneeId ?? null,
    assigneeRole: d.assigneeRole ?? null,
    priority: d.priority ?? 'Normal',
    dueDate: d.dueDate ?? null,
    completedAt: null, cancelledAt: null,
    attributes: d.attributes ?? {}, metadata: d.metadata ?? {},
    createdBy: d.actorId, createdAt: now, updatedAt: now,
  };

  await deps.taskRepo.insert(task);
  await deps.eventBus.emit(env(deps, taskId, d.tenantId, d.correlationId, 'workflow.task.created', 'workflow.task.created.v1', { taskId, instanceId: d.instanceId, title: d.title }));
  await audit(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'task_created', { taskId, title: d.title }, d.workflowId, d.instanceId);
  return Ok(task);
}

export async function assignTaskUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; taskId: string; assigneeId: string; assigneeRole?: string },
  deps: WorkflowUseCaseDeps,
): Promise<Result<WorkflowTask, ValidationError | NotFoundError | ConflictError>> {
  const v = assignTaskSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.taskRepo.findById(d.tenantId, d.taskId);
  if (!ex) return Err(new NotFoundError('Task not found'));
  if (ex.status === 'Completed' || ex.status === 'Cancelled') {
    return Err(new ConflictError(`Task is ${ex.status}`));
  }
  const userOk = await deps.userVerifier.verify(d.tenantId, d.assigneeId);
  if (!userOk) return Err(new ValidationError('Assignee not found'));

  const now = deps.clock.now().toISOString();
  const patch: Partial<WorkflowTask> = {
    assigneeId: d.assigneeId, status: 'Assigned', updatedAt: now,
  };
  if (d.assigneeRole !== undefined) patch.assigneeRole = d.assigneeRole;
  await deps.taskRepo.update(d.tenantId, d.taskId, patch);
  await deps.eventBus.emit(env(deps, d.taskId, d.tenantId, d.correlationId, 'workflow.task.created', 'workflow.task.assigned.v1', { taskId: d.taskId, assigneeId: d.assigneeId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'task_assigned', { taskId: d.taskId, assigneeId: d.assigneeId }, ex.workflowId, ex.instanceId);
  return Ok({ ...ex, ...patch } as WorkflowTask);
}

export async function completeTaskUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; taskId: string; metadata?: Record<string, unknown> },
  deps: WorkflowUseCaseDeps,
): Promise<Result<WorkflowTask, ValidationError | NotFoundError | ConflictError>> {
  const v = completeTaskSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.taskRepo.findById(d.tenantId, d.taskId);
  if (!ex) return Err(new NotFoundError('Task not found'));
  if (ex.status === 'Completed') return Err(new ConflictError('Task already completed'));
  if (ex.status === 'Cancelled') return Err(new ConflictError('Task is cancelled'));

  const now = deps.clock.now().toISOString();
  await deps.taskRepo.update(d.tenantId, d.taskId, { status: 'Completed', completedAt: now, updatedAt: now });
  await deps.eventBus.emit(env(deps, d.taskId, d.tenantId, d.correlationId, 'workflow.task.completed', 'workflow.task.completed.v1', { taskId: d.taskId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'task_completed', { taskId: d.taskId }, ex.workflowId, ex.instanceId);
  return Ok({ ...ex, status: 'Completed', completedAt: now });
}

export async function cancelTaskUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; taskId: string; reason?: string },
  deps: WorkflowUseCaseDeps,
): Promise<Result<WorkflowTask, ValidationError | NotFoundError | ConflictError>> {
  const v = cancelTaskSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.taskRepo.findById(d.tenantId, d.taskId);
  if (!ex) return Err(new NotFoundError('Task not found'));
  if (ex.status === 'Completed') return Err(new ConflictError('Task already completed'));
  if (ex.status === 'Cancelled') return Err(new ConflictError('Task already cancelled'));

  const now = deps.clock.now().toISOString();
  await deps.taskRepo.update(d.tenantId, d.taskId, { status: 'Cancelled', cancelledAt: now, updatedAt: now });
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'task_cancelled', { taskId: d.taskId, reason: d.reason }, ex.workflowId, ex.instanceId);
  return Ok({ ...ex, status: 'Cancelled', cancelledAt: now });
}

export async function reassignTaskUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; taskId: string; assigneeId: string; assigneeRole?: string },
  deps: WorkflowUseCaseDeps,
): Promise<Result<WorkflowTask, ValidationError | NotFoundError | ConflictError>> {
  const v = reassignTaskSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.taskRepo.findById(d.tenantId, d.taskId);
  if (!ex) return Err(new NotFoundError('Task not found'));
  if (ex.status === 'Completed' || ex.status === 'Cancelled') {
    return Err(new ConflictError(`Task is ${ex.status}`));
  }
  const userOk = await deps.userVerifier.verify(d.tenantId, d.assigneeId);
  if (!userOk) return Err(new ValidationError('New assignee not found'));

  const now = deps.clock.now().toISOString();
  const patch: Partial<WorkflowTask> = {
    assigneeId: d.assigneeId, status: 'Assigned', updatedAt: now,
  };
  if (d.assigneeRole !== undefined) patch.assigneeRole = d.assigneeRole;
  await deps.taskRepo.update(d.tenantId, d.taskId, patch);
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'task_reassigned', { taskId: d.taskId, newAssigneeId: d.assigneeId }, ex.workflowId, ex.instanceId);
  return Ok({ ...ex, ...patch } as WorkflowTask);
}

// ════════════════════════════════════════════════════════════════════════════
// TIMER (2)
// ════════════════════════════════════════════════════════════════════════════

export async function scheduleTimerUseCase(
  input: {
    tenantId: string; correlationId: string; actorId: string;
    instanceId: string; organizationId: string;
    name: string; type: 'Delay' | 'Deadline' | 'Reminder' | 'Retry' | 'Timeout';
    ttlSeconds: number;
    payload?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  },
  deps: WorkflowUseCaseDeps,
): Promise<Result<WorkflowTimer, ValidationError | NotFoundError>> {
  const v = scheduleTimerSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const inst = await deps.instanceRepo.findById(d.tenantId, d.instanceId);
  if (!inst) return Err(new NotFoundError('Instance not found'));

  const timerId = deps.idGenerator.generate();
  const now = deps.clock.now();
  const fireAt = new Date(now.getTime() + d.ttlSeconds * 1000).toISOString();

  const timer: WorkflowTimer = {
    id: timerId, tenantId: d.tenantId, organizationId: d.organizationId,
    instanceId: d.instanceId,
    name: d.name, type: d.type, status: 'Scheduled',
    fireAt, firedAt: null, cancelledAt: null,
    payload: d.payload ?? {}, metadata: d.metadata ?? {},
    createdAt: now.toISOString(),
  };

  await deps.timerRepo.insert(timer);
  await audit(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'timer_scheduled', { timerId, name: d.name, type: d.type, fireAt }, inst.workflowId, d.instanceId);
  return Ok(timer);
}

export async function cancelTimerUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; timerId: string },
  deps: WorkflowUseCaseDeps,
): Promise<Result<WorkflowTimer, ValidationError | NotFoundError | ConflictError>> {
  const v = cancelTimerSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.timerRepo.findById(d.tenantId, d.timerId);
  if (!ex) return Err(new NotFoundError('Timer not found'));
  if (ex.status !== 'Scheduled') return Err(new ConflictError(`Timer is ${ex.status}`));

  const now = deps.clock.now().toISOString();
  await deps.timerRepo.update(d.tenantId, d.timerId, { status: 'Cancelled', cancelledAt: now });
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'timer_cancelled', { timerId: d.timerId }, undefined, ex.instanceId);
  return Ok({ ...ex, status: 'Cancelled', cancelledAt: now });
}

// ════════════════════════════════════════════════════════════════════════════
// HISTORY + TIMELINE (2) + REFERENCE + APPEND (2)
// ════════════════════════════════════════════════════════════════════════════

export async function getHistoryUseCase(
  input: { tenantId: string; instanceId: string; limit?: number },
  deps: WorkflowUseCaseDeps,
): Promise<Result<WorkflowHistoryEntry[], ValidationError>> {
  const v = getHistorySchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  return Ok(await deps.historyRepo.findByInstance(v.data.tenantId, v.data.instanceId, v.data.limit));
}

export async function getTimelineUseCase(
  input: { tenantId: string; instanceId: string; limit?: number },
  deps: WorkflowUseCaseDeps,
): Promise<Result<WorkflowTimelineEntry[], ValidationError>> {
  const v = getTimelineSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  return Ok(await deps.timelineRepo.findByInstance(v.data.tenantId, v.data.instanceId, v.data.limit));
}

export async function attachReferenceUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; instanceId: string; refType: string; refId: string; metadata?: Record<string, unknown> },
  deps: WorkflowUseCaseDeps,
): Promise<Result<{ instanceId: string; refType: string; refId: string }, ValidationError | NotFoundError>> {
  const v = attachReferenceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const inst = await deps.instanceRepo.findById(d.tenantId, d.instanceId);
  if (!inst) return Err(new NotFoundError('Instance not found'));

  const newRef = { refType: d.refType, refId: d.refId, metadata: d.metadata ?? {} };
  const refs = [...inst.references.filter((r) => !(r.refType === d.refType && r.refId === d.refId)), newRef];
  await deps.instanceRepo.update(d.tenantId, d.instanceId, { references: refs, updatedAt: deps.clock.now().toISOString() });
  await audit(deps, inst.organizationId, d.tenantId, d.actorId, d.correlationId, 'reference_attached', { refType: d.refType, refId: d.refId }, inst.workflowId, d.instanceId);
  return Ok({ instanceId: d.instanceId, refType: d.refType, refId: d.refId });
}

export async function appendTimelineUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; instanceId: string; eventType: string; description: string; metadata?: Record<string, unknown> },
  deps: WorkflowUseCaseDeps,
): Promise<Result<WorkflowTimelineEntry, ValidationError | NotFoundError>> {
  const v = appendTimelineSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const inst = await deps.instanceRepo.findById(d.tenantId, d.instanceId);
  if (!inst) return Err(new NotFoundError('Instance not found'));

  const entry: WorkflowTimelineEntry = {
    id: deps.idGenerator.generate(), tenantId: d.tenantId, instanceId: d.instanceId,
    eventType: d.eventType, actorId: d.actorId, description: d.description, metadata: d.metadata ?? {},
    createdAt: deps.clock.now().toISOString(),
  };
  await deps.timelineRepo.insert(entry);
  await audit(deps, inst.organizationId, d.tenantId, d.actorId, d.correlationId, 'timeline_appended', { eventType: d.eventType }, inst.workflowId, d.instanceId);
  return Ok(entry);
}
