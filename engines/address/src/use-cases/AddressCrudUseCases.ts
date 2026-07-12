/**
 * Address CRUD UseCases — Create, Update, Get, Search, List
 */

import {
  Ok,
  Err,
  type Result,
  ValidationError,
  NotFoundError,
  ConflictError,
  type EventEnvelope,
  createEnvelope,
  z,
} from '@platform/core-sdk';
import { recordAudit } from '../domain/audit.js';
import { normalizeAddressFields } from '../domain/validator.js';
import { encodeGeohash } from '../domain/geohash.js';
import type {
  IClock,
  IIdGenerator,
  IEventBus,
  IAddressRepository,
  IAuditLogRepository,
  ICountryRepository,
  Address,
  AddressType,
  AddressStatus,
  OwnerType,
  AddressPolicy,
  AddressSearchCriteria,
  AddressSearchResult,
  GeoPoint,
  Locale,
} from '../interfaces/index.js';

// ═══════════════════════════════════════════
// Common Deps
// ═══════════════════════════════════════════

export interface AddressUseCaseDeps {
  addressRepository: IAddressRepository;
  countryRepository: ICountryRepository;
  auditLogRepository: IAuditLogRepository;
  idGenerator: IIdGenerator;
  clock: IClock;
  eventBus: IEventBus;
}

// ═══════════════════════════════════════════
// CreateAddress
// ═══════════════════════════════════════════

export interface CreateAddressInput {
  tenantId: string;
  ownerType: OwnerType;
  ownerId: string;
  type: AddressType;
  isDefault?: boolean;
  label?: string;
  recipientName?: string;
  recipientPhone?: string;
  line1: string;
  line2?: string;
  city: string;
  district?: string;
  region?: string;
  postalCode?: string;
  country: string;
  geo?: { latitude: number; longitude: number; altitude?: number };
  correlationId: string;
}

const createSchema = z.object({
  tenantId: z.string().min(1),
  ownerType: z.string().min(1),
  ownerId: z.string().min(1),
  type: z.enum(['home', 'billing', 'shipping', 'office', 'warehouse', 'hotel', 'pickup', 'dropoff', 'temporary', 'legal']),
  line1: z.string().min(1).max(500),
  city: z.string().min(1).max(200),
  country: z.string().min(2), // Accept names too — standardizeCountryCode handles it
});

export async function createAddressUseCase(
  input: CreateAddressInput,
  deps: AddressUseCaseDeps,
  policy?: AddressPolicy,
): Promise<Result<Address, ValidationError | ConflictError>> {
  // Validate
  const validation = createSchema.safeParse(input);
  if (!validation.success) {
    return Err(new ValidationError('Invalid address', { details: { issues: validation.error.errors } }));
  }

  // Policy: max addresses per owner
  if (policy) {
    const count = await deps.addressRepository.countByOwner(
      input.tenantId, input.ownerType, input.ownerId,
    );
    if (count >= policy.maxAddressesPerOwner) {
      return Err(new ConflictError('Max addresses reached for this owner', {
        details: { max: policy.maxAddressesPerOwner, current: count },
      }));
    }

    // Policy: allowed countries
    if (policy.allowedCountries && policy.allowedCountries.length > 0) {
      if (!policy.allowedCountries.includes(input.country.toUpperCase())) {
        return Err(new ConflictError('Country not allowed by policy', {
          details: { country: input.country, allowed: policy.allowedCountries },
        }));
      }
    }
  }

  // Normalize
  const normalized = normalizeAddressFields({
    line1: input.line1,
    ...(input.line2 !== undefined ? { line2: input.line2 } : {}),
    city: input.city,
    ...(input.district !== undefined ? { district: input.district } : {}),
    ...(input.region !== undefined ? { region: input.region } : {}),
    ...(input.postalCode !== undefined ? { postalCode: input.postalCode } : {}),
    country: input.country,
    ...(input.label !== undefined ? { label: input.label } : {}),
    ...(input.recipientName !== undefined ? { recipientName: input.recipientName } : {}),
    ...(input.recipientPhone !== undefined ? { recipientPhone: input.recipientPhone } : {}),
  });

  // Check country exists
  const country = await deps.countryRepository.findByCode(normalized.country!);
  if (!country) {
    return Err(new ValidationError('Invalid country code', {
      details: { country: input.country },
    }));
  }

  // Geo
  let geo: GeoPoint | null = null;
  if (input.geo) {
    geo = {
      latitude: input.geo.latitude,
      longitude: input.geo.longitude,
      altitude: input.geo.altitude ?? null,
      accuracy: null,
      geohash: encodeGeohash(input.geo.latitude, input.geo.longitude),
    };
  }

  const now = deps.clock.now().toISOString();
  const addressId = deps.idGenerator.generate();

  // Handle default
  const isDefault = input.isDefault ?? false;
  if (isDefault) {
    await deps.addressRepository.unsetDefaultForOwner(
      input.tenantId, input.ownerType, input.ownerId, input.type,
    );
  }

  const address: Address = {
    id: addressId,
    tenantId: input.tenantId,
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    type: input.type,
    isDefault,
    status: 'active' as AddressStatus,
    label: input.label ?? null,
    recipientName: input.recipientName ?? null,
    recipientPhone: input.recipientPhone ?? null,
    line1: normalized.line1!,
    line2: normalized.line2 ?? null,
    city: normalized.city!,
    district: input.district ?? null,
    region: input.region ?? null,
    postalCode: normalized.postalCode ?? null,
    country: normalized.country!,
    geo,
    localized: {},
    metadata: {},
    validated: false,
    validatedAt: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    deletedAt: null,
  };

  await deps.addressRepository.insert(address);

  // Event
  const envelope: EventEnvelope<{ addressId: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: addressId,
    occurredAt: now,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'address',
    eventType: 'address.created',
    schemaRef: 'address.created.v1',
    payload: { addressId },
  });
  await deps.eventBus.emit(envelope);

  // Audit
  await recordAudit(deps.auditLogRepository, {
    addressId,
    tenantId: input.tenantId,
    eventType: 'address_created',
    metadata: {
      ownerType: input.ownerType, ownerId: input.ownerId,
      type: input.type, country: normalized.country, city: normalized.city,
    },
  });

  return Ok(address);
}

// ═══════════════════════════════════════════
// UpdateAddress
// ═══════════════════════════════════════════

export interface UpdateAddressInput {
  tenantId: string;
  addressId: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  district?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string;
  label?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  correlationId: string;
}

export async function updateAddressUseCase(
  input: UpdateAddressInput,
  deps: AddressUseCaseDeps,
): Promise<Result<Address, ValidationError | NotFoundError>> {
  const existing = await deps.addressRepository.findById(input.tenantId, input.addressId);
  if (!existing) {
    return Err(new NotFoundError('Address not found', { details: { addressId: input.addressId } }));
  }

  // Normalize the patch fields
  const patch: Partial<Address> = {};
  if (input.line1 !== undefined) patch.line1 = input.line1.trim();
  if (input.line2 !== undefined) patch.line2 = input.line2?.trim() ?? null;
  if (input.city !== undefined) patch.city = input.city.trim();
  if (input.district !== undefined) patch.district = input.district?.trim() ?? null;
  if (input.region !== undefined) patch.region = input.region?.trim() ?? null;
  if (input.postalCode !== undefined) patch.postalCode = input.postalCode?.trim().toUpperCase() ?? null;
  if (input.country !== undefined) patch.country = input.country.toUpperCase();
  if (input.label !== undefined) patch.label = input.label?.trim() ?? null;
  if (input.recipientName !== undefined) patch.recipientName = input.recipientName?.trim() ?? null;
  if (input.recipientPhone !== undefined) patch.recipientPhone = input.recipientPhone?.trim() ?? null;

  const now = deps.clock.now().toISOString();
  patch.updatedAt = now;
  patch.version = existing.version + 1;

  await deps.addressRepository.update(input.addressId, patch);

  // Event
  const envelope: EventEnvelope<{ addressId: string; version: number }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: input.addressId,
    occurredAt: now,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'address',
    eventType: 'address.updated',
    schemaRef: 'address.updated.v1',
    payload: { addressId: input.addressId, version: patch.version ?? existing.version },
  });
  await deps.eventBus.emit(envelope);

  await recordAudit(deps.auditLogRepository, {
    addressId: input.addressId,
    tenantId: input.tenantId,
    eventType: 'address_updated',
    metadata: { fields: Object.keys(patch).filter((k) => k !== 'updatedAt' && k !== 'version') },
  });

  const updated = { ...existing, ...patch };
  return Ok(updated);
}

// ═══════════════════════════════════════════
// GetAddress
// ═══════════════════════════════════════════

export interface GetAddressInput {
  tenantId: string;
  addressId: string;
  correlationId: string;
}

export async function getAddressUseCase(
  input: GetAddressInput,
  deps: Pick<AddressUseCaseDeps, 'addressRepository'>,
): Promise<Result<Address, NotFoundError>> {
  const addr = await deps.addressRepository.findById(input.tenantId, input.addressId);
  if (!addr) {
    return Err(new NotFoundError('Address not found', { details: { addressId: input.addressId } }));
  }
  return Ok(addr);
}

// ═══════════════════════════════════════════
// SearchAddresses
// ═══════════════════════════════════════════

export interface SearchAddressesInput {
  tenantId: string;
  ownerType?: OwnerType;
  ownerId?: string;
  type?: AddressType;
  status?: AddressStatus;
  country?: string;
  query?: string;
  limit?: number;
  offset?: number;
  correlationId: string;
}

export async function searchAddressesUseCase(
  input: SearchAddressesInput,
  deps: Pick<AddressUseCaseDeps, 'addressRepository'>,
): Promise<Result<AddressSearchResult, ValidationError>> {
  const criteria: AddressSearchCriteria = {
    tenantId: input.tenantId,
    limit: input.limit ?? 50,
    offset: input.offset ?? 0,
  };
  if (input.ownerType !== undefined) criteria.ownerType = input.ownerType;
  if (input.ownerId !== undefined) criteria.ownerId = input.ownerId;
  if (input.type !== undefined) criteria.type = input.type;
  if (input.status !== undefined) criteria.status = input.status;
  if (input.country !== undefined) criteria.country = input.country;
  if (input.query !== undefined) criteria.query = input.query;

  const result = await deps.addressRepository.search(criteria);
  return Ok(result);
}

// ═══════════════════════════════════════════
// ListAddresses (by owner)
// ═══════════════════════════════════════════

export interface ListAddressesInput {
  tenantId: string;
  ownerType: OwnerType;
  ownerId: string;
  correlationId: string;
}

export async function listAddressesUseCase(
  input: ListAddressesInput,
  deps: Pick<AddressUseCaseDeps, 'addressRepository'>,
): Promise<Result<Address[], NotFoundError>> {
  const addresses = await deps.addressRepository.findByOwner(
    input.tenantId, input.ownerType, input.ownerId,
  );
  return Ok(addresses);
}
