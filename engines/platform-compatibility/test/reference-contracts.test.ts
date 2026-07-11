/**
 * Reference Contract Tests (10)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateReferenceContracts,
  extractReferenceContracts,
  extractReferenceConsumers,
  REFERENCE_OWNERSHIP,
  getReferenceRequiredFields,
  runReferenceValidationUseCase,
} from '../src/index.js';
import { sampleManifests, makeDeps } from './helpers.js';

describe('Reference Contracts', () => {
  let manifests = sampleManifests();

  beforeEach(() => { manifests = sampleManifests(); });

  it('validates reference ownership map has 11 standard types', () => {
    expect(Object.keys(REFERENCE_OWNERSHIP)).toHaveLength(11);
    expect(REFERENCE_OWNERSHIP.UserReference).toBe('user');
    expect(REFERENCE_OWNERSHIP.OrganizationReference).toBe('organization');
    expect(REFERENCE_OWNERSHIP.CatalogReference).toBe('catalog');
  });

  it('validates all reference contracts with existing owners as pass', () => {
    const results = validateReferenceContracts(manifests);
    const userRef = results.find((r) => r.refType === 'UserReference');
    expect(userRef?.ownerEngine).toBe('user');
    expect(userRef?.ownerExists).toBe(true);
    expect(userRef?.status).toBe('pass');
  });

  it('flags missing owner engine as fail', () => {
    // Remove 'address' engine from manifests → AddressReference owner missing
    const withoutAddress = manifests.filter((m) => m.id !== 'address');
    const results = validateReferenceContracts(withoutAddress);
    const addrRef = results.find((r) => r.refType === 'AddressReference');
    expect(addrRef?.ownerExists).toBe(false);
    expect(addrRef?.status).toBe('fail');
  });

  it('identifies consumer engines based on depends_on', () => {
    const results = validateReferenceContracts(manifests);
    const orgRef = results.find((r) => r.refType === 'OrganizationReference');
    // organization is depended on by catalog, pricing
    expect(orgRef?.consumerEngines).toContain('catalog');
    expect(orgRef?.consumerEngines).toContain('pricing');
  });

  it('extracts structured ReferenceContract objects', () => {
    const contracts = extractReferenceContracts(manifests);
    expect(contracts.length).toBe(11);
    const userRef = contracts.find((c) => c.refType === 'UserReference');
    expect(userRef?.ownerEngine).toBe('user');
    expect(userRef?.requiredFields).toContain('refType');
    expect(userRef?.requiredFields).toContain('refId');
    expect(userRef?.requiredFields).toContain('tenantId');
  });

  it('extracts reference consumers map', () => {
    const consumers = extractReferenceConsumers(manifests);
    expect(consumers.get('UserReference')).toContain('organization');
    expect(consumers.get('OrganizationReference')).toContain('catalog');
  });

  it('returns required fields for each reference type', () => {
    const fields = getReferenceRequiredFields('CatalogReference');
    expect(fields).toContain('refType');
    expect(fields).toContain('refId');
    expect(fields).toContain('tenantId');
  });

  it('returns base fields for unknown reference type', () => {
    const fields = getReferenceRequiredFields('UnknownReference');
    expect(fields).toEqual(['refType', 'refId']);
  });

  it('sorts results by refType', () => {
    const results = validateReferenceContracts(manifests);
    for (let i = 1; i < results.length; i++) {
      expect(results[i]!.refType.localeCompare(results[i - 1]!.refType)).toBeGreaterThanOrEqual(0);
    }
  });

  it('runs reference validation use case and saves results', async () => {
    const deps = makeDeps(manifests);
    const r = await runReferenceValidationUseCase(deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.length).toBe(11);
    }
    const stored = await deps._resultStore.getReferenceResults();
    expect(stored.length).toBe(11);
  });
});
