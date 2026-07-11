/**
 * Booking Engine — Shared Use Case Deps
 */

import type {
  IClock, IIdGenerator, IEventBus,
  IBookingRepository, IBookingResourceRepository, IBookingParticipantRepository,
  IBookingTimelineRepository, IBookingConfirmationRepository,
  IBookingPolicyRefRepository, IBookingAuditRepository,
  IOrganizationVerifier, ICustomDataPolicyProvider, IInventoryIntegration,
} from '../interfaces/index.js';

export interface BookingUseCaseDeps {
  bookingRepo: IBookingRepository;
  resourceRepo: IBookingResourceRepository;
  participantRepo: IBookingParticipantRepository;
  timelineRepo: IBookingTimelineRepository;
  confirmationRepo: IBookingConfirmationRepository;
  policyRefRepo: IBookingPolicyRefRepository;
  auditRepo: IBookingAuditRepository;
  organizationVerifier: IOrganizationVerifier;
  policyProvider: ICustomDataPolicyProvider;
  inventoryIntegration: IInventoryIntegration;
  eventBus: IEventBus;
  idGenerator: IIdGenerator;
  clock: IClock;
}
