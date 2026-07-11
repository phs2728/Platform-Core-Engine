/**
 * CreateAccount UseCase — Enterprise Grade (Sprint 2C-3)
 * 사장님 확립: 모든 상태 변경은 EventEnvelope 발행 + Audit
 */

import {
  Ok,
  Err,
  type Result,
  Email,
  Password,
  validate,
  ValidationError,
  ConflictError,
  type EventEnvelope,
  createEnvelope,
  z,
} from '@platform/core-sdk';
import { recordAudit } from '../../domain/audit.js';
import type {
  IClock,
  IIdGenerator,
  IPasswordHasher,
  IAccountRepository,
  IEventBus,
  IAuditLogRepository,
  IPasswordHistoryRepository,
  AccountRecord,
  IdentityPolicy,
} from '../../interfaces/index.js';

export interface CreateAccountInput {
  email: string;
  password: string;
  phone?: string;
  tenantId: string;
  correlationId: string;
}

export interface CreateAccountOutput {
  accountId: string;
  email: string;
  createdAt: string;
}

export interface CreateAccountDeps {
  accountRepository: IAccountRepository;
  passwordHasher: IPasswordHasher;
  passwordHistoryRepository: IPasswordHistoryRepository;
  idGenerator: IIdGenerator;
  clock: IClock;
  eventBus: IEventBus;
  auditLogRepository: IAuditLogRepository;
  policy: IdentityPolicy;
}

function buildPasswordSchema(policy: IdentityPolicy['password']) {
  let s = z.string().min(policy.minLength).max(1024);
  if (policy.requireUppercase) s = s.regex(/[A-Z]/, 'Need uppercase');
  if (policy.requireLowercase) s = s.regex(/[a-z]/, 'Need lowercase');
  if (policy.requireNumber) s = s.regex(/[0-9]/, 'Need number');
  if (policy.requireSpecial) s = s.regex(/[^A-Za-z0-9]/, 'Need special character');
  return s;
}

export async function createAccountUseCase(
  input: CreateAccountInput,
  deps: CreateAccountDeps,
): Promise<Result<CreateAccountOutput, ValidationError | ConflictError>> {
  const schema = z.object({
    email: Email.schema(),
    password: buildPasswordSchema(deps.policy.password),
  });

  const validation = validate(schema, { email: input.email, password: input.password });
  if (!validation.ok) return validation;

  const normalizedEmail = Email.normalize(validation.value.email);
  const passwordHash = await deps.passwordHasher.hash(validation.value.password);

  const accountId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const passwordExpiresAt = deps.policy.password.expirationDays > 0
    ? new Date(deps.clock.now().getTime() + deps.policy.password.expirationDays * 86_400_000).toISOString()
    : null;

  const account: AccountRecord = {
    id: accountId,
    tenantId: input.tenantId,
    email: normalizedEmail,
    phone: input.phone ?? null,
    passwordHash,
    emailVerified: false,
    phoneVerified: false,
    createdAt: now,
    updatedAt: now,
    lockedUntil: null,
    failedAttempts: 0,
    disabled: false,
    forcePasswordChange: false,
    passwordChangedAt: now,
    passwordExpiresAt,
  };

  try {
    await deps.accountRepository.insert(account);
  } catch {
    return Err(new ConflictError('Email already exists', {
      details: { resource: 'account', email: normalizedEmail },
    }));
  }

  // Password History 저장
  await deps.passwordHistoryRepository.insert({
    id: deps.idGenerator.generate(),
    accountId,
    tenantId: input.tenantId,
    passwordHash,
    changedAt: now,
  });

  // Event
  const envelope: EventEnvelope<{ accountId: string; email: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: accountId,
    occurredAt: now,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'identity',
    eventType: 'account.created',
    schemaRef: 'account.created.v1',
    payload: { accountId, email: normalizedEmail },
  });
  await deps.eventBus.emit(envelope);

  // Audit
  await recordAudit(deps.auditLogRepository, {
    accountId,
    tenantId: input.tenantId,
    eventType: 'account_created',
    metadata: { email: normalizedEmail },
  });

  return Ok({ accountId, email: normalizedEmail, createdAt: now });
}
