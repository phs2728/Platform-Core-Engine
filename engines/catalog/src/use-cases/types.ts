/**
 * Catalog Engine — Shared Use Case Deps (3-Layer DI)
 */

import type {
  IClock,
  IIdGenerator,
  IEventBus,
  ICatalogRepository,
  ICategoryRepository,
  IItemRepository,
  IVariantRepository,
  IBundleRepository,
  ICatalogAuditRepository,
  IOrganizationVerifier,
  IUserVerifier,
  IMediaVerifier,
  IPricingVerifier,
  ICustomDataPolicyProvider,
} from '../interfaces/index.js';

export interface CatalogUseCaseDeps {
  catalogRepo: ICatalogRepository;
  categoryRepo: ICategoryRepository;
  itemRepo: IItemRepository;
  variantRepo: IVariantRepository;
  bundleRepo: IBundleRepository;
  auditRepo: ICatalogAuditRepository;
  organizationVerifier: IOrganizationVerifier;
  userVerifier: IUserVerifier;
  mediaVerifier: IMediaVerifier;
  pricingVerifier: IPricingVerifier;
  policyProvider: ICustomDataPolicyProvider;
  eventBus: IEventBus;
  idGenerator: IIdGenerator;
  clock: IClock;
}
