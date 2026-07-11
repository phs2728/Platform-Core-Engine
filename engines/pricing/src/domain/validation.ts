/**
 * Pricing Engine — Validation Schemas (zod)
 */

import { z } from '@platform/core-sdk';

export const pricingStatusSchema = z.enum(['Draft', 'Active', 'Archived', 'Deleted']);

export const moneySchema = z.object({
  amount: z.number(),
  currencyCode: z.string().length(3).regex(/^[A-Z]{3}$/),
});

// ═══════════════════════════════════════════
// Plan
// ═══════════════════════════════════════════

export const createPricingPlanSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  organizationId: z.string().min(1),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional(),
  type: z.string().min(1).max(100),
  baseCurrency: z.string().length(3).regex(/^[A-Z]{3}$/),
  initialStatus: pricingStatusSchema.optional(),
  attributes: z.record(z.unknown()).optional(),
  customFields: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  effectiveFrom: z.string().optional(),
  effectiveUntil: z.string().optional(),
});

export const updatePricingPlanSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  planId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  attributes: z.record(z.unknown()).optional(),
  customFields: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  effectiveFrom: z.string().optional(),
  effectiveUntil: z.string().optional(),
});

export const archivePricingPlanSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1),
  actorId: z.string().min(1), planId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export const restorePricingPlanSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1),
  actorId: z.string().min(1), planId: z.string().min(1),
});

export const deletePricingPlanSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1),
  actorId: z.string().min(1), planId: z.string().min(1),
});

export const getPricingPlanSchema = z.object({
  tenantId: z.string().min(1), planId: z.string().min(1),
});

export const searchPricingPlansSchema = z.object({
  tenantId: z.string().min(1),
  organizationId: z.string().optional(),
  query: z.string().max(200).optional(),
  type: z.string().max(100).optional(),
  status: pricingStatusSchema.optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// ═══════════════════════════════════════════
// Price
// ═══════════════════════════════════════════

export const createPriceSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  planId: z.string().min(1),
  name: z.string().min(1).max(200),
  amount: moneySchema,
  description: z.string().max(2000).optional(),
  attributes: z.record(z.unknown()).optional(),
});

export const updatePriceSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  priceId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  amount: moneySchema.optional(),
  description: z.string().max(2000).optional(),
  attributes: z.record(z.unknown()).optional(),
});

export const archivePriceSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  priceId: z.string().min(1),
});

export const restorePriceSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  priceId: z.string().min(1),
});

// ═══════════════════════════════════════════
// Component
// ═══════════════════════════════════════════

export const addPriceComponentSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  priceId: z.string().min(1),
  componentType: z.enum(['base', 'surcharge', 'discount_ref', 'fee', 'tax_ref', 'addon']),
  name: z.string().min(1).max(200),
  amount: moneySchema.optional(),
  percentage: z.number().min(0).max(100).optional(),
  displayOrder: z.number().int().min(0).optional(),
  attributes: z.record(z.unknown()).optional(),
});

export const removePriceComponentSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  componentId: z.string().min(1),
});

// ═══════════════════════════════════════════
// Tier
// ═══════════════════════════════════════════

const tierEntrySchema = z.object({
  fromValue: z.number(),
  toValue: z.number().nullable(),
  amount: moneySchema,
});

export const createTierPricingSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  planId: z.string().min(1),
  name: z.string().min(1).max(200),
  tierUnit: z.string().min(1).max(50),
  tiers: z.array(tierEntrySchema).min(1),
});

export const updateTierPricingSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  tierId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  tiers: z.array(tierEntrySchema).min(1).optional(),
});

export const deleteTierPricingSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  tierId: z.string().min(1),
});

// ═══════════════════════════════════════════
// Time Pricing
// ═══════════════════════════════════════════

const timeScheduleSchema = z.object({
  name: z.string().min(1).max(100),
  daysOfWeek: z.array(z.number().int().min(1).max(7)).min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  amount: moneySchema,
});

export const createTimePricingSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  planId: z.string().min(1),
  name: z.string().min(1).max(200),
  timezone: z.string().min(1).max(100),
  schedules: z.array(timeScheduleSchema).min(1),
});

export const updateTimePricingSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  timePricingId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  schedules: z.array(timeScheduleSchema).min(1).optional(),
});

export const deleteTimePricingSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  timePricingId: z.string().min(1),
});

// ═══════════════════════════════════════════
// Currency
// ═══════════════════════════════════════════

export const registerCurrencySchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  code: z.string().length(3).regex(/^[A-Z]{3}$/),
  symbol: z.string().max(10).optional(),
  decimals: z.number().int().min(0).max(4),
  isBase: z.boolean().optional(),
});

export const changeBaseCurrencySchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  newBaseCode: z.string().length(3).regex(/^[A-Z]{3}$/),
});

export const updateExchangeRateSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  fromCurrency: z.string().length(3).regex(/^[A-Z]{3}$/),
  toCurrency: z.string().length(3).regex(/^[A-Z]{3}$/),
  rate: z.number().positive(),
  source: z.string().max(200).optional(),
});

// ═══════════════════════════════════════════
// Version
// ═══════════════════════════════════════════

export const publishPriceVersionSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  planId: z.string().min(1),
});

export const rollbackPriceVersionSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  planId: z.string().min(1),
  versionNumber: z.number().int().min(1),
});

// ═══════════════════════════════════════════
// History
// ═══════════════════════════════════════════

export const getPriceHistorySchema = z.object({
  tenantId: z.string().min(1), planId: z.string().min(1),
  limit: z.number().int().min(1).max(1000).optional(),
});

// ═══════════════════════════════════════════
// Reference (Catalog)
// ═══════════════════════════════════════════

export const attachCatalogSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  planId: z.string().min(1), catalogId: z.string().min(1),
});

export const detachCatalogSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  planId: z.string().min(1), catalogId: z.string().min(1),
});
