# Query Engine (Projection Engine) v0.1 RC1

> CQRS Read Model Engine — Event-driven projections for dashboards, summaries, timelines, search, and AI.

## Overview

Query Engine은 CRUD를 담당하지 않습니다. 모든 엔진에서 발생한 Event를 소비하여 **조회 전용 모델(Read Model)**을 구축하는 엔진입니다.

- **Projection**: Event를 소비하여 materialized view 구축 (realtime/scheduled/snapshot/incremental/full_rebuild)
- **Dashboard**: Customer, Organization, Sales, Operations 대시보드
- **Summary**: Booking, Order, Payment, Review, Inventory 도메인 요약
- **Timeline**: Activity, Audit 타임라인
- **Search Feed**: Search Engine이 소비하는 표준 문서
- **AI Context**: AI Engine이 소비하는 컨텍스트 (facts, sentiment, risk)
- **Analytics**: Metrics, Trend, Statistics, Top Entities

## Key Features

- **Idempotency**: checkpoint 기반 중복 이벤트 처리 방지
- **Event Replay**: 과거 이벤트부터 전체 재구축 (rebuild)
- **Incremental Refresh**: checkpoint 이후的新 이벤트만 처리 (refresh)
- **Versioning**: 프로젝션 버전 관리
- **CQRS Pattern**: 쓰기 없음, 오직 읽기 모델만 관리

## Architecture

```
engines/query/
├── src/
│   ├── interfaces/index.ts          — 10 entities + 9 repos + 3 host interfaces
│   ├── domain/ (events, audit, statusTransition, validation)
│   ├── infrastructure/ (9 InMemory repos + MockEventFeedProvider + host adapters)
│   ├── use-cases/
│   │   ├── ProjectionUseCases.ts    — 7 (create/process/rebuild/refresh/archive/get)
│   │   ├── DashboardSummaryUseCases.ts — 13 (dashboards + summaries + timeline)
│   │   └── SearchAnalyticsUseCases.ts  — 11 (search + AI + analytics)
│   └── index.ts
├── test/query.test.ts               — 60 tests
└── examples/01-full-lifecycle.ts
```

## Use Cases (35)

### Projection (7)
- `createProjectionUseCase` / `processEventUseCase`
- `rebuildProjectionUseCase` / `refreshProjectionUseCase`
- `archiveProjectionUseCase` / `getProjectionUseCase`

### Dashboard + Summary + Timeline (13)
- `getCustomerDashboardUseCase` / `getOrganizationDashboardUseCase`
- `getSalesDashboardUseCase` / `getOperationsDashboardUseCase`
- `getBookingSummaryUseCase` / `getOrderSummaryUseCase` / `getPaymentSummaryUseCase`
- `getReviewSummaryUseCase` / `getInventorySummaryUseCase`
- `getActivityTimelineUseCase` / `getAuditTimelineUseCase` / `recordTimelineEntryUseCase`

### Search + AI + Analytics (11)
- `buildSearchDocumentUseCase` / `listSearchDocumentsUseCase` / `reindexProjectionUseCase`
- `buildAIContextUseCase` / `getAIContextUseCase` / `rebuildAIContextUseCase`
- `getMetricsUseCase` / `getTrendUseCase` / `getStatisticsUseCase` / `getTopEntitiesUseCase`
- `listProjectionsUseCase`

## Events (12)
```
projection.created / updated / rebuilt / refreshed / failed
dashboard.updated / summary.updated / timeline.updated / analytics.updated
search.document.created / updated
ai.context.updated
```

## Sprint 1 Results
- 35 Use Cases, 60 tests, 9 InMemory Repositories
- 0 cross-engine imports (IEventFeedProvider plugin)
- 0 industry-agnostic violations
