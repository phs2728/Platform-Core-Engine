/**
 * Payment Engine — Transaction + Webhook + PaymentMethod + Reconciliation UseCases (10)
 *
 * getTransaction, listTransactions, searchTransactions,
 * receiveWebhook, replayWebhook, verifyWebhookSignature,
 * registerPaymentMethod, archivePaymentMethod, listPaymentMethods,
 * runReconciliation
 */

import {
  Ok, Err, type Result,
  ValidationError, NotFoundError, ConflictError,
  type EventEnvelope,
} from '@platform/core-sdk';
import {
  getTransactionSchema, listTransactionsSchema,
  receiveWebhookSchema, replayWebhookSchema, verifySignatureSchema,
  registerPaymentMethodSchema, archivePaymentMethodSchema, listPaymentMethodsSchema,
  runReconciliationSchema,
  attachReferenceSchema,
} from '../domain/validation.js';
import type { PaymentUseCaseDeps } from './types.js';
import type {
  PaymentMethod, PaymentWebhook, Reconciliation,
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

let webhookCounter = 0;
function generateWebhookId(deps: PaymentUseCaseDeps): string {
  webhookCounter += 1;
  return `wh-${deps.clock.now().toISOString().slice(0, 10).replace(/-/g, '')}-${String(webhookCounter).padStart(6, '0')}`;
}

let reconSeq = 0;
function generateReconciliationNumber(deps: PaymentUseCaseDeps): string {
  reconSeq += 1;
  const date = deps.clock.now().toISOString().slice(0, 10).replace(/-/g, '');
  return `REC-${date}-${String(reconSeq).padStart(6, '0')}`;
}

// ════════════════════════════════════════════════════════════════════════════
// TRANSACTION (3)
// ════════════════════════════════════════════════════════════════════════════

export async function getTransactionUseCase(
  input: { tenantId: string; transactionId: string },
  deps: PaymentUseCaseDeps,
): Promise<Result<Awaited<ReturnType<typeof deps.transactionRepo.findById>>, ValidationError>> {
  const v = getTransactionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  return Ok(await deps.transactionRepo.findById(v.data.tenantId, v.data.transactionId));
}

export async function listTransactionsUseCase(
  input: {
    tenantId: string; paymentId?: string; organizationId?: string;
    providerId?: string; operation?: string; result?: string;
    limit?: number; offset?: number;
  },
  deps: PaymentUseCaseDeps,
) {
  const v = listTransactionsSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  return Ok(await deps.transactionRepo.search(v.data as Parameters<typeof deps.transactionRepo.search>[0]));
}

export async function searchTransactionsUseCase(
  input: Parameters<typeof deps.transactionRepo.search>[0],
  deps: PaymentUseCaseDeps,
) {
  return Ok(await deps.transactionRepo.search(input));
}

// ════════════════════════════════════════════════════════════════════════════
// WEBHOOK (3)
// ════════════════════════════════════════════════════════════════════════════

export async function receiveWebhookUseCase(
  input: {
    tenantId: string; correlationId: string; actorId: string;
    organizationId: string; providerId: string;
    eventType: string; signature: string;
    payload: Record<string, unknown>;
  },
  deps: PaymentUseCaseDeps,
): Promise<Result<{ webhookId: string; verified: boolean; processed: boolean }, ValidationError>> {
  const v = receiveWebhookSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  // Verify signature
  const providerRes = await deps.providerResolver.resolve(d.providerId);
  let verified = false;
  if (providerRes.ok) {
    const sigRes = await providerRes.value.verifyWebhookSignature(d.payload, d.signature);
    verified = sigRes.ok && sigRes.value;
  }

  const whId = generateWebhookId(deps);
  const now = deps.clock.now().toISOString();
  const webhook: PaymentWebhook = {
    id: whId, tenantId: d.tenantId, organizationId: d.organizationId,
    providerId: d.providerId, eventType: d.eventType,
    status: verified ? 'Processed' : 'Failed',
    signature: d.signature, payload: d.payload,
    verified,
    processedResult: verified ? 'OK' : 'Signature verification failed',
    receivedAt: now,
    processedAt: verified ? now : null,
    replayedAt: null,
  };

  await deps.webhookRepo.insert(webhook);
  await deps.eventBus.emit(env(deps, whId, d.tenantId, d.correlationId, 'webhook.received', 'webhook.received.v1', { webhookId: whId, eventType: d.eventType, verified }));
  await audit(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'webhook_received', { webhookId: whId, eventType: d.eventType, verified });
  return Ok({ webhookId: whId, verified, processed: verified });
}

export async function replayWebhookUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; webhookId: string },
  deps: PaymentUseCaseDeps,
): Promise<Result<PaymentWebhook, ValidationError | NotFoundError>> {
  const v = replayWebhookSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.webhookRepo.findById(d.tenantId, d.webhookId);
  if (!ex) return Err(new NotFoundError('Webhook not found'));

  const now = deps.clock.now().toISOString();
  await deps.webhookRepo.update(d.tenantId, d.webhookId, {
    status: 'Replayed', replayedAt: now,
  });
  await deps.eventBus.emit(env(deps, d.webhookId, d.tenantId, d.correlationId, 'webhook.replayed', 'webhook.replayed.v1', { webhookId: d.webhookId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'webhook_replayed', { webhookId: d.webhookId });
  return Ok({ ...ex, status: 'Replayed', replayedAt: now });
}

export async function verifyWebhookSignatureUseCase(
  input: { tenantId: string; providerId: string; payload: Record<string, unknown>; signature: string },
  deps: PaymentUseCaseDeps,
): Promise<Result<boolean, ValidationError>> {
  const v = verifySignatureSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const providerRes = await deps.providerResolver.resolve(d.providerId);
  if (!providerRes.ok) return Ok(false);
  const sigRes = await providerRes.value.verifyWebhookSignature(d.payload, d.signature);
  return Ok(sigRes.ok && sigRes.value);
}

// ════════════════════════════════════════════════════════════════════════════
// PAYMENT METHOD (3)
// ════════════════════════════════════════════════════════════════════════════

export async function registerPaymentMethodUseCase(
  input: {
    tenantId: string; correlationId: string; actorId: string;
    organizationId: string; ownerId: string;
    providerId: string; methodType: string;
    displayName: string; token: string;
    last4?: string | null; expiryMonth?: number | null; expiryYear?: number | null;
    brand?: string | null; isDefault?: boolean;
    metadata?: Record<string, unknown>;
  },
  deps: PaymentUseCaseDeps,
): Promise<Result<PaymentMethod, ValidationError>> {
  const v = registerPaymentMethodSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));

  const userOk = await deps.userVerifier.verify(d.tenantId, d.ownerId);
  if (!userOk) return Err(new ValidationError('Owner (user) not found'));

  const pmId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const method: PaymentMethod = {
    id: pmId, tenantId: d.tenantId, organizationId: d.organizationId,
    ownerId: d.ownerId, providerId: d.providerId,
    methodType: d.methodType, displayName: d.displayName,
    token: d.token,
    last4: d.last4 ?? null,
    expiryMonth: d.expiryMonth ?? null,
    expiryYear: d.expiryYear ?? null,
    brand: d.brand ?? null,
    status: 'Active',
    isDefault: d.isDefault ?? false,
    metadata: d.metadata ?? {},
    createdAt: now, archivedAt: null,
  };

  await deps.paymentMethodRepo.insert(method);
  await deps.eventBus.emit(env(deps, pmId, d.tenantId, d.correlationId, 'payment.method.registered', 'payment.method.registered.v1', { paymentMethodId: pmId }));
  await audit(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'payment_method_registered', { paymentMethodId: pmId });
  return Ok(method);
}

export async function archivePaymentMethodUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; paymentMethodId: string },
  deps: PaymentUseCaseDeps,
): Promise<Result<PaymentMethod, ValidationError | NotFoundError | ConflictError>> {
  const v = archivePaymentMethodSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.paymentMethodRepo.findById(d.tenantId, d.paymentMethodId);
  if (!ex) return Err(new NotFoundError('Payment method not found'));
  if (ex.status === 'Archived') return Err(new ConflictError('Already archived'));

  const now = deps.clock.now().toISOString();
  await deps.paymentMethodRepo.update(d.tenantId, d.paymentMethodId, { status: 'Archived', archivedAt: now });
  await deps.eventBus.emit(env(deps, d.paymentMethodId, d.tenantId, d.correlationId, 'payment.method.archived', 'payment.method.archived.v1', { paymentMethodId: d.paymentMethodId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'payment_method_archived', { paymentMethodId: d.paymentMethodId });
  return Ok({ ...ex, status: 'Archived', archivedAt: now });
}

export async function listPaymentMethodsUseCase(
  input: { tenantId: string; organizationId?: string; ownerId?: string },
  deps: PaymentUseCaseDeps,
): Promise<Result<PaymentMethod[], ValidationError>> {
  const v = listPaymentMethodsSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  if (d.ownerId !== undefined) {
    return Ok(await deps.paymentMethodRepo.findByOwner(d.tenantId, d.ownerId));
  }
  if (d.organizationId !== undefined) {
    return Ok(await deps.paymentMethodRepo.findByOrganization(d.tenantId, d.organizationId));
  }
  return Ok([]);
}

// ════════════════════════════════════════════════════════════════════════════
// RECONCILIATION (1)
// ════════════════════════════════════════════════════════════════════════════

export async function runReconciliationUseCase(
  input: {
    tenantId: string; correlationId: string; actorId: string;
    organizationId: string; providerId: string;
    periodStart: string; periodEnd: string;
    expectedAmount: number; actualAmount: number;
  },
  deps: PaymentUseCaseDeps,
): Promise<Result<Reconciliation, ValidationError>> {
  const v = runReconciliationSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));

  const reconId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const discrepancy = Math.round((d.actualAmount - d.expectedAmount) * 100) / 100;
  const status = discrepancy === 0 ? 'Matched' : discrepancy > 0 ? 'Unmatched' : 'Discrepant';

  // Count transactions in period
  const txns = await deps.transactionRepo.search({
    tenantId: d.tenantId, organizationId: d.organizationId, providerId: d.providerId,
  });

  const recon: Reconciliation = {
    id: reconId, tenantId: d.tenantId, organizationId: d.organizationId,
    reconciliationNumber: generateReconciliationNumber(deps),
    status,
    periodStart: d.periodStart, periodEnd: d.periodEnd,
    providerId: d.providerId,
    expectedAmount: d.expectedAmount, actualAmount: d.actualAmount,
    discrepancy,
    transactionCount: txns.total,
    matchedCount: discrepancy === 0 ? txns.total : 0,
    unmatchedCount: discrepancy === 0 ? 0 : txns.total,
    metadata: {},
    createdAt: now,
  };

  await deps.reconciliationRepo.insert(recon);
  await deps.eventBus.emit(env(deps, reconId, d.tenantId, d.correlationId, 'reconciliation.completed', 'reconciliation.completed.v1', { reconciliationId: reconId, status, discrepancy }));
  await audit(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'reconciliation_completed', { reconciliationId: reconId, status, discrepancy });
  return Ok(recon);
}

// ════════════════════════════════════════════════════════════════════════════
// REFERENCE (bonus)
// ════════════════════════════════════════════════════════════════════════════

export async function attachReferenceUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; paymentId: string; refType: string; refId: string; metadata?: Record<string, unknown> },
  deps: PaymentUseCaseDeps,
): Promise<Result<{ paymentId: string; refType: string; refId: string }, ValidationError | NotFoundError>> {
  const v = attachReferenceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.paymentRepo.findById(d.tenantId, d.paymentId);
  if (!ex) return Err(new NotFoundError('Payment not found'));

  const newRef = { refType: d.refType, refId: d.refId, metadata: d.metadata ?? {} };
  const refs = [...ex.references.filter((r) => !(r.refType === d.refType && r.refId === d.refId)), newRef];
  await deps.paymentRepo.update(d.tenantId, d.paymentId, { references: refs, updatedAt: deps.clock.now().toISOString() });
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'reference_attached', { refType: d.refType, refId: d.refId }, d.paymentId);
  return Ok({ paymentId: d.paymentId, refType: d.refType, refId: d.refId });
}
