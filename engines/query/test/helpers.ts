/**
 * Test fixtures — Query Engine
 */
import type { QueryUseCaseDeps } from '../src/use-cases/types.js';
import {
  InMemoryProjectionRepository, InMemoryDashboardRepository, InMemorySummaryRepository,
  InMemoryTimelineRepository, InMemoryAnalyticsRepository, InMemorySearchFeedRepository,
  InMemoryAIContextRepository, InMemoryCheckpointRepository, InMemoryQueryAuditRepository,
  MockEventFeedProvider, MockDataProvider, StaticQueryPolicyProvider, InMemoryEventBus,
} from '../src/index.js';

export function makeClock() {
  let offset = 0;
  const base = new Date('2026-07-11T08:00:00.000Z');
  return { now: () => new Date(base.getTime() + offset++ * 1000) };
}

export function makeDeps(): QueryUseCaseDeps & {
  projectionRepo: InMemoryProjectionRepository;
  dashboardRepo: InMemoryDashboardRepository;
  summaryRepo: InMemorySummaryRepository;
  timelineRepo: InMemoryTimelineRepository;
  analyticsRepo: InMemoryAnalyticsRepository;
  searchFeedRepo: InMemorySearchFeedRepository;
  aiContextRepo: InMemoryAIContextRepository;
  checkpointRepo: InMemoryCheckpointRepository;
  auditRepo: InMemoryQueryAuditRepository;
  eventFeedProvider: MockEventFeedProvider;
  dataProvider: MockDataProvider;
  policyProvider: StaticQueryPolicyProvider;
  eventBus: InMemoryEventBus;
  idGenerator: { generate(): string };
  clock: { now(): Date };
} {
  const projectionRepo = new InMemoryProjectionRepository();
  const dashboardRepo = new InMemoryDashboardRepository();
  const summaryRepo = new InMemorySummaryRepository();
  const timelineRepo = new InMemoryTimelineRepository();
  const analyticsRepo = new InMemoryAnalyticsRepository();
  const searchFeedRepo = new InMemorySearchFeedRepository();
  const aiContextRepo = new InMemoryAIContextRepository();
  const checkpointRepo = new InMemoryCheckpointRepository();
  const auditRepo = new InMemoryQueryAuditRepository();
  const eventBus = new InMemoryEventBus();
  const eventFeedProvider = new MockEventFeedProvider();
  const dataProvider = new MockDataProvider();
  const policyProvider = new StaticQueryPolicyProvider();

  policyProvider.set('t-1', {
    allowedTypes: ['customer_dashboard', 'organization_dashboard', 'sales_dashboard', 'operations_dashboard',
      'booking_summary', 'order_summary', 'payment_summary', 'review_summary', 'inventory_summary', 'catalog_summary'],
    maxProjections: 1000, refreshIntervalMs: 30000,
  });

  let idCounter = 0;
  const idGenerator = {
    generate(): string {
      idCounter += 1;
      return `id-${Date.now()}-${idCounter}-${Math.floor(Math.random() * 1e6).toString(36)}`;
    },
  };

  return {
    projectionRepo, dashboardRepo, summaryRepo, timelineRepo, analyticsRepo,
    searchFeedRepo, aiContextRepo, checkpointRepo, auditRepo, eventBus,
    eventFeedProvider, dataProvider, policyProvider, idGenerator, clock: makeClock(),
  };
}
