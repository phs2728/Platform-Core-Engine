/**
 * Address Service UseCases — Validate, Normalize, Geocode, Format
 */

import {
  Ok,
  Err,
  type Result,
  ValidationError,
  NotFoundError,
  type EventEnvelope,
  createEnvelope,
} from '@platform/core-sdk';
import { recordAudit } from '../domain/audit.js';
import {
  validateAddressFields,
  normalizeAddressFields,
} from '../domain/validator.js';
import { formatAddress as doFormat } from '../domain/formatter.js';
import type {
  IClock,
  IIdGenerator,
  IEventBus,
  IAddressRepository,
  IAuditLogRepository,
  ICountryRepository,
  IGeoRepository,
  Address,
  AddressValidationResult,
  FormattedAddress,
  GeoPoint,
  Locale,
  AddressPolicy,
} from '../interfaces/index.js';
import type { AddressUseCaseDeps } from './AddressCrudUseCases.js';

// ═══════════════════════════════════════════
// ValidateAddress
// ═══════════════════════════════════════════

export interface ValidateAddressInput {
  tenantId: string;
  addressId: string;
  correlationId: string;
}

export interface ValidateAddressDeps extends AddressUseCaseDeps {}

export async function validateAddressUseCase(
  input: ValidateAddressInput,
  deps: ValidateAddressDeps,
  policy?: AddressPolicy | null,
): Promise<Result<AddressValidationResult, NotFoundError>> {
  const addr = await deps.addressRepository.findById(input.tenantId, input.addressId);
  if (!addr) {
    return Err(new NotFoundError('Address not found', { details: { addressId: input.addressId } }));
  }

  const result = validateAddressFields(addr, policy ?? null);

  // Update validation status if valid
  if (result.valid) {
    const now = deps.clock.now().toISOString();
    await deps.addressRepository.update(input.addressId, {
      validated: true,
      validatedAt: now,
      updatedAt: now,
    });

    const envelope: EventEnvelope<{ addressId: string; valid: boolean }> = createEnvelope({
      eventId: deps.idGenerator.generate(),
      aggregateId: input.addressId,
      occurredAt: now,
      tenantId: input.tenantId,
      correlationId: input.correlationId,
      causationId: '',
      engine: 'address',
      eventType: 'address.validated',
      schemaRef: 'address.validated.v1',
      payload: { addressId: input.addressId, valid: true },
    });
    await deps.eventBus.emit(envelope);

    await recordAudit(deps.auditLogRepository, {
      addressId: input.addressId,
      tenantId: input.tenantId,
      eventType: 'address_validated',
      metadata: { valid: true, warnings: result.warnings },
    });
  }

  return Ok(result);
}

// ═══════════════════════════════════════════
// NormalizeAddress (persist normalization)
// ═══════════════════════════════════════════

export interface NormalizeAddressInput {
  tenantId: string;
  addressId: string;
  correlationId: string;
}

export async function normalizeAddressUseCase(
  input: NormalizeAddressInput,
  deps: AddressUseCaseDeps,
): Promise<Result<Address, NotFoundError>> {
  const addr = await deps.addressRepository.findById(input.tenantId, input.addressId);
  if (!addr) {
    return Err(new NotFoundError('Address not found', { details: { addressId: input.addressId } }));
  }

  const normalized = normalizeAddressFields({
    line1: addr.line1,
    line2: addr.line2,
    city: addr.city,
    district: addr.district,
    region: addr.region,
    postalCode: addr.postalCode,
    country: addr.country,
    label: addr.label,
    recipientName: addr.recipientName,
    recipientPhone: addr.recipientPhone,
  });

  const patch: Partial<Address> = {};
  if (normalized.line1 !== undefined && normalized.line1 !== addr.line1) patch.line1 = normalized.line1;
  if (normalized.line2 !== undefined && normalized.line2 !== addr.line2) patch.line2 = normalized.line2;
  if (normalized.city !== undefined && normalized.city !== addr.city) patch.city = normalized.city;
  if (normalized.district !== undefined && normalized.district !== addr.district) patch.district = normalized.district;
  if (normalized.region !== undefined && normalized.region !== addr.region) patch.region = normalized.region;
  if (normalized.postalCode !== undefined && normalized.postalCode !== addr.postalCode) patch.postalCode = normalized.postalCode;
  if (normalized.country !== undefined && normalized.country !== addr.country) patch.country = normalized.country;
  if (normalized.label !== undefined && normalized.label !== addr.label) patch.label = normalized.label;
  if (normalized.recipientName !== undefined && normalized.recipientName !== addr.recipientName) patch.recipientName = normalized.recipientName;
  if (normalized.recipientPhone !== undefined && normalized.recipientPhone !== addr.recipientPhone) patch.recipientPhone = normalized.recipientPhone;

  if (Object.keys(patch).length > 0) {
    const now = deps.clock.now().toISOString();
    patch.updatedAt = now;
    patch.version = addr.version + 1;
    await deps.addressRepository.update(input.addressId, patch);

    const envelope: EventEnvelope<{ addressId: string; fields: string[] }> = createEnvelope({
      eventId: deps.idGenerator.generate(),
      aggregateId: input.addressId,
      occurredAt: now,
      tenantId: input.tenantId,
      correlationId: input.correlationId,
      causationId: '',
      engine: 'address',
      eventType: 'address.normalized',
      schemaRef: 'address.normalized.v1',
      payload: { addressId: input.addressId, fields: Object.keys(patch) },
    });
    await deps.eventBus.emit(envelope);

    await recordAudit(deps.auditLogRepository, {
      addressId: input.addressId,
      tenantId: input.tenantId,
      eventType: 'address_normalized',
      metadata: { fields: Object.keys(patch).filter((k) => k !== 'updatedAt' && k !== 'version') },
    });
  }

  return Ok({ ...addr, ...patch });
}

// ═══════════════════════════════════════════
// ForwardGeocode (address string → coordinates)
// ═══════════════════════════════════════════

export interface ForwardGeocodeInput {
  tenantId: string;
  addressId: string;
  correlationId: string;
}

export interface GeocodeDeps extends AddressUseCaseDeps {
  geoRepository: IGeoRepository;
}

export async function forwardGeocodeUseCase(
  input: ForwardGeocodeInput,
  deps: GeocodeDeps,
): Promise<Result<GeoPoint | null, NotFoundError>> {
  const addr = await deps.addressRepository.findById(input.tenantId, input.addressId);
  if (!addr) {
    return Err(new NotFoundError('Address not found', { details: { addressId: input.addressId } }));
  }

  const addressString = `${addr.line1}, ${addr.city}, ${addr.region ?? ''} ${addr.postalCode ?? ''}, ${addr.country}`;
  const geo = await deps.geoRepository.forward(addressString);

  if (geo) {
    const now = deps.clock.now().toISOString();
    await deps.addressRepository.update(input.addressId, { geo, updatedAt: now });
    return Ok(geo);
  }

  return Ok(null);
}

// ═══════════════════════════════════════════
// ReverseGeocode (coordinates → address)
// ═══════════════════════════════════════════

export interface ReverseGeocodeInput {
  latitude: number;
  longitude: number;
  correlationId: string;
}

export async function reverseGeocodeUseCase(
  input: ReverseGeocodeInput,
  deps: Pick<GeocodeDeps, 'geoRepository'>,
): Promise<Result<Partial<Address> | null, ValidationError>> {
  if (input.latitude < -90 || input.latitude > 90) {
    return Err(new ValidationError('Latitude out of range'));
  }
  if (input.longitude < -180 || input.longitude > 180) {
    return Err(new ValidationError('Longitude out of range'));
  }

  const result = await deps.geoRepository.reverse(input.latitude, input.longitude);
  return Ok(result);
}

// ═══════════════════════════════════════════
// FormatAddress (national format output)
// ═══════════════════════════════════════════

export interface FormatAddressInput {
  tenantId: string;
  addressId: string;
  locale?: Locale;
  correlationId: string;
}

export async function formatAddressUseCase(
  input: FormatAddressInput,
  deps: Pick<AddressUseCaseDeps, 'addressRepository'>,
): Promise<Result<FormattedAddress, NotFoundError>> {
  const addr = await deps.addressRepository.findById(input.tenantId, input.addressId);
  if (!addr) {
    return Err(new NotFoundError('Address not found', { details: { addressId: input.addressId } }));
  }

  const formatted = doFormat(addr, input.locale ?? 'en');
  return Ok(formatted);
}
