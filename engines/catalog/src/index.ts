/**
 * Catalog Engine — Public API
 *
 * 사장님 확립 (2026-07-11) Business Foundation Phase 4:
 *   Reference Business Engine — Industry-Agnostic, Organization-Owned.
 *
 * Sprint 1 = 20 Use Cases (8 Catalog + 4 Category + 3 Variant + 3 Bundle + 2 Reference).
 */

// ═══════════════════════════════════════════
// Core SDK Re-exports
// ═══════════════════════════════════════════
export {
  type Result, Ok, Err,
  ValidationError, NotFoundError, ConflictError,
  type EventEnvelope, createEnvelope, z,
} from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Domain Types & Constants
// ═══════════════════════════════════════════
export type {
  Catalog, Category, Item, Variant, Bundle, BundleComponent,
  CatalogStatus, MediaRef, PricingRef,
  CatalogSearchCriteria, CatalogSearchResult,
  CatalogAuditRecord, CatalogAuditEventType,
} from './interfaces/index.js';

// ═══════════════════════════════════════════
// Host Interfaces
// ═══════════════════════════════════════════
export type {
  IClock, IIdGenerator, IEventBus,
  IOrganizationVerifier, IUserVerifier,
  IMediaVerifier, IPricingVerifier,
  ICustomDataPolicyProvider,
} from './interfaces/index.js';

// ═══════════════════════════════════════════
// Repository Interfaces
// ═══════════════════════════════════════════
export type {
  ICatalogRepository, ICategoryRepository,
  IItemRepository, IVariantRepository,
  IBundleRepository, ICatalogAuditRepository,
} from './interfaces/index.js';

// ═══════════════════════════════════════════
// Catalog Core UseCases (8)
// ═══════════════════════════════════════════
export {
  createCatalogUseCase, updateCatalogUseCase,
  archiveCatalogUseCase, restoreCatalogUseCase, deleteCatalogUseCase,
  getCatalogUseCase, searchCatalogsUseCase, listCatalogsUseCase,
  type CreateCatalogInput, type UpdateCatalogInput,
  type ArchiveCatalogInput, type RestoreCatalogInput, type DeleteCatalogInput,
  type GetCatalogInput, type ListCatalogsInput,
} from './use-cases/CatalogCoreUseCases.js';

// ═══════════════════════════════════════════
// Category + Item UseCases (4 + 1)
// ═══════════════════════════════════════════
export {
  createCategoryUseCase, updateCategoryUseCase,
  moveCategoryUseCase, deleteCategoryUseCase,
  createItemUseCase,
  type CreateCategoryInput, type UpdateCategoryInput,
  type MoveCategoryInput, type CreateItemInput,
} from './use-cases/CategoryUseCases.js';

// ═══════════════════════════════════════════
// Variant UseCases (3)
// ═══════════════════════════════════════════
export {
  createVariantUseCase, updateVariantUseCase, deleteVariantUseCase,
  type CreateVariantInput, type UpdateVariantInput,
} from './use-cases/VariantUseCases.js';

// ═══════════════════════════════════════════
// Bundle UseCases (3)
// ═══════════════════════════════════════════
export {
  createBundleUseCase, updateBundleUseCase, deleteBundleUseCase,
  type CreateBundleInput, type UpdateBundleInput,
} from './use-cases/BundleUseCases.js';

// ═══════════════════════════════════════════
// Reference UseCases (2)
// ═══════════════════════════════════════════
export {
  assignMediaRefUseCase, assignPricingRefUseCase,
  type AssignMediaRefInput, type AssignPricingRefInput,
} from './use-cases/ReferenceUseCases.js';

// ═══════════════════════════════════════════
// Use Case Deps
// ═══════════════════════════════════════════
export type { CatalogUseCaseDeps } from './use-cases/types.js';

// ═══════════════════════════════════════════
// In-Memory Repositories
// ═══════════════════════════════════════════
export {
  InMemoryCatalogRepository,
  InMemoryCategoryRepository,
  InMemoryItemRepository,
  InMemoryVariantRepository,
  InMemoryBundleRepository,
  InMemoryCatalogAuditRepository,
} from './infrastructure/InMemoryRepositories.js';

// ═══════════════════════════════════════════
// Host Stubs + EventBus
// ═══════════════════════════════════════════
export {
  InMemoryOrganizationVerifier,
  InMemoryUserVerifier,
  InMemoryMediaVerifier,
  InMemoryPricingVerifier,
  StaticCatalogPolicyProvider,
  InMemoryEventBus,
  type RecordedEnvelope,
} from './infrastructure/hostAdapters.js';
