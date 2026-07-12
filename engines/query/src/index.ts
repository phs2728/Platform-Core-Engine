/**
 * Query Engine (Projection Engine) — Public API
 *
 * 사장님 확립 (2026-07-11) Phase 6 — CQRS Read Model Engine.
 *   Consumes events → builds projections → serves dashboards/summaries/timelines/search/AI feeds.
 *
 * Sprint 1 Use Cases: 35
 *   Projection (7) + Dashboard/Summary/Timeline (13) + Search/AI/Analytics (11) + convenience (4)
 */

// Core SDK Re-exports
export { type Result, Ok, Err, ValidationError, NotFoundError, ConflictError, type EventEnvelope, createEnvelope, z } from '@platform/core-sdk';

// Domain Types
export type {
  Projection, Dashboard, DashboardWidget, Summary, TimelineEntry,
  SearchDocument, AIContext, Checkpoint, AnalyticsMetrics,
  QueryAuditRecord, QueryAuditEventType, FeedEvent,
  ProjectionType, ProjectionStatus, DashboardType, SummaryType, TimelineType, FeedType,
  ProjectionSearchCriteria, ProjectionSearchResult,
} from './interfaces/index.js';

// Host Interfaces
export type {
  IClock, IIdGenerator, IEventBus,
  IEventFeedProvider, IDataProvider, ICustomDataPolicyProvider,
} from './interfaces/index.js';

// Repository Interfaces
export type {
  IProjectionRepository, IDashboardRepository, ISummaryRepository,
  ITimelineRepository, IAnalyticsRepository, ISearchFeedRepository,
  IAIContextRepository, ICheckpointRepository, IQueryAuditRepository,
} from './interfaces/index.js';

// Projection UseCases (7)
export {
  createProjectionUseCase, processEventUseCase,
  rebuildProjectionUseCase, refreshProjectionUseCase,
  archiveProjectionUseCase, getProjectionUseCase,
  type CreateProjectionInput, type ProcessEventInput,
} from './use-cases/ProjectionUseCases.js';

// Dashboard + Summary + Timeline UseCases (13)
export {
  getCustomerDashboardUseCase, getOrganizationDashboardUseCase,
  getSalesDashboardUseCase, getOperationsDashboardUseCase, getDashboardUseCase,
  getBookingSummaryUseCase, getOrderSummaryUseCase, getPaymentSummaryUseCase,
  getReviewSummaryUseCase, getInventorySummaryUseCase,
  getActivityTimelineUseCase, getAuditTimelineUseCase,
  getTimelineUseCase, recordTimelineEntryUseCase,
} from './use-cases/DashboardSummaryUseCases.js';

// Search + AI + Analytics UseCases (11)
export {
  buildSearchDocumentUseCase, listSearchDocumentsUseCase, reindexProjectionUseCase,
  buildAIContextUseCase, getAIContextUseCase, rebuildAIContextUseCase,
  getMetricsUseCase, getTrendUseCase, getStatisticsUseCase, getTopEntitiesUseCase,
  listProjectionsUseCase,
  type BuildSearchDocInput, type BuildAIContextInput,
} from './use-cases/SearchAnalyticsUseCases.js';

// Use Case Deps
export type { QueryUseCaseDeps } from './use-cases/types.js';

// In-Memory Repositories
export {
  InMemoryProjectionRepository, InMemoryDashboardRepository, InMemorySummaryRepository,
  InMemoryTimelineRepository, InMemoryAnalyticsRepository, InMemorySearchFeedRepository,
  InMemoryAIContextRepository, InMemoryCheckpointRepository, InMemoryQueryAuditRepository,
} from './infrastructure/InMemoryRepositories.js';

// Host Stubs + EventBus
export {
  MockEventFeedProvider, MockDataProvider, StaticQueryPolicyProvider,
  InMemoryEventBus, type RecordedEnvelope,
} from './infrastructure/hostAdapters.js';
