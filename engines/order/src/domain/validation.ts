/**
 * Order Engine — Validation Schemas (zod)
 */
import { z } from '@platform/core-sdk';

export const orderStatusSchema = z.enum([
  'Draft', 'Submitted', 'Approved', 'Confirmed',
  'InProgress', 'Completed', 'Closed',
  'Cancelled', 'Rejected', 'Expired',
]);

export const createOrderSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  organizationId: z.string().min(1),
  type: z.string().min(1).max(100),
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  initialStatus: orderStatusSchema.optional(),
  attributes: z.record(z.unknown()).optional(),
  customFields: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateOrderSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  orderId: z.string().min(1),
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(2000).optional(),
  attributes: z.record(z.unknown()).optional(),
  customFields: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

export const cancelOrderSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  orderId: z.string().min(1), reason: z.string().max(500).optional(),
});

export const simpleOrderActionSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  orderId: z.string().min(1),
});

export const rejectOrderSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  orderId: z.string().min(1), reason: z.string().max(500).optional(),
});

export const getOrderSchema = z.object({
  tenantId: z.string().min(1), orderId: z.string().min(1),
});

export const searchOrdersSchema = z.object({
  tenantId: z.string().min(1),
  organizationId: z.string().optional(),
  query: z.string().max(200).optional(),
  type: z.string().max(100).optional(),
  status: orderStatusSchema.optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'orderNumber']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const addItemSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  orderId: z.string().min(1),
  resourceType: z.string().min(1).max(100),
  resourceId: z.string().min(1).max(128),
  name: z.string().min(1).max(200),
  quantity: z.number().int().min(1),
  unit: z.string().min(1).max(50),
  pricingRefId: z.string().min(1).nullable().optional(),
  attributes: z.record(z.unknown()).optional(),
});

export const removeItemSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  itemId: z.string().min(1),
});

export const updateItemSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  itemId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  quantity: z.number().int().min(1).optional(),
  attributes: z.record(z.unknown()).optional(),
});

export const requestApprovalSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  orderId: z.string().min(1),
  approverId: z.string().min(1).max(128),
  attributes: z.record(z.unknown()).optional(),
});

export const approveSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  approvalId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export const rejectApprovalSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  approvalId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export const attachReferenceSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  orderId: z.string().min(1),
  refType: z.string().min(1).max(100),
  refId: z.string().min(1).max(128),
  metadata: z.record(z.unknown()).optional(),
});

export const appendTimelineSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  orderId: z.string().min(1),
  eventType: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  metadata: z.record(z.unknown()).optional(),
});

export const getTimelineSchema = z.object({
  tenantId: z.string().min(1), orderId: z.string().min(1),
  limit: z.number().int().min(1).max(1000).optional(),
});
