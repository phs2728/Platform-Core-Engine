/**
 * Index UseCases (7) —
 *   indexDocument / updateDocument / deleteDocument /
 *   rebuildIndex / refreshIndex / getIndex / listIndexes
 */
import {
  Ok, Err, type Result,
  ValidationError, NotFoundError, ConflictError,
  type EventEnvelope,
} from '@platform/core-sdk';
import { recordSearchAudit } from '../domain/audit.js';
import {
  indexDocumentSchema, deleteDocumentSchema, rebuildIndexSchema,
} from '../domain/validation.js';
import { emitSearchEvent } from '../domain/events.js';
import { tokenize, extractFacets } from '../domain/searchEngine.js';
import type { SearchUseCaseDeps } from './types.js';
import type { IndexedDocument, SearchIndex, SearchDomain, ProjectionSearchDoc } from '../interfaces/index.js';

/** Map sourceType to search domain */
function sourceTypeToDomain(sourceType: string): SearchDomain {
  if (sourceType.includes('catalog') || sourceType.includes('item')) return 'catalog';
  if (sourceType.includes('organization') || sourceType.includes('org')) return 'organization';
  if (sourceType.includes('booking')) return 'booking';
  if (sourceType.includes('review')) return 'review';
  if (sourceType.includes('media') || sourceType.includes('asset')) return 'media';
  if (sourceType.includes('user')) return 'user';
  if (sourceType.includes('payment') || sourceType.includes('transaction')) return 'payment';
  return 'global';
}

/** Convert a ProjectionSearchDoc to an IndexedDocument */
async function toIndexedDocument(
  doc: ProjectionSearchDoc, deps: SearchUseCaseDeps,
): Promise<IndexedDocument> {
  const boost = await deps.rankingProvider.getBoost(doc.tenantId, doc.sourceType, doc.sourceId);
  const popularity = await deps.rankingProvider.getPopularity(doc.tenantId, doc.sourceType, doc.sourceId);
  const now = deps.clock.now().toISOString();

  return {
    id: deps.idGenerator.generate(),
    tenantId: doc.tenantId,
    sourceEngine: doc.sourceEngine,
    sourceType: doc.sourceType,
    sourceId: doc.sourceId,
    title: doc.title,
    content: doc.content,
    keywords: doc.keywords,
    tags: doc.tags,
    metadata: doc.metadata,
    titleTokens: tokenize(doc.title),
    contentTokens: tokenize(doc.content),
    facets: extractFacets(doc.metadata),
    version: doc.version,
    boost,
    popularity,
    indexedAt: now,
    updatedAt: doc.updatedAt,
  };
}

// ═══════════════════════════════════════════
// INDEX DOCUMENT (from projection doc)
// ═══════════════════════════════════════════

export interface IndexDocumentInput {
  tenantId: string; correlationId: string; actorId: string;
  sourceEngine: string; sourceType: string; sourceId: string;
  title: string; content: string;
  keywords?: string[]; tags?: string[];
  metadata?: Record<string, unknown>;
}

export async function indexDocumentUseCase(
  input: IndexDocumentInput, deps: SearchUseCaseDeps,
): Promise<Result<{ documentId: string; indexed: boolean }, ValidationError>> {
  const v = indexDocumentSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const projDoc: ProjectionSearchDoc = {
    id: `${d.sourceEngine}::${d.sourceId}`,
    tenantId: d.tenantId, sourceEngine: d.sourceEngine, sourceType: d.sourceType, sourceId: d.sourceId,
    title: d.title, content: d.content,
    keywords: d.keywords ?? [], tags: d.tags ?? [],
    metadata: d.metadata ?? {}, version: 1, updatedAt: deps.clock.now().toISOString(),
  };

  // Check if already indexed (upsert)
  const existing = await deps.searchRepo.findBySource(d.tenantId, d.sourceEngine, d.sourceId);
  if (existing) {
    const updated = await toIndexedDocument(projDoc, deps);
    await deps.searchRepo.update(d.tenantId, existing.id, {
      title: updated.title, content: updated.content,
      keywords: updated.keywords, tags: updated.tags, metadata: updated.metadata,
      titleTokens: updated.titleTokens, contentTokens: updated.contentTokens,
      facets: updated.facets, boost: updated.boost, popularity: updated.popularity,
      updatedAt: deps.clock.now().toISOString(),
    });

    const env: EventEnvelope<{ documentId: string }> =
      await emitSearchEvent(deps, { aggregateId: existing.id, tenantId: d.tenantId, correlationId: d.correlationId },
        'search.document.updated', 'search.document.updated.v1', { documentId: existing.id });
    await deps.eventBus.emit(env);

    return Ok({ documentId: existing.id, indexed: true });
  }

  const indexed = await toIndexedDocument(projDoc, deps);
  await deps.searchRepo.insert(indexed);

  const env: EventEnvelope<{ documentId: string; sourceType: string }> =
    await emitSearchEvent(deps, { aggregateId: indexed.id, tenantId: d.tenantId, correlationId: d.correlationId },
      'search.document.indexed', 'search.document.indexed.v1', { documentId: indexed.id, sourceType: d.sourceType });
  await deps.eventBus.emit(env);

  await recordSearchAudit(deps.auditRepo, {
    tenantId: d.tenantId, documentId: indexed.id, actorId: d.actorId, correlationId: d.correlationId,
    eventType: 'document_indexed', metadata: { sourceType: d.sourceType, sourceId: d.sourceId },
  });

  return Ok({ documentId: indexed.id, indexed: true });
}

// ═══════════════════════════════════════════
// UPDATE DOCUMENT
// ═══════════════════════════════════════════

export async function updateDocumentUseCase(
  input: IndexDocumentInput, deps: SearchUseCaseDeps,
): Promise<Result<{ documentId: string }, ValidationError | NotFoundError>> {
  return indexDocumentUseCase(input, deps); // upsert
}

// ═══════════════════════════════════════════
// DELETE DOCUMENT
// ═══════════════════════════════════════════

export async function deleteDocumentUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; documentId: string },
  deps: SearchUseCaseDeps,
): Promise<Result<{ documentId: string; deleted: boolean }, ValidationError | NotFoundError>> {
  const doc = await deps.searchRepo.findById(input.tenantId, input.documentId);
  if (!doc) return Err(new NotFoundError('Document not found'));

  await deps.searchRepo.delete(input.tenantId, input.documentId);

  const env: EventEnvelope<{ documentId: string }> =
    await emitSearchEvent(deps, { aggregateId: input.documentId, tenantId: input.tenantId, correlationId: input.correlationId },
      'search.document.deleted', 'search.document.deleted.v1', { documentId: input.documentId });
  await deps.eventBus.emit(env);

  await recordSearchAudit(deps.auditRepo, {
    tenantId: input.tenantId, documentId: input.documentId, actorId: input.actorId, correlationId: input.correlationId,
    eventType: 'document_deleted', metadata: {},
  });

  return Ok({ documentId: input.documentId, deleted: true });
}

// ═══════════════════════════════════════════
// REBUILD INDEX (full rebuild from projections)
// ═══════════════════════════════════════════

export async function rebuildIndexUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; domain: SearchDomain },
  deps: SearchUseCaseDeps,
): Promise<Result<{ domain: SearchDomain; documentCount: number }, ValidationError>> {
  const v = rebuildIndexSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  // Get or create index
  let idx = await deps.indexRepo.findByDomain(d.tenantId, d.domain);
  const now = deps.clock.now().toISOString();

  if (!idx) {
    const iid = deps.idGenerator.generate();
    idx = {
      id: iid, tenantId: d.tenantId, domain: d.domain,
      type: 'full_rebuild', status: 'Building',
      documentCount: 0, tokenCount: 0,
      lastRebuiltAt: null, lastRefreshedAt: null, lastError: null,
      createdAt: now, updatedAt: now,
    };
    await deps.indexRepo.insert(idx);
  } else {
    await deps.indexRepo.update(d.tenantId, idx.id, { status: 'Building', updatedAt: now });
  }

  // Fetch all projection docs for this domain
  const sourceTypeMap: Record<string, string[]> = {
    catalog: ['catalog_item', 'catalog'],
    organization: ['organization'],
    booking: ['booking'],
    review: ['review'],
    media: ['media', 'media_asset'],
    user: ['user'],
    payment: ['payment'],
    global: [],
  };
  const sourceTypes = sourceTypeMap[d.domain] ?? [];
  let allDocs: ProjectionSearchDoc[] = [];
  if (d.domain === 'global') {
    allDocs = await deps.projectionProvider.getSearchDocuments(d.tenantId);
  } else {
    for (const st of sourceTypes) {
      const docs = await deps.projectionProvider.getSearchDocuments(d.tenantId, st);
      allDocs.push(...docs);
    }
  }

  // Clear existing documents for this domain
  const existing = await deps.searchRepo.findByDomain(d.tenantId, d.domain);
  for (const doc of existing) {
    await deps.searchRepo.delete(d.tenantId, doc.id);
  }

  // Index all docs
  let tokenCount = 0;
  for (const projDoc of allDocs) {
    const indexed = await toIndexedDocument(projDoc, deps);
    await deps.searchRepo.insert(indexed);
    tokenCount += indexed.titleTokens.length + indexed.contentTokens.length;
  }

  const completedAt = deps.clock.now().toISOString();
  await deps.indexRepo.update(d.tenantId, idx.id, {
    status: 'Ready', documentCount: allDocs.length, tokenCount,
    lastRebuiltAt: completedAt, updatedAt: completedAt,
  });

  const env: EventEnvelope<{ domain: string; documentCount: number }> =
    await emitSearchEvent(deps, { aggregateId: idx.id, tenantId: d.tenantId, correlationId: d.correlationId },
      'search.index.rebuilt', 'search.index.rebuilt.v1', { domain: d.domain, documentCount: allDocs.length });
  await deps.eventBus.emit(env);

  await recordSearchAudit(deps.auditRepo, {
    tenantId: d.tenantId, indexId: idx.id, actorId: d.actorId, correlationId: d.correlationId,
    eventType: 'index_rebuilt', metadata: { domain: d.domain, documentCount: allDocs.length },
  });

  return Ok({ domain: d.domain, documentCount: allDocs.length });
}

// ═══════════════════════════════════════════
// REFRESH INDEX (incremental — pull new/updated docs)
// ═══════════════════════════════════════════

export async function refreshIndexUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; domain: SearchDomain },
  deps: SearchUseCaseDeps,
): Promise<Result<{ domain: SearchDomain; refreshedCount: number }, ValidationError | NotFoundError>> {
  const idx = await deps.indexRepo.findByDomain(input.tenantId, input.domain);
  if (!idx) return Err(new NotFoundError('Index not found — run rebuildIndex first'));

  // Pull all projection docs and upsert
  const sourceTypeMap: Record<string, string[]> = {
    catalog: ['catalog_item', 'catalog'],
    organization: ['organization'],
    booking: ['booking'],
    review: ['review'],
    media: ['media', 'media_asset'],
    user: ['user'],
    payment: ['payment'],
    global: [],
  };
  const sourceTypes = sourceTypeMap[input.domain] ?? [];
  let allDocs: ProjectionSearchDoc[] = [];
  if (input.domain === 'global') {
    allDocs = await deps.projectionProvider.getSearchDocuments(input.tenantId);
  } else {
    for (const st of sourceTypes) {
      allDocs.push(...await deps.projectionProvider.getSearchDocuments(input.tenantId, st));
    }
  }

  let refreshedCount = 0;
  for (const projDoc of allDocs) {
    const existing = await deps.searchRepo.findBySource(input.tenantId, projDoc.sourceEngine, projDoc.sourceId);
    if (!existing || existing.updatedAt < projDoc.updatedAt) {
      const r = await indexDocumentUseCase({
        tenantId: input.tenantId, correlationId: input.correlationId, actorId: input.actorId,
        sourceEngine: projDoc.sourceEngine, sourceType: projDoc.sourceType, sourceId: projDoc.sourceId,
        title: projDoc.title, content: projDoc.content,
        keywords: projDoc.keywords, tags: projDoc.tags, metadata: projDoc.metadata,
      }, deps);
      if (r.ok) refreshedCount++;
    }
  }

  const now = deps.clock.now().toISOString();
  await deps.indexRepo.update(input.tenantId, idx.id, { lastRefreshedAt: now, updatedAt: now });

  const env: EventEnvelope<{ domain: string; refreshedCount: number }> =
    await emitSearchEvent(deps, { aggregateId: idx.id, tenantId: input.tenantId, correlationId: input.correlationId },
      'search.index.refreshed', 'search.index.refreshed.v1', { domain: input.domain, refreshedCount });
  await deps.eventBus.emit(env);

  return Ok({ domain: input.domain, refreshedCount });
}

// ═══════════════════════════════════════════
// GET INDEX
// ═══════════════════════════════════════════

export async function getIndexUseCase(
  tenantId: string, domain: SearchDomain, deps: SearchUseCaseDeps,
): Promise<Result<SearchIndex | null, ValidationError>> {
  if (!tenantId) return Err(new ValidationError('tenantId required'));
  return Ok(await deps.indexRepo.findByDomain(tenantId, domain));
}

// ═══════════════════════════════════════════
// LIST INDEXES
// ═══════════════════════════════════════════

export async function listIndexesUseCase(
  tenantId: string, deps: SearchUseCaseDeps,
): Promise<Result<SearchIndex[], ValidationError>> {
  if (!tenantId) return Err(new ValidationError('tenantId required'));
  return Ok(await deps.indexRepo.listByTenant(tenantId));
}
