/**
 * Create Account Use Case (Sprint 2C-1 MVP)
 *
 * 사장님 Platform Owner 확립 (2026-07-11):
 * 범위 - Email 기반 Identity MVP
 * - Account 생성
 * - Email 로그인
 * - Password Hash
 * - Session 생성
 * - Logout
 *
 * 미구범:
 * - OAuth, MFA, Phone Login, Passkey, Device Trust, Social Login
 */

import { z } from 'zod';
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
import type { IClock } from '../interfaces/index.js';
import type { IIdGenerator } from '../interfaces/index.js';
import type { IPasswordHasher } from '../interfaces/index.js';
import type { IAccountRepository } from '../interfaces/index.js';
import type { IEventBus } from '../interfaces/index.js';

/**
 * CreateAccount Input
 */
export interface CreateAccountInput {
  email: string;
  password: string;
  tenantId: string;
  correlationId: string;
}

/**
 * CreateAccount Output
 */
export interface CreateAccountOutput {
  accountId: string;
  email: string;
  createdAt: string;
}

/**
 * Event Payload: Account Created
 */
export interface AccountCreatedPayload {
  accountId: string;
  email: string;
  createdAt: string;
}

const createAccountSchema = z.object({
  email: Email.schema(),
  password: Password.withPolicy({
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
  }),
});

/**
 * CreateAccount Use Case
 *
 * 헌법 §C-14 (Policy Injection) 준수.
 * Result<T, E> 패턴.
 * EventEnvelope 발행 (account.created).
 */
export async function createAccountUseCase(
  input: CreateAccountInput,
  deps: CreateAccountDeps,
): Promise<Result<CreateAccountOutput, ValidationError | ConflictError>> {
  // 1. Schema 검증
  const validation = validate(createAccountSchema, {
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

  // 5. Event 발행 (account.created) — Core SDK EventEnvelope
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

  // 6. Result 반환
  return Ok({ accountId, email: normalizedEmail, createdAt });
}

export interface CreateAccountDeps {
  accountRepository: IAccountRepository;
  passwordHasher: IPasswordHasher;
  idGenerator: IIdGenerator;
  clock: IClock;
  eventBus: IEventBus;
}
