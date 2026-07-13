/** Example helpers — Agency OS */
import type { AgencyUseCaseDeps } from '../src/index.js';
import {
  InMemoryWorkflowRepository, InMemorySwarmRepository, InMemoryTaskRepository,
  InMemoryDebateRepository, InMemoryExecutiveDecisionRepository,
  InMemoryExecutiveMemoryRepository, InMemoryAgencyAuditRepository,
  InMemoryOrganizationVerifier, InMemoryEventBus,
  MockSwarmExecutor, MockDebateResolver,
} from '../src/index.js';
import type { Result } from '../src/index.js';

export function makeDemoDeps(): AgencyUseCaseDeps {
  const organizationVerifier = new InMemoryOrganizationVerifier();
  organizationVerifier.add('demo', 'org-demo');
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
    idGenerator: { generate: () => `demo-${Date.now()}-${++idCounter}-${Math.floor(Math.random() * 1e6).toString(36)}` },
    clock: { now: () => new Date('2026-07-13T08:00:00.000Z') },
  };
}

export function unwrap<T>(r: Result<T, Error>): T {
  if (!r.ok) throw new Error(`Expected Ok: ${JSON.stringify(r.error)}`);
  return r.value;
}

export const base = {
  tenantId: 'demo',
  organizationId: 'org-demo',
  correlationId: 'demo-agency',
  actorId: 'demo-user',
};