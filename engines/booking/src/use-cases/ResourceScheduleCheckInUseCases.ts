/**
 * Booking Engine — Resource + Participant + Schedule + CheckIn + Timeline + Policy UseCases (16)
 */

import {
  Ok, Err, type Result,
  ValidationError, ConflictError, NotFoundError,
} from '@platform/core-sdk';
import {
  attachResourceSchema, detachResourceSchema, changeResourceSchema,
  addParticipantSchema, removeParticipantSchema, updateParticipantSchema,
  rescheduleBookingSchema, extendBookingSchema, shortenBookingSchema,
  checkInSchema, checkOutSchema,
  appendTimelineEventSchema,
  validateBookingPolicySchema,
} from '../domain/validation.js';
import { validateBookingStatusTransition, isBookingMutable } from '../domain/statusTransition.js';
import type { BookingUseCaseDeps } from './types.js';
import type {
  Booking, BookingResource, BookingParticipant, BookingTimelineEntry,
  DateTimeRange, TimelineEventType,
} from '../interfaces/index.js';

function env(deps: BookingUseCaseDeps, agg: string, tenant: string, corr: string, eventType: string, schemaRef: string, payload: unknown) {
  return {
    eventId: deps.idGenerator.generate(), aggregateId: agg, occurredAt: deps.clock.now().toISOString(),
    version: '1.0.0', tenantId: tenant, correlationId: corr, causationId: '',
    engine: 'booking' as const, eventType, schemaRef, payload,
  };
}

async function appendTimeline(deps: BookingUseCaseDeps, tenantId: string, bookingId: string, actorId: string, eventType: TimelineEventType, description: string, meta?: Record<string, unknown>) {
  const entry: BookingTimelineEntry = {
    id: deps.idGenerator.generate(), tenantId, bookingId,
    eventType, actorId, description, metadata: meta ?? {},
    createdAt: deps.clock.now().toISOString(),
  };
  await deps.timelineRepo.insert(entry);
}

async function audit(deps: BookingUseCaseDeps, orgId: string, tenantId: string, actorId: string, corr: string, eventType: string, meta: Record<string, unknown>, bookingId?: string) {
  const rec: Record<string, unknown> = { organizationId: orgId, tenantId, actorId, correlationId: corr, eventType, metadata: meta };
  if (bookingId !== undefined) rec.bookingId = bookingId;
  await deps.auditRepo.insert(rec as Parameters<typeof deps.auditRepo.insert>[0]);
}

// ════════════════════════════════════════════════════════════════════════════
// RESOURCE (3)
// ════════════════════════════════════════════════════════════════════════════

export async function attachResourceUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; bookingId: string;
    resourceType: string; resourceId: string;
    inventoryId?: string | null; locationId?: string | null;
    quantity: number; isPrimary?: boolean;
    attributes?: Record<string, unknown>; },
  deps: BookingUseCaseDeps,
): Promise<Result<BookingResource, ValidationError | NotFoundError | ConflictError>> {
  const v = attachResourceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const booking = await deps.bookingRepo.findById(d.tenantId, d.bookingId);
  if (!booking) return Err(new NotFoundError('Booking not found'));
  if (!isBookingMutable(booking.status)) return Err(new ConflictError(`Booking not mutable (status: ${booking.status})`));

  const resId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const resource: BookingResource = {
    id: resId, tenantId: d.tenantId, bookingId: d.bookingId,
    resourceType: d.resourceType, resourceId: d.resourceId,
    inventoryId: d.inventoryId ?? null, locationId: d.locationId ?? null,
    quantity: d.quantity, isPrimary: d.isPrimary ?? false,
    attributes: d.attributes ?? {}, createdAt: now, updatedAt: now,
  };
  await deps.resourceRepo.insert(resource);
  await appendTimeline(deps, d.tenantId, d.bookingId, d.actorId, 'resource_changed', `Resource attached: ${d.resourceType}:${d.resourceId}`);
  await deps.eventBus.emit(env(deps, d.bookingId, d.tenantId, d.correlationId, 'booking.resource.changed', 'booking.resource.attached.v1', { resourceId: resId }));
  await audit(deps, booking.organizationId, d.tenantId, d.actorId, d.correlationId, 'resource_attached', { resourceId: resId }, d.bookingId);
  return Ok(resource);
}

export async function detachResourceUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; resourceId: string },
  deps: BookingUseCaseDeps,
): Promise<Result<{ resourceId: string }, ValidationError | NotFoundError>> {
  const v = detachResourceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const resource = await deps.resourceRepo.findById(d.tenantId, d.resourceId);
  if (!resource) return Err(new NotFoundError('Resource not found'));
  await deps.resourceRepo.remove(d.tenantId, d.resourceId);
  await appendTimeline(deps, d.tenantId, resource.bookingId, d.actorId, 'resource_changed', `Resource detached: ${resource.resourceType}`);
  await audit(deps, '', d.tenantId, d.actorId, d.correlationId, 'resource_detached', { resourceId: d.resourceId }, resource.bookingId);
  return Ok({ resourceId: d.resourceId });
}

export async function changeResourceUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; resourceId: string;
    newResourceId: string; reason?: string },
  deps: BookingUseCaseDeps,
): Promise<Result<BookingResource, ValidationError | NotFoundError>> {
  const v = changeResourceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const resource = await deps.resourceRepo.findById(d.tenantId, d.resourceId);
  if (!resource) return Err(new NotFoundError('Resource not found'));
  const oldId = resource.resourceId;
  resource.resourceId = d.newResourceId;
  resource.updatedAt = deps.clock.now().toISOString();
  await deps.resourceRepo.update(d.tenantId, d.resourceId, { resourceId: d.newResourceId, updatedAt: resource.updatedAt });
  await appendTimeline(deps, d.tenantId, resource.bookingId, d.actorId, 'resource_changed', `Resource changed: ${oldId} → ${d.newResourceId}`, { reason: d.reason });
  await audit(deps, '', d.tenantId, d.actorId, d.correlationId, 'resource_changed', { oldId, newId: d.newResourceId }, resource.bookingId);
  return Ok(resource);
}

// ════════════════════════════════════════════════════════════════════════════
// PARTICIPANT (3)
// ════════════════════════════════════════════════════════════════════════════

export async function addParticipantUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; bookingId: string;
    userId: string; role: 'primary' | 'guest' | 'agent' | 'staff' | 'observer';
    displayName?: string; contactRef?: string; attributes?: Record<string, unknown>; },
  deps: BookingUseCaseDeps,
): Promise<Result<BookingParticipant, ValidationError | NotFoundError>> {
  const v = addParticipantSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const booking = await deps.bookingRepo.findById(d.tenantId, d.bookingId);
  if (!booking) return Err(new NotFoundError('Booking not found'));

  const pId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const participant: BookingParticipant = {
    id: pId, tenantId: d.tenantId, bookingId: d.bookingId,
    userId: d.userId, role: d.role,
    attributes: d.attributes ?? {}, createdAt: now, updatedAt: now,
  };
  if (d.displayName !== undefined) participant.displayName = d.displayName;
  if (d.contactRef !== undefined) participant.contactRef = d.contactRef;

  await deps.participantRepo.insert(participant);
  await appendTimeline(deps, d.tenantId, d.bookingId, d.actorId, 'participant_added', `Participant added: ${d.userId} (${d.role})`);
  await deps.eventBus.emit(env(deps, d.bookingId, d.tenantId, d.correlationId, 'booking.participant.added', 'booking.participant.added.v1', { participantId: pId }));
  await audit(deps, booking.organizationId, d.tenantId, d.actorId, d.correlationId, 'participant_added', { participantId: pId, userId: d.userId }, d.bookingId);
  return Ok(participant);
}

export async function removeParticipantUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; participantId: string },
  deps: BookingUseCaseDeps,
): Promise<Result<{ participantId: string }, ValidationError | NotFoundError>> {
  const v = removeParticipantSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const p = await deps.participantRepo.findById(d.tenantId, d.participantId);
  if (!p) return Err(new NotFoundError('Participant not found'));
  await deps.participantRepo.remove(d.tenantId, d.participantId);
  await appendTimeline(deps, d.tenantId, p.bookingId, d.actorId, 'participant_removed', `Participant removed: ${p.userId}`);
  await deps.eventBus.emit(env(deps, p.bookingId, d.tenantId, d.correlationId, 'booking.participant.removed', 'booking.participant.removed.v1', { participantId: d.participantId }));
  await audit(deps, '', d.tenantId, d.actorId, d.correlationId, 'participant_removed', { participantId: d.participantId }, p.bookingId);
  return Ok({ participantId: d.participantId });
}

export async function updateParticipantUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; participantId: string;
    role?: 'primary' | 'guest' | 'agent' | 'staff' | 'observer';
    displayName?: string; attributes?: Record<string, unknown>; },
  deps: BookingUseCaseDeps,
): Promise<Result<BookingParticipant, ValidationError | NotFoundError>> {
  const v = updateParticipantSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.participantRepo.findById(d.tenantId, d.participantId);
  if (!ex) return Err(new NotFoundError('Participant not found'));
  const now = deps.clock.now().toISOString();
  const patch: Partial<BookingParticipant> = { updatedAt: now };
  if (d.role !== undefined) patch.role = d.role;
  if (d.displayName !== undefined) patch.displayName = d.displayName;
  if (d.attributes !== undefined) patch.attributes = d.attributes;
  await deps.participantRepo.update(d.tenantId, d.participantId, patch);
  return Ok({ ...ex, ...patch });
}

// ════════════════════════════════════════════════════════════════════════════
// SCHEDULE (3)
// ════════════════════════════════════════════════════════════════════════════

export async function rescheduleBookingUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; bookingId: string;
    schedule: DateTimeRange; reason?: string },
  deps: BookingUseCaseDeps,
): Promise<Result<Booking, ValidationError | NotFoundError | ConflictError>> {
  const v = rescheduleBookingSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const ex = await deps.bookingRepo.findById(d.tenantId, d.bookingId);
  if (!ex) return Err(new NotFoundError('Booking not found'));
  if (!isBookingMutable(ex.status)) return Err(new ConflictError(`Cannot reschedule (status: ${ex.status})`));

  const now = deps.clock.now().toISOString();
  await deps.bookingRepo.update(d.tenantId, d.bookingId, { schedule: d.schedule, updatedAt: now });
  await appendTimeline(deps, d.tenantId, d.bookingId, d.actorId, 'rescheduled', `Rescheduled to ${d.schedule.startAt}`, { reason: d.reason });
  await deps.eventBus.emit(env(deps, d.bookingId, d.tenantId, d.correlationId, 'booking.rescheduled', 'booking.rescheduled.v1', { bookingId: d.bookingId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'booking_rescheduled', { newStart: d.schedule.startAt }, d.bookingId);
  return Ok({ ...ex, schedule: d.schedule, updatedAt: now });
}

export async function extendBookingUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; bookingId: string; newEndAt: string; reason?: string },
  deps: BookingUseCaseDeps,
): Promise<Result<Booking, ValidationError | NotFoundError | ConflictError>> {
  const v = extendBookingSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.bookingRepo.findById(d.tenantId, d.bookingId);
  if (!ex) return Err(new NotFoundError('Booking not found'));
  if (!isBookingMutable(ex.status)) return Err(new ConflictError(`Cannot extend (status: ${ex.status})`));

  const now = deps.clock.now().toISOString();
  const newSchedule = { ...ex.schedule, endAt: d.newEndAt };
  await deps.bookingRepo.update(d.tenantId, d.bookingId, { schedule: newSchedule, updatedAt: now });
  await appendTimeline(deps, d.tenantId, d.bookingId, d.actorId, 'extended', `Extended to ${d.newEndAt}`, { reason: d.reason });
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'booking_updated', { action: 'extend', newEndAt: d.newEndAt }, d.bookingId);
  return Ok({ ...ex, schedule: newSchedule, updatedAt: now });
}

export async function shortenBookingUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; bookingId: string; newEndAt: string; reason?: string },
  deps: BookingUseCaseDeps,
): Promise<Result<Booking, ValidationError | NotFoundError | ConflictError>> {
  const v = shortenBookingSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.bookingRepo.findById(d.tenantId, d.bookingId);
  if (!ex) return Err(new NotFoundError('Booking not found'));
  if (!isBookingMutable(ex.status)) return Err(new ConflictError(`Cannot shorten (status: ${ex.status})`));

  const now = deps.clock.now().toISOString();
  const newSchedule = { ...ex.schedule, endAt: d.newEndAt };
  await deps.bookingRepo.update(d.tenantId, d.bookingId, { schedule: newSchedule, updatedAt: now });
  await appendTimeline(deps, d.tenantId, d.bookingId, d.actorId, 'shortened', `Shortened to ${d.newEndAt}`, { reason: d.reason });
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'booking_updated', { action: 'shorten', newEndAt: d.newEndAt }, d.bookingId);
  return Ok({ ...ex, schedule: newSchedule, updatedAt: now });
}

// ════════════════════════════════════════════════════════════════════════════
// CHECK-IN / CHECK-OUT (2)
// ════════════════════════════════════════════════════════════════════════════

export async function checkInUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; bookingId: string },
  deps: BookingUseCaseDeps,
): Promise<Result<Booking, ValidationError | NotFoundError | ConflictError>> {
  const v = checkInSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.bookingRepo.findById(d.tenantId, d.bookingId);
  if (!ex) return Err(new NotFoundError('Booking not found'));

  const tr = validateBookingStatusTransition(ex.status, 'Active');
  if (!tr.ok) return Err(new ConflictError(`Cannot check in from ${ex.status}`));

  const now = deps.clock.now().toISOString();
  await deps.bookingRepo.update(d.tenantId, d.bookingId, { status: 'Active', checkedInAt: now, updatedAt: now });
  await appendTimeline(deps, d.tenantId, d.bookingId, d.actorId, 'checkin', 'Checked in');
  await deps.eventBus.emit(env(deps, d.bookingId, d.tenantId, d.correlationId, 'booking.checkin', 'booking.checkin.v1', { bookingId: d.bookingId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'booking_checkin', {}, d.bookingId);
  return Ok({ ...ex, status: 'Active', checkedInAt: now });
}

export async function checkOutUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; bookingId: string },
  deps: BookingUseCaseDeps,
): Promise<Result<Booking, ValidationError | NotFoundError | ConflictError>> {
  const v = checkOutSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.bookingRepo.findById(d.tenantId, d.bookingId);
  if (!ex) return Err(new NotFoundError('Booking not found'));

  const tr = validateBookingStatusTransition(ex.status, 'Completed');
  if (!tr.ok) return Err(new ConflictError(`Cannot check out from ${ex.status}`));

  const now = deps.clock.now().toISOString();

  // Release inventory allocation
  if (ex.inventoryAllocationId) {
    await deps.inventoryIntegration.releaseAllocation(d.tenantId, ex.inventoryAllocationId);
  }

  await deps.bookingRepo.update(d.tenantId, d.bookingId, {
    status: 'Completed', checkedOutAt: now, completedAt: now,
    inventoryAllocationId: null, updatedAt: now,
  });
  await appendTimeline(deps, d.tenantId, d.bookingId, d.actorId, 'checkout', 'Checked out');
  await appendTimeline(deps, d.tenantId, d.bookingId, d.actorId, 'completed', 'Booking completed');
  await deps.eventBus.emit(env(deps, d.bookingId, d.tenantId, d.correlationId, 'booking.checkout', 'booking.checkout.v1', { bookingId: d.bookingId }));
  await deps.eventBus.emit(env(deps, d.bookingId, d.tenantId, d.correlationId, 'booking.completed', 'booking.completed.v1', { bookingId: d.bookingId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'booking_checkout', {}, d.bookingId);
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'booking_completed', {}, d.bookingId);
  return Ok({ ...ex, status: 'Completed', checkedOutAt: now, completedAt: now });
}

// ════════════════════════════════════════════════════════════════════════════
// TIMELINE (2)
// ════════════════════════════════════════════════════════════════════════════

export async function getTimelineUseCase(
  input: { tenantId: string; bookingId: string; limit?: number },
  deps: BookingUseCaseDeps,
): Promise<Result<BookingTimelineEntry[], ValidationError>> {
  return Ok(await deps.timelineRepo.findByBooking(input.tenantId, input.bookingId, input.limit));
}

export async function appendTimelineEventUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; bookingId: string;
    eventType: string; description: string; metadata?: Record<string, unknown>; },
  deps: BookingUseCaseDeps,
): Promise<Result<BookingTimelineEntry, ValidationError | NotFoundError>> {
  const v = appendTimelineEventSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const booking = await deps.bookingRepo.findById(d.tenantId, d.bookingId);
  if (!booking) return Err(new NotFoundError('Booking not found'));

  const entry: BookingTimelineEntry = {
    id: deps.idGenerator.generate(), tenantId: d.tenantId, bookingId: d.bookingId,
    eventType: d.eventType as TimelineEventType, actorId: d.actorId,
    description: d.description, metadata: d.metadata ?? {},
    createdAt: deps.clock.now().toISOString(),
  };
  await deps.timelineRepo.insert(entry);
  await audit(deps, booking.organizationId, d.tenantId, d.actorId, d.correlationId, 'timeline_appended', { eventType: d.eventType }, d.bookingId);
  return Ok(entry);
}

// ════════════════════════════════════════════════════════════════════════════
// POLICY (1)
// ════════════════════════════════════════════════════════════════════════════

export async function validateBookingPolicyUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; bookingId: string },
  deps: BookingUseCaseDeps,
): Promise<Result<{ valid: boolean; issues: string[] }, ValidationError | NotFoundError>> {
  const v = validateBookingPolicySchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const booking = await deps.bookingRepo.findById(d.tenantId, d.bookingId);
  if (!booking) return Err(new NotFoundError('Booking not found'));

  const issues: string[] = [];

  // Check schedule validity
  const start = new Date(booking.schedule.startAt);
  const end = new Date(booking.schedule.endAt);
  if (end <= start) issues.push('End time must be after start time');

  // Check via CustomDataPolicy
  const pr = await deps.policyProvider.validateAttributes(d.tenantId, booking.type, booking.attributes);
  if (!pr.ok) issues.push('CustomDataPolicy validation failed');

  await audit(deps, booking.organizationId, d.tenantId, d.actorId, d.correlationId, 'policy_validated', { valid: issues.length === 0, issues }, d.bookingId);
  return Ok({ valid: issues.length === 0, issues });
}

// ════════════════════════════════════════════════════════════════════════════
// AVAILABILITY (2)
// ════════════════════════════════════════════════════════════════════════════

export async function checkAvailabilityUseCase(
  input: { tenantId: string; inventoryId: string; locationId: string; quantity: number },
  deps: BookingUseCaseDeps,
): Promise<Result<{ available: number; sufficient: boolean }, Error>> {
  return deps.inventoryIntegration.checkAvailability(input.tenantId, input.inventoryId, input.locationId, input.quantity);
}

export async function reserveInventoryUseCase(
  input: { tenantId: string; correlationId: string; actorId: string;
    bookingId: string; inventoryId: string; locationId: string; quantity: number; ttlSeconds?: number },
  deps: BookingUseCaseDeps,
): Promise<Result<{ reservationId: string }, ValidationError | NotFoundError | ConflictError>> {
  const booking = await deps.bookingRepo.findById(input.tenantId, input.bookingId);
  if (!booking) return Err(new NotFoundError('Booking not found'));

  const rr = await deps.inventoryIntegration.reserveInventory(
    input.tenantId, input.inventoryId, input.locationId, input.bookingId, input.quantity, input.ttlSeconds);
  if (!rr.ok) return Err(new ConflictError('Failed to reserve inventory'));

  const now = deps.clock.now().toISOString();
  await deps.bookingRepo.update(input.tenantId, input.bookingId, { inventoryReservationId: rr.value.reservationId, updatedAt: now });
  await appendTimeline(deps, input.tenantId, input.bookingId, input.actorId, 'note_added', `Inventory reserved: ${rr.value.reservationId}`);
  return Ok({ reservationId: rr.value.reservationId });
}

export async function releaseInventoryUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; bookingId: string },
  deps: BookingUseCaseDeps,
): Promise<Result<{ released: boolean }, ValidationError | NotFoundError>> {
  const booking = await deps.bookingRepo.findById(input.tenantId, input.bookingId);
  if (!booking) return Err(new NotFoundError('Booking not found'));

  let released = false;
  if (booking.inventoryReservationId) {
    await deps.inventoryIntegration.releaseReservation(input.tenantId, booking.inventoryReservationId);
    released = true;
  }
  if (booking.inventoryAllocationId) {
    await deps.inventoryIntegration.releaseAllocation(input.tenantId, booking.inventoryAllocationId);
    released = true;
  }

  await deps.bookingRepo.update(input.tenantId, input.bookingId, { inventoryReservationId: null, inventoryAllocationId: null, updatedAt: deps.clock.now().toISOString() });
  return Ok({ released });
}
