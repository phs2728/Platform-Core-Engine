# Search Engine v0.1 RC1

> Universal Search Engine — indexes Query Engine projections, provides search API with autocomplete, ranking, faceting, and analytics.

## Overview

Search Engine은 검색을 직접 수행하는 것이 아니라 **Query Engine이 만든 Projection을 색인(Indexing)하고 검색 API를 제공**합니다.

- **7 Match Types**: full_text, exact, prefix, fuzzy, wildcard, phrase, boolean
- **8 Search Domains**: catalog, organization, booking, review, media, user, payment, global
- **Autocomplete**: frequency-based + title-token suggestions
- **Ranking**: boost/demote, popularity, recency, TF-IDF-ish scoring
- **Faceting**: category, price, rating, location, organization, status
- **Filters**: eq, neq, gt, gte, lt, lte, in, contains, range
- **Synonyms**: query expansion
- **Spell Correction**: host-provided
- **Analytics**: CTR, zero-result queries, trending keywords

## Architecture

```
engines/search/
├── src/
│   ├── interfaces/index.ts          — entities + 7 repos + 5 host interfaces
│   ├── domain/
│   │   ├── searchEngine.ts          — tokenizer, matcher, scorer, highlighter, faceter
│   │   ├── events.ts / audit.ts / validation.ts
│   ├── infrastructure/
│   │   ├── InMemoryRepositories.ts  — 7 InMemory repos
│   │   └── hostAdapters.ts          — MockProjectionProvider, RankingProvider, etc.
│   ├── use-cases/
│   │   ├── IndexUseCases.ts         — 7 (index/update/delete/rebuild/refresh/get/list)
│   │   ├── SearchUseCases.ts        — 14 (search + domain search + autocomplete + synonyms)
│   │   └── RankingAnalyticsUseCases.ts — 8 (ranking + analytics)
│   └── index.ts
├── test/search.test.ts              — 60 tests (10 describe blocks)
└── examples/01-full-lifecycle.ts
```

## Use Cases (35)

### Index (7)
- `indexDocumentUseCase` / `updateDocumentUseCase` / `deleteDocumentUseCase`
- `rebuildIndexUseCase` / `refreshIndexUseCase` / `getIndexUseCase` / `listIndexesUseCase`

### Search + Autocomplete (14)
- `searchUseCase` (core) + 7 domain-specific (catalog/organization/booking/review/media/user/payment)
- `autocompleteUseCase` / `suggestUseCase` / `popularSearchesUseCase`
- `addSynonymUseCase` / `getSynonymsUseCase`

### Ranking + Analytics (8)
- `calculateRankingUseCase` / `boostUseCase` / `demoteUseCase` / `reindexRankingUseCase`
- `recordSearchUseCase` / `getSearchStatisticsUseCase` / `getTrendingKeywordsUseCase` / `getNoResultQueriesUseCase`

## Events (10)
```
search.document.indexed / updated / deleted
search.index.rebuilt / refreshed
search.executed / autocomplete
search.analytics.updated / ranking.updated / failed
```

## Sprint 1 Results
- 35 Use Cases, 60 tests, 7 InMemory Repositories
- 0 direct engine imports (IProjectionProvider from Query Engine)
- 0 industry-agnostic violations
