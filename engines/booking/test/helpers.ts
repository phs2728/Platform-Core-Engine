/**
 * Test fixtures — Booking Engine
 */
import type { BookingUseCaseDeps } from '../src/use-cases/types.js';
import {
  InMemoryBookingRepository, InMemoryBookingResourceRepository,
  InMemoryBookingParticipantRepository, InMemoryBookingTimelineRepository,
  InMemoryBookingConfirmationRepository, InMemoryBookingPolicyRefRepository,
  InMemoryBookingAuditRepository,
  InMemoryOrganizationVerifier,
  StaticBookingPolicyProvider, MockInventoryIntegration, InMemoryEventBus,
} from '../src/index.js';

export function makeClock() {
  let o = 0;
  return { now: () => new Date(new Date('2026-07-11T08:00:00.000Z').getTime() + o++ * 1000) };
}

export function makeDeps(): BookingUseCaseDeps & {
  bookingRepo: InMemoryBookingRepository;
  resourceRepo: InMemoryBookingResourceRepository;
  participantRepo: InMemoryBookingParticipantRepository;
  timelineRepo: InMemoryBookingTimelineRepository;
  confirmationRepo: InMemoryBookingConfirmationRepository;
  policyRefRepo: InMemoryBookingPolicyRefRepository;
  auditRepo: InMemoryBookingAuditRepository;
  organizationVerifier: InMemoryOrganizationVerifier;
  policyProvider: StaticBookingPolicyProvider;
  inventoryIntegration: MockInventoryIntegration;
  eventBus: InMemoryEventBus;
  idGenerator: { generate(): string };
  clock: { now(): Date };
} {
  const bookingRepo = new InMemoryBookingRepository();
  const resourceRepo = new InMemoryBookingResourceRepository();
  const participantRepo = new InMemoryBookingParticipantRepository();
  const timelineRepo = new InMemoryBookingTimelineRepository();
  const confirmationRepo = new InMemoryBookingConfirmationRepository();
  const policyRefRepo = new InMemoryBookingPolicyRefRepository();
  const auditRepo = new InMemoryBookingAuditRepository();
  const eventBus = new InMemoryEventBus();
  const organizationVerifier = new InMemoryOrganizationVerifier();
  const policyProvider = new StaticBookingPolicyProvider();
  policyProvider.set('t-1', { allowedBookingTypes: ['standard', 'group', 'recurring'] });
  organizationVerifier.add('t-1', 'org-1');
  const inventoryIntegration = new MockInventoryIntegration();
  inventoryIntegration.setAvailability('t-1', 'inv-1', 'loc-1', 100);

  let idCounter = 0;
  return {
    bookingRepo, resourceRepo, participantRepo, timelineRepo,
    confirmationRepo, policyRefRepo, auditRepo, eventBus,
    organizationVerifier, policyProvider, inventoryIntegration,
    idGenerator: { generate: () => `id-${Date.now()}-${++idCounter}-${Math.floor(Math.random()*1e6).toString(36)}` },
    clock: makeClock(),
  };
}
