/**
 * Booking Engine — Public Interfaces
 *
 * 사장님 확립 (2026-07-11) Phase 5 — Booking Lifecycle Engine.
 * 8-state machine: Draft → Pending → Confirmed → Active → Completed
 *                  (+ Rejected / Cancelled / Expired terminal states)
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
  getAllowedBookingTypes(tenantId: string): Promise<readonly string[]>;
  getMaxBookingsPerOrg(tenantId: string): Promise<number>;
  getDefaultExpirySeconds(tenantId: string): Promise<number>;
  getDefaultCancelWindowSeconds(tenantId: string): Promise<number>;
}

/**
 * Inventory Integration — Host provides this adapter.
 * Booking Engine calls it to reserve/allocate/release inventory.
 * NEVER implements inventory logic directly.
 */
export interface IInventoryIntegration {
  checkAvailability(tenantId: string, inventoryId: string, locationId: string, quantity: number): Promise<Result<{ available: number; sufficient: boolean }, Error>>;
  reserveInventory(tenantId: string, inventoryId: string, locationId: string, ownerId: string, quantity: number, ttlSeconds?: number): Promise<Result<{ reservationId: string }, Error>>;
  allocateInventory(tenantId: string, inventoryId: string, locationId: string, ownerId: string, quantity: number): Promise<Result<{ allocationId: string }, Error>>;
  releaseReservation(tenantId: string, reservationId: string): Promise<Result<void, Error>>;
  releaseAllocation(tenantId: string, allocationId: string): Promise<Result<void, Error>>;
}

// ═══════════════════════════════════════════
// Value Objects
// ═══════════════════════════════════════════

export type BookingStatus =
  | 'Draft' | 'Pending' | 'Confirmed' | 'Rejected'
  | 'Cancelled' | 'Expired' | 'Active' | 'Completed';

export type ParticipantRole = 'primary' | 'guest' | 'agent' | 'staff' | 'observer';
export type TimelineEventType =
  | 'created' | 'updated' | 'confirmed' | 'rejected' | 'cancelled' | 'expired'
  | 'checkin' | 'checkout' | 'completed' | 'rescheduled'
  | 'resource_changed' | 'participant_added' | 'participant_removed'
  | 'extended' | 'shortened' | 'note_added';

export interface DateTimeRange {
  startAt: string;
  endAt: string;
  timezone: string;
}

export interface BookingNumber {
  prefix: string;
  sequence: number;
  full: string;
}

// ═══════════════════════════════════════════
// Core Entities
// ═══════════════════════════════════════════

export interface Booking {
  id: string;
  tenantId: string;
  organizationId: string;
  bookingNumber: string;
  status: BookingStatus;
  type: string;
  title: string;
  description?: string;

  schedule: DateTimeRange;

  // Inventory reservation tracking
  inventoryReservationId: string | null;
  inventoryAllocationId: string | null;

  // References (NOT owned data — just IDs)
  pricingRefs: string[];
  policyRefs: string[];

  attributes: Record<string, unknown>;
  customFields: Record<string, unknown>;
  metadata: Record<string, unknown>;
  tags: string[];

  // Lifecycle timestamps
  confirmedAt: string | null;
  rejectedAt: string | null;
  rejectedReason: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  expiredAt: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  completedAt: string | null;

  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  archivedAt: string | null;
}

export interface BookingResource {
  id: string;
  tenantId: string;
  bookingId: string;
  resourceType: string;          // 'inventory' | 'catalog_item' | 'space' | 'equipment' | etc.
  resourceId: string;
  inventoryId: string | null;
  locationId: string | null;
  quantity: number;
  isPrimary: boolean;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BookingParticipant {
  id: string;
  tenantId: string;
  bookingId: string;
  userId: string;
  role: ParticipantRole;
  displayName?: string;
  contactRef?: string;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BookingTimelineEntry {
  id: string;
  tenantId: string;
  bookingId: string;
  eventType: TimelineEventType;
  actorId: string;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface BookingConfirmation {
  id: string;
  tenantId: string;
  bookingId: string;
  confirmationCode: string;
  confirmedBy: string;
  inventoryAllocationId: string | null;
  confirmedAt: string;
  metadata: Record<string, unknown>;
}

export interface BookingPolicyReference {
  id: string;
  tenantId: string;
  bookingId: string;
  policyType: string;            // 'cancellation' | 'modification' | 'no_show' | 'deposit' | etc.
  policyId: string;
  policyVersion: string | null;
  attributes: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Search
// ═══════════════════════════════════════════

export interface BookingSearchCriteria {
  tenantId: string;
  organizationId?: string;
  query?: string;
  type?: string;
  status?: BookingStatus;
  userId?: string;
  tags?: string[];
  startAfter?: string;
  startBefore?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'startAt';
  sortOrder?: 'asc' | 'desc';
}

export interface BookingSearchResult {
  bookings: Booking[];
  total: number;
  limit: number;
  offset: number;
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export type BookingAuditEventType =
  | 'booking_created' | 'booking_updated' | 'booking_confirmed' | 'booking_rejected'
  | 'booking_cancelled' | 'booking_expired' | 'booking_archived' | 'booking_restored'
  | 'booking_checkin' | 'booking_checkout' | 'booking_completed' | 'booking_rescheduled'
  | 'resource_attached' | 'resource_detached' | 'resource_changed'
  | 'participant_added' | 'participant_removed' | 'participant_updated'
  | 'timeline_appended' | 'policy_validated';

export interface BookingAuditRecord {
  id: string;
  tenantId: string;
  organizationId: string;
  bookingId?: string;
  actorId: string;
  correlationId: string;
  eventType: BookingAuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Repositories
// ═══════════════════════════════════════════

export interface IBookingRepository {
  insert(booking: Booking): Promise<void>;
  findById(tenantId: string, id: string): Promise<Booking | null>;
  findByBookingNumber(tenantId: string, bookingNumber: string): Promise<Booking | null>;
  update(tenantId: string, id: string, patch: Partial<Booking>): Promise<void>;
  search(criteria: BookingSearchCriteria): Promise<BookingSearchResult>;
  countByOrganization(tenantId: string, organizationId: string): Promise<number>;
}

export interface IBookingResourceRepository {
  insert(resource: BookingResource): Promise<void>;
  findById(tenantId: string, id: string): Promise<BookingResource | null>;
  findByBooking(tenantId: string, bookingId: string): Promise<BookingResource[]>;
  update(tenantId: string, id: string, patch: Partial<BookingResource>): Promise<void>;
  remove(tenantId: string, id: string): Promise<void>;
}

export interface IBookingParticipantRepository {
  insert(participant: BookingParticipant): Promise<void>;
  findById(tenantId: string, id: string): Promise<BookingParticipant | null>;
  findByBooking(tenantId: string, bookingId: string): Promise<BookingParticipant[]>;
  update(tenantId: string, id: string, patch: Partial<BookingParticipant>): Promise<void>;
  remove(tenantId: string, id: string): Promise<void>;
}

export interface IBookingTimelineRepository {
  insert(entry: BookingTimelineEntry): Promise<void>;
  findByBooking(tenantId: string, bookingId: string, limit?: number): Promise<BookingTimelineEntry[]>;
}

export interface IBookingConfirmationRepository {
  insert(confirmation: BookingConfirmation): Promise<void>;
  findByBooking(tenantId: string, bookingId: string): Promise<BookingConfirmation | null>;
}

export interface IBookingPolicyRefRepository {
  insert(ref: BookingPolicyReference): Promise<void>;
  findByBooking(tenantId: string, bookingId: string): Promise<BookingPolicyReference[]>;
}

export interface IBookingAuditRepository {
  insert(record: Omit<BookingAuditRecord, 'id' | 'createdAt'>): Promise<BookingAuditRecord>;
  findByTenant(tenantId: string, limit?: number): Promise<BookingAuditRecord[]>;
  findByBooking(tenantId: string, bookingId: string, limit?: number): Promise<BookingAuditRecord[]>;
}

export { type Result, type EventEnvelope };
