/**
 * Payment Engine — Invoice + Receipt + Settlement UseCases (9)
 *
 * createInvoice, updateInvoice, issueInvoice, cancelInvoice,
 * generateReceipt, getReceipt,
 * createSettlement, completeSettlement, listSettlements
 */

import {
  Ok, Err, type Result,
  ValidationError, NotFoundError, ConflictError,
  type EventEnvelope,
} from '@platform/core-sdk';
import {
  createInvoiceSchema, updateInvoiceSchema, cancelInvoiceSchema,
  generateReceiptSchema, getReceiptSchema,
  createSettlementSchema, completeSettlementSchema, listSettlementsSchema,
} from '../domain/validation.js';
import type { PaymentUseCaseDeps } from './types.js';
import type {
  PaymentInvoice, Receipt, Settlement, InvoiceLineItem,
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

let invoiceSeq = 0;
function generateInvoiceNumber(deps: PaymentUseCaseDeps): string {
  invoiceSeq += 1;
  const date = deps.clock.now().toISOString().slice(0, 10).replace(/-/g, '');
  return `INV-${date}-${String(invoiceSeq).padStart(6, '0')}`;
}

let receiptSeq = 0;
function generateReceiptNumber(deps: PaymentUseCaseDeps): string {
  receiptSeq += 1;
  const date = deps.clock.now().toISOString().slice(0, 10).replace(/-/g, '');
  return `RCP-${date}-${String(receiptSeq).padStart(6, '0')}`;
}

let settlementSeq = 0;
function generateSettlementNumber(deps: PaymentUseCaseDeps): string {
  settlementSeq += 1;
  const date = deps.clock.now().toISOString().slice(0, 10).replace(/-/g, '');
  return `STL-${date}-${String(settlementSeq).padStart(6, '0')}`;
}

// ════════════════════════════════════════════════════════════════════════════
// INVOICE (4)
// ════════════════════════════════════════════════════════════════════════════

export async function createInvoiceUseCase(
  input: {
    tenantId: string; correlationId: string; actorId: string;
    organizationId: string;
    paymentIds?: string[];
    currency?: string;
    billingAddressRef?: string | null;
    shippingAddressRef?: string | null;
    taxNumber?: string | null;
    lineItems?: InvoiceLineItem[];
    dueDate?: string;
    attributes?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  },
  deps: PaymentUseCaseDeps,
): Promise<Result<{ invoiceId: string; invoiceNumber: string }, ValidationError>> {
  const v = createInvoiceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));

  const invId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const currency = d.currency ?? await deps.policyProvider.getDefaultCurrency(d.tenantId);
  const lineItems: InvoiceLineItem[] = (d.lineItems ?? []).map((l) => ({
    id: l.id,
    description: l.description,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    lineTotal: l.lineTotal,
    taxRefId: l.taxRefId ?? null,
    discountRefId: l.discountRefId ?? null,
  }));
  const subtotal = lineItems.reduce((s, l) => s + l.lineTotal, 0);
  const defaultDueDays = 30;
  const dueDate = d.dueDate ?? new Date(Date.now() + defaultDueDays * 86400000).toISOString();

  const invoice: PaymentInvoice = {
    id: invId, tenantId: d.tenantId, organizationId: d.organizationId,
    invoiceNumber: generateInvoiceNumber(deps),
    status: 'Draft',
    paymentIds: d.paymentIds ?? [],
    currency,
    subtotal, taxTotal: 0, discountTotal: 0,
    grandTotal: subtotal, paidAmount: 0, balanceDue: subtotal,
    billingAddressRef: d.billingAddressRef ?? null,
    shippingAddressRef: d.shippingAddressRef ?? null,
    taxNumber: d.taxNumber ?? null,
    lineItems,
    attributes: d.attributes ?? {}, metadata: d.metadata ?? {},
    issueDate: null, dueDate,
    createdAt: now, updatedAt: now, cancelledAt: null,
  };

  await deps.invoiceRepo.insert(invoice);
  await deps.eventBus.emit(env(deps, invId, d.tenantId, d.correlationId, 'invoice.created', 'invoice.created.v1', { invoiceId: invId, invoiceNumber: invoice.invoiceNumber }));
  await audit(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'invoice_created', { invoiceNumber: invoice.invoiceNumber });
  return Ok({ invoiceId: invId, invoiceNumber: invoice.invoiceNumber });
}

export async function updateInvoiceUseCase(
  input: {
    tenantId: string; correlationId: string; actorId: string; invoiceId: string;
    lineItems?: InvoiceLineItem[];
    billingAddressRef?: string | null;
    shippingAddressRef?: string | null;
    taxNumber?: string | null;
    dueDate?: string;
    attributes?: Record<string, unknown>;
  },
  deps: PaymentUseCaseDeps,
): Promise<Result<PaymentInvoice, ValidationError | NotFoundError | ConflictError>> {
  const v = updateInvoiceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.invoiceRepo.findById(d.tenantId, d.invoiceId);
  if (!ex) return Err(new NotFoundError('Invoice not found'));
  if (ex.status === 'Paid' || ex.status === 'Cancelled') return Err(new ConflictError(`Invoice is ${ex.status}`));

  const now = deps.clock.now().toISOString();
  const patch: Partial<PaymentInvoice> = { updatedAt: now };
  if (d.lineItems !== undefined) {
    patch.lineItems = d.lineItems as InvoiceLineItem[];
    const subtotal = d.lineItems.reduce((s, l) => s + l.lineTotal, 0);
    patch.subtotal = subtotal;
    patch.grandTotal = subtotal + ex.taxTotal - ex.discountTotal;
    patch.balanceDue = patch.grandTotal - ex.paidAmount;
  }
  if (d.billingAddressRef !== undefined) patch.billingAddressRef = d.billingAddressRef;
  if (d.shippingAddressRef !== undefined) patch.shippingAddressRef = d.shippingAddressRef;
  if (d.taxNumber !== undefined) patch.taxNumber = d.taxNumber;
  if (d.dueDate !== undefined) patch.dueDate = d.dueDate;
  if (d.attributes !== undefined) patch.attributes = d.attributes;

  await deps.invoiceRepo.update(d.tenantId, d.invoiceId, patch);
  await deps.eventBus.emit(env(deps, d.invoiceId, d.tenantId, d.correlationId, 'invoice.created', 'invoice.updated.v1', { invoiceId: d.invoiceId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'invoice_updated', {}, );
  return Ok({ ...ex, ...patch } as PaymentInvoice);
}

export async function issueInvoiceUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; invoiceId: string },
  deps: PaymentUseCaseDeps,
): Promise<Result<PaymentInvoice, ValidationError | NotFoundError | ConflictError>> {
  const ex = await deps.invoiceRepo.findById(input.tenantId, input.invoiceId);
  if (!ex) return Err(new NotFoundError('Invoice not found'));
  if (ex.status !== 'Draft') return Err(new ConflictError(`Cannot issue from ${ex.status}`));
  const now = deps.clock.now().toISOString();
  await deps.invoiceRepo.update(input.tenantId, input.invoiceId, { status: 'Issued', issueDate: now, updatedAt: now });
  await deps.eventBus.emit(env(deps, input.invoiceId, input.tenantId, input.correlationId, 'invoice.issued', 'invoice.issued.v1', { invoiceId: input.invoiceId }));
  await audit(deps, ex.organizationId, input.tenantId, input.actorId, input.correlationId, 'invoice_issued', {});
  return Ok({ ...ex, status: 'Issued', issueDate: now });
}

export async function cancelInvoiceUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; invoiceId: string; reason?: string },
  deps: PaymentUseCaseDeps,
): Promise<Result<PaymentInvoice, ValidationError | NotFoundError | ConflictError>> {
  const v = cancelInvoiceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.invoiceRepo.findById(d.tenantId, d.invoiceId);
  if (!ex) return Err(new NotFoundError('Invoice not found'));
  if (ex.status === 'Paid') return Err(new ConflictError('Cannot cancel paid invoice'));
  const now = deps.clock.now().toISOString();
  await deps.invoiceRepo.update(d.tenantId, d.invoiceId, { status: 'Cancelled', cancelledAt: now, updatedAt: now });
  await deps.eventBus.emit(env(deps, d.invoiceId, d.tenantId, d.correlationId, 'invoice.cancelled', 'invoice.cancelled.v1', { invoiceId: d.invoiceId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'invoice_cancelled', { reason: d.reason });
  return Ok({ ...ex, status: 'Cancelled', cancelledAt: now });
}

// ════════════════════════════════════════════════════════════════════════════
// RECEIPT (2)
// ════════════════════════════════════════════════════════════════════════════

export async function generateReceiptUseCase(
  input: {
    tenantId: string; correlationId: string; actorId: string;
    organizationId: string; paymentId: string;
    invoiceId?: string;
    format?: 'Email' | 'PDF' | 'Printable' | 'Localized';
    recipientEmail?: string | null;
    locale?: string;
  },
  deps: PaymentUseCaseDeps,
): Promise<Result<Receipt, ValidationError | NotFoundError>> {
  const v = generateReceiptSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const payment = await deps.paymentRepo.findById(d.tenantId, d.paymentId);
  if (!payment) return Err(new NotFoundError('Payment not found'));

  const receiptId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();

  const receipt: Receipt = {
    id: receiptId, tenantId: d.tenantId, organizationId: d.organizationId,
    receiptNumber: generateReceiptNumber(deps),
    paymentId: d.paymentId,
    invoiceId: d.invoiceId ?? null,
    format: d.format ?? 'PDF',
    recipientEmail: d.recipientEmail ?? null,
    locale: d.locale ?? 'en',
    amount: payment.grandTotal,
    currency: payment.currency,
    taxTotal: payment.taxTotal,
    content: { paymentNumber: payment.paymentNumber, description: payment.description, provider: payment.providerId },
    generatedAt: now,
  };

  await deps.receiptRepo.insert(receipt);
  await deps.eventBus.emit(env(deps, receiptId, d.tenantId, d.correlationId, 'receipt.generated', 'receipt.generated.v1', { receiptId, paymentId: d.paymentId }));
  await audit(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'receipt_generated', { receiptId }, d.paymentId);
  return Ok(receipt);
}

export async function getReceiptUseCase(
  input: { tenantId: string; receiptId: string },
  deps: PaymentUseCaseDeps,
): Promise<Result<Receipt | null, ValidationError>> {
  const v = getReceiptSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  return Ok(await deps.receiptRepo.findById(v.data.tenantId, v.data.receiptId));
}

// ════════════════════════════════════════════════════════════════════════════
// SETTLEMENT (3)
// ════════════════════════════════════════════════════════════════════════════

export async function createSettlementUseCase(
  input: {
    tenantId: string; correlationId: string; actorId: string;
    organizationId: string; providerId: string;
    currency: string; grossAmount: number; feeAmount: number; netAmount: number;
    transactionIds: string[];
    providerSettlementId?: string;
  },
  deps: PaymentUseCaseDeps,
): Promise<Result<Settlement, ValidationError>> {
  const v = createSettlementSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));

  const stlId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const settlement: Settlement = {
    id: stlId, tenantId: d.tenantId, organizationId: d.organizationId,
    settlementNumber: generateSettlementNumber(deps),
    status: 'Open',
    providerId: d.providerId,
    providerSettlementId: d.providerSettlementId ?? null,
    currency: d.currency,
    grossAmount: d.grossAmount, feeAmount: d.feeAmount, netAmount: d.netAmount,
    transactionCount: d.transactionIds.length,
    transactionIds: d.transactionIds,
    settledAt: null,
    createdAt: now, completedAt: null,
  };

  await deps.settlementRepo.insert(settlement);
  await audit(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'settlement_created', { settlementId: stlId, netAmount: d.netAmount });
  return Ok(settlement);
}

export async function completeSettlementUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; settlementId: string; providerSettlementId?: string },
  deps: PaymentUseCaseDeps,
): Promise<Result<Settlement, ValidationError | NotFoundError | ConflictError>> {
  const v = completeSettlementSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.settlementRepo.findById(d.tenantId, d.settlementId);
  if (!ex) return Err(new NotFoundError('Settlement not found'));
  if (ex.status !== 'Open') return Err(new ConflictError(`Settlement is ${ex.status}`));

  const now = deps.clock.now().toISOString();
  const patch: Partial<Settlement> = { status: 'Completed', completedAt: now, settledAt: now };
  if (d.providerSettlementId !== undefined) patch.providerSettlementId = d.providerSettlementId;
  await deps.settlementRepo.update(d.tenantId, d.settlementId, patch);

  // Transition linked payments to Settled
  for (const txnId of ex.transactionIds) {
    const txn = await deps.transactionRepo.findById(d.tenantId, txnId);
    if (txn) {
      const payment = await deps.paymentRepo.findById(d.tenantId, txn.paymentId);
      if (payment && payment.status === 'Captured') {
        await deps.paymentRepo.update(d.tenantId, payment.id, { status: 'Settled', settledAt: now, updatedAt: now });
      }
    }
  }

  await deps.eventBus.emit(env(deps, d.settlementId, d.tenantId, d.correlationId, 'settlement.completed', 'settlement.completed.v1', { settlementId: d.settlementId, netAmount: ex.netAmount }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'settlement_completed', { settlementId: d.settlementId });
  return Ok({ ...ex, ...patch } as Settlement);
}

export async function listSettlementsUseCase(
  input: { tenantId: string; organizationId?: string; limit?: number; offset?: number },
  deps: PaymentUseCaseDeps,
): Promise<Result<Settlement[], ValidationError>> {
  const v = listSettlementsSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const list = await deps.settlementRepo.findByOrganization(d.tenantId, d.organizationId ?? '');
  const offset = d.offset ?? 0;
  const limit = d.limit ?? 20;
  return Ok(list.slice(offset, offset + limit));
}
