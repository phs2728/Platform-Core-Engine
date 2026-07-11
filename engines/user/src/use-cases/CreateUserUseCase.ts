/**
 * CreateUser UseCase
 *
 * Identity Engine에서 account.created Event 발행 시
 * User Engine이 사용자 엔티티를 생성한다.
 *
 * 사장님 확립:
 * "User Engine은 '사람'을 관리한다."
 */

import {
  Ok,
  Err,
  type Result,
  ValidationError,
  ConflictError,
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
  User,
  UserProfile,
  UserPreference,
  Language,
  Timezone,
} from '../interfaces/index.js';
import { DEFAULT_PROFILE, DEFAULT_PREFERENCE } from '../interfaces/index.js';

// ═══════════════════════════════════════════
// Input / Output / Deps
// ═══════════════════════════════════════════

export interface CreateUserInput {
  tenantId: string;
  /** Identity Engine Account ID */
  identityId: string;
  displayName: string;
  nickname?: string;
  language?: Language;
  timezone?: Timezone;
  /** Optional email reference (from Identity Engine) */
  email?: string;
  emailVerified?: boolean;
  /** Optional phone reference */
  phone?: string;
  phoneVerified?: boolean;
  correlationId: string;
}

export interface CreateUserOutput {
  userId: string;
  identityId: string;
  createdAt: string;
}

export interface CreateUserDeps {
  userRepository: IUserRepository;
  idGenerator: IIdGenerator;
  clock: IClock;
  eventBus: IEventBus;
  auditLogRepository: IAuditLogRepository;
}

// ═══════════════════════════════════════════
// Validation
// ═══════════════════════════════════════════

const createUserSchema = z.object({
  tenantId: z.string().min(1),
  identityId: z.string().min(1),
  displayName: z.string().min(1).max(100),
  nickname: z.string().max(50).optional(),
  language: z.string().min(2).max(10).optional(),
  timezone: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
});

// ═══════════════════════════════════════════
// UseCase
// ═══════════════════════════════════════════

export async function createUserUseCase(
  input: CreateUserInput,
  deps: CreateUserDeps,
): Promise<Result<CreateUserOutput, ValidationError | ConflictError>> {
  // 1. Validation
  const validation = createUserSchema.safeParse({
    tenantId: input.tenantId,
    identityId: input.identityId,
    displayName: input.displayName,
    ...(input.nickname !== undefined ? { nickname: input.nickname } : {}),
    ...(input.language !== undefined ? { language: input.language } : {}),
    ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
    ...(input.email !== undefined ? { email: input.email } : {}),
    ...(input.phone !== undefined ? { phone: input.phone } : {}),
  });
  if (!validation.success) {
    return Err(new ValidationError('Invalid input', { details: { issues: validation.error.errors } }));
  }

  // 2. Duplicate check (identityId)
  const existing = await deps.userRepository.findByIdentityId(
    input.tenantId,
    input.identityId,
  );
  if (existing) {
    return Err(new ConflictError('User already exists for this identity', {
      details: { identityId: input.identityId },
    }));
  }

  // 3. Create User entity
  const userId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();

  const profile: UserProfile = { ...DEFAULT_PROFILE };
  const preference: UserPreference = {
    ...DEFAULT_PREFERENCE,
    ...(input.language !== undefined ? { language: input.language } : {}),
    ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
  };

  const user: User = {
    id: userId,
    tenantId: input.tenantId,
    identityId: input.identityId,
    displayName: input.displayName,
    ...(input.nickname !== undefined ? { nickname: input.nickname } : { nickname: null }),
    avatar: null,
    language: input.language ?? 'en',
    timezone: input.timezone ?? 'UTC',
    status: 'active',
    tags: [],
    emailReference: input.email !== undefined
      ? { email: input.email, verified: input.emailVerified ?? false }
      : null,
    phoneReference: input.phone !== undefined
      ? { phone: input.phone, verified: input.phoneVerified ?? false }
      : null,
    profile,
    preference,
    metadata: {},
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  await deps.userRepository.insert(user);

  // 4. Event
  const envelope: EventEnvelope<{ userId: string; identityId: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: userId,
    occurredAt: now,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'user',
    eventType: 'user.created',
    schemaRef: 'user.created.v1',
    payload: { userId, identityId: input.identityId },
  });
  await deps.eventBus.emit(envelope);

  // 5. Audit
  await recordAudit(deps.auditLogRepository, {
    userId,
    tenantId: input.tenantId,
    eventType: 'user_created',
    metadata: {
      identityId: input.identityId,
      displayName: input.displayName,
      ...(input.email !== undefined ? { email: input.email } : {}),
    },
  });

  return Ok({ userId, identityId: input.identityId, createdAt: now });
}
