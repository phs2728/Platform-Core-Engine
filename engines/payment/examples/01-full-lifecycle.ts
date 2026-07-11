/**
 * Payment Engine — Full Lifecycle Example
 *
 * Creates a payment, registers a payment method, authorizes,
 * captures, generates a receipt, creates a settlement, and runs reconciliation.
 *
 * Run via: pnpm example-test
 */

import {
  createPaymentUseCase, authorizePaymentUseCase, capturePaymentUseCase,
  refundPaymentUseCase, cancelPaymentUseCase,
  createInvoiceUseCase, issueInvoiceUseCase,
  generateReceiptUseCase,
  createSettlementUseCase, completeSettlementUseCase,
  registerPaymentMethodUseCase, listPaymentMethodsUseCase,
  runReconciliationUseCase,
  receiveWebhookUseCase,
  attachReferenceUseCase,
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
import type { PaymentUseCaseDeps } from '../src/use-cases/types.js';

async function main(): Promise<void> {
  // ── Setup deps ──────────────────────────
  const deps: PaymentUseCaseDeps = {
    paymentRepo: new InMemoryPaymentRepository(),
    transactionRepo: new InMemoryTransactionRepository(),
    refundRepo: new InMemoryRefundRepository(),
    invoiceRepo: new InMemoryInvoiceRepository(),
    receiptRepo: new InMemoryReceiptRepository(),
    settlementRepo: new InMemorySettlementRepository(),
    webhookRepo: new InMemoryWebhookRepository(),
    paymentMethodRepo: new InMemoryPaymentMethodRepository(),
    reconciliationRepo: new InMemoryReconciliationRepository(),
    auditRepo: new InMemoryPaymentAuditRepository(),
    eventBus: new InMemoryEventBus(),
    organizationVerifier: new InMemoryOrganizationVerifier(),
    userVerifier: new InMemoryUserVerifier(),
    policyProvider: new StaticPaymentPolicyProvider(),
    providerResolver: new InMemoryPaymentProviderResolver(),
    idGenerator: { generate: () => `id-${Date.now()}-${Math.floor(Math.random() * 1e6).toString(36)}` },
    clock: { now: () => new Date() },
  };

  deps.policyProvider.set('t-1', {
    allowedTypes: ['one-time', 'recurring', 'installment'],
    maxPaymentsPerOrg: 10000,
    defaultCurrency: 'USD',
    defaultTaxRate: 0,
  });
  (deps.organizationVerifier as InMemoryOrganizationVerifier).add('t-1', 'org-1');
  (deps.userVerifier as InMemoryUserVerifier).add('t-1', 'user-1');
  const mockProvider = new MockPaymentProvider('mock-provider', 'card');
  mockProvider.addValidSignature('valid-sig-123');
  (deps.providerResolver as InMemoryPaymentProviderResolver).setDefault(mockProvider);

  const base = { tenantId: 't-1', correlationId: 'corr-1', actorId: 'user-1', organizationId: 'org-1' };

  // ── 1. Register Payment Method ─────────
  console.log('1. Registering payment method...');
  const pmr = await registerPaymentMethodUseCase({
    ...base, ownerId: 'user-1',
    providerId: 'mock-provider', methodType: 'card',
    displayName: 'Visa ending 4242', token: 'tok_4242',
    last4: '4242', expiryMonth: 12, expiryYear: 2027, brand: 'visa',
    isDefault: true,
  }, deps);
  console.log(`   ✓ Method registered: ${pmr.ok ? pmr.value.displayName : 'FAILED'}`);

  // ── 2. Create Payment ─────────────────
  console.log('2. Creating payment...');
  const cpr = await createPaymentUseCase({
    ...base, type: 'one-time', description: 'Service fee',
    amount: 250, currency: 'USD', providerId: 'mock-provider',
    paymentMethodId: pmr.ok ? pmr.value.id : undefined,
    references: [{ refType: 'external-system', refId: 'ext-001' }],
  }, deps);
  if (!cpr.ok) throw new Error('Payment create failed');
  const payId = cpr.value.paymentId;
  console.log(`   ✓ Payment created: ${cpr.value.paymentNumber}`);

  // ── 3. Authorize ──────────────────────
  console.log('3. Authorizing...');
  const ar = await authorizePaymentUseCase({ ...base, paymentId: payId }, deps);
  console.log(`   ✓ Status: ${ar.ok ? ar.value.status : 'FAILED'}`);

  // ── 4. Capture ────────────────────────
  console.log('4. Capturing...');
  const cr = await capturePaymentUseCase({ ...base, paymentId: payId }, deps);
  console.log(`   ✓ Status: ${cr.ok ? cr.value.status : 'FAILED'}`);

  // ── 5. Generate Receipt ───────────────
  console.log('5. Generating receipt...');
  const rc = await generateReceiptUseCase({ ...base, paymentId: payId, format: 'PDF' }, deps);
  console.log(`   ✓ Receipt: ${rc.ok ? rc.value.receiptNumber : 'FAILED'}`);

  // ── 6. Create + Complete Settlement ───
  console.log('6. Settlement...');
  const txns = await deps.transactionRepo.findByPayment('t-1', payId);
  const stl = await createSettlementUseCase({
    ...base, providerId: 'mock-provider', currency: 'USD',
    grossAmount: 250, feeAmount: 7.25, netAmount: 242.75,
    transactionIds: txns.map((t) => t.id),
  }, deps);
  if (stl.ok) {
    const cs = await completeSettlementUseCase({ ...base, settlementId: stl.value.id }, deps);
    console.log(`   ✓ Settlement: ${cs.ok ? cs.value.status : 'FAILED'}`);
  }

  // ── 7. Receive Webhook ────────────────
  console.log('7. Receiving webhook...');
  const wh = await receiveWebhookUseCase({
    ...base, providerId: 'mock-provider',
    eventType: 'payment.succeeded', signature: 'valid-sig-123',
    payload: { event: 'capture', amount: 250 },
  }, deps);
  console.log(`   ✓ Webhook verified: ${wh.ok ? wh.value.verified : false}`);

  // ── 8. Reconciliation ─────────────────
  console.log('8. Reconciliation...');
  const rec = await runReconciliationUseCase({
    ...base, providerId: 'mock-provider',
    periodStart: '2026-07-01T00:00:00Z', periodEnd: '2026-07-31T23:59:59Z',
    expectedAmount: 250, actualAmount: 250,
  }, deps);
  console.log(`   ✓ Status: ${rec.ok ? rec.value.status : 'FAILED'}`);

  // ── Summary ───────────────────────────
  const finalPayment = await deps.paymentRepo.findById('t-1', payId);
  console.log('\n=== Full lifecycle complete ===');
  console.log(`Final payment status: ${finalPayment!.status}`);
  console.log(`Events emitted: ${(deps.eventBus as InMemoryEventBus).emitted.length}`);
  console.log(`Transactions: ${txns.length}`);
}

main().catch((err) => {
  console.error('Example failed:', err);
  process.exit(1);
});
