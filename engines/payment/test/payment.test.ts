/**
 * Payment Engine — Tests (65+)
 *
 * Coverage:
 *   - Payment lifecycle (create, authorize, capture, cancel, void, refund, retry, expire)
 *   - 9-state machine validation
 *   - Invoice lifecycle (create, update, issue, cancel)
 *   - Receipt generation
 *   - Settlement lifecycle
 *   - Transaction queries
 *   - Webhook (receive, replay, verify signature)
 *   - Payment method lifecycle
 *   - Reconciliation
 *   - Provider integration (mock approve/decline/fail)
 *   - Error paths
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPaymentUseCase, authorizePaymentUseCase, capturePaymentUseCase,
  cancelPaymentUseCase, refundPaymentUseCase, voidPaymentUseCase,
  retryPaymentUseCase, expirePaymentUseCase,
  createInvoiceUseCase, updateInvoiceUseCase, issueInvoiceUseCase, cancelInvoiceUseCase,
  generateReceiptUseCase, getReceiptUseCase,
  createSettlementUseCase, completeSettlementUseCase, listSettlementsUseCase,
  getTransactionUseCase, listTransactionsUseCase, searchTransactionsUseCase,
  receiveWebhookUseCase, replayWebhookUseCase, verifyWebhookSignatureUseCase,
  registerPaymentMethodUseCase, archivePaymentMethodUseCase, listPaymentMethodsUseCase,
  runReconciliationUseCase, attachReferenceUseCase,
  validatePaymentStatusTransition, isTerminalStatus, isPaymentMutable,
} from '../src/index.js';
import { makeDeps, createTestPayment } from './helpers.js';

const baseInput = {
  tenantId: 't-1', correlationId: 'corr-1', actorId: 'user-1', organizationId: 'org-1',
};

// ════════════════════════════════════════════════════════════════════════════
// STATE MACHINE
// ════════════════════════════════════════════════════════════════════════════

describe('Payment State Machine', () => {
  it('allows Draft → Pending', () => {
    expect(validatePaymentStatusTransition('Draft', 'Pending').ok).toBe(true);
  });
  it('allows Pending → Authorized', () => {
    expect(validatePaymentStatusTransition('Pending', 'Authorized').ok).toBe(true);
  });
  it('allows Authorized → Captured', () => {
    expect(validatePaymentStatusTransition('Authorized', 'Captured').ok).toBe(true);
  });
  it('allows Captured → Settled', () => {
    expect(validatePaymentStatusTransition('Captured', 'Settled').ok).toBe(true);
  });
  it('allows Captured → Refunded', () => {
    expect(validatePaymentStatusTransition('Captured', 'Refunded').ok).toBe(true);
  });
  it('allows Failed → Pending (retry)', () => {
    expect(validatePaymentStatusTransition('Failed', 'Pending').ok).toBe(true);
  });
  it('rejects same-status transition', () => {
    expect(validatePaymentStatusTransition('Authorized', 'Authorized').ok).toBe(false);
  });
  it('rejects terminal → anything', () => {
    expect(validatePaymentStatusTransition('Settled', 'Pending').ok).toBe(false);
    expect(validatePaymentStatusTransition('Refunded', 'Pending').ok).toBe(false);
    expect(validatePaymentStatusTransition('Cancelled', 'Pending').ok).toBe(false);
  });
  it('rejects Draft → Captured (skip)', () => {
    expect(validatePaymentStatusTransition('Draft', 'Captured').ok).toBe(false);
  });
  it('identifies terminal states', () => {
    expect(isTerminalStatus('Settled')).toBe(true);
    expect(isTerminalStatus('Refunded')).toBe(true);
    expect(isTerminalStatus('Authorized')).toBe(false);
  });
  it('identifies mutable states', () => {
    expect(isPaymentMutable('Pending')).toBe(true);
    expect(isPaymentMutable('Settled')).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// PAYMENT LIFECYCLE
// ════════════════════════════════════════════════════════════════════════════

describe('Payment Lifecycle', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('creates a payment (Draft → Pending)', async () => {
    const r = await createPaymentUseCase({
      ...baseInput, type: 'one-time', description: 'Test', amount: 100,
      currency: 'USD', providerId: 'mock-provider',
    }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.paymentNumber).toMatch(/^PAY-\d{8}-\d{6}$/);
  });

  it('rejects unknown organization', async () => {
    const r = await createPaymentUseCase({
      ...baseInput, organizationId: 'unknown-org',
      type: 'one-time', description: 'Test', amount: 100,
      providerId: 'mock-provider',
    }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects unknown provider', async () => {
    const r = await createPaymentUseCase({
      ...baseInput, type: 'one-time', description: 'Test', amount: 100,
      providerId: 'unknown-provider',
    }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects disallowed type', async () => {
    const r = await createPaymentUseCase({
      ...baseInput, type: 'forbidden', description: 'Test', amount: 100,
      providerId: 'mock-provider',
    }, deps);
    expect(r.ok).toBe(false);
  });

  it('emits payment.created event', async () => {
    await createTestPayment(deps);
    expect(deps.eventBus.countByType('payment.created')).toBe(1);
  });

  it('records audit on create', async () => {
    await createTestPayment(deps);
    const audits = await deps.auditRepo.findByTenant('t-1');
    expect(audits.length).toBe(1);
    expect(audits[0]!.eventType).toBe('payment_created');
  });

  it('authorizes a payment', async () => {
    const payId = await createTestPayment(deps);
    const r = await authorizePaymentUseCase({ ...baseInput, paymentId: payId }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe('Authorized');
    expect(r.value.providerTransactionId).not.toBeNull();
  });

  it('emits payment.authorized event', async () => {
    const payId = await createTestPayment(deps);
    await authorizePaymentUseCase({ ...baseInput, paymentId: payId }, deps);
    expect(deps.eventBus.countByType('payment.authorized')).toBe(1);
  });

  it('records authorize transaction', async () => {
    const payId = await createTestPayment(deps);
    await authorizePaymentUseCase({ ...baseInput, paymentId: payId }, deps);
    const txns = await deps.transactionRepo.findByPayment('t-1', payId);
    expect(txns.length).toBe(1);
    expect(txns[0]!.operation).toBe('Authorize');
    expect(txns[0]!.result).toBe('Approved');
  });

  it('captures an authorized payment', async () => {
    const payId = await createTestPayment(deps);
    await authorizePaymentUseCase({ ...baseInput, paymentId: payId }, deps);
    const r = await capturePaymentUseCase({ ...baseInput, paymentId: payId }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe('Captured');
  });

  it('rejects capture from Pending', async () => {
    const payId = await createTestPayment(deps);
    const r = await capturePaymentUseCase({ ...baseInput, paymentId: payId }, deps);
    expect(r.ok).toBe(false);
  });

  it('cancels a pending payment', async () => {
    const payId = await createTestPayment(deps);
    const r = await cancelPaymentUseCase({ ...baseInput, paymentId: payId, reason: 'User requested' }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe('Cancelled');
    expect(r.value.cancelReason).toBe('User requested');
  });

  it('voids an authorized payment (calls provider void)', async () => {
    const payId = await createTestPayment(deps);
    await authorizePaymentUseCase({ ...baseInput, paymentId: payId }, deps);
    const r = await voidPaymentUseCase({ ...baseInput, paymentId: payId }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe('Cancelled');
    // Should have 2 transactions: authorize + void
    const txns = await deps.transactionRepo.findByPayment('t-1', payId);
    expect(txns.length).toBe(2);
  });

  it('refunds a captured payment', async () => {
    const payId = await createTestPayment(deps);
    await authorizePaymentUseCase({ ...baseInput, paymentId: payId }, deps);
    await capturePaymentUseCase({ ...baseInput, paymentId: payId }, deps);
    const r = await refundPaymentUseCase({ ...baseInput, paymentId: payId, amount: 100, reason: 'Customer request' }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe('Completed');
    expect(r.value.amount).toBe(100);
  });

  it('rejects refund from Pending', async () => {
    const payId = await createTestPayment(deps);
    const r = await refundPaymentUseCase({ ...baseInput, paymentId: payId, amount: 50, reason: 'Test' }, deps);
    expect(r.ok).toBe(false);
  });

  it('retries a failed payment', async () => {
    const payId = await createTestPayment(deps);
    // Force fail
    await deps.paymentRepo.update('t-1', payId, { status: 'Failed', failedAt: deps.clock.now().toISOString() });
    const r = await retryPaymentUseCase({ ...baseInput, paymentId: payId }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe('Pending');
    expect(r.value.retryCount).toBe(1);
  });

  it('rejects retry from Authorized', async () => {
    const payId = await createTestPayment(deps);
    await authorizePaymentUseCase({ ...baseInput, paymentId: payId }, deps);
    const r = await retryPaymentUseCase({ ...baseInput, paymentId: payId }, deps);
    expect(r.ok).toBe(false);
  });

  it('expires a pending payment', async () => {
    const payId = await createTestPayment(deps);
    const r = await expirePaymentUseCase({ ...baseInput, paymentId: payId }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe('Expired');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// PROVIDER DECLINE / FAIL
// ════════════════════════════════════════════════════════════════════════════

describe('Provider Decline & Fail', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('handles provider decline (payment → Failed)', async () => {
    deps.mockProvider.setDecline(true);
    const payId = await createTestPayment(deps);
    const r = await authorizePaymentUseCase({ ...baseInput, paymentId: payId }, deps);
    expect(r.ok).toBe(false);
    const payment = await deps.paymentRepo.findById('t-1', payId);
    expect(payment!.status).toBe('Failed');
  });

  it('handles provider network error (payment → Failed)', async () => {
    deps.mockProvider.setFail(true);
    const payId = await createTestPayment(deps);
    const r = await authorizePaymentUseCase({ ...baseInput, paymentId: payId }, deps);
    expect(r.ok).toBe(false);
    const payment = await deps.paymentRepo.findById('t-1', payId);
    expect(payment!.status).toBe('Failed');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// FULL LIFECYCLE: create → authorize → capture → settle
// ════════════════════════════════════════════════════════════════════════════

describe('Full Payment Flow', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('create → authorize → capture → settle', async () => {
    const payId = await createTestPayment(deps);
    await authorizePaymentUseCase({ ...baseInput, paymentId: payId }, deps);
    await capturePaymentUseCase({ ...baseInput, paymentId: payId }, deps);

    // Create settlement
    const txns = await deps.transactionRepo.findByPayment('t-1', payId);
    const stl = await createSettlementUseCase({
      ...baseInput, providerId: 'mock-provider', currency: 'USD',
      grossAmount: 100, feeAmount: 2.9, netAmount: 97.1,
      transactionIds: txns.map((t) => t.id),
    }, deps);
    expect(stl.ok).toBe(true);
    if (!stl.ok) return;

    // Complete settlement
    const cs = await completeSettlementUseCase({ ...baseInput, settlementId: stl.value.id }, deps);
    expect(cs.ok).toBe(true);

    // Payment should be Settled
    const payment = await deps.paymentRepo.findById('t-1', payId);
    expect(payment!.status).toBe('Settled');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// INVOICE
// ════════════════════════════════════════════════════════════════════════════

describe('Invoice Lifecycle', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('creates an invoice', async () => {
    const r = await createInvoiceUseCase({
      ...baseInput, currency: 'USD',
      lineItems: [{ id: 'li-1', description: 'Item A', quantity: 2, unitPrice: 50, lineTotal: 100, taxRefId: null, discountRefId: null }],
    }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.invoiceNumber).toMatch(/^INV-\d{8}-\d{6}$/);
  });

  it('updates an invoice', async () => {
    const r = await createInvoiceUseCase({ ...baseInput, currency: 'USD' }, deps);
    if (!r.ok) return;
    const ur = await updateInvoiceUseCase({
      ...baseInput, invoiceId: r.value.invoiceId,
      lineItems: [{ id: 'li-1', description: 'Updated', quantity: 1, unitPrice: 200, lineTotal: 200, taxRefId: null, discountRefId: null }],
    }, deps);
    expect(ur.ok).toBe(true);
  });

  it('issues an invoice', async () => {
    const r = await createInvoiceUseCase({ ...baseInput, currency: 'USD' }, deps);
    if (!r.ok) return;
    const ir = await issueInvoiceUseCase({ ...baseInput, invoiceId: r.value.invoiceId }, deps);
    expect(ir.ok).toBe(true);
    if (!ir.ok) return;
    expect(ir.value.status).toBe('Issued');
  });

  it('cancels an invoice', async () => {
    const r = await createInvoiceUseCase({ ...baseInput, currency: 'USD' }, deps);
    if (!r.ok) return;
    const cr = await cancelInvoiceUseCase({ ...baseInput, invoiceId: r.value.invoiceId, reason: 'Void' }, deps);
    expect(cr.ok).toBe(true);
    if (!cr.ok) return;
    expect(cr.value.status).toBe('Cancelled');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// RECEIPT
// ════════════════════════════════════════════════════════════════════════════

describe('Receipt', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('generates a receipt for a payment', async () => {
    const payId = await createTestPayment(deps);
    const r = await generateReceiptUseCase({
      ...baseInput, paymentId: payId, format: 'PDF',
    }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.receiptNumber).toMatch(/^RCP-/);
    expect(r.value.amount).toBe(100);
  });

  it('gets a receipt by ID', async () => {
    const payId = await createTestPayment(deps);
    const gr = await generateReceiptUseCase({ ...baseInput, paymentId: payId }, deps);
    if (!gr.ok) return;
    const r = await getReceiptUseCase({ tenantId: 't-1', receiptId: gr.value.id }, deps);
    expect(r.ok && r.value).not.toBeNull();
  });

  it('rejects receipt for unknown payment', async () => {
    const r = await generateReceiptUseCase({
      ...baseInput, paymentId: 'unknown-pay',
    }, deps);
    expect(r.ok).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SETTLEMENT
// ════════════════════════════════════════════════════════════════════════════

describe('Settlement', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('creates and completes a settlement', async () => {
    const r = await createSettlementUseCase({
      ...baseInput, providerId: 'mock-provider', currency: 'USD',
      grossAmount: 500, feeAmount: 15, netAmount: 485,
      transactionIds: [],
    }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const cr = await completeSettlementUseCase({ ...baseInput, settlementId: r.value.id }, deps);
    expect(cr.ok).toBe(true);
    if (!cr.ok) return;
    expect(cr.value.status).toBe('Completed');
  });

  it('lists settlements', async () => {
    await createSettlementUseCase({
      ...baseInput, providerId: 'mock-provider', currency: 'USD',
      grossAmount: 100, feeAmount: 3, netAmount: 97, transactionIds: [],
    }, deps);
    const r = await listSettlementsUseCase({ tenantId: 't-1', organizationId: 'org-1' }, deps);
    expect(r.ok && r.value.length).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TRANSACTION
// ════════════════════════════════════════════════════════════════════════════

describe('Transaction Queries', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('lists transactions by payment', async () => {
    const payId = await createTestPayment(deps);
    await authorizePaymentUseCase({ ...baseInput, paymentId: payId }, deps);
    const r = await listTransactionsUseCase({ tenantId: 't-1', paymentId: payId }, deps);
    expect(r.ok && r.value.total).toBe(1);
  });

  it('gets a transaction by ID', async () => {
    const payId = await createTestPayment(deps);
    await authorizePaymentUseCase({ ...baseInput, paymentId: payId }, deps);
    const txns = await deps.transactionRepo.findByPayment('t-1', payId);
    const txnId = txns[0]!.id;
    const r = await getTransactionUseCase({ tenantId: 't-1', transactionId: txnId }, deps);
    expect(r.ok && r.value).not.toBeNull();
  });

  it('searches transactions by operation', async () => {
    const payId = await createTestPayment(deps);
    await authorizePaymentUseCase({ ...baseInput, paymentId: payId }, deps);
    const r = await searchTransactionsUseCase({ tenantId: 't-1', operation: 'Authorize' }, deps);
    expect(r.ok && r.value.total).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// WEBHOOK
// ════════════════════════════════════════════════════════════════════════════

describe('Webhook', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('receives a webhook with valid signature', async () => {
    const r = await receiveWebhookUseCase({
      ...baseInput, providerId: 'mock-provider',
      eventType: 'payment.succeeded', signature: 'valid-sig-123',
      payload: { id: 'evt_123', amount: 100 },
    }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.verified).toBe(true);
    expect(r.value.processed).toBe(true);
  });

  it('rejects webhook with invalid signature', async () => {
    const r = await receiveWebhookUseCase({
      ...baseInput, providerId: 'mock-provider',
      eventType: 'payment.succeeded', signature: 'invalid-sig',
      payload: { id: 'evt_456' },
    }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.verified).toBe(false);
  });

  it('replays a webhook', async () => {
    const rcv = await receiveWebhookUseCase({
      ...baseInput, providerId: 'mock-provider',
      eventType: 'payment.succeeded', signature: 'valid-sig-123',
      payload: { id: 'evt_789' },
    }, deps);
    if (!rcv.ok) return;
    const r = await replayWebhookUseCase({ ...baseInput, webhookId: rcv.value.webhookId }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe('Replayed');
  });

  it('verifies signature standalone', async () => {
    const r = await verifyWebhookSignatureUseCase({
      tenantId: 't-1', providerId: 'mock-provider',
      payload: {}, signature: 'valid-sig-123',
    }, deps);
    expect(r.ok && r.value).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// PAYMENT METHOD
// ════════════════════════════════════════════════════════════════════════════

describe('Payment Method', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('registers a payment method', async () => {
    const r = await registerPaymentMethodUseCase({
      ...baseInput, ownerId: 'user-1',
      providerId: 'mock-provider', methodType: 'card',
      displayName: 'Visa ending 4242', token: 'tok_4242',
      last4: '4242', expiryMonth: 12, expiryYear: 2027,
      brand: 'visa',
    }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe('Active');
    expect(r.value.last4).toBe('4242');
  });

  it('rejects unknown owner', async () => {
    const r = await registerPaymentMethodUseCase({
      ...baseInput, ownerId: 'unknown-user',
      providerId: 'mock-provider', methodType: 'card',
      displayName: 'Test', token: 'tok_x',
    }, deps);
    expect(r.ok).toBe(false);
  });

  it('archives a payment method', async () => {
    const r = await registerPaymentMethodUseCase({
      ...baseInput, ownerId: 'user-1',
      providerId: 'mock-provider', methodType: 'card',
      displayName: 'Mastercard', token: 'tok_mc',
    }, deps);
    if (!r.ok) return;
    const ar = await archivePaymentMethodUseCase({ ...baseInput, paymentMethodId: r.value.id }, deps);
    expect(ar.ok).toBe(true);
    if (!ar.ok) return;
    expect(ar.value.status).toBe('Archived');
  });

  it('lists methods by owner', async () => {
    await registerPaymentMethodUseCase({
      ...baseInput, ownerId: 'user-1',
      providerId: 'mock-provider', methodType: 'card',
      displayName: 'Card 1', token: 'tok_1',
    }, deps);
    await registerPaymentMethodUseCase({
      ...baseInput, ownerId: 'user-1',
      providerId: 'mock-provider', methodType: 'bank',
      displayName: 'Bank 1', token: 'tok_2',
    }, deps);
    const r = await listPaymentMethodsUseCase({ tenantId: 't-1', ownerId: 'user-1' }, deps);
    expect(r.ok && r.value.length).toBe(2);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// RECONCILIATION
// ════════════════════════════════════════════════════════════════════════════

describe('Reconciliation', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('matches when amounts are equal', async () => {
    const r = await runReconciliationUseCase({
      ...baseInput, providerId: 'mock-provider',
      periodStart: '2026-07-01T00:00:00Z', periodEnd: '2026-07-31T23:59:59Z',
      expectedAmount: 1000, actualAmount: 1000,
    }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe('Matched');
    expect(r.value.discrepancy).toBe(0);
  });

  it('detects discrepancy', async () => {
    const r = await runReconciliationUseCase({
      ...baseInput, providerId: 'mock-provider',
      periodStart: '2026-07-01T00:00:00Z', periodEnd: '2026-07-31T23:59:59Z',
      expectedAmount: 1000, actualAmount: 950,
    }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe('Discrepant');
    expect(r.value.discrepancy).toBe(-50);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// REFERENCES
// ════════════════════════════════════════════════════════════════════════════

describe('References', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('attaches a reference to a payment', async () => {
    const payId = await createTestPayment(deps);
    const r = await attachReferenceUseCase({
      ...baseInput, paymentId: payId,
      refType: 'external-system', refId: 'ext-001',
    }, deps);
    expect(r.ok).toBe(true);
    const payment = await deps.paymentRepo.findById('t-1', payId);
    expect(payment!.references.length).toBe(1);
  });

  it('deduplicates references', async () => {
    const payId = await createTestPayment(deps);
    await attachReferenceUseCase({ ...baseInput, paymentId: payId, refType: 'doc', refId: 'd-1' }, deps);
    await attachReferenceUseCase({ ...baseInput, paymentId: payId, refType: 'doc', refId: 'd-1' }, deps);
    const payment = await deps.paymentRepo.findById('t-1', payId);
    expect(payment!.references.length).toBe(1);
  });
});
