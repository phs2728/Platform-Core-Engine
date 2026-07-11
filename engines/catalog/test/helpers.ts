/**
 * Test fixtures — Catalog Engine
 */

import type { CatalogUseCaseDeps } from '../src/use-cases/types.js';
import {
  InMemoryCatalogRepository,
  InMemoryCategoryRepository,
  InMemoryItemRepository,
  InMemoryVariantRepository,
  InMemoryBundleRepository,
  InMemoryCatalogAuditRepository,
  InMemoryOrganizationVerifier,
  InMemoryUserVerifier,
  InMemoryMediaVerifier,
  InMemoryPricingVerifier,
  StaticCatalogPolicyProvider,
  InMemoryEventBus,
} from '../src/index.js';

export function makeClock() {
  let offset = 0;
  const base = new Date('2026-07-11T08:00:00.000Z');
  return { now: () => new Date(base.getTime() + offset++ * 1000) };
}

export function makeDeps(): CatalogUseCaseDeps & {
  catalogRepo: InMemoryCatalogRepository;
  categoryRepo: InMemoryCategoryRepository;
  itemRepo: InMemoryItemRepository;
  variantRepo: InMemoryVariantRepository;
  bundleRepo: InMemoryBundleRepository;
  auditRepo: InMemoryCatalogAuditRepository;
  organizationVerifier: InMemoryOrganizationVerifier;
  userVerifier: InMemoryUserVerifier;
  mediaVerifier: InMemoryMediaVerifier;
  pricingVerifier: InMemoryPricingVerifier;
  policyProvider: StaticCatalogPolicyProvider;
  eventBus: InMemoryEventBus;
  idGenerator: { generate(): string };
  clock: { now(): Date };
} {
  const catalogRepo = new InMemoryCatalogRepository();
  const categoryRepo = new InMemoryCategoryRepository();
  const itemRepo = new InMemoryItemRepository();
  const variantRepo = new InMemoryVariantRepository();
  const bundleRepo = new InMemoryBundleRepository();
  const auditRepo = new InMemoryCatalogAuditRepository();
  const eventBus = new InMemoryEventBus();
  const organizationVerifier = new InMemoryOrganizationVerifier();
  const userVerifier = new InMemoryUserVerifier();
  const mediaVerifier = new InMemoryMediaVerifier();
  const pricingVerifier = new InMemoryPricingVerifier();
  const policyProvider = new StaticCatalogPolicyProvider();
  policyProvider.set('t-1', { allowedTypes: ['entity_type_a', 'entity_type_b', 'service', 'default'] });

  organizationVerifier.add('t-1', 'org-1');
  userVerifier.add('t-1', 'user-1');
  mediaVerifier.add('t-1', 'media-1');
  pricingVerifier.add('t-1', 'pricing-1');

  let idCounter = 0;
  const idGenerator = {
    generate(): string {
      idCounter += 1;
      return `id-${Date.now()}-${idCounter}-${Math.floor(Math.random() * 1e6).toString(36)}`;
    },
  };

  return {
    catalogRepo, categoryRepo, itemRepo, variantRepo, bundleRepo,
    auditRepo, eventBus,
    organizationVerifier, userVerifier, mediaVerifier, pricingVerifier,
    policyProvider, idGenerator, clock: makeClock(),
  };
}
