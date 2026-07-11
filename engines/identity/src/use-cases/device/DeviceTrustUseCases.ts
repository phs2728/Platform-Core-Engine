/**
 * Device Trust UseCases (Epic 9)
 * - Trust Device
 * - Revoke Device
 * - List Devices
 */

import { Ok, Err, type Result, NotFoundError, type EventEnvelope, createEnvelope } from '@platform/core-sdk';
import { recordAudit } from '../../domain/audit.js';
import type {
  IClock,
  IIdGenerator,
  IDeviceRepository,
  IEventBus,
  IAuditLogRepository,
  DeviceRecord,
} from '../../interfaces/index.js';

export interface TrustDeviceInput {
  deviceId: string;
  accountId: string;
  tenantId: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface TrustDeviceDeps {
  deviceRepository: IDeviceRepository;
  eventBus: IEventBus;
  idGenerator: IIdGenerator;
  clock: IClock;
  auditLogRepository: IAuditLogRepository;
}

export async function trustDeviceUseCase(
  input: TrustDeviceInput,
  deps: TrustDeviceDeps,
): Promise<Result<void, NotFoundError>> {
  const devices = await deps.deviceRepository.findByAccount(input.accountId);
  const device = devices.find((d) => d.id === input.deviceId);
  if (!device) {
    return Err(new NotFoundError('Device not found', { details: { deviceId: input.deviceId } }));
  }

  await deps.deviceRepository.trust(input.deviceId);
  const now = deps.clock.now().toISOString();

  const envelope: EventEnvelope<{ deviceId: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: input.accountId,
    occurredAt: now,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'identity',
    eventType: 'device.trusted',
    schemaRef: 'device.trusted.v1',
    payload: { deviceId: input.deviceId },
  });
  await deps.eventBus.emit(envelope);

  await recordAudit(deps.auditLogRepository, {
    accountId: input.accountId,
    tenantId: input.tenantId,
    eventType: 'device_trusted',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { deviceId: input.deviceId },
  });

  return Ok(undefined);
}

export interface RevokeDeviceInput {
  deviceId: string;
  accountId: string;
  tenantId: string;
  correlationId: string;
}

export async function revokeDeviceUseCase(
  input: RevokeDeviceInput,
  deps: TrustDeviceDeps,
): Promise<Result<void, NotFoundError>> {
  const devices = await deps.deviceRepository.findByAccount(input.accountId);
  const device = devices.find((d) => d.id === input.deviceId);
  if (!device) {
    return Err(new NotFoundError('Device not found', { details: { deviceId: input.deviceId } }));
  }

  await deps.deviceRepository.revoke(input.deviceId);
  const now = deps.clock.now().toISOString();

  const envelope: EventEnvelope<{ deviceId: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: input.accountId,
    occurredAt: now,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'identity',
    eventType: 'device.revoked',
    schemaRef: 'device.revoked.v1',
    payload: { deviceId: input.deviceId },
  });
  await deps.eventBus.emit(envelope);

  await recordAudit(deps.auditLogRepository, {
    accountId: input.accountId,
    tenantId: input.tenantId,
    eventType: 'device_revoked',
    metadata: { deviceId: input.deviceId },
  });

  return Ok(undefined);
}

export async function listDevicesUseCase(
  accountId: string,
  deviceRepository: IDeviceRepository,
): Promise<DeviceRecord[]> {
  return deviceRepository.findByAccount(accountId);
}
