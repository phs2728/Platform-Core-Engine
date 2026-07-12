/**
 * Booking Engine — Validation Schemas (zod)
 */

import { z } from '@platform/core-sdk';

export const bookingStatusSchema = z.enum([
  'Draft', 'Pending', 'Confirmed', 'Rejected',
  'Cancelled', 'Expired', 'Active', 'Completed',
]);

export const dateTimeRangeSchema = z.object({
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  timezone: z.string().min(1).max(100),
});

// ═══════════════════════════════════════════
// Booking
// ═══════════════════════════════════════════

export const createBookingSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  organizationId: z.string().min(1),
  type: z.string().min(1).max(100),
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  schedule: dateTimeRangeSchema,
  initialStatus: bookingStatusSchema.optional(),
  pricingRefs: z.array(z.string()).optional(),
  policyRefs: z.array(z.string()).optional(),
  attributes: z.record(z.unknown()).optional(),
  customFields: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateBookingSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  bookingId: z.string().min(1),
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(2000).optional(),
  schedule: dateTimeRangeSchema.optional(),
  attributes: z.record(z.unknown()).optional(),
  customFields: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

export const cancelBookingSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  bookingId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export const confirmBookingSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  bookingId: z.string().min(1),
});

export const rejectBookingSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  bookingId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export const archiveBookingSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  bookingId: z.string().min(1),
});

export const restoreBookingSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  bookingId: z.string().min(1),
});

export const getBookingSchema = z.object({
  tenantId: z.string().min(1), bookingId: z.string().min(1),
});

export const searchBookingsSchema = z.object({
  tenantId: z.string().min(1),
  organizationId: z.string().optional(),
  query: z.string().max(200).optional(),
  type: z.string().max(100).optional(),
  status: bookingStatusSchema.optional(),
  userId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  startAfter: z.string().optional(),
  startBefore: z.string().optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'startAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// ═══════════════════════════════════════════
// Resource
// ═══════════════════════════════════════════

export const attachResourceSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  bookingId: z.string().min(1),
  resourceType: z.string().min(1).max(100),
  resourceId: z.string().min(1).max(128),
  inventoryId: z.string().min(1).nullable().optional(),
  locationId: z.string().min(1).nullable().optional(),
  quantity: z.number().int().min(1),
  isPrimary: z.boolean().optional(),
  attributes: z.record(z.unknown()).optional(),
});

export const detachResourceSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  resourceId: z.string().min(1),
});

export const changeResourceSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  resourceId: z.string().min(1),
  newResourceId: z.string().min(1).max(128),
  reason: z.string().max(500).optional(),
});

// ═══════════════════════════════════════════
// Participant
// ═══════════════════════════════════════════

export const addParticipantSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  bookingId: z.string().min(1),
  userId: z.string().min(1).max(128),
  role: z.enum(['primary', 'guest', 'agent', 'staff', 'observer']),
  displayName: z.string().max(200).optional(),
  contactRef: z.string().max(256).optional(),
  attributes: z.record(z.unknown()).optional(),
});

export const removeParticipantSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  participantId: z.string().min(1),
});

export const updateParticipantSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  participantId: z.string().min(1),
  role: z.enum(['primary', 'guest', 'agent', 'staff', 'observer']).optional(),
  displayName: z.string().max(200).optional(),
  attributes: z.record(z.unknown()).optional(),
});

// ═══════════════════════════════════════════
// Schedule
// ═══════════════════════════════════════════

export const rescheduleBookingSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  bookingId: z.string().min(1),
  schedule: dateTimeRangeSchema,
  reason: z.string().max(500).optional(),
});

export const extendBookingSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  bookingId: z.string().min(1),
  newEndAt: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export const shortenBookingSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  bookingId: z.string().min(1),
  newEndAt: z.string().min(1),
  reason: z.string().max(500).optional(),
});

// ═══════════════════════════════════════════
// Check-in / Check-out
// ═══════════════════════════════════════════

export const checkInSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  bookingId: z.string().min(1),
});

export const checkOutSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  bookingId: z.string().min(1),
});

// ═══════════════════════════════════════════
// Timeline
// ═══════════════════════════════════════════

export const appendTimelineEventSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  bookingId: z.string().min(1),
  eventType: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  metadata: z.record(z.unknown()).optional(),
});

// ═══════════════════════════════════════════
// Policy
// ═══════════════════════════════════════════

export const validateBookingPolicySchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  bookingId: z.string().min(1),
});
