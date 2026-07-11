/**
 * Category UseCases (4개) + Item Creation helper
 *
 *   createCategory / updateCategory / moveCategory / deleteCategory
 *
 * Category는 무한 depth + cycle detection (사장님 확립 결정 7).
 */

import {
  Ok, Err, type Result,
  ValidationError, ConflictError, NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';

import { recordCatalogAudit } from '../domain/audit.js';
import {
  createCategorySchema, updateCategorySchema,
  moveCategorySchema, deleteCategorySchema,
  createItemSchema,
} from '../domain/validation.js';
import { emitCatalogEvent } from '../domain/events.js';
import type { CatalogUseCaseDeps } from './types.js';
import type { Category, Item } from '../interfaces/index.js';

// ════════════════════════════════════════════════════════════════════════════
// CREATE CATEGORY
// ════════════════════════════════════════════════════════════════════════════

export interface CreateCategoryInput {
  tenantId: string; correlationId: string; actorId: string;
  catalogId: string;
  parentCategoryId?: string;
  name: string; slug: string;
  description?: string;
  displayOrder?: number;
  attributes?: Record<string, unknown>;
}

export async function createCategoryUseCase(
  input: CreateCategoryInput,
  deps: CatalogUseCaseDeps,
): Promise<Result<Category, ValidationError | NotFoundError | ConflictError>> {
  const v = createCategorySchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid category input', { details: { issues: v.error.errors } }));
  const d = v.data;

  // Catalog 존재 확인
  const catalog = await deps.catalogRepo.findById(d.tenantId, d.catalogId);
  if (!catalog) return Err(new NotFoundError('Catalog not found'));

  // Parent Category 존재 확인 (if specified)
  if (d.parentCategoryId !== undefined) {
    const parent = await deps.categoryRepo.findById(d.tenantId, d.parentCategoryId);
    if (!parent || parent.catalogId !== d.catalogId) {
      return Err(new NotFoundError('Parent category not found in this catalog'));
    }
  }

  // Slug uniqueness (Catalog 내)
  if (await deps.categoryRepo.existsBySlug(d.tenantId, d.catalogId, d.slug)) {
    return Err(new ConflictError('slug already exists in this catalog'));
  }

  // Max categories check
  const maxCats = await deps.policyProvider.getMaxCategoriesPerCatalog(d.tenantId);
  const existing = await deps.categoryRepo.findByCatalog(d.tenantId, d.catalogId);
  if (existing.length >= maxCats) {
    return Err(new ConflictError(`Max categories limit (${maxCats}) reached`));
  }

  const categoryId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const category: Category = {
    id: categoryId,
    tenantId: d.tenantId,
    catalogId: d.catalogId,
    parentCategoryId: d.parentCategoryId ?? null,
    name: d.name,
    slug: d.slug,
    displayOrder: d.displayOrder ?? 0,
    attributes: d.attributes ?? {},
    createdAt: now, createdBy: d.actorId,
    updatedAt: now,
    archivedAt: null,
  };
  if (d.description !== undefined) category.description = d.description;

  await deps.categoryRepo.insert(category);

  const envelope: EventEnvelope<{ categoryId: string; catalogId: string; parentCategoryId: string | null }> =
    await emitCatalogEvent(deps,
      { aggregateId: d.catalogId, tenantId: d.tenantId, correlationId: d.correlationId },
      'category.created', 'category.created.v1',
      { categoryId, catalogId: d.catalogId, parentCategoryId: category.parentCategoryId });
  await deps.eventBus.emit(envelope);

  await recordCatalogAudit(deps.auditRepo, {
    organizationId: catalog.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    catalogId: d.catalogId, categoryId, eventType: 'category_created',
    metadata: { name: d.name, slug: d.slug },
  });

  return Ok(category);
}

// ════════════════════════════════════════════════════════════════════════════
// UPDATE CATEGORY
// ════════════════════════════════════════════════════════════════════════════

export interface UpdateCategoryInput {
  tenantId: string; correlationId: string; actorId: string;
  catalogId: string; categoryId: string;
  name?: string; description?: string;
  displayOrder?: number;
  attributes?: Record<string, unknown>;
}

export async function updateCategoryUseCase(
  input: UpdateCategoryInput,
  deps: CatalogUseCaseDeps,
): Promise<Result<Category, ValidationError | NotFoundError>> {
  const v = updateCategorySchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid update input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.categoryRepo.findById(d.tenantId, d.categoryId);
  if (!existing || existing.catalogId !== d.catalogId) return Err(new NotFoundError('Category not found'));

  const now = deps.clock.now().toISOString();
  const updated: Category = { ...existing, updatedAt: now };
  if (d.name !== undefined) updated.name = d.name;
  if (d.description !== undefined) updated.description = d.description;
  if (d.displayOrder !== undefined) updated.displayOrder = d.displayOrder;
  if (d.attributes !== undefined) updated.attributes = d.attributes;

  await deps.categoryRepo.update(d.tenantId, d.categoryId, {
    ...(d.name !== undefined ? { name: d.name } : {}),
    ...(d.description !== undefined ? { description: d.description } : {}),
    ...(d.displayOrder !== undefined ? { displayOrder: d.displayOrder } : {}),
    ...(d.attributes !== undefined ? { attributes: d.attributes } : {}),
    updatedAt: now,
  });

  const envelope: EventEnvelope<{ categoryId: string }> =
    await emitCatalogEvent(deps,
      { aggregateId: d.catalogId, tenantId: d.tenantId, correlationId: d.correlationId },
      'category.updated', 'category.updated.v1',
      { categoryId: d.categoryId });
  await deps.eventBus.emit(envelope);

  const catalog = await deps.catalogRepo.findById(d.tenantId, d.catalogId);
  await recordCatalogAudit(deps.auditRepo, {
    organizationId: catalog?.organizationId ?? '', tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    catalogId: d.catalogId, categoryId: d.categoryId, eventType: 'category_updated',
    metadata: {},
  });

  return Ok(updated);
}

// ════════════════════════════════════════════════════════════════════════════
// MOVE CATEGORY (cycle detection)
// ════════════════════════════════════════════════════════════════════════════

export interface MoveCategoryInput {
  tenantId: string; correlationId: string; actorId: string;
  catalogId: string; categoryId: string;
  newParentCategoryId: string | null;  // null = root
}

export async function moveCategoryUseCase(
  input: MoveCategoryInput,
  deps: CatalogUseCaseDeps,
): Promise<Result<Category, ValidationError | NotFoundError | ConflictError>> {
  const v = moveCategorySchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid move input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const category = await deps.categoryRepo.findById(d.tenantId, d.categoryId);
  if (!category || category.catalogId !== d.catalogId) return Err(new NotFoundError('Category not found'));

  // Cycle detection: walk up from newParent, if we hit categoryId → cycle
  if (d.newParentCategoryId !== null) {
    if (d.newParentCategoryId === d.categoryId) {
      return Err(new ConflictError('Cannot move category under itself'));
    }
    const newParent = await deps.categoryRepo.findById(d.tenantId, d.newParentCategoryId);
    if (!newParent || newParent.catalogId !== d.catalogId) {
      return Err(new NotFoundError('New parent not found in this catalog'));
    }

    // Walk ancestry chain
    let cursor: string | null = newParent.parentCategoryId;
    const visited = new Set<string>([d.categoryId]);
    let depth = 0;
    while (cursor !== null && depth < 1000) {
      if (cursor === d.categoryId) {
        return Err(new ConflictError('Move would create a cycle'));
      }
      if (visited.has(cursor)) {
        return Err(new ConflictError('Existing cycle detected in hierarchy'));
      }
      visited.add(cursor);
      const ancestor = await deps.categoryRepo.findById(d.tenantId, cursor);
      if (!ancestor) break;
      cursor = ancestor.parentCategoryId;
      depth++;
    }
    if (depth >= 1000) {
      return Err(new ConflictError('Hierarchy depth exceeded 1000'));
    }
  }

  const now = deps.clock.now().toISOString();
  const updated: Category = { ...category, parentCategoryId: d.newParentCategoryId, updatedAt: now };
  await deps.categoryRepo.update(d.tenantId, d.categoryId, { parentCategoryId: d.newParentCategoryId, updatedAt: now });

  const envelope: EventEnvelope<{ categoryId: string; newParentCategoryId: string | null }> =
    await emitCatalogEvent(deps,
      { aggregateId: d.catalogId, tenantId: d.tenantId, correlationId: d.correlationId },
      'category.moved', 'category.moved.v1',
      { categoryId: d.categoryId, newParentCategoryId: d.newParentCategoryId });
  await deps.eventBus.emit(envelope);

  const catalog = await deps.catalogRepo.findById(d.tenantId, d.catalogId);
  await recordCatalogAudit(deps.auditRepo, {
    organizationId: catalog?.organizationId ?? '', tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    catalogId: d.catalogId, categoryId: d.categoryId, eventType: 'category_moved',
    metadata: { newParentCategoryId: d.newParentCategoryId },
  });

  return Ok(updated);
}

// ════════════════════════════════════════════════════════════════════════════
// DELETE CATEGORY
// ════════════════════════════════════════════════════════════════════════════

export async function deleteCategoryUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; catalogId: string; categoryId: string },
  deps: CatalogUseCaseDeps,
): Promise<Result<{ categoryId: string }, ValidationError | NotFoundError | ConflictError>> {
  const v = deleteCategorySchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid delete input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.categoryRepo.findById(d.tenantId, d.categoryId);
  if (!existing || existing.catalogId !== d.catalogId) return Err(new NotFoundError('Category not found'));

  // Check for child categories
  const children = await deps.categoryRepo.findByParent(d.tenantId, d.catalogId, d.categoryId);
  if (children.length > 0) {
    return Err(new ConflictError('Cannot delete category with children — move or delete children first'));
  }

  // Hard delete (Sprint 1 — no soft delete for Category)
  await deps.categoryRepo.update(d.tenantId, d.categoryId, { archivedAt: deps.clock.now().toISOString() });

  const envelope: EventEnvelope<{ categoryId: string }> =
    await emitCatalogEvent(deps,
      { aggregateId: d.catalogId, tenantId: d.tenantId, correlationId: d.correlationId },
      'category.deleted', 'category.deleted.v1',
      { categoryId: d.categoryId });
  await deps.eventBus.emit(envelope);

  const catalog = await deps.catalogRepo.findById(d.tenantId, d.catalogId);
  await recordCatalogAudit(deps.auditRepo, {
    organizationId: catalog?.organizationId ?? '', tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    catalogId: d.catalogId, categoryId: d.categoryId, eventType: 'category_deleted',
    metadata: {},
  });

  return Ok({ categoryId: d.categoryId });
}

// ════════════════════════════════════════════════════════════════════════════
// CREATE ITEM (helper — Variant/Bundle가 Item 필요)
// ════════════════════════════════════════════════════════════════════════════

export interface CreateItemInput {
  tenantId: string; correlationId: string; actorId: string;
  catalogId: string;
  categoryId?: string;
  name: string; slug: string;
  description?: string;
  type: string;
  attributes?: Record<string, unknown>;
  customFields?: Record<string, unknown>;
  searchKeywords?: string[];
  tags?: string[];
}

export async function createItemUseCase(
  input: CreateItemInput,
  deps: CatalogUseCaseDeps,
): Promise<Result<Item, ValidationError | NotFoundError | ConflictError>> {
  const v = createItemSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid item input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const catalog = await deps.catalogRepo.findById(d.tenantId, d.catalogId);
  if (!catalog) return Err(new NotFoundError('Catalog not found'));

  // CustomDataPolicy (Use Case 진입 시 1회)
  const allowedTypes = await deps.policyProvider.getAllowedTypes(d.tenantId);
  if (!allowedTypes.includes(d.type)) {
    return Err(new ValidationError(`type "${d.type}" not allowed`));
  }
  const pr = await deps.policyProvider.validateAttributes(d.tenantId, d.type, d.attributes ?? {});
  if (!pr.ok) return Err(new ValidationError('CustomDataPolicy rejected attributes'));

  // Slug uniqueness
  if (await deps.itemRepo.existsBySlug(d.tenantId, d.catalogId, d.slug)) {
    return Err(new ConflictError('slug already exists in this catalog'));
  }

  // Category validation
  if (d.categoryId !== undefined) {
    const cat = await deps.categoryRepo.findById(d.tenantId, d.categoryId);
    if (!cat || cat.catalogId !== d.catalogId) return Err(new NotFoundError('Category not found'));
  }

  const itemId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const item: Item = {
    id: itemId,
    tenantId: d.tenantId,
    catalogId: d.catalogId,
    categoryId: d.categoryId ?? null,
    name: d.name,
    slug: d.slug,
    type: d.type,
    attributes: pr.value,
    customFields: d.customFields ?? {},
    mediaRefs: [],
    pricingRefs: [],
    searchKeywords: d.searchKeywords ?? [],
    tags: d.tags ?? [],
    status: 'Active',
    createdAt: now, createdBy: d.actorId,
    updatedAt: now,
    archivedAt: null,
  };
  if (d.description !== undefined) item.description = d.description;

  await deps.itemRepo.insert(item);
  return Ok(item);
}
