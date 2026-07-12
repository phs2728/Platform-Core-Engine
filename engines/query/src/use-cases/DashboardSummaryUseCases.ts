/**
 * Dashboard + Summary + Timeline UseCases (13) —
 *   getCustomerDashboard / getOrganizationDashboard / getSalesDashboard / getOperationsDashboard +
 *   getBookingSummary / getOrderSummary / getPaymentSummary / getReviewSummary / getInventorySummary +
 *   getActivityTimeline / getAuditTimeline + recordTimelineEvent + getDashboard
 */
import {
  Ok, Err, type Result,
  ValidationError, NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';
import { recordQueryAudit } from '../domain/audit.js';
import { getDashboardSchema, getSummarySchema, getTimelineSchema } from '../domain/validation.js';
import { emitQueryEvent } from '../domain/events.js';
import type { QueryUseCaseDeps } from './types.js';
import type { Dashboard, DashboardWidget, Summary, TimelineEntry, TimelineType } from '../interfaces/index.js';

// helper: build dashboard widgets from projections
function buildWidgets(type: string, targetRef: string): DashboardWidget[] {
  const widgets: DashboardWidget[] = [];
  const baseId = `${type}_${targetRef}`;

  if (type === 'customer') {
    widgets.push({ id: `${baseId}_bookings`, name: 'Recent Bookings', type: 'list', data: {}, displayOrder: 0 });
    widgets.push({ id: `${baseId}_orders`, name: 'Recent Orders', type: 'list', data: {}, displayOrder: 1 });
    widgets.push({ id: `${baseId}_payments`, name: 'Payment History', type: 'list', data: {}, displayOrder: 2 });
    widgets.push({ id: `${baseId}_reviews`, name: 'My Reviews', type: 'list', data: {}, displayOrder: 3 });
    widgets.push({ id: `${baseId}_notifications`, name: 'Notifications', type: 'list', data: {}, displayOrder: 4 });
  } else if (type === 'organization') {
    widgets.push({ id: `${baseId}_revenue`, name: 'Revenue', type: 'metric', data: { total: 0 }, displayOrder: 0 });
    widgets.push({ id: `${baseId}_bookings`, name: 'Bookings', type: 'metric', data: { total: 0 }, displayOrder: 1 });
    widgets.push({ id: `${baseId}_inventory`, name: 'Inventory Status', type: 'metric', data: {}, displayOrder: 2 });
    widgets.push({ id: `${baseId}_orders`, name: 'Orders', type: 'metric', data: { total: 0 }, displayOrder: 3 });
    widgets.push({ id: `${baseId}_reviews`, name: 'Reviews', type: 'metric', data: { average: 0 }, displayOrder: 4 });
    widgets.push({ id: `${baseId}_members`, name: 'Members', type: 'list', data: {}, displayOrder: 5 });
  } else if (type === 'sales') {
    widgets.push({ id: `${baseId}_revenue`, name: 'Revenue', type: 'metric', data: { total: 0 }, displayOrder: 0 });
    widgets.push({ id: `${baseId}_growth`, name: 'Growth Rate', type: 'metric', data: { percentage: 0 }, displayOrder: 1 });
    widgets.push({ id: `${baseId}_top_products`, name: 'Top Items', type: 'list', data: {}, displayOrder: 2 });
    widgets.push({ id: `${baseId}_conversion`, name: 'Conversion Rate', type: 'metric', data: { percentage: 0 }, displayOrder: 3 });
    widgets.push({ id: `${baseId}_refunds`, name: 'Refunds', type: 'metric', data: { total: 0 }, displayOrder: 4 });
  } else if (type === 'operations') {
    widgets.push({ id: `${baseId}_active_flows`, name: 'Active Workflows', type: 'metric', data: { count: 0 }, displayOrder: 0 });
    widgets.push({ id: `${baseId}_alerts`, name: 'System Alerts', type: 'list', data: {}, displayOrder: 1 });
    widgets.push({ id: `${baseId}_health`, name: 'Platform Health', type: 'metric', data: { score: 0 }, displayOrder: 2 });
  }

  return widgets;
}

// ═══════════════════════════════════════════
// DASHBOARD (5)
// ═══════════════════════════════════════════

async function getOrCreateDashboard(
  tenantId: string, type: string, targetRef: string,
  deps: QueryUseCaseDeps, correlationId: string,
): Promise<Dashboard> {
  const existing = await deps.dashboardRepo.findByTypeAndTarget(tenantId, type as 'customer', targetRef);
  if (existing) return existing;

  const did = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const dashboard: Dashboard = {
    id: did, tenantId, type: type as 'customer',
    targetRef, title: `${type} Dashboard`,
    widgets: buildWidgets(type, targetRef), computedAt: now,
  };
  await deps.dashboardRepo.insert(dashboard);

  const env: EventEnvelope<{ dashboardId: string; type: string }> =
    await emitQueryEvent(deps, { aggregateId: did, tenantId, correlationId },
      'dashboard.updated', 'dashboard.updated.v1', { dashboardId: did, type });
  await deps.eventBus.emit(env);

  await recordQueryAudit(deps.auditRepo, {
    tenantId, dashboardId: did, actorId: 'system', correlationId,
    eventType: 'dashboard_updated', metadata: { type, targetRef },
  });

  return dashboard;
}

export async function getCustomerDashboardUseCase(
  input: { tenantId: string; correlationId: string; targetRef: string }, deps: QueryUseCaseDeps,
): Promise<Result<Dashboard, ValidationError>> {
  return Ok(await getOrCreateDashboard(input.tenantId, 'customer', input.targetRef, deps, input.correlationId));
}

export async function getOrganizationDashboardUseCase(
  input: { tenantId: string; correlationId: string; targetRef: string }, deps: QueryUseCaseDeps,
): Promise<Result<Dashboard, ValidationError>> {
  return Ok(await getOrCreateDashboard(input.tenantId, 'organization', input.targetRef, deps, input.correlationId));
}

export async function getSalesDashboardUseCase(
  input: { tenantId: string; correlationId: string; targetRef: string }, deps: QueryUseCaseDeps,
): Promise<Result<Dashboard, ValidationError>> {
  return Ok(await getOrCreateDashboard(input.tenantId, 'sales', input.targetRef, deps, input.correlationId));
}

export async function getOperationsDashboardUseCase(
  input: { tenantId: string; correlationId: string; targetRef: string }, deps: QueryUseCaseDeps,
): Promise<Result<Dashboard, ValidationError>> {
  return Ok(await getOrCreateDashboard(input.tenantId, 'operations', input.targetRef, deps, input.correlationId));
}

export async function getDashboardUseCase(
  input: { tenantId: string; type: string; targetRef: string }, deps: QueryUseCaseDeps,
): Promise<Result<Dashboard, ValidationError | NotFoundError>> {
  const v = getDashboardSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const dash = await deps.dashboardRepo.findByTypeAndTarget(d.tenantId, d.type, d.targetRef);
  if (!dash) return Err(new NotFoundError('Dashboard not found'));
  return Ok(dash);
}

// ═══════════════════════════════════════════
// SUMMARY (5)
// ═══════════════════════════════════════════

async function getOrCreateSummary(
  tenantId: string, type: string, targetRef: string | null,
  deps: QueryUseCaseDeps, correlationId: string,
): Promise<Summary> {
  const existing = await deps.summaryRepo.findByType(tenantId, type as 'booking', targetRef ?? undefined);
  if (existing) return existing;

  const sid = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const summary: Summary = {
    id: sid, tenantId, type: type as 'booking',
    targetRef: targetRef ?? null,
    metrics: { total: 0, pending: 0, completed: 0, cancelled: 0 },
    breakdown: {}, period: 'all', computedAt: now,
  };
  await deps.summaryRepo.insert(summary);

  const env: EventEnvelope<{ summaryId: string; type: string }> =
    await emitQueryEvent(deps, { aggregateId: sid, tenantId, correlationId },
      'summary.updated', 'summary.updated.v1', { summaryId: sid, type });
  await deps.eventBus.emit(env);

  return summary;
}

export async function getBookingSummaryUseCase(
  input: { tenantId: string; correlationId: string; targetRef?: string }, deps: QueryUseCaseDeps,
): Promise<Result<Summary, ValidationError>> {
  return Ok(await getOrCreateSummary(input.tenantId, 'booking', input.targetRef ?? null, deps, input.correlationId));
}

export async function getOrderSummaryUseCase(
  input: { tenantId: string; correlationId: string; targetRef?: string }, deps: QueryUseCaseDeps,
): Promise<Result<Summary, ValidationError>> {
  return Ok(await getOrCreateSummary(input.tenantId, 'order', input.targetRef ?? null, deps, input.correlationId));
}

export async function getPaymentSummaryUseCase(
  input: { tenantId: string; correlationId: string; targetRef?: string }, deps: QueryUseCaseDeps,
): Promise<Result<Summary, ValidationError>> {
  return Ok(await getOrCreateSummary(input.tenantId, 'payment', input.targetRef ?? null, deps, input.correlationId));
}

export async function getReviewSummaryUseCase(
  input: { tenantId: string; correlationId: string; targetRef?: string }, deps: QueryUseCaseDeps,
): Promise<Result<Summary, ValidationError>> {
  return Ok(await getOrCreateSummary(input.tenantId, 'review', input.targetRef ?? null, deps, input.correlationId));
}

export async function getInventorySummaryUseCase(
  input: { tenantId: string; correlationId: string; targetRef?: string }, deps: QueryUseCaseDeps,
): Promise<Result<Summary, ValidationError>> {
  return Ok(await getOrCreateSummary(input.tenantId, 'inventory', input.targetRef ?? null, deps, input.correlationId));
}

// ═══════════════════════════════════════════
// TIMELINE (3)
// ═══════════════════════════════════════════

export async function getActivityTimelineUseCase(
  input: { tenantId: string; limit?: number }, deps: QueryUseCaseDeps,
): Promise<Result<TimelineEntry[], ValidationError>> {
  return Ok(await deps.timelineRepo.findByTenant(input.tenantId, 'activity', input.limit));
}

export async function getAuditTimelineUseCase(
  input: { tenantId: string; limit?: number }, deps: QueryUseCaseDeps,
): Promise<Result<TimelineEntry[], ValidationError>> {
  return Ok(await deps.timelineRepo.findByTenant(input.tenantId, 'audit', input.limit));
}

export async function getTimelineUseCase(
  input: { tenantId: string; type?: TimelineType; aggregateId?: string; limit?: number },
  deps: QueryUseCaseDeps,
): Promise<Result<TimelineEntry[], ValidationError>> {
  const v = getTimelineSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  if (d.aggregateId !== undefined) {
    return Ok(await deps.timelineRepo.findByAggregate(d.tenantId, d.aggregateId, d.limit));
  }
  return Ok(await deps.timelineRepo.findByTenant(d.tenantId, d.type, d.limit));
}

/** Record a timeline entry from an event (used by event handler). */
export async function recordTimelineEntryUseCase(
  input: {
    tenantId: string; type: TimelineType;
    aggregateId: string; aggregateType: string;
    eventType: string; description: string; actorId: string;
    metadata?: Record<string, unknown>;
  },
  deps: QueryUseCaseDeps,
): Promise<Result<TimelineEntry, ValidationError>> {
  const id = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const entry: TimelineEntry = {
    id, tenantId: input.tenantId, type: input.type,
    aggregateId: input.aggregateId, aggregateType: input.aggregateType,
    eventType: input.eventType, description: input.description,
    actorId: input.actorId, metadata: input.metadata ?? {}, timestamp: now,
  };
  await deps.timelineRepo.insert(entry);

  const env: EventEnvelope<{ entryId: string; type: string }> =
    await emitQueryEvent(deps, { aggregateId: id, tenantId: input.tenantId, correlationId: 'timeline' },
      'timeline.updated', 'timeline.updated.v1', { entryId: id, type: input.type });
  await deps.eventBus.emit(env);

  return Ok(entry);
}
