/** Test fixtures — Agency OS */
import type { AgencyUseCaseDeps } from '../src/index.js';
import {
  InMemoryWorkflowRepository, InMemorySwarmRepository, InMemoryTaskRepository,
  InMemoryDebateRepository, InMemoryExecutiveDecisionRepository,
  InMemoryExecutiveMemoryRepository, InMemoryAgencyAuditRepository,
  InMemoryOrganizationVerifier, InMemoryEventBus,
  MockSwarmExecutor, MockDebateResolver,
} from '../src/index.js';

export function makeClock() {
  let o = 0;
  return { now: () => new Date(new Date('2026-07-13T08:00:00.000Z').getTime() + o++ * 1000) };
}

export function makeDeps(): AgencyUseCaseDeps & {
  workflowRepo: InMemoryWorkflowRepository;
  swarmRepo: InMemorySwarmRepository;
  taskRepo: InMemoryTaskRepository;
  debateRepo: InMemoryDebateRepository;
  decisionRepo: InMemoryExecutiveDecisionRepository;
  memoryRepo: InMemoryExecutiveMemoryRepository;
  auditRepo: InMemoryAgencyAuditRepository;
  eventBus: InMemoryEventBus;
  organizationVerifier: InMemoryOrganizationVerifier;
  swarmExecutor: MockSwarmExecutor;
  debateResolver: MockDebateResolver;
} {
  const organizationVerifier = new InMemoryOrganizationVerifier();
  organizationVerifier.add('t-1', 'org-1');
  let idCounter = 0;
  return {
    workflowRepo: new InMemoryWorkflowRepository(),
    swarmRepo: new InMemorySwarmRepository(),
    taskRepo: new InMemoryTaskRepository(),
    debateRepo: new InMemoryDebateRepository(),
    decisionRepo: new InMemoryExecutiveDecisionRepository(),
    memoryRepo: new InMemoryExecutiveMemoryRepository(),
    auditRepo: new InMemoryAgencyAuditRepository(),
    eventBus: new InMemoryEventBus(),
    organizationVerifier,
    swarmExecutor: new MockSwarmExecutor(),
    debateResolver: new MockDebateResolver(),
    idGenerator: { generate: () => `id-${Date.now()}-${++idCounter}-${Math.floor(Math.random() * 1e6).toString(36)}` },
    clock: makeClock(),
  } as ReturnType<typeof makeDeps>;
}

export const baseInput = {
  tenantId: 't-1',
  organizationId: 'org-1',
  correlationId: 'corr-1',
  actorId: 'user-1',
};

export function unwrap<T>(r: { ok: boolean; value?: T; error?: unknown }): T {
  if (!r.ok) throw new Error(`Expected Ok but got Err: ${JSON.stringify(r.error)}`);
  return r.value!;
}