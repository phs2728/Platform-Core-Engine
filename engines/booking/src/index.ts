/**
 * Booking Engine — Public API
 *
 * 사장님 확립 (2026-07-11) Phase 5 — Booking Lifecycle Engine.
 */

export {
  type Result, Ok, Err,
  ValidationError, NotFoundError, ConflictError,
  type EventEnvelope, createEnvelope, z,
} from '@platform/core-sdk';

export type {
  Booking, BookingResource, BookingParticipant, BookingTimelineEntry,
  BookingConfirmation, BookingPolicyReference,
  BookingStatus, ParticipantRole, TimelineEventType,
  DateTimeRange, BookingNumber,
  BookingSearchCriteria, BookingSearchResult,
  BookingAuditRecord, BookingAuditEventType,
} from './interfaces/index.js';

export type {
  IClock, IIdGenerator, IEventBus,
  IOrganizationVerifier, ICustomDataPolicyProvider, IInventoryIntegration,
  IBookingRepository, IBookingResourceRepository, IBookingParticipantRepository,
  IBookingTimelineRepository, IBookingConfirmationRepository,
  IBookingPolicyRefRepository, IBookingAuditRepository,
} from './interfaces/index.js';

export {
  createBookingUseCase, updateBookingUseCase,
  cancelBookingUseCase, confirmBookingUseCase, rejectBookingUseCase,
  expireBookingUseCase, archiveBookingUseCase, restoreBookingUseCase,
  searchBookingsUseCase, listBookingsUseCase,
  type CreateBookingInput,
} from './use-cases/BookingLifecycleUseCases.js';

export {
  attachResourceUseCase, detachResourceUseCase, changeResourceUseCase,
  addParticipantUseCase, removeParticipantUseCase, updateParticipantUseCase,
  rescheduleBookingUseCase, extendBookingUseCase, shortenBookingUseCase,
  checkInUseCase, checkOutUseCase,
  getTimelineUseCase, appendTimelineEventUseCase,
  validateBookingPolicyUseCase,
  checkAvailabilityUseCase, reserveInventoryUseCase, releaseInventoryUseCase,
} from './use-cases/ResourceScheduleCheckInUseCases.js';

export type { BookingUseCaseDeps } from './use-cases/types.js';

// In-Memory Repositories + Host Adapters
export {
  InMemoryBookingRepository, InMemoryBookingResourceRepository,
  InMemoryBookingParticipantRepository, InMemoryBookingTimelineRepository,
  InMemoryBookingConfirmationRepository, InMemoryBookingPolicyRefRepository,
  InMemoryBookingAuditRepository,
} from './infrastructure/InMemoryRepositories.js';

export {
  InMemoryOrganizationVerifier,
  StaticBookingPolicyProvider,
  MockInventoryIntegration,
  InMemoryEventBus,
  type RecordedEnvelope,
} from './infrastructure/hostAdapters.js';
