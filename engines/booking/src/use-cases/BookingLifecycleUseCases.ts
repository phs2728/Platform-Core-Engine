/**
 * Booking Engine — Booking Lifecycle UseCases (8)
 *
 * 8-state machine:
 *   Draft → Pending → Confirmed → Active → Completed
 *   (+ Rejected / Cancelled / Expired)
 *
 * Inventory Integration Flow:
 *   createBooking → reserveInventory (Pending)
 *   confirmBooking → allocateInventory (Confirmed)
 *   checkIn → (Active)
 *   checkOut → releaseAllocation (Completed)
 *   cancelBooking → releaseReservation/Allocation
 */

import {
  Ok, Err, type Result,
  ValidationError, ConflictError, NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';
import {
  createBookingSchema, updateBookingSchema,
  cancelBookingSchema, confirmBookingSchema, rejectBookingSchema,
  archiveBookingSchema, restoreBookingSchema,
  searchBookingsSchema,
} from '../domain/validation.js';
import { validateBookingStatusTransition, isBookingMutable } from '../domain/statusTransition.js';
import type { BookingUseCaseDeps } from './types.js';
import type {
  Booking, BookingStatus, DateTimeRange,
  BookingSearchCriteria, BookingSearchResult,
  BookingTimelineEntry, TimelineEventType,
} from '../interfaces/index.js';

function env(deps: BookingUseCaseDeps, agg: string, tenant: string, corr: string, eventType: string, schemaRef: string, payload: unknown): EventEnvelope<unknown> {
  return {
    eventId: deps.idGenerator.generate(), aggregateId: agg, occurredAt: deps.clock.now().toISOString(),
    version: '1.0.0', tenantId: tenant, correlationId: corr, causationId: '',
    engine: 'booking', eventType, schemaRef, payload,
  };
}

async function appendTimeline(deps: BookingUseCaseDeps, tenantId: string, bookingId: string, actorId: string, eventType: TimelineEventType, description: string, meta?: Record<string, unknown>) {
  const entry: BookingTimelineEntry = {
    id: deps.idGenerator.generate(), tenantId, bookingId,
    eventType, actorId, description,
    metadata: meta ?? {},
    createdAt: deps.clock.now().toISOString(),
  };
  await deps.timelineRepo.insert(entry);
}

async function audit(deps: BookingUseCaseDeps, orgId: string, tenantId: string, actorId: string, corr: string, eventType: string, meta: Record<string, unknown>, bookingId?: string) {
  const rec: Record<string, unknown> = { organizationId: orgId, tenantId, actorId, correlationId: corr, eventType, metadata: meta };
  if (bookingId !== undefined) rec.bookingId = bookingId;
  await deps.auditRepo.insert(rec as Parameters<typeof deps.auditRepo.insert>[0]);
}

let bookingSeq = 0;
function generateBookingNumber(deps: BookingUseCaseDeps): string {
  bookingSeq += 1;
  const date = deps.clock.now().toISOString().slice(0, 10).replace(/-/g, '');
  return `BK-${date}-${String(bookingSeq).padStart(6, '0')}`;
}

// ════════════════════════════════════════════════════════════════════════════

export interface CreateBookingInput {
  tenantId: string; correlationId: string; actorId: string;
  organizationId: string;
  type: string; title: string;
  schedule: DateTimeRange;
  description?: string; initialStatus?: BookingStatus;
  pricingRefs?: string[]; policyRefs?: string[];
  attributes?: Record<string, unknown>;
  customFields?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export async function createBookingUseCase(
  input: CreateBookingInput, deps: BookingUseCaseDeps,
): Promise<Result<{ bookingId: string; bookingNumber: string; createdAt: string }, ValidationError | ConflictError>> {
  const v = createBookingSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid booking input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));

  const allowedTypes = await deps.policyProvider.getAllowedBookingTypes(d.tenantId);
  if (!allowedTypes.includes(d.type)) {
    return Err(new ValidationError(`type "${d.type}" not allowed`));
  }

  const pr = await deps.policyProvider.validateAttributes(d.tenantId, d.type, d.attributes ?? {});
  if (!pr.ok) return Err(new ValidationError('CustomDataPolicy rejected'));

  const maxB = await deps.policyProvider.getMaxBookingsPerOrg(d.tenantId);
  if (await deps.bookingRepo.countByOrganization(d.tenantId, d.organizationId) >= maxB) {
    return Err(new ConflictError(`Max bookings (${maxB}) reached`));
  }

  const bookingId = deps.idGenerator.generate();
  const bookingNumber = generateBookingNumber(deps);
  const now = deps.clock.now().toISOString();
  const status: BookingStatus = d.initialStatus ?? 'Pending';

  const booking: Booking = {
    id: bookingId, tenantId: d.tenantId, organizationId: d.organizationId,
    bookingNumber, status, type: d.type, title: d.title,
    schedule: d.schedule,
    inventoryReservationId: null, inventoryAllocationId: null,
    pricingRefs: d.pricingRefs ?? [], policyRefs: d.policyRefs ?? [],
    attributes: pr.value, customFields: d.customFields ?? {}, metadata: d.metadata ?? {},
    tags: d.tags ?? [],
    confirmedAt: null, rejectedAt: null, rejectedReason: null,
    cancelledAt: null, cancelReason: null, expiredAt: null,
    checkedInAt: null, checkedOutAt: null, completedAt: null,
    createdAt: now, createdBy: d.actorId, updatedAt: now, updatedBy: d.actorId,
    archivedAt: null,
  };
  if (d.description !== undefined) booking.description = d.description;

  await deps.bookingRepo.insert(booking);
  await appendTimeline(deps, d.tenantId, bookingId, d.actorId, 'created', `Booking created: ${d.title}`);
  await deps.eventBus.emit(env(deps, bookingId, d.tenantId, d.correlationId, 'booking.created', 'booking.created.v1', { bookingId, bookingNumber, type: d.type }));
  await audit(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'booking_created', { bookingNumber, type: d.type }, bookingId);
  return Ok({ bookingId, bookingNumber, createdAt: now });
}

export async function updateBookingUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; bookingId: string;
    title?: string; description?: string; schedule?: DateTimeRange;
    attributes?: Record<string, unknown>; customFields?: Record<string, unknown>; tags?: string[]; },
  deps: BookingUseCaseDeps,
): Promise<Result<Booking, ValidationError | NotFoundError | ConflictError>> {
  const v = updateBookingSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid update', { details: { issues: v.error.errors } }));
  const d = v.data;
  const ex = await deps.bookingRepo.findById(d.tenantId, d.bookingId);
  if (!ex) return Err(new NotFoundError('Booking not found'));
  if (!isBookingMutable(ex.status)) return Err(new ConflictError(`Cannot update — status "${ex.status}"`));

  const now = deps.clock.now().toISOString();
  const patch: Partial<Booking> = { updatedAt: now, updatedBy: d.actorId };
  if (d.title !== undefined) patch.title = d.title;
  if (d.description !== undefined) patch.description = d.description;
  if (d.schedule !== undefined) patch.schedule = d.schedule;
  if (d.customFields !== undefined) patch.customFields = d.customFields;
  if (d.tags !== undefined) patch.tags = d.tags;
  if (d.attributes !== undefined) {
    const pr = await deps.policyProvider.validateAttributes(d.tenantId, ex.type, d.attributes);
    if (!pr.ok) return Err(new ValidationError('CustomDataPolicy rejected'));
    patch.attributes = pr.value;
  }

  await deps.bookingRepo.update(d.tenantId, d.bookingId, patch);
  await appendTimeline(deps, d.tenantId, d.bookingId, d.actorId, 'updated', 'Booking updated');
  await deps.eventBus.emit(env(deps, d.bookingId, d.tenantId, d.correlationId, 'booking.updated', 'booking.updated.v1', { bookingId: d.bookingId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'booking_updated', {}, d.bookingId);
  return Ok({ ...ex, ...patch } as Booking);
}

export async function confirmBookingUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; bookingId: string },
  deps: BookingUseCaseDeps,
): Promise<Result<Booking, ValidationError | NotFoundError | ConflictError>> {
  const v = confirmBookingSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.bookingRepo.findById(d.tenantId, d.bookingId);
  if (!ex) return Err(new NotFoundError('Booking not found'));

  const tr = validateBookingStatusTransition(ex.status, 'Confirmed');
  if (!tr.ok) return Err(new ConflictError(`Invalid transition: ${ex.status} → Confirmed`));

  const now = deps.clock.now().toISOString();

  // Allocate inventory if reservation exists
  let allocationId: string | null = null;
  if (ex.inventoryReservationId) {
    // Get resources to find inventory/location info
    const resources = await deps.resourceRepo.findByBooking(d.tenantId, d.bookingId);
    const invResource = resources.find((r) => r.inventoryId !== null && r.locationId !== null);
    if (invResource && invResource.inventoryId && invResource.locationId) {
      const allocResult = await deps.inventoryIntegration.allocateInventory(
        d.tenantId, invResource.inventoryId, invResource.locationId, d.bookingId, invResource.quantity);
      if (allocResult.ok) {
        allocationId = allocResult.value.allocationId;
      }
      // Release the reservation since allocation supersedes it
      await deps.inventoryIntegration.releaseReservation(d.tenantId, ex.inventoryReservationId);
    }
  }

  await deps.bookingRepo.update(d.tenantId, d.bookingId, {
    status: 'Confirmed', confirmedAt: now,
    inventoryAllocationId: allocationId,
    inventoryReservationId: null,
    updatedAt: now,
  });

  // Record confirmation
  const confirmId = deps.idGenerator.generate();
  await deps.confirmationRepo.insert({
    id: confirmId, tenantId: d.tenantId, bookingId: d.bookingId,
    confirmationCode: `CF-${ex.bookingNumber}`,
    confirmedBy: d.actorId, inventoryAllocationId: allocationId,
    confirmedAt: now, metadata: {},
  });

  await appendTimeline(deps, d.tenantId, d.bookingId, d.actorId, 'confirmed', 'Booking confirmed');
  await deps.eventBus.emit(env(deps, d.bookingId, d.tenantId, d.correlationId, 'booking.confirmed', 'booking.confirmed.v1', { bookingId: d.bookingId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'booking_confirmed', { confirmationCode: `CF-${ex.bookingNumber}` }, d.bookingId);
  return Ok({ ...ex, status: 'Confirmed', confirmedAt: now, inventoryAllocationId: allocationId });
}

export async function rejectBookingUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; bookingId: string; reason?: string },
  deps: BookingUseCaseDeps,
): Promise<Result<Booking, ValidationError | NotFoundError | ConflictError>> {
  const v = rejectBookingSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.bookingRepo.findById(d.tenantId, d.bookingId);
  if (!ex) return Err(new NotFoundError('Booking not found'));

  const tr = validateBookingStatusTransition(ex.status, 'Rejected');
  if (!tr.ok) return Err(new ConflictError(`Invalid transition: ${ex.status} → Rejected`));

  const now = deps.clock.now().toISOString();

  // Release inventory reservation if exists
  if (ex.inventoryReservationId) {
    await deps.inventoryIntegration.releaseReservation(d.tenantId, ex.inventoryReservationId);
  }

  await deps.bookingRepo.update(d.tenantId, d.bookingId, {
    status: 'Rejected', rejectedAt: now,
    updatedAt: now,
    ...(d.reason !== undefined ? { rejectedReason: d.reason } : {}),
  });

  await appendTimeline(deps, d.tenantId, d.bookingId, d.actorId, 'rejected', d.reason ?? 'Booking rejected');
  await deps.eventBus.emit(env(deps, d.bookingId, d.tenantId, d.correlationId, 'booking.rejected', 'booking.rejected.v1', { bookingId: d.bookingId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'booking_rejected', { reason: d.reason }, d.bookingId);
  return Ok({ ...ex, status: 'Rejected', rejectedAt: now });
}

export async function cancelBookingUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; bookingId: string; reason?: string },
  deps: BookingUseCaseDeps,
): Promise<Result<Booking, ValidationError | NotFoundError | ConflictError>> {
  const v = cancelBookingSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.bookingRepo.findById(d.tenantId, d.bookingId);
  if (!ex) return Err(new NotFoundError('Booking not found'));

  const tr = validateBookingStatusTransition(ex.status, 'Cancelled');
  if (!tr.ok) return Err(new ConflictError(`Invalid transition: ${ex.status} → Cancelled`));

  const now = deps.clock.now().toISOString();

  // Release inventory reservation or allocation
  if (ex.inventoryReservationId) {
    await deps.inventoryIntegration.releaseReservation(d.tenantId, ex.inventoryReservationId);
  }
  if (ex.inventoryAllocationId) {
    await deps.inventoryIntegration.releaseAllocation(d.tenantId, ex.inventoryAllocationId);
  }

  await deps.bookingRepo.update(d.tenantId, d.bookingId, {
    status: 'Cancelled', cancelledAt: now,
    inventoryReservationId: null, inventoryAllocationId: null,
    updatedAt: now,
    ...(d.reason !== undefined ? { cancelReason: d.reason } : {}),
  });

  await appendTimeline(deps, d.tenantId, d.bookingId, d.actorId, 'cancelled', d.reason ?? 'Booking cancelled');
  await deps.eventBus.emit(env(deps, d.bookingId, d.tenantId, d.correlationId, 'booking.cancelled', 'booking.cancelled.v1', { bookingId: d.bookingId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'booking_cancelled', { reason: d.reason }, d.bookingId);
  return Ok({ ...ex, status: 'Cancelled', cancelledAt: now });
}

export async function expireBookingUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; bookingId: string },
  deps: BookingUseCaseDeps,
): Promise<Result<Booking, ValidationError | NotFoundError | ConflictError>> {
  const ex = await deps.bookingRepo.findById(input.tenantId, input.bookingId);
  if (!ex) return Err(new NotFoundError('Booking not found'));

  const tr = validateBookingStatusTransition(ex.status, 'Expired');
  if (!tr.ok) return Err(new ConflictError(`Invalid transition: ${ex.status} → Expired`));

  const now = deps.clock.now().toISOString();
  if (ex.inventoryReservationId) {
    await deps.inventoryIntegration.releaseReservation(input.tenantId, ex.inventoryReservationId);
  }

  await deps.bookingRepo.update(input.tenantId, input.bookingId, {
    status: 'Expired', expiredAt: now, inventoryReservationId: null, updatedAt: now,
  });

  await appendTimeline(deps, input.tenantId, input.bookingId, input.actorId, 'expired', 'Booking expired');
  await deps.eventBus.emit(env(deps, input.bookingId, input.tenantId, input.correlationId, 'booking.expired', 'booking.expired.v1', { bookingId: input.bookingId }));
  await audit(deps, ex.organizationId, input.tenantId, input.actorId, input.correlationId, 'booking_expired', {}, input.bookingId);
  return Ok({ ...ex, status: 'Expired', expiredAt: now });
}

export async function archiveBookingUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; bookingId: string },
  deps: BookingUseCaseDeps,
): Promise<Result<Booking, ValidationError | NotFoundError | ConflictError>> {
  const v = archiveBookingSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.bookingRepo.findById(d.tenantId, d.bookingId);
  if (!ex) return Err(new NotFoundError('Booking not found'));
  if (ex.archivedAt !== null) return Err(new ConflictError('Already archived'));

  const now = deps.clock.now().toISOString();
  await deps.bookingRepo.update(d.tenantId, d.bookingId, { archivedAt: now, updatedAt: now });
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'booking_archived', {}, d.bookingId);
  return Ok({ ...ex, archivedAt: now });
}

export async function restoreBookingUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; bookingId: string },
  deps: BookingUseCaseDeps,
): Promise<Result<Booking, ValidationError | NotFoundError | ConflictError>> {
  const v = restoreBookingSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.bookingRepo.findById(d.tenantId, d.bookingId);
  if (!ex) return Err(new NotFoundError('Booking not found'));
  if (ex.archivedAt === null) return Err(new ConflictError('Not archived'));

  await deps.bookingRepo.update(d.tenantId, d.bookingId, { archivedAt: null, updatedAt: deps.clock.now().toISOString() });
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'booking_restored', {}, d.bookingId);
  return Ok({ ...ex, archivedAt: null });
}

export async function searchBookingsUseCase(
  input: BookingSearchCriteria, deps: BookingUseCaseDeps,
): Promise<Result<BookingSearchResult, ValidationError>> {
  const v = searchBookingsSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid search'));
  return Ok(await deps.bookingRepo.search(v.data as BookingSearchCriteria));
}

export async function listBookingsUseCase(
  input: { tenantId: string; organizationId: string; limit?: number; offset?: number },
  deps: BookingUseCaseDeps,
): Promise<Result<BookingSearchResult, ValidationError>> {
  return Ok(await deps.bookingRepo.search({
    tenantId: input.tenantId, organizationId: input.organizationId,
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
    ...(input.offset !== undefined ? { offset: input.offset } : {}),
  }));
}
