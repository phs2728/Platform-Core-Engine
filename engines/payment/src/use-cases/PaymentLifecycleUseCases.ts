/**
 * Payment Engine — Payment Lifecycle UseCases (8)
 *
 * createPayment, authorizePayment, capturePayment,
 * cancelPayment, refundPayment, voidPayment,
 * retryPayment, expirePayment
 */

import {
  Ok, Err, type Result,
  ValidationError, ConflictError, NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';
import {
  createPaymentSchema, simplePaymentActionSchema,
  cancelPaymentSchema, refundPaymentSchema,
} from '../domain/validation.js';
import { validatePaymentStatusTransition, isPaymentMutable } from '../domain/statusTransition.js';
import type { PaymentUseCaseDeps } from './types.js';
import type {
  Payment, Transaction, Refund, TaxBreakdown,
} from '../interfaces/index.js';

function env(deps: PaymentUseCaseDeps, agg: string, tenant: string, corr: string, eventType: string, schemaRef: string, payload: unknown): EventEnvelope<unknown> {
  return {
    eventId: deps.idGenerator.generate(), aggregateId: agg, occurredAt: deps.clock.now().toISOString(),
    version: '1.0.0', tenantId: tenant, correlationId: corr, causationId: '',
    engine: 'payment', eventType, schemaRef, payload,
  };
}

async function audit(deps: PaymentUseCaseDeps, orgId: string, tenantId: string, actorId: string, corr: string, eventType: string, meta: Record<string, unknown>, paymentId?: string) {
  const rec: Record<string, unknown> = { organizationId: orgId, tenantId, actorId, correlationId: corr, eventType, metadata: meta };
  if (paymentId !== undefined) rec.paymentId = paymentId;
  await deps.auditRepo.insert(rec as Parameters<typeof deps.auditRepo.insert>[0]);
}

let paymentSeq = 0;
function generatePaymentNumber(deps: PaymentUseCaseDeps): string {
  paymentSeq += 1;
  const date = deps.clock.now().toISOString().slice(0, 10).replace(/-/g, '');
  return `PAY-${date}-${String(paymentSeq).padStart(6, '0')}`;
}

let txnSeq = 0;
function generateTxnNumber(deps: PaymentUseCaseDeps): string {
  txnSeq += 1;
  const date = deps.clock.now().toISOString().slice(0, 10).replace(/-/g, '');
  return `TXN-${date}-${String(txnSeq).padStart(6, '0')}`;
}

let refundSeq = 0;
function generateRefundNumber(deps: PaymentUseCaseDeps): string {
  refundSeq += 1;
  const date = deps.clock.now().toISOString().slice(0, 10).replace(/-/g, '');
  return `RFD-${date}-${String(refundSeq).padStart(6, '0')}`;
}

function computeTax(taxBreakdowns: TaxBreakdown[]): number {
  return taxBreakdowns.reduce((sum, t) => sum + t.taxAmount, 0);
}

// ════════════════════════════════════════════════════════════════════════════
// CREATE
// ════════════════════════════════════════════════════════════════════════════

export interface CreatePaymentInput {
  tenantId: string; correlationId: string; actorId: string;
  organizationId: string;
  type: string; description: string;
  amount: number;
  currency?: string;
  providerId: string;
  paymentMethodId?: string;
  taxBreakdowns?: TaxBreakdown[];
  discountTotal?: number;
  references?: { refType: string; refId: string; metadata?: Record<string, unknown> }[];
  attributes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export async function createPaymentUseCase(
  input: CreatePaymentInput,
  deps: PaymentUseCaseDeps,
): Promise<Result<{ paymentId: string; paymentNumber: string; createdAt: string }, ValidationError | ConflictError>> {
  const v = createPaymentSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  // Organization verification
  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));

  // CustomDataPolicy (1회)
  const allowedTypes = await deps.policyProvider.getAllowedPaymentTypes(d.tenantId);
  if (!allowedTypes.includes(d.type)) return Err(new ValidationError(`type "${d.type}" not allowed`));

  const pr = await deps.policyProvider.validateAttributes(d.tenantId, d.type, d.attributes ?? {});
  if (!pr.ok) return Err(new ValidationError('CustomDataPolicy rejected'));

  // Max payments check
  const maxP = await deps.policyProvider.getMaxPaymentsPerOrg(d.tenantId);
  if (await deps.paymentRepo.countByOrganization(d.tenantId, d.organizationId) >= maxP) {
    return Err(new ConflictError(`Max payments (${maxP}) reached`));
  }

  // Verify provider exists
  const providerRes = await deps.providerResolver.resolve(d.providerId);
  if (!providerRes.ok) return Err(new ValidationError(`Provider not found: ${d.providerId}`));

  const payId = deps.idGenerator.generate();
  const payNumber = generatePaymentNumber(deps);
  const now = deps.clock.now().toISOString();
  const currency = d.currency ?? await deps.policyProvider.getDefaultCurrency(d.tenantId);
  const taxTotal = d.taxBreakdowns ? computeTax(d.taxBreakdowns as TaxBreakdown[]) : 0;
  const discountTotal = d.discountTotal ?? 0;
  const grandTotal = d.amount + taxTotal - discountTotal;

  const payment: Payment = {
    id: payId, tenantId: d.tenantId, organizationId: d.organizationId,
    paymentNumber: payNumber, status: 'Draft', type: d.type, description: d.description,
    amount: d.amount, currency,
    taxTotal, discountTotal, grandTotal,
    providerId: d.providerId,
    providerTransactionId: null,
    paymentMethodId: d.paymentMethodId ?? null,
    references: (d.references ?? []) as Payment['references'],
    taxBreakdowns: (d.taxBreakdowns ?? []) as TaxBreakdown[],
    attributes: pr.value, metadata: d.metadata ?? {}, tags: d.tags ?? [],
    retryCount: 0,
    createdBy: d.actorId, updatedBy: d.actorId,
    createdAt: now, updatedAt: now,
    authorizedAt: null, capturedAt: null, settledAt: null,
    cancelledAt: null, cancelReason: null,
    failedAt: null, failReason: null,
    expiredAt: null, refundedAt: null, archivedAt: null,
  };

  await deps.paymentRepo.insert(payment);

  // Transition to Pending
  await deps.paymentRepo.update(d.tenantId, payId, { status: 'Pending', updatedAt: now });

  await deps.eventBus.emit(env(deps, payId, d.tenantId, d.correlationId, 'payment.created', 'payment.created.v1', { paymentId: payId, paymentNumber: payNumber, amount: grandTotal, currency }));
  await audit(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'payment_created', { paymentNumber: payNumber, amount: grandTotal }, payId);
  return Ok({ paymentId: payId, paymentNumber: payNumber, createdAt: now });
}

// ════════════════════════════════════════════════════════════════════════════
// AUTHORIZE
// ════════════════════════════════════════════════════════════════════════════

export async function authorizePaymentUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; paymentId: string },
  deps: PaymentUseCaseDeps,
): Promise<Result<Payment, ValidationError | NotFoundError | ConflictError>> {
  const v = simplePaymentActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.paymentRepo.findById(d.tenantId, d.paymentId);
  if (!ex) return Err(new NotFoundError('Payment not found'));
  const tr = validatePaymentStatusTransition(ex.status, 'Authorized');
  if (!tr.ok) return Err(new ConflictError(`Cannot authorize from ${ex.status}`));

  // Call provider
  const providerRes = await deps.providerResolver.resolve(ex.providerId);
  if (!providerRes.ok) return Err(new ConflictError('Provider unavailable'));
  const authRes = await providerRes.value.authorize({
    tenantId: d.tenantId, paymentId: d.paymentId,
    paymentMethodId: ex.paymentMethodId ?? '',
    amount: ex.grandTotal, currencyCode: ex.currency,
    description: ex.description, metadata: {},
  });
  if (!authRes.ok) {
    // Provider failed → mark payment Failed
    const now = deps.clock.now().toISOString();
    await deps.paymentRepo.update(d.tenantId, d.paymentId, { status: 'Failed', failedAt: now, failReason: authRes.error.message, updatedAt: now });
    await deps.eventBus.emit(env(deps, d.paymentId, d.tenantId, d.correlationId, 'payment.failed', 'payment.failed.v1', { paymentId: d.paymentId, reason: authRes.error.message }));
    await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'payment_failed', { reason: authRes.error.message }, d.paymentId);
    return Err(new ConflictError('Authorization failed'));
  }
  if (authRes.value.status === 'declined') {
    const now = deps.clock.now().toISOString();
    await deps.paymentRepo.update(d.tenantId, d.paymentId, { status: 'Failed', failedAt: now, failReason: authRes.value.declineReason ?? 'Declined', updatedAt: now });
    await deps.eventBus.emit(env(deps, d.paymentId, d.tenantId, d.correlationId, 'payment.failed', 'payment.declined.v1', { paymentId: d.paymentId, reason: authRes.value.declineReason }));
    await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'payment_failed', { reason: authRes.value.declineReason }, d.paymentId);
    return Err(new ConflictError(authRes.value.declineReason ?? 'Payment declined'));
  }

  const now = deps.clock.now().toISOString();
  // Record transaction
  const txnId = deps.idGenerator.generate();
  const txn: Transaction = {
    id: txnId, tenantId: d.tenantId, organizationId: ex.organizationId,
    paymentId: d.paymentId, transactionNumber: generateTxnNumber(deps),
    providerId: ex.providerId,
    providerTransactionId: authRes.value.providerTransactionId,
    operation: 'Authorize', amount: ex.grandTotal, currency: ex.currency,
    result: authRes.value.status === 'approved' ? 'Approved' : 'Pending',
    declineReason: authRes.value.declineReason,
    providerFee: authRes.value.providerFee,
    rawResponse: authRes.value.rawResponse,
    createdAt: now,
  };
  await deps.transactionRepo.insert(txn);

  await deps.paymentRepo.update(d.tenantId, d.paymentId, {
    status: 'Authorized', providerTransactionId: authRes.value.providerTransactionId,
    authorizedAt: now, updatedAt: now,
  });
  await deps.eventBus.emit(env(deps, d.paymentId, d.tenantId, d.correlationId, 'payment.authorized', 'payment.authorized.v1', { paymentId: d.paymentId, providerTransactionId: authRes.value.providerTransactionId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'payment_authorized', { providerTransactionId: authRes.value.providerTransactionId }, d.paymentId);
  return Ok({ ...ex, status: 'Authorized', providerTransactionId: authRes.value.providerTransactionId, authorizedAt: now });
}

// ════════════════════════════════════════════════════════════════════════════
// CAPTURE
// ════════════════════════════════════════════════════════════════════════════

export async function capturePaymentUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; paymentId: string },
  deps: PaymentUseCaseDeps,
): Promise<Result<Payment, ValidationError | NotFoundError | ConflictError>> {
  const v = simplePaymentActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.paymentRepo.findById(d.tenantId, d.paymentId);
  if (!ex) return Err(new NotFoundError('Payment not found'));
  const tr = validatePaymentStatusTransition(ex.status, 'Captured');
  if (!tr.ok) return Err(new ConflictError(`Cannot capture from ${ex.status}`));

  const providerRes = await deps.providerResolver.resolve(ex.providerId);
  if (!providerRes.ok) return Err(new ConflictError('Provider unavailable'));
  const captureRes = await providerRes.value.capture({
    tenantId: d.tenantId, paymentId: d.paymentId,
    providerTransactionId: ex.providerTransactionId ?? '',
    amount: ex.grandTotal, currencyCode: ex.currency,
  });
  if (!captureRes.ok || captureRes.value.status !== 'approved') {
    return Err(new ConflictError('Capture failed'));
  }

  const now = deps.clock.now().toISOString();
  const txnId = deps.idGenerator.generate();
  const txn: Transaction = {
    id: txnId, tenantId: d.tenantId, organizationId: ex.organizationId,
    paymentId: d.paymentId, transactionNumber: generateTxnNumber(deps),
    providerId: ex.providerId,
    providerTransactionId: captureRes.value.providerTransactionId,
    operation: 'Capture', amount: ex.grandTotal, currency: ex.currency,
    result: 'Approved', declineReason: null,
    providerFee: captureRes.value.providerFee,
    rawResponse: captureRes.value.rawResponse,
    createdAt: now,
  };
  await deps.transactionRepo.insert(txn);

  await deps.paymentRepo.update(d.tenantId, d.paymentId, {
    status: 'Captured', capturedAt: now, updatedAt: now,
  });
  await deps.eventBus.emit(env(deps, d.paymentId, d.tenantId, d.correlationId, 'payment.captured', 'payment.captured.v1', { paymentId: d.paymentId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'payment_captured', {}, d.paymentId);
  return Ok({ ...ex, status: 'Captured', capturedAt: now });
}

// ════════════════════════════════════════════════════════════════════════════
// CANCEL / VOID
// ════════════════════════════════════════════════════════════════════════════

export async function cancelPaymentUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; paymentId: string; reason?: string },
  deps: PaymentUseCaseDeps,
): Promise<Result<Payment, ValidationError | NotFoundError | ConflictError>> {
  const v = cancelPaymentSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.paymentRepo.findById(d.tenantId, d.paymentId);
  if (!ex) return Err(new NotFoundError('Payment not found'));
  const tr = validatePaymentStatusTransition(ex.status, 'Cancelled');
  if (!tr.ok) return Err(new ConflictError(`Cannot cancel from ${ex.status}`));

  // If Authorized, call provider void
  if (ex.status === 'Authorized' && ex.providerTransactionId) {
    const providerRes = await deps.providerResolver.resolve(ex.providerId);
    if (providerRes.ok) {
      const voidRes = await providerRes.value.void({
        tenantId: d.tenantId, paymentId: d.paymentId,
        providerTransactionId: ex.providerTransactionId,
      });
      if (voidRes.ok) {
        const now = deps.clock.now().toISOString();
        const txnId = deps.idGenerator.generate();
        await deps.transactionRepo.insert({
          id: txnId, tenantId: d.tenantId, organizationId: ex.organizationId,
          paymentId: d.paymentId, transactionNumber: generateTxnNumber(deps),
          providerId: ex.providerId,
          providerTransactionId: voidRes.value.providerTransactionId,
          operation: 'Void', amount: ex.grandTotal, currency: ex.currency,
          result: 'Approved', declineReason: null, providerFee: voidRes.value.providerFee,
          rawResponse: voidRes.value.rawResponse, createdAt: now,
        });
      }
    }
  }

  const now = deps.clock.now().toISOString();
  await deps.paymentRepo.update(d.tenantId, d.paymentId, {
    status: 'Cancelled', cancelledAt: now, cancelReason: d.reason ?? null, updatedAt: now,
  });
  await deps.eventBus.emit(env(deps, d.paymentId, d.tenantId, d.correlationId, 'payment.cancelled', 'payment.cancelled.v1', { paymentId: d.paymentId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'payment_cancelled', { reason: d.reason }, d.paymentId);
  return Ok({ ...ex, status: 'Cancelled', cancelledAt: now, cancelReason: d.reason ?? null });
}

export async function voidPaymentUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; paymentId: string },
  deps: PaymentUseCaseDeps,
): Promise<Result<Payment, ValidationError | NotFoundError | ConflictError>> {
  // Void is functionally same as cancel for Authorized payments
  return cancelPaymentUseCase(input, deps);
}

// ════════════════════════════════════════════════════════════════════════════
// REFUND
// ════════════════════════════════════════════════════════════════════════════

export async function refundPaymentUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; paymentId: string; amount: number; reason: string },
  deps: PaymentUseCaseDeps,
): Promise<Result<Refund, ValidationError | NotFoundError | ConflictError>> {
  const v = refundPaymentSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.paymentRepo.findById(d.tenantId, d.paymentId);
  if (!ex) return Err(new NotFoundError('Payment not found'));
  if (ex.status !== 'Captured' && ex.status !== 'Settled') {
    return Err(new ConflictError(`Cannot refund from ${ex.status}`));
  }

  const providerRes = await deps.providerResolver.resolve(ex.providerId);
  if (!providerRes.ok) return Err(new ConflictError('Provider unavailable'));
  const refundRes = await providerRes.value.refund({
    tenantId: d.tenantId, paymentId: d.paymentId,
    providerTransactionId: ex.providerTransactionId ?? '',
    amount: d.amount, currencyCode: ex.currency, reason: d.reason,
  });
  if (!refundRes.ok || refundRes.value.status !== 'approved') {
    return Err(new ConflictError('Refund failed'));
  }

  const now = deps.clock.now().toISOString();
  const refundId = deps.idGenerator.generate();
  const refund: Refund = {
    id: refundId, tenantId: d.tenantId, organizationId: ex.organizationId,
    paymentId: d.paymentId, refundNumber: generateRefundNumber(deps),
    status: 'Completed', amount: d.amount, currency: ex.currency, reason: d.reason,
    providerTransactionId: refundRes.value.providerTransactionId,
    providerFee: refundRes.value.providerFee,
    createdAt: now, completedAt: now,
  };
  await deps.refundRepo.insert(refund);

  // Record transaction
  const txnId = deps.idGenerator.generate();
  await deps.transactionRepo.insert({
    id: txnId, tenantId: d.tenantId, organizationId: ex.organizationId,
    paymentId: d.paymentId, transactionNumber: generateTxnNumber(deps),
    providerId: ex.providerId,
    providerTransactionId: refundRes.value.providerTransactionId,
    operation: 'Refund', amount: d.amount, currency: ex.currency,
    result: 'Approved', declineReason: null, providerFee: refundRes.value.providerFee,
    rawResponse: refundRes.value.rawResponse, createdAt: now,
  });

  // Transition payment to Refunded if full refund
  if (d.amount >= ex.grandTotal) {
    await deps.paymentRepo.update(d.tenantId, d.paymentId, { status: 'Refunded', refundedAt: now, updatedAt: now });
  }

  await deps.eventBus.emit(env(deps, d.paymentId, d.tenantId, d.correlationId, 'payment.refunded', 'payment.refunded.v1', { paymentId: d.paymentId, refundId, amount: d.amount }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'payment_refunded', { refundId, amount: d.amount }, d.paymentId);
  return Ok(refund);
}

// ════════════════════════════════════════════════════════════════════════════
// RETRY / EXPIRE
// ════════════════════════════════════════════════════════════════════════════

export async function retryPaymentUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; paymentId: string },
  deps: PaymentUseCaseDeps,
): Promise<Result<Payment, ValidationError | NotFoundError | ConflictError>> {
  const v = simplePaymentActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.paymentRepo.findById(d.tenantId, d.paymentId);
  if (!ex) return Err(new NotFoundError('Payment not found'));
  if (ex.status !== 'Failed') return Err(new ConflictError(`Cannot retry from ${ex.status}`));

  const now = deps.clock.now().toISOString();
  const newRetry = ex.retryCount + 1;
  await deps.paymentRepo.update(d.tenantId, d.paymentId, {
    status: 'Pending', retryCount: newRetry,
    failedAt: null, failReason: null, updatedAt: now,
  });
  await deps.eventBus.emit(env(deps, d.paymentId, d.tenantId, d.correlationId, 'payment.created', 'payment.retry.v1', { paymentId: d.paymentId, retryCount: newRetry }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'payment_retried', { retryCount: newRetry }, d.paymentId);
  return Ok({ ...ex, status: 'Pending', retryCount: newRetry });
}

export async function expirePaymentUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; paymentId: string },
  deps: PaymentUseCaseDeps,
): Promise<Result<Payment, ValidationError | NotFoundError | ConflictError>> {
  const v = simplePaymentActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.paymentRepo.findById(d.tenantId, d.paymentId);
  if (!ex) return Err(new NotFoundError('Payment not found'));
  const tr = validatePaymentStatusTransition(ex.status, 'Expired');
  if (!tr.ok) return Err(new ConflictError(`Cannot expire from ${ex.status}`));

  const now = deps.clock.now().toISOString();
  await deps.paymentRepo.update(d.tenantId, d.paymentId, { status: 'Expired', expiredAt: now, updatedAt: now });
  await deps.eventBus.emit(env(deps, d.paymentId, d.tenantId, d.correlationId, 'payment.cancelled', 'payment.expired.v1', { paymentId: d.paymentId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'payment_expired', {}, d.paymentId);
  return Ok({ ...ex, status: 'Expired', expiredAt: now });
}
