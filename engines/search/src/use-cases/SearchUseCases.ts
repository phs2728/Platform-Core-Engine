/**
 * Search + Autocomplete UseCases (14) —
 *   search / searchCatalog / searchOrganization / searchBooking / searchReview /
 *   searchMedia / searchUser / searchPayment +
 *   autocomplete / suggest / popularSearches + addSynonym + getSynonyms
 */
import {
  Ok, Err, type Result,
  ValidationError,
  type EventEnvelope,
} from '@platform/core-sdk';
import { recordSearchAudit } from '../domain/audit.js';
import { searchSchema, autocompleteSchema, addSynonymSchema } from '../domain/validation.js';
import { emitSearchEvent } from '../domain/events.js';
import {
  matchDocument, applyFilters, createHighlight, computeFacets, tokenize,
} from '../domain/searchEngine.js';
import type { SearchUseCaseDeps } from './types.js';
import type {
  IndexedDocument, SearchResult, SearchResponse, SearchQuery, SearchDomain, SearchFilter, SearchFacet,
  AutocompleteEntry, SynonymGroup,
} from '../interfaces/index.js';

// ═══════════════════════════════════════════
// SEARCH (core)
// ═══════════════════════════════════════════

export async function searchUseCase(
  query: SearchQuery, deps: SearchUseCaseDeps,
): Promise<Result<SearchResponse, ValidationError>> {
  const v = searchSchema.safeParse(query);
  if (!v.success) return Err(new ValidationError('Invalid search query', { details: { issues: v.error.errors } }));
  const d = v.data;

  const start = Date.now();
  const limit = d.limit ?? 20;
  const offset = d.offset ?? 0;
  const matchType = d.matchType ?? 'full_text';
  const fuzzyDistance = d.fuzzyDistance ?? 1;

  // Expand query with synonyms
  const queryTokens = tokenize(d.query);
  const expandedTokens: string[] = [...queryTokens];
  for (const qt of queryTokens) {
    const synonyms = await deps.synonymProvider.getSynonyms(d.tenantId, qt);
    for (const syn of synonyms) {
      const synTokens = tokenize(syn);
      expandedTokens.push(...synTokens);
    }
  }

  // Get candidate documents
  let docs: IndexedDocument[] = [];
  if (d.domain !== undefined && d.domain !== 'global') {
    docs = await deps.searchRepo.findByDomain(d.tenantId, d.domain);
  } else {
    docs = await deps.searchRepo.findAll(d.tenantId);
  }

  // Apply filters first (narrow down candidates)
  if (d.filters !== undefined && d.filters.length > 0) {
    docs = docs.filter((doc) => applyFilters(doc, d.filters as SearchFilter[]));
  }

  // Match + score
  const results: SearchResult[] = [];
  for (const doc of docs) {
    const { matched, matchedTerms, score } = matchDocument(doc, expandedTokens, matchType, fuzzyDistance);
    if (matched) {
      const highlights = d.highlight !== false
        ? [
          createHighlight('title', doc.title, matchedTerms),
          createHighlight('content', doc.content, matchedTerms),
        ]
        : [];
      results.push({ document: doc, score, highlights, matchedTerms });
    }
  }

  // Sort
  const sortBy = d.sortBy ?? 'relevance';
  results.sort((a, b) => {
    switch (sortBy) {
      case 'popularity': return b.document.popularity - a.document.popularity;
      case 'recency': return b.document.updatedAt.localeCompare(a.document.updatedAt);
      case 'rating': return Number(b.document.metadata.rating ?? 0) - Number(a.document.metadata.rating ?? 0);
      case 'price_asc': return Number(a.document.metadata.price ?? 0) - Number(b.document.metadata.price ?? 0);
      case 'price_desc': return Number(b.document.metadata.price ?? 0) - Number(a.document.metadata.price ?? 0);
      case 'title': return a.document.title.localeCompare(b.document.title);
      default: return b.score - a.score;
    }
  });

  const total = results.length;
  const paged = results.slice(offset, offset + limit);

  // Compute facets on ALL matching docs (before pagination)
  const facetFields = d.facets ?? ['category', 'organizationId', 'status'];
  const facets = computeFacets(results.map((r) => r.document), facetFields);

  // Spell correction
  let correctedQuery: string | null = null;
  const spellResult = await deps.spellChecker.correct(d.tenantId, d.query);
  if (spellResult.corrected) correctedQuery = spellResult.corrected;

  // Record autocomplete
  await deps.autocompleteRepo.incrementFrequency(d.tenantId, d.query, d.domain ?? 'global');

  const executionTimeMs = Date.now() - start;

  const response: SearchResponse = {
    results: paged, total, limit, offset,
    facets: facets as SearchFacet[], executionTimeMs,
    correctedQuery,
    suggestions: spellResult.suggestions,
  };

  // Emit event + log
  const env: EventEnvelope<{ query: string; total: number; executionTimeMs: number }> =
    await emitSearchEvent(deps, { aggregateId: 'search', tenantId: d.tenantId, correlationId: `search-${Date.now()}` },
      'search.executed', 'search.executed.v1', { query: d.query, total, executionTimeMs });
  await deps.eventBus.emit(env);

  await recordSearchAudit(deps.auditRepo, {
    tenantId: d.tenantId, actorId: 'system', correlationId: `search-${Date.now()}`,
    eventType: 'search_executed', metadata: { query: d.query, total, executionTimeMs, domain: d.domain ?? 'global' },
  });

  return Ok(response);
}

// ═══════════════════════════════════════════
// DOMAIN-SPECIFIC SEARCH (7 convenience)
// ═══════════════════════════════════════════

export async function searchCatalogUseCase(
  query: Omit<SearchQuery, 'domain'>, deps: SearchUseCaseDeps,
): Promise<Result<SearchResponse, ValidationError>> {
  return searchUseCase({ ...query, domain: 'catalog' }, deps);
}

export async function searchOrganizationUseCase(
  query: Omit<SearchQuery, 'domain'>, deps: SearchUseCaseDeps,
): Promise<Result<SearchResponse, ValidationError>> {
  return searchUseCase({ ...query, domain: 'organization' }, deps);
}

export async function searchBookingUseCase(
  query: Omit<SearchQuery, 'domain'>, deps: SearchUseCaseDeps,
): Promise<Result<SearchResponse, ValidationError>> {
  return searchUseCase({ ...query, domain: 'booking' }, deps);
}

export async function searchReviewUseCase(
  query: Omit<SearchQuery, 'domain'>, deps: SearchUseCaseDeps,
): Promise<Result<SearchResponse, ValidationError>> {
  return searchUseCase({ ...query, domain: 'review' }, deps);
}

export async function searchMediaUseCase(
  query: Omit<SearchQuery, 'domain'>, deps: SearchUseCaseDeps,
): Promise<Result<SearchResponse, ValidationError>> {
  return searchUseCase({ ...query, domain: 'media' }, deps);
}

export async function searchUserUseCase(
  query: Omit<SearchQuery, 'domain'>, deps: SearchUseCaseDeps,
): Promise<Result<SearchResponse, ValidationError>> {
  return searchUseCase({ ...query, domain: 'user' }, deps);
}

export async function searchPaymentUseCase(
  query: Omit<SearchQuery, 'domain'>, deps: SearchUseCaseDeps,
): Promise<Result<SearchResponse, ValidationError>> {
  return searchUseCase({ ...query, domain: 'payment' }, deps);
}

// ═══════════════════════════════════════════
// AUTOCOMPLETE (3)
// ═══════════════════════════════════════════

export async function autocompleteUseCase(
  input: { tenantId: string; prefix: string; domain?: SearchDomain; limit?: number },
  deps: SearchUseCaseDeps,
): Promise<Result<string[], ValidationError>> {
  const v = autocompleteSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const entries = await deps.autocompleteRepo.findByTerm(d.tenantId, d.prefix, d.limit ?? 10);
  const terms = entries.map((e) => e.term);

  // Also suggest from indexed document titles
  const docs = await deps.searchRepo.findAll(d.tenantId);
  for (const doc of docs) {
    for (const token of doc.titleTokens) {
      if (token.startsWith(d.prefix.toLowerCase()) && !terms.includes(token)) {
        terms.push(token);
        if (terms.length >= (d.limit ?? 10)) break;
      }
    }
    if (terms.length >= (d.limit ?? 10)) break;
  }

  const env: EventEnvelope<{ prefix: string; count: number }> =
    await emitSearchEvent(deps, { aggregateId: 'autocomplete', tenantId: d.tenantId, correlationId: `ac-${Date.now()}` },
      'search.autocomplete', 'search.autocomplete.v1', { prefix: d.prefix, count: terms.length });
  await deps.eventBus.emit(env);

  return Ok(terms.slice(0, d.limit ?? 10));
}

export async function suggestUseCase(
  input: { tenantId: string; query: string; limit?: number },
  deps: SearchUseCaseDeps,
): Promise<Result<string[], ValidationError>> {
  if (!input.query) return Err(new ValidationError('query required'));
  const tokens = tokenize(input.query);
  if (tokens.length === 0) return Ok([]);

  const lastToken = tokens[tokens.length - 1]!;
  const suggestions = await autocompleteUseCase({ tenantId: input.tenantId, prefix: lastToken, limit: input.limit ?? 5 }, deps);
  if (!suggestions.ok) return suggestions;

  const prefix = input.query.slice(0, input.query.length - lastToken.length);
  return Ok(suggestions.value.map((s) => prefix + s));
}

export async function popularSearchesUseCase(
  tenantId: string, limit: number, deps: SearchUseCaseDeps,
): Promise<Result<AutocompleteEntry[], ValidationError>> {
  if (!tenantId) return Err(new ValidationError('tenantId required'));
  return Ok(await deps.autocompleteRepo.listPopular(tenantId, limit));
}

// ═══════════════════════════════════════════
// SYNONYM (2)
// ═══════════════════════════════════════════

export async function addSynonymUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; terms: string[] },
  deps: SearchUseCaseDeps,
): Promise<Result<{ synonymId: string }, ValidationError>> {
  const v = addSynonymSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const sid = deps.idGenerator.generate();
  const group: SynonymGroup = { id: sid, tenantId: d.tenantId, terms: d.terms };
  await deps.synonymRepo.insert(group);

  return Ok({ synonymId: sid });
}

export async function getSynonymsUseCase(
  tenantId: string, term: string, deps: SearchUseCaseDeps,
): Promise<Result<string[], ValidationError>> {
  if (!tenantId || !term) return Err(new ValidationError('tenantId and term required'));
  return Ok(await deps.synonymProvider.getSynonyms(tenantId, term));
}
