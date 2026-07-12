/**
 * Billing Engine — Sprint 1 Tests
 *
 * Covers all 20 use cases: Invoice lifecycle, Lines, Adjustments,
 * Credit Memos, References/Timeline, Billing generation/close.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInvoiceUseCase, updateInvoiceUseCase,
  issueInvoiceUseCase, cancelInvoiceUseCase, voidInvoiceUseCase,
  archiveInvoiceUseCase, restoreInvoiceUseCase,
  getInvoiceUseCase, searchInvoicesUseCase, listInvoicesUseCase,
  addInvoiceLineUseCase, removeInvoiceLineUseCase, updateInvoiceLineUseCase,
  addAdjustmentUseCase, removeAdjustmentUseCase,
  issueCreditMemoUseCase, applyCreditUseCase,
  generateBillingUseCase, closeBillingUseCase,
  attachOrderRefUseCase, attachPricingRefUseCase, attachOrganizationRefUseCase,
  appendTimelineUseCase, getTimelineUseCase,
} from '../src/index.js';
import { makeDeps } from './helpers.js';

// ═══════════════════════════════════════════
// 1) Invoice Lifecycle (10)
// ═══════════════════════════════════════════

describe('Invoice Lifecycle', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('creates invoice with required fields', async () => {
    const r = await createInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', type: 'standard', title: 'Test Invoice' },
      deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.invoiceId).toBeTruthy();
      expect(r.value.invoiceNumber).toMatch(/^INV-/);
    }
    expect(deps.eventBus.countByType('billing.created')).toBe(1);
  });

  it('creates invoice with full attributes', async () => {
    const r = await createInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', type: 'standard', title: 'Full',
        description: 'Desc', currency: 'EUR', dueDate: '2026-08-01',
        attributes: { dept: 'sales' }, customFields: { ref: 'X1' },
        tags: ['urgent'] },
      deps);
    expect(r.ok).toBe(true);
  });

  it('rejects unknown organization', async () => {
    const r = await createInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'unknown', type: 'standard', title: 'X' },
      deps);
    expect(r.ok).toBe(false);
  });

  it('rejects disallowed type by policy', async () => {
    const r = await createInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', type: 'forbidden', title: 'X' },
      deps);
    expect(r.ok).toBe(false);
  });

  it('updates invoice title and attributes', async () => {
    const c = await createInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', type: 'standard', title: 'Old' }, deps);
    if (!c.ok) throw new Error('setup');
    const r = await updateInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        invoiceId: c.value.invoiceId, title: 'New', tags: ['updated'] }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.title).toBe('New');
  });

  it('issues invoice (Draft → Issued)', async () => {
    const c = await createInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', type: 'standard', title: 'X' }, deps);
    if (!c.ok) throw new Error('setup');
    const r = await issueInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        invoiceId: c.value.invoiceId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.status).toBe('Issued');
    expect(deps.eventBus.countByType('invoice.issued')).toBe(1);
  });

  it('cancels invoice with reason', async () => {
    const c = await createInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', type: 'standard', title: 'X' }, deps);
    if (!c.ok) throw new Error('setup');
    const r = await cancelInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        invoiceId: c.value.invoiceId, reason: 'Customer request' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.status).toBe('Cancelled');
  });

  it('voids issued invoice', async () => {
    const c = await createInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', type: 'standard', title: 'X' }, deps);
    if (!c.ok) throw new Error('setup');
    await issueInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        invoiceId: c.value.invoiceId }, deps);
    const r = await voidInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        invoiceId: c.value.invoiceId, reason: 'Error' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.status).toBe('Voided');
  });

  it('archives and restores invoice', async () => {
    const c = await createInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', type: 'standard', title: 'X' }, deps);
    if (!c.ok) throw new Error('setup');
    const a = await archiveInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        invoiceId: c.value.invoiceId }, deps);
    expect(a.ok).toBe(true);
    if (a.ok) expect(a.value.archivedAt).toBeTruthy();
    const r = await restoreInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        invoiceId: c.value.invoiceId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.archivedAt).toBeNull();
  });

  it('gets and searches invoices', async () => {
    const c = await createInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', type: 'standard', title: 'Find Me' }, deps);
    if (!c.ok) throw new Error('setup');
    const g = await getInvoiceUseCase(
      { tenantId: 't-1', invoiceId: c.value.invoiceId }, deps);
    expect(g.ok).toBe(true);
    if (g.ok && g.value) expect(g.value.title).toBe('Find Me');

    const s = await searchInvoicesUseCase(
      { tenantId: 't-1', query: 'Find' }, deps);
    expect(s.ok).toBe(true);
    if (s.ok) expect(s.value.total).toBe(1);

    const l = await listInvoicesUseCase(
      { tenantId: 't-1', organizationId: 'org-1' }, deps);
    expect(l.ok).toBe(true);
    if (l.ok) expect(l.value.invoices.length).toBe(1);
  });

  it('rejects transition from terminal status', async () => {
    const c = await createInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', type: 'standard', title: 'X' }, deps);
    if (!c.ok) throw new Error('setup');
    await cancelInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        invoiceId: c.value.invoiceId }, deps);
    // Cancelled → Issued should fail
    const r = await issueInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        invoiceId: c.value.invoiceId }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// 2) Invoice Lines (3)
// ═══════════════════════════════════════════

describe('Invoice Lines', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  async function setupInvoice() {
    const c = await createInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', type: 'standard', title: 'Line Test' }, deps);
    if (!c.ok) throw new Error('setup');
    return c.value.invoiceId;
  }

  it('adds invoice line and recalculates totals', async () => {
    const invId = await setupInvoice();
    const r = await addInvoiceLineUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        invoiceId: invId, resourceType: 'product', resourceId: 'prod-1',
        description: 'Widget', quantity: 2,
        unitPrice: { amount: 50, currencyCode: 'USD' } }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.lineTotal.amount).toBe(100);

    const inv = await getInvoiceUseCase({ tenantId: 't-1', invoiceId: invId }, deps);
    if (inv.ok && inv.value) {
      expect(inv.value.subtotal).toBe(100);
      expect(inv.value.grandTotal).toBe(100);
      expect(inv.value.balanceDue).toBe(100);
    }
  });

  it('removes invoice line and recalculates', async () => {
    const invId = await setupInvoice();
    const a = await addInvoiceLineUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        invoiceId: invId, resourceType: 'product', resourceId: 'p1',
        description: 'A', quantity: 1,
        unitPrice: { amount: 100, currencyCode: 'USD' } }, deps);
    if (!a.ok) throw new Error('setup line');
    const r = await removeInvoiceLineUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        lineId: a.value.id }, deps);
    expect(r.ok).toBe(true);
    const inv = await getInvoiceUseCase({ tenantId: 't-1', invoiceId: invId }, deps);
    if (inv.ok && inv.value) expect(inv.value.subtotal).toBe(0);
  });

  it('updates invoice line quantity and price', async () => {
    const invId = await setupInvoice();
    const a = await addInvoiceLineUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        invoiceId: invId, resourceType: 'product', resourceId: 'p1',
        description: 'A', quantity: 1,
        unitPrice: { amount: 50, currencyCode: 'USD' } }, deps);
    if (!a.ok) throw new Error('setup line');
    const r = await updateInvoiceLineUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        lineId: a.value.id, quantity: 3,
        unitPrice: { amount: 60, currencyCode: 'USD' } }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.lineTotal.amount).toBe(180);
  });
});

// ═══════════════════════════════════════════
// 3) Adjustments (2)
// ═══════════════════════════════════════════

describe('Adjustments', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  async function setupInvoiceWithLine() {
    const c = await createInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', type: 'standard', title: 'Adj Test' }, deps);
    if (!c.ok) throw new Error('setup');
    const invId = c.value.invoiceId;
    await addInvoiceLineUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        invoiceId: invId, resourceType: 'product', resourceId: 'p1',
        description: 'Base', quantity: 1,
        unitPrice: { amount: 200, currencyCode: 'USD' } }, deps);
    return invId;
  }

  it('adds surcharge adjustment', async () => {
    const invId = await setupInvoiceWithLine();
    const r = await addAdjustmentUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        invoiceId: invId, adjustmentType: 'surcharge', name: 'Rush Fee',
        amount: { amount: 25, currencyCode: 'USD' }, reason: 'Express delivery' }, deps);
    expect(r.ok).toBe(true);
    const inv = await getInvoiceUseCase({ tenantId: 't-1', invoiceId: invId }, deps);
    if (inv.ok && inv.value) {
      expect(inv.value.adjustmentTotal).toBe(25);
      expect(inv.value.grandTotal).toBe(225);
    }
  });

  it('adds deduction adjustment (negative delta)', async () => {
    const invId = await setupInvoiceWithLine();
    const r = await addAdjustmentUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        invoiceId: invId, adjustmentType: 'deduction', name: 'Loyalty',
        amount: { amount: 20, currencyCode: 'USD' }, reason: 'Returning customer' }, deps);
    expect(r.ok).toBe(true);
    const inv = await getInvoiceUseCase({ tenantId: 't-1', invoiceId: invId }, deps);
    if (inv.ok && inv.value) {
      expect(inv.value.adjustmentTotal).toBe(-20);
      expect(inv.value.grandTotal).toBe(180);
    }
  });

  it('removes adjustment', async () => {
    const invId = await setupInvoiceWithLine();
    const a = await addAdjustmentUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        invoiceId: invId, adjustmentType: 'fee', name: 'Processing',
        amount: { amount: 10, currencyCode: 'USD' }, reason: 'Fee' }, deps);
    if (!a.ok) throw new Error('setup adj');
    const r = await removeAdjustmentUseCase(
      { tenantId: 't-1', correlationId: 'r-4', actorId: 'user-1',
        adjustmentId: a.value.id }, deps);
    expect(r.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 4) Credit Memos (2)
// ═══════════════════════════════════════════

describe('Credit Memos', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('issues credit memo for organization', async () => {
    const r = await issueCreditMemoUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', amount: { amount: 100, currencyCode: 'USD' },
        reason: 'Overcharge correction' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.creditNumber).toMatch(/^CM-/);
      expect(r.value.status).toBe('Issued');
      expect(r.value.appliedAmount).toBe(0);
    }
    expect(deps.eventBus.countByType('credit.issued')).toBe(1);
  });

  it('applies credit to invoice and updates paid amount', async () => {
    // Create invoice + line
    const c = await createInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', type: 'standard', title: 'Credit Test' }, deps);
    if (!c.ok) throw new Error('setup');
    await addInvoiceLineUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        invoiceId: c.value.invoiceId, resourceType: 'product', resourceId: 'p1',
        description: 'Base', quantity: 1,
        unitPrice: { amount: 200, currencyCode: 'USD' } }, deps);

    // Issue and move to Open (payable state)
    await issueInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-2b', actorId: 'user-1',
        invoiceId: c.value.invoiceId }, deps);
    await deps.invoiceRepo.update('t-1', c.value.invoiceId, { status: 'Open' });

    // Issue credit
    const cm = await issueCreditMemoUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        organizationId: 'org-1', invoiceId: c.value.invoiceId,
        amount: { amount: 200, currencyCode: 'USD' }, reason: 'Full credit' }, deps);
    if (!cm.ok) throw new Error('setup credit');

    // Apply partial credit first (Open → PartiallyPaid)
    const r1 = await applyCreditUseCase(
      { tenantId: 't-1', correlationId: 'r-4', actorId: 'user-1',
        creditMemoId: cm.value.id, invoiceId: c.value.invoiceId, amount: 100 }, deps);
    expect(r1.ok).toBe(true);
    if (r1.ok) {
      expect(r1.value.appliedAmount).toBe(100);
      expect(r1.value.status).toBe('Issued');
    }

    // Apply remaining credit (PartiallyPaid → Paid)
    const r2 = await applyCreditUseCase(
      { tenantId: 't-1', correlationId: 'r-5', actorId: 'user-1',
        creditMemoId: cm.value.id, invoiceId: c.value.invoiceId, amount: 100 }, deps);
    expect(r2.ok).toBe(true);
    if (r2.ok) {
      expect(r2.value.appliedAmount).toBe(200);
      expect(r2.value.status).toBe('Applied');
    }

    // Invoice should be Paid
    const inv = await getInvoiceUseCase({ tenantId: 't-1', invoiceId: c.value.invoiceId }, deps);
    if (inv.ok && inv.value) {
      expect(inv.value.paidAmount).toBe(200);
      expect(inv.value.balanceDue).toBe(0);
      expect(inv.value.status).toBe('Paid');
    }
  });

  it('rejects credit application exceeding remaining', async () => {
    const c = await createInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', type: 'standard', title: 'X' }, deps);
    if (!c.ok) throw new Error('setup');
    const cm = await issueCreditMemoUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        organizationId: 'org-1', amount: { amount: 50, currencyCode: 'USD' },
        reason: 'Small' }, deps);
    if (!cm.ok) throw new Error('setup credit');
    const r = await applyCreditUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        creditMemoId: cm.value.id, invoiceId: c.value.invoiceId, amount: 100 }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// 5) References + Timeline (5)
// ═══════════════════════════════════════════

describe('References & Timeline', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  async function setupInvoice() {
    const c = await createInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', type: 'standard', title: 'Ref Test' }, deps);
    if (!c.ok) throw new Error('setup');
    return c.value.invoiceId;
  }

  it('attaches order reference', async () => {
    const invId = await setupInvoice();
    const r = await attachOrderRefUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        invoiceId: invId, orderId: 'order-123' }, deps);
    expect(r.ok).toBe(true);
    const inv = await getInvoiceUseCase({ tenantId: 't-1', invoiceId: invId }, deps);
    if (inv.ok && inv.value) {
      expect(inv.value.references.some((r) => r.refType === 'order' && r.refId === 'order-123')).toBe(true);
    }
  });

  it('attaches pricing reference', async () => {
    const invId = await setupInvoice();
    const r = await attachPricingRefUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        invoiceId: invId, pricingId: 'pricing-456' }, deps);
    expect(r.ok).toBe(true);
  });

  it('attaches organization reference', async () => {
    const invId = await setupInvoice();
    const r = await attachOrganizationRefUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        invoiceId: invId, organizationId: 'org-1' }, deps);
    expect(r.ok).toBe(true);
  });

  it('appends timeline entry', async () => {
    const invId = await setupInvoice();
    const r = await appendTimelineUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        invoiceId: invId, eventType: 'note', description: 'Called customer' }, deps);
    expect(r.ok).toBe(true);
  });

  it('gets timeline for invoice', async () => {
    const invId = await setupInvoice();
    await appendTimelineUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        invoiceId: invId, eventType: 'note', description: 'First note' }, deps);
    await appendTimelineUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        invoiceId: invId, eventType: 'note', description: 'Second note' }, deps);
    const r = await getTimelineUseCase(
      { tenantId: 't-1', invoiceId: invId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      // At least the 2 appended + 'created' from setup = 3
      expect(r.value.length).toBeGreaterThanOrEqual(3);
    }
  });
});

// ═══════════════════════════════════════════
// 6) Billing Generation & Close (2)
// ═══════════════════════════════════════════

describe('Billing Generation & Close', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('generates billing batch from multiple invoices', async () => {
    const c1 = await createInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', type: 'standard', title: 'Inv 1' }, deps);
    const c2 = await createInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        organizationId: 'org-1', type: 'standard', title: 'Inv 2' }, deps);
    if (!c1.ok || !c2.ok) throw new Error('setup');

    // Add lines to both
    await addInvoiceLineUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        invoiceId: c1.value.invoiceId, resourceType: 'product', resourceId: 'p1',
        description: 'L1', quantity: 1, unitPrice: { amount: 100, currencyCode: 'USD' } }, deps);
    await addInvoiceLineUseCase(
      { tenantId: 't-1', correlationId: 'r-4', actorId: 'user-1',
        invoiceId: c2.value.invoiceId, resourceType: 'product', resourceId: 'p2',
        description: 'L2', quantity: 1, unitPrice: { amount: 200, currencyCode: 'USD' } }, deps);

    const r = await generateBillingUseCase(
      { tenantId: 't-1', correlationId: 'r-5', actorId: 'user-1',
        organizationId: 'org-1', invoiceIds: [c1.value.invoiceId, c2.value.invoiceId] }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.invoiceCount).toBe(2);
      expect(r.value.totalAmount).toBe(300);
      expect(r.value.billingId).toBeTruthy();
    }
    expect(deps.eventBus.countByType('billing.created')).toBeGreaterThanOrEqual(1);
  });

  it('closes open invoice', async () => {
    const c = await createInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', type: 'standard', title: 'Close Test' }, deps);
    if (!c.ok) throw new Error('setup');
    await issueInvoiceUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        invoiceId: c.value.invoiceId }, deps);
    // Issued → Open (no explicit open use case; simulate via repo)
    await deps.invoiceRepo.update('t-1', c.value.invoiceId, { status: 'Open' });
    const r = await closeBillingUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        invoiceId: c.value.invoiceId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.status).toBe('Closed');
    expect(deps.eventBus.countByType('invoice.closed')).toBe(1);
  });
});
