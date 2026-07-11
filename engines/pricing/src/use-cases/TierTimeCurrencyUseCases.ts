/**
 * Tier + Time + Currency + Exchange UseCases (11)
 */

import {
  Ok, Err, type Result,
  ValidationError, ConflictError, NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';
import {
  createTierPricingSchema, updateTierPricingSchema, deleteTierPricingSchema,
  createTimePricingSchema, updateTimePricingSchema, deleteTimePricingSchema,
  registerCurrencySchema, changeBaseCurrencySchema, updateExchangeRateSchema,
} from '../domain/validation.js';
import type { PricingUseCaseDeps } from './types.js';
import type {
  TierPricing, TimePricing, Currency, ExchangeRate, Money, TierEntry, TimeSchedule,
} from '../interfaces/index.js';

// ════════════════════════════════════════════════════════════════════════════
// TIER (3)
// ════════════════════════════════════════════════════════════════════════════

export async function createTierPricingUseCase(
  input: { tenantId: string; correlationId: string; actorId: string;
    planId: string; name: string; tierUnit: string; tiers: TierEntry[] },
  deps: PricingUseCaseDeps,
): Promise<Result<TierPricing, ValidationError | NotFoundError>> {
  const v = createTierPricingSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid tier input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const plan = await deps.planRepo.findById(d.tenantId, d.planId);
  if (!plan) return Err(new NotFoundError('Plan not found'));

  const tierId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const tier: TierPricing = {
    id: tierId, tenantId: d.tenantId, planId: d.planId,
    name: d.name, tierUnit: d.tierUnit, tiers: d.tiers,
    createdAt: now, updatedAt: now,
  };
  await deps.tierRepo.insert(tier);

  const env: EventEnvelope<{ tierId: string; planId: string }> = {
    eventId: deps.idGenerator.generate(), aggregateId: d.planId, occurredAt: now,
    version: '1.0.0', tenantId: d.tenantId, correlationId: d.correlationId, causationId: '',
    engine: 'pricing', eventType: 'pricing.tier.created', schemaRef: 'pricing.tier.created.v1',
    payload: { tierId, planId: d.planId },
  };
  await deps.eventBus.emit(env);

  await deps.auditRepo.insert({
    organizationId: plan.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId, planId: d.planId,
    eventType: 'tier_created', metadata: { tierId, name: d.name },
  });

  return Ok(tier);
}

export async function updateTierPricingUseCase(
  input: { tenantId: string; correlationId: string; actorId: string;
    tierId: string; name?: string; tiers?: TierEntry[] },
  deps: PricingUseCaseDeps,
): Promise<Result<TierPricing, ValidationError | NotFoundError>> {
  const v = updateTierPricingSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid update', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.tierRepo.findById(d.tenantId, d.tierId);
  if (!existing) return Err(new NotFoundError('Tier not found'));

  const now = deps.clock.now().toISOString();
  const updated: TierPricing = { ...existing, updatedAt: now };
  if (d.name !== undefined) updated.name = d.name;
  if (d.tiers !== undefined) updated.tiers = d.tiers;

  await deps.tierRepo.update(d.tenantId, d.tierId, {
    ...(d.name !== undefined ? { name: d.name } : {}),
    ...(d.tiers !== undefined ? { tiers: d.tiers } : {}),
    updatedAt: now,
  });

  const env: EventEnvelope<{ tierId: string }> = {
    eventId: deps.idGenerator.generate(), aggregateId: existing.planId, occurredAt: now,
    version: '1.0.0', tenantId: d.tenantId, correlationId: d.correlationId, causationId: '',
    engine: 'pricing', eventType: 'pricing.tier.updated', schemaRef: 'pricing.tier.updated.v1',
    payload: { tierId: d.tierId },
  };
  await deps.eventBus.emit(env);

  return Ok(updated);
}

export async function deleteTierPricingUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; tierId: string },
  deps: PricingUseCaseDeps,
): Promise<Result<{ tierId: string }, ValidationError | NotFoundError>> {
  const v = deleteTierPricingSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.tierRepo.findById(d.tenantId, d.tierId);
  if (!existing) return Err(new NotFoundError('Tier not found'));

  await deps.tierRepo.remove(d.tenantId, d.tierId);

  const now = deps.clock.now().toISOString();
  const env: EventEnvelope<{ tierId: string }> = {
    eventId: deps.idGenerator.generate(), aggregateId: existing.planId, occurredAt: now,
    version: '1.0.0', tenantId: d.tenantId, correlationId: d.correlationId, causationId: '',
    engine: 'pricing', eventType: 'pricing.tier.updated', schemaRef: 'pricing.tier.deleted.v1',
    payload: { tierId: d.tierId },
  };
  await deps.eventBus.emit(env);

  return Ok({ tierId: d.tierId });
}

// ════════════════════════════════════════════════════════════════════════════
// TIME PRICING (3)
// ════════════════════════════════════════════════════════════════════════════

export async function createTimePricingUseCase(
  input: { tenantId: string; correlationId: string; actorId: string;
    planId: string; name: string; timezone: string; schedules: TimeSchedule[] },
  deps: PricingUseCaseDeps,
): Promise<Result<TimePricing, ValidationError | NotFoundError>> {
  const v = createTimePricingSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid time pricing input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const plan = await deps.planRepo.findById(d.tenantId, d.planId);
  if (!plan) return Err(new NotFoundError('Plan not found'));

  const tpId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const tp: TimePricing = {
    id: tpId, tenantId: d.tenantId, planId: d.planId,
    name: d.name, timezone: d.timezone, schedules: d.schedules,
    createdAt: now, updatedAt: now,
  };
  await deps.timeRepo.insert(tp);

  const env: EventEnvelope<{ timePricingId: string; planId: string }> = {
    eventId: deps.idGenerator.generate(), aggregateId: d.planId, occurredAt: now,
    version: '1.0.0', tenantId: d.tenantId, correlationId: d.correlationId, causationId: '',
    engine: 'pricing', eventType: 'pricing.time.created', schemaRef: 'pricing.time.created.v1',
    payload: { timePricingId: tpId, planId: d.planId },
  };
  await deps.eventBus.emit(env);

  await deps.auditRepo.insert({
    organizationId: plan.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId, planId: d.planId,
    eventType: 'time_created', metadata: { timePricingId: tpId },
  });

  return Ok(tp);
}

export async function updateTimePricingUseCase(
  input: { tenantId: string; correlationId: string; actorId: string;
    timePricingId: string; name?: string; schedules?: TimeSchedule[] },
  deps: PricingUseCaseDeps,
): Promise<Result<TimePricing, ValidationError | NotFoundError>> {
  const v = updateTimePricingSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid update', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.timeRepo.findById(d.tenantId, d.timePricingId);
  if (!existing) return Err(new NotFoundError('Time pricing not found'));

  const now = deps.clock.now().toISOString();
  const updated: TimePricing = { ...existing, updatedAt: now };
  if (d.name !== undefined) updated.name = d.name;
  if (d.schedules !== undefined) updated.schedules = d.schedules;

  await deps.timeRepo.update(d.tenantId, d.timePricingId, {
    ...(d.name !== undefined ? { name: d.name } : {}),
    ...(d.schedules !== undefined ? { schedules: d.schedules } : {}),
    updatedAt: now,
  });

  const env: EventEnvelope<{ timePricingId: string }> = {
    eventId: deps.idGenerator.generate(), aggregateId: existing.planId, occurredAt: now,
    version: '1.0.0', tenantId: d.tenantId, correlationId: d.correlationId, causationId: '',
    engine: 'pricing', eventType: 'pricing.time.updated', schemaRef: 'pricing.time.updated.v1',
    payload: { timePricingId: d.timePricingId },
  };
  await deps.eventBus.emit(env);

  return Ok(updated);
}

export async function deleteTimePricingUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; timePricingId: string },
  deps: PricingUseCaseDeps,
): Promise<Result<{ timePricingId: string }, ValidationError | NotFoundError>> {
  const v = deleteTimePricingSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.timeRepo.findById(d.tenantId, d.timePricingId);
  if (!existing) return Err(new NotFoundError('Time pricing not found'));

  await deps.timeRepo.remove(d.tenantId, d.timePricingId);

  return Ok({ timePricingId: d.timePricingId });
}

// ════════════════════════════════════════════════════════════════════════════
// CURRENCY (2)
// ════════════════════════════════════════════════════════════════════════════

export async function registerCurrencyUseCase(
  input: { tenantId: string; correlationId: string; actorId: string;
    code: string; symbol?: string; decimals: number; isBase?: boolean },
  deps: PricingUseCaseDeps,
): Promise<Result<Currency, ValidationError | ConflictError>> {
  const v = registerCurrencySchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid currency input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.currencyRepo.findByCode(d.tenantId, d.code);
  if (existing) return Err(new ConflictError('Currency already registered'));

  // If isBase, demote previous base
  if (d.isBase) {
    const prevBase = await deps.currencyRepo.findBase(d.tenantId);
    if (prevBase) {
      await deps.currencyRepo.update(d.tenantId, prevBase.code, { isBase: false });
    }
  }

  const currency: Currency = {
    code: d.code, decimals: d.decimals, isBase: d.isBase ?? false,
    status: 'Active',
  };
  if (d.symbol !== undefined) currency.symbol = d.symbol;

  await deps.currencyRepo.insert({ ...currency, tenantId: d.tenantId } as Currency & { tenantId: string });

  const now = deps.clock.now().toISOString();
  const env: EventEnvelope<{ code: string }> = {
    eventId: deps.idGenerator.generate(), aggregateId: d.code, occurredAt: now,
    version: '1.0.0', tenantId: d.tenantId, correlationId: d.correlationId, causationId: '',
    engine: 'pricing', eventType: 'pricing.currency.updated', schemaRef: 'pricing.currency.registered.v1',
    payload: { code: d.code },
  };
  await deps.eventBus.emit(env);

  await deps.auditRepo.insert({
    organizationId: '', tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    eventType: 'currency_registered', metadata: { code: d.code, isBase: d.isBase ?? false },
  });

  return Ok(currency);
}

export async function changeBaseCurrencyUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; newBaseCode: string },
  deps: PricingUseCaseDeps,
): Promise<Result<{ newBaseCode: string }, ValidationError | NotFoundError>> {
  const v = changeBaseCurrencySchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const newBase = await deps.currencyRepo.findByCode(d.tenantId, d.newBaseCode);
  if (!newBase) return Err(new NotFoundError('Currency not registered'));

  const prevBase = await deps.currencyRepo.findBase(d.tenantId);
  if (prevBase) {
    await deps.currencyRepo.update(d.tenantId, prevBase.code, { isBase: false });
  }
  await deps.currencyRepo.update(d.tenantId, d.newBaseCode, { isBase: true });

  const now = deps.clock.now().toISOString();
  const env: EventEnvelope<{ newBaseCode: string }> = {
    eventId: deps.idGenerator.generate(), aggregateId: d.newBaseCode, occurredAt: now,
    version: '1.0.0', tenantId: d.tenantId, correlationId: d.correlationId, causationId: '',
    engine: 'pricing', eventType: 'pricing.currency.updated', schemaRef: 'pricing.currency.base_changed.v1',
    payload: { newBaseCode: d.newBaseCode },
  };
  await deps.eventBus.emit(env);

  await deps.auditRepo.insert({
    organizationId: '', tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    eventType: 'base_currency_changed', metadata: { newBaseCode: d.newBaseCode, prevBase: prevBase?.code ?? null },
  });

  return Ok({ newBaseCode: d.newBaseCode });
}

// ════════════════════════════════════════════════════════════════════════════
// EXCHANGE RATE (1)
// ════════════════════════════════════════════════════════════════════════════

export async function updateExchangeRateUseCase(
  input: { tenantId: string; correlationId: string; actorId: string;
    fromCurrency: string; toCurrency: string; rate: number; source?: string },
  deps: PricingUseCaseDeps,
): Promise<Result<ExchangeRate, ValidationError>> {
  const v = updateExchangeRateSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid exchange rate input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const rateId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const rate: ExchangeRate = {
    id: rateId, tenantId: d.tenantId,
    fromCurrency: d.fromCurrency, toCurrency: d.toCurrency,
    rate: d.rate, effectiveAt: now,
  };
  if (d.source !== undefined) rate.source = d.source;

  await deps.exchangeRepo.insert(rate);

  const env: EventEnvelope<{ fromCurrency: string; toCurrency: string; rate: number }> = {
    eventId: deps.idGenerator.generate(), aggregateId: rateId, occurredAt: now,
    version: '1.0.0', tenantId: d.tenantId, correlationId: d.correlationId, causationId: '',
    engine: 'pricing', eventType: 'pricing.exchange.updated', schemaRef: 'pricing.exchange.updated.v1',
    payload: { fromCurrency: d.fromCurrency, toCurrency: d.toCurrency, rate: d.rate },
  };
  await deps.eventBus.emit(env);

  await deps.auditRepo.insert({
    organizationId: '', tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    eventType: 'exchange_updated', metadata: { fromCurrency: d.fromCurrency, toCurrency: d.toCurrency, rate: d.rate },
  });

  return Ok(rate);
}
