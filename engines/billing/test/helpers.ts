/**
 * Test fixtures — Billing Engine
 */

import type { BillingUseCaseDeps } from '../src/use-cases/types.js';
import {
  InMemoryInvoiceRepository,
  InMemoryInvoiceLineRepository,
  InMemoryAdjustmentRepository,
  InMemoryCreditMemoRepository,
  InMemoryBillingTimelineRepository,
  InMemoryBillingAuditRepository,
  InMemoryOrganizationVerifier,
  StaticBillingPolicyProvider,
  InMemoryEventBus,
} from '../src/index.js';

export function makeClock() {
  let offset = 0;
  const base = new Date('2026-07-11T08:00:00.000Z');
  return { now: () => new Date(base.getTime() + offset++ * 1000) };
}

export function makeDeps(): BillingUseCaseDeps & {
  invoiceRepo: InMemoryInvoiceRepository;
  lineRepo: InMemoryInvoiceLineRepository;
  adjustmentRepo: InMemoryAdjustmentRepository;
  creditRepo: InMemoryCreditMemoRepository;
  timelineRepo: InMemoryBillingTimelineRepository;
  auditRepo: InMemoryBillingAuditRepository;
  organizationVerifier: InMemoryOrganizationVerifier;
  policyProvider: StaticBillingPolicyProvider;
  eventBus: InMemoryEventBus;
  idGenerator: { generate(): string };
  clock: { now(): Date };
} {
  const invoiceRepo = new InMemoryInvoiceRepository();
  const lineRepo = new InMemoryInvoiceLineRepository();
  const adjustmentRepo = new InMemoryAdjustmentRepository();
  const creditRepo = new InMemoryCreditMemoRepository();
  const timelineRepo = new InMemoryBillingTimelineRepository();
  const auditRepo = new InMemoryBillingAuditRepository();
  const eventBus = new InMemoryEventBus();
  const organizationVerifier = new InMemoryOrganizationVerifier();
  const policyProvider = new StaticBillingPolicyProvider();
  policyProvider.set('t-1', {
    allowedTypes: ['standard', 'recurring', 'one-time'],
    maxInvoicesPerOrg: 1000,
    defaultCurrency: 'USD',
    defaultDueDays: 30,
  });

  organizationVerifier.add('t-1', 'org-1');

  let idCounter = 0;
  const idGenerator = {
    generate(): string {
      idCounter += 1;
      return `id-${Date.now()}-${idCounter}-${Math.floor(Math.random() * 1e6).toString(36)}`;
    },
  };

  return {
    invoiceRepo, lineRepo, adjustmentRepo, creditRepo,
    timelineRepo, auditRepo, eventBus,
    organizationVerifier, policyProvider, idGenerator, clock: makeClock(),
  };
}
