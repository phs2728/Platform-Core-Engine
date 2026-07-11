/**
 * Pricing Engine — Public Interfaces
 *
 * 사장님 확립 (2026-07-11) Business Foundation Phase 4:
 *  - Pricing = 가격 정책 관리 엔진 (계산 ❌)
 *  - Organization Ownership 필수
 *  - CustomDataPolicy = Use Case 진입 시 1회 호출
 *  - attributes = 자유 JSON + Policy 검증
 */

import type { Result, EventEnvelope } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Core Infra
// ═══════════════════════════════════════════

export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IEventBus { emit<T>(envelope: EventEnvelope<T>): Promise<void>; }

// ═══════════════════════════════════════════
// Host Interfaces (3-Layer DI)
// ═══════════════════════════════════════════

export interface IOrganizationVerifier {
  verify(tenantId: string, organizationId: string): Promise<boolean>;
}

export interface ICatalogVerifier {
  verify(tenantId: string, catalogId: string): Promise<boolean>;
}

export interface ICustomDataPolicyProvider {
  validateAttributes(
    tenantId: string,
    type: string,
    attributes: Record<string, unknown>,
  ): Promise<Result<Record<string, unknown>, Error>>;
  getAllowedPlanTypes(tenantId: string): Promise<readonly string[]>;
  getMaxPlansPerOrg(tenantId: string): Promise<number>;
  getAllowedCurrencies(tenantId: string): Promise<readonly string[]>;
}

// ═══════════════════════════════════════════
// Value Objects
// ═══════════════════════════════════════════

export type PricingStatus = 'Draft' | 'Active' | 'Archived' | 'Deleted';

export interface Money {
  amount: number;
  currencyCode: string;  // ISO 4217 alpha-3
}

export interface Currency {
  code: string;          // ISO 4217 alpha-3 (USD, EUR, KRW, ...)
  symbol?: string;
  decimals: number;
  isBase: boolean;
  status: 'Active' | 'Archived';
}

export interface ExchangeRate {
  id: string;
  tenantId: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveAt: string;
  source?: string;
}

// ═══════════════════════════════════════════
// Core Entities
// ═══════════════════════════════════════════

export interface PricingPlan {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  status: PricingStatus;
  type: string;                      // Industry-agnostic plan type
  baseCurrency: string;
  attributes: Record<string, unknown>;
  customFields: Record<string, unknown>;
  metadata: Record<string, unknown>;
  tags: string[];
  catalogRefs: string[];             // Catalog IDs this plan applies to
  effectiveFrom?: string;
  effectiveUntil?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  archivedAt: string | null;
  deletedAt: string | null;
}

export interface Price {
  id: string;
  tenantId: string;
  organizationId: string;
  planId: string;
  name: string;
  amount: Money;
  description?: string;
  status: PricingStatus;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface PriceComponent {
  id: string;
  tenantId: string;
  priceId: string;
  componentType: 'base' | 'surcharge' | 'discount_ref' | 'fee' | 'tax_ref' | 'addon';
  name: string;
  amount?: Money;
  percentage?: number;
  displayOrder: number;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TierPricing {
  id: string;
  tenantId: string;
  planId: string;
  name: string;
  tierUnit: string;                  // 'quantity', 'duration', etc.
  tiers: TierEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface TierEntry {
  fromValue: number;
  toValue: number | null;
  amount: Money;
}

export interface TimePricing {
  id: string;
  tenantId: string;
  planId: string;
  name: string;
  timezone: string;
  schedules: TimeSchedule[];
  createdAt: string;
  updatedAt: string;
}

export interface TimeSchedule {
  name: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  amount: Money;
}

export interface PriceVersion {
  id: string;
  tenantId: string;
  planId: string;
  versionNumber: number;
  snapshot: Record<string, unknown>;
  status: 'Published' | 'RolledBack';
  publishedAt: string;
  publishedBy: string;
  rolledBackAt?: string;
}

export interface PriceHistory {
  id: string;
  tenantId: string;
  planId: string;
  eventType: string;
  actorId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Search
// ═══════════════════════════════════════════

export interface PricingSearchCriteria {
  tenantId: string;
  organizationId?: string;
  query?: string;
  type?: string;
  status?: PricingStatus;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface PricingSearchResult {
  plans: PricingPlan[];
  total: number;
  limit: number;
  offset: number;
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export type PricingAuditEventType =
  | 'plan_created' | 'plan_updated' | 'plan_archived' | 'plan_restored' | 'plan_deleted'
  | 'price_created' | 'price_updated' | 'price_archived' | 'price_restored' | 'price_deleted'
  | 'component_added' | 'component_removed'
  | 'tier_created' | 'tier_updated' | 'tier_deleted'
  | 'time_created' | 'time_updated' | 'time_deleted'
  | 'currency_registered' | 'base_currency_changed' | 'exchange_updated'
  | 'version_published' | 'version_rollback'
  | 'catalog_attached' | 'catalog_detached';

export interface PricingAuditRecord {
  id: string;
  tenantId: string;
  organizationId: string;
  planId?: string;
  actorId: string;
  correlationId: string;
  eventType: PricingAuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Repositories
// ═══════════════════════════════════════════

export interface IPricingPlanRepository {
  insert(plan: PricingPlan): Promise<void>;
  findById(tenantId: string, id: string): Promise<PricingPlan | null>;
  findBySlug(tenantId: string, slug: string): Promise<PricingPlan | null>;
  update(tenantId: string, id: string, patch: Partial<PricingPlan>): Promise<void>;
  search(criteria: PricingSearchCriteria): Promise<PricingSearchResult>;
  existsBySlug(tenantId: string, slug: string, excludeId?: string): Promise<boolean>;
}

export interface IPriceRepository {
  insert(price: Price): Promise<void>;
  findById(tenantId: string, id: string): Promise<Price | null>;
  findByPlan(tenantId: string, planId: string): Promise<Price[]>;
  update(tenantId: string, id: string, patch: Partial<Price>): Promise<void>;
}

export interface IPriceComponentRepository {
  insert(comp: PriceComponent): Promise<void>;
  findById(tenantId: string, id: string): Promise<PriceComponent | null>;
  findByPrice(tenantId: string, priceId: string): Promise<PriceComponent[]>;
  remove(tenantId: string, id: string): Promise<void>;
}

export interface ITierPricingRepository {
  insert(tier: TierPricing): Promise<void>;
  findById(tenantId: string, id: string): Promise<TierPricing | null>;
  findByPlan(tenantId: string, planId: string): Promise<TierPricing[]>;
  update(tenantId: string, id: string, patch: Partial<TierPricing>): Promise<void>;
  remove(tenantId: string, id: string): Promise<void>;
}

export interface ITimePricingRepository {
  insert(tp: TimePricing): Promise<void>;
  findById(tenantId: string, id: string): Promise<TimePricing | null>;
  findByPlan(tenantId: string, planId: string): Promise<TimePricing[]>;
  update(tenantId: string, id: string, patch: Partial<TimePricing>): Promise<void>;
  remove(tenantId: string, id: string): Promise<void>;
}

export interface ICurrencyRepository {
  insert(currency: Currency): Promise<void>;
  findByCode(tenantId: string, code: string): Promise<Currency | null>;
  findAll(tenantId: string): Promise<Currency[]>;
  findBase(tenantId: string): Promise<Currency | null>;
  update(tenantId: string, code: string, patch: Partial<Currency>): Promise<void>;
}

export interface IExchangeRateRepository {
  insert(rate: ExchangeRate): Promise<void>;
  findLatest(tenantId: string, fromCurrency: string, toCurrency: string): Promise<ExchangeRate | null>;
  findAll(tenantId: string): Promise<ExchangeRate[]>;
}

export interface IPriceVersionRepository {
  insert(version: PriceVersion): Promise<void>;
  findLatest(tenantId: string, planId: string): Promise<PriceVersion | null>;
  findByNumber(tenantId: string, planId: string, versionNumber: number): Promise<PriceVersion | null>;
  findAll(tenantId: string, planId: string): Promise<PriceVersion[]>;
  update(tenantId: string, id: string, patch: Partial<PriceVersion>): Promise<void>;
}

export interface IPriceHistoryRepository {
  insert(record: Omit<PriceHistory, 'id' | 'createdAt'>): Promise<PriceHistory>;
  findByPlan(tenantId: string, planId: string, limit?: number): Promise<PriceHistory[]>;
}

export interface IPricingAuditRepository {
  insert(record: Omit<PricingAuditRecord, 'id' | 'createdAt'>): Promise<PricingAuditRecord>;
  findByTenant(tenantId: string, limit?: number): Promise<PricingAuditRecord[]>;
  findByPlan(tenantId: string, planId: string, limit?: number): Promise<PricingAuditRecord[]>;
}

export { type Result, type EventEnvelope };
