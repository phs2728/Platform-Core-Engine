/**
 * Pricing Engine — Sprint 1 Tests (40+)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPricingPlanUseCase, updatePricingPlanUseCase,
  archivePricingPlanUseCase, restorePricingPlanUseCase, deletePricingPlanUseCase,
  getPricingPlanUseCase, searchPricingPlansUseCase, listPricingPlansUseCase,
  createPriceUseCase, updatePriceUseCase, archivePriceUseCase, restorePriceUseCase,
  addPriceComponentUseCase, removePriceComponentUseCase,
  createTierPricingUseCase, updateTierPricingUseCase, deleteTierPricingUseCase,
  createTimePricingUseCase, updateTimePricingUseCase, deleteTimePricingUseCase,
  registerCurrencyUseCase, changeBaseCurrencyUseCase, updateExchangeRateUseCase,
  publishPriceVersionUseCase, rollbackPriceVersionUseCase, getPriceHistoryUseCase,
  attachCatalogUseCase, detachCatalogUseCase,
} from '../src/index.js';
import { makeDeps } from './helpers.js';

// ═══════════════════════════════════════════
// 1) Plan Lifecycle (10)
// ═══════════════════════════════════════════

describe('Pricing Plan', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('creates plan with required fields', async () => {
    const r = await createPricingPlanUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin',
        organizationId: 'org-1', name: 'Basic Plan', slug: 'basic', type: 'flat', baseCurrency: 'USD' },
      deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.planId).toBeTruthy();
    expect(deps.eventBus.countByType('pricing.plan.created')).toBe(1);
  });

  it('creates plan with attributes', async () => {
    const r = await createPricingPlanUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin',
        organizationId: 'org-1', name: 'Premium', slug: 'premium', type: 'tiered', baseCurrency: 'EUR',
        attributes: { minCommitment: 1000 } }, deps);
    expect(r.ok).toBe(true);
  });

  it('rejects duplicate slug', async () => {
    await createPricingPlanUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin',
        organizationId: 'org-1', name: 'A', slug: 'same', type: 'flat', baseCurrency: 'USD' }, deps);
    const r = await createPricingPlanUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin',
        organizationId: 'org-1', name: 'B', slug: 'same', type: 'flat', baseCurrency: 'USD' }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects unknown organization', async () => {
    const r = await createPricingPlanUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin',
        organizationId: 'unknown', name: 'X', slug: 'x', type: 'flat', baseCurrency: 'USD' }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects disallowed type', async () => {
    const r = await createPricingPlanUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin',
        organizationId: 'org-1', name: 'X', slug: 'bad-type', type: 'forbidden', baseCurrency: 'USD' }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects disallowed currency', async () => {
    const r = await createPricingPlanUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin',
        organizationId: 'org-1', name: 'X', slug: 'bad-curr', type: 'flat', baseCurrency: 'JPY' }, deps);
    expect(r.ok).toBe(false);
  });

  it('updates plan name', async () => {
    const p = await createPricingPlanUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin',
        organizationId: 'org-1', name: 'Old', slug: 'upd', type: 'flat', baseCurrency: 'USD' }, deps);
    if (!p.ok) throw new Error('setup');
    const r = await updatePricingPlanUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', planId: p.value.planId, name: 'New' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.name).toBe('New');
  });

  it('archives + restores plan', async () => {
    const p = await createPricingPlanUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin',
        organizationId: 'org-1', name: 'X', slug: 'arc', type: 'flat', baseCurrency: 'USD' }, deps);
    if (!p.ok) throw new Error('setup');
    const a = await archivePricingPlanUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', planId: p.value.planId }, deps);
    expect(a.ok).toBe(true);
    if (a.ok) expect(a.value.status).toBe('Archived');
    const rs = await restorePricingPlanUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', planId: p.value.planId }, deps);
    expect(rs.ok).toBe(true);
    if (rs.ok) expect(rs.value.status).toBe('Active');
  });

  it('deletes plan (soft)', async () => {
    const p = await createPricingPlanUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin',
        organizationId: 'org-1', name: 'X', slug: 'del', type: 'flat', baseCurrency: 'USD' }, deps);
    if (!p.ok) throw new Error('setup');
    const r = await deletePricingPlanUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', planId: p.value.planId }, deps);
    expect(r.ok).toBe(true);
  });

  it('search + list plans', async () => {
    await createPricingPlanUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin',
        organizationId: 'org-1', name: 'Alpha Plan', slug: 'alpha', type: 'flat', baseCurrency: 'USD' }, deps);
    await createPricingPlanUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin',
        organizationId: 'org-1', name: 'Beta Plan', slug: 'beta', type: 'tiered', baseCurrency: 'USD' }, deps);
    const s = await searchPricingPlansUseCase({ tenantId: 't-1', query: 'alpha' }, deps);
    expect(s.ok).toBe(true);
    if (s.ok) expect(s.value.total).toBe(1);
    const l = await listPricingPlansUseCase({ tenantId: 't-1', organizationId: 'org-1' }, deps);
    expect(l.ok).toBe(true);
    if (l.ok) expect(l.value.total).toBe(2);
  });
});

// ═══════════════════════════════════════════
// 2) Price + Component (6)
// ═══════════════════════════════════════════

describe('Price + Component', () => {
  let deps: ReturnType<typeof makeDeps>;
  let planId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const p = await createPricingPlanUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin',
        organizationId: 'org-1', name: 'Plan', slug: 'p', type: 'flat', baseCurrency: 'USD' }, deps);
    if (!p.ok) throw new Error('setup');
    planId = p.value.planId;
  });

  it('creates price', async () => {
    const r = await createPriceUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin',
        planId, name: 'Base', amount: { amount: 100, currencyCode: 'USD' } }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.amount.amount).toBe(100);
  });

  it('updates price', async () => {
    const price = await createPriceUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin',
        planId, name: 'Base', amount: { amount: 100, currencyCode: 'USD' } }, deps);
    if (!price.ok) throw new Error('setup');
    const r = await updatePriceUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin',
        priceId: price.value.id, name: 'Updated', amount: { amount: 150, currencyCode: 'USD' } }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.amount.amount).toBe(150);
  });

  it('archives + restores price', async () => {
    const price = await createPriceUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin',
        planId, name: 'P', amount: { amount: 50, currencyCode: 'USD' } }, deps);
    if (!price.ok) throw new Error('setup');
    const a = await archivePriceUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', priceId: price.value.id }, deps);
    expect(a.ok).toBe(true);
    const rs = await restorePriceUseCase(
      { tenantId: 't-1', correlationId: 'r-4', actorId: 'admin', priceId: price.value.id }, deps);
    expect(rs.ok).toBe(true);
  });

  it('adds price component', async () => {
    const price = await createPriceUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin',
        planId, name: 'P', amount: { amount: 50, currencyCode: 'USD' } }, deps);
    if (!price.ok) throw new Error('setup');
    const r = await addPriceComponentUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin',
        priceId: price.value.id, componentType: 'surcharge', name: 'Service Fee',
        amount: { amount: 10, currencyCode: 'USD' } }, deps);
    expect(r.ok).toBe(true);
  });

  it('adds percentage component', async () => {
    const price = await createPriceUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin',
        planId, name: 'P', amount: { amount: 50, currencyCode: 'USD' } }, deps);
    if (!price.ok) throw new Error('setup');
    const r = await addPriceComponentUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin',
        priceId: price.value.id, componentType: 'tax_ref', name: 'Tax',
        percentage: 8.5 }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.percentage).toBe(8.5);
  });

  it('removes price component', async () => {
    const price = await createPriceUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin',
        planId, name: 'P', amount: { amount: 50, currencyCode: 'USD' } }, deps);
    if (!price.ok) throw new Error('setup');
    const comp = await addPriceComponentUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin',
        priceId: price.value.id, componentType: 'fee', name: 'F', amount: { amount: 5, currencyCode: 'USD' } }, deps);
    if (!comp.ok) throw new Error('setup');
    const r = await removePriceComponentUseCase(
      { tenantId: 't-1', correlationId: 'r-4', actorId: 'admin', componentId: comp.value.id }, deps);
    expect(r.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 3) Tier (3)
// ═══════════════════════════════════════════

describe('Tier Pricing', () => {
  let deps: ReturnType<typeof makeDeps>;
  let planId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const p = await createPricingPlanUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin',
        organizationId: 'org-1', name: 'P', slug: 'tier', type: 'tiered', baseCurrency: 'USD' }, deps);
    if (!p.ok) throw new Error('setup');
    planId = p.value.planId;
  });

  it('creates tier pricing', async () => {
    const r = await createTierPricingUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', planId,
        name: 'Volume', tierUnit: 'quantity',
        tiers: [{ fromValue: 1, toValue: 10, amount: { amount: 100, currencyCode: 'USD' } },
                { fromValue: 11, toValue: null, amount: { amount: 80, currencyCode: 'USD' } }] }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.tiers.length).toBe(2);
  });

  it('updates tier pricing', async () => {
    const t = await createTierPricingUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', planId,
        name: 'Vol', tierUnit: 'quantity',
        tiers: [{ fromValue: 1, toValue: null, amount: { amount: 100, currencyCode: 'USD' } }] }, deps);
    if (!t.ok) throw new Error('setup');
    const r = await updateTierPricingUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', tierId: t.value.id, name: 'Updated' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.name).toBe('Updated');
  });

  it('deletes tier pricing', async () => {
    const t = await createTierPricingUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', planId,
        name: 'Del', tierUnit: 'quantity',
        tiers: [{ fromValue: 1, toValue: null, amount: { amount: 100, currencyCode: 'USD' } }] }, deps);
    if (!t.ok) throw new Error('setup');
    const r = await deleteTierPricingUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', tierId: t.value.id }, deps);
    expect(r.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 4) Time Pricing (3)
// ═══════════════════════════════════════════

describe('Time Pricing', () => {
  let deps: ReturnType<typeof makeDeps>;
  let planId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const p = await createPricingPlanUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin',
        organizationId: 'org-1', name: 'P', slug: 'time', type: 'time_based', baseCurrency: 'USD' }, deps);
    if (!p.ok) throw new Error('setup');
    planId = p.value.planId;
  });

  it('creates time pricing', async () => {
    const r = await createTimePricingUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', planId,
        name: 'Peak', timezone: 'Asia/Tbilisi',
        schedules: [{ name: 'Weekend', daysOfWeek: [6, 7], startTime: '09:00', endTime: '17:00',
          amount: { amount: 200, currencyCode: 'USD' } }] }, deps);
    expect(r.ok).toBe(true);
  });

  it('updates time pricing', async () => {
    const tp = await createTimePricingUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', planId,
        name: 'Peak', timezone: 'UTC',
        schedules: [{ name: 'S1', daysOfWeek: [1], startTime: '08:00', endTime: '12:00',
          amount: { amount: 100, currencyCode: 'USD' } }] }, deps);
    if (!tp.ok) throw new Error('setup');
    const r = await updateTimePricingUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', timePricingId: tp.value.id, name: 'Off-Peak' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.name).toBe('Off-Peak');
  });

  it('deletes time pricing', async () => {
    const tp = await createTimePricingUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', planId,
        name: 'Del', timezone: 'UTC',
        schedules: [{ name: 'S', daysOfWeek: [1], startTime: '00:00', endTime: '23:59',
          amount: { amount: 1, currencyCode: 'USD' } }] }, deps);
    if (!tp.ok) throw new Error('setup');
    const r = await deleteTimePricingUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', timePricingId: tp.value.id }, deps);
    expect(r.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 5) Currency + Exchange (4)
// ═══════════════════════════════════════════

describe('Currency + Exchange', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('registers currency', async () => {
    const r = await registerCurrencyUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin',
        code: 'USD', symbol: '$', decimals: 2, isBase: true }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.code).toBe('USD');
  });

  it('rejects duplicate currency', async () => {
    await registerCurrencyUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin',
        code: 'USD', decimals: 2 }, deps);
    const r = await registerCurrencyUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin',
        code: 'USD', decimals: 2 }, deps);
    expect(r.ok).toBe(false);
  });

  it('changes base currency', async () => {
    await registerCurrencyUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin',
        code: 'USD', decimals: 2, isBase: true }, deps);
    await registerCurrencyUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin',
        code: 'EUR', decimals: 2 }, deps);
    const r = await changeBaseCurrencyUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', newBaseCode: 'EUR' }, deps);
    expect(r.ok).toBe(true);
  });

  it('updates exchange rate', async () => {
    const r = await updateExchangeRateUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin',
        fromCurrency: 'USD', toCurrency: 'EUR', rate: 0.92, source: 'ECB' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.rate).toBe(0.92);
  });
});

// ═══════════════════════════════════════════
// 6) Version + History (4)
// ═══════════════════════════════════════════

describe('Version + History', () => {
  let deps: ReturnType<typeof makeDeps>;
  let planId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const p = await createPricingPlanUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin',
        organizationId: 'org-1', name: 'P', slug: 'ver', type: 'flat', baseCurrency: 'USD' }, deps);
    if (!p.ok) throw new Error('setup');
    planId = p.value.planId;
  });

  it('publishes version', async () => {
    const r = await publishPriceVersionUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', planId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.versionNumber).toBe(1);
  });

  it('rollback to previous version', async () => {
    await publishPriceVersionUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', planId }, deps);
    await updatePricingPlanUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', planId, name: 'Changed' }, deps);
    await publishPriceVersionUseCase(
      { tenantId: 't-1', correlationId: 'r-4', actorId: 'admin', planId }, deps);
    const r = await rollbackPriceVersionUseCase(
      { tenantId: 't-1', correlationId: 'r-5', actorId: 'admin', planId, versionNumber: 1 }, deps);
    expect(r.ok).toBe(true);
  });

  it('gets price history', async () => {
    await publishPriceVersionUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', planId }, deps);
    const r = await getPriceHistoryUseCase(
      { tenantId: 't-1', planId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.length).toBeGreaterThan(0);
  });

  it('publishes multiple versions', async () => {
    await publishPriceVersionUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', planId }, deps);
    await publishPriceVersionUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', planId }, deps);
    const r = await publishPriceVersionUseCase(
      { tenantId: 't-1', correlationId: 'r-4', actorId: 'admin', planId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.versionNumber).toBe(3);
  });
});

// ═══════════════════════════════════════════
// 7) Catalog Reference (3)
// ═══════════════════════════════════════════

describe('Catalog Reference', () => {
  let deps: ReturnType<typeof makeDeps>;
  let planId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const p = await createPricingPlanUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin',
        organizationId: 'org-1', name: 'P', slug: 'ref', type: 'flat', baseCurrency: 'USD' }, deps);
    if (!p.ok) throw new Error('setup');
    planId = p.value.planId;
  });

  it('attaches catalog to plan', async () => {
    const r = await attachCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', planId, catalogId: 'catalog-1' }, deps);
    expect(r.ok).toBe(true);
    expect(deps.eventBus.countByType('pricing.catalog.attached')).toBe(1);
  });

  it('detaches catalog from plan', async () => {
    await attachCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', planId, catalogId: 'catalog-1' }, deps);
    const r = await detachCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', planId, catalogId: 'catalog-1' }, deps);
    expect(r.ok).toBe(true);
  });

  it('rejects unknown catalog', async () => {
    const r = await attachCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', planId, catalogId: 'unknown-cat' }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// 8) Audit + Multi-Tenant (3)
// ═══════════════════════════════════════════

describe('Audit + Multi-Tenant', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('records audit on create', async () => {
    await createPricingPlanUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin',
        organizationId: 'org-1', name: 'X', slug: 'aud', type: 'flat', baseCurrency: 'USD' }, deps);
    const records = await deps.auditRepo.findByTenant('t-1');
    expect(records.some((r) => r.eventType === 'plan_created')).toBe(true);
  });

  it('isolates plans across tenants', async () => {
    deps.organizationVerifier.add('t-2', 'org-1');
    deps.policyProvider.set('t-2', { allowedPlanTypes: ['flat'], allowedCurrencies: ['USD'] });
    await createPricingPlanUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin',
        organizationId: 'org-1', name: 'A', slug: 'same', type: 'flat', baseCurrency: 'USD' }, deps);
    const r = await createPricingPlanUseCase(
      { tenantId: 't-2', correlationId: 'r-2', actorId: 'admin',
        organizationId: 'org-1', name: 'B', slug: 'same', type: 'flat', baseCurrency: 'USD' }, deps);
    expect(r.ok).toBe(true);
  });

  it('EventEnvelope has 11 fields', async () => {
    await createPricingPlanUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin',
        organizationId: 'org-1', name: 'X', slug: 'env', type: 'flat', baseCurrency: 'USD' }, deps);
    const env = deps.eventBus.byType('pricing.plan.created')[0].envelope;
    expect(env.eventId).toBeDefined();
    expect(env.aggregateId).toBeDefined();
    expect(env.occurredAt).toBeDefined();
    expect(env.version).toBe('1.0.0');
    expect(env.tenantId).toBe('t-1');
    expect(env.correlationId).toBe('r-1');
    expect(typeof env.causationId).toBe('string');
    expect(env.engine).toBe('pricing');
    expect(env.eventType).toBe('pricing.plan.created');
    expect(env.schemaRef).toBe('pricing.plan.created.v1');
    expect(env.payload).toBeDefined();
  });
});
