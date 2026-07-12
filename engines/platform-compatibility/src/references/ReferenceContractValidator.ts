/**
 * Reference Contract Validator
 *
 * Validates that all reference types used across the platform are
 * owned by the correct engine and that the owner engine exists.
 *
 * Known reference ownership map (platform standard):
 *   UserReference         → user
 *   OrganizationReference → organization
 *   AddressReference      → address
 *   CatalogReference      → catalog
 *   PricingReference      → pricing
 *   MediaReference        → media
 *   OrderReference        → order
 *   BookingReference      → booking
 *   InventoryReference    → inventory
 *   PaymentReference      → payment
 *   BillingReference      → billing
 */

import type {
  EngineManifest,
  ReferenceContract,
  ReferenceContractResult,
} from '../interfaces/index.js';

/**
 * Platform-standard reference ownership.
 */
export const REFERENCE_OWNERSHIP: Readonly<Record<string, string>> = {
  UserReference: 'user',
  OrganizationReference: 'organization',
  AddressReference: 'address',
  CatalogReference: 'catalog',
  PricingReference: 'pricing',
  MediaReference: 'media',
  OrderReference: 'order',
  BookingReference: 'booking',
  InventoryReference: 'inventory',
  PaymentReference: 'payment',
  BillingReference: 'billing',
} as const;

/**
 * Scan an engine's provides/strict_boundaries to determine which
 * reference types it exposes as a public contract.
 */
export function extractReferenceConsumers(
  manifests: EngineManifest[],
): Map<string, string[]> {
  // For each engine, look at its depends_on — if it depends on an engine
  // that owns a reference type, it's a consumer.
  const engineIds = new Set(manifests.map((m) => m.id));
  const ownerToRefTypes = new Map<string, string[]>();
  for (const [refType, owner] of Object.entries(REFERENCE_OWNERSHIP)) {
    const existing = ownerToRefTypes.get(owner) ?? [];
    existing.push(refType);
    ownerToRefTypes.set(owner, existing);
  }

  const result = new Map<string, string[]>();
  for (const [refType, owner] of Object.entries(REFERENCE_OWNERSHIP)) {
    const consumers: string[] = [];
    for (const m of manifests) {
      if (m.id === owner) continue;
      if (m.depends_on.includes(owner)) {
        consumers.push(m.id);
      }
    }
    result.set(refType, consumers);
  }
  return result;
}

/**
 * Validate reference contracts across the platform.
 */
export function validateReferenceContracts(
  manifests: EngineManifest[],
): ReferenceContractResult[] {
  const engineIds = new Set(manifests.map((m) => m.id));
  const consumers = extractReferenceConsumers(manifests);
  const results: ReferenceContractResult[] = [];

  for (const [refType, owner] of Object.entries(REFERENCE_OWNERSHIP)) {
    const ownerExists = engineIds.has(owner);
    const consumerEngines = consumers.get(refType) ?? [];

    let status: 'pass' | 'fail' | 'warning' = 'pass';
    if (!ownerExists) {
      status = 'fail';
    }

    results.push({
      refType,
      ownerEngine: owner,
      consumerEngines,
      ownerExists,
      status,
    });
  }

  return results.sort((a, b) => a.refType.localeCompare(b.refType));
}

/**
 * Extract structured ReferenceContract objects.
 */
export function extractReferenceContracts(
  manifests: EngineManifest[],
): ReferenceContract[] {
  const consumers = extractReferenceConsumers(manifests);
  const contracts: ReferenceContract[] = [];

  for (const [refType, owner] of Object.entries(REFERENCE_OWNERSHIP)) {
    contracts.push({
      refType,
      ownerEngine: owner,
      consumerEngines: consumers.get(refType) ?? [],
      requiredFields: getReferenceRequiredFields(refType),
    });
  }

  return contracts;
}

/**
 * Standard required fields per reference type.
 */
export function getReferenceRequiredFields(refType: string): string[] {
  const base = ['refType', 'refId'];
  switch (refType) {
    case 'UserReference':
      return [...base, 'tenantId'];
    case 'OrganizationReference':
      return [...base, 'tenantId'];
    case 'AddressReference':
      return [...base, 'tenantId'];
    case 'CatalogReference':
      return [...base, 'tenantId'];
    case 'PricingReference':
      return [...base, 'tenantId'];
    case 'MediaReference':
      return [...base, 'tenantId'];
    case 'OrderReference':
      return [...base, 'tenantId'];
    case 'BookingReference':
      return [...base, 'tenantId'];
    case 'InventoryReference':
      return [...base, 'tenantId'];
    case 'PaymentReference':
      return [...base, 'tenantId'];
    case 'BillingReference':
      return [...base, 'tenantId'];
    default:
      return base;
  }
}
