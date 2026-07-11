/**
 * Order Engine — Public Interfaces
 *
 * 사장님 확립 (2026-07-11) Phase 5 — Transaction Lifecycle Engine.
 * 10-state machine: Draft→Submitted→Approved→Confirmed→InProgress→Completed→Closed
 *                    (+ Cancelled / Rejected / Expired)
 */

import type { Result, EventEnvelope } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Core Infra
// ═══════════════════════════════════════════

export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IEventBus { emit<T>(envelope: EventEnvelope<T>): Promise<void>; }

// ═══════════════════════════════════════════
// Host Interfaces (3-Layer DI)
// ═══════════════════════════════════════════

export interface IOrganizationVerifier {
  verify(tenantId: string, organizationId: string): Promise<boolean>;
}

export interface ICustomDataPolicyProvider {
  validateAttributes(tenantId: string, type: string, attributes: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>>;
  getAllowedOrderTypes(tenantId: string): Promise<readonly string[]>;
  getMaxOrdersPerOrg(tenantId: string): Promise<number>;
  getDefaultExpirySeconds(tenantId: string): Promise<number>;
  requiresApproval(tenantId: string, orderType: string): Promise<boolean>;
}

// ═══════════════════════════════════════════
// Value Objects
// ═══════════════════════════════════════════

export type OrderStatus =
  | 'Draft' | 'Submitted' | 'Approved' | 'Confirmed'
  | 'InProgress' | 'Completed' | 'Closed'
  | 'Cancelled' | 'Rejected' | 'Expired';

export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected';

export type TimelineEventType =
  | 'created' | 'updated' | 'submitted' | 'approved' | 'rejected' | 'confirmed'
  | 'in_progress' | 'completed' | 'closed' | 'cancelled' | 'expired'
  | 'item_added' | 'item_removed' | 'item_updated'
  | 'reference_attached' | 'approval_requested' | 'approval_approved' | 'approval_rejected'
  | 'note_added';

export interface OrderReference {
  refType: string;       // free-form ref type (booking/inventory/catalog/pricing/etc.)
  refId: string;
  metadata: Record<string, unknown>;
}

// ═══════════════════════════════════════════
// Core Entities
// ═══════════════════════════════════════════

export interface OrderItem {
  id: string;
  tenantId: string;
  orderId: string;
  lineNo: number;
  resourceType: string;     // 'catalog_item' | 'inventory_item' | 'service' | etc.
  resourceId: string;
  name: string;
  quantity: number;
  unit: string;
  pricingRefId: string | null;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  tenantId: string;
  organizationId: string;
  orderNumber: string;
  status: OrderStatus;
  type: string;
  title: string;
  description?: string;

  itemIds: string[];
  references: OrderReference[];

  // Approval
  approvalStatus: ApprovalStatus;
  requiresApprovalFlag: boolean;

  attributes: Record<string, unknown>;
  customFields: Record<string, unknown>;
  metadata: Record<string, unknown>;
  tags: string[];

  // Lifecycle timestamps
  submittedAt: string | null;
  approvedAt: string | null;
  confirmedAt: string | null;
  inProgressAt: string | null;
  completedAt: string | null;
  closedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  rejectedAt: string | null;
  rejectedReason: string | null;
  expiredAt: string | null;

  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  archivedAt: string | null;
}

export interface OrderApproval {
  id: string;
  tenantId: string;
  orderId: string;
  approverId: string;
  status: ApprovalStatus;
  reason: string | null;
  attributes: Record<string, unknown>;
  createdAt: string;
  decidedAt: string | null;
}

export interface OrderTimelineEntry {
  id: string;
  tenantId: string;
  orderId: string;
  eventType: TimelineEventType;
  actorId: string;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Search
// ═══════════════════════════════════════════

export interface OrderSearchCriteria {
  tenantId: string;
  organizationId?: string;
  query?: string;
  type?: string;
  status?: OrderStatus;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'orderNumber';
  sortOrder?: 'asc' | 'desc';
}

export interface OrderSearchResult {
  orders: Order[];
  total: number;
  limit: number;
  offset: number;
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export type OrderAuditEventType =
  | 'order_created' | 'order_updated' | 'order_submitted' | 'order_approved'
  | 'order_rejected' | 'order_confirmed' | 'order_in_progress' | 'order_completed'
  | 'order_closed' | 'order_cancelled' | 'order_expired' | 'order_archived' | 'order_restored'
  | 'item_added' | 'item_removed' | 'item_updated'
  | 'reference_attached' | 'approval_requested' | 'approval_approved' | 'approval_rejected'
  | 'timeline_appended';

export interface OrderAuditRecord {
  id: string;
  tenantId: string;
  organizationId: string;
  orderId?: string;
  actorId: string;
  correlationId: string;
  eventType: OrderAuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Repositories
// ═══════════════════════════════════════════

export interface IOrderRepository {
  insert(order: Order): Promise<void>;
  findById(tenantId: string, id: string): Promise<Order | null>;
  findByOrderNumber(tenantId: string, orderNumber: string): Promise<Order | null>;
  update(tenantId: string, id: string, patch: Partial<Order>): Promise<void>;
  search(criteria: OrderSearchCriteria): Promise<OrderSearchResult>;
  countByOrganization(tenantId: string, organizationId: string): Promise<number>;
}

export interface IOrderItemRepository {
  insert(item: OrderItem): Promise<void>;
  findById(tenantId: string, id: string): Promise<OrderItem | null>;
  findByOrder(tenantId: string, orderId: string): Promise<OrderItem[]>;
  update(tenantId: string, id: string, patch: Partial<OrderItem>): Promise<void>;
  remove(tenantId: string, id: string): Promise<void>;
}

export interface IOrderTimelineRepository {
  insert(entry: OrderTimelineEntry): Promise<void>;
  findByOrder(tenantId: string, orderId: string, limit?: number): Promise<OrderTimelineEntry[]>;
}

export interface IOrderApprovalRepository {
  insert(approval: OrderApproval): Promise<void>;
  findById(tenantId: string, id: string): Promise<OrderApproval | null>;
  findByOrder(tenantId: string, orderId: string): Promise<OrderApproval[]>;
  findPendingByOrder(tenantId: string, orderId: string): Promise<OrderApproval | null>;
  update(tenantId: string, id: string, patch: Partial<OrderApproval>): Promise<void>;
}

export interface IOrderAuditRepository {
  insert(record: Omit<OrderAuditRecord, 'id' | 'createdAt'>): Promise<OrderAuditRecord>;
  findByTenant(tenantId: string, limit?: number): Promise<OrderAuditRecord[]>;
  findByOrder(tenantId: string, orderId: string, limit?: number): Promise<OrderAuditRecord[]>;
}

export { type Result, type EventEnvelope };
