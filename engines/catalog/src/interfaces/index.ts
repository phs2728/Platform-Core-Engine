/**
 * Catalog Engine — Public Interfaces
 *
 * 사장님 확립 (2026-07-11) Business Foundation Phase 4:
 *  - Catalog = Reference Business Engine
 *  - Organization Ownership 모든 Entity에 강제
 *  - CustomDataPolicy = Use Case 진입 시 1회 호출 (중간 호출 ❌)
 *  - attributes/customFields/metadata = 자유 JSON + Policy Validation
 *  - 4-state status machine (Draft/Active/Archived/Deleted)
 *  - Category/Bundle = 무한 depth + cycle detection
 *  - Tenant 내 slug 유니크
 */

import type { Result, EventEnvelope } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Core Infra (모든 Engine 공통)
// ═══════════════════════════════════════════

export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IEventBus { emit<T>(envelope: EventEnvelope<T>): Promise<void>; }

// ═══════════════════════════════════════════
// Engine-Specific Host Interfaces (3-Layer DI)
// ═══════════════════════════════════════════

/**
 * Organization 존재 검증 (Organization Engine 직접 호출 ❌).
 */
export interface IOrganizationVerifier {
  verify(tenantId: string, organizationId: string): Promise<boolean>;
}

/**
 * User 존재 검증 (User Engine 직접 호출 ❌).
 */
export interface IUserVerifier {
  verify(tenantId: string, userId: string): Promise<boolean>;
}

/**
 * Media ID 검증 (Media Engine 직접 호출 ❌ — Sprint 1에서는 느슨한 검증).
 */
export interface IMediaVerifier {
  verify(tenantId: string, mediaId: string): Promise<boolean>;
}

/**
 * Pricing ID 검증 (Pricing Engine 직접 호출 ❌ — Sprint 1에서는 느슨한 검증).
 */
export interface IPricingVerifier {
  verify(tenantId: string, pricingId: string): Promise<boolean>;
}

/**
 * Custom Data Policy — 사장님 확립 표준.
 * Use Case 진입 시 1회 호출 (Business Logic 중간 호출 ❌ — 복잡도 방지).
 *
 * Industry 사장님이 자기 도메인 attributes를 검증하는 함수를 제공.
 * Catalog Engine은 Industry-specific keyword 없이 자유 형식만 받고,
 * Host가 주입한 policy로 검증.
 */
export interface ICustomDataPolicyProvider {
  /**
   * Catalog/Item attributes 검증.
   * type = Catalog/Item의 `type` 필드 (Industry 자유 분류자).
   */
  validateAttributes(
    tenantId: string,
    type: string,
    attributes: Record<string, unknown>,
  ): Promise<Result<Record<string, unknown>, Error>>;

  /** Tenant가 허용하는 type 목록 (Industry 사장님 정의). */
  getAllowedTypes(tenantId: string): Promise<readonly string[]>;

  /** Tenant 내 Catalog/Item 수 제한. */
  getMaxCatalogsPerOrg(tenantId: string): Promise<number>;
  getMaxCategoriesPerCatalog(tenantId: string): Promise<number>;
  getMaxVariantsPerItem(tenantId: string): Promise<number>;
  getMaxBundlesPerCatalog(tenantId: string): Promise<number>;
}

// ═══════════════════════════════════════════
// Value Objects & Enums
// ═══════════════════════════════════════════

export type CatalogStatus = 'Draft' | 'Active' | 'Archived' | 'Deleted';

/**
 * Reference to an external engine resource (Media / Pricing).
 * ID만 보관 — 실제 데이터 ❌.
 */
export interface MediaRef {
  mediaId: string;
  role: 'primary' | 'gallery' | 'thumbnail' | 'attachment';
  displayOrder: number;
}

export interface PricingRef {
  pricingId: string;
  role: 'default' | 'tier' | 'promo';
  displayOrder: number;
}

// ═══════════════════════════════════════════
// Core Entities
// ═══════════════════════════════════════════

/**
 * Catalog — Organization 단위 root entity.
 * 사장님 확립: "Catalog = Organization 소유의 카탈로그 루트".
 *
 * Item/Variant/Bundle/Category는 모두 Catalog 하위.
 */
export interface Catalog {
  id: string;
  tenantId: string;
  organizationId: string;           // 👈 Org Required (사장님 확립)
  name: string;
  slug: string;                      // Tenant 내 유니크
  description?: string;
  status: CatalogStatus;
  type: string;                      // Industry-agnostic type 식별자 (free-form)
  attributes: Record<string, unknown>;   // 자유 JSON + Policy 검증
  customFields: Record<string, unknown>;  // Industry-specific named fields
  metadata: Record<string, unknown>;      // Tenant-scoped 임의 JSON
  searchKeywords: string[];
  tags: string[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  archivedAt: string | null;
  deletedAt: string | null;
}

/**
 * Category — Catalog 내 계층 분류. 무한 depth + cycle detection.
 */
export interface Category {
  id: string;
  tenantId: string;
  catalogId: string;
  parentCategoryId: string | null;   // null = root
  name: string;
  slug: string;                      // Catalog 내 유니크
  description?: string;
  displayOrder: number;
  attributes: Record<string, unknown>;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  archivedAt: string | null;
}

/**
 * Item — Catalog 내 개별 항목. 사장님 spec의 "Catalog Core" 단위.
 * Variant/Bundle의 부모.
 */
export interface Item {
  id: string;
  tenantId: string;
  catalogId: string;
  categoryId: string | null;
  name: string;
  slug: string;                      // Catalog 내 유니크
  description?: string;
  type: string;                      // Industry-agnostic type
  attributes: Record<string, unknown>;
  customFields: Record<string, unknown>;
  mediaRefs: MediaRef[];
  pricingRefs: PricingRef[];
  searchKeywords: string[];
  tags: string[];
  status: CatalogStatus;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  archivedAt: string | null;
}

/**
 * Variant — Item의 옵션 (예: 색상/사이즈/버전).
 * sku는 Item 내 유니크.
 */
export interface Variant {
  id: string;
  tenantId: string;
  itemId: string;
  catalogId: string;
  name: string;
  sku: string;                       // Item 내 유니크
  attributes: Record<string, unknown>;
  mediaRefs: MediaRef[];
  pricingRefs: PricingRef[];
  isDefault: boolean;
  status: CatalogStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * BundleComponent — Bundle을 구성하는 Item/Variant 참조.
 */
export interface BundleComponent {
  refType: 'item' | 'variant';
  refId: string;
  quantity: number;
  attributes: Record<string, unknown>;
}

/**
 * Bundle — Item/Variant의 정적 조합.
 */
export interface Bundle {
  id: string;
  tenantId: string;
  catalogId: string;
  name: string;
  slug: string;                      // Catalog 내 유니크
  description?: string;
  components: BundleComponent[];
  attributes: Record<string, unknown>;
  mediaRefs: MediaRef[];
  pricingRefs: PricingRef[];
  status: CatalogStatus;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

// ═══════════════════════════════════════════
// Search
// ═══════════════════════════════════════════

export interface CatalogSearchCriteria {
  tenantId: string;
  organizationId?: string;
  query?: string;
  type?: string;
  status?: CatalogStatus;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CatalogSearchResult {
  catalogs: Catalog[];
  total: number;
  limit: number;
  offset: number;
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export type CatalogAuditEventType =
  | 'catalog_created'
  | 'catalog_updated'
  | 'catalog_archived'
  | 'catalog_restored'
  | 'catalog_deleted'
  | 'category_created'
  | 'category_updated'
  | 'category_moved'
  | 'category_deleted'
  | 'variant_created'
  | 'variant_updated'
  | 'variant_deleted'
  | 'bundle_created'
  | 'bundle_updated'
  | 'bundle_deleted'
  | 'reference_media_assigned'
  | 'reference_pricing_assigned';

export interface CatalogAuditRecord {
  id: string;
  tenantId: string;
  organizationId: string;
  catalogId?: string;
  categoryId?: string;
  variantId?: string;
  bundleId?: string;
  actorId: string;
  correlationId: string;
  eventType: CatalogAuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Repositories
// ═══════════════════════════════════════════

export interface ICatalogRepository {
  insert(catalog: Catalog): Promise<void>;
  findById(tenantId: string, id: string): Promise<Catalog | null>;
  findBySlug(tenantId: string, slug: string): Promise<Catalog | null>;
  update(tenantId: string, id: string, patch: Partial<Catalog>): Promise<void>;
  search(criteria: CatalogSearchCriteria): Promise<CatalogSearchResult>;
  existsBySlug(tenantId: string, slug: string, excludeId?: string): Promise<boolean>;
  findByOrganization(tenantId: string, organizationId: string): Promise<Catalog[]>;
}

export interface ICategoryRepository {
  insert(category: Category): Promise<void>;
  findById(tenantId: string, id: string): Promise<Category | null>;
  findByCatalog(tenantId: string, catalogId: string): Promise<Category[]>;
  findByParent(tenantId: string, catalogId: string, parentCategoryId: string | null): Promise<Category[]>;
  update(tenantId: string, id: string, patch: Partial<Category>): Promise<void>;
  existsBySlug(tenantId: string, catalogId: string, slug: string, excludeId?: string): Promise<boolean>;
}

export interface IItemRepository {
  insert(item: Item): Promise<void>;
  findById(tenantId: string, id: string): Promise<Item | null>;
  findByCatalog(tenantId: string, catalogId: string): Promise<Item[]>;
  findByCategory(tenantId: string, catalogId: string, categoryId: string): Promise<Item[]>;
  update(tenantId: string, id: string, patch: Partial<Item>): Promise<void>;
  existsBySlug(tenantId: string, catalogId: string, slug: string, excludeId?: string): Promise<boolean>;
}

export interface IVariantRepository {
  insert(variant: Variant): Promise<void>;
  findById(tenantId: string, id: string): Promise<Variant | null>;
  findByItem(tenantId: string, itemId: string): Promise<Variant[]>;
  update(tenantId: string, id: string, patch: Partial<Variant>): Promise<void>;
  existsBySku(tenantId: string, itemId: string, sku: string, excludeId?: string): Promise<boolean>;
}

export interface IBundleRepository {
  insert(bundle: Bundle): Promise<void>;
  findById(tenantId: string, id: string): Promise<Bundle | null>;
  findByCatalog(tenantId: string, catalogId: string): Promise<Bundle[]>;
  update(tenantId: string, id: string, patch: Partial<Bundle>): Promise<void>;
  existsBySlug(tenantId: string, catalogId: string, slug: string, excludeId?: string): Promise<boolean>;
}

export interface ICatalogAuditRepository {
  insert(record: Omit<CatalogAuditRecord, 'id' | 'createdAt'>): Promise<CatalogAuditRecord>;
  findByTenant(tenantId: string, limit?: number): Promise<CatalogAuditRecord[]>;
  findByCatalog(tenantId: string, catalogId: string, limit?: number): Promise<CatalogAuditRecord[]>;
}

export { type Result, type EventEnvelope };
