/**
 * Search Engine — Public Interfaces
 *
 * 사장님 확립 (2026-07-11) Phase 6 — Universal Search Engine.
 *
 * Does NOT directly access any Business Engine Repository.
 * Consumes SearchDocuments from the Query Engine's Projection via
 * IProjectionProvider. Builds an inverted index, provides full-text
 * search, autocomplete, ranking, faceting, and analytics.
 *
 * Acceptance: if you delete this engine, ALL universal search,
 * autocomplete, indexing, ranking, and suggestion functionality
 * disappears.
 */

import type { Result, EventEnvelope } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Core Infra
// ═══════════════════════════════════════════

export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IEventBus { emit<T>(envelope: EventEnvelope<T>): Promise<void>; }

// ═══════════════════════════════════════════
// Host Interfaces (3-Layer DI)
// ═══════════════════════════════════════════

/**
 * Projection Provider — supplies SearchDocuments from the Query Engine.
 * This engine NEVER directly imports or queries Business Engine repositories.
 */
export interface IProjectionProvider {
  /** Get all search documents for a tenant (from Query Engine projections). */
  getSearchDocuments(tenantId: string, sourceType?: string): Promise<ProjectionSearchDoc[]>;

  /** Get a single document by source. */
  getSearchDocument(tenantId: string, sourceEngine: string, sourceId: string): Promise<ProjectionSearchDoc | null>;

  /** Subscribe to document changes (for realtime index updates). */
  subscribeToChanges(handler: (doc: ProjectionSearchDoc, action: 'created' | 'updated' | 'deleted') => Promise<void>): void;
}

/**
 * Flattened search document from Query Engine (NOT the original entity).
 */
export interface ProjectionSearchDoc {
  id: string;
  tenantId: string;
  sourceEngine: string;
  sourceType: string;
  sourceId: string;
  title: string;
  content: string;
  keywords: string[];
  tags: string[];
  metadata: Record<string, unknown>;
  version: number;
  updatedAt: string;
}

/**
 * Ranking Provider — host-implemented ranking boost/demote logic.
 */
export interface IRankingProvider {
  /** Get boost multiplier for a document (1.0 = neutral). */
  getBoost(tenantId: string, sourceType: string, sourceId: string): Promise<number>;

  /** Get popularity score (0-100). */
  getPopularity(tenantId: string, sourceType: string, sourceId: string): Promise<number>;

  /** Get custom ranking signals. */
  getSignals(tenantId: string, sourceType: string): Promise<Record<string, number>>;
}

/**
 * Synonym Provider — host-implemented synonym dictionary.
 */
export interface ISynonymProvider {
  getSynonyms(tenantId: string, term: string): Promise<string[]>;
  getAllSynonymGroups(tenantId: string): Promise<SynonymGroup[]>;
}

export interface SynonymGroup {
  id: string;
  terms: string[];
  tenantId: string;
}

/**
 * Spell Checker — host-implemented spell correction.
 */
export interface ISpellChecker {
  correct(tenantId: string, query: string): Promise<SpellCorrection>;
}

export interface SpellCorrection {
  original: string;
  corrected: string | null;
  confidence: number;
  suggestions: string[];
}

/**
 * Custom Data Policy — search configuration validation.
 */
export interface ICustomDataPolicyProvider {
  validateAttributes(tenantId: string, type: string, attributes: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>>;
  getAllowedSearchDomains(tenantId: string): Promise<readonly string[]>;
  getMaxIndexSizePerTenant(tenantId: string): Promise<number>;
  isFuzzySearchEnabled(tenantId: string): Promise<boolean>;
  isAutocompleteEnabled(tenantId: string): Promise<boolean>;
}

// ═══════════════════════════════════════════
// Value Objects & Enums
// ═══════════════════════════════════════════

export type SearchDomain =
  | 'catalog' | 'organization' | 'booking' | 'review'
  | 'media' | 'user' | 'payment' | 'global';

export type SearchMatchType =
  | 'full_text'    // tokenize + match any
  | 'exact'        // exact phrase
  | 'prefix'       // starts with
  | 'fuzzy'        // Levenshtein distance
  | 'wildcard'     // glob pattern
  | 'phrase'       // exact word sequence
  | 'boolean';     // AND/OR/NOT

export type IndexType = 'realtime' | 'incremental' | 'snapshot' | 'full_rebuild';

export type IndexStatus = 'Building' | 'Ready' | 'Stale' | 'Failed';

export type FacetType = 'category' | 'price' | 'rating' | 'location' | 'organization' | 'status' | 'tag' | 'language';

export type SortBy = 'relevance' | 'popularity' | 'recency' | 'rating' | 'price_asc' | 'price_desc' | 'title';

// ═══════════════════════════════════════════
// Core Entities
// ═══════════════════════════════════════════

/**
 * IndexedDocument — a document in the search index.
 */
export interface IndexedDocument {
  id: string;
  tenantId: string;
  sourceEngine: string;
  sourceType: string;
  sourceId: string;
  title: string;
  content: string;
  keywords: string[];
  tags: string[];
  metadata: Record<string, unknown>;
  /** Tokenized + lowercased title tokens for fast lookup. */
  titleTokens: string[];
  /** Tokenized + lowercased content tokens. */
  contentTokens: string[];
  /** Pre-computed facets extracted from metadata. */
  facets: Record<string, string>;
  version: number;
  boost: number;
  popularity: number;
  indexedAt: string;
  updatedAt: string;
}

/**
 * SearchIndex — the per-tenant search index.
 */
export interface SearchIndex {
  id: string;
  tenantId: string;
  domain: SearchDomain;
  type: IndexType;
  status: IndexStatus;
  documentCount: number;
  tokenCount: number;
  lastRebuiltAt: string | null;
  lastRefreshedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * SearchResult — a single hit.
 */
export interface SearchResult {
  document: IndexedDocument;
  score: number;
  highlights: SearchHighlight[];
  matchedTerms: string[];
}

export interface SearchHighlight {
  field: string;         // 'title' | 'content'
  fragment: string;      // text with <em> tags around matches
  positions: number[];
}

/**
 * SearchFacet — aggregated facet counts.
 */
export interface SearchFacet {
  type: FacetType;
  field: string;
  values: { value: string; count: number }[];
}

/**
 * SearchQuery — the query object.
 */
export interface SearchQuery {
  tenantId: string;
  query: string;
  domain?: SearchDomain;
  matchType?: SearchMatchType;
  filters?: SearchFilter[];
  facets?: FacetType[];
  sortBy?: SortBy;
  limit?: number;
  offset?: number;
  highlight?: boolean;
  fuzzy?: boolean;
  fuzzyDistance?: number;       // max edit distance (1 or 2)
}

export interface SearchFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'range';
  value: unknown;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  limit: number;
  offset: number;
  facets: SearchFacet[];
  executionTimeMs: number;
  correctedQuery: string | null;
  suggestions: string[];
}

/**
 * AutocompleteEntry — a single autocomplete suggestion.
 */
export interface AutocompleteEntry {
  id: string;
  tenantId: string;
  term: string;
  frequency: number;
  domain: SearchDomain;
  lastUsedAt: string;
}

/**
 * RankingRule — boost/demote rules.
 */
export interface RankingRule {
  id: string;
  tenantId: string;
  name: string;
  sourceType: string;
  sourceId: string | null;       // null = applies to all in sourceType
  action: 'boost' | 'demote';
  multiplier: number;
  createdAt: string;
}

/**
 * SearchAnalytics — aggregated search analytics.
 */
export interface SearchAnalytics {
  id: string;
  tenantId: string;
  totalSearches: number;
  totalClicks: number;
  clickThroughRate: number;
  zeroResultQueries: number;
  zeroResultRate: number;
  averageResultsPerPage: number;
  topKeywords: { keyword: string; count: number }[];
  trendingKeywords: { keyword: string; trend: number }[];
  noResultQueries: string[];
  period: string;
  computedAt: string;
}

/**
 * SearchLog — a single search execution log.
 */
export interface SearchLog {
  id: string;
  tenantId: string;
  query: string;
  domain: SearchDomain;
  resultCount: number;
  executionTimeMs: number;
  clicked: boolean;
  clickedDocId: string | null;
  userId: string | null;
  timestamp: string;
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export type SearchAuditEventType =
  | 'document_indexed' | 'document_updated' | 'document_deleted'
  | 'index_rebuilt' | 'index_refreshed' | 'index_failed'
  | 'search_executed' | 'autocomplete_triggered'
  | 'ranking_updated' | 'analytics_updated';

export interface SearchAuditRecord {
  id: string;
  tenantId: string;
  indexId?: string;
  documentId?: string;
  actorId: string;
  correlationId: string;
  eventType: SearchAuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Repositories
// ═══════════════════════════════════════════

export interface ISearchRepository {
  insert(doc: IndexedDocument): Promise<void>;
  findById(tenantId: string, id: string): Promise<IndexedDocument | null>;
  findBySource(tenantId: string, sourceEngine: string, sourceId: string): Promise<IndexedDocument | null>;
  update(tenantId: string, id: string, patch: Partial<IndexedDocument>): Promise<void>;
  delete(tenantId: string, id: string): Promise<void>;
  findAll(tenantId: string): Promise<IndexedDocument[]>;
  findByDomain(tenantId: string, domain: SearchDomain): Promise<IndexedDocument[]>;
}

export interface IIndexRepository {
  insert(idx: SearchIndex): Promise<void>;
  findById(tenantId: string, id: string): Promise<SearchIndex | null>;
  findByDomain(tenantId: string, domain: SearchDomain): Promise<SearchIndex | null>;
  update(tenantId: string, id: string, patch: Partial<SearchIndex>): Promise<void>;
  listByTenant(tenantId: string): Promise<SearchIndex[]>;
}

export interface IAutocompleteRepository {
  insert(entry: AutocompleteEntry): Promise<void>;
  findByTerm(tenantId: string, prefix: string, limit?: number): Promise<AutocompleteEntry[]>;
  incrementFrequency(tenantId: string, term: string, domain: SearchDomain): Promise<void>;
  listPopular(tenantId: string, limit?: number): Promise<AutocompleteEntry[]>;
}

export interface IRankingRepository {
  insert(rule: RankingRule): Promise<void>;
  findById(tenantId: string, id: string): Promise<RankingRule | null>;
  findBySourceType(tenantId: string, sourceType: string): Promise<RankingRule[]>;
  delete(tenantId: string, id: string): Promise<void>;
  listByTenant(tenantId: string): Promise<RankingRule[]>;
}

export interface IAnalyticsRepository {
  insertLog(log: SearchLog): Promise<void>;
  getLogs(tenantId: string, limit?: number): Promise<SearchLog[]>;
  getZeroResultQueries(tenantId: string, limit?: number): Promise<SearchLog[]>;
  getTopKeywords(tenantId: string, limit?: number): Promise<{ keyword: string; count: number }[]>;
}

export interface ISynonymRepository {
  insert(group: SynonymGroup): Promise<void>;
  findById(tenantId: string, id: string): Promise<SynonymGroup | null>;
  findByTerm(tenantId: string, term: string): Promise<SynonymGroup | null>;
  listByTenant(tenantId: string): Promise<SynonymGroup[]>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface ISearchAuditRepository {
  insert(record: Omit<SearchAuditRecord, 'id' | 'createdAt'>): Promise<SearchAuditRecord>;
  findByTenant(tenantId: string, limit?: number): Promise<SearchAuditRecord[]>;
}

export { type Result, type EventEnvelope };
