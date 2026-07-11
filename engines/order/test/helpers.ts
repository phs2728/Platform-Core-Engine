/**
 * Test fixtures — Order Engine
 */
import type { OrderUseCaseDeps } from '../src/use-cases/types.js';
import {
  InMemoryOrderRepository, InMemoryOrderItemRepository,
  InMemoryOrderTimelineRepository, InMemoryOrderApprovalRepository,
  InMemoryOrderAuditRepository,
  InMemoryOrganizationVerifier,
  StaticOrderPolicyProvider, InMemoryEventBus,
} from '../src/index.js';

export function makeClock() {
  let o = 0;
  return { now: () => new Date(new Date('2026-07-11T08:00:00.000Z').getTime() + o++ * 1000) };
}

export function makeDeps(): OrderUseCaseDeps & {
  orderRepo: InMemoryOrderRepository;
  itemRepo: InMemoryOrderItemRepository;
  timelineRepo: InMemoryOrderTimelineRepository;
  approvalRepo: InMemoryOrderApprovalRepository;
  auditRepo: InMemoryOrderAuditRepository;
  organizationVerifier: InMemoryOrganizationVerifier;
  policyProvider: StaticOrderPolicyProvider;
  eventBus: InMemoryEventBus;
  idGenerator: { generate(): string };
  clock: { now(): Date };
} {
  const orderRepo = new InMemoryOrderRepository();
  const itemRepo = new InMemoryOrderItemRepository();
  const timelineRepo = new InMemoryOrderTimelineRepository();
  const approvalRepo = new InMemoryOrderApprovalRepository();
  const auditRepo = new InMemoryOrderAuditRepository();
  const eventBus = new InMemoryEventBus();
  const organizationVerifier = new InMemoryOrganizationVerifier();
  const policyProvider = new StaticOrderPolicyProvider();
  policyProvider.set('t-1', { allowedTypes: ['standard', 'group', 'service'] });
  organizationVerifier.add('t-1', 'org-1');

  let idCounter = 0;
  return {
    orderRepo, itemRepo, timelineRepo, approvalRepo, auditRepo, eventBus,
    organizationVerifier, policyProvider,
    idGenerator: { generate: () => `id-${Date.now()}-${++idCounter}-${Math.floor(Math.random()*1e6).toString(36)}` },
    clock: makeClock(),
  };
}
