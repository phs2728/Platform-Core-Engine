/**
 * Booking Engine — Demo: Full Lifecycle
 */
import {
  createBookingUseCase, attachResourceUseCase, addParticipantUseCase,
  confirmBookingUseCase, checkInUseCase, checkOutUseCase,
  getTimelineUseCase, validateBookingPolicyUseCase,
  InMemoryBookingRepository, InMemoryBookingResourceRepository,
  InMemoryBookingParticipantRepository, InMemoryBookingTimelineRepository,
  InMemoryBookingConfirmationRepository, InMemoryBookingPolicyRefRepository,
  InMemoryBookingAuditRepository,
  InMemoryOrganizationVerifier,
  StaticBookingPolicyProvider, MockInventoryIntegration, InMemoryEventBus,
} from '../src/index.js';

async function main() {
  console.log('═══ Booking Engine — Demo ═══\n');
  const deps = {
    bookingRepo: new InMemoryBookingRepository(),
    resourceRepo: new InMemoryBookingResourceRepository(),
    participantRepo: new InMemoryBookingParticipantRepository(),
    timelineRepo: new InMemoryBookingTimelineRepository(),
    confirmationRepo: new InMemoryBookingConfirmationRepository(),
    policyRefRepo: new InMemoryBookingPolicyRefRepository(),
    auditRepo: new InMemoryBookingAuditRepository(),
    eventBus: new InMemoryEventBus(),
    organizationVerifier: new InMemoryOrganizationVerifier(),
    policyProvider: new StaticBookingPolicyProvider(),
    inventoryIntegration: new MockInventoryIntegration(),
    idGenerator: { generate: () => `demo-${Math.random().toString(36).slice(2,8)}` },
    clock: { now: () => new Date('2026-07-11T08:00:00.000Z') },
  };
  deps.organizationVerifier.add('demo', 'org-1');
  deps.policyProvider.set('demo', { allowedBookingTypes: ['standard'] });
  deps.inventoryIntegration.setAvailability('demo', 'inv-1', 'loc-1', 10);
  const u = <T>(r: { ok: boolean; value?: T; error?: unknown }): T => {
    if (!r.ok) throw new Error(String((r.error as { message?: string })?.message ?? 'err'));
    return r.value as T;
  };

  console.log('▶ 1) Create Booking');
  const b = u(await createBookingUseCase(
    { tenantId: 'demo', correlationId: 'd1', actorId: 'admin', organizationId: 'org-1',
      type: 'standard', title: 'Conference Room A',
      schedule: { startAt: '2026-07-15T09:00:00.000Z', endAt: '2026-07-15T17:00:00.000Z', timezone: 'UTC' } }, deps));
  console.log(`  ✓ bookingId=${b.bookingId} number=${b.bookingNumber}\n`);

  console.log('▶ 2) Attach Resource (inventory)');
  u(await attachResourceUseCase(
    { tenantId: 'demo', correlationId: 'd2', actorId: 'admin', bookingId: b.bookingId,
      resourceType: 'inventory', resourceId: 'inv-1', inventoryId: 'inv-1', locationId: 'loc-1', quantity: 1 }, deps));
  console.log('  ✓ resource attached\n');

  console.log('▶ 3) Add Participant');
  u(await addParticipantUseCase(
    { tenantId: 'demo', correlationId: 'd3', actorId: 'admin', bookingId: b.bookingId,
      userId: 'user-1', role: 'primary', displayName: 'Alice' }, deps));
  console.log('  ✓ participant added\n');

  console.log('▶ 4) Validate Policy');
  const pol = u(await validateBookingPolicyUseCase(
    { tenantId: 'demo', correlationId: 'd4', actorId: 'admin', bookingId: b.bookingId }, deps));
  console.log(`  ✓ valid=${pol.valid}\n`);

  console.log('▶ 5) Confirm Booking');
  u(await confirmBookingUseCase(
    { tenantId: 'demo', correlationId: 'd5', actorId: 'admin', bookingId: b.bookingId }, deps));
  console.log('  ✓ confirmed\n');

  console.log('▶ 6) Check In');
  u(await checkInUseCase(
    { tenantId: 'demo', correlationId: 'd6', actorId: 'admin', bookingId: b.bookingId }, deps));
  console.log('  ✓ checked in\n');

  console.log('▶ 7) Check Out');
  u(await checkOutUseCase(
    { tenantId: 'demo', correlationId: 'd7', actorId: 'admin', bookingId: b.bookingId }, deps));
  console.log('  ✓ checked out (completed)\n');

  console.log('▶ 8) Get Timeline');
  const tl = u(await getTimelineUseCase({ tenantId: 'demo', bookingId: b.bookingId }, deps));
  console.log(`  ${tl.length} entries:`);
  for (const e of tl) console.log(`    ${e.eventType}: ${e.description}`);

  console.log('\n═══ Events Emitted ═══');
  const counts = new Map<string, number>();
  for (const r of deps.eventBus.emitted) counts.set(r.envelope.eventType, (counts.get(r.envelope.eventType) ?? 0) + 1);
  for (const [t, c] of [...counts.entries()].sort()) console.log(`  ${t}: ${c}`);
  console.log('\n═══ Demo Complete ═══');
}
main().catch((e) => { console.error(e); process.exit(1); });
