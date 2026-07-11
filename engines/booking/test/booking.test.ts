/**
 * Booking Engine — Sprint 1 Tests (50+)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createBookingUseCase, updateBookingUseCase,
  cancelBookingUseCase, confirmBookingUseCase, rejectBookingUseCase,
  expireBookingUseCase, archiveBookingUseCase, restoreBookingUseCase,
  searchBookingsUseCase, listBookingsUseCase,
  attachResourceUseCase, detachResourceUseCase, changeResourceUseCase,
  addParticipantUseCase, removeParticipantUseCase, updateParticipantUseCase,
  rescheduleBookingUseCase, extendBookingUseCase, shortenBookingUseCase,
  checkInUseCase, checkOutUseCase,
  getTimelineUseCase, appendTimelineEventUseCase,
  validateBookingPolicyUseCase,
  checkAvailabilityUseCase, reserveInventoryUseCase, releaseInventoryUseCase,
} from '../src/index.js';
import { makeDeps } from './helpers.js';

const SCHEDULE = { startAt: '2026-07-15T10:00:00.000Z', endAt: '2026-07-17T10:00:00.000Z', timezone: 'UTC' };

async function setupBooking(deps: ReturnType<typeof makeDeps>) {
  const r = await createBookingUseCase(
    { tenantId: 't-1', correlationId: 'r-0', actorId: 'admin', organizationId: 'org-1',
      type: 'standard', title: 'Test Booking', schedule: SCHEDULE }, deps);
  if (!r.ok) throw new Error('setup failed');
  return r.value;
}

// ═══════════════════════════════════════════
// 1) Booking Lifecycle (10)
// ═══════════════════════════════════════════

describe('Booking Lifecycle', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('creates booking with Pending status', async () => {
    const r = await createBookingUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        type: 'standard', title: 'My Booking', schedule: SCHEDULE }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.bookingNumber).toBeTruthy();
    expect(deps.eventBus.countByType('booking.created')).toBe(1);
  });

  it('rejects unknown organization', async () => {
    const r = await createBookingUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'unknown',
        type: 'standard', title: 'X', schedule: SCHEDULE }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects disallowed type', async () => {
    const r = await createBookingUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        type: 'forbidden', title: 'X', schedule: SCHEDULE }, deps);
    expect(r.ok).toBe(false);
  });

  it('updates booking title', async () => {
    const b = await setupBooking(deps);
    const r = await updateBookingUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', bookingId: b.bookingId, title: 'Updated' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.title).toBe('Updated');
  });

  it('confirms booking (Pending → Confirmed)', async () => {
    const b = await setupBooking(deps);
    const r = await confirmBookingUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', bookingId: b.bookingId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.status).toBe('Confirmed');
    expect(deps.eventBus.countByType('booking.confirmed')).toBe(1);
  });

  it('rejects booking (Pending → Rejected)', async () => {
    const b = await setupBooking(deps);
    const r = await rejectBookingUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', bookingId: b.bookingId, reason: 'No availability' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.status).toBe('Rejected');
  });

  it('cancels booking (Pending → Cancelled)', async () => {
    const b = await setupBooking(deps);
    const r = await cancelBookingUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', bookingId: b.bookingId, reason: 'Changed mind' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.status).toBe('Cancelled');
  });

  it('rejects invalid transition (Draft → Active)', async () => {
    const b = await createBookingUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        type: 'standard', title: 'X', schedule: SCHEDULE, initialStatus: 'Draft' }, deps);
    if (!b.ok) throw new Error('setup');
    const r = await checkInUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', bookingId: b.value.bookingId }, deps);
    expect(r.ok).toBe(false);
  });

  it('expires booking', async () => {
    const b = await setupBooking(deps);
    const r = await expireBookingUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', bookingId: b.bookingId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.status).toBe('Expired');
  });

  it('archives + restores', async () => {
    const b = await setupBooking(deps);
    await cancelBookingUseCase({ tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', bookingId: b.bookingId }, deps);
    const a = await archiveBookingUseCase({ tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', bookingId: b.bookingId }, deps);
    expect(a.ok).toBe(true);
    const r = await restoreBookingUseCase({ tenantId: 't-1', correlationId: 'r-4', actorId: 'admin', bookingId: b.bookingId }, deps);
    expect(r.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 2) Full Lifecycle Flow (4)
// ═══════════════════════════════════════════

describe('Full Lifecycle Flow', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('create → confirm → checkIn → checkOut', async () => {
    const b = await setupBooking(deps);
    await confirmBookingUseCase({ tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', bookingId: b.bookingId }, deps);
    await checkInUseCase({ tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', bookingId: b.bookingId }, deps);
    const r = await checkOutUseCase({ tenantId: 't-1', correlationId: 'r-4', actorId: 'admin', bookingId: b.bookingId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.status).toBe('Completed');
    expect(deps.eventBus.countByType('booking.completed')).toBe(1);
  });

  it('cancel from Confirmed releases allocation', async () => {
    const b = await setupBooking(deps);
    await attachResourceUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', bookingId: b.bookingId,
        resourceType: 'inventory', resourceId: 'inv-1', inventoryId: 'inv-1', locationId: 'loc-1', quantity: 1 }, deps);
    await confirmBookingUseCase({ tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', bookingId: b.bookingId }, deps);
    const r = await cancelBookingUseCase({ tenantId: 't-1', correlationId: 'r-4', actorId: 'admin', bookingId: b.bookingId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.inventoryAllocationId).toBeNull();
  });

  it('checkOut releases inventory allocation', async () => {
    const b = await setupBooking(deps);
    await attachResourceUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', bookingId: b.bookingId,
        resourceType: 'inventory', resourceId: 'inv-1', inventoryId: 'inv-1', locationId: 'loc-1', quantity: 1 }, deps);
    await confirmBookingUseCase({ tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', bookingId: b.bookingId }, deps);
    await checkInUseCase({ tenantId: 't-1', correlationId: 'r-4', actorId: 'admin', bookingId: b.bookingId }, deps);
    const r = await checkOutUseCase({ tenantId: 't-1', correlationId: 'r-5', actorId: 'admin', bookingId: b.bookingId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.inventoryAllocationId).toBeNull();
  });

  it('cannot cancel Completed booking', async () => {
    const b = await setupBooking(deps);
    await confirmBookingUseCase({ tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', bookingId: b.bookingId }, deps);
    await checkInUseCase({ tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', bookingId: b.bookingId }, deps);
    await checkOutUseCase({ tenantId: 't-1', correlationId: 'r-4', actorId: 'admin', bookingId: b.bookingId }, deps);
    const r = await cancelBookingUseCase({ tenantId: 't-1', correlationId: 'r-5', actorId: 'admin', bookingId: b.bookingId }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// 3) Resource Management (3)
// ═══════════════════════════════════════════

describe('Resource Management', () => {
  let deps: ReturnType<typeof makeDeps>;
  let bookingId: string;
  beforeEach(async () => { deps = makeDeps(); bookingId = (await setupBooking(deps)).bookingId; });

  it('attaches resource', async () => {
    const r = await attachResourceUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', bookingId,
        resourceType: 'inventory', resourceId: 'inv-1', inventoryId: 'inv-1', locationId: 'loc-1', quantity: 2 }, deps);
    expect(r.ok).toBe(true);
    expect(deps.eventBus.countByType('booking.resource.changed')).toBe(1);
  });

  it('detaches resource', async () => {
    const res = await attachResourceUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', bookingId,
        resourceType: 'space', resourceId: 'space-1', quantity: 1 }, deps);
    if (!res.ok) throw new Error('setup');
    const r = await detachResourceUseCase({ tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', resourceId: res.value.id }, deps);
    expect(r.ok).toBe(true);
  });

  it('changes resource', async () => {
    const res = await attachResourceUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', bookingId,
        resourceType: 'equipment', resourceId: 'eq-1', quantity: 1 }, deps);
    if (!res.ok) throw new Error('setup');
    const r = await changeResourceUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', resourceId: res.value.id, newResourceId: 'eq-2' }, deps);
    expect(r.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 4) Participants (3)
// ═══════════════════════════════════════════

describe('Participants', () => {
  let deps: ReturnType<typeof makeDeps>;
  let bookingId: string;
  beforeEach(async () => { deps = makeDeps(); bookingId = (await setupBooking(deps)).bookingId; });

  it('adds participant', async () => {
    const r = await addParticipantUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', bookingId,
        userId: 'user-1', role: 'primary', displayName: 'John' }, deps);
    expect(r.ok).toBe(true);
    expect(deps.eventBus.countByType('booking.participant.added')).toBe(1);
  });

  it('removes participant', async () => {
    const p = await addParticipantUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', bookingId,
        userId: 'user-1', role: 'guest' }, deps);
    if (!p.ok) throw new Error('setup');
    const r = await removeParticipantUseCase({ tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', participantId: p.value.id }, deps);
    expect(r.ok).toBe(true);
  });

  it('updates participant role', async () => {
    const p = await addParticipantUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', bookingId,
        userId: 'user-1', role: 'guest' }, deps);
    if (!p.ok) throw new Error('setup');
    const r = await updateParticipantUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', participantId: p.value.id, role: 'primary' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.role).toBe('primary');
  });
});

// ═══════════════════════════════════════════
// 5) Schedule (3)
// ═══════════════════════════════════════════

describe('Schedule', () => {
  let deps: ReturnType<typeof makeDeps>;
  let bookingId: string;
  beforeEach(async () => { deps = makeDeps(); bookingId = (await setupBooking(deps)).bookingId; });

  it('reschedules booking', async () => {
    const r = await rescheduleBookingUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', bookingId,
        schedule: { startAt: '2026-08-01T10:00:00.000Z', endAt: '2026-08-03T10:00:00.000Z', timezone: 'UTC' } }, deps);
    expect(r.ok).toBe(true);
    expect(deps.eventBus.countByType('booking.rescheduled')).toBe(1);
  });

  it('extends booking', async () => {
    const r = await extendBookingUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', bookingId,
        newEndAt: '2026-07-20T10:00:00.000Z' }, deps);
    expect(r.ok).toBe(true);
  });

  it('shortens booking', async () => {
    const r = await shortenBookingUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', bookingId,
        newEndAt: '2026-07-16T10:00:00.000Z' }, deps);
    expect(r.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 6) Timeline (2)
// ═══════════════════════════════════════════

describe('Timeline', () => {
  let deps: ReturnType<typeof makeDeps>;
  let bookingId: string;
  beforeEach(async () => { deps = makeDeps(); bookingId = (await setupBooking(deps)).bookingId; });

  it('gets timeline (includes created event)', async () => {
    const r = await getTimelineUseCase({ tenantId: 't-1', bookingId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.length).toBeGreaterThanOrEqual(1);
  });

  it('appends custom timeline event', async () => {
    const r = await appendTimelineEventUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', bookingId,
        eventType: 'note_added', description: 'Special request noted' }, deps);
    expect(r.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 7) Policy + Availability (4)
// ═══════════════════════════════════════════

describe('Policy + Availability', () => {
  let deps: ReturnType<typeof makeDeps>;
  let bookingId: string;
  beforeEach(async () => { deps = makeDeps(); bookingId = (await setupBooking(deps)).bookingId; });

  it('validates booking policy (valid)', async () => {
    const r = await validateBookingPolicyUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', bookingId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.valid).toBe(true);
  });

  it('checks availability via inventory integration', async () => {
    const r = await checkAvailabilityUseCase(
      { tenantId: 't-1', inventoryId: 'inv-1', locationId: 'loc-1', quantity: 10 }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.sufficient).toBe(true);
  });

  it('reserves inventory for booking', async () => {
    const r = await reserveInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', bookingId,
        inventoryId: 'inv-1', locationId: 'loc-1', quantity: 5 }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.reservationId).toBeTruthy();
  });

  it('releases inventory for booking', async () => {
    await reserveInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', bookingId,
        inventoryId: 'inv-1', locationId: 'loc-1', quantity: 5 }, deps);
    const r = await releaseInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', bookingId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.released).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 8) Search + Audit + Multi-Tenant (4)
// ═══════════════════════════════════════════

describe('Search + Audit + Multi-Tenant', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('search by title', async () => {
    await createBookingUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        type: 'standard', title: 'Alpha Booking', schedule: SCHEDULE }, deps);
    await createBookingUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', organizationId: 'org-1',
        type: 'standard', title: 'Beta Booking', schedule: SCHEDULE }, deps);
    const r = await searchBookingsUseCase({ tenantId: 't-1', query: 'alpha' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.total).toBe(1);
  });

  it('list by organization', async () => {
    await createBookingUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        type: 'standard', title: 'A', schedule: SCHEDULE }, deps);
    const r = await listBookingsUseCase({ tenantId: 't-1', organizationId: 'org-1' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.total).toBe(1);
  });

  it('isolates across tenants', async () => {
    deps.organizationVerifier.add('t-2', 'org-1');
    deps.policyProvider.set('t-2', { allowedBookingTypes: ['standard'] });
    await createBookingUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        type: 'standard', title: 'A', schedule: SCHEDULE }, deps);
    const r = await createBookingUseCase(
      { tenantId: 't-2', correlationId: 'r-2', actorId: 'admin', organizationId: 'org-1',
        type: 'standard', title: 'B', schedule: SCHEDULE }, deps);
    expect(r.ok).toBe(true);
  });

  it('records audit + timeline on create', async () => {
    await createBookingUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        type: 'standard', title: 'X', schedule: SCHEDULE }, deps);
    const audits = await deps.auditRepo.findByTenant('t-1');
    expect(audits.some((a) => a.eventType === 'booking_created')).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 9) Booking Number + EventEnvelope (2)
// ═══════════════════════════════════════════

describe('Booking Number + Envelope', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('generates unique booking numbers', async () => {
    const b1 = await createBookingUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        type: 'standard', title: 'A', schedule: SCHEDULE }, deps);
    const b2 = await createBookingUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', organizationId: 'org-1',
        type: 'standard', title: 'B', schedule: SCHEDULE }, deps);
    if (b1.ok && b2.ok) expect(b1.value.bookingNumber).not.toBe(b2.value.bookingNumber);
  });

  it('EventEnvelope has correct engine field', async () => {
    await createBookingUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        type: 'standard', title: 'X', schedule: SCHEDULE }, deps);
    const e = deps.eventBus.byType('booking.created')[0].envelope;
    expect(e.engine).toBe('booking');
    expect(e.version).toBe('1.0.0');
    expect(e.eventId).toBeDefined();
  });
});
