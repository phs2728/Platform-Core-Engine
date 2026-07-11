/**
 * Workflow Engine — Instance + Transition UseCases (11)
 *
 * startWorkflow, cancelWorkflow, restartWorkflow,
 * getWorkflowInstance, listWorkflowInstances,
 * transition, approve, reject, rollback, retry, skip
 */

import {
  Ok, Err, type Result,
  ValidationError, ConflictError, NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';
import {
  startWorkflowSchema, cancelInstanceSchema, restartInstanceSchema,
  simpleInstanceActionSchema, getInstanceSchema, listInstancesSchema,
  transitionSchema, approveSchema, rejectSchema,
  rollbackSchema, retrySchema, skipSchema,
} from '../domain/validation.js';
import { validateWorkflowStatusTransition, validateStateTransition } from '../domain/statusTransition.js';
import type { WorkflowUseCaseDeps } from './types.js';
import type {
  Workflow, WorkflowInstance, ApprovalStep,
  WorkflowTimelineEntry, WorkflowHistoryEntry,
  InstanceSearchCriteria, InstanceSearchResult,
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

async function appendTimeline(deps: WorkflowUseCaseDeps, tenantId: string, instanceId: string, actorId: string, eventType: string, description: string, meta?: Record<string, unknown>) {
  const entry: WorkflowTimelineEntry = {
    id: deps.idGenerator.generate(), tenantId, instanceId,
    eventType, actorId, description, metadata: meta ?? {},
    createdAt: deps.clock.now().toISOString(),
  };
  await deps.timelineRepo.insert(entry);
}

async function appendHistory(deps: WorkflowUseCaseDeps, tenantId: string, instanceId: string, eventType: string, fromState: string | null, toState: string, actorId: string, corr: string, reason: string | null, meta?: Record<string, unknown>) {
  const existing = await deps.historyRepo.findByInstance(tenantId, instanceId);
  const seq = existing.length + 1;
  const entry: WorkflowHistoryEntry = {
    id: deps.idGenerator.generate(), tenantId, instanceId,
    sequenceNumber: seq, eventType, fromState, toState,
    actorId, correlationId: corr, reason, metadata: meta ?? {},
    createdAt: deps.clock.now().toISOString(),
  };
  await deps.historyRepo.insert(entry);
}

let instanceSeq = 0;
function generateInstanceNumber(deps: WorkflowUseCaseDeps): string {
  instanceSeq += 1;
  const date = deps.clock.now().toISOString().slice(0, 10).replace(/-/g, '');
  return `WF-${date}-${String(instanceSeq).padStart(6, '0')}`;
}

// ════════════════════════════════════════════════════════════════════════════
// START INSTANCE
// ════════════════════════════════════════════════════════════════════════════

export async function startWorkflowUseCase(
  input: {
    tenantId: string; correlationId: string; actorId: string;
    workflowId: string; initiatedBy: string;
    attributes?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    variables?: Record<string, unknown>;
  },
  deps: WorkflowUseCaseDeps,
): Promise<Result<{ instanceId: string; instanceNumber: string; initialState: string }, ValidationError | NotFoundError | ConflictError>> {
  const v = startWorkflowSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const wf = await deps.workflowRepo.findById(d.tenantId, d.workflowId);
  if (!wf) return Err(new NotFoundError('Workflow not found'));
  if (wf.archivedAt !== null) return Err(new ConflictError('Workflow is archived'));
  if (wf.status !== 'Active') return Err(new ConflictError(`Workflow not active (status: ${wf.status})`));

  // Verify initiator
  const userOk = await deps.userVerifier.verify(d.tenantId, d.initiatedBy);
  if (!userOk) return Err(new ValidationError('Initiator (user) not found'));

  const instId = deps.idGenerator.generate();
  const instNumber = generateInstanceNumber(deps);
  const now = deps.clock.now().toISOString();

  const instance: WorkflowInstance = {
    id: instId, tenantId: d.tenantId, organizationId: wf.organizationId,
    workflowId: wf.id, definitionVersion: wf.definition.version,
    instanceNumber: instNumber,
    currentState: wf.definition.initialState, status: 'Active',
    previousState: null, initiatedBy: d.initiatedBy,
    references: [],
    attributes: d.attributes ?? {}, metadata: d.metadata ?? {}, variables: d.variables ?? {},
    retryCount: 0, attemptHistory: [],
    createdAt: now, updatedAt: now, startedAt: now,
    completedAt: null, cancelledAt: null, cancelReason: null,
    failedAt: null, failReason: null, expiredAt: null, archivedAt: null,
  };

  await deps.instanceRepo.insert(instance);
  await appendTimeline(deps, d.tenantId, instId, d.actorId, 'started', `Workflow instance started: ${instNumber}`);
  await appendHistory(deps, d.tenantId, instId, 'started', null, instance.currentState, d.actorId, d.correlationId, null);
  await deps.eventBus.emit(env(deps, instId, d.tenantId, d.correlationId, 'workflow.started', 'workflow.started.v1', { instanceId: instId, instanceNumber: instNumber, initialState: instance.currentState }));
  await audit(deps, wf.organizationId, d.tenantId, d.actorId, d.correlationId, 'instance_started', { instanceNumber: instNumber }, wf.id, instId);
  return Ok({ instanceId: instId, instanceNumber: instNumber, initialState: instance.currentState });
}

// ════════════════════════════════════════════════════════════════════════════
// CANCEL / RESTART INSTANCE
// ════════════════════════════════════════════════════════════════════════════

export async function cancelWorkflowInstanceUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; instanceId: string; reason?: string },
  deps: WorkflowUseCaseDeps,
): Promise<Result<WorkflowInstance, ValidationError | NotFoundError | ConflictError>> {
  const v = cancelInstanceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.instanceRepo.findById(d.tenantId, d.instanceId);
  if (!ex) return Err(new NotFoundError('Instance not found'));
  const tr = validateWorkflowStatusTransition(ex.status, 'Cancelled');
  if (!tr.ok) return Err(new ConflictError(`Cannot cancel from ${ex.status}`));
  const now = deps.clock.now().toISOString();
  await deps.instanceRepo.update(d.tenantId, d.instanceId, {
    status: 'Cancelled', cancelledAt: now, cancelReason: d.reason ?? null, updatedAt: now,
  });
  await appendTimeline(deps, d.tenantId, d.instanceId, d.actorId, 'cancelled', d.reason ?? 'Cancelled');
  await appendHistory(deps, d.tenantId, d.instanceId, 'cancelled', ex.currentState, ex.currentState, d.actorId, d.correlationId, d.reason ?? null);
  await deps.eventBus.emit(env(deps, d.instanceId, d.tenantId, d.correlationId, 'workflow.cancelled', 'workflow.cancelled.v1', { instanceId: d.instanceId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'instance_cancelled', { reason: d.reason }, ex.workflowId, d.instanceId);
  return Ok({ ...ex, status: 'Cancelled', cancelledAt: now, cancelReason: d.reason ?? null });
}

export async function restartWorkflowUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; instanceId: string },
  deps: WorkflowUseCaseDeps,
): Promise<Result<WorkflowInstance, ValidationError | NotFoundError | ConflictError>> {
  const v = restartInstanceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.instanceRepo.findById(d.tenantId, d.instanceId);
  if (!ex) return Err(new NotFoundError('Instance not found'));
  if (ex.status !== 'Cancelled' && ex.status !== 'Failed') {
    return Err(new ConflictError(`Cannot restart from ${ex.status}`));
  }
  const wf = await deps.workflowRepo.findById(d.tenantId, ex.workflowId);
  if (!wf) return Err(new NotFoundError('Workflow not found'));
  const now = deps.clock.now().toISOString();
  await deps.instanceRepo.update(d.tenantId, d.instanceId, {
    status: 'Active', previousState: ex.currentState,
    currentState: wf.definition.initialState,
    cancelledAt: null, cancelReason: null, failedAt: null, failReason: null,
    retryCount: ex.retryCount + 1,
    attemptHistory: [...ex.attemptHistory, ex.currentState],
    updatedAt: now,
  });
  await appendTimeline(deps, d.tenantId, d.instanceId, d.actorId, 'restarted', `Instance restarted (attempt ${ex.retryCount + 2})`);
  await appendHistory(deps, d.tenantId, d.instanceId, 'restarted', ex.currentState, wf.definition.initialState, d.actorId, d.correlationId, null);
  await deps.eventBus.emit(env(deps, d.instanceId, d.tenantId, d.correlationId, 'workflow.started', 'workflow.restarted.v1', { instanceId: d.instanceId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'instance_restarted', { retryCount: ex.retryCount + 1 }, ex.workflowId, d.instanceId);
  return Ok({ ...ex, status: 'Active', currentState: wf.definition.initialState, retryCount: ex.retryCount + 1 });
}

// ════════════════════════════════════════════════════════════════════════════
// GET / LIST INSTANCE
// ════════════════════════════════════════════════════════════════════════════

export async function getWorkflowInstanceUseCase(
  input: { tenantId: string; instanceId: string },
  deps: WorkflowUseCaseDeps,
): Promise<Result<WorkflowInstance | null, ValidationError>> {
  const v = getInstanceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  return Ok(await deps.instanceRepo.findById(v.data.tenantId, v.data.instanceId));
}

export async function listWorkflowInstancesUseCase(
  input: InstanceSearchCriteria,
  deps: WorkflowUseCaseDeps,
): Promise<Result<InstanceSearchResult, ValidationError>> {
  const v = listInstancesSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  return Ok(await deps.instanceRepo.search(v.data as InstanceSearchCriteria));
}

// ════════════════════════════════════════════════════════════════════════════
// TRANSITION (generic state machine move)
// ════════════════════════════════════════════════════════════════════════════

export async function transitionUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; instanceId: string; toState: string; reason?: string; metadata?: Record<string, unknown> },
  deps: WorkflowUseCaseDeps,
): Promise<Result<WorkflowInstance, ValidationError | NotFoundError | ConflictError>> {
  const v = transitionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.instanceRepo.findById(d.tenantId, d.instanceId);
  if (!ex) return Err(new NotFoundError('Instance not found'));
  if (ex.status !== 'Active' && ex.status !== 'Waiting' && ex.status !== 'Paused') {
    return Err(new ConflictError(`Instance not active (status: ${ex.status})`));
  }
  const wf = await deps.workflowRepo.findById(d.tenantId, ex.workflowId);
  if (!wf) return Err(new NotFoundError('Workflow not found'));

  // Validate definition-level state transition
  const stateTr = validateStateTransition(wf.definition.states, wf.definition.transitions, ex.currentState, d.toState);
  if (!stateTr.ok) return Err(stateTr.error);

  const now = deps.clock.now().toISOString();
  const completed = d.toState === wf.definition.states[wf.definition.states.length - 1];
  const newStatus = completed ? 'Completed' : ex.status;

  await deps.instanceRepo.update(d.tenantId, d.instanceId, {
    currentState: d.toState, previousState: ex.currentState,
    ...(completed ? { status: 'Completed', completedAt: now } : {}),
    updatedAt: now,
  });
  await appendTimeline(deps, d.tenantId, d.instanceId, d.actorId, 'transitioned', `State: ${ex.currentState} → ${d.toState}`, d.metadata);
  await appendHistory(deps, d.tenantId, d.instanceId, 'transitioned', ex.currentState, d.toState, d.actorId, d.correlationId, d.reason ?? null, d.metadata);
  await deps.eventBus.emit(env(deps, d.instanceId, d.tenantId, d.correlationId, 'workflow.transitioned', 'workflow.transitioned.v1', { instanceId: d.instanceId, fromState: ex.currentState, toState: d.toState }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'instance_transitioned', { fromState: ex.currentState, toState: d.toState }, ex.workflowId, d.instanceId);
  return Ok({ ...ex, currentState: d.toState, previousState: ex.currentState, ...(completed ? { status: 'Completed', completedAt: now } : {}) });
}

// ════════════════════════════════════════════════════════════════════════════
// APPROVE / REJECT
// ════════════════════════════════════════════════════════════════════════════

export async function approveUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; instanceId: string; stepName: string; approverId: string; reason?: string },
  deps: WorkflowUseCaseDeps,
): Promise<Result<ApprovalStep, ValidationError | NotFoundError | ConflictError>> {
  const v = approveSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.instanceRepo.findById(d.tenantId, d.instanceId);
  if (!ex) return Err(new NotFoundError('Instance not found'));

  const steps = await deps.approvalRepo.findByInstance(d.tenantId, d.instanceId);
  const step = steps.find((s) => s.stepName === d.stepName);
  if (!step) return Err(new NotFoundError(`Approval step "${d.stepName}" not found`));
  if (step.status !== 'Pending') return Err(new ConflictError(`Step already ${step.status}`));

  const now = deps.clock.now().toISOString();
  await deps.approvalRepo.update(d.tenantId, step.id, {
    status: 'Approved', approverId: d.approverId, approvedAt: now, reason: d.reason ?? null, updatedAt: now,
  });
  await appendTimeline(deps, d.tenantId, d.instanceId, d.actorId, 'approved', `Step "${d.stepName}" approved`, { approverId: d.approverId });
  await deps.eventBus.emit(env(deps, d.instanceId, d.tenantId, d.correlationId, 'workflow.approval.completed', 'workflow.approval.completed.v1', { instanceId: d.instanceId, stepName: d.stepName, decision: 'Approved' }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'approval_completed', { stepName: d.stepName, decision: 'Approved' }, ex.workflowId, d.instanceId);
  return Ok({ ...step, status: 'Approved', approverId: d.approverId, approvedAt: now });
}

export async function rejectUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; instanceId: string; stepName: string; approverId: string; reason: string },
  deps: WorkflowUseCaseDeps,
): Promise<Result<ApprovalStep, ValidationError | NotFoundError | ConflictError>> {
  const v = rejectSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.instanceRepo.findById(d.tenantId, d.instanceId);
  if (!ex) return Err(new NotFoundError('Instance not found'));

  const steps = await deps.approvalRepo.findByInstance(d.tenantId, d.instanceId);
  const step = steps.find((s) => s.stepName === d.stepName);
  if (!step) return Err(new NotFoundError(`Approval step "${d.stepName}" not found`));
  if (step.status !== 'Pending') return Err(new ConflictError(`Step already ${step.status}`));

  const now = deps.clock.now().toISOString();
  await deps.approvalRepo.update(d.tenantId, step.id, {
    status: 'Rejected', approverId: d.approverId, rejectedAt: now, reason: d.reason, updatedAt: now,
  });
  // Reject the instance too
  await deps.instanceRepo.update(d.tenantId, d.instanceId, {
    status: 'Failed', failedAt: now, failReason: `Rejected: ${d.stepName}`, updatedAt: now,
  });
  await appendTimeline(deps, d.tenantId, d.instanceId, d.actorId, 'rejected', `Step "${d.stepName}" rejected: ${d.reason}`, { approverId: d.approverId });
  await deps.eventBus.emit(env(deps, d.instanceId, d.tenantId, d.correlationId, 'workflow.failed', 'workflow.approval.rejected.v1', { instanceId: d.instanceId, stepName: d.stepName }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'approval_rejected', { stepName: d.stepName, reason: d.reason }, ex.workflowId, d.instanceId);
  return Ok({ ...step, status: 'Rejected', approverId: d.approverId, rejectedAt: now });
}

// ════════════════════════════════════════════════════════════════════════════
// ROLLBACK / RETRY / SKIP
// ════════════════════════════════════════════════════════════════════════════

export async function rollbackUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; instanceId: string; toState?: string; reason?: string },
  deps: WorkflowUseCaseDeps,
): Promise<Result<WorkflowInstance, ValidationError | NotFoundError | ConflictError>> {
  const v = rollbackSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.instanceRepo.findById(d.tenantId, d.instanceId);
  if (!ex) return Err(new NotFoundError('Instance not found'));

  const history = await deps.historyRepo.findByInstance(d.tenantId, d.instanceId);
  const targetState = d.toState ?? ex.previousState ?? (history.length >= 2 ? history[history.length - 2]!.toState : null);
  if (!targetState) return Err(new ConflictError('No previous state to rollback to'));

  const now = deps.clock.now().toISOString();
  await deps.instanceRepo.update(d.tenantId, d.instanceId, {
    currentState: targetState, previousState: ex.currentState, updatedAt: now,
  });
  await appendTimeline(deps, d.tenantId, d.instanceId, d.actorId, 'rollback', `Rolled back: ${ex.currentState} → ${targetState}`, { reason: d.reason });
  await appendHistory(deps, d.tenantId, d.instanceId, 'rollback', ex.currentState, targetState, d.actorId, d.correlationId, d.reason ?? null);
  await deps.eventBus.emit(env(deps, d.instanceId, d.tenantId, d.correlationId, 'workflow.transitioned', 'workflow.rollback.v1', { instanceId: d.instanceId, fromState: ex.currentState, toState: targetState }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'rollback_executed', { fromState: ex.currentState, toState: targetState }, ex.workflowId, d.instanceId);
  return Ok({ ...ex, currentState: targetState, previousState: ex.currentState });
}

export async function retryUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; instanceId: string; reason?: string },
  deps: WorkflowUseCaseDeps,
): Promise<Result<WorkflowInstance, ValidationError | NotFoundError | ConflictError>> {
  const v = retrySchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.instanceRepo.findById(d.tenantId, d.instanceId);
  if (!ex) return Err(new NotFoundError('Instance not found'));
  if (ex.status !== 'Failed') return Err(new ConflictError(`Cannot retry from ${ex.status}`));

  const now = deps.clock.now().toISOString();
  const newRetryCount = ex.retryCount + 1;
  await deps.instanceRepo.update(d.tenantId, d.instanceId, {
    status: 'Active', failedAt: null, failReason: null,
    retryCount: newRetryCount,
    attemptHistory: [...ex.attemptHistory, ex.currentState],
    updatedAt: now,
  });
  await appendTimeline(deps, d.tenantId, d.instanceId, d.actorId, 'retry', `Retry attempt ${newRetryCount + 1}`, { reason: d.reason });
  await appendHistory(deps, d.tenantId, d.instanceId, 'retry', ex.currentState, ex.currentState, d.actorId, d.correlationId, d.reason ?? null);
  await deps.eventBus.emit(env(deps, d.instanceId, d.tenantId, d.correlationId, 'workflow.started', 'workflow.retry.v1', { instanceId: d.instanceId, retryCount: newRetryCount }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'retry_executed', { retryCount: newRetryCount }, ex.workflowId, d.instanceId);
  return Ok({ ...ex, status: 'Active', retryCount: newRetryCount });
}

export async function skipUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; instanceId: string; stepName: string; reason?: string },
  deps: WorkflowUseCaseDeps,
): Promise<Result<ApprovalStep, ValidationError | NotFoundError | ConflictError>> {
  const v = skipSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.instanceRepo.findById(d.tenantId, d.instanceId);
  if (!ex) return Err(new NotFoundError('Instance not found'));

  const steps = await deps.approvalRepo.findByInstance(d.tenantId, d.instanceId);
  const step = steps.find((s) => s.stepName === d.stepName);
  if (!step) return Err(new NotFoundError(`Approval step "${d.stepName}" not found`));
  if (step.status !== 'Pending') return Err(new ConflictError(`Step already ${step.status}`));

  const now = deps.clock.now().toISOString();
  await deps.approvalRepo.update(d.tenantId, step.id, {
    status: 'Skipped', skippedAt: now, reason: d.reason ?? null, updatedAt: now,
  });
  await appendTimeline(deps, d.tenantId, d.instanceId, d.actorId, 'skipped', `Step "${d.stepName}" skipped`, { reason: d.reason });
  await deps.eventBus.emit(env(deps, d.instanceId, d.tenantId, d.correlationId, 'workflow.approval.completed', 'workflow.approval.skipped.v1', { instanceId: d.instanceId, stepName: d.stepName, decision: 'Skipped' }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'approval_skipped', { stepName: d.stepName }, ex.workflowId, d.instanceId);
  return Ok({ ...step, status: 'Skipped', skippedAt: now });
}
