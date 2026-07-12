/**
 * Address Lifecycle UseCases — Archive, Restore, Delete, SetDefault, ChangeType
 */

import {
  Ok,
  Err,
  type Result,
  NotFoundError,
  ConflictError,
  type EventEnvelope,
  createEnvelope,
} from '@platform/core-sdk';
import { recordAudit } from '../domain/audit.js';
import type {
  IClock,
  IIdGenerator,
  IEventBus,
  IAddressRepository,
  IAuditLogRepository,
  Address,
  AddressType,
} from '../interfaces/index.js';
import type { AddressUseCaseDeps } from './AddressCrudUseCases.js';

// ═══════════════════════════════════════════
// ArchiveAddress
// ═══════════════════════════════════════════

export interface ArchiveAddressInput {
  tenantId: string;
  addressId: string;
  correlationId: string;
}

export async function archiveAddressUseCase(
  input: ArchiveAddressInput,
  deps: AddressUseCaseDeps,
): Promise<Result<void, NotFoundError | ConflictError>> {
  const addr = await deps.addressRepository.findById(input.tenantId, input.addressId);
  if (!addr) {
    return Err(new NotFoundError('Address not found', { details: { addressId: input.addressId } }));
  }
  if (addr.status === 'archived') {
    return Err(new ConflictError('Address already archived', { details: { addressId: input.addressId } }));
  }

  const now = deps.clock.now().toISOString();
  await deps.addressRepository.archive(input.addressId, now);

  const envelope: EventEnvelope<{ addressId: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: input.addressId,
    occurredAt: now,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'address',
    eventType: 'address.archived',
    schemaRef: 'address.archived.v1',
    payload: { addressId: input.addressId },
  });
  await deps.eventBus.emit(envelope);

  await recordAudit(deps.auditLogRepository, {
    addressId: input.addressId,
    tenantId: input.tenantId,
    eventType: 'address_archived',
    metadata: {},
  });

  return Ok(undefined);
}

// ═══════════════════════════════════════════
// RestoreAddress
// ═══════════════════════════════════════════

export interface RestoreAddressInput {
  tenantId: string;
  addressId: string;
  correlationId: string;
}

export async function restoreAddressUseCase(
  input: RestoreAddressInput,
  deps: AddressUseCaseDeps,
): Promise<Result<void, NotFoundError>> {
  // Search archived to find it
  const archived = await deps.addressRepository.search({
    tenantId: input.tenantId,
    status: 'archived',
  });
  const found = archived.addresses.find((a) => a.id === input.addressId);
  if (!found) {
    return Err(new NotFoundError('Archived address not found', { details: { addressId: input.addressId } }));
  }

  await deps.addressRepository.restore(input.addressId);

  const now = deps.clock.now().toISOString();
  const envelope: EventEnvelope<{ addressId: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: input.addressId,
    occurredAt: now,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'address',
    eventType: 'address.restored',
    schemaRef: 'address.restored.v1',
    payload: { addressId: input.addressId },
  });
  await deps.eventBus.emit(envelope);

  await recordAudit(deps.auditLogRepository, {
    addressId: input.addressId,
    tenantId: input.tenantId,
    eventType: 'address_restored',
    metadata: {},
  });

  return Ok(undefined);
}

// ═══════════════════════════════════════════
// DeleteAddress (Hard Delete)
// ═══════════════════════════════════════════

export interface DeleteAddressInput {
  tenantId: string;
  addressId: string;
  correlationId: string;
}

export async function deleteAddressUseCase(
  input: DeleteAddressInput,
  deps: AddressUseCaseDeps,
): Promise<Result<void, NotFoundError>> {
  // Check all statuses (active + archived)
  const allStatuses = await deps.addressRepository.search({
    tenantId: input.tenantId,
  });
  const found = allStatuses.addresses.find(
    (a) => a.id === input.addressId || (a.status === 'archived' && a.id === input.addressId),
  );

  // Also check deleted
  if (!found) {
    // Try softDelete lookup directly
    const softDeleted = await deps.addressRepository.search({
      tenantId: input.tenantId,
      status: 'deleted' as never,
    });
    const deleted = softDeleted.addresses.find((a) => a.id === input.addressId);
    if (!deleted) {
      return Err(new NotFoundError('Address not found', { details: { addressId: input.addressId } }));
    }
  }

  await deps.addressRepository.hardDelete(input.addressId);

  const now = deps.clock.now().toISOString();
  const envelope: EventEnvelope<{ addressId: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: input.addressId,
    occurredAt: now,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'address',
    eventType: 'address.deleted',
    schemaRef: 'address.deleted.v1',
    payload: { addressId: input.addressId },
  });
  await deps.eventBus.emit(envelope);

  await recordAudit(deps.auditLogRepository, {
    addressId: input.addressId,
    tenantId: input.tenantId,
    eventType: 'address_deleted',
    metadata: {},
  });

  return Ok(undefined);
}

// ═══════════════════════════════════════════
// SetDefaultAddress
// ═══════════════════════════════════════════

export interface SetDefaultAddressInput {
  tenantId: string;
  addressId: string;
  correlationId: string;
}

export async function setDefaultAddressUseCase(
  input: SetDefaultAddressInput,
  deps: AddressUseCaseDeps,
): Promise<Result<void, NotFoundError>> {
  const addr = await deps.addressRepository.findById(input.tenantId, input.addressId);
  if (!addr) {
    return Err(new NotFoundError('Address not found', { details: { addressId: input.addressId } }));
  }

  // Unset previous default for same owner + type
  await deps.addressRepository.unsetDefaultForOwner(
    input.tenantId, addr.ownerType, addr.ownerId, addr.type,
  );

  // Set this as default
  await deps.addressRepository.update(input.addressId, { isDefault: true });

  const now = deps.clock.now().toISOString();
  const envelope: EventEnvelope<{ addressId: string; ownerType: string; ownerId: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: input.addressId,
    occurredAt: now,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'address',
    eventType: 'address.default.changed',
    schemaRef: 'address.default.changed.v1',
    payload: { addressId: input.addressId, ownerType: addr.ownerType, ownerId: addr.ownerId },
  });
  await deps.eventBus.emit(envelope);

  await recordAudit(deps.auditLogRepository, {
    addressId: input.addressId,
    tenantId: input.tenantId,
    eventType: 'address_default_changed',
    metadata: { ownerType: addr.ownerType, ownerId: addr.ownerId, type: addr.type },
  });

  return Ok(undefined);
}

// ═══════════════════════════════════════════
// ChangeAddressType
// ═══════════════════════════════════════════

export interface ChangeAddressTypeInput {
  tenantId: string;
  addressId: string;
  newType: AddressType;
  correlationId: string;
}

export async function changeAddressTypeUseCase(
  input: ChangeAddressTypeInput,
  deps: AddressUseCaseDeps,
): Promise<Result<Address, NotFoundError>> {
  const addr = await deps.addressRepository.findById(input.tenantId, input.addressId);
  if (!addr) {
    return Err(new NotFoundError('Address not found', { details: { addressId: input.addressId } }));
  }

  const now = deps.clock.now().toISOString();
  await deps.addressRepository.update(input.addressId, {
    type: input.newType,
    updatedAt: now,
  });

  const envelope: EventEnvelope<{ addressId: string; oldType: string; newType: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: input.addressId,
    occurredAt: now,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'address',
    eventType: 'address.updated',
    schemaRef: 'address.updated.v1',
    payload: { addressId: input.addressId, oldType: addr.type, newType: input.newType },
  });
  await deps.eventBus.emit(envelope);

  await recordAudit(deps.auditLogRepository, {
    addressId: input.addressId,
    tenantId: input.tenantId,
    eventType: 'address_type_changed',
    metadata: { oldType: addr.type, newType: input.newType },
  });

  return Ok({ ...addr, type: input.newType, updatedAt: now });
}
