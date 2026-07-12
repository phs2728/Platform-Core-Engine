/**
 * UpdatePreference UseCase
 *
 * 사용자 환경설정 수정 (theme, notifications, marketingConsent, privacy)
 * language와 timezone은 별도 UseCase(changeLanguage/changeTimezone) 사용.
 */

import {
  Ok,
  Err,
  type Result,
  ValidationError,
  NotFoundError,
  type EventEnvelope,
  createEnvelope,
  z,
} from '@platform/core-sdk';
import { recordAudit } from '../domain/audit.js';
import type {
  IClock,
  IIdGenerator,
  IEventBus,
  IUserRepository,
  IAuditLogRepository,
  UserPreference,
  Theme,
  PrivacyLevel,
} from '../interfaces/index.js';

export interface UpdatePreferenceInput {
  tenantId: string;
  userId: string;
  theme?: Theme;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  marketingConsent?: boolean;
  privacy?: PrivacyLevel;
  correlationId: string;
}

export interface UpdatePreferenceDeps {
  userRepository: IUserRepository;
  idGenerator: IIdGenerator;
  clock: IClock;
  eventBus: IEventBus;
  auditLogRepository: IAuditLogRepository;
}

const updatePreferenceSchema = z.object({
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  marketingConsent: z.boolean().optional(),
  privacy: z.enum(['public', 'private', 'friends']).optional(),
});

export async function updatePreferenceUseCase(
  input: UpdatePreferenceInput,
  deps: UpdatePreferenceDeps,
): Promise<Result<UserPreference, ValidationError | NotFoundError>> {
  const validation = updatePreferenceSchema.safeParse(input);
  if (!validation.success) {
    return Err(new ValidationError('Invalid preference input', { details: { issues: validation.error.errors } }));
  }

  const user = await deps.userRepository.findById(input.tenantId, input.userId);
  if (!user) {
    return Err(new NotFoundError('User not found', { details: { userId: input.userId } }));
  }

  const updatedPreference: UserPreference = {
    ...user.preference,
    ...(input.theme !== undefined ? { theme: input.theme } : {}),
    ...(input.emailNotifications !== undefined ? { emailNotifications: input.emailNotifications } : {}),
    ...(input.pushNotifications !== undefined ? { pushNotifications: input.pushNotifications } : {}),
    ...(input.smsNotifications !== undefined ? { smsNotifications: input.smsNotifications } : {}),
    ...(input.marketingConsent !== undefined ? { marketingConsent: input.marketingConsent } : {}),
    ...(input.privacy !== undefined ? { privacy: input.privacy } : {}),
  };

  const now = deps.clock.now().toISOString();
  await deps.userRepository.update(input.userId, { preference: updatedPreference, updatedAt: now });

  // Event
  const envelope: EventEnvelope<{ userId: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: input.userId,
    occurredAt: now,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'user',
    eventType: 'user.preference.updated',
    schemaRef: 'user.preference.updated.v1',
    payload: { userId: input.userId },
  });
  await deps.eventBus.emit(envelope);

  await recordAudit(deps.auditLogRepository, {
    userId: input.userId,
    tenantId: input.tenantId,
    eventType: 'user_preference_updated',
    metadata: {
      fields: Object.keys(input).filter((k) => k !== 'tenantId' && k !== 'userId' && k !== 'correlationId'),
    },
  });

  return Ok(updatedPreference);
}
