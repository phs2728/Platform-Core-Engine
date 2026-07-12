/**
 * Billing Engine — Validation Schemas (zod)
 */
import { z } from '@platform/core-sdk';

export const invoiceStatusSchema = z.enum([
  'Draft', 'Issued', 'Open', 'PartiallyPaid', 'Paid', 'Closed', 'Cancelled', 'Voided',
]);

const moneySchema = z.object({
  amount: z.number(),
  currencyCode: z.string().length(3).regex(/^[A-Z]{3}$/),
});

export const createInvoiceSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  organizationId: z.string().min(1),
  type: z.string().min(1).max(100),
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  currency: z.string().length(3).regex(/^[A-Z]{3}$/).optional(),
  dueDate: z.string().optional(),
  attributes: z.record(z.unknown()).optional(),
  customFields: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateInvoiceSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  invoiceId: z.string().min(1),
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(2000).optional(),
  dueDate: z.string().optional(),
  attributes: z.record(z.unknown()).optional(),
  customFields: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

export const cancelInvoiceSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  invoiceId: z.string().min(1), reason: z.string().max(500).optional(),
});

export const voidInvoiceSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  invoiceId: z.string().min(1), reason: z.string().max(500).optional(),
});

export const simpleInvoiceActionSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  invoiceId: z.string().min(1),
});

export const getInvoiceSchema = z.object({
  tenantId: z.string().min(1), invoiceId: z.string().min(1),
});

export const searchInvoicesSchema = z.object({
  tenantId: z.string().min(1),
  organizationId: z.string().optional(),
  query: z.string().max(200).optional(),
  type: z.string().max(100).optional(),
  status: invoiceStatusSchema.optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'invoiceNumber', 'dueDate']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const addInvoiceLineSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  invoiceId: z.string().min(1),
  resourceType: z.string().min(1).max(100),
  resourceId: z.string().min(1).max(128),
  description: z.string().min(1).max(500),
  quantity: z.number().int().min(1),
  unitPrice: moneySchema,
  taxRefId: z.string().min(1).nullable().optional(),
  discountRefId: z.string().min(1).nullable().optional(),
  attributes: z.record(z.unknown()).optional(),
});

export const removeInvoiceLineSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  lineId: z.string().min(1),
});

export const updateInvoiceLineSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  lineId: z.string().min(1),
  description: z.string().max(500).optional(),
  quantity: z.number().int().min(1).optional(),
  unitPrice: moneySchema.optional(),
  attributes: z.record(z.unknown()).optional(),
});

export const addAdjustmentSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  invoiceId: z.string().min(1),
  adjustmentType: z.enum(['surcharge', 'deduction', 'correction', 'fee', 'tax_ref', 'discount_ref']),
  name: z.string().min(1).max(200),
  amount: moneySchema,
  reason: z.string().max(500),
  referenceType: z.string().max(100).nullable().optional(),
  referenceId: z.string().max(128).nullable().optional(),
  attributes: z.record(z.unknown()).optional(),
});

export const removeAdjustmentSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  adjustmentId: z.string().min(1),
});

export const issueCreditMemoSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  organizationId: z.string().min(1),
  invoiceId: z.string().min(1).nullable().optional(),
  amount: moneySchema,
  reason: z.string().max(500),
  attributes: z.record(z.unknown()).optional(),
});

export const applyCreditSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  creditMemoId: z.string().min(1),
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
});

export const attachReferenceSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  invoiceId: z.string().min(1),
  refType: z.string().min(1).max(100),
  refId: z.string().min(1).max(128),
  metadata: z.record(z.unknown()).optional(),
});

export const appendTimelineSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  invoiceId: z.string().min(1),
  eventType: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  metadata: z.record(z.unknown()).optional(),
});

export const generateBillingSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  organizationId: z.string().min(1),
  invoiceIds: z.array(z.string().min(1)).min(1),
});

export const getTimelineSchema = z.object({
  tenantId: z.string().min(1), invoiceId: z.string().min(1),
  limit: z.number().int().min(1).max(1000).optional(),
});
