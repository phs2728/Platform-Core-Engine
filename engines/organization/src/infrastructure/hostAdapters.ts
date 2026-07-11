/**
 * Host Stub Adapters (Test/Demo only)
 *
 * In a deployed system, the host application provides real implementations of:
 *   - IUserVerifier      (calls User Engine)
 *   - IAddressVerifier   (calls Address Engine)
 *   - IOrganizationPolicyProvider (calls Policy Engine)
 *   - IEventBus          (calls Event Bus Engine)
 *
 * For demo and unit tests, these minimal stubs are sufficient and prove that
 * the engine is decoupled from external engines.
 *
 * 사장님 확립 (Sprint 2C-1): "Engine은 DB/cache/외부 서비스를 직접 호출하지 않는다."
 */

import type {
  IUserVerifier,
  IAddressVerifier,
  IOrganizationPolicyProvider,
  OrganizationType,
} from '../interfaces/index.js';

export class InMemoryUserVerifier implements IUserVerifier {
  private readonly users = new Set<string>();

  add(tenantId: string, userId: string): void {
    this.users.add(`${tenantId}::${userId}`);
  }

  async verify(tenantId: string, userId: string): Promise<boolean> {
    return this.users.has(`${tenantId}::${userId}`);
  }

  clear(): void {
    this.users.clear();
  }
}

export class InMemoryAddressVerifier implements IAddressVerifier {
  private readonly addresses = new Set<string>();

  add(tenantId: string, addressId: string): void {
    this.addresses.add(`${tenantId}::${addressId}`);
  }

  async verify(tenantId: string, addressId: string): Promise<boolean> {
    return this.addresses.has(`${tenantId}::${addressId}`);
  }

  clear(): void {
    this.addresses.clear();
  }
}

const ALL_TYPES: readonly OrganizationType[] = [
  'Commercial', 'NonProfit', 'Government', 'Religious',
  'Educational', 'Healthcare', 'Marketplace', 'Hospitality',
  'Logistics', 'Technology', 'Other',
] as const;

export class StaticOrganizationPolicyProvider implements IOrganizationPolicyProvider {
  private readonly tenantLimits = new Map<string, {
    maxMembers: number;
    maxBranches: number;
    maxDepartments: number;
    allowedTypes: readonly OrganizationType[];
    allowedCountries: readonly string[];
  }>();

  set(tenantId: string, policy: {
    maxMembers?: number;
    maxBranches?: number;
    maxDepartments?: number;
    allowedTypes?: readonly OrganizationType[];
    allowedCountries?: readonly string[];
  }): void {
    const prev = this.tenantLimits.get(tenantId);
    this.tenantLimits.set(tenantId, {
      maxMembers: policy.maxMembers ?? prev?.maxMembers ?? 1000,
      maxBranches: policy.maxBranches ?? prev?.maxBranches ?? 100,
      maxDepartments: policy.maxDepartments ?? prev?.maxDepartments ?? 200,
      allowedTypes: policy.allowedTypes ?? prev?.allowedTypes ?? ALL_TYPES,
      allowedCountries: policy.allowedCountries ?? prev?.allowedCountries ?? ALL_COUNTRIES,
    });
  }

  async getMaxMembers(tenantId: string): Promise<number> {
    return this.tenantLimits.get(tenantId)?.maxMembers ?? 1000;
  }

  async getMaxBranches(tenantId: string): Promise<number> {
    return this.tenantLimits.get(tenantId)?.maxBranches ?? 100;
  }

  async getMaxDepartments(tenantId: string): Promise<number> {
    return this.tenantLimits.get(tenantId)?.maxDepartments ?? 200;
  }

  async getAllowedOrganizationTypes(tenantId: string): Promise<readonly OrganizationType[]> {
    return this.tenantLimits.get(tenantId)?.allowedTypes ?? ALL_TYPES;
  }

  async getAllowedCountries(tenantId: string): Promise<readonly string[]> {
    return this.tenantLimits.get(tenantId)?.allowedCountries ?? ALL_COUNTRIES;
  }

  clear(): void {
    this.tenantLimits.clear();
  }
}

const ALL_COUNTRIES: readonly string[] = [
  'KR', 'US', 'JP', 'GE', 'CN', 'TR', 'RU',
  'DE', 'FR', 'GB', 'IT', 'ES', 'PT', 'BR',
  'IN', 'TH', 'VN', 'MY', 'SG', 'PH', 'ID',
  'AU', 'NZ', 'CA', 'MX', 'AR', 'CL', 'CO',
] as const;
