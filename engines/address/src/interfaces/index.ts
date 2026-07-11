/**
 * Address Engine — Complete Interfaces
 *
 * Single Source of Truth for all location/address data.
 *
 * Owner-agnostic: Address는 User를 포함하지 않는다.
 *   ownerType = 'User' | 'Organization' | 'Booking' | ...
 *   ownerId = 'xxx'
 *
 * 모든 Use Case는 Result<T,E> 반환.
 * 모든 오류는 PlatformError 계층.
 * 모든 상태 변경은 EventEnvelope 발행.
 */

import type { EventEnvelope, Result } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Core Infra
// ═══════════════════════════════════════════

export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IEventBus { emit<T>(envelope: EventEnvelope<T>): Promise<void>; }

// ═══════════════════════════════════════════
// Address Types
// ═══════════════════════════════════════════

export type AddressType =
  | 'home' | 'billing' | 'shipping' | 'office'
  | 'warehouse' | 'hotel' | 'pickup' | 'dropoff'
  | 'temporary' | 'legal';

export type AddressStatus = 'active' | 'archived' | 'deleted';

export type OwnerType = 'User' | 'Organization' | 'Booking' | 'Tenant' | 'Vendor' | 'Merchant';

export type Locale = 'en' | 'ko' | 'ka' | 'ru' | 'tr' | 'zh' | 'de' | 'ja';

// ═══════════════════════════════════════════
// Geo
// ═══════════════════════════════════════════

export interface GeoPoint {
  latitude: number;      // -90 to 90
  longitude: number;     // -180 to 180
  altitude: number | null;
  accuracy: number | null; // meters
  geohash: string | null;
}

// ═══════════════════════════════════════════
// Country (ISO 3166-1)
// ═══════════════════════════════════════════

export interface Country {
  code: string;          // ISO 3166-1 alpha-2 ('KR', 'US', 'GE')
  code3: string;         // ISO 3166-1 alpha-3 ('KOR', 'USA', 'GEO')
  name: string;          // English name
  localName: string;     // Native name
  dialCode: string;      // '+82', '+1'
  currency: string;      // 'KRW', 'USD', 'GEL'
  timezone: string;      // Primary timezone
  postalCodePattern: string | null; // Regex for postal code validation
  addressFormat: AddressFormatType;
}

export type AddressFormatType = 'western' | 'eastern' | 'japanese';

// ═══════════════════════════════════════════
// Address Entity (Root Aggregate)
// ═══════════════════════════════════════════

export interface Address {
  id: string;
  tenantId: string;
  /** Owner — 어떤 엔진의 리소스든 될 수 있다 */
  ownerType: OwnerType;
  ownerId: string;
  type: AddressType;
  isDefault: boolean;
  status: AddressStatus;
  /** Label (e.g., 'Home', 'Office near subway') */
  label: string | null;
  /** Recipient / Contact */
  recipientName: string | null;
  recipientPhone: string | null;
  /** Address Lines */
  line1: string;
  line2: string | null;
  city: string;
  district: string | null;      // 구, 군, district
  region: string | null;        // State, Province, 시/도
  postalCode: string | null;
  country: string;              // ISO 3166-1 alpha-2
  /** Geo */
  geo: GeoPoint | null;
  /** Localization — 언어별 주소 표현 */
  localized: Partial<Record<Locale, LocalizedAddress>>;
  /** Dynamic metadata */
  metadata: Record<string, unknown>;
  /** Validation status */
  validated: boolean;
  validatedAt: string | null;
  /** Versioning */
  version: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
}

export interface LocalizedAddress {
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  country: string;
}

// ═══════════════════════════════════════════
// Validation Result
// ═══════════════════════════════════════════

export interface AddressValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  /** Normalized suggestion */
  suggested: Partial<Address> | null;
}

// ═══════════════════════════════════════════
// Format Result
// ═══════════════════════════════════════════

export interface FormattedAddress {
  /** Multi-line formatted string */
  lines: string[];
  /** Single-line string */
  singleLine: string;
  /** HTML formatted */
  html: string;
}

// ═══════════════════════════════════════════
// Search
// ═══════════════════════════════════════════

export interface AddressSearchCriteria {
  tenantId: string;
  ownerType?: OwnerType;
  ownerId?: string;
  type?: AddressType;
  status?: AddressStatus;
  country?: string;
  query?: string;        // Full-text (line1, city, postalCode, label)
  limit?: number;
  offset?: number;
}

export interface AddressSearchResult {
  addresses: Address[];
  total: number;
  limit: number;
  offset: number;
}

// ═══════════════════════════════════════════
// Address Policy
// ═══════════════════════════════════════════

export interface AddressPolicy {
  maxAddressesPerOwner: number;
  maxDefaultAddresses: number;
  allowedCountries: string[] | null;  // null = all
  requireValidation: boolean;
  requirePostalCode: boolean;
}

export const DEFAULT_ADDRESS_POLICY: AddressPolicy = {
  maxAddressesPerOwner: 50,
  maxDefaultAddresses: 1,
  allowedCountries: null,
  requireValidation: false,
  requirePostalCode: true,
};

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export type AuditEventType =
  | 'address_created' | 'address_updated' | 'address_deleted'
  | 'address_archived' | 'address_restored'
  | 'address_default_changed' | 'address_type_changed'
  | 'address_validated' | 'address_normalized';

export interface AuditLogRecord {
  id: string;
  tenantId: string;
  addressId: string | null;
  eventType: AuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Repositories
// ═══════════════════════════════════════════

export interface IAddressRepository {
  insert(addr: Address): Promise<void>;
  findById(tenantId: string, id: string): Promise<Address | null>;
  findByOwner(tenantId: string, ownerType: OwnerType, ownerId: string): Promise<Address[]>;
  findDefault(tenantId: string, ownerType: OwnerType, ownerId: string, type: AddressType): Promise<Address | null>;
  search(criteria: AddressSearchCriteria): Promise<AddressSearchResult>;
  update(id: string, patch: Partial<Address>): Promise<void>;
  softDelete(id: string, deletedAt: string): Promise<void>;
  archive(id: string, archivedAt: string): Promise<void>;
  restore(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  countByOwner(tenantId: string, ownerType: OwnerType, ownerId: string): Promise<number>;
  unsetDefaultForOwner(tenantId: string, ownerType: OwnerType, ownerId: string, type: AddressType): Promise<void>;
}

export interface ICountryRepository {
  findByCode(code: string): Promise<Country | null>;
  findAll(): Promise<Country[]>;
  insert(country: Country): Promise<void>;
}

export interface IGeoRepository {
  /** Forward geocode: address string → coordinates */
  forward(address: string): Promise<GeoPoint | null>;
  /** Reverse geocode: coordinates → address */
  reverse(lat: number, lng: number): Promise<Partial<Address> | null>;
}

export interface IAuditLogRepository {
  insert(record: Omit<AuditLogRecord, 'id' | 'createdAt'>): Promise<AuditLogRecord>;
  findByTenant(tenantId: string, limit?: number): Promise<AuditLogRecord[]>;
  findByAddress(addressId: string): Promise<AuditLogRecord[]>;
}

export { type Result, type EventEnvelope };
