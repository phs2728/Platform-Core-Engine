/**
 * Query Engine — Demo: Full Lifecycle
 *
 * Create Projection → Process Events → Rebuild → Dashboard → Summary → Timeline → Search Doc → AI Context
 */
import {
  createProjectionUseCase, processEventUseCase, rebuildProjectionUseCase, refreshProjectionUseCase,
  getCustomerDashboardUseCase, getOrganizationDashboardUseCase,
  getBookingSummaryUseCase, getActivityTimelineUseCase, recordTimelineEntryUseCase,
  buildSearchDocumentUseCase, listSearchDocumentsUseCase, reindexProjectionUseCase,
  buildAIContextUseCase, getAIContextUseCase,
  InMemoryProjectionRepository, InMemoryDashboardRepository, InMemorySummaryRepository,
  InMemoryTimelineRepository, InMemoryAnalyticsRepository, InMemorySearchFeedRepository,
  InMemoryAIContextRepository, InMemoryCheckpointRepository, InMemoryQueryAuditRepository,
  MockEventFeedProvider, MockDataProvider, StaticQueryPolicyProvider, InMemoryEventBus,
} from '../src/index.js';

async function main() {
  console.log('═══ Query Engine (Projection Engine) — Demo ═══\n');

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
  policyProvider.set('demo', { allowedTypes: ['customer_dashboard', 'booking_summary', 'organization_dashboard'], maxProjections: 500, refreshIntervalMs: 30000 });

  let idSeq = 0;
  const deps = {
    projectionRepo, dashboardRepo, summaryRepo, timelineRepo, analyticsRepo,
    searchFeedRepo, aiContextRepo, checkpointRepo, auditRepo, eventBus,
    eventFeedProvider, dataProvider, policyProvider,
    idGenerator: { generate: () => `demo-${++idSeq}` },
    clock: { now: () => new Date('2026-07-11T08:00:00.000Z') },
  };

  const u = <T>(r: { ok: boolean; value?: T; error?: unknown }): T => {
    if (!r.ok) throw new Error(String((r.error as { message?: string })?.message ?? 'error'));
    return r.value as T;
  };

  // 1) Create Projection
  console.log('▶ 1) Create Projection');
  const proj = u(await createProjectionUseCase({
    tenantId: 'demo', correlationId: 'd-1', actorId: 'admin',
    name: 'Customer Dashboard Projection', type: 'realtime',
    sourceEngine: 'booking', sourceEventTypes: ['booking.created', 'booking.cancelled'],
    targetType: 'customer_dashboard', targetRef: 'cust-001',
  }, deps));
  console.log(`  ✓ projectionId = ${proj.projectionId}\n`);

  // 2) Process Events
  console.log('▶ 2) Process Events');
  u(await processEventUseCase({
    tenantId: 'demo', correlationId: 'd-2', actorId: 'system', projectionId: proj.projectionId,
    event: { eventId: 'e-1', engine: 'booking', eventType: 'booking.created', aggregateId: 'b-001', tenantId: 'demo', payload: { itemId: 'item-1', amount: 100 }, occurredAt: new Date().toISOString(), position: 0 },
  }, deps));
  u(await processEventUseCase({
    tenantId: 'demo', correlationId: 'd-3', actorId: 'system', projectionId: proj.projectionId,
    event: { eventId: 'e-2', engine: 'booking', eventType: 'booking.created', aggregateId: 'b-002', tenantId: 'demo', payload: { itemId: 'item-2', amount: 200 }, occurredAt: new Date().toISOString(), position: 1 },
  }, deps));
  console.log(`  ✓ 2 events processed\n`);

  // 3) Customer Dashboard
  console.log('▶ 3) Get Customer Dashboard');
  const dash = u(await getCustomerDashboardUseCase({ tenantId: 'demo', correlationId: 'd-4', targetRef: 'cust-001' }, deps));
  console.log(`  ✓ ${dash.widgets.length} widgets\n`);

  // 4) Booking Summary
  console.log('▶ 4) Get Booking Summary');
  u(await getBookingSummaryUseCase({ tenantId: 'demo', correlationId: 'd-5' }, deps));
  console.log(`  ✓ summary created\n`);

  // 5) Timeline
  console.log('▶ 5) Record Timeline + Get Activity');
  u(await recordTimelineEntryUseCase({
    tenantId: 'demo', type: 'activity', aggregateId: 'b-001', aggregateType: 'booking',
    eventType: 'booking.created', description: 'Customer booked item-1', actorId: 'cust-001',
  }, deps));
  const timeline = u(await getActivityTimelineUseCase({ tenantId: 'demo' }, deps));
  console.log(`  ✓ ${timeline.length} timeline entries\n`);

  // 6) Search Document
  console.log('▶ 6) Build Search Document');
  u(await buildSearchDocumentUseCase({
    tenantId: 'demo', correlationId: 'd-6', actorId: 'system',
    sourceEngine: 'catalog', sourceType: 'catalog_item', sourceId: 'item-1',
    title: 'Deluxe Item', content: 'Premium quality item',
    keywords: ['premium', 'deluxe'], tags: ['featured'],
  }, deps));
  console.log(`  ✓ search doc created\n`);

  // 7) AI Context
  console.log('▶ 7) Build AI Context');
  u(await buildAIContextUseCase({
    tenantId: 'demo', correlationId: 'd-7', actorId: 'system',
    contextType: 'customer', targetRef: 'cust-001',
    summary: 'Active customer with 2 bookings totaling 300', facts: { bookings: 2, totalSpent: 300 },
    sentiment: 0.7, riskLevel: 'low',
  }, deps));
  console.log(`  ✓ AI context built\n`);

  // 8) Rebuild Projection
  console.log('▶ 8) Rebuild Projection (Full)');
  eventFeedProvider.pushEvent('booking', 'booking.created', 'b-003', 'demo', { itemId: 'item-3' });
  eventFeedProvider.pushEvent('booking', 'booking.cancelled', 'b-001', 'demo', { reason: 'changed mind' });
  const rebuilt = u(await rebuildProjectionUseCase({ tenantId: 'demo', correlationId: 'd-8', actorId: 'admin', projectionId: proj.projectionId }, deps));
  console.log(`  ✓ rebuilt with ${rebuilt.eventCount} events\n`);

  // Summary
  console.log('═══ Events Emitted ═══');
  const counts = new Map<string, number>();
  for (const r of eventBus.emitted) counts.set(r.envelope.eventType, (counts.get(r.envelope.eventType) ?? 0) + 1);
  for (const [type, count] of [...counts.entries()].sort()) console.log(`  ${type}: ${count}`);

  console.log('\n═══ Demo Complete ═══');
}

main().catch((e) => { console.error('Demo failed:', e); process.exit(1); });
