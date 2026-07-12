/**
 * Payment Engine — Validation Schemas (zod)
 */

import { z } from '@platform/core-sdk';

// ── Enums ──────────────────────────────

export const paymentStatusSchema = z.enum([
  'Draft', 'Pending', 'Authorized', 'Captured',
  'Settled', 'Refunded', 'Cancelled', 'Failed', 'Expired',
]);

export const invoiceStatusSchema = z.enum([
  'Draft', 'Issued', 'Paid', 'Cancelled', 'Void',
]);

export const settlementStatusSchema = z.enum([
  'Open', 'Completed', 'Failed',
]);

export const refundStatusSchema = z.enum([
  'Pending', 'Completed', 'Failed',
]);

export const paymentMethodStatusSchema = z.enum([
  'Active', 'Archived',
]);

export const webhookStatusSchema = z.enum([
  'Received', 'Processed', 'Failed', 'Replayed',
]);

export const taxTypeSchema = z.enum([
  'VAT', 'GST', 'SalesTax', 'Custom',
]);

// ── Sub-objects ────────────────────────

const moneySchema = z.object({
  amount: z.number(),
  currencyCode: z.string().length(3).regex(/^[A-Z]{3}$/),
});

const taxBreakdownSchema = z.object({
  taxType: taxTypeSchema,
  taxRate: z.number().min(0),
  taxAmount: z.number(),
  taxLabel: z.string().min(1).max(100),
});

const referenceSchema = z.object({
  refType: z.string().min(1).max(100),
  refId: z.string().min(1).max(128),
  metadata: z.record(z.unknown()).optional(),
});

const invoiceLineItemSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1).max(500),
  quantity: z.number().int().min(1),
  unitPrice: z.number(),
  lineTotal: z.number(),
  taxRefId: z.string().nullable().optional(),
  discountRefId: z.string().nullable().optional(),
});

// ── Common actor fields ────────────────

const actor = {
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
};

// ── Payment ────────────────────────────

export const createPaymentSchema = z.object({
  ...actor,
  organizationId: z.string().min(1),
  type: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  currency: z.string().length(3).regex(/^[A-Z]{3}$/).optional(),
  providerId: z.string().min(1).max(100),
  paymentMethodId: z.string().min(1).max(128).optional(),
  taxBreakdowns: z.array(taxBreakdownSchema).optional(),
  discountTotal: z.number().min(0).optional(),
  references: z.array(referenceSchema).optional(),
  attributes: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

export const simplePaymentActionSchema = z.object({
  ...actor,
  paymentId: z.string().min(1),
});

export const cancelPaymentSchema = z.object({
  ...actor,
  paymentId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export const refundPaymentSchema = z.object({
  ...actor,
  paymentId: z.string().min(1),
  amount: z.number().positive(),
  reason: z.string().max(500),
});

export const getPaymentSchema = z.object({
  tenantId: z.string().min(1),
  paymentId: z.string().min(1),
});

export const searchPaymentsSchema = z.object({
  tenantId: z.string().min(1),
  organizationId: z.string().optional(),
  query: z.string().max(200).optional(),
  type: z.string().max(100).optional(),
  status: paymentStatusSchema.optional(),
  providerId: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'paymentNumber', 'grandTotal']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// ── Invoice ────────────────────────────

export const createInvoiceSchema = z.object({
  ...actor,
  organizationId: z.string().min(1),
  paymentIds: z.array(z.string().min(1)).optional(),
  currency: z.string().length(3).regex(/^[A-Z]{3}$/).optional(),
  billingAddressRef: z.string().min(1).nullable().optional(),
  shippingAddressRef: z.string().min(1).nullable().optional(),
  taxNumber: z.string().max(100).nullable().optional(),
  lineItems: z.array(invoiceLineItemSchema).optional(),
  dueDate: z.string().optional(),
  attributes: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateInvoiceSchema = z.object({
  ...actor,
  invoiceId: z.string().min(1),
  lineItems: z.array(invoiceLineItemSchema).optional(),
  billingAddressRef: z.string().min(1).nullable().optional(),
  shippingAddressRef: z.string().min(1).nullable().optional(),
  taxNumber: z.string().max(100).nullable().optional(),
  dueDate: z.string().optional(),
  attributes: z.record(z.unknown()).optional(),
});

export const cancelInvoiceSchema = z.object({
  ...actor,
  invoiceId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

// ── Receipt ────────────────────────────

export const generateReceiptSchema = z.object({
  ...actor,
  organizationId: z.string().min(1),
  paymentId: z.string().min(1),
  invoiceId: z.string().min(1).optional(),
  format: z.enum(['Email', 'PDF', 'Printable', 'Localized']).optional(),
  recipientEmail: z.string().email().nullable().optional(),
  locale: z.string().max(10).optional(),
});

export const getReceiptSchema = z.object({
  tenantId: z.string().min(1),
  receiptId: z.string().min(1),
});

// ── Settlement ─────────────────────────

export const createSettlementSchema = z.object({
  ...actor,
  organizationId: z.string().min(1),
  providerId: z.string().min(1),
  currency: z.string().length(3).regex(/^[A-Z]{3}$/),
  grossAmount: z.number(),
  feeAmount: z.number().min(0),
  netAmount: z.number(),
  transactionIds: z.array(z.string().min(1)),
  providerSettlementId: z.string().min(1).optional(),
});

export const completeSettlementSchema = z.object({
  ...actor,
  settlementId: z.string().min(1),
  providerSettlementId: z.string().min(1).optional(),
});

export const listSettlementsSchema = z.object({
  tenantId: z.string().min(1),
  organizationId: z.string().optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
});

// ── Transaction ────────────────────────

export const getTransactionSchema = z.object({
  tenantId: z.string().min(1),
  transactionId: z.string().min(1),
});

export const listTransactionsSchema = z.object({
  tenantId: z.string().min(1),
  paymentId: z.string().optional(),
  organizationId: z.string().optional(),
  providerId: z.string().optional(),
  operation: z.enum(['Authorize', 'Capture', 'Void', 'Refund']).optional(),
  result: z.enum(['Approved', 'Declined', 'Pending', 'Failed']).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
});

// ── Webhook ────────────────────────────

export const receiveWebhookSchema = z.object({
  ...actor,
  organizationId: z.string().min(1),
  providerId: z.string().min(1),
  eventType: z.string().min(1).max(200),
  signature: z.string().min(1),
  payload: z.record(z.unknown()),
});

export const replayWebhookSchema = z.object({
  ...actor,
  webhookId: z.string().min(1),
});

export const verifySignatureSchema = z.object({
  tenantId: z.string().min(1),
  providerId: z.string().min(1),
  payload: z.record(z.unknown()),
  signature: z.string().min(1),
});

// ── Payment Method ─────────────────────

export const registerPaymentMethodSchema = z.object({
  ...actor,
  organizationId: z.string().min(1),
  ownerId: z.string().min(1),
  providerId: z.string().min(1),
  methodType: z.string().min(1).max(50),
  displayName: z.string().min(1).max(200),
  token: z.string().min(1),
  last4: z.string().max(4).nullable().optional(),
  expiryMonth: z.number().int().min(1).max(12).nullable().optional(),
  expiryYear: z.number().int().min(2000).max(2100).nullable().optional(),
  brand: z.string().max(50).nullable().optional(),
  isDefault: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const archivePaymentMethodSchema = z.object({
  ...actor,
  paymentMethodId: z.string().min(1),
});

export const listPaymentMethodsSchema = z.object({
  tenantId: z.string().min(1),
  organizationId: z.string().optional(),
  ownerId: z.string().optional(),
});

// ── Reconciliation ─────────────────────

export const runReconciliationSchema = z.object({
  ...actor,
  organizationId: z.string().min(1),
  providerId: z.string().min(1),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  expectedAmount: z.number(),
  actualAmount: z.number(),
});

// ── Reference ──────────────────────────

export const attachReferenceSchema = z.object({
  ...actor,
  paymentId: z.string().min(1),
  refType: z.string().min(1).max(100),
  refId: z.string().min(1).max(128),
  metadata: z.record(z.unknown()).optional(),
});
