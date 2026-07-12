/**
 * Test fixtures — Workflow Engine
 */

import type { WorkflowUseCaseDeps } from '../src/use-cases/types.js';
import {
  InMemoryWorkflowRepository,
  InMemoryWorkflowInstanceRepository,
  InMemoryApprovalStepRepository,
  InMemoryTaskRepository,
  InMemoryTimerRepository,
  InMemoryHistoryRepository,
  InMemoryTimelineRepository,
  InMemoryWorkflowAuditRepository,
  InMemoryOrganizationVerifier,
  InMemoryUserVerifier,
  InMemoryIdentityVerifier,
  StaticWorkflowPolicyProvider,
  InMemoryEventBus,
} from '../src/index.js';

export function makeClock() {
  let offset = 0;
  const base = new Date('2026-07-11T08:00:00.000Z');
  return { now: () => new Date(base.getTime() + offset++ * 1000) };
}

export function makeDeps(): WorkflowUseCaseDeps & {
  workflowRepo: InMemoryWorkflowRepository;
  instanceRepo: InMemoryWorkflowInstanceRepository;
  approvalRepo: InMemoryApprovalStepRepository;
  taskRepo: InMemoryTaskRepository;
  timerRepo: InMemoryTimerRepository;
  historyRepo: InMemoryHistoryRepository;
  timelineRepo: InMemoryTimelineRepository;
  auditRepo: InMemoryWorkflowAuditRepository;
  organizationVerifier: InMemoryOrganizationVerifier;
  userVerifier: InMemoryUserVerifier;
  identityVerifier: InMemoryIdentityVerifier;
  policyProvider: StaticWorkflowPolicyProvider;
  eventBus: InMemoryEventBus;
  idGenerator: { generate(): string };
  clock: { now(): Date };
} {
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
    allowedTypes: ['approval', 'sequential', 'parallel', 'default'],
    maxWorkflowsPerOrg: 500,
    defaultSlaMinutes: 1440,
    defaultTimerTtlSeconds: 3600,
  });

  organizationVerifier.add('t-1', 'org-1');
  userVerifier.add('t-1', 'user-1');
  userVerifier.add('t-1', 'user-2');
  userVerifier.add('t-1', 'approver-1');
  identityVerifier.add('t-1', 'identity-1');

  let idCounter = 0;
  const idGenerator = {
    generate(): string {
      idCounter += 1;
      return `id-${Date.now()}-${idCounter}-${Math.floor(Math.random() * 1e6).toString(36)}`;
    },
  };

  return {
    workflowRepo, instanceRepo, approvalRepo, taskRepo, timerRepo,
    historyRepo, timelineRepo, auditRepo, eventBus,
    organizationVerifier, userVerifier, identityVerifier,
    policyProvider, idGenerator, clock: makeClock(),
  };
}

/**
 * Standard 3-state workflow definition used across tests:
 *   submitted → reviewed → done
 */
export const STANDARD_STATES = ['submitted', 'reviewed', 'done'] as const;
export const STANDARD_TRANSITIONS = [
  { fromState: 'submitted', toState: 'reviewed' },
  { fromState: 'reviewed', toState: 'done' },
  { fromState: 'reviewed', toState: 'submitted' },
];

export async function createStandardWorkflow(
  deps: ReturnType<typeof makeDeps>,
  overrides?: Partial<{ name: string; slug: string; type: string; organizationId: string; actorId: string }>,
): Promise<string> {
  const result = await createWorkflowUseCaseRef({
    tenantId: 't-1',
    correlationId: 'corr-1',
    actorId: overrides?.actorId ?? 'user-1',
    organizationId: overrides?.organizationId ?? 'org-1',
    name: overrides?.name ?? 'Alpha Process',
    slug: overrides?.slug ?? 'alpha-process',
    type: overrides?.type ?? 'sequential',
    states: [...STANDARD_STATES],
    initialState: 'submitted',
    transitions: STANDARD_TRANSITIONS,
  }, deps);
  if (!result.ok) throw new Error('Failed to create standard workflow');
  return result.value.workflowId;
}

// Lazy import to avoid circular — re-exported from index at runtime
import { createWorkflowUseCase as createWorkflowUseCaseRef } from '../src/index.js';
