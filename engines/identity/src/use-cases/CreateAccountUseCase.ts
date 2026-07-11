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
} from '@platform/core-sdk';
import { recordAudit } from '../domain/audit.js';
import type {
  IClock,
  IIdGenerator,
  IPasswordHasher,
  IAccountRepository,
  IEventBus,
  IAuditLogRepository,
} from '../interfaces/index.js';

export interface CreateAccountInput {
  email: string;
  password: string;
  tenantId: string;
  correlationId: string;
}

export interface CreateAccountOutput {
  accountId: string;
  email: string;
  createdAt: string;
}

export interface AccountCreatedPayload {
  accountId: string;
  email: string;
  createdAt: string;
}

export interface CreateAccountDeps {
  accountRepository: IAccountRepository;
  passwordHasher: IPasswordHasher;
  idGenerator: IIdGenerator;
  clock: IClock;
  eventBus: IEventBus;
  auditLogRepository: IAuditLogRepository;
}

const createAccountSchema = {
  email: { parse: (v: unknown) => v },
};

import { z } from 'zod';

const schema = z.object({
  email: Email.schema(),
  password: Password.withPolicy({
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
  }),
});

export async function createAccountUseCase(
  input: CreateAccountInput,
  deps: CreateAccountDeps,
): Promise<Result<CreateAccountOutput, ValidationError | ConflictError>> {
  // 1. Schema 검증
  const validation = validate(schema, {
    email: input.email,
    password: input.password,
  });
  if (!validation.ok) return validation;

  const { email, password } = validation.value;

  // 2. 이메일 중복 체크
  const normalizedEmail = Email.normalize(email);
  const existing = await deps.accountRepository.findByEmail(input.tenantId, normalizedEmail);
  if (existing.ok) {
    return Err(
      new ConflictError('Email already exists', {
        details: { resource: 'account', email: normalizedEmail },
      }),
    );
  }

  // 3. Password Hash
  const passwordHash = await deps.passwordHasher.hash(password);

  // 4. Account 생성
  const accountId = deps.idGenerator.generate();
  const createdAt = deps.clock.now().toISOString();

  await deps.accountRepository.insert({
    id: accountId,
    tenantId: input.tenantId,
    email: normalizedEmail,
    passwordHash,
    createdAt,
    updatedAt: createdAt,
  });

  // 5. Event
  const envelope: EventEnvelope<AccountCreatedPayload> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: accountId,
    occurredAt: createdAt,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'identity',
    eventType: 'account.created',
    schemaRef: 'account.created.v1',
    payload: { accountId, email: normalizedEmail, createdAt },
  });
  await deps.eventBus.emit(envelope);

  return Ok({ accountId, email: normalizedEmail, createdAt });
}
