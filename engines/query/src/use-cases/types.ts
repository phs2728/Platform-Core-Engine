/**
 * Query Engine — Shared Use Case Deps (3-Layer DI)
 */
import type {
  IClock, IIdGenerator, IEventBus,
  IProjectionRepository, IDashboardRepository, ISummaryRepository,
  ITimelineRepository, IAnalyticsRepository, ISearchFeedRepository,
  IAIContextRepository, ICheckpointRepository, IQueryAuditRepository,
  IEventFeedProvider, IDataProvider, ICustomDataPolicyProvider,
} from '../interfaces/index.js';

export interface QueryUseCaseDeps {
  projectionRepo: IProjectionRepository;
  dashboardRepo: IDashboardRepository;
  summaryRepo: ISummaryRepository;
  timelineRepo: ITimelineRepository;
  analyticsRepo: IAnalyticsRepository;
  searchFeedRepo: ISearchFeedRepository;
  aiContextRepo: IAIContextRepository;
  checkpointRepo: ICheckpointRepository;
  auditRepo: IQueryAuditRepository;
  eventFeedProvider: IEventFeedProvider;
  dataProvider: IDataProvider;
  policyProvider: ICustomDataPolicyProvider;
  eventBus: IEventBus;
  idGenerator: IIdGenerator;
  clock: IClock;
}
