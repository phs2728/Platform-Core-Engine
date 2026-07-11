/**
 * Catalog Core UseCases (8개) — 사장님 확립 Sprint 1
 *
 *   createCatalog / updateCatalog / archiveCatalog / restoreCatalog /
 *   deleteCatalog / getCatalog / listCatalogs / searchCatalogs
 *
 * 5-Step Use Case Pattern:
 *   1. zod validate
 *   2. Repo lookup + uniqueness + Organization Ownership 검증
 *   3. Business logic (CustomDataPolicy = Use Case 진입 시 1회)
 *   4. Repo write
 *   5. EventEnvelope + Audit + Result<T,E>
 *
 * 사장님 확립: CustomDataPolicy는 Use Case 진입 시 1회 호출 (중간 호출 ❌)
 */

import {
  Ok, Err, type Result,
  ValidationError, ConflictError, NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';

import { recordCatalogAudit } from '../domain/audit.js';
import {
  createCatalogSchema, updateCatalogSchema,
  archiveCatalogSchema, restoreCatalogSchema, deleteCatalogSchema,
  getCatalogSchema, searchCatalogsSchema,
} from '../domain/validation.js';
import { emitCatalogEvent } from '../domain/events.js';
import { isCatalogMutable } from '../domain/statusTransition.js';
import type { CatalogUseCaseDeps } from './types.js';
import type {
  Catalog, CatalogSearchCriteria, CatalogSearchResult, CatalogStatus,
} from '../interfaces/index.js';

// ════════════════════════════════════════════════════════════════════════════
// CREATE
// ════════════════════════════════════════════════════════════════════════════

export interface CreateCatalogInput {
  tenantId: string; correlationId: string; actorId: string;
  organizationId: string;
  name: string; slug: string;
  description?: string;
  type: string;
  initialStatus?: CatalogStatus;
  attributes?: Record<string, unknown>;
  customFields?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  searchKeywords?: string[];
  tags?: string[];
}

export async function createCatalogUseCase(
  input: CreateCatalogInput,
  deps: CatalogUseCaseDeps,
): Promise<Result<{ catalogId: string; createdAt: string }, ValidationError | ConflictError>> {
  const v = createCatalogSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid catalog input', { details: { issues: v.error.errors } }));
  const d = v.data;

  // Organization Ownership 검증 (사장님 확립: 모든 Business Resource)
  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found', { details: { organizationId: d.organizationId } }));

  // Slug uniqueness (Tenant 내)
  if (await deps.catalogRepo.existsBySlug(d.tenantId, d.slug)) {
    return Err(new ConflictError('slug already exists in this tenant', { details: { slug: d.slug } }));
  }

  // CustomDataPolicy = Use Case 진입 시 1회 (사장님 확립)
  const allowedTypes = await deps.policyProvider.getAllowedTypes(d.tenantId);
  if (!allowedTypes.includes(d.type)) {
    return Err(new ValidationError(`type "${d.type}" not allowed`, { details: { allowed: allowedTypes } }));
  }
  const attrs = d.attributes ?? {};
  const policyResult = await deps.policyProvider.validateAttributes(d.tenantId, d.type, attrs);
  if (!policyResult.ok) return Err(new ValidationError('CustomDataPolicy rejected attributes', { details: { reason: String(policyResult.error) } }));

  const catalogId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const initialStatus: CatalogStatus = d.initialStatus ?? 'Active';
  if (!isCatalogMutable(initialStatus) && initialStatus !== 'Draft') {
    return Err(new ValidationError(`initialStatus "${initialStatus}" not valid`));
  }

  const catalog: Catalog = {
    id: catalogId,
    tenantId: d.tenantId,
    organizationId: d.organizationId,
    name: d.name,
    slug: d.slug,
    status: initialStatus,
    type: d.type,
    attributes: policyResult.value,
    customFields: d.customFields ?? {},
    metadata: d.metadata ?? {},
    searchKeywords: d.searchKeywords ?? [],
    tags: d.tags ?? [],
    createdAt: now, createdBy: d.actorId,
    updatedAt: now, updatedBy: d.actorId,
    archivedAt: null, deletedAt: null,
  };
  if (d.description !== undefined) catalog.description = d.description;

  await deps.catalogRepo.insert(catalog);

  const envelope: EventEnvelope<{ catalogId: string; type: string; status: CatalogStatus; tenantId: string }> =
    await emitCatalogEvent(deps,
      { aggregateId: catalogId, tenantId: d.tenantId, correlationId: d.correlationId },
      'catalog.created', 'catalog.created.v1',
      { catalogId, type: d.type, status: initialStatus, tenantId: d.tenantId });
  await deps.eventBus.emit(envelope);

  await recordCatalogAudit(deps.auditRepo, {
    organizationId: d.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    catalogId, eventType: 'catalog_created',
    metadata: { name: d.name, type: d.type, status: initialStatus },
  });

  return Ok({ catalogId, createdAt: now });
}

// ════════════════════════════════════════════════════════════════════════════
// UPDATE
// ════════════════════════════════════════════════════════════════════════════

export interface UpdateCatalogInput {
  tenantId: string; correlationId: string; actorId: string; catalogId: string;
  name?: string; description?: string;
  attributes?: Record<string, unknown>;
  customFields?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  searchKeywords?: string[];
  tags?: string[];
}

export async function updateCatalogUseCase(
  input: UpdateCatalogInput,
  deps: CatalogUseCaseDeps,
): Promise<Result<Catalog, ValidationError | NotFoundError | ConflictError>> {
  const v = updateCatalogSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid update input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.catalogRepo.findById(d.tenantId, d.catalogId);
  if (!existing) return Err(new NotFoundError('Catalog not found'));
  if (!isCatalogMutable(existing.status)) {
    return Err(new ConflictError(`Cannot update — status "${existing.status}"`));
  }

  // CustomDataPolicy (attributes 변경 시 1회)
  let validatedAttrs = existing.attributes;
  if (d.attributes !== undefined) {
    const pr = await deps.policyProvider.validateAttributes(d.tenantId, existing.type, d.attributes);
    if (!pr.ok) return Err(new ValidationError('CustomDataPolicy rejected attributes'));
    validatedAttrs = pr.value;
  }

  const now = deps.clock.now().toISOString();
  const updated: Catalog = { ...existing, updatedAt: now, updatedBy: d.actorId };
  if (d.name !== undefined) updated.name = d.name;
  if (d.description !== undefined) updated.description = d.description;
  updated.attributes = validatedAttrs;
  if (d.customFields !== undefined) updated.customFields = d.customFields;
  if (d.metadata !== undefined) updated.metadata = d.metadata;
  if (d.searchKeywords !== undefined) updated.searchKeywords = d.searchKeywords;
  if (d.tags !== undefined) updated.tags = d.tags;

  await deps.catalogRepo.update(d.tenantId, d.catalogId, {
    ...(d.name !== undefined ? { name: d.name } : {}),
    ...(d.description !== undefined ? { description: d.description } : {}),
    attributes: validatedAttrs,
    ...(d.customFields !== undefined ? { customFields: d.customFields } : {}),
    ...(d.metadata !== undefined ? { metadata: d.metadata } : {}),
    ...(d.searchKeywords !== undefined ? { searchKeywords: d.searchKeywords } : {}),
    ...(d.tags !== undefined ? { tags: d.tags } : {}),
    updatedAt: now, updatedBy: d.actorId,
  });

  const envelope: EventEnvelope<{ catalogId: string; tenantId: string }> =
    await emitCatalogEvent(deps,
      { aggregateId: d.catalogId, tenantId: d.tenantId, correlationId: d.correlationId },
      'catalog.updated', 'catalog.updated.v1',
      { catalogId: d.catalogId, tenantId: d.tenantId });
  await deps.eventBus.emit(envelope);

  await recordCatalogAudit(deps.auditRepo, {
    organizationId: existing.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    catalogId: d.catalogId, eventType: 'catalog_updated',
    metadata: {},
  });

  return Ok(updated);
}

// ════════════════════════════════════════════════════════════════════════════
// ARCHIVE
// ════════════════════════════════════════════════════════════════════════════

export interface ArchiveCatalogInput {
  tenantId: string; correlationId: string; actorId: string; catalogId: string;
  reason?: string;
}

export async function archiveCatalogUseCase(
  input: ArchiveCatalogInput,
  deps: CatalogUseCaseDeps,
): Promise<Result<Catalog, ValidationError | NotFoundError | ConflictError>> {
  const v = archiveCatalogSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid archive input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.catalogRepo.findById(d.tenantId, d.catalogId);
  if (!existing) return Err(new NotFoundError('Catalog not found'));
  if (existing.status === 'Archived') return Err(new ConflictError('Already archived'));
  if (existing.status === 'Deleted') return Err(new ConflictError('Cannot archive deleted'));

  const now = deps.clock.now().toISOString();
  const updated: Catalog = { ...existing, status: 'Archived', archivedAt: now, updatedAt: now, updatedBy: d.actorId };
  await deps.catalogRepo.update(d.tenantId, d.catalogId, { status: 'Archived', archivedAt: now, updatedAt: now, updatedBy: d.actorId });

  const envelope: EventEnvelope<{ catalogId: string; previousStatus: CatalogStatus; reason?: string | undefined }> =
    await emitCatalogEvent(deps,
      { aggregateId: d.catalogId, tenantId: d.tenantId, correlationId: d.correlationId },
      'catalog.archived', 'catalog.archived.v1',
      { catalogId: d.catalogId, previousStatus: existing.status, ...(d.reason !== undefined ? { reason: d.reason } : {}) });
  await deps.eventBus.emit(envelope);

  await recordCatalogAudit(deps.auditRepo, {
    organizationId: existing.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    catalogId: d.catalogId, eventType: 'catalog_archived',
    metadata: { previousStatus: existing.status },
  });

  return Ok(updated);
}

// ════════════════════════════════════════════════════════════════════════════
// RESTORE
// ════════════════════════════════════════════════════════════════════════════

export interface RestoreCatalogInput {
  tenantId: string; correlationId: string; actorId: string; catalogId: string;
}

export async function restoreCatalogUseCase(
  input: RestoreCatalogInput,
  deps: CatalogUseCaseDeps,
): Promise<Result<Catalog, ValidationError | NotFoundError | ConflictError>> {
  const v = restoreCatalogSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid restore input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.catalogRepo.findById(d.tenantId, d.catalogId);
  if (!existing) return Err(new NotFoundError('Catalog not found'));
  if (existing.status !== 'Archived') return Err(new ConflictError(`Cannot restore from "${existing.status}"`));

  const now = deps.clock.now().toISOString();
  const updated: Catalog = { ...existing, status: 'Active', archivedAt: null, updatedAt: now, updatedBy: d.actorId };
  await deps.catalogRepo.update(d.tenantId, d.catalogId, { status: 'Active', archivedAt: null, updatedAt: now, updatedBy: d.actorId });

  const envelope: EventEnvelope<{ catalogId: string }> =
    await emitCatalogEvent(deps,
      { aggregateId: d.catalogId, tenantId: d.tenantId, correlationId: d.correlationId },
      'catalog.restored', 'catalog.restored.v1',
      { catalogId: d.catalogId });
  await deps.eventBus.emit(envelope);

  await recordCatalogAudit(deps.auditRepo, {
    organizationId: existing.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    catalogId: d.catalogId, eventType: 'catalog_restored',
    metadata: {},
  });

  return Ok(updated);
}

// ════════════════════════════════════════════════════════════════════════════
// DELETE (soft)
// ════════════════════════════════════════════════════════════════════════════

export interface DeleteCatalogInput {
  tenantId: string; correlationId: string; actorId: string; catalogId: string;
}

export async function deleteCatalogUseCase(
  input: DeleteCatalogInput,
  deps: CatalogUseCaseDeps,
): Promise<Result<{ catalogId: string; deletedAt: string }, ValidationError | NotFoundError | ConflictError>> {
  const v = deleteCatalogSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid delete input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.catalogRepo.findById(d.tenantId, d.catalogId);
  if (!existing) return Err(new NotFoundError('Catalog not found'));
  if (existing.status === 'Deleted') return Err(new ConflictError('Already deleted'));

  const now = deps.clock.now().toISOString();
  await deps.catalogRepo.update(d.tenantId, d.catalogId, { status: 'Deleted', deletedAt: now, updatedAt: now, updatedBy: d.actorId });

  const envelope: EventEnvelope<{ catalogId: string }> =
    await emitCatalogEvent(deps,
      { aggregateId: d.catalogId, tenantId: d.tenantId, correlationId: d.correlationId },
      'catalog.deleted', 'catalog.deleted.v1',
      { catalogId: d.catalogId });
  await deps.eventBus.emit(envelope);

  await recordCatalogAudit(deps.auditRepo, {
    organizationId: existing.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    catalogId: d.catalogId, eventType: 'catalog_deleted',
    metadata: { previousStatus: existing.status },
  });

  return Ok({ catalogId: d.catalogId, deletedAt: now });
}

// ════════════════════════════════════════════════════════════════════════════
// GET / SEARCH
// ════════════════════════════════════════════════════════════════════════════

export interface GetCatalogInput { tenantId: string; catalogId: string; }

export async function getCatalogUseCase(
  input: GetCatalogInput,
  deps: CatalogUseCaseDeps,
): Promise<Result<Catalog | null, ValidationError>> {
  const v = getCatalogSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid get input', { details: { issues: v.error.errors } }));
  const d = v.data;
  return Ok(await deps.catalogRepo.findById(d.tenantId, d.catalogId));
}

export async function searchCatalogsUseCase(
  input: CatalogSearchCriteria,
  deps: CatalogUseCaseDeps,
): Promise<Result<CatalogSearchResult, ValidationError>> {
  const v = searchCatalogsSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid search input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const criteria: CatalogSearchCriteria = {
    tenantId: d.tenantId,
    ...(d.organizationId !== undefined ? { organizationId: d.organizationId } : {}),
    ...(d.query !== undefined ? { query: d.query } : {}),
    ...(d.type !== undefined ? { type: d.type } : {}),
    ...(d.status !== undefined ? { status: d.status } : {}),
    ...(d.tags !== undefined ? { tags: d.tags } : {}),
    ...(d.limit !== undefined ? { limit: d.limit } : {}),
    ...(d.offset !== undefined ? { offset: d.offset } : {}),
    ...(d.sortBy !== undefined ? { sortBy: d.sortBy } : {}),
    ...(d.sortOrder !== undefined ? { sortOrder: d.sortOrder } : {}),
  };
  return Ok(await deps.catalogRepo.search(criteria));
}

export interface ListCatalogsInput {
  tenantId: string; organizationId: string;
  limit?: number; offset?: number;
}

export async function listCatalogsUseCase(
  input: ListCatalogsInput,
  deps: CatalogUseCaseDeps,
): Promise<Result<CatalogSearchResult, ValidationError>> {
  return Ok(await deps.catalogRepo.search({
    tenantId: input.tenantId,
    organizationId: input.organizationId,
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
    ...(input.offset !== undefined ? { offset: input.offset } : {}),
  }));
}
