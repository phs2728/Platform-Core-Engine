/**
 * Query Engine (Projection Engine) — Public Interfaces
 *
 * 사장님 확립 (2026-07-11) Phase 6 — CQRS Read Model Engine.
 *
 * NOT a CRUD engine. Consumes events from all engines via IEventFeedProvider
 * and builds read-only projections (dashboards, summaries, timelines,
 * search documents, AI context).
 *
 * Architecturally distinct:
 *   - No domain writes (no create/update/delete of business entities)
 *   - Consumes events via IEventFeedProvider host adapter
 *   - Builds projections incrementally (event-driven) or via full rebuild
 *   - Provides query APIs for dashboards, summaries, timelines, search feeds, AI feeds
 *
 * Acceptance: if you delete this engine, ALL dashboards, read models,
 * projections, analytics views, search index feeds, and AI context
 * feeds disappear.
 */

import type { Result, EventEnvelope } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Core Infra (모든 Engine 공통)
// ═══════════════════════════════════════════

export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IEventBus { emit<T>(envelope: EventEnvelope<T>): Promise<void>; }

// ═══════════════════════════════════════════
// Host Interfaces (3-Layer DI)
// ═══════════════════════════════════════════

/**
 * Event Feed Provider — supplies events for projection building.
 * The host wires this to the actual Event Bus or event store.
 * This engine NEVER directly subscribes to other engines.
 */
export interface IEventFeedProvider {
  /** Get events since a checkpoint position. */
  getEventsSince(engine: string, position: number, limit: number): Promise<FeedEvent[]>;

  /** Get all events for a specific aggregate. */
  getEventsByAggregate(engine: string, aggregateId: string): Promise<FeedEvent[]>;

  /** Get total event count per engine. */
  getEventCount(engine: string): Promise<number>;

  /** Subscribe to real-time events (for incremental projection). */
  subscribe(handler: (event: FeedEvent) => Promise<void>): void;
}

/**
 * Feed Event — flattened copy of an EventEnvelope (NOT the original).
 */
export interface FeedEvent {
  eventId: string;
  engine: string;
  eventType: string;
  aggregateId: string;
  tenantId: string;
  payload: Record<string, unknown>;
  occurredAt: string;
  position: number;              // sequential position in the event stream
}

/**
 * Data Provider — optional read-only access to engine state for enrichment.
 * Used during full rebuilds when events alone are insufficient.
 */
export interface IDataProvider {
  /** Query an engine for current entity state (read-only). */
  query(engineId: string, queryName: string, params: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>>;

  /** Check if data provider supports an engine. */
  supports(engineId: string): boolean;
}

/**
 * Custom Data Policy — projection configuration validation.
 */
export interface ICustomDataPolicyProvider {
  validateAttributes(
    tenantId: string,
    type: string,
    attributes: Record<string, unknown>,
  ): Promise<Result<Record<string, unknown>, Error>>;

  getAllowedProjectionTypes(tenantId: string): Promise<readonly string[]>;
  getMaxProjectionsPerTenant(tenantId: string): Promise<number>;
  getDefaultRefreshIntervalMs(tenantId: string): Promise<number>;
}

// ═══════════════════════════════════════════
// Value Objects & Enums
// ═══════════════════════════════════════════

export type ProjectionType =
  | 'realtime'      // event-driven, immediate
  | 'scheduled'     // periodic refresh
  | 'snapshot'      // point-in-time snapshot
  | 'incremental'   // delta from last checkpoint
  | 'full_rebuild'; // complete rebuild from scratch

export type ProjectionStatus =
  | 'Building'
  | 'Ready'
  | 'Stale'
  | 'Failed'
  | 'Archived';

export type DashboardType =
  | 'customer'
  | 'organization'
  | 'sales'
  | 'operations';

export type SummaryType =
  | 'booking'
  | 'order'
  | 'payment'
  | 'review'
  | 'inventory'
  | 'catalog';

export type TimelineType =
  | 'activity'
  | 'audit'
  | 'booking'
  | 'payment'
  | 'review';

export type FeedType = 'search' | 'ai';

// ═══════════════════════════════════════════
// Core Entities
// ═══════════════════════════════════════════

/**
 * Projection — a materialized read model built from events.
 */
export interface Projection {
  id: string;
  tenantId: string;
  name: string;
  type: ProjectionType;
  status: ProjectionStatus;
  sourceEngine: string;          // which engine's events feed this projection
  sourceEventTypes: string[];    // which event types to consume
  targetType: string;            // what kind of view (e.g. 'customer_dashboard', 'booking_summary')
  targetRef: string;             // aggregate ref this projection is for
  data: Record<string, unknown>; // the materialized read model data
  version: number;               // projection version (incremented on each update)
  checkpoint: number;            // last event position processed
  eventCount: number;            // total events processed
  lastEventAt: string | null;    // timestamp of last processed event
  lastBuildAt: string | null;    // last rebuild timestamp
  lastError: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Dashboard — aggregated view for a specific persona.
 */
export interface Dashboard {
  id: string;
  tenantId: string;
  type: DashboardType;
  targetRef: string;             // customer ID, org ID, etc.
  title: string;
  widgets: DashboardWidget[];
  computedAt: string;
}

export interface DashboardWidget {
  id: string;
  name: string;
  type: string;                  // 'metric' | 'chart' | 'list' | 'timeline'
  data: Record<string, unknown>;
  displayOrder: number;
}

/**
 * Summary — aggregated metrics for a domain.
 */
export interface Summary {
  id: string;
  tenantId: string;
  type: SummaryType;
  targetRef: string | null;      // null = tenant-wide
  metrics: Record<string, number>;
  breakdown: Record<string, unknown>;
  period: string;                // 'daily' | 'weekly' | 'monthly' | 'all'
  computedAt: string;
}

/**
 * TimelineEntry — a single entry in an activity/audit timeline.
 */
export interface TimelineEntry {
  id: string;
  tenantId: string;
  type: TimelineType;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  description: string;
  actorId: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

/**
 * SearchDocument — projection document for Search Engine consumption.
 */
export interface SearchDocument {
  id: string;
  tenantId: string;
  sourceEngine: string;
  sourceType: string;            // 'catalog_item' | 'organization' | 'review' | etc.
  sourceId: string;              // original entity ID
  title: string;
  content: string;
  keywords: string[];
  tags: string[];
  metadata: Record<string, unknown>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * AIContext — context document for AI Engine consumption.
 */
export interface AIContext {
  id: string;
  tenantId: string;
  contextType: string;           // 'customer' | 'organization' | 'booking' | etc.
  targetRef: string;
  summary: string;
  facts: Record<string, unknown>;
  sentiment: number | null;      // -1 to 1
  riskLevel: string | null;
  metadata: Record<string, unknown>;
  version: number;
  computedAt: string;
}

/**
 * Checkpoint — tracks projection processing position per engine.
 */
export interface Checkpoint {
  id: string;
  tenantId: string;
  projectionId: string;
  engine: string;
  position: number;
  eventCount: number;
  updatedAt: string;
}

/**
 * AnalyticsMetrics — computed analytics for a period.
 */
export interface AnalyticsMetrics {
  id: string;
  tenantId: string;
  type: string;                  // 'sales' | 'activity' | 'engagement' | etc.
  targetRef: string | null;
  count: number;
  sum: number;
  average: number;
  distribution: Record<string, number>;
  trend: { period: string; value: number }[];
  growth: number;                // percentage change
  period: string;
  computedAt: string;
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export type QueryAuditEventType =
  | 'projection_created'
  | 'projection_rebuilt'
  | 'projection_refreshed'
  | 'projection_archived'
  | 'projection_failed'
  | 'dashboard_updated'
  | 'summary_updated'
  | 'timeline_updated'
  | 'analytics_updated'
  | 'search_document_created'
  | 'ai_context_updated';

export interface QueryAuditRecord {
  id: string;
  tenantId: string;
  projectionId?: string;
  dashboardId?: string;
  summaryId?: string;
  actorId: string;
  correlationId: string;
  eventType: QueryAuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Search
// ═══════════════════════════════════════════

export interface ProjectionSearchCriteria {
  tenantId: string;
  sourceEngine?: string;
  targetType?: string;
  status?: ProjectionStatus;
  type?: ProjectionType;
  limit?: number;
  offset?: number;
}

export interface ProjectionSearchResult {
  projections: Projection[];
  total: number;
  limit: number;
  offset: number;
}

// ═══════════════════════════════════════════
// Repositories
// ═══════════════════════════════════════════

export interface IProjectionRepository {
  insert(p: Projection): Promise<void>;
  findById(tenantId: string, id: string): Promise<Projection | null>;
  findByTarget(tenantId: string, targetType: string, targetRef: string): Promise<Projection | null>;
  findByType(tenantId: string, targetType: string): Promise<Projection[]>;
  update(tenantId: string, id: string, patch: Partial<Projection>): Promise<void>;
  search(criteria: ProjectionSearchCriteria): Promise<ProjectionSearchResult>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface IDashboardRepository {
  insert(d: Dashboard): Promise<void>;
  findById(tenantId: string, id: string): Promise<Dashboard | null>;
  findByTypeAndTarget(tenantId: string, type: DashboardType, targetRef: string): Promise<Dashboard | null>;
  update(tenantId: string, id: string, patch: Partial<Dashboard>): Promise<void>;
  listByTenant(tenantId: string, limit?: number): Promise<Dashboard[]>;
}

export interface ISummaryRepository {
  insert(s: Summary): Promise<void>;
  findById(tenantId: string, id: string): Promise<Summary | null>;
  findByType(tenantId: string, type: SummaryType, targetRef?: string): Promise<Summary | null>;
  update(tenantId: string, id: string, patch: Partial<Summary>): Promise<void>;
  listByType(tenantId: string, type: SummaryType, limit?: number): Promise<Summary[]>;
}

export interface ITimelineRepository {
  insert(entry: TimelineEntry): Promise<void>;
  findByTenant(tenantId: string, type?: TimelineType, limit?: number): Promise<TimelineEntry[]>;
  findByAggregate(tenantId: string, aggregateId: string, limit?: number): Promise<TimelineEntry[]>;
}

export interface IAnalyticsRepository {
  insert(m: AnalyticsMetrics): Promise<void>;
  findById(tenantId: string, id: string): Promise<AnalyticsMetrics | null>;
  findByType(tenantId: string, type: string, limit?: number): Promise<AnalyticsMetrics[]>;
}

export interface ISearchFeedRepository {
  insert(doc: SearchDocument): Promise<void>;
  findById(tenantId: string, id: string): Promise<SearchDocument | null>;
  findBySource(tenantId: string, sourceEngine: string, sourceId: string): Promise<SearchDocument | null>;
  update(tenantId: string, id: string, patch: Partial<SearchDocument>): Promise<void>;
  listByTenant(tenantId: string, limit?: number): Promise<SearchDocument[]>;
  listBySource(tenantId: string, sourceEngine: string, limit?: number): Promise<SearchDocument[]>;
}

export interface IAIContextRepository {
  insert(ctx: AIContext): Promise<void>;
  findById(tenantId: string, id: string): Promise<AIContext | null>;
  findByTarget(tenantId: string, contextType: string, targetRef: string): Promise<AIContext | null>;
  update(tenantId: string, id: string, patch: Partial<AIContext>): Promise<void>;
  listByTenant(tenantId: string, limit?: number): Promise<AIContext[]>;
}

export interface ICheckpointRepository {
  insert(c: Checkpoint): Promise<void>;
  findByProjection(tenantId: string, projectionId: string, engine: string): Promise<Checkpoint | null>;
  update(tenantId: string, id: string, patch: Partial<Checkpoint>): Promise<void>;
}

export interface IQueryAuditRepository {
  insert(record: Omit<QueryAuditRecord, 'id' | 'createdAt'>): Promise<QueryAuditRecord>;
  findByTenant(tenantId: string, limit?: number): Promise<QueryAuditRecord[]>;
  findByProjection(tenantId: string, projectionId: string, limit?: number): Promise<QueryAuditRecord[]>;
}

export { type Result, type EventEnvelope };
