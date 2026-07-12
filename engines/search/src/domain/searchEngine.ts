/**
 * Search Engine — Core search logic: tokenize, match, score, highlight.
 *
 * In-memory inverted index with TF-IDF-ish scoring.
 */

import type {
  IndexedDocument, SearchResult, SearchHighlight, SearchFilter,
  SearchMatchType,
} from '../interfaces/index.js';

// ═══════════════════════════════════════════
// Tokenizer
// ═══════════════════════════════════════════

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'can', 'of', 'in', 'on', 'at', 'to',
  'for', 'with', 'by', 'from', 'as', 'into', 'through',
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t));
}

export function extractFacets(metadata: Record<string, unknown>): Record<string, string> {
  const facets: Record<string, string> = {};
  const knownKeys = ['category', 'price_range', 'rating_range', 'location', 'organizationId', 'status', 'language'];
  for (const k of knownKeys) {
    if (metadata[k] !== undefined && metadata[k] !== null) {
      facets[k] = String(metadata[k]);
    }
  }
  return facets;
}

// ═══════════════════════════════════════════
// Matching
// ═══════════════════════════════════════════

export function matchDocument(
  doc: IndexedDocument,
  queryTokens: string[],
  matchType: SearchMatchType,
  fuzzyDistance: number,
): { matched: boolean; matchedTerms: string[]; score: number } {
  if (queryTokens.length === 0) return { matched: true, matchedTerms: [], score: 0 };

  const matchedTerms: string[] = [];
  let score = 0;

  for (const qt of queryTokens) {
    let found = false;

    // Title tokens — higher weight
    for (const tt of doc.titleTokens) {
      if (matchesToken(qt, tt, matchType, fuzzyDistance)) {
        found = true;
        score += 3.0; // title weight
        if (!matchedTerms.includes(qt)) matchedTerms.push(qt);
        break;
      }
    }

    // Content tokens
    if (!found) {
      for (const ct of doc.contentTokens) {
        if (matchesToken(qt, ct, matchType, fuzzyDistance)) {
          found = true;
          score += 1.0; // content weight
          if (!matchedTerms.includes(qt)) matchedTerms.push(qt);
          break;
        }
      }
    }

    // Keywords — medium weight
    if (!found) {
      for (const kw of doc.keywords) {
        if (matchesToken(qt, kw.toLowerCase(), matchType, fuzzyDistance)) {
          found = true;
          score += 2.0;
          if (!matchedTerms.includes(qt)) matchedTerms.push(qt);
          break;
        }
      }
    }
  }

  // Normalize by query length
  const matchRatio = matchedTerms.length / queryTokens.length;
  score *= matchRatio;

  // Apply boost + popularity
  score *= doc.boost;
  score += doc.popularity * 0.01;

  return { matched: matchedTerms.length > 0, matchedTerms, score };
}

function matchesToken(query: string, token: string, matchType: SearchMatchType, fuzzyDistance: number): boolean {
  switch (matchType) {
    case 'exact':
    case 'phrase':
      return query === token;
    case 'prefix':
      return token.startsWith(query);
    case 'fuzzy':
      return levenshtein(query, token) <= fuzzyDistance;
    case 'wildcard':
      return wildcardMatch(query, token);
    case 'boolean':
      // Simple: treat as OR (any token matches)
      return token.includes(query);
    case 'full_text':
    default:
      // full_text: exact or prefix match
      return token === query || token.startsWith(query) || token.includes(query);
  }
}

// ═══════════════════════════════════════════
// Levenshtein Distance (for fuzzy search)
// ═══════════════════════════════════════════

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev: number[] = new Array(b.length + 1);
  const curr: number[] = new Array(b.length + 1);

  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min((prev[j] ?? 0) + 1, (curr[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j] ?? 0;
  }

  return prev[b.length] ?? 0;
}

// ═══════════════════════════════════════════
// Wildcard matching
// ═══════════════════════════════════════════

export function wildcardMatch(pattern: string, text: string): boolean {
  const regexStr = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${regexStr}$`).test(text);
}

// ═══════════════════════════════════════════
// Filtering
// ═══════════════════════════════════════════

export function applyFilter(doc: IndexedDocument, filter: SearchFilter): boolean {
  const fieldValue = getFieldValue(doc, filter.field);
  if (fieldValue === undefined) return false;

  switch (filter.operator) {
    case 'eq': return String(fieldValue) === String(filter.value);
    case 'neq': return String(fieldValue) !== String(filter.value);
    case 'gt': return Number(fieldValue) > Number(filter.value);
    case 'gte': return Number(fieldValue) >= Number(filter.value);
    case 'lt': return Number(fieldValue) < Number(filter.value);
    case 'lte': return Number(fieldValue) <= Number(filter.value);
    case 'in': return Array.isArray(filter.value) && filter.value.includes(fieldValue);
    case 'contains': return String(fieldValue).includes(String(filter.value));
    case 'range': {
      const range = filter.value as { min?: number; max?: number };
      const num = Number(fieldValue);
      if (range.min !== undefined && num < range.min) return false;
      if (range.max !== undefined && num > range.max) return false;
      return true;
    }
    default: return true;
  }
}

function getFieldValue(doc: IndexedDocument, field: string): unknown {
  // Check known fields
  const known: Record<string, unknown> = {
    sourceType: doc.sourceType,
    sourceId: doc.sourceId,
    title: doc.title,
    ...doc.facets,
    ...doc.metadata,
  };
  return known[field];
}

export function applyFilters(doc: IndexedDocument, filters: SearchFilter[]): boolean {
  return filters.every((f) => applyFilter(doc, f));
}

// ═══════════════════════════════════════════
// Highlighting
// ═══════════════════════════════════════════

export function highlightMatch(text: string, matchedTerms: string[]): string {
  let result = text;
  for (const term of matchedTerms) {
    const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
    result = result.replace(regex, '<em>$1</em>');
  }
  return result;
}

export function createHighlight(field: string, text: string, matchedTerms: string[], maxLen: number = 150): SearchHighlight {
  const fragment = text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
  return {
    field,
    fragment: highlightMatch(fragment, matchedTerms),
    positions: matchedTerms.flatMap((t) => {
      const positions: number[] = [];
      const lower = text.toLowerCase();
      const term = t.toLowerCase();
      let idx = lower.indexOf(term);
      while (idx !== -1) { positions.push(idx); idx = lower.indexOf(term, idx + 1); }
      return positions;
    }),
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ═══════════════════════════════════════════
// Facet computation
// ═══════════════════════════════════════════

export function computeFacets(
  docs: IndexedDocument[],
  facetFields: string[],
): { type: string; field: string; values: { value: string; count: number }[] }[] {
  const results: { type: string; field: string; values: { value: string; count: number }[] }[] = [];

  for (const field of facetFields) {
    const counts = new Map<string, number>();
    for (const doc of docs) {
      const val = doc.facets[field] ?? String(doc.metadata[field] ?? '');
      if (val) counts.set(val, (counts.get(val) ?? 0) + 1);
    }
    const values = [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
    results.push({ type: field, field, values });
  }

  return results;
}
