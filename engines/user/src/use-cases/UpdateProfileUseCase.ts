/**
 * UpdateProfile UseCase
 *
 * 사용자 상세 프로필 수정 (bio, gender, birthDate, nationality, occupation, company, website, socialLinks)
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
  UserProfile,
  Gender,
  SocialLinks,
} from '../interfaces/index.js';

export interface UpdateProfileInput {
  tenantId: string;
  userId: string;
  bio?: string | null;
  gender?: Gender | null;
  birthDate?: string | null;
  nationality?: string | null;
  occupation?: string | null;
  company?: string | null;
  website?: string | null;
  socialLinks?: Partial<SocialLinks>;
  correlationId: string;
}

export interface UpdateProfileDeps {
  userRepository: IUserRepository;
  idGenerator: IIdGenerator;
  clock: IClock;
  eventBus: IEventBus;
  auditLogRepository: IAuditLogRepository;
}

const updateProfileSchema = z.object({
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  bio: z.string().max(500).nullable().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).nullable().optional(),
  birthDate: z.string().nullable().optional(),
  nationality: z.string().max(2).nullable().optional(),
  occupation: z.string().max(100).nullable().optional(),
  company: z.string().max(100).nullable().optional(),
  website: z.string().max(500).nullable().optional(),
});

export async function updateProfileUseCase(
  input: UpdateProfileInput,
  deps: UpdateProfileDeps,
): Promise<Result<UserProfile, ValidationError | NotFoundError>> {
  // Validate
  const validation = updateProfileSchema.safeParse(input);
  if (!validation.success) {
    return Err(new ValidationError('Invalid profile input', { details: { issues: validation.error.errors } }));
  }

  // Find user
  const user = await deps.userRepository.findById(input.tenantId, input.userId);
  if (!user) {
    return Err(new NotFoundError('User not found', { details: { userId: input.userId } }));
  }

  // Merge profile
  const updatedProfile: UserProfile = {
    ...user.profile,
    ...(input.bio !== undefined ? { bio: input.bio } : {}),
    ...(input.gender !== undefined ? { gender: input.gender } : {}),
    ...(input.birthDate !== undefined ? { birthDate: input.birthDate } : {}),
    ...(input.nationality !== undefined ? { nationality: input.nationality } : {}),
    ...(input.occupation !== undefined ? { occupation: input.occupation } : {}),
    ...(input.company !== undefined ? { company: input.company } : {}),
    ...(input.website !== undefined ? { website: input.website } : {}),
    ...(input.socialLinks !== undefined
      ? { socialLinks: { ...user.profile.socialLinks, ...input.socialLinks } }
      : {}),
  };

  const now = deps.clock.now().toISOString();
  await deps.userRepository.update(input.userId, { profile: updatedProfile, updatedAt: now });

  // Event
  const envelope: EventEnvelope<{ userId: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: input.userId,
    occurredAt: now,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'user',
    eventType: 'user.profile.updated',
    schemaRef: 'user.profile.updated.v1',
    payload: { userId: input.userId },
  });
  await deps.eventBus.emit(envelope);

  // Audit
  await recordAudit(deps.auditLogRepository, {
    userId: input.userId,
    tenantId: input.tenantId,
    eventType: 'user_profile_updated',
    metadata: { fields: Object.keys(input).filter((k) => k !== 'tenantId' && k !== 'userId' && k !== 'correlationId') },
  });

  return Ok(updatedProfile);
}
