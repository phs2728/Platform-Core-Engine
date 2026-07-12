/**
 * Address Engine — Public API
 *
 * Single Source of Truth for all location/address data.
 *
 * Owner-agnostic: 어떤 엔진의 리소스든 주소를 가질 수 있다.
 *   ownerType = 'User' | 'Organization' | 'Booking' | ...
 *   ownerId = 'xxx'
 */

// ═══════════════════════════════════════════
// Core SDK Re-exports
// ═══════════════════════════════════════════

export {
  type Result,
  Ok,
  Err,
  ValidationError,
  NotFoundError,
  ConflictError,
  type EventEnvelope,
  createEnvelope,
  z,
} from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Interfaces
// ═══════════════════════════════════════════

export type * from './interfaces/index.js';

// ═══════════════════════════════════════════
// Domain (public utilities)
// ═══════════════════════════════════════════

export { COUNTRY_DATA, getCountry, standardizeCountryCode, isValidCountryCode } from './domain/country-data.js';
export { encodeGeohash, decodeGeohash, distanceMeters } from './domain/geohash.js';
export { validateAddressFields, normalizeAddressFields } from './domain/validator.js';
export { formatAddress } from './domain/formatter.js';

// ═══════════════════════════════════════════
// CRUD UseCases
// ═══════════════════════════════════════════

export {
  createAddressUseCase,
  updateAddressUseCase,
  getAddressUseCase,
  searchAddressesUseCase,
  listAddressesUseCase,
  type AddressUseCaseDeps,
  type CreateAddressInput,
  type UpdateAddressInput,
  type GetAddressInput,
  type SearchAddressesInput,
  type ListAddressesInput,
} from './use-cases/AddressCrudUseCases.js';

// ═══════════════════════════════════════════
// Lifecycle UseCases
// ═══════════════════════════════════════════

export {
  archiveAddressUseCase,
  restoreAddressUseCase,
  deleteAddressUseCase,
  setDefaultAddressUseCase,
  changeAddressTypeUseCase,
  type ArchiveAddressInput,
  type RestoreAddressInput,
  type DeleteAddressInput,
  type SetDefaultAddressInput,
  type ChangeAddressTypeInput,
} from './use-cases/AddressLifecycleUseCases.js';

// ═══════════════════════════════════════════
// Service UseCases (Validate, Normalize, Geocode, Format)
// ═══════════════════════════════════════════

export {
  validateAddressUseCase,
  normalizeAddressUseCase,
  forwardGeocodeUseCase,
  reverseGeocodeUseCase,
  formatAddressUseCase,
  type ValidateAddressInput,
  type NormalizeAddressInput,
  type ForwardGeocodeInput,
  type ReverseGeocodeInput,
  type FormatAddressInput,
  type GeocodeDeps,
} from './use-cases/AddressServiceUseCases.js';

// ═══════════════════════════════════════════
// In-Memory Repositories
// ═══════════════════════════════════════════

export { InMemoryAddressRepository } from './infrastructure/InMemoryAddressRepository.js';
export { InMemoryCountryRepository, createCountryRepositoryWithDefaults } from './infrastructure/InMemoryCountryRepository.js';
export { InMemoryGeoRepository } from './infrastructure/InMemoryGeoRepository.js';
export { InMemoryAuditLogRepository } from './infrastructure/InMemoryAuditLogRepository.js';
