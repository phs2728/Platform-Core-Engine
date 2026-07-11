/**
 * Billing Engine — Invoice Lifecycle + Lines + Adjustment + Credit + Billing UseCases (20)
 *
 * 8-state machine: Draft→Issued→Open→PartiallyPaid→Paid→Closed (+Cancelled/Voided)
 */

import {
  Ok, Err, type Result,
  ValidationError, ConflictError, NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';
import {
  createInvoiceSchema, updateInvoiceSchema, cancelInvoiceSchema, voidInvoiceSchema,
  simpleInvoiceActionSchema, searchInvoicesSchema,
  addInvoiceLineSchema, removeInvoiceLineSchema, updateInvoiceLineSchema,
  addAdjustmentSchema, removeAdjustmentSchema,
  issueCreditMemoSchema, applyCreditSchema,
  generateBillingSchema,
} from '../domain/validation.js';
import { validateInvoiceStatusTransition, isInvoiceMutable } from '../domain/statusTransition.js';
import type { BillingUseCaseDeps } from './types.js';
import type {
  Invoice, InvoiceLine, Adjustment, CreditMemo, Money,
  InvoiceSearchCriteria, InvoiceSearchResult, BillingTimelineEntry, InvoiceStatus,
} from '../interfaces/index.js';

function env(deps: BillingUseCaseDeps, agg: string, tenant: string, corr: string, eventType: string, schemaRef: string, payload: unknown): EventEnvelope<unknown> {
  return {
    eventId: deps.idGenerator.generate(), aggregateId: agg, occurredAt: deps.clock.now().toISOString(),
    version: '1.0.0', tenantId: tenant, correlationId: corr, causationId: '',
    engine: 'billing', eventType, schemaRef, payload,
  };
}

async function appendTimeline(deps: BillingUseCaseDeps, tenantId: string, invoiceId: string, actorId: string, eventType: string, description: string, meta?: Record<string, unknown>) {
  const entry: BillingTimelineEntry = {
    id: deps.idGenerator.generate(), tenantId, invoiceId,
    eventType, actorId, description, metadata: meta ?? {},
    createdAt: deps.clock.now().toISOString(),
  };
  await deps.timelineRepo.insert(entry);
}

async function audit(deps: BillingUseCaseDeps, orgId: string, tenantId: string, actorId: string, corr: string, eventType: string, meta: Record<string, unknown>, invoiceId?: string) {
  const rec: Record<string, unknown> = { organizationId: orgId, tenantId, actorId, correlationId: corr, eventType, metadata: meta };
  if (invoiceId !== undefined) rec.invoiceId = invoiceId;
  await deps.auditRepo.insert(rec as Parameters<typeof deps.auditRepo.insert>[0]);
}

let invoiceSeq = 0;
function generateInvoiceNumber(deps: BillingUseCaseDeps): string {
  invoiceSeq += 1;
  const date = deps.clock.now().toISOString().slice(0, 10).replace(/-/g, '');
  return `INV-${date}-${String(invoiceSeq).padStart(6, '0')}`;
}

function recalcTotals(inv: Invoice): void {
  inv.subtotal = 0; inv.taxTotal = 0; inv.discountTotal = 0; inv.adjustmentTotal = 0;
  // Totals are managed by lines + adjustments — recalculated by caller
  inv.grandTotal = inv.subtotal + inv.taxTotal + inv.adjustmentTotal - inv.discountTotal;
  inv.balanceDue = inv.grandTotal - inv.paidAmount;
}

// ════════════════════════════════════════════════════════════════════════════
// INVOICE LIFECYCLE (10)
// ════════════════════════════════════════════════════════════════════════════

export interface CreateInvoiceInput {
  tenantId: string; correlationId: string; actorId: string;
  organizationId: string;
  type: string; title: string;
  description?: string; currency?: string; dueDate?: string;
  attributes?: Record<string, unknown>;
  customFields?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export async function createInvoiceUseCase(
  input: CreateInvoiceInput, deps: BillingUseCaseDeps,
): Promise<Result<{ invoiceId: string; invoiceNumber: string; createdAt: string }, ValidationError | ConflictError>> {
  const v = createInvoiceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));

  const allowedTypes = await deps.policyProvider.getAllowedInvoiceTypes(d.tenantId);
  if (!allowedTypes.includes(d.type)) return Err(new ValidationError(`type "${d.type}" not allowed`));

  const pr = await deps.policyProvider.validateAttributes(d.tenantId, d.type, d.attributes ?? {});
  if (!pr.ok) return Err(new ValidationError('CustomDataPolicy rejected'));

  const maxInv = await deps.policyProvider.getMaxInvoicesPerOrg(d.tenantId);
  if (await deps.invoiceRepo.countByOrganization(d.tenantId, d.organizationId) >= maxInv) {
    return Err(new ConflictError(`Max invoices (${maxInv}) reached`));
  }

  const invId = deps.idGenerator.generate();
  const invNumber = generateInvoiceNumber(deps);
  const now = deps.clock.now().toISOString();
  const currency = d.currency ?? await deps.policyProvider.getDefaultCurrency(d.tenantId);
  const defaultDueDays = await deps.policyProvider.getDefaultDueDays(d.tenantId);
  const dueDate = d.dueDate ?? new Date(Date.now() + defaultDueDays * 86400000).toISOString();

  const invoice: Invoice = {
    id: invId, tenantId: d.tenantId, organizationId: d.organizationId,
    invoiceNumber: invNumber, status: 'Draft', type: d.type, title: d.title,
    currency,
    subtotal: 0, taxTotal: 0, discountTotal: 0, adjustmentTotal: 0,
    grandTotal: 0, paidAmount: 0, balanceDue: 0,
    dueDate, issueDate: null,
    lineIds: [], references: [],
    attributes: pr.value, customFields: d.customFields ?? {}, metadata: d.metadata ?? {},
    tags: d.tags ?? [],
    issuedAt: null, cancelledAt: null, cancelReason: null,
    voidedAt: null, voidReason: null, closedAt: null,
    createdAt: now, createdBy: d.actorId, updatedAt: now, updatedBy: d.actorId,
    archivedAt: null,
  };
  if (d.description !== undefined) invoice.description = d.description;

  await deps.invoiceRepo.insert(invoice);
  await appendTimeline(deps, d.tenantId, invId, d.actorId, 'created', `Invoice created: ${d.title}`);
  await deps.eventBus.emit(env(deps, invId, d.tenantId, d.correlationId, 'billing.created', 'billing.created.v1', { invoiceId: invId, invoiceNumber: invNumber }));
  await audit(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'invoice_created', { invoiceNumber: invNumber }, invId);
  return Ok({ invoiceId: invId, invoiceNumber: invNumber, createdAt: now });
}

export async function updateInvoiceUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; invoiceId: string;
    title?: string; description?: string; dueDate?: string;
    attributes?: Record<string, unknown>; customFields?: Record<string, unknown>; tags?: string[]; },
  deps: BillingUseCaseDeps,
): Promise<Result<Invoice, ValidationError | NotFoundError | ConflictError>> {
  const v = updateInvoiceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const ex = await deps.invoiceRepo.findById(d.tenantId, d.invoiceId);
  if (!ex) return Err(new NotFoundError('Invoice not found'));
  if (!isInvoiceMutable(ex.status)) return Err(new ConflictError(`Cannot update (status: ${ex.status})`));

  const now = deps.clock.now().toISOString();
  const patch: Partial<Invoice> = { updatedAt: now };
  if (d.title !== undefined) patch.title = d.title;
  if (d.description !== undefined) patch.description = d.description;
  if (d.dueDate !== undefined) patch.dueDate = d.dueDate;
  if (d.customFields !== undefined) patch.customFields = d.customFields;
  if (d.tags !== undefined) patch.tags = d.tags;
  if (d.attributes !== undefined) {
    const pr = await deps.policyProvider.validateAttributes(d.tenantId, ex.type, d.attributes);
    if (!pr.ok) return Err(new ValidationError('CustomDataPolicy rejected'));
    patch.attributes = pr.value;
  }
  await deps.invoiceRepo.update(d.tenantId, d.invoiceId, patch);
  await appendTimeline(deps, d.tenantId, d.invoiceId, d.actorId, 'updated', 'Invoice updated');
  await deps.eventBus.emit(env(deps, d.invoiceId, d.tenantId, d.correlationId, 'billing.updated', 'billing.updated.v1', { invoiceId: d.invoiceId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'invoice_updated', {}, d.invoiceId);
  return Ok({ ...ex, ...patch } as Invoice);
}

export async function issueInvoiceUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; invoiceId: string },
  deps: BillingUseCaseDeps,
): Promise<Result<Invoice, ValidationError | NotFoundError | ConflictError>> {
  const v = simpleInvoiceActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.invoiceRepo.findById(d.tenantId, d.invoiceId);
  if (!ex) return Err(new NotFoundError('Invoice not found'));
  const tr = validateInvoiceStatusTransition(ex.status, 'Issued');
  if (!tr.ok) return Err(new ConflictError(`Invalid transition: ${ex.status} → Issued`));

  const now = deps.clock.now().toISOString();
  await deps.invoiceRepo.update(d.tenantId, d.invoiceId, { status: 'Issued', issuedAt: now, issueDate: now, updatedAt: now });
  await appendTimeline(deps, d.tenantId, d.invoiceId, d.actorId, 'issued', 'Invoice issued');
  await deps.eventBus.emit(env(deps, d.invoiceId, d.tenantId, d.correlationId, 'invoice.issued', 'invoice.issued.v1', { invoiceId: d.invoiceId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'invoice_issued', {}, d.invoiceId);
  return Ok({ ...ex, status: 'Issued', issuedAt: now, issueDate: now });
}

export async function cancelInvoiceUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; invoiceId: string; reason?: string },
  deps: BillingUseCaseDeps,
): Promise<Result<Invoice, ValidationError | NotFoundError | ConflictError>> {
  const v = cancelInvoiceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.invoiceRepo.findById(d.tenantId, d.invoiceId);
  if (!ex) return Err(new NotFoundError('Invoice not found'));
  const tr = validateInvoiceStatusTransition(ex.status, 'Cancelled');
  if (!tr.ok) return Err(new ConflictError(`Cannot cancel from ${ex.status}`));
  const now = deps.clock.now().toISOString();
  await deps.invoiceRepo.update(d.tenantId, d.invoiceId, {
    status: 'Cancelled', cancelledAt: now, updatedAt: now,
    ...(d.reason !== undefined ? { cancelReason: d.reason } : {}),
  });
  await appendTimeline(deps, d.tenantId, d.invoiceId, d.actorId, 'cancelled', d.reason ?? 'Cancelled');
  await deps.eventBus.emit(env(deps, d.invoiceId, d.tenantId, d.correlationId, 'invoice.cancelled', 'invoice.cancelled.v1', { invoiceId: d.invoiceId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'invoice_cancelled', { reason: d.reason }, d.invoiceId);
  return Ok({ ...ex, status: 'Cancelled', cancelledAt: now });
}

export async function voidInvoiceUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; invoiceId: string; reason?: string },
  deps: BillingUseCaseDeps,
): Promise<Result<Invoice, ValidationError | NotFoundError | ConflictError>> {
  const v = voidInvoiceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.invoiceRepo.findById(d.tenantId, d.invoiceId);
  if (!ex) return Err(new NotFoundError('Invoice not found'));
  const tr = validateInvoiceStatusTransition(ex.status, 'Voided');
  if (!tr.ok) return Err(new ConflictError(`Cannot void from ${ex.status}`));
  const now = deps.clock.now().toISOString();
  await deps.invoiceRepo.update(d.tenantId, d.invoiceId, {
    status: 'Voided', voidedAt: now, updatedAt: now,
    ...(d.reason !== undefined ? { voidReason: d.reason } : {}),
  });
  await appendTimeline(deps, d.tenantId, d.invoiceId, d.actorId, 'voided', d.reason ?? 'Voided');
  await deps.eventBus.emit(env(deps, d.invoiceId, d.tenantId, d.correlationId, 'invoice.voided', 'invoice.voided.v1', { invoiceId: d.invoiceId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'invoice_voided', { reason: d.reason }, d.invoiceId);
  return Ok({ ...ex, status: 'Voided', voidedAt: now });
}

export async function archiveInvoiceUseCase(input: { tenantId: string; correlationId: string; actorId: string; invoiceId: string }, deps: BillingUseCaseDeps) {
  const v = simpleInvoiceActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.invoiceRepo.findById(d.tenantId, d.invoiceId);
  if (!ex) return Err(new NotFoundError('Invoice not found'));
  if (ex.archivedAt !== null) return Err(new ConflictError('Already archived'));
  const now = deps.clock.now().toISOString();
  await deps.invoiceRepo.update(d.tenantId, d.invoiceId, { archivedAt: now });
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'invoice_archived', {}, d.invoiceId);
  return Ok({ ...ex, archivedAt: now });
}

export async function restoreInvoiceUseCase(input: { tenantId: string; correlationId: string; actorId: string; invoiceId: string }, deps: BillingUseCaseDeps) {
  const v = simpleInvoiceActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.invoiceRepo.findById(d.tenantId, d.invoiceId);
  if (!ex) return Err(new NotFoundError('Invoice not found'));
  if (ex.archivedAt === null) return Err(new ConflictError('Not archived'));
  await deps.invoiceRepo.update(d.tenantId, d.invoiceId, { archivedAt: null });
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'invoice_restored', {}, d.invoiceId);
  return Ok({ ...ex, archivedAt: null });
}

export async function getInvoiceUseCase(input: { tenantId: string; invoiceId: string }, deps: BillingUseCaseDeps): Promise<Result<Invoice | null, ValidationError>> {
  return Ok(await deps.invoiceRepo.findById(input.tenantId, input.invoiceId));
}

export async function searchInvoicesUseCase(input: InvoiceSearchCriteria, deps: BillingUseCaseDeps): Promise<Result<InvoiceSearchResult, ValidationError>> {
  const v = searchInvoicesSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid search'));
  return Ok(await deps.invoiceRepo.search(v.data as InvoiceSearchCriteria));
}

export async function listInvoicesUseCase(input: { tenantId: string; organizationId: string; limit?: number; offset?: number }, deps: BillingUseCaseDeps): Promise<Result<InvoiceSearchResult, ValidationError>> {
  return Ok(await deps.invoiceRepo.search({
    tenantId: input.tenantId, organizationId: input.organizationId,
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
    ...(input.offset !== undefined ? { offset: input.offset } : {}),
  }));
}

// ════════════════════════════════════════════════════════════════════════════
// INVOICE LINES (3)
// ════════════════════════════════════════════════════════════════════════════

export async function addInvoiceLineUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; invoiceId: string;
    resourceType: string; resourceId: string; description: string; quantity: number;
    unitPrice: Money; taxRefId?: string | null; discountRefId?: string | null;
    attributes?: Record<string, unknown>; },
  deps: BillingUseCaseDeps,
): Promise<Result<InvoiceLine, ValidationError | NotFoundError | ConflictError>> {
  const v = addInvoiceLineSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const inv = await deps.invoiceRepo.findById(d.tenantId, d.invoiceId);
  if (!inv) return Err(new NotFoundError('Invoice not found'));
  if (!isInvoiceMutable(inv.status)) return Err(new ConflictError(`Invoice not mutable (status: ${inv.status})`));

  const lines = await deps.lineRepo.findByInvoice(d.tenantId, d.invoiceId);
  const lineNo = lines.length + 1;
  const lineId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const lineTotal: Money = { amount: d.unitPrice.amount * d.quantity, currencyCode: d.unitPrice.currencyCode };

  const line: InvoiceLine = {
    id: lineId, tenantId: d.tenantId, invoiceId: d.invoiceId, lineNo,
    resourceType: d.resourceType, resourceId: d.resourceId,
    description: d.description, quantity: d.quantity,
    unitPrice: d.unitPrice, lineTotal,
    taxRefId: d.taxRefId ?? null, discountRefId: d.discountRefId ?? null,
    attributes: d.attributes ?? {}, createdAt: now, updatedAt: now,
  };
  await deps.lineRepo.insert(line);

  // Update invoice subtotal + totals
  const newSubtotal = inv.subtotal + lineTotal.amount;
  const newGrandTotal = newSubtotal + inv.taxTotal + inv.adjustmentTotal - inv.discountTotal;
  await deps.invoiceRepo.update(d.tenantId, d.invoiceId, {
    subtotal: newSubtotal, grandTotal: newGrandTotal,
    balanceDue: newGrandTotal - inv.paidAmount,
    lineIds: [...inv.lineIds, lineId], updatedAt: now,
  });

  await appendTimeline(deps, d.tenantId, d.invoiceId, d.actorId, 'line_added', `Line added: ${d.description}`);
  await deps.eventBus.emit(env(deps, d.invoiceId, d.tenantId, d.correlationId, 'billing.updated', 'billing.line.added.v1', { lineId, lineNo }));
  await audit(deps, inv.organizationId, d.tenantId, d.actorId, d.correlationId, 'line_added', { lineId, description: d.description }, d.invoiceId);
  return Ok(line);
}

export async function removeInvoiceLineUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; lineId: string },
  deps: BillingUseCaseDeps,
): Promise<Result<{ lineId: string }, ValidationError | NotFoundError>> {
  const v = removeInvoiceLineSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const line = await deps.lineRepo.findById(d.tenantId, d.lineId);
  if (!line) return Err(new NotFoundError('Line not found'));
  await deps.lineRepo.remove(d.tenantId, d.lineId);

  // Recalculate invoice
  const inv = await deps.invoiceRepo.findById(d.tenantId, line.invoiceId);
  if (inv) {
    const newSubtotal = inv.subtotal - line.lineTotal.amount;
    const newGrandTotal = newSubtotal + inv.taxTotal + inv.adjustmentTotal - inv.discountTotal;
    await deps.invoiceRepo.update(d.tenantId, inv.id, {
      subtotal: newSubtotal, grandTotal: newGrandTotal,
      balanceDue: newGrandTotal - inv.paidAmount,
      lineIds: inv.lineIds.filter((id) => id !== d.lineId),
      updatedAt: deps.clock.now().toISOString(),
    });
  }
  await appendTimeline(deps, d.tenantId, line.invoiceId, d.actorId, 'line_removed', `Line removed: ${line.description}`);
  await deps.eventBus.emit(env(deps, line.invoiceId, d.tenantId, d.correlationId, 'billing.updated', 'billing.line.removed.v1', { lineId: d.lineId }));
  await audit(deps, '', d.tenantId, d.actorId, d.correlationId, 'line_removed', { lineId: d.lineId }, line.invoiceId);
  return Ok({ lineId: d.lineId });
}

export async function updateInvoiceLineUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; lineId: string;
    description?: string; quantity?: number; unitPrice?: Money;
    attributes?: Record<string, unknown>; },
  deps: BillingUseCaseDeps,
): Promise<Result<InvoiceLine, ValidationError | NotFoundError>> {
  const v = updateInvoiceLineSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.lineRepo.findById(d.tenantId, d.lineId);
  if (!ex) return Err(new NotFoundError('Line not found'));
  const now = deps.clock.now().toISOString();
  const patch: Partial<InvoiceLine> = { updatedAt: now };
  if (d.description !== undefined) patch.description = d.description;
  if (d.quantity !== undefined) patch.quantity = d.quantity;
  if (d.unitPrice !== undefined) {
    patch.unitPrice = d.unitPrice;
    patch.lineTotal = { amount: d.unitPrice.amount * (d.quantity ?? ex.quantity), currencyCode: d.unitPrice.currencyCode };
  }
  if (d.attributes !== undefined) patch.attributes = d.attributes;
  await deps.lineRepo.update(d.tenantId, d.lineId, patch);
  return Ok({ ...ex, ...patch });
}

// ════════════════════════════════════════════════════════════════════════════
// ADJUSTMENT (2)
// ════════════════════════════════════════════════════════════════════════════

export async function addAdjustmentUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; invoiceId: string;
    adjustmentType: Adjustment['adjustmentType']; name: string; amount: Money; reason: string;
    referenceType?: string | null; referenceId?: string | null;
    attributes?: Record<string, unknown>; },
  deps: BillingUseCaseDeps,
): Promise<Result<Adjustment, ValidationError | NotFoundError | ConflictError>> {
  const v = addAdjustmentSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const inv = await deps.invoiceRepo.findById(d.tenantId, d.invoiceId);
  if (!inv) return Err(new NotFoundError('Invoice not found'));
  if (!isInvoiceMutable(inv.status)) return Err(new ConflictError(`Invoice not mutable`));

  const adjId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const adj: Adjustment = {
    id: adjId, tenantId: d.tenantId, invoiceId: d.invoiceId,
    adjustmentType: d.adjustmentType, name: d.name, amount: d.amount, reason: d.reason,
    referenceType: d.referenceType ?? null, referenceId: d.referenceId ?? null,
    attributes: d.attributes ?? {}, createdAt: now,
  };
  await deps.adjustmentRepo.insert(adj);

  // Update invoice adjustment total + grand total
  const delta = d.adjustmentType === 'deduction' || d.adjustmentType === 'discount_ref' ? -d.amount.amount : d.amount.amount;
  const newAdjTotal = inv.adjustmentTotal + delta;
  const newGrandTotal = inv.subtotal + inv.taxTotal + newAdjTotal - inv.discountTotal;
  await deps.invoiceRepo.update(d.tenantId, d.invoiceId, {
    adjustmentTotal: newAdjTotal, grandTotal: newGrandTotal,
    balanceDue: newGrandTotal - inv.paidAmount, updatedAt: now,
  });

  await appendTimeline(deps, d.tenantId, d.invoiceId, d.actorId, 'adjustment', `Adjustment: ${d.name} (${d.adjustmentType})`);
  await deps.eventBus.emit(env(deps, d.invoiceId, d.tenantId, d.correlationId, 'adjustment.created', 'adjustment.created.v1', { adjustmentId: adjId }));
  await audit(deps, inv.organizationId, d.tenantId, d.actorId, d.correlationId, 'adjustment_created', { adjustmentId: adjId, name: d.name }, d.invoiceId);
  return Ok(adj);
}

export async function removeAdjustmentUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; adjustmentId: string },
  deps: BillingUseCaseDeps,
): Promise<Result<{ adjustmentId: string }, ValidationError | NotFoundError>> {
  const v = removeAdjustmentSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const adj = await deps.adjustmentRepo.findById(d.tenantId, d.adjustmentId);
  if (!adj) return Err(new NotFoundError('Adjustment not found'));
  await deps.adjustmentRepo.remove(d.tenantId, d.adjustmentId);
  await appendTimeline(deps, d.tenantId, adj.invoiceId, d.actorId, 'adjustment_removed', `Adjustment removed: ${adj.name}`);
  await audit(deps, '', d.tenantId, d.actorId, d.correlationId, 'adjustment_removed', { adjustmentId: d.adjustmentId }, adj.invoiceId);
  return Ok({ adjustmentId: d.adjustmentId });
}

// ════════════════════════════════════════════════════════════════════════════
// CREDIT MEMO (2)
// ════════════════════════════════════════════════════════════════════════════

let creditSeq = 0;

export async function issueCreditMemoUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; organizationId: string;
    invoiceId?: string | null; amount: Money; reason: string; attributes?: Record<string, unknown>; },
  deps: BillingUseCaseDeps,
): Promise<Result<CreditMemo, ValidationError | NotFoundError>> {
  const v = issueCreditMemoSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));

  creditSeq += 1;
  const creditId = deps.idGenerator.generate();
  const creditNumber = `CM-${deps.clock.now().toISOString().slice(0,10).replace(/-/g,'')}-${String(creditSeq).padStart(6,'0')}`;
  const now = deps.clock.now().toISOString();

  const memo: CreditMemo = {
    id: creditId, tenantId: d.tenantId, organizationId: d.organizationId,
    invoiceId: d.invoiceId ?? null, creditNumber,
    status: 'Issued', amount: d.amount, reason: d.reason,
    appliedAmount: 0, appliedInvoiceId: null,
    attributes: d.attributes ?? {}, createdAt: now, appliedAt: null,
  };
  await deps.creditRepo.insert(memo);
  await deps.eventBus.emit(env(deps, creditId, d.tenantId, d.correlationId, 'credit.issued', 'credit.issued.v1', { creditMemoId: creditId, creditNumber }));
  await audit(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'credit_issued', { creditMemoId: creditId, amount: d.amount.amount });
  return Ok(memo);
}

export async function applyCreditUseCase(
  input: { tenantId: string; correlationId: string; actorId: string;
    creditMemoId: string; invoiceId: string; amount: number },
  deps: BillingUseCaseDeps,
): Promise<Result<CreditMemo, ValidationError | NotFoundError | ConflictError>> {
  const v = applyCreditSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const memo = await deps.creditRepo.findById(d.tenantId, d.creditMemoId);
  if (!memo) return Err(new NotFoundError('Credit memo not found'));
  if (memo.status !== 'Issued') return Err(new ConflictError('Credit memo not available'));
  const remaining = memo.amount.amount - memo.appliedAmount;
  if (d.amount > remaining) return Err(new ConflictError('Insufficient credit'));

  const inv = await deps.invoiceRepo.findById(d.tenantId, d.invoiceId);
  if (!inv) return Err(new NotFoundError('Invoice not found'));

  const now = deps.clock.now().toISOString();
  const newAppliedAmount = memo.appliedAmount + d.amount;
  const newStatus = newAppliedAmount >= memo.amount.amount ? 'Applied' : 'Issued';

  await deps.creditRepo.update(d.tenantId, d.creditMemoId, {
    appliedAmount: newAppliedAmount,
    appliedInvoiceId: d.invoiceId,
    ...(newStatus === 'Applied' ? { status: 'Applied', appliedAt: now } : {}),
  });

  // Update invoice paid amount
  const newPaidAmount = inv.paidAmount + d.amount;
  const newBalance = inv.grandTotal - newPaidAmount;
  const newStatus2: InvoiceStatus = newBalance <= 0 ? 'Paid' : 'PartiallyPaid';
  await deps.invoiceRepo.update(d.tenantId, d.invoiceId, {
    paidAmount: newPaidAmount, balanceDue: Math.max(0, newBalance),
    ...(validateInvoiceStatusTransition(inv.status, newStatus2).ok ? { status: newStatus2 } : {}),
    updatedAt: now,
  });

  await appendTimeline(deps, d.tenantId, d.invoiceId, d.actorId, 'credit_applied', `Credit applied: ${memo.creditNumber} (${d.amount})`);
  await audit(deps, memo.organizationId, d.tenantId, d.actorId, d.correlationId, 'credit_applied', { creditMemoId: d.creditMemoId, amount: d.amount }, d.invoiceId);
  return Ok({ ...memo, appliedAmount: newAppliedAmount, appliedInvoiceId: d.invoiceId, ...(newStatus === 'Applied' ? { status: 'Applied' as const, appliedAt: now } : {}) });
}

// ════════════════════════════════════════════════════════════════════════════
// BILLING (2)
// ════════════════════════════════════════════════════════════════════════════

export async function generateBillingUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; organizationId: string; invoiceIds: string[] },
  deps: BillingUseCaseDeps,
): Promise<Result<{ billingId: string; invoiceCount: number; totalAmount: number }, ValidationError | NotFoundError>> {
  const v = generateBillingSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;

  let totalAmount = 0;
  for (const invId of d.invoiceIds) {
    const inv = await deps.invoiceRepo.findById(d.tenantId, invId);
    if (!inv) return Err(new NotFoundError(`Invoice ${invId} not found`));
    totalAmount += inv.balanceDue;
  }

  const billingId = deps.idGenerator.generate();
  await appendTimeline(deps, d.tenantId, d.invoiceIds[0]!, d.actorId, 'billing_generated', `Billing generated: ${d.invoiceIds.length} invoices, total ${totalAmount}`);
  await deps.eventBus.emit(env(deps, billingId, d.tenantId, d.correlationId, 'billing.created', 'billing.generated.v1', { billingId, invoiceCount: d.invoiceIds.length, totalAmount }));
  await audit(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'billing_generated', { billingId, invoiceCount: d.invoiceIds.length, totalAmount });
  return Ok({ billingId, invoiceCount: d.invoiceIds.length, totalAmount });
}

export async function closeBillingUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; invoiceId: string },
  deps: BillingUseCaseDeps,
): Promise<Result<Invoice, ValidationError | NotFoundError | ConflictError>> {
  const v = simpleInvoiceActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.invoiceRepo.findById(d.tenantId, d.invoiceId);
  if (!ex) return Err(new NotFoundError('Invoice not found'));
  const tr = validateInvoiceStatusTransition(ex.status, 'Closed');
  if (!tr.ok) return Err(new ConflictError(`Cannot close from ${ex.status}`));

  const now = deps.clock.now().toISOString();
  await deps.invoiceRepo.update(d.tenantId, d.invoiceId, { status: 'Closed', closedAt: now, updatedAt: now });
  await appendTimeline(deps, d.tenantId, d.invoiceId, d.actorId, 'closed', 'Invoice closed');
  await deps.eventBus.emit(env(deps, d.invoiceId, d.tenantId, d.correlationId, 'invoice.closed', 'invoice.closed.v1', { invoiceId: d.invoiceId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'invoice_closed', {}, d.invoiceId);
  return Ok({ ...ex, status: 'Closed', closedAt: now });
}
