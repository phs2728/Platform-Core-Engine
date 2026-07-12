/**
 * Test fixtures — Payment Engine
 */

import type { PaymentUseCaseDeps } from '../src/use-cases/types.js';
import {
  InMemoryPaymentRepository, InMemoryTransactionRepository,
  InMemoryRefundRepository, InMemoryInvoiceRepository,
  InMemoryReceiptRepository, InMemorySettlementRepository,
  InMemoryWebhookRepository, InMemoryPaymentMethodRepository,
  InMemoryReconciliationRepository, InMemoryPaymentAuditRepository,
  InMemoryOrganizationVerifier, InMemoryUserVerifier,
  StaticPaymentPolicyProvider,
  MockPaymentProvider, InMemoryPaymentProviderResolver,
  InMemoryEventBus,
} from '../src/index.js';

export function makeClock() {
  let offset = 0;
  const base = new Date('2026-07-11T08:00:00.000Z');
  return { now: () => new Date(base.getTime() + offset++ * 1000) };
}

export function makeDeps(): PaymentUseCaseDeps & {
  paymentRepo: InMemoryPaymentRepository;
  transactionRepo: InMemoryTransactionRepository;
  refundRepo: InMemoryRefundRepository;
  invoiceRepo: InMemoryInvoiceRepository;
  receiptRepo: InMemoryReceiptRepository;
  settlementRepo: InMemorySettlementRepository;
  webhookRepo: InMemoryWebhookRepository;
  paymentMethodRepo: InMemoryPaymentMethodRepository;
  reconciliationRepo: InMemoryReconciliationRepository;
  auditRepo: InMemoryPaymentAuditRepository;
  organizationVerifier: InMemoryOrganizationVerifier;
  userVerifier: InMemoryUserVerifier;
  policyProvider: StaticPaymentPolicyProvider;
  providerResolver: InMemoryPaymentProviderResolver;
  mockProvider: MockPaymentProvider;
  eventBus: InMemoryEventBus;
  idGenerator: { generate(): string };
  clock: { now(): Date };
} {
  const paymentRepo = new InMemoryPaymentRepository();
  const transactionRepo = new InMemoryTransactionRepository();
  const refundRepo = new InMemoryRefundRepository();
  const invoiceRepo = new InMemoryInvoiceRepository();
  const receiptRepo = new InMemoryReceiptRepository();
  const settlementRepo = new InMemorySettlementRepository();
  const webhookRepo = new InMemoryWebhookRepository();
  const paymentMethodRepo = new InMemoryPaymentMethodRepository();
  const reconciliationRepo = new InMemoryReconciliationRepository();
  const auditRepo = new InMemoryPaymentAuditRepository();
  const eventBus = new InMemoryEventBus();
  const organizationVerifier = new InMemoryOrganizationVerifier();
  const userVerifier = new InMemoryUserVerifier();
  const policyProvider = new StaticPaymentPolicyProvider();

  policyProvider.set('t-1', {
    allowedTypes: ['one-time', 'recurring', 'installment'],
    maxPaymentsPerOrg: 10000,
    defaultCurrency: 'USD',
    defaultTaxRate: 0,
  });

  organizationVerifier.add('t-1', 'org-1');
  userVerifier.add('t-1', 'user-1');
  userVerifier.add('t-1', 'user-2');

  const mockProvider = new MockPaymentProvider('mock-provider', 'card');
  mockProvider.addValidSignature('valid-sig-123');
  const providerResolver = new InMemoryPaymentProviderResolver();
  providerResolver.setDefault(mockProvider);

  let idCounter = 0;
  const idGenerator = {
    generate(): string {
      idCounter += 1;
      return `id-${Date.now()}-${idCounter}-${Math.floor(Math.random() * 1e6).toString(36)}`;
    },
  };

  return {
    paymentRepo, transactionRepo, refundRepo, invoiceRepo,
    receiptRepo, settlementRepo, webhookRepo, paymentMethodRepo,
    reconciliationRepo, auditRepo, eventBus,
    organizationVerifier, userVerifier, policyProvider,
    providerResolver, mockProvider,
    idGenerator, clock: makeClock(),
  };
}

const baseInput = {
  tenantId: 't-1', correlationId: 'corr-1', actorId: 'user-1', organizationId: 'org-1',
};

/**
 * Creates a payment and returns its ID.
 */
export async function createTestPayment(
  deps: ReturnType<typeof makeDeps>,
  overrides?: Partial<{ amount: number; type: string; providerId: string }>,
): Promise<string> {
  const r = await createPaymentUseCaseRef({
    ...baseInput,
    type: overrides?.type ?? 'one-time',
    description: 'Test payment',
    amount: overrides?.amount ?? 100,
    currency: 'USD',
    providerId: overrides?.providerId ?? 'mock-provider',
  }, deps);
  if (!r.ok) throw new Error('Failed to create test payment');
  return r.value.paymentId;
}

import { createPaymentUseCase as createPaymentUseCaseRef } from '../src/index.js';
