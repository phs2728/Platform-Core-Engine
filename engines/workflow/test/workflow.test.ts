/**
 * Workflow Engine — Tests (60+)
 *
 * Coverage:
 *   - Workflow CRUD (8 UseCases)
 *   - Instance lifecycle (start, cancel, restart, get, list)
 *   - State transition (transition, approve, reject, rollback, retry, skip)
 *   - Task lifecycle (create, assign, complete, cancel, reassign)
 *   - Timer (schedule, cancel)
 *   - History + Timeline
 *   - State machine validation
 *   - Error paths
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createWorkflowUseCase, updateWorkflowUseCase,
  archiveWorkflowUseCase, restoreWorkflowUseCase,
  deleteWorkflowUseCase, getWorkflowUseCase,
  listWorkflowsUseCase, searchWorkflowsUseCase,
  startWorkflowUseCase, cancelWorkflowInstanceUseCase,
  restartWorkflowUseCase, getWorkflowInstanceUseCase,
  listWorkflowInstancesUseCase,
  transitionUseCase, approveUseCase, rejectUseCase,
  rollbackUseCase, retryUseCase, skipUseCase,
  createTaskUseCase, assignTaskUseCase, completeTaskUseCase,
  cancelTaskUseCase, reassignTaskUseCase,
  scheduleTimerUseCase, cancelTimerUseCase,
  getHistoryUseCase, getTimelineUseCase,
  attachReferenceUseCase, appendTimelineUseCase,
  validateWorkflowStatusTransition, isTerminalStatus,
} from '../src/index.js';
import { makeDeps, createStandardWorkflow, STANDARD_STATES, STANDARD_TRANSITIONS } from './helpers.js';
import type { WorkflowUseCaseDeps } from '../src/use-cases/types.js';

const baseInput = {
  tenantId: 't-1', correlationId: 'corr-1', actorId: 'user-1', organizationId: 'org-1',
};

// ════════════════════════════════════════════════════════════════════════════
// WORKFLOW CRUD
// ════════════════════════════════════════════════════════════════════════════

describe('Workflow CRUD', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('creates a workflow', async () => {
    const r = await createWorkflowUseCase({
      ...baseInput, name: 'Alpha', slug: 'alpha', type: 'sequential',
      states: [...STANDARD_STATES], initialState: 'submitted',
      transitions: STANDARD_TRANSITIONS,
    }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.workflowId).toBeTruthy();
    expect(r.value.createdAt).toBeTruthy();
  });

  it('rejects unknown organization', async () => {
    const r = await createWorkflowUseCase({
      ...baseInput, organizationId: 'unknown-org',
      name: 'Alpha', slug: 'alpha', type: 'sequential',
      states: [...STANDARD_STATES], initialState: 'submitted',
      transitions: STANDARD_TRANSITIONS,
    }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects disallowed type', async () => {
    const r = await createWorkflowUseCase({
      ...baseInput, name: 'Alpha', slug: 'alpha', type: 'forbidden-type',
      states: [...STANDARD_STATES], initialState: 'submitted',
      transitions: STANDARD_TRANSITIONS,
    }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects duplicate slug', async () => {
    const input = {
      ...baseInput, name: 'Alpha', slug: 'alpha', type: 'sequential',
      states: [...STANDARD_STATES], initialState: 'submitted',
      transitions: STANDARD_TRANSITIONS,
    };
    await createWorkflowUseCase(input, deps);
    const r2 = await createWorkflowUseCase(input, deps);
    expect(r2.ok).toBe(false);
  });

  it('rejects initialState not in states', async () => {
    const r = await createWorkflowUseCase({
      ...baseInput, name: 'Alpha', slug: 'alpha', type: 'sequential',
      states: ['a', 'b'], initialState: 'c',
      transitions: [],
    }, deps);
    expect(r.ok).toBe(false);
  });

  it('updates a workflow', async () => {
    const wfId = await createStandardWorkflow(deps);
    const r = await updateWorkflowUseCase({ ...baseInput, workflowId: wfId, name: 'Beta' }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.name).toBe('Beta');
  });

  it('gets a workflow', async () => {
    const wfId = await createStandardWorkflow(deps);
    const r = await getWorkflowUseCase({ tenantId: 't-1', workflowId: wfId }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).not.toBeNull();
    expect(r.value!.id).toBe(wfId);
  });

  it('lists workflows by organization', async () => {
    await createStandardWorkflow(deps, { slug: 'a' });
    await createStandardWorkflow(deps, { slug: 'b' });
    const r = await listWorkflowsUseCase({ tenantId: 't-1', organizationId: 'org-1' }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.total).toBe(2);
  });

  it('searches workflows by name', async () => {
    await createStandardWorkflow(deps, { name: 'Alpha Process', slug: 'a' });
    await createStandardWorkflow(deps, { name: 'Beta Process', slug: 'b' });
    const r = await searchWorkflowsUseCase({ tenantId: 't-1', query: 'Alpha' }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.total).toBe(1);
    expect(r.value.workflows[0]!.name).toContain('Alpha');
  });

  it('archives and restores a workflow', async () => {
    const wfId = await createStandardWorkflow(deps);
    const ar = await archiveWorkflowUseCase({ ...baseInput, workflowId: wfId }, deps);
    expect(ar.ok).toBe(true);
    expect(ar.ok && ar.value.archivedAt).not.toBeNull();
    const rr = await restoreWorkflowUseCase({ ...baseInput, workflowId: wfId }, deps);
    expect(rr.ok).toBe(true);
    expect(rr.ok && rr.value.archivedAt).toBeNull();
  });

  it('rejects double archive', async () => {
    const wfId = await createStandardWorkflow(deps);
    await archiveWorkflowUseCase({ ...baseInput, workflowId: wfId }, deps);
    const r = await archiveWorkflowUseCase({ ...baseInput, workflowId: wfId }, deps);
    expect(r.ok).toBe(false);
  });

  it('deletes a workflow', async () => {
    const wfId = await createStandardWorkflow(deps);
    const r = await deleteWorkflowUseCase({ ...baseInput, workflowId: wfId }, deps);
    expect(r.ok).toBe(true);
    const gr = await getWorkflowUseCase({ tenantId: 't-1', workflowId: wfId }, deps);
    expect(gr.ok && gr.value).toBeNull();
  });

  it('emits workflow.created event', async () => {
    await createStandardWorkflow(deps);
    expect(deps.eventBus.countByType('workflow.created')).toBe(1);
  });

  it('records audit on create', async () => {
    await createStandardWorkflow(deps);
    const audits = await deps.auditRepo.findByTenant('t-1');
    expect(audits.length).toBe(1);
    expect(audits[0]!.eventType).toBe('workflow_created');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// STATE MACHINE VALIDATION
// ════════════════════════════════════════════════════════════════════════════

describe('State Machine', () => {
  it('allows Draft → Active', () => {
    expect(validateWorkflowStatusTransition('Draft', 'Active').ok).toBe(true);
  });

  it('allows Active → Completed', () => {
    expect(validateWorkflowStatusTransition('Active', 'Completed').ok).toBe(true);
  });

  it('allows Failed → Active (retry)', () => {
    expect(validateWorkflowStatusTransition('Failed', 'Active').ok).toBe(true);
  });

  it('rejects same-status transition', () => {
    expect(validateWorkflowStatusTransition('Active', 'Active').ok).toBe(false);
  });

  it('rejects terminal → anything', () => {
    expect(validateWorkflowStatusTransition('Completed', 'Active').ok).toBe(false);
    expect(validateWorkflowStatusTransition('Cancelled', 'Active').ok).toBe(false);
    expect(validateWorkflowStatusTransition('Expired', 'Active').ok).toBe(false);
  });

  it('rejects undefined transition', () => {
    expect(validateWorkflowStatusTransition('Draft', 'Completed').ok).toBe(false);
  });

  it('identifies terminal states', () => {
    expect(isTerminalStatus('Completed')).toBe(true);
    expect(isTerminalStatus('Cancelled')).toBe(true);
    expect(isTerminalStatus('Active')).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// WORKFLOW ACTIVATION (needed before instances)
// ════════════════════════════════════════════════════════════════════════════

describe('Workflow Activation', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('rejects start on non-active workflow', async () => {
    const wfId = await createStandardWorkflow(deps); // status: Draft
    const r = await startWorkflowUseCase({
      tenantId: 't-1', correlationId: 'corr-1', actorId: 'user-1',
      workflowId: wfId, initiatedBy: 'user-1',
    }, deps);
    expect(r.ok).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// INSTANCE LIFECYCLE
// ════════════════════════════════════════════════════════════════════════════

describe('Instance Lifecycle', () => {
  let deps: ReturnType<typeof makeDeps>;
  let wfId: string;

  beforeEach(async () => {
    deps = makeDeps();
    wfId = await createStandardWorkflow(deps);
    // Activate the workflow by setting status directly (simulates publish)
    await deps.workflowRepo.update('t-1', wfId, { status: 'Active' });
  });

  async function startInstance(): Promise<string> {
    const r = await startWorkflowUseCase({
      tenantId: 't-1', correlationId: 'corr-1', actorId: 'user-1',
      workflowId: wfId, initiatedBy: 'user-1',
    }, deps);
    if (!r.ok) throw new Error('start failed');
    return r.value.instanceId;
  }

  it('starts an instance', async () => {
    const r = await startWorkflowUseCase({
      tenantId: 't-1', correlationId: 'corr-1', actorId: 'user-1',
      workflowId: wfId, initiatedBy: 'user-1',
    }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.instanceNumber).toMatch(/^WF-\d{8}-\d{6}$/);
    expect(r.value.initialState).toBe('submitted');
  });

  it('emits workflow.started event', async () => {
    await startInstance();
    expect(deps.eventBus.countByType('workflow.started')).toBe(1);
  });

  it('rejects unknown initiator', async () => {
    const r = await startWorkflowUseCase({
      tenantId: 't-1', correlationId: 'corr-1', actorId: 'user-1',
      workflowId: wfId, initiatedBy: 'unknown-user',
    }, deps);
    expect(r.ok).toBe(false);
  });

  it('cancels an instance', async () => {
    const instId = await startInstance();
    const r = await cancelWorkflowInstanceUseCase({
      ...baseInput, instanceId: instId, reason: 'No longer needed',
    }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe('Cancelled');
    expect(r.value.cancelReason).toBe('No longer needed');
  });

  it('restarts a cancelled instance', async () => {
    const instId = await startInstance();
    await cancelWorkflowInstanceUseCase({ ...baseInput, instanceId: instId }, deps);
    const r = await restartWorkflowUseCase({ ...baseInput, instanceId: instId }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe('Active');
    expect(r.value.retryCount).toBe(1);
  });

  it('rejects restart from Active', async () => {
    const instId = await startInstance();
    const r = await restartWorkflowUseCase({ ...baseInput, instanceId: instId }, deps);
    expect(r.ok).toBe(false);
  });

  it('gets an instance', async () => {
    const instId = await startInstance();
    const r = await getWorkflowInstanceUseCase({ tenantId: 't-1', instanceId: instId }, deps);
    expect(r.ok).toBe(true);
    expect(r.ok && r.value).not.toBeNull();
  });

  it('lists instances by workflow', async () => {
    await startInstance();
    await startInstance();
    const r = await listWorkflowInstancesUseCase({ tenantId: 't-1', workflowId: wfId }, deps);
    expect(r.ok && r.value.total).toBe(2);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// STATE TRANSITION
// ════════════════════════════════════════════════════════════════════════════

describe('State Transition', () => {
  let deps: ReturnType<typeof makeDeps>;
  let instId: string;

  beforeEach(async () => {
    deps = makeDeps();
    const wfId = await createStandardWorkflow(deps);
    await deps.workflowRepo.update('t-1', wfId, { status: 'Active' });
    const r = await startWorkflowUseCase({
      tenantId: 't-1', correlationId: 'corr-1', actorId: 'user-1',
      workflowId: wfId, initiatedBy: 'user-1',
    }, deps);
    instId = r.ok ? r.value.instanceId : '';
  });

  it('transitions submitted → reviewed', async () => {
    const r = await transitionUseCase({
      ...baseInput, instanceId: instId, toState: 'reviewed',
    }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.currentState).toBe('reviewed');
    expect(r.value.previousState).toBe('submitted');
  });

  it('rejects undefined state transition', async () => {
    const r = await transitionUseCase({
      ...baseInput, instanceId: instId, toState: 'done',
    }, deps);
    expect(r.ok).toBe(false);
  });

  it('completes instance on reaching last state', async () => {
    await transitionUseCase({ ...baseInput, instanceId: instId, toState: 'reviewed' }, deps);
    const r = await transitionUseCase({ ...baseInput, instanceId: instId, toState: 'done' }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe('Completed');
    expect(r.value.completedAt).not.toBeNull();
  });

  it('emits workflow.transitioned event', async () => {
    await transitionUseCase({ ...baseInput, instanceId: instId, toState: 'reviewed' }, deps);
    expect(deps.eventBus.countByType('workflow.transitioned')).toBe(1);
  });

  it('rolls back to previous state', async () => {
    await transitionUseCase({ ...baseInput, instanceId: instId, toState: 'reviewed' }, deps);
    const r = await rollbackUseCase({ ...baseInput, instanceId: instId }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.currentState).toBe('submitted');
  });

  it('rejects transition on cancelled instance', async () => {
    await cancelWorkflowInstanceUseCase({ ...baseInput, instanceId: instId }, deps);
    const r = await transitionUseCase({ ...baseInput, instanceId: instId, toState: 'reviewed' }, deps);
    expect(r.ok).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// APPROVAL FLOW
// ════════════════════════════════════════════════════════════════════════════

describe('Approval Flow', () => {
  let deps: ReturnType<typeof makeDeps>;
  let instId: string;

  beforeEach(async () => {
    deps = makeDeps();
    const wfId = await createStandardWorkflow(deps);
    await deps.workflowRepo.update('t-1', wfId, { status: 'Active' });
    const r = await startWorkflowUseCase({
      tenantId: 't-1', correlationId: 'corr-1', actorId: 'user-1',
      workflowId: wfId, initiatedBy: 'user-1',
    }, deps);
    instId = r.ok ? r.value.instanceId : '';
    // Create a pending approval step
    const stepId = deps.idGenerator.generate();
    const now = deps.clock.now().toISOString();
    await deps.approvalRepo.insert({
      id: stepId, tenantId: 't-1', instanceId: instId,
      stepName: 'manager-review', approverRole: 'manager', sequence: 1,
      status: 'Pending', approverId: null,
      approvedAt: null, rejectedAt: null, skippedAt: null, expiredAt: null,
      reason: null, metadata: {}, createdAt: now, updatedAt: now,
    });
  });

  it('approves a step', async () => {
    const r = await approveUseCase({
      ...baseInput, instanceId: instId, stepName: 'manager-review',
      approverId: 'approver-1', reason: 'Looks good',
    }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe('Approved');
    expect(r.value.approverId).toBe('approver-1');
  });

  it('rejects a step and fails instance', async () => {
    const r = await rejectUseCase({
      ...baseInput, instanceId: instId, stepName: 'manager-review',
      approverId: 'approver-1', reason: 'Insufficient data',
    }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe('Rejected');

    const inst = await deps.instanceRepo.findById('t-1', instId);
    expect(inst!.status).toBe('Failed');
  });

  it('skips a step', async () => {
    const r = await skipUseCase({
      ...baseInput, instanceId: instId, stepName: 'manager-review',
      reason: 'Auto-skipped',
    }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe('Skipped');
  });

  it('rejects double approval', async () => {
    await approveUseCase({
      ...baseInput, instanceId: instId, stepName: 'manager-review',
      approverId: 'approver-1',
    }, deps);
    const r = await approveUseCase({
      ...baseInput, instanceId: instId, stepName: 'manager-review',
      approverId: 'approver-1',
    }, deps);
    expect(r.ok).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// RETRY (on Failed instances)
// ════════════════════════════════════════════════════════════════════════════

describe('Retry', () => {
  let deps: ReturnType<typeof makeDeps>;
  let instId: string;

  beforeEach(async () => {
    deps = makeDeps();
    const wfId = await createStandardWorkflow(deps);
    await deps.workflowRepo.update('t-1', wfId, { status: 'Active' });
    const r = await startWorkflowUseCase({
      tenantId: 't-1', correlationId: 'corr-1', actorId: 'user-1',
      workflowId: wfId, initiatedBy: 'user-1',
    }, deps);
    instId = r.ok ? r.value.instanceId : '';
    // Fail the instance
    await deps.instanceRepo.update('t-1', instId, { status: 'Failed', failedAt: deps.clock.now().toISOString() });
  });

  it('retries a failed instance', async () => {
    const r = await retryUseCase({ ...baseInput, instanceId: instId }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe('Active');
    expect(r.value.retryCount).toBe(1);
  });

  it('rejects retry from Active', async () => {
    // First retry succeeds
    await retryUseCase({ ...baseInput, instanceId: instId }, deps);
    // Second retry from Active should fail
    const r = await retryUseCase({ ...baseInput, instanceId: instId }, deps);
    expect(r.ok).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TASK LIFECYCLE
// ════════════════════════════════════════════════════════════════════════════

describe('Task Lifecycle', () => {
  let deps: ReturnType<typeof makeDeps>;
  let instId: string;
  let wfId: string;

  beforeEach(async () => {
    deps = makeDeps();
    wfId = await createStandardWorkflow(deps);
    await deps.workflowRepo.update('t-1', wfId, { status: 'Active' });
    const r = await startWorkflowUseCase({
      tenantId: 't-1', correlationId: 'corr-1', actorId: 'user-1',
      workflowId: wfId, initiatedBy: 'user-1',
    }, deps);
    instId = r.ok ? r.value.instanceId : '';
  });

  it('creates a task', async () => {
    const r = await createTaskUseCase({
      ...baseInput, instanceId: instId, workflowId: wfId,
      title: 'Review document', priority: 'High',
    }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.title).toBe('Review document');
    expect(r.value.status).toBe('Pending');
  });

  it('creates a task with assignee (status: Assigned)', async () => {
    const r = await createTaskUseCase({
      ...baseInput, instanceId: instId, workflowId: wfId,
      title: 'Sign doc', assigneeId: 'user-2',
    }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe('Assigned');
    expect(r.value.assigneeId).toBe('user-2');
  });

  it('assigns a task', async () => {
    const tr = await createTaskUseCase({ ...baseInput, instanceId: instId, workflowId: wfId, title: 'T1' }, deps);
    const taskId = tr.ok ? tr.value.id : '';
    const r = await assignTaskUseCase({ ...baseInput, taskId, assigneeId: 'user-2' }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.assigneeId).toBe('user-2');
    expect(r.value.status).toBe('Assigned');
  });

  it('completes a task', async () => {
    const tr = await createTaskUseCase({ ...baseInput, instanceId: instId, workflowId: wfId, title: 'T1' }, deps);
    const taskId = tr.ok ? tr.value.id : '';
    const r = await completeTaskUseCase({ ...baseInput, taskId }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe('Completed');
  });

  it('cancels a task', async () => {
    const tr = await createTaskUseCase({ ...baseInput, instanceId: instId, workflowId: wfId, title: 'T1' }, deps);
    const taskId = tr.ok ? tr.value.id : '';
    const r = await cancelTaskUseCase({ ...baseInput, taskId, reason: 'Obsolete' }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe('Cancelled');
  });

  it('reassigns a task', async () => {
    const tr = await createTaskUseCase({ ...baseInput, instanceId: instId, workflowId: wfId, title: 'T1', assigneeId: 'user-2' }, deps);
    const taskId = tr.ok ? tr.value.id : '';
    const r = await reassignTaskUseCase({ ...baseInput, taskId, assigneeId: 'approver-1' }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.assigneeId).toBe('approver-1');
  });

  it('rejects complete on cancelled task', async () => {
    const tr = await createTaskUseCase({ ...baseInput, instanceId: instId, workflowId: wfId, title: 'T1' }, deps);
    const taskId = tr.ok ? tr.value.id : '';
    await cancelTaskUseCase({ ...baseInput, taskId }, deps);
    const r = await completeTaskUseCase({ ...baseInput, taskId }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects assignee not found', async () => {
    const tr = await createTaskUseCase({ ...baseInput, instanceId: instId, workflowId: wfId, title: 'T1' }, deps);
    const taskId = tr.ok ? tr.value.id : '';
    const r = await assignTaskUseCase({ ...baseInput, taskId, assigneeId: 'unknown-user' }, deps);
    expect(r.ok).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TIMER
// ════════════════════════════════════════════════════════════════════════════

describe('Timer', () => {
  let deps: ReturnType<typeof makeDeps>;
  let instId: string;

  beforeEach(async () => {
    deps = makeDeps();
    const wfId = await createStandardWorkflow(deps);
    await deps.workflowRepo.update('t-1', wfId, { status: 'Active' });
    const r = await startWorkflowUseCase({
      tenantId: 't-1', correlationId: 'corr-1', actorId: 'user-1',
      workflowId: wfId, initiatedBy: 'user-1',
    }, deps);
    instId = r.ok ? r.value.instanceId : '';
  });

  it('schedules a timer', async () => {
    const r = await scheduleTimerUseCase({
      ...baseInput, instanceId: instId, name: 'deadline-1',
      type: 'Deadline', ttlSeconds: 3600,
    }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe('Scheduled');
    expect(r.value.fireAt).toBeTruthy();
  });

  it('cancels a timer', async () => {
    const tr = await scheduleTimerUseCase({
      ...baseInput, instanceId: instId, name: 'reminder-1',
      type: 'Reminder', ttlSeconds: 1800,
    }, deps);
    const timerId = tr.ok ? tr.value.id : '';
    const r = await cancelTimerUseCase({ ...baseInput, timerId }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe('Cancelled');
  });

  it('rejects cancel on non-scheduled timer', async () => {
    const tr = await scheduleTimerUseCase({
      ...baseInput, instanceId: instId, name: 'timeout-1',
      type: 'Timeout', ttlSeconds: 600,
    }, deps);
    const timerId = tr.ok ? tr.value.id : '';
    await cancelTimerUseCase({ ...baseInput, timerId }, deps);
    const r = await cancelTimerUseCase({ ...baseInput, timerId }, deps);
    expect(r.ok).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// HISTORY + TIMELINE + REFERENCES
// ════════════════════════════════════════════════════════════════════════════

describe('History + Timeline + References', () => {
  let deps: ReturnType<typeof makeDeps>;
  let instId: string;

  beforeEach(async () => {
    deps = makeDeps();
    const wfId = await createStandardWorkflow(deps);
    await deps.workflowRepo.update('t-1', wfId, { status: 'Active' });
    const r = await startWorkflowUseCase({
      tenantId: 't-1', correlationId: 'corr-1', actorId: 'user-1',
      workflowId: wfId, initiatedBy: 'user-1',
    }, deps);
    instId = r.ok ? r.value.instanceId : '';
  });

  it('records history on transition', async () => {
    await transitionUseCase({ ...baseInput, instanceId: instId, toState: 'reviewed' }, deps);
    const r = await getHistoryUseCase({ tenantId: 't-1', instanceId: instId }, deps);
    expect(r.ok && r.value.length).toBe(2); // started + transitioned
  });

  it('records timeline entries', async () => {
    await appendTimelineUseCase({
      ...baseInput, instanceId: instId,
      eventType: 'note', description: 'Manual note added',
    }, deps);
    const r = await getTimelineUseCase({ tenantId: 't-1', instanceId: instId }, deps);
    expect(r.ok && r.value.length).toBeGreaterThanOrEqual(1);
  });

  it('attaches a reference', async () => {
    const r = await attachReferenceUseCase({
      ...baseInput, instanceId: instId,
      refType: 'external-system', refId: 'ext-123',
    }, deps);
    expect(r.ok).toBe(true);
    const inst = await deps.instanceRepo.findById('t-1', instId);
    expect(inst!.references.length).toBe(1);
    expect(inst!.references[0]!.refId).toBe('ext-123');
  });

  it('deduplicates references', async () => {
    await attachReferenceUseCase({ ...baseInput, instanceId: instId, refType: 'doc', refId: 'd-1' }, deps);
    await attachReferenceUseCase({ ...baseInput, instanceId: instId, refType: 'doc', refId: 'd-1' }, deps);
    const inst = await deps.instanceRepo.findById('t-1', instId);
    expect(inst!.references.length).toBe(1);
  });
});
