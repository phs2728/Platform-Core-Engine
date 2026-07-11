/**
 * Order Engine — Lifecycle + Items + Status + Approval UseCases (20)
 *
 * 10-state machine: Draft→Submitted→Approved→Confirmed→InProgress→Completed→Closed
 *                   (+ Cancelled / Rejected / Expired)
 */

import {
  Ok, Err, type Result,
  ValidationError, ConflictError, NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';
import {
  createOrderSchema, updateOrderSchema, cancelOrderSchema,
  simpleOrderActionSchema, rejectOrderSchema,
  searchOrdersSchema,
  addItemSchema, removeItemSchema, updateItemSchema,
  requestApprovalSchema, approveSchema, rejectApprovalSchema,
} from '../domain/validation.js';
import { validateOrderStatusTransition, isOrderMutable } from '../domain/statusTransition.js';
import type { OrderUseCaseDeps } from './types.js';
import type {
  Order, OrderItem, OrderApproval, OrderStatus, ApprovalStatus,
  OrderSearchCriteria, OrderSearchResult, OrderTimelineEntry, TimelineEventType,
} from '../interfaces/index.js';

function env(deps: OrderUseCaseDeps, agg: string, tenant: string, corr: string, eventType: string, schemaRef: string, payload: unknown): EventEnvelope<unknown> {
  return {
    eventId: deps.idGenerator.generate(), aggregateId: agg, occurredAt: deps.clock.now().toISOString(),
    version: '1.0.0', tenantId: tenant, correlationId: corr, causationId: '',
    engine: 'order', eventType, schemaRef, payload,
  };
}

async function appendTimeline(deps: OrderUseCaseDeps, tenantId: string, orderId: string, actorId: string, eventType: TimelineEventType, description: string, meta?: Record<string, unknown>) {
  const entry: OrderTimelineEntry = {
    id: deps.idGenerator.generate(), tenantId, orderId,
    eventType, actorId, description, metadata: meta ?? {},
    createdAt: deps.clock.now().toISOString(),
  };
  await deps.timelineRepo.insert(entry);
}

async function audit(deps: OrderUseCaseDeps, orgId: string, tenantId: string, actorId: string, corr: string, eventType: string, meta: Record<string, unknown>, orderId?: string) {
  const rec: Record<string, unknown> = { organizationId: orgId, tenantId, actorId, correlationId: corr, eventType, metadata: meta };
  if (orderId !== undefined) rec.orderId = orderId;
  await deps.auditRepo.insert(rec as Parameters<typeof deps.auditRepo.insert>[0]);
}

let orderSeq = 0;
function generateOrderNumber(deps: OrderUseCaseDeps): string {
  orderSeq += 1;
  const date = deps.clock.now().toISOString().slice(0, 10).replace(/-/g, '');
  return `ORD-${date}-${String(orderSeq).padStart(6, '0')}`;
}

async function transitionOrder(
  deps: OrderUseCaseDeps,
  input: { tenantId: string; correlationId: string; actorId: string; orderId: string },
  targetStatus: OrderStatus,
  eventType: TimelineEventType,
  eventKey: string,
  timestampField: keyof Order,
): Promise<Result<Order, ValidationError | NotFoundError | ConflictError>> {
  const ex = await deps.orderRepo.findById(input.tenantId, input.orderId);
  if (!ex) return Err(new NotFoundError('Order not found'));
  const tr = validateOrderStatusTransition(ex.status, targetStatus);
  if (!tr.ok) return Err(new ConflictError(`Invalid transition: ${ex.status} → ${targetStatus}`));

  const now = deps.clock.now().toISOString();
  const patch: Partial<Order> = { status: targetStatus, updatedAt: now, [timestampField]: now } as Partial<Order>;
  await deps.orderRepo.update(input.tenantId, input.orderId, patch);

  const updated = { ...ex, ...patch } as Order;
  await appendTimeline(deps, input.tenantId, input.orderId, input.actorId, eventType, `${targetStatus}`);
  await deps.eventBus.emit(env(deps, input.orderId, input.tenantId, input.correlationId, `order.${eventKey}`, `order.${eventKey}.v1`, { orderId: input.orderId }));
  await audit(deps, ex.organizationId, input.tenantId, input.actorId, input.correlationId, `order_${eventKey}`, {}, input.orderId);
  return Ok(updated);
}

// ════════════════════════════════════════════════════════════════════════════
// ORDER LIFECYCLE (10)
// ════════════════════════════════════════════════════════════════════════════

export interface CreateOrderInput {
  tenantId: string; correlationId: string; actorId: string;
  organizationId: string;
  type: string; title: string;
  description?: string; initialStatus?: OrderStatus;
  attributes?: Record<string, unknown>;
  customFields?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export async function createOrderUseCase(
  input: CreateOrderInput, deps: OrderUseCaseDeps,
): Promise<Result<{ orderId: string; orderNumber: string; createdAt: string }, ValidationError | ConflictError>> {
  const v = createOrderSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));

  const allowedTypes = await deps.policyProvider.getAllowedOrderTypes(d.tenantId);
  if (!allowedTypes.includes(d.type)) return Err(new ValidationError(`type "${d.type}" not allowed`));

  const pr = await deps.policyProvider.validateAttributes(d.tenantId, d.type, d.attributes ?? {});
  if (!pr.ok) return Err(new ValidationError('CustomDataPolicy rejected'));

  const maxO = await deps.policyProvider.getMaxOrdersPerOrg(d.tenantId);
  if (await deps.orderRepo.countByOrganization(d.tenantId, d.organizationId) >= maxO) {
    return Err(new ConflictError(`Max orders (${maxO}) reached`));
  }

  const orderId = deps.idGenerator.generate();
  const orderNumber = generateOrderNumber(deps);
  const now = deps.clock.now().toISOString();
  const requiresApprovalFlag = await deps.policyProvider.requiresApproval(d.tenantId, d.type);

  const order: Order = {
    id: orderId, tenantId: d.tenantId, organizationId: d.organizationId,
    orderNumber, status: d.initialStatus ?? 'Draft', type: d.type, title: d.title,
    itemIds: [], references: [],
    approvalStatus: 'Pending', requiresApprovalFlag,
    attributes: pr.value, customFields: d.customFields ?? {}, metadata: d.metadata ?? {},
    tags: d.tags ?? [],
    submittedAt: null, approvedAt: null, confirmedAt: null, inProgressAt: null,
    completedAt: null, closedAt: null, cancelledAt: null, cancelReason: null,
    rejectedAt: null, rejectedReason: null, expiredAt: null,
    createdAt: now, createdBy: d.actorId, updatedAt: now, updatedBy: d.actorId,
    archivedAt: null,
  };
  if (d.description !== undefined) order.description = d.description;

  await deps.orderRepo.insert(order);
  await appendTimeline(deps, d.tenantId, orderId, d.actorId, 'created', `Order created: ${d.title}`);
  await deps.eventBus.emit(env(deps, orderId, d.tenantId, d.correlationId, 'order.created', 'order.created.v1', { orderId, orderNumber }));
  await audit(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'order_created', { orderNumber }, orderId);
  return Ok({ orderId, orderNumber, createdAt: now });
}

export async function updateOrderUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; orderId: string;
    title?: string; description?: string;
    attributes?: Record<string, unknown>; customFields?: Record<string, unknown>; tags?: string[]; },
  deps: OrderUseCaseDeps,
): Promise<Result<Order, ValidationError | NotFoundError | ConflictError>> {
  const v = updateOrderSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const ex = await deps.orderRepo.findById(d.tenantId, d.orderId);
  if (!ex) return Err(new NotFoundError('Order not found'));
  if (!isOrderMutable(ex.status)) return Err(new ConflictError(`Cannot update (status: ${ex.status})`));

  const now = deps.clock.now().toISOString();
  const patch: Partial<Order> = { updatedAt: now };
  if (d.title !== undefined) patch.title = d.title;
  if (d.description !== undefined) patch.description = d.description;
  if (d.customFields !== undefined) patch.customFields = d.customFields;
  if (d.tags !== undefined) patch.tags = d.tags;
  if (d.attributes !== undefined) {
    const pr = await deps.policyProvider.validateAttributes(d.tenantId, ex.type, d.attributes);
    if (!pr.ok) return Err(new ValidationError('CustomDataPolicy rejected'));
    patch.attributes = pr.value;
  }
  await deps.orderRepo.update(d.tenantId, d.orderId, patch);
  await appendTimeline(deps, d.tenantId, d.orderId, d.actorId, 'updated', 'Order updated');
  await deps.eventBus.emit(env(deps, d.orderId, d.tenantId, d.correlationId, 'order.updated', 'order.updated.v1', { orderId: d.orderId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'order_updated', {}, d.orderId);
  return Ok({ ...ex, ...patch } as Order);
}

export async function cancelOrderUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; orderId: string; reason?: string },
  deps: OrderUseCaseDeps,
): Promise<Result<Order, ValidationError | NotFoundError | ConflictError>> {
  const v = cancelOrderSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.orderRepo.findById(d.tenantId, d.orderId);
  if (!ex) return Err(new NotFoundError('Order not found'));
  const tr = validateOrderStatusTransition(ex.status, 'Cancelled');
  if (!tr.ok) return Err(new ConflictError(`Cannot cancel from ${ex.status}`));

  const now = deps.clock.now().toISOString();
  await deps.orderRepo.update(d.tenantId, d.orderId, {
    status: 'Cancelled', cancelledAt: now, updatedAt: now,
    ...(d.reason !== undefined ? { cancelReason: d.reason } : {}),
  });
  await appendTimeline(deps, d.tenantId, d.orderId, d.actorId, 'cancelled', d.reason ?? 'Cancelled');
  await deps.eventBus.emit(env(deps, d.orderId, d.tenantId, d.correlationId, 'order.cancelled', 'order.cancelled.v1', { orderId: d.orderId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'order_cancelled', { reason: d.reason }, d.orderId);
  return Ok({ ...ex, status: 'Cancelled', cancelledAt: now });
}

export async function approveOrderUseCase(input: { tenantId: string; correlationId: string; actorId: string; orderId: string }, deps: OrderUseCaseDeps) {
  const v = simpleOrderActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  return transitionOrder(deps, input, 'Approved', 'approved', 'approved', 'approvedAt');
}

export async function rejectOrderUseCase(input: { tenantId: string; correlationId: string; actorId: string; orderId: string; reason?: string }, deps: OrderUseCaseDeps) {
  const v = rejectOrderSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.orderRepo.findById(d.tenantId, d.orderId);
  if (!ex) return Err(new NotFoundError('Order not found'));
  const tr = validateOrderStatusTransition(ex.status, 'Rejected');
  if (!tr.ok) return Err(new ConflictError(`Cannot reject from ${ex.status}`));
  const now = deps.clock.now().toISOString();
  await deps.orderRepo.update(d.tenantId, d.orderId, {
    status: 'Rejected', rejectedAt: now, updatedAt: now,
    ...(d.reason !== undefined ? { rejectedReason: d.reason } : {}),
  });
  await appendTimeline(deps, d.tenantId, d.orderId, d.actorId, 'rejected', d.reason ?? 'Rejected');
  await deps.eventBus.emit(env(deps, d.orderId, d.tenantId, d.correlationId, 'order.rejected', 'order.rejected.v1', { orderId: d.orderId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'order_rejected', { reason: d.reason }, d.orderId);
  return Ok({ ...ex, status: 'Rejected', rejectedAt: now });
}

export async function archiveOrderUseCase(input: { tenantId: string; correlationId: string; actorId: string; orderId: string }, deps: OrderUseCaseDeps) {
  const v = simpleOrderActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.orderRepo.findById(d.tenantId, d.orderId);
  if (!ex) return Err(new NotFoundError('Order not found'));
  if (ex.archivedAt !== null) return Err(new ConflictError('Already archived'));
  await deps.orderRepo.update(d.tenantId, d.orderId, { archivedAt: deps.clock.now().toISOString() });
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'order_archived', {}, d.orderId);
  return Ok({ ...ex, archivedAt: deps.clock.now().toISOString() });
}

export async function restoreOrderUseCase(input: { tenantId: string; correlationId: string; actorId: string; orderId: string }, deps: OrderUseCaseDeps) {
  const v = simpleOrderActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.orderRepo.findById(d.tenantId, d.orderId);
  if (!ex) return Err(new NotFoundError('Order not found'));
  if (ex.archivedAt === null) return Err(new ConflictError('Not archived'));
  await deps.orderRepo.update(d.tenantId, d.orderId, { archivedAt: null });
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'order_restored', {}, d.orderId);
  return Ok({ ...ex, archivedAt: null });
}

export async function getOrderUseCase(input: { tenantId: string; orderId: string }, deps: OrderUseCaseDeps): Promise<Result<Order | null, ValidationError>> {
  return Ok(await deps.orderRepo.findById(input.tenantId, input.orderId));
}

export async function searchOrdersUseCase(input: OrderSearchCriteria, deps: OrderUseCaseDeps): Promise<Result<OrderSearchResult, ValidationError>> {
  const v = searchOrdersSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid search'));
  return Ok(await deps.orderRepo.search(v.data as OrderSearchCriteria));
}

export async function listOrdersUseCase(input: { tenantId: string; organizationId: string; limit?: number; offset?: number }, deps: OrderUseCaseDeps): Promise<Result<OrderSearchResult, ValidationError>> {
  return Ok(await deps.orderRepo.search({
    tenantId: input.tenantId, organizationId: input.organizationId,
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
    ...(input.offset !== undefined ? { offset: input.offset } : {}),
  }));
}

// ════════════════════════════════════════════════════════════════════════════
// STATUS TRANSITIONS (4)
// ════════════════════════════════════════════════════════════════════════════

export async function submitOrderUseCase(input: { tenantId: string; correlationId: string; actorId: string; orderId: string }, deps: OrderUseCaseDeps) {
  return transitionOrder(deps, input, 'Submitted', 'submitted', 'submitted', 'submittedAt');
}
export async function confirmOrderUseCase(input: { tenantId: string; correlationId: string; actorId: string; orderId: string }, deps: OrderUseCaseDeps) {
  return transitionOrder(deps, input, 'Confirmed', 'confirmed', 'confirmed', 'confirmedAt');
}
export async function completeOrderUseCase(input: { tenantId: string; correlationId: string; actorId: string; orderId: string }, deps: OrderUseCaseDeps) {
  return transitionOrder(deps, input, 'Completed', 'completed', 'completed', 'completedAt');
}
export async function closeOrderUseCase(input: { tenantId: string; correlationId: string; actorId: string; orderId: string }, deps: OrderUseCaseDeps) {
  return transitionOrder(deps, input, 'Closed', 'closed', 'closed', 'closedAt');
}

// ════════════════════════════════════════════════════════════════════════════
// ITEMS (3)
// ════════════════════════════════════════════════════════════════════════════

export async function addItemUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; orderId: string;
    resourceType: string; resourceId: string; name: string; quantity: number; unit: string;
    pricingRefId?: string | null; attributes?: Record<string, unknown>; },
  deps: OrderUseCaseDeps,
): Promise<Result<OrderItem, ValidationError | NotFoundError | ConflictError>> {
  const v = addItemSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const order = await deps.orderRepo.findById(d.tenantId, d.orderId);
  if (!order) return Err(new NotFoundError('Order not found'));
  if (!isOrderMutable(order.status)) return Err(new ConflictError(`Order not mutable (status: ${order.status})`));

  const items = await deps.itemRepo.findByOrder(d.tenantId, d.orderId);
  const lineNo = items.length + 1;
  const itemId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const item: OrderItem = {
    id: itemId, tenantId: d.tenantId, orderId: d.orderId, lineNo,
    resourceType: d.resourceType, resourceId: d.resourceId,
    name: d.name, quantity: d.quantity, unit: d.unit,
    pricingRefId: d.pricingRefId ?? null,
    attributes: d.attributes ?? {}, createdAt: now, updatedAt: now,
  };
  await deps.itemRepo.insert(item);
  await deps.orderRepo.update(d.tenantId, d.orderId, { itemIds: [...order.itemIds, itemId], updatedAt: now });
  await appendTimeline(deps, d.tenantId, d.orderId, d.actorId, 'item_added', `Item added: ${d.name} x${d.quantity}`);
  await deps.eventBus.emit(env(deps, d.orderId, d.tenantId, d.correlationId, 'order.item.added', 'order.item.added.v1', { itemId, lineNo }));
  await audit(deps, order.organizationId, d.tenantId, d.actorId, d.correlationId, 'item_added', { itemId, name: d.name }, d.orderId);
  return Ok(item);
}

export async function removeItemUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; itemId: string },
  deps: OrderUseCaseDeps,
): Promise<Result<{ itemId: string }, ValidationError | NotFoundError>> {
  const v = removeItemSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const item = await deps.itemRepo.findById(d.tenantId, d.itemId);
  if (!item) return Err(new NotFoundError('Item not found'));
  await deps.itemRepo.remove(d.tenantId, d.itemId);
  await appendTimeline(deps, d.tenantId, item.orderId, d.actorId, 'item_removed', `Item removed: ${item.name}`);
  await deps.eventBus.emit(env(deps, item.orderId, d.tenantId, d.correlationId, 'order.item.removed', 'order.item.removed.v1', { itemId: d.itemId }));
  await audit(deps, '', d.tenantId, d.actorId, d.correlationId, 'item_removed', { itemId: d.itemId }, item.orderId);
  return Ok({ itemId: d.itemId });
}

export async function updateItemUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; itemId: string;
    name?: string; quantity?: number; attributes?: Record<string, unknown>; },
  deps: OrderUseCaseDeps,
): Promise<Result<OrderItem, ValidationError | NotFoundError>> {
  const v = updateItemSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.itemRepo.findById(d.tenantId, d.itemId);
  if (!ex) return Err(new NotFoundError('Item not found'));
  const now = deps.clock.now().toISOString();
  const patch: Partial<OrderItem> = { updatedAt: now };
  if (d.name !== undefined) patch.name = d.name;
  if (d.quantity !== undefined) patch.quantity = d.quantity;
  if (d.attributes !== undefined) patch.attributes = d.attributes;
  await deps.itemRepo.update(d.tenantId, d.itemId, patch);
  return Ok({ ...ex, ...patch });
}

// ════════════════════════════════════════════════════════════════════════════
// APPROVAL (3)
// ════════════════════════════════════════════════════════════════════════════

export async function requestApprovalUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; orderId: string;
    approverId: string; attributes?: Record<string, unknown>; },
  deps: OrderUseCaseDeps,
): Promise<Result<OrderApproval, ValidationError | NotFoundError | ConflictError>> {
  const v = requestApprovalSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const order = await deps.orderRepo.findById(d.tenantId, d.orderId);
  if (!order) return Err(new NotFoundError('Order not found'));

  const pending = await deps.approvalRepo.findPendingByOrder(d.tenantId, d.orderId);
  if (pending) return Err(new ConflictError('Approval already pending'));

  const apprId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const approval: OrderApproval = {
    id: apprId, tenantId: d.tenantId, orderId: d.orderId,
    approverId: d.approverId, status: 'Pending', reason: null,
    attributes: d.attributes ?? {}, createdAt: now, decidedAt: null,
  };
  await deps.approvalRepo.insert(approval);
  await appendTimeline(deps, d.tenantId, d.orderId, d.actorId, 'approval_requested', `Approval requested from ${d.approverId}`);
  await deps.eventBus.emit(env(deps, d.orderId, d.tenantId, d.correlationId, 'order.updated', 'order.approval.requested.v1', { approvalId: apprId }));
  await audit(deps, order.organizationId, d.tenantId, d.actorId, d.correlationId, 'approval_requested', { approvalId: apprId, approverId: d.approverId }, d.orderId);
  return Ok(approval);
}

export async function approveUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; approvalId: string; reason?: string },
  deps: OrderUseCaseDeps,
): Promise<Result<OrderApproval, ValidationError | NotFoundError | ConflictError>> {
  const v = approveSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const appr = await deps.approvalRepo.findById(d.tenantId, d.approvalId);
  if (!appr) return Err(new NotFoundError('Approval not found'));
  if (appr.status !== 'Pending') return Err(new ConflictError(`Approval already ${appr.status}`));

  const now = deps.clock.now().toISOString();
  await deps.approvalRepo.update(d.tenantId, d.approvalId, { status: 'Approved', decidedAt: now, ...(d.reason !== undefined ? { reason: d.reason } : {}) });

  // Update order approval status
  const order = await deps.orderRepo.findById(d.tenantId, appr.orderId);
  if (order) {
    await deps.orderRepo.update(d.tenantId, appr.orderId, { approvalStatus: 'Approved', updatedAt: now });
  }
  await appendTimeline(deps, d.tenantId, appr.orderId, d.actorId, 'approval_approved', 'Order approved');
  await audit(deps, order?.organizationId ?? '', d.tenantId, d.actorId, d.correlationId, 'approval_approved', { approvalId: d.approvalId }, appr.orderId);
  return Ok({ ...appr, status: 'Approved', decidedAt: now });
}

export async function rejectApprovalUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; approvalId: string; reason?: string },
  deps: OrderUseCaseDeps,
): Promise<Result<OrderApproval, ValidationError | NotFoundError | ConflictError>> {
  const v = rejectApprovalSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const appr = await deps.approvalRepo.findById(d.tenantId, d.approvalId);
  if (!appr) return Err(new NotFoundError('Approval not found'));
  if (appr.status !== 'Pending') return Err(new ConflictError(`Approval already ${appr.status}`));

  const now = deps.clock.now().toISOString();
  await deps.approvalRepo.update(d.tenantId, d.approvalId, { status: 'Rejected', decidedAt: now, ...(d.reason !== undefined ? { reason: d.reason } : {}) });

  const order = await deps.orderRepo.findById(d.tenantId, appr.orderId);
  if (order) {
    await deps.orderRepo.update(d.tenantId, appr.orderId, { approvalStatus: 'Rejected', updatedAt: now });
  }
  await appendTimeline(deps, d.tenantId, appr.orderId, d.actorId, 'approval_rejected', d.reason ?? 'Approval rejected');
  await audit(deps, order?.organizationId ?? '', d.tenantId, d.actorId, d.correlationId, 'approval_rejected', { approvalId: d.approvalId }, appr.orderId);
  return Ok({ ...appr, status: 'Rejected', decidedAt: now });
}
