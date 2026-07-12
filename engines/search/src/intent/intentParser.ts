/**
 * Intent Parser — parses raw user input into structured search intent.
 *
 * Uses IIntentParserProvider (host plugin) for AI-powered parsing.
 * Falls back to keyword-based parsing when no AI provider is configured.
 */
import { Ok, Err, type Result } from '@platform/core-sdk';
import type {
  IIntentParserProvider, IntentType, SearchIntent, IntentEntity,
  SearchFilter, IClock, IIdGenerator,
} from '../interfaces/index.js';
import { tokenize } from '../domain/searchEngine.js';

/** Fallback keyword parser — no AI needed. */
export function parseKeywordIntent(
  input: string, tenantId: string,
  idGen: IIdGenerator, clock: IClock,
): SearchIntent {
  const tokens = tokenize(input);
  const entities: IntentEntity[] = tokens.map((t) => ({
    name: t, value: t, category: 'keyword',
  }));

  return {
    id: idGen.generate(),
    tenantId,
    type: 'keyword',
    rawInput: input,
    parsedQuery: tokens.join(' '),
    entities,
    filters: [],
    confidence: 0.7,
    createdAt: clock.now().toISOString(),
  };
}

/** Parse intent using AI provider (or fallback). */
export async function parseIntent(
  provider: IIntentParserProvider | null,
  input: string,
  type: IntentType,
  tenantId: string,
  idGen: IIdGenerator,
  clock: IClock,
): Promise<Result<SearchIntent, Error>> {
  // Try AI provider first
  if (provider) {
    const result = await provider.parse(tenantId, input, type);
    if (result.ok) return Ok(result.value);
  }

  // Fallback: keyword parsing
  if (type === 'keyword' || type === 'natural_language' || type === 'voice') {
    return Ok(parseKeywordIntent(input, tenantId, idGen, clock));
  }

  // For image/barcode/qr — requires AI provider
  if (!provider) {
    return Err(new Error(`Intent type "${type}" requires an IIntentParserProvider`));
  }

  return Err(new Error('Failed to parse intent'));
}

/** Extract filter-like modifiers from text (e.g. "rating > 4.5" → filter). */
export function extractFiltersFromText(text: string): SearchFilter[] {
  const filters: SearchFilter[] = [];

  // Rating patterns: "rating > 4", "rating:5"
  const ratingMatch = text.match(/rating\s*[>:]\s*(\d+(?:\.\d+)?)/i);
  if (ratingMatch) {
    filters.push({ field: 'rating', operator: 'gte', value: parseFloat(ratingMatch[1]!) });
  }

  // Price patterns: "under 100", "price < 50"
  const priceMatch = text.match(/(?:under|price\s*[<])\s*(\d+)/i);
  if (priceMatch) {
    filters.push({ field: 'price', operator: 'lte', value: parseInt(priceMatch[1]!, 10) });
  }

  return filters;
}
