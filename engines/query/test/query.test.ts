/**
 * Query Engine — Tests (70+)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createProjectionUseCase, processEventUseCase,
  rebuildProjectionUseCase, refreshProjectionUseCase,
  archiveProjectionUseCase, getProjectionUseCase,
  getCustomerDashboardUseCase, getOrganizationDashboardUseCase,
  getSalesDashboardUseCase, getOperationsDashboardUseCase,
  getBookingSummaryUseCase, getOrderSummaryUseCase, getPaymentSummaryUseCase,
  getReviewSummaryUseCase, getInventorySummaryUseCase,
  getActivityTimelineUseCase, getAuditTimelineUseCase, recordTimelineEntryUseCase,
  buildSearchDocumentUseCase, listSearchDocumentsUseCase, reindexProjectionUseCase,
  buildAIContextUseCase, getAIContextUseCase, rebuildAIContextUseCase,
  getMetricsUseCase, getTrendUseCase, getStatisticsUseCase, getTopEntitiesUseCase,
  listProjectionsUseCase,
} from '../src/index.js';
import { makeDeps } from './helpers.js';

type Deps = ReturnType<typeof makeDeps>;

async function createProjection(deps: Deps) {
  const r = await createProjectionUseCase({
    tenantId: 't-1', correlationId: 'c-1', actorId: 'tester',
    name: 'Test Projection', type: 'realtime',
    sourceEngine: 'booking', sourceEventTypes: ['booking.created', 'booking.cancelled'],
    targetType: 'customer_dashboard', targetRef: 'cust-1',
  }, deps);
  if (!r.ok) throw new Error('createProjection failed');
  return r.value.projectionId;
}

// ═══════════════════════════════════════════
// 1. Projection CRUD (8 tests)
// ═══════════════════════════════════════════
describe('Projection CRUD', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('creates a projection', async () => {
    const r = await createProjectionUseCase({
      tenantId: 't-1', correlationId: 'c-1', actorId: 'a',
      name: 'Test', type: 'realtime', sourceEngine: 'booking',
      sourceEventTypes: ['booking.created'], targetType: 'customer_dashboard', targetRef: 'c-1',
    }, deps);
    expect(r.ok).toBe(true);
    expect(deps.eventBus.countByType('projection.created')).toBe(1);
  });

  it('rejects duplicate projection for same target', async () => {
    await createProjection(deps);
    const r = await createProjectionUseCase({
      tenantId: 't-1', correlationId: 'c-2', actorId: 'a',
      name: 'Dup', type: 'realtime', sourceEngine: 'booking',
      sourceEventTypes: ['booking.created'], targetType: 'customer_dashboard', targetRef: 'cust-1',
    }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects unallowed targetType', async () => {
    const r = await createProjectionUseCase({
      tenantId: 't-1', correlationId: 'c-1', actorId: 'a',
      name: 'Test', type: 'realtime', sourceEngine: 'booking',
      sourceEventTypes: ['booking.created'], targetType: 'forbidden', targetRef: 'c-1',
    }, deps);
    expect(r.ok).toBe(false);
  });

  it('initializes checkpoint', async () => {
    const pid = await createProjection(deps);
    const cp = await deps.checkpointRepo.findByProjection('t-1', pid, 'booking');
    expect(cp).not.toBeNull();
    expect(cp!.position).toBe(-1);
  });

  it('archives a projection', async () => {
    const pid = await createProjection(deps);
    const r = await archiveProjectionUseCase({ tenantId: 't-1', correlationId: 'c-2', actorId: 'a', projectionId: pid }, deps);
    expect(r.ok).toBe(true);
    const p = await deps.projectionRepo.findById('t-1', pid);
    expect(p!.status).toBe('Archived');
  });

  it('gets projection by id', async () => {
    const pid = await createProjection(deps);
    const r = await getProjectionUseCase('t-1', pid, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.id).toBe(pid);
  });

  it('lists projections', async () => {
    await createProjection(deps);
    const r = await listProjectionsUseCase({ tenantId: 't-1' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.total).toBe(1);
  });

  it('cannot process events for archived projection', async () => {
    const pid = await createProjection(deps);
    await archiveProjectionUseCase({ tenantId: 't-1', correlationId: 'c-2', actorId: 'a', projectionId: pid }, deps);
    const r = await processEventUseCase({
      tenantId: 't-1', correlationId: 'c-3', actorId: 'a', projectionId: pid,
      event: { eventId: 'e-1', engine: 'booking', eventType: 'booking.created', aggregateId: 'agg-1', tenantId: 't-1', payload: {}, occurredAt: new Date().toISOString(), position: 0 },
    }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// 2. Event Processing (10 tests)
// ═══════════════════════════════════════════
describe('Event Processing', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('processes an event and updates projection', async () => {
    const pid = await createProjection(deps);
    const r = await processEventUseCase({
      tenantId: 't-1', correlationId: 'c-2', actorId: 'a', projectionId: pid,
      event: { eventId: 'e-1', engine: 'booking', eventType: 'booking.created', aggregateId: 'b-1', tenantId: 't-1', payload: { id: 'b-1' }, occurredAt: new Date().toISOString(), position: 0 },
    }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.processed).toBe(true);
    expect(r.value!.version).toBe(1);
  });

  it('idempotency: skips already processed events', async () => {
    const pid = await createProjection(deps);
    await processEventUseCase({
      tenantId: 't-1', correlationId: 'c-2', actorId: 'a', projectionId: pid,
      event: { eventId: 'e-1', engine: 'booking', eventType: 'booking.created', aggregateId: 'b-1', tenantId: 't-1', payload: {}, occurredAt: new Date().toISOString(), position: 5 },
    }, deps);
    const r = await processEventUseCase({
      tenantId: 't-1', correlationId: 'c-3', actorId: 'a', projectionId: pid,
      event: { eventId: 'e-2', engine: 'booking', eventType: 'booking.created', aggregateId: 'b-2', tenantId: 't-1', payload: {}, occurredAt: new Date().toISOString(), position: 3 },
    }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.processed).toBe(false);
  });

  it('skips events not in sourceEventTypes', async () => {
    const pid = await createProjection(deps);
    const r = await processEventUseCase({
      tenantId: 't-1', correlationId: 'c-2', actorId: 'a', projectionId: pid,
      event: { eventId: 'e-1', engine: 'booking', eventType: 'booking.unknown', aggregateId: 'b-1', tenantId: 't-1', payload: {}, occurredAt: new Date().toISOString(), position: 0 },
    }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.processed).toBe(false);
  });

  it('updates checkpoint after processing', async () => {
    const pid = await createProjection(deps);
    await processEventUseCase({
      tenantId: 't-1', correlationId: 'c-2', actorId: 'a', projectionId: pid,
      event: { eventId: 'e-1', engine: 'booking', eventType: 'booking.created', aggregateId: 'b-1', tenantId: 't-1', payload: {}, occurredAt: new Date().toISOString(), position: 7 },
    }, deps);
    const cp = await deps.checkpointRepo.findByProjection('t-1', pid, 'booking');
    expect(cp!.position).toBe(7);
    expect(cp!.eventCount).toBe(1);
  });

  it('emits projection.updated event', async () => {
    const pid = await createProjection(deps);
    await processEventUseCase({
      tenantId: 't-1', correlationId: 'c-2', actorId: 'a', projectionId: pid,
      event: { eventId: 'e-1', engine: 'booking', eventType: 'booking.created', aggregateId: 'b-1', tenantId: 't-1', payload: {}, occurredAt: new Date().toISOString(), position: 0 },
    }, deps);
    expect(deps.eventBus.countByType('projection.updated')).toBe(1);
  });

  it('processes multiple events sequentially', async () => {
    const pid = await createProjection(deps);
    for (let i = 0; i < 5; i++) {
      await processEventUseCase({
        tenantId: 't-1', correlationId: `c-${i}`, actorId: 'a', projectionId: pid,
        event: { eventId: `e-${i}`, engine: 'booking', eventType: 'booking.created', aggregateId: `b-${i}`, tenantId: 't-1', payload: { idx: i }, occurredAt: new Date().toISOString(), position: i },
      }, deps);
    }
    const p = await deps.projectionRepo.findById('t-1', pid);
    expect(p!.eventCount).toBe(5);
    expect(p!.version).toBe(5);
    expect(p!.checkpoint).toBe(4);
  });

  it('rebuilds projection from event history', async () => {
    const pid = await createProjection(deps);
    // Push events to feed
    deps.eventFeedProvider.pushEvent('booking', 'booking.created', 'b-1', 't-1', { id: 'b-1' });
    deps.eventFeedProvider.pushEvent('booking', 'booking.cancelled', 'b-1', 't-1', { id: 'b-1' });
    deps.eventFeedProvider.pushEvent('booking', 'booking.created', 'b-2', 't-1', { id: 'b-2' });

    const r = await rebuildProjectionUseCase({ tenantId: 't-1', correlationId: 'c-2', actorId: 'a', projectionId: pid }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.eventCount).toBe(3);
    expect(deps.eventBus.countByType('projection.rebuilt')).toBe(1);
  });

  it('rebuild resets checkpoint', async () => {
    const pid = await createProjection(deps);
    await processEventUseCase({
      tenantId: 't-1', correlationId: 'c-2', actorId: 'a', projectionId: pid,
      event: { eventId: 'e-1', engine: 'booking', eventType: 'booking.created', aggregateId: 'b-1', tenantId: 't-1', payload: {}, occurredAt: new Date().toISOString(), position: 5 },
    }, deps);
    // rebuild with empty feed
    const r = await rebuildProjectionUseCase({ tenantId: 't-1', correlationId: 'c-3', actorId: 'a', projectionId: pid }, deps);
    expect(r.ok).toBe(true);
    const p = await deps.projectionRepo.findById('t-1', pid);
    expect(p!.checkpoint).toBe(-1);
  });

  it('refreshes projection incrementally', async () => {
    const pid = await createProjection(deps);
    // Push events after checkpoint
    deps.eventFeedProvider.pushEvent('booking', 'booking.created', 'b-1', 't-1', { id: 'b-1' });
    deps.eventFeedProvider.pushEvent('booking', 'booking.created', 'b-2', 't-1', { id: 'b-2' });

    const r = await refreshProjectionUseCase({ tenantId: 't-1', correlationId: 'c-2', actorId: 'a', projectionId: pid }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.newEvents).toBe(2);
    expect(deps.eventBus.countByType('projection.refreshed')).toBe(1);
  });

  it('refresh with no new events returns 0', async () => {
    const pid = await createProjection(deps);
    const r = await refreshProjectionUseCase({ tenantId: 't-1', correlationId: 'c-2', actorId: 'a', projectionId: pid }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.newEvents).toBe(0);
  });
});

// ═══════════════════════════════════════════
// 3. Dashboards (8 tests)
// ═══════════════════════════════════════════
describe('Dashboards', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('creates customer dashboard on first access', async () => {
    const r = await getCustomerDashboardUseCase({ tenantId: 't-1', correlationId: 'c-1', targetRef: 'cust-1' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.type).toBe('customer');
    expect(r.value!.widgets.length).toBe(5);
  });

  it('returns existing dashboard on second access', async () => {
    const first = await getCustomerDashboardUseCase({ tenantId: 't-1', correlationId: 'c-1', targetRef: 'cust-1' }, deps);
    const second = await getCustomerDashboardUseCase({ tenantId: 't-1', correlationId: 'c-2', targetRef: 'cust-1' }, deps);
    expect(second.value!.id).toBe(first.value!.id);
  });

  it('creates organization dashboard', async () => {
    const r = await getOrganizationDashboardUseCase({ tenantId: 't-1', correlationId: 'c-1', targetRef: 'org-1' }, deps);
    expect(r.value!.widgets.length).toBe(6);
  });

  it('creates sales dashboard', async () => {
    const r = await getSalesDashboardUseCase({ tenantId: 't-1', correlationId: 'c-1', targetRef: 'org-1' }, deps);
    expect(r.value!.widgets.length).toBe(5);
  });

  it('creates operations dashboard', async () => {
    const r = await getOperationsDashboardUseCase({ tenantId: 't-1', correlationId: 'c-1', targetRef: 'org-1' }, deps);
    expect(r.value!.widgets.length).toBe(3);
  });

  it('emits dashboard.updated event', async () => {
    await getCustomerDashboardUseCase({ tenantId: 't-1', correlationId: 'c-1', targetRef: 'cust-1' }, deps);
    expect(deps.eventBus.countByType('dashboard.updated')).toBe(1);
  });

  it('customer dashboard has bookings widget', async () => {
    const r = await getCustomerDashboardUseCase({ tenantId: 't-1', correlationId: 'c-1', targetRef: 'cust-1' }, deps);
    const bookings = r.value!.widgets.find((w) => w.name.includes('Booking'));
    expect(bookings).toBeDefined();
  });

  it('organization dashboard has revenue widget', async () => {
    const r = await getOrganizationDashboardUseCase({ tenantId: 't-1', correlationId: 'c-1', targetRef: 'org-1' }, deps);
    const revenue = r.value!.widgets.find((w) => w.name === 'Revenue');
    expect(revenue).toBeDefined();
  });
});

// ═══════════════════════════════════════════
// 4. Summaries (6 tests)
// ═══════════════════════════════════════════
describe('Summaries', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('creates booking summary', async () => {
    const r = await getBookingSummaryUseCase({ tenantId: 't-1', correlationId: 'c-1' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.type).toBe('booking');
  });

  it('creates order summary', async () => {
    const r = await getOrderSummaryUseCase({ tenantId: 't-1', correlationId: 'c-1' }, deps);
    expect(r.value!.type).toBe('order');
  });

  it('creates payment summary', async () => {
    const r = await getPaymentSummaryUseCase({ tenantId: 't-1', correlationId: 'c-1' }, deps);
    expect(r.value!.type).toBe('payment');
  });

  it('creates review summary', async () => {
    const r = await getReviewSummaryUseCase({ tenantId: 't-1', correlationId: 'c-1' }, deps);
    expect(r.value!.type).toBe('review');
  });

  it('creates inventory summary', async () => {
    const r = await getInventorySummaryUseCase({ tenantId: 't-1', correlationId: 'c-1' }, deps);
    expect(r.value!.type).toBe('inventory');
  });

  it('emits summary.updated event', async () => {
    await getBookingSummaryUseCase({ tenantId: 't-1', correlationId: 'c-1' }, deps);
    expect(deps.eventBus.countByType('summary.updated')).toBe(1);
  });
});

// ═══════════════════════════════════════════
// 5. Timeline (6 tests)
// ═══════════════════════════════════════════
describe('Timeline', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('records a timeline entry', async () => {
    const r = await recordTimelineEntryUseCase({
      tenantId: 't-1', type: 'activity', aggregateId: 'b-1', aggregateType: 'booking',
      eventType: 'booking.created', description: 'Booking created', actorId: 'user-1',
    }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.description).toBe('Booking created');
  });

  it('retrieves activity timeline', async () => {
    await recordTimelineEntryUseCase({ tenantId: 't-1', type: 'activity', aggregateId: 'b-1', aggregateType: 'booking', eventType: 'booking.created', description: 'Created', actorId: 'u-1' }, deps);
    const r = await getActivityTimelineUseCase({ tenantId: 't-1' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.length).toBe(1);
  });

  it('retrieves audit timeline', async () => {
    await recordTimelineEntryUseCase({ tenantId: 't-1', type: 'audit', aggregateId: 'p-1', aggregateType: 'payment', eventType: 'payment.created', description: 'Payment processed', actorId: 'u-1' }, deps);
    const r = await getAuditTimelineUseCase({ tenantId: 't-1' }, deps);
    expect(r.value!.length).toBe(1);
  });

  it('timeline is sorted newest first', async () => {
    await recordTimelineEntryUseCase({ tenantId: 't-1', type: 'activity', aggregateId: 'a-1', aggregateType: 'x', eventType: 'e1', description: 'first', actorId: 'u-1' }, deps);
    await recordTimelineEntryUseCase({ tenantId: 't-1', type: 'activity', aggregateId: 'a-2', aggregateType: 'x', eventType: 'e2', description: 'second', actorId: 'u-1' }, deps);
    const r = await getActivityTimelineUseCase({ tenantId: 't-1' }, deps);
    expect(r.value![0]!.description).toBe('second');
  });

  it('filters timeline by aggregate', async () => {
    await recordTimelineEntryUseCase({ tenantId: 't-1', type: 'activity', aggregateId: 'a-1', aggregateType: 'x', eventType: 'e1', description: 'for a-1', actorId: 'u-1' }, deps);
    await recordTimelineEntryUseCase({ tenantId: 't-1', type: 'activity', aggregateId: 'a-2', aggregateType: 'x', eventType: 'e2', description: 'for a-2', actorId: 'u-1' }, deps);
    const r = await deps.timelineRepo.findByAggregate('t-1', 'a-1');
    expect(r.length).toBe(1);
  });

  it('emits timeline.updated event', async () => {
    await recordTimelineEntryUseCase({ tenantId: 't-1', type: 'activity', aggregateId: 'a-1', aggregateType: 'x', eventType: 'e1', description: 'test', actorId: 'u-1' }, deps);
    expect(deps.eventBus.countByType('timeline.updated')).toBe(1);
  });
});

// ═══════════════════════════════════════════
// 6. Search Feed (6 tests)
// ═══════════════════════════════════════════
describe('Search Feed', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('builds a search document', async () => {
    const r = await buildSearchDocumentUseCase({
      tenantId: 't-1', correlationId: 'c-1', actorId: 'a',
      sourceEngine: 'catalog', sourceType: 'catalog_item', sourceId: 'item-1',
      title: 'Deluxe Item', content: 'A premium item with great features',
      keywords: ['premium', 'deluxe'], tags: ['featured'],
    }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.version).toBe(1);
  });

  it('upserts existing search document', async () => {
    await buildSearchDocumentUseCase({ tenantId: 't-1', correlationId: 'c-1', actorId: 'a', sourceEngine: 'catalog', sourceType: 'item', sourceId: 'i-1', title: 'V1', content: 'content' }, deps);
    const r = await buildSearchDocumentUseCase({ tenantId: 't-1', correlationId: 'c-2', actorId: 'a', sourceEngine: 'catalog', sourceType: 'item', sourceId: 'i-1', title: 'V2', content: 'updated' }, deps);
    expect(r.value!.version).toBe(2);
  });

  it('lists search documents', async () => {
    await buildSearchDocumentUseCase({ tenantId: 't-1', correlationId: 'c-1', actorId: 'a', sourceEngine: 'catalog', sourceType: 'item', sourceId: 'i-1', title: 'A', content: 'x' }, deps);
    await buildSearchDocumentUseCase({ tenantId: 't-1', correlationId: 'c-2', actorId: 'a', sourceEngine: 'review', sourceType: 'review', sourceId: 'r-1', title: 'B', content: 'y' }, deps);
    const r = await listSearchDocumentsUseCase({ tenantId: 't-1' }, deps);
    expect(r.value!.length).toBe(2);
  });

  it('filters by source engine', async () => {
    await buildSearchDocumentUseCase({ tenantId: 't-1', correlationId: 'c-1', actorId: 'a', sourceEngine: 'catalog', sourceType: 'item', sourceId: 'i-1', title: 'A', content: 'x' }, deps);
    await buildSearchDocumentUseCase({ tenantId: 't-1', correlationId: 'c-2', actorId: 'a', sourceEngine: 'review', sourceType: 'review', sourceId: 'r-1', title: 'B', content: 'y' }, deps);
    const r = await listSearchDocumentsUseCase({ tenantId: 't-1', sourceEngine: 'catalog' }, deps);
    expect(r.value!.length).toBe(1);
  });

  it('reindexes a projection to search doc', async () => {
    const pid = await createProjection(deps);
    await processEventUseCase({
      tenantId: 't-1', correlationId: 'c-2', actorId: 'a', projectionId: pid,
      event: { eventId: 'e-1', engine: 'booking', eventType: 'booking.created', aggregateId: 'b-1', tenantId: 't-1', payload: { x: 1 }, occurredAt: new Date().toISOString(), position: 0 },
    }, deps);
    const r = await reindexProjectionUseCase({ tenantId: 't-1', correlationId: 'c-3', actorId: 'a', projectionId: pid }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.reindexed).toBe(1);
  });

  it('emits search.document.created event', async () => {
    await buildSearchDocumentUseCase({ tenantId: 't-1', correlationId: 'c-1', actorId: 'a', sourceEngine: 'catalog', sourceType: 'item', sourceId: 'i-1', title: 'A', content: 'x' }, deps);
    expect(deps.eventBus.countByType('search.document.created')).toBe(1);
  });
});

// ═══════════════════════════════════════════
// 7. AI Context (6 tests)
// ═══════════════════════════════════════════
describe('AI Context', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('builds AI context', async () => {
    const r = await buildAIContextUseCase({
      tenantId: 't-1', correlationId: 'c-1', actorId: 'a',
      contextType: 'customer', targetRef: 'cust-1',
      summary: 'Active customer with 5 bookings', facts: { bookings: 5, reviews: 3 },
      sentiment: 0.8, riskLevel: 'low',
    }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.version).toBe(1);
  });

  it('upserts existing AI context', async () => {
    await buildAIContextUseCase({ tenantId: 't-1', correlationId: 'c-1', actorId: 'a', contextType: 'customer', targetRef: 'c-1', summary: 'v1', facts: {} }, deps);
    const r = await buildAIContextUseCase({ tenantId: 't-1', correlationId: 'c-2', actorId: 'a', contextType: 'customer', targetRef: 'c-1', summary: 'v2', facts: { updated: true } }, deps);
    expect(r.value!.version).toBe(2);
  });

  it('gets AI context by target', async () => {
    await buildAIContextUseCase({ tenantId: 't-1', correlationId: 'c-1', actorId: 'a', contextType: 'customer', targetRef: 'c-1', summary: 'test', facts: {} }, deps);
    const r = await getAIContextUseCase({ tenantId: 't-1', contextType: 'customer', targetRef: 'c-1' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.summary).toBe('test');
  });

  it('rebuilds AI context from projection', async () => {
    const pid = await createProjection(deps);
    await processEventUseCase({
      tenantId: 't-1', correlationId: 'c-2', actorId: 'a', projectionId: pid,
      event: { eventId: 'e-1', engine: 'booking', eventType: 'booking.created', aggregateId: 'b-1', tenantId: 't-1', payload: {}, occurredAt: new Date().toISOString(), position: 0 },
    }, deps);
    const r = await rebuildAIContextUseCase({ tenantId: 't-1', correlationId: 'c-3', actorId: 'a', projectionId: pid }, deps);
    expect(r.ok).toBe(true);
  });

  it('emits ai.context.updated event', async () => {
    await buildAIContextUseCase({ tenantId: 't-1', correlationId: 'c-1', actorId: 'a', contextType: 'customer', targetRef: 'c-1', summary: 'test', facts: {} }, deps);
    expect(deps.eventBus.countByType('ai.context.updated')).toBe(1);
  });

  it('returns null for unknown AI context', async () => {
    const r = await getAIContextUseCase({ tenantId: 't-1', contextType: 'unknown', targetRef: 'x' }, deps);
    expect(r.value).toBeNull();
  });
});

// ═══════════════════════════════════════════
// 8. Analytics (6 tests)
// ═══════════════════════════════════════════
describe('Analytics', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('getMetrics returns null when empty', async () => {
    const r = await getMetricsUseCase({ tenantId: 't-1', type: 'sales' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value).toBeNull();
  });

  it('getMetrics returns stored metrics', async () => {
    const id = deps.idGenerator.generate();
    await deps.analyticsRepo.insert({
      id, tenantId: 't-1', type: 'sales', targetRef: null,
      count: 100, sum: 50000, average: 500,
      distribution: {}, trend: [{ period: '2026-07', value: 50000 }],
      growth: 15, period: 'monthly', computedAt: new Date().toISOString(),
    });
    const r = await getMetricsUseCase({ tenantId: 't-1', type: 'sales' }, deps);
    expect(r.value!.count).toBe(100);
  });

  it('getStatistics aggregates multiple metrics', async () => {
    for (let i = 0; i < 3; i++) {
      await deps.analyticsRepo.insert({
        id: deps.idGenerator.generate(), tenantId: 't-1', type: 'sales', targetRef: null,
        count: 10, sum: 1000, average: 100,
        distribution: {}, trend: [], growth: 0, period: 'daily', computedAt: new Date().toISOString(),
      });
    }
    const r = await getStatisticsUseCase({ tenantId: 't-1', type: 'sales' }, deps);
    expect(r.value!.count).toBe(30);
    expect(r.value!.sum).toBe(3000);
  });

  it('getTrend returns combined trends', async () => {
    await deps.analyticsRepo.insert({
      id: deps.idGenerator.generate(), tenantId: 't-1', type: 'sales', targetRef: null,
      count: 1, sum: 100, average: 100,
      distribution: {}, trend: [{ period: 'd1', value: 100 }], growth: 0, period: 'daily', computedAt: new Date().toISOString(),
    });
    const r = await getTrendUseCase({ tenantId: 't-1', type: 'sales' }, deps);
    expect(r.value!.length).toBe(1);
  });

  it('getTopEntities returns ranked entities', async () => {
    await deps.analyticsRepo.insert({ id: deps.idGenerator.generate(), tenantId: 't-1', type: 'sales', targetRef: 'a', count: 1, sum: 500, average: 500, distribution: {}, trend: [], growth: 0, period: 'all', computedAt: new Date().toISOString() });
    await deps.analyticsRepo.insert({ id: deps.idGenerator.generate(), tenantId: 't-1', type: 'sales', targetRef: 'b', count: 1, sum: 1000, average: 1000, distribution: {}, trend: [], growth: 0, period: 'all', computedAt: new Date().toISOString() });
    const r = await getTopEntitiesUseCase({ tenantId: 't-1', type: 'sales' }, deps);
    expect(r.value!.length).toBe(2);
    expect(r.value![0]!.targetRef).toBe('b'); // higher score first
  });

  it('getTopEntities respects limit', async () => {
    for (let i = 0; i < 5; i++) {
      await deps.analyticsRepo.insert({ id: deps.idGenerator.generate(), tenantId: 't-1', type: 'sales', targetRef: `e-${i}`, count: 1, sum: i * 100, average: i * 100, distribution: {}, trend: [], growth: 0, period: 'all', computedAt: new Date().toISOString() });
    }
    const r = await getTopEntitiesUseCase({ tenantId: 't-1', type: 'sales', limit: 3 }, deps);
    expect(r.value!.length).toBe(3);
  });
});

// ═══════════════════════════════════════════
// 9. Audit (4 tests)
// ═══════════════════════════════════════════
describe('Audit', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('records audit for projection creation', async () => {
    await createProjection(deps);
    const audit = await deps.auditRepo.findByTenant('t-1');
    expect(audit.length).toBe(1);
    expect(audit[0]!.eventType).toBe('projection_created');
  });

  it('records audit for rebuild', async () => {
    const pid = await createProjection(deps);
    await rebuildProjectionUseCase({ tenantId: 't-1', correlationId: 'c-2', actorId: 'a', projectionId: pid }, deps);
    const audit = await deps.auditRepo.findByProjection('t-1', pid);
    expect(audit.some((a) => a.eventType === 'projection_rebuilt')).toBe(true);
  });

  it('records audit for dashboard update', async () => {
    await getCustomerDashboardUseCase({ tenantId: 't-1', correlationId: 'c-1', targetRef: 'c-1' }, deps);
    const audit = await deps.auditRepo.findByTenant('t-1');
    expect(audit.some((a) => a.eventType === 'dashboard_updated')).toBe(true);
  });

  it('records audit for archive', async () => {
    const pid = await createProjection(deps);
    await archiveProjectionUseCase({ tenantId: 't-1', correlationId: 'c-2', actorId: 'a', projectionId: pid }, deps);
    const audit = await deps.auditRepo.findByProjection('t-1', pid);
    expect(audit.some((a) => a.eventType === 'projection_archived')).toBe(true);
  });
});
