/**
 * Organization Lifecycle UseCases
 *
 * 사장님 spec §Public API:
 *   createOrganization / updateOrganization / archiveOrganization /
 *   restoreOrganization / deleteOrganization / getOrganization /
 *   searchOrganizations / listOrganizations / updateOrganizationProfile /
 *   changeOrganizationStatus / changeOrganizationType
 *
 * 5-Step UseCase Pattern (Sprint 2C-1):
 *   1. zod validation
 *   2. Repo lookup (uniqueness check)
 *   3. Business logic (Policy check + entity build)
 *   4. Repo write
 *   5. EventEnvelope emit + Audit + Result return
 */

import {
  Ok,
  Err,
  type Result,
  ValidationError,
  ConflictError,
  NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';

import { recordOrganizationAudit } from '../domain/audit.js';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  updateOrganizationProfileSchema,
  archiveOrganizationSchema,
  restoreOrganizationSchema,
  deleteOrganizationSchema,
  getOrganizationSchema,
  listOrganizationsSchema,
  searchOrganizationsSchema,
  changeOrganizationStatusSchema,
  changeOrganizationTypeSchema,
} from '../domain/validation.js';
import { emitOrganizationEvent } from '../domain/events.js';
import {
  isMutable,
  canRestore,
  validateStatusTransition,
} from '../domain/statusTransition.js';
import type { OrganizationUseCaseDeps } from './types.js';
import type {
  Organization,
  OrganizationProfile,
  OrganizationSearchCriteria,
  OrganizationSearchResult,
  OrganizationStatus,
  OrganizationType,
} from '../interfaces/index.js';

// ════════════════════════════════════════════════════════════════════════════
// CREATE
// ════════════════════════════════════════════════════════════════════════════

export interface CreateOrganizationInput {
  tenantId: string;
  correlationId: string;
  actorId: string;
  displayName: string;
  legalName?: string;
  businessNumber?: string;
  taxNumber?: string;
  registrationNumber?: string;
  website?: string;
  logo?: string;
  brandColor?: string;
  industry?: string;
  description?: string;
  country?: string;
  primaryAddressId?: string;
  primaryEmail?: string;
  primaryPhone?: string;
  type: OrganizationType;
  initialStatus?: OrganizationStatus;
  metadata?: Record<string, unknown>;
}

export interface CreateOrganizationOutput {
  organizationId: string;
  createdAt: string;
}

export async function createOrganizationUseCase(
  input: CreateOrganizationInput,
  deps: OrganizationUseCaseDeps,
): Promise<Result<CreateOrganizationOutput, ValidationError | ConflictError>> {
  // 1) Validation
  const validation = createOrganizationSchema.safeParse(input);
  if (!validation.success) {
    return Err(new ValidationError('Invalid organization input', {
      details: { issues: validation.error.errors },
    }));
  }
  const data = validation.data;

  // 2) Uniqueness check
  if (data.businessNumber !== undefined) {
    const exists = await deps.organizationRepo.existsByBusinessNumber(
      data.tenantId, data.businessNumber,
    );
    if (exists) {
      return Err(new ConflictError(
        'businessNumber already exists in this tenant',
        { details: { businessNumber: data.businessNumber } },
      ));
    }
  }
  if (data.taxNumber !== undefined) {
    const exists = await deps.organizationRepo.existsByTaxNumber(
      data.tenantId, data.taxNumber,
    );
    if (exists) {
      return Err(new ConflictError(
        'taxNumber already exists in this tenant',
        { details: { taxNumber: data.taxNumber } },
      ));
    }
  }

  // 3) Policy & verification
  const allowedTypes = await deps.policyProvider.getAllowedOrganizationTypes(data.tenantId);
  if (!allowedTypes.includes(data.type)) {
    return Err(new ValidationError(
      `Organization type "${data.type}" is not allowed by tenant policy`,
      { details: { type: data.type, allowed: allowedTypes } },
    ));
  }

  if (data.country !== undefined) {
    const allowedCountries = await deps.policyProvider.getAllowedCountries(data.tenantId);
    if (!allowedCountries.includes(data.country)) {
      return Err(new ValidationError(
        `Country "${data.country}" is not allowed by tenant policy`,
        { details: { country: data.country, allowed: allowedCountries } },
      ));
    }
  }

  if (data.primaryAddressId !== undefined) {
    const valid = await deps.addressVerifier.verify(data.tenantId, data.primaryAddressId);
    if (!valid) {
      return Err(new ValidationError(
        'primaryAddressId not found in Address Engine',
        { details: { primaryAddressId: data.primaryAddressId } },
      ));
    }
  }

  // 4) Entity creation + Repo write
  const organizationId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const initialStatus: OrganizationStatus = data.initialStatus ?? 'Active';

  if (!isMutable(initialStatus) && initialStatus !== 'Pending') {
    return Err(new ValidationError(
      `initialStatus "${initialStatus}" is not valid for a new organization`,
    ));
  }

  const profile: OrganizationProfile = { displayName: data.displayName };
  if (data.legalName !== undefined) profile.legalName = data.legalName;
  if (data.businessNumber !== undefined) profile.businessNumber = data.businessNumber;
  if (data.taxNumber !== undefined) profile.taxNumber = data.taxNumber;
  if (data.registrationNumber !== undefined) profile.registrationNumber = data.registrationNumber;
  if (data.website !== undefined) profile.website = data.website;
  if (data.logo !== undefined) profile.logo = data.logo;
  if (data.brandColor !== undefined) profile.brandColor = data.brandColor;
  if (data.industry !== undefined) profile.industry = data.industry;
  if (data.description !== undefined) profile.description = data.description;
  if (data.country !== undefined) profile.country = data.country;
  if (data.primaryAddressId !== undefined) profile.primaryAddressId = data.primaryAddressId;
  if (data.primaryEmail !== undefined) profile.primaryEmail = data.primaryEmail;
  if (data.primaryPhone !== undefined) profile.primaryPhone = data.primaryPhone;

  const org: Organization = {
    id: organizationId,
    tenantId: data.tenantId,
    type: data.type,
    status: initialStatus,
    profile,
    metadata: data.metadata ?? {},
    createdAt: now,
    createdBy: data.actorId,
    updatedAt: now,
    updatedBy: data.actorId,
    archivedAt: null,
    deletedAt: null,
  };

  await deps.organizationRepo.insert(org);

  // 5) Event + Audit
  const envelope: EventEnvelope<{
    organizationId: string;
    type: OrganizationType;
    status: OrganizationStatus;
    displayName: string;
    tenantId: string;
  }> = await emitOrganizationEvent(
    deps,
    {
      aggregateId: organizationId,
      tenantId: data.tenantId,
      correlationId: data.correlationId,
    },
    'organization.created',
    'organization.created.v1',
    {
      organizationId,
      type: data.type,
      status: initialStatus,
      displayName: data.displayName,
      tenantId: data.tenantId,
    },
  );
  await deps.eventBus.emit(envelope);

  await recordOrganizationAudit(deps.auditRepo, {
    organizationId,
    tenantId: data.tenantId,
    actorId: data.actorId,
    correlationId: data.correlationId,
    eventType: 'organization_created',
    metadata: { displayName: data.displayName, type: data.type, status: initialStatus },
  });

  return Ok({ organizationId, createdAt: now });
}

// ════════════════════════════════════════════════════════════════════════════
// UPDATE
// ════════════════════════════════════════════════════════════════════════════

export interface UpdateOrganizationInput {
  tenantId: string;
  correlationId: string;
  actorId: string;
  organizationId: string;
  displayName?: string;
  legalName?: string;
  businessNumber?: string;
  taxNumber?: string;
  registrationNumber?: string;
  website?: string;
  logo?: string;
  brandColor?: string;
  industry?: string;
  description?: string;
  country?: string;
  primaryAddressId?: string;
  primaryEmail?: string;
  primaryPhone?: string;
}

export type UpdateOrganizationError = ValidationError | NotFoundError | ConflictError;

export async function updateOrganizationUseCase(
  input: UpdateOrganizationInput,
  deps: OrganizationUseCaseDeps,
): Promise<Result<Organization, UpdateOrganizationError>> {
  const validation = updateOrganizationSchema.safeParse(input);
  if (!validation.success) {
    return Err(new ValidationError('Invalid update input', {
      details: { issues: validation.error.errors },
    }));
  }
  const data = validation.data;

  const existing = await deps.organizationRepo.findById(data.tenantId, data.organizationId);
  if (!existing) {
    return Err(new NotFoundError('Organization not found', {
      details: { organizationId: data.organizationId },
    }));
  }
  if (!isMutable(existing.status)) {
    return Err(new ConflictError(
      `Cannot update organization in status "${existing.status}"`,
      { details: { status: existing.status } },
    ));
  }

  // unique re-check
  if (data.businessNumber !== undefined && data.businessNumber !== existing.profile.businessNumber) {
    const exists = await deps.organizationRepo.existsByBusinessNumber(
      data.tenantId, data.businessNumber, data.organizationId,
    );
    if (exists) {
      return Err(new ConflictError(
        'businessNumber already exists in this tenant',
        { details: { businessNumber: data.businessNumber } },
      ));
    }
  }
  if (data.taxNumber !== undefined && data.taxNumber !== existing.profile.taxNumber) {
    const exists = await deps.organizationRepo.existsByTaxNumber(
      data.tenantId, data.taxNumber, data.organizationId,
    );
    if (exists) {
      return Err(new ConflictError(
        'taxNumber already exists in this tenant',
        { details: { taxNumber: data.taxNumber } },
      ));
    }
  }

  if (data.primaryAddressId !== undefined) {
    const valid = await deps.addressVerifier.verify(data.tenantId, data.primaryAddressId);
    if (!valid) {
      return Err(new ValidationError(
        'primaryAddressId not found in Address Engine',
        { details: { primaryAddressId: data.primaryAddressId } },
      ));
    }
  }

  const updatedProfile: OrganizationProfile = { displayName: existing.profile.displayName };
  for (const key of [
    'legalName', 'businessNumber', 'taxNumber', 'registrationNumber',
    'website', 'logo', 'brandColor', 'industry', 'description',
    'country', 'primaryAddressId', 'primaryEmail', 'primaryPhone',
  ] as const) {
    const incoming = data[key];
    const prev = existing.profile[key];
    if (incoming !== undefined) {
      updatedProfile[key] = incoming;
    } else if (prev !== undefined) {
      updatedProfile[key] = prev;
    }
  }
  if (data.displayName !== undefined) updatedProfile.displayName = data.displayName;

  const now = deps.clock.now().toISOString();
  const updated: Organization = {
    ...existing,
    profile: updatedProfile,
    updatedAt: now,
    updatedBy: data.actorId,
  };

  await deps.organizationRepo.update(data.tenantId, data.organizationId, {
    profile: updatedProfile,
    updatedAt: now,
    updatedBy: data.actorId,
  });

  const fieldsUpdated = Object.keys(updateOrganizationSchema.shape).filter(
    (k) =>
      k !== 'tenantId' &&
      k !== 'correlationId' &&
      k !== 'actorId' &&
      k !== 'organizationId' &&
      (data as Record<string, unknown>)[k] !== undefined,
  );

  const envelope: EventEnvelope<{
    organizationId: string;
    tenantId: string;
    fieldsUpdated: string[];
  }> = await emitOrganizationEvent(
    deps,
    {
      aggregateId: data.organizationId,
      tenantId: data.tenantId,
      correlationId: data.correlationId,
    },
    'organization.updated',
    'organization.updated.v1',
    {
      organizationId: data.organizationId,
      tenantId: data.tenantId,
      fieldsUpdated,
    },
  );
  await deps.eventBus.emit(envelope);

  await recordOrganizationAudit(deps.auditRepo, {
    organizationId: data.organizationId,
    tenantId: data.tenantId,
    actorId: data.actorId,
    correlationId: data.correlationId,
    eventType: 'organization_updated',
    metadata: { fieldsUpdated },
  });

  return Ok(updated);
}

// ════════════════════════════════════════════════════════════════════════════
// UPDATE PROFILE (전체 교체 / bulk)
// ════════════════════════════════════════════════════════════════════════════

export interface UpdateOrganizationProfileInput {
  tenantId: string;
  correlationId: string;
  actorId: string;
  organizationId: string;
  profile: OrganizationProfile;
}

export async function updateOrganizationProfileUseCase(
  input: UpdateOrganizationProfileInput,
  deps: OrganizationUseCaseDeps,
): Promise<Result<Organization, UpdateOrganizationError>> {
  const validation = updateOrganizationProfileSchema.safeParse(input);
  if (!validation.success) {
    return Err(new ValidationError('Invalid profile', {
      details: { issues: validation.error.errors },
    }));
  }
  const data = validation.data;

  const existing = await deps.organizationRepo.findById(data.tenantId, data.organizationId);
  if (!existing) {
    return Err(new NotFoundError('Organization not found', {
      details: { organizationId: data.organizationId },
    }));
  }
  if (!isMutable(existing.status)) {
    return Err(new ConflictError(
      `Cannot update profile — organization status is "${existing.status}"`,
      { details: { status: existing.status } },
    ));
  }

  if (data.profile.primaryAddressId !== undefined) {
    const valid = await deps.addressVerifier.verify(data.tenantId, data.profile.primaryAddressId);
    if (!valid) {
      return Err(new ValidationError(
        'primaryAddressId not found in Address Engine',
      ));
    }
  }

  const now = deps.clock.now().toISOString();
  // Strip undefined values to satisfy exactOptionalPropertyTypes: true.
  const sanitizedProfile: OrganizationProfile = { displayName: data.profile.displayName };
  for (const key of [
    'legalName', 'businessNumber', 'taxNumber', 'registrationNumber',
    'website', 'logo', 'brandColor', 'industry', 'description',
    'country', 'primaryAddressId', 'primaryEmail', 'primaryPhone',
  ] as const) {
    const value = data.profile[key];
    if (value !== undefined) {
      sanitizedProfile[key] = value;
    }
  }
  const updated: Organization = {
    ...existing,
    profile: sanitizedProfile,
    updatedAt: now,
    updatedBy: data.actorId,
  };
  await deps.organizationRepo.update(data.tenantId, data.organizationId, {
    profile: sanitizedProfile,
    updatedAt: now,
    updatedBy: data.actorId,
  });

  const envelope: EventEnvelope<{ organizationId: string; tenantId: string }> =
    await emitOrganizationEvent(
      deps,
      {
        aggregateId: data.organizationId,
        tenantId: data.tenantId,
        correlationId: data.correlationId,
      },
      'organization.profile.updated',
      'organization.profile.updated.v1',
      { organizationId: data.organizationId, tenantId: data.tenantId },
    );
  await deps.eventBus.emit(envelope);

  await recordOrganizationAudit(deps.auditRepo, {
    organizationId: data.organizationId,
    tenantId: data.tenantId,
    actorId: data.actorId,
    correlationId: data.correlationId,
    eventType: 'organization_profile_updated',
    metadata: { displayName: data.profile.displayName },
  });

  return Ok(updated);
}

// ════════════════════════════════════════════════════════════════════════════
// ARCHIVE
// ════════════════════════════════════════════════════════════════════════════

export interface ArchiveOrganizationInput {
  tenantId: string;
  correlationId: string;
  actorId: string;
  organizationId: string;
  reason?: string;
}

export type ArchiveOrganizationError = ValidationError | NotFoundError | ConflictError;

export async function archiveOrganizationUseCase(
  input: ArchiveOrganizationInput,
  deps: OrganizationUseCaseDeps,
): Promise<Result<Organization, ArchiveOrganizationError>> {
  const validation = archiveOrganizationSchema.safeParse(input);
  if (!validation.success) {
    return Err(new ValidationError('Invalid archive input', {
      details: { issues: validation.error.errors },
    }));
  }
  const data = validation.data;

  const existing = await deps.organizationRepo.findById(data.tenantId, data.organizationId);
  if (!existing) {
    return Err(new NotFoundError('Organization not found', {
      details: { organizationId: data.organizationId },
    }));
  }
  if (existing.status === 'Archived') {
    return Err(new ConflictError('Organization is already archived'));
  }
  if (existing.status === 'Deleted') {
    return Err(new ConflictError('Cannot archive deleted organization'));
  }

  const now = deps.clock.now().toISOString();
  const updated: Organization = {
    ...existing,
    status: 'Archived',
    archivedAt: now,
    updatedAt: now,
    updatedBy: data.actorId,
  };
  await deps.organizationRepo.update(data.tenantId, data.organizationId, {
    status: 'Archived',
    archivedAt: now,
    updatedAt: now,
    updatedBy: data.actorId,
  });

  const envelope: EventEnvelope<{
    organizationId: string;
    tenantId: string;
    previousStatus: OrganizationStatus;
    reason?: string | undefined;
  }> = await emitOrganizationEvent(
    deps,
    {
      aggregateId: data.organizationId,
      tenantId: data.tenantId,
      correlationId: data.correlationId,
    },
    'organization.archived',
    'organization.archived.v1',
    {
      organizationId: data.organizationId,
      tenantId: data.tenantId,
      previousStatus: existing.status,
      ...(data.reason !== undefined ? { reason: data.reason } : {}),
    },
  );
  await deps.eventBus.emit(envelope);

  await recordOrganizationAudit(deps.auditRepo, {
    organizationId: data.organizationId,
    tenantId: data.tenantId,
    actorId: data.actorId,
    correlationId: data.correlationId,
    eventType: 'organization_archived',
    metadata: {
      previousStatus: existing.status,
      ...(data.reason !== undefined ? { reason: data.reason } : {}),
    },
  });

  return Ok(updated);
}

// ════════════════════════════════════════════════════════════════════════════
// RESTORE
// ════════════════════════════════════════════════════════════════════════════

export interface RestoreOrganizationInput {
  tenantId: string;
  correlationId: string;
  actorId: string;
  organizationId: string;
}

export type RestoreOrganizationError = ValidationError | NotFoundError | ConflictError;

export async function restoreOrganizationUseCase(
  input: RestoreOrganizationInput,
  deps: OrganizationUseCaseDeps,
): Promise<Result<Organization, RestoreOrganizationError>> {
  const validation = restoreOrganizationSchema.safeParse(input);
  if (!validation.success) {
    return Err(new ValidationError('Invalid restore input', {
      details: { issues: validation.error.errors },
    }));
  }
  const data = validation.data;

  const existing = await deps.organizationRepo.findById(data.tenantId, data.organizationId);
  if (!existing) {
    return Err(new NotFoundError('Organization not found'));
  }
  if (!canRestore(existing.status)) {
    return Err(new ConflictError(
      `Cannot restore organization in status "${existing.status}"`,
      { details: { currentStatus: existing.status } },
    ));
  }

  const now = deps.clock.now().toISOString();
  const updated: Organization = {
    ...existing,
    status: 'Active',
    archivedAt: null,
    updatedAt: now,
    updatedBy: data.actorId,
  };
  await deps.organizationRepo.update(data.tenantId, data.organizationId, {
    status: 'Active',
    archivedAt: null,
    updatedAt: now,
    updatedBy: data.actorId,
  });

  const envelope: EventEnvelope<{ organizationId: string; tenantId: string }> =
    await emitOrganizationEvent(
      deps,
      {
        aggregateId: data.organizationId,
        tenantId: data.tenantId,
        correlationId: data.correlationId,
      },
      'organization.restored',
      'organization.restored.v1',
      { organizationId: data.organizationId, tenantId: data.tenantId },
    );
  await deps.eventBus.emit(envelope);

  await recordOrganizationAudit(deps.auditRepo, {
    organizationId: data.organizationId,
    tenantId: data.tenantId,
    actorId: data.actorId,
    correlationId: data.correlationId,
    eventType: 'organization_restored',
    metadata: { restoredFrom: 'Archived' },
  });

  return Ok(updated);
}

// ════════════════════════════════════════════════════════════════════════════
// DELETE (soft — sets status=Deleted + deletedAt)
// ════════════════════════════════════════════════════════════════════════════

export interface DeleteOrganizationInput {
  tenantId: string;
  correlationId: string;
  actorId: string;
  organizationId: string;
}

export type DeleteOrganizationError = ValidationError | NotFoundError | ConflictError;

export async function deleteOrganizationUseCase(
  input: DeleteOrganizationInput,
  deps: OrganizationUseCaseDeps,
): Promise<Result<{ organizationId: string; deletedAt: string }, DeleteOrganizationError>> {
  const validation = deleteOrganizationSchema.safeParse(input);
  if (!validation.success) {
    return Err(new ValidationError('Invalid delete input', {
      details: { issues: validation.error.errors },
    }));
  }
  const data = validation.data;

  const existing = await deps.organizationRepo.findById(data.tenantId, data.organizationId);
  if (!existing) {
    return Err(new NotFoundError('Organization not found'));
  }
  if (existing.status === 'Deleted') {
    return Err(new ConflictError('Organization is already deleted'));
  }

  const now = deps.clock.now().toISOString();
  await deps.organizationRepo.update(data.tenantId, data.organizationId, {
    status: 'Deleted',
    deletedAt: now,
    updatedAt: now,
    updatedBy: data.actorId,
  });

  const envelope: EventEnvelope<{ organizationId: string; tenantId: string }> =
    await emitOrganizationEvent(
      deps,
      {
        aggregateId: data.organizationId,
        tenantId: data.tenantId,
        correlationId: data.correlationId,
      },
      'organization.deleted',
      'organization.deleted.v1',
      { organizationId: data.organizationId, tenantId: data.tenantId },
    );
  await deps.eventBus.emit(envelope);

  await recordOrganizationAudit(deps.auditRepo, {
    organizationId: data.organizationId,
    tenantId: data.tenantId,
    actorId: data.actorId,
    correlationId: data.correlationId,
    eventType: 'organization_deleted',
    metadata: { previousStatus: existing.status },
  });

  return Ok({ organizationId: data.organizationId, deletedAt: now });
}

// ════════════════════════════════════════════════════════════════════════════
// GET / LIST / SEARCH
// ════════════════════════════════════════════════════════════════════════════

export interface GetOrganizationInput {
  tenantId: string;
  organizationId: string;
}

/** Returns Ok(null) if not found — distinguishes Ok(Organization) vs Ok(null). */
export async function getOrganizationUseCase(
  input: GetOrganizationInput,
  deps: OrganizationUseCaseDeps,
): Promise<Result<Organization | null, ValidationError>> {
  const validation = getOrganizationSchema.safeParse(input);
  if (!validation.success) {
    return Err(new ValidationError('Invalid get input', {
      details: { issues: validation.error.errors },
    }));
  }
  const data = validation.data;
  const org = await deps.organizationRepo.findById(data.tenantId, data.organizationId);
  return Ok(org);
}

export interface ListOrganizationsInput {
  tenantId: string;
  limit?: number;
  offset?: number;
}

export async function listOrganizationsUseCase(
  input: ListOrganizationsInput,
  deps: OrganizationUseCaseDeps,
): Promise<Result<OrganizationSearchResult, ValidationError>> {
  const validation = listOrganizationsSchema.safeParse(input);
  if (!validation.success) {
    return Err(new ValidationError('Invalid list input', {
      details: { issues: validation.error.errors },
    }));
  }
  const data = validation.data;
  const criteria: OrganizationSearchCriteria = {
    tenantId: data.tenantId,
    ...(data.limit !== undefined ? { limit: data.limit } : {}),
    ...(data.offset !== undefined ? { offset: data.offset } : {}),
  };
  const result = await deps.organizationRepo.search(criteria);
  return Ok(result);
}

export async function searchOrganizationsUseCase(
  input: OrganizationSearchCriteria,
  deps: OrganizationUseCaseDeps,
): Promise<Result<OrganizationSearchResult, ValidationError>> {
  // For Sprint 1, memberUserId는 membershipRepo로 후처리.
  const validation = searchOrganizationsSchema.safeParse(input);
  if (!validation.success) {
    return Err(new ValidationError('Invalid search input', {
      details: { issues: validation.error.errors },
    }));
  }
  const data = validation.data;

  let memberUserId: string | undefined;
  if (data.memberUserId !== undefined) {
    memberUserId = data.memberUserId;
    // 멤버십 검색 후 조직 ID 필터링
    const memberships = await deps.membershipRepo.listByUser(data.tenantId, memberUserId);
    const orgIds = new Set(memberships.filter((m) => m.status === 'active').map((m) => m.organizationId));
    if (orgIds.size === 0) {
      return Ok({ organizations: [], total: 0, limit: data.limit ?? 20, offset: data.offset ?? 0 });
    }
    // 검색 시 임시로 모든 후보를 가져와 orgIds로 필터 (in-memory; Sprint 2에서 Repo 단계 pushdown)
    const tmpCriteria: OrganizationSearchCriteria = {
      tenantId: data.tenantId,
      ...(data.limit !== undefined ? { limit: data.limit } : {}),
      ...(data.offset !== undefined ? { offset: data.offset } : {}),
    };
    const all = await deps.organizationRepo.search(tmpCriteria);
    const filtered = {
      ...all,
      organizations: all.organizations.filter((o) => orgIds.has(o.id)),
      total: all.organizations.filter((o) => orgIds.has(o.id)).length,
    };
    return Ok(filtered);
  }

  const criteria: OrganizationSearchCriteria = {
    tenantId: data.tenantId,
    ...(data.query !== undefined ? { query: data.query } : {}),
    ...(data.type !== undefined ? { type: data.type } : {}),
    ...(data.status !== undefined ? { status: data.status } : {}),
    ...(data.industry !== undefined ? { industry: data.industry } : {}),
    ...(data.country !== undefined ? { country: data.country } : {}),
    ...(data.businessNumber !== undefined ? { businessNumber: data.businessNumber } : {}),
    ...(data.taxNumber !== undefined ? { taxNumber: data.taxNumber } : {}),
    ...(data.limit !== undefined ? { limit: data.limit } : {}),
    ...(data.offset !== undefined ? { offset: data.offset } : {}),
    ...(data.sortBy !== undefined ? { sortBy: data.sortBy } : {}),
    ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
  };

  const result = await deps.organizationRepo.search(criteria);
  return Ok(result);
}

// ════════════════════════════════════════════════════════════════════════════
// STATUS CHANGE
// ════════════════════════════════════════════════════════════════════════════

export interface ChangeOrganizationStatusInput {
  tenantId: string;
  correlationId: string;
  actorId: string;
  organizationId: string;
  newStatus: OrganizationStatus;
  reason?: string;
}

export async function changeOrganizationStatusUseCase(
  input: ChangeOrganizationStatusInput,
  deps: OrganizationUseCaseDeps,
): Promise<Result<Organization, ValidationError | NotFoundError | ConflictError>> {
  const validation = changeOrganizationStatusSchema.safeParse(input);
  if (!validation.success) {
    return Err(new ValidationError('Invalid status input', {
      details: { issues: validation.error.errors },
    }));
  }
  const data = validation.data;

  const existing = await deps.organizationRepo.findById(data.tenantId, data.organizationId);
  if (!existing) {
    return Err(new NotFoundError('Organization not found'));
  }

  const transitionResult = validateStatusTransition(existing.status, data.newStatus);
  if (!transitionResult.ok) {
    return Err(transitionResult.error);
  }

  const now = deps.clock.now().toISOString();
  const updated: Organization = {
    ...existing,
    status: data.newStatus,
    updatedAt: now,
    updatedBy: data.actorId,
  };
  if (data.newStatus === 'Archived') updated.archivedAt = now;

  await deps.organizationRepo.update(data.tenantId, data.organizationId, {
    status: data.newStatus,
    archivedAt: data.newStatus === 'Archived' ? now : existing.archivedAt,
    updatedAt: now,
    updatedBy: data.actorId,
  });

  const envelope: EventEnvelope<{
    organizationId: string;
    tenantId: string;
    previousStatus: OrganizationStatus;
    newStatus: OrganizationStatus;
    reason?: string | undefined;
  }> = await emitOrganizationEvent(
    deps,
    {
      aggregateId: data.organizationId,
      tenantId: data.tenantId,
      correlationId: data.correlationId,
    },
    'organization.status.changed',
    'organization.status.changed.v1',
    {
      organizationId: data.organizationId,
      tenantId: data.tenantId,
      previousStatus: existing.status,
      newStatus: data.newStatus,
      ...(data.reason !== undefined ? { reason: data.reason } : {}),
    },
  );
  await deps.eventBus.emit(envelope);

  await recordOrganizationAudit(deps.auditRepo, {
    organizationId: data.organizationId,
    tenantId: data.tenantId,
    actorId: data.actorId,
    correlationId: data.correlationId,
    eventType: 'organization_status_changed',
    metadata: {
      previousStatus: existing.status,
      newStatus: data.newStatus,
      ...(data.reason !== undefined ? { reason: data.reason } : {}),
    },
  });

  return Ok(updated);
}

// ════════════════════════════════════════════════════════════════════════════
// TYPE CHANGE
// ════════════════════════════════════════════════════════════════════════════

export interface ChangeOrganizationTypeInput {
  tenantId: string;
  correlationId: string;
  actorId: string;
  organizationId: string;
  newType: OrganizationType;
}

export async function changeOrganizationTypeUseCase(
  input: ChangeOrganizationTypeInput,
  deps: OrganizationUseCaseDeps,
): Promise<Result<Organization, ValidationError | NotFoundError | ConflictError>> {
  const validation = changeOrganizationTypeSchema.safeParse(input);
  if (!validation.success) {
    return Err(new ValidationError('Invalid type input', {
      details: { issues: validation.error.errors },
    }));
  }
  const data = validation.data;

  const existing = await deps.organizationRepo.findById(data.tenantId, data.organizationId);
  if (!existing) {
    return Err(new NotFoundError('Organization not found'));
  }
  if (!isMutable(existing.status)) {
    return Err(new ConflictError(
      `Cannot change type — organization status is "${existing.status}"`,
    ));
  }

  const allowedTypes = await deps.policyProvider.getAllowedOrganizationTypes(data.tenantId);
  if (!allowedTypes.includes(data.newType)) {
    return Err(new ValidationError(
      `Organization type "${data.newType}" is not allowed by tenant policy`,
      { details: { newType: data.newType, allowed: allowedTypes } },
    ));
  }

  if (existing.type === data.newType) {
    return Err(new ConflictError(`Organization is already type "${data.newType}"`));
  }

  const now = deps.clock.now().toISOString();
  const updated: Organization = {
    ...existing,
    type: data.newType,
    updatedAt: now,
    updatedBy: data.actorId,
  };
  await deps.organizationRepo.update(data.tenantId, data.organizationId, {
    type: data.newType,
    updatedAt: now,
    updatedBy: data.actorId,
  });

  const envelope: EventEnvelope<{
    organizationId: string;
    tenantId: string;
    previousType: OrganizationType;
    newType: OrganizationType;
  }> = await emitOrganizationEvent(
    deps,
    {
      aggregateId: data.organizationId,
      tenantId: data.tenantId,
      correlationId: data.correlationId,
    },
    'organization.type.changed',
    'organization.type.changed.v1',
    {
      organizationId: data.organizationId,
      tenantId: data.tenantId,
      previousType: existing.type,
      newType: data.newType,
    },
  );
  await deps.eventBus.emit(envelope);

  await recordOrganizationAudit(deps.auditRepo, {
    organizationId: data.organizationId,
    tenantId: data.tenantId,
    actorId: data.actorId,
    correlationId: data.correlationId,
    eventType: 'organization_type_changed',
    metadata: { previousType: existing.type, newType: data.newType },
  });

  return Ok(updated);
}
