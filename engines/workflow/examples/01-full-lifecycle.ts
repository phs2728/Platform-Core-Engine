/**
 * Workflow Engine — Full Lifecycle Example
 *
 * Creates a workflow, activates it, starts an instance,
 * transitions through states, creates a task, schedules a timer,
 * completes the instance, and queries history/timeline.
 *
 * Run via: pnpm example-test
 */

import {
  createWorkflowUseCase, updateWorkflowUseCase,
  archiveWorkflowUseCase, restoreWorkflowUseCase,
  getWorkflowUseCase, searchWorkflowsUseCase,
  startWorkflowUseCase, cancelWorkflowInstanceUseCase,
  restartWorkflowUseCase,
  transitionUseCase, rollbackUseCase, retryUseCase,
  createTaskUseCase, assignTaskUseCase, completeTaskUseCase,
  scheduleTimerUseCase,
  getHistoryUseCase, getTimelineUseCase,
  attachReferenceUseCase,
  InMemoryWorkflowRepository, InMemoryWorkflowInstanceRepository,
  InMemoryApprovalStepRepository, InMemoryTaskRepository,
  InMemoryTimerRepository, InMemoryHistoryRepository,
  InMemoryTimelineRepository, InMemoryWorkflowAuditRepository,
  InMemoryOrganizationVerifier, InMemoryUserVerifier, InMemoryIdentityVerifier,
  StaticWorkflowPolicyProvider, InMemoryEventBus,
} from '../src/index.js';
import type { WorkflowUseCaseDeps } from '../src/use-cases/types.js';

async function main(): Promise<void> {
  // ── Setup deps ──────────────────────────
  const workflowRepo = new InMemoryWorkflowRepository();
  const instanceRepo = new InMemoryWorkflowInstanceRepository();
  const approvalRepo = new InMemoryApprovalStepRepository();
  const taskRepo = new InMemoryTaskRepository();
  const timerRepo = new InMemoryTimerRepository();
  const historyRepo = new InMemoryHistoryRepository();
  const timelineRepo = new InMemoryTimelineRepository();
  const auditRepo = new InMemoryWorkflowAuditRepository();
  const eventBus = new InMemoryEventBus();
  const organizationVerifier = new InMemoryOrganizationVerifier();
  const userVerifier = new InMemoryUserVerifier();
  const identityVerifier = new InMemoryIdentityVerifier();
  const policyProvider = new StaticWorkflowPolicyProvider();

  policyProvider.set('t-1', {
    allowedTypes: ['approval', 'sequential', 'parallel'],
    maxWorkflowsPerOrg: 500,
    defaultSlaMinutes: 1440,
    defaultTimerTtlSeconds: 3600,
  });
  organizationVerifier.add('t-1', 'org-1');
  userVerifier.add('t-1', 'user-1');
  userVerifier.add('t-1', 'user-2');
  identityVerifier.add('t-1', 'identity-1');

  let idCounter = 0;
  const deps: WorkflowUseCaseDeps = {
    workflowRepo, instanceRepo, approvalRepo, taskRepo, timerRepo,
    historyRepo, timelineRepo, auditRepo, eventBus,
    organizationVerifier, userVerifier, identityVerifier, policyProvider,
    idGenerator: { generate: () => `id-${Date.now()}-${++idCounter}-${Math.floor(Math.random() * 1e6).toString(36)}` },
    clock: { now: () => new Date() },
  };

  const base = { tenantId: 't-1', correlationId: 'corr-1', actorId: 'user-1', organizationId: 'org-1' };

  // ── 1. Create Workflow ──────────────────
  console.log('1. Creating workflow...');
  const cr = await createWorkflowUseCase({
    ...base, name: 'Document Approval Process', slug: 'doc-approval', type: 'approval',
    description: 'A 3-state approval workflow for documents',
    states: ['submitted', 'under-review', 'approved'],
    initialState: 'submitted',
    transitions: [
      { fromState: 'submitted', toState: 'under-review' },
      { fromState: 'under-review', toState: 'approved' },
      { fromState: 'under-review', toState: 'submitted' },
    ],
    tags: ['documentation', 'internal'],
  }, deps);
  if (!cr.ok) throw new Error('Create failed');
  const wfId = cr.value.workflowId;
  console.log(`   ✓ Workflow created: ${wfId}`);

  // ── 2. Update Workflow ─────────────────
  console.log('2. Updating workflow...');
  await updateWorkflowUseCase({ ...base, workflowId: wfId, description: 'Updated description' }, deps);
  console.log('   ✓ Workflow updated');

  // ── 3. Search ──────────────────────────
  console.log('3. Searching workflows...');
  const sr = await searchWorkflowsUseCase({ tenantId: 't-1', query: 'Document' }, deps);
  console.log(`   ✓ Found ${sr.ok ? sr.value.total : 0} workflow(s)`);

  // ── 4. Archive + Restore ───────────────
  console.log('4. Archive + restore...');
  await archiveWorkflowUseCase({ ...base, workflowId: wfId }, deps);
  await restoreWorkflowUseCase({ ...base, workflowId: wfId }, deps);
  console.log('   ✓ Archived and restored');

  // ── 5. Activate (publish) ──────────────
  console.log('5. Activating workflow...');
  await workflowRepo.update('t-1', wfId, { status: 'Active' });
  console.log('   ✓ Workflow activated');

  // ── 6. Start Instance ──────────────────
  console.log('6. Starting instance...');
  const ir = await startWorkflowUseCase({
    tenantId: 't-1', correlationId: 'corr-2', actorId: 'user-1',
    workflowId: wfId, initiatedBy: 'user-1',
    variables: { documentId: 'doc-001' },
  }, deps);
  if (!ir.ok) throw new Error('Start failed');
  const instId = ir.value.instanceId;
  console.log(`   ✓ Instance started: ${ir.value.instanceNumber} (state: ${ir.value.initialState})`);

  // ── 7. Attach reference ────────────────
  console.log('7. Attaching external reference...');
  await attachReferenceUseCase({ ...base, instanceId: instId, refType: 'document', refId: 'doc-001' }, deps);
  console.log('   ✓ Reference attached');

  // ── 8. Create + assign task ────────────
  console.log('8. Creating task...');
  const tr = await createTaskUseCase({
    ...base, instanceId: instId, workflowId: wfId,
    title: 'Review document', priority: 'High',
  }, deps);
  if (!tr.ok) throw new Error('Task create failed');
  const taskId = tr.value.id;
  await assignTaskUseCase({ ...base, taskId, assigneeId: 'user-2' }, deps);
  console.log('   ✓ Task created and assigned to user-2');

  // ── 9. Schedule timer ──────────────────
  console.log('9. Scheduling timer...');
  await scheduleTimerUseCase({
    ...base, instanceId: instId,
    name: 'review-deadline', type: 'Deadline', ttlSeconds: 86400,
  }, deps);
  console.log('   ✓ Timer scheduled (24h)');

  // ── 10. Transition: submitted → under-review ──
  console.log('10. Transitioning: submitted → under-review...');
  await transitionUseCase({ ...base, instanceId: instId, toState: 'under-review' }, deps);
  console.log('    ✓ State changed to under-review');

  // ── 11. Rollback ───────────────────────
  console.log('11. Rolling back...');
  await rollbackUseCase({ ...base, instanceId: instId }, deps);
  const afterRollback = await instanceRepo.findById('t-1', instId);
  console.log(`    ✓ Rolled back to: ${afterRollback!.currentState}`);

  // ── 12. Transition to completion ───────
  console.log('12. Completing workflow...');
  await transitionUseCase({ ...base, instanceId: instId, toState: 'under-review' }, deps);
  await transitionUseCase({ ...base, instanceId: instId, toState: 'approved' }, deps);
  const finalInst = await instanceRepo.findById('t-1', instId);
  console.log(`    ✓ Final state: ${finalInst!.currentState}, status: ${finalInst!.status}`);

  // ── 13. Complete task ──────────────────
  console.log('13. Completing task...');
  await completeTaskUseCase({ ...base, taskId }, deps);
  console.log('    ✓ Task completed');

  // ── 14. Query history + timeline ───────
  console.log('14. Querying history...');
  const hr = await getHistoryUseCase({ tenantId: 't-1', instanceId: instId }, deps);
  if (hr.ok) {
    console.log(`    ✓ History entries: ${hr.value.length}`);
    for (const h of hr.value) {
      console.log(`      [${h.sequenceNumber}] ${h.eventType}: ${h.fromState ?? '∅'} → ${h.toState}`);
    }
  }
  const tl = await getTimelineUseCase({ tenantId: 't-1', instanceId: instId }, deps);
  if (tl.ok) {
    console.log(`    ✓ Timeline entries: ${tl.value.length}`);
  }

  console.log('\n=== Full lifecycle complete ===');
  console.log(`Events emitted: ${eventBus.emitted.length}`);
  console.log(`Audit records: ${(await auditRepo.findByTenant('t-1')).length}`);
}

main().catch((err) => {
  console.error('Example failed:', err);
  process.exit(1);
});
