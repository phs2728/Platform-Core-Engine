/**
 * Email Login Use Case (Sprint 2C-1 MVP)
 *
 * - Email/Password 검증
 * - Password verify
 * - Session 생성
 * - Event: auth.login.success / auth.login.failure
 */

import { z } from 'zod';
import {
  Ok,
  Err,
  type Result,
  Email,
  AuthenticationError,
  NotFoundError,
  type EventEnvelope,
  createEnvelope,
} from '@platform/core-sdk';
import type {
  IClock,
  IIdGenerator,
  IPasswordHasher,
  ISessionSigner,
  IAccountRepository,
  ISessionRepository,
  IEventBus,
  SessionRecord,
} from '../interfaces/index.js';

export interface LoginInput {
  email: string;
  password: string;
  tenantId: string;
  correlationId: string;
}

export interface LoginOutput {
  accountId: string;
  sessionToken: string;
  expiresAt: string;
}

export interface LoginSuccessPayload {
  accountId: string;
  sessionId: string;
  loginAt: string;
}

export interface LoginFailurePayload {
  email: string;
  reason: string;
  failedAt: string;
}

const sessionDurationHours = 24; // 사장님 확립 — Sprint 후속에서 configurable

const loginSchema = z.object({
  email: Email.schema(),
  password: z.string().min(1),
});

export async function loginWithEmailUseCase(
  input: LoginInput,
  deps: LoginDeps,
): Promise<Result<LoginOutput, NotFoundError | AuthenticationError>> {
  // 1. Schema 검증
  const parse = loginSchema.safeParse({ email: input.email, password: input.password });
  if (!parse.success) {
    return Err(new AuthenticationError('Invalid input', { details: { reason: 'invalid_credentials' } }));
  }

  const normalizedEmail = Email.normalize(input.email);

  // 2. Account 조회
  const accountResult = await deps.accountRepository.findByEmail(input.tenantId, normalizedEmail);
  if (!accountResult.ok) {
    // 존재하지 않아도 같은 에러 (계정 enumeration 방지)
    return Err(new AuthenticationError('Invalid credentials', { details: { reason: 'invalid_credentials' } }));
  }
  const account = accountResult.value;

  // 3. Password verify
  const passwordOk = await deps.passwordHasher.verify(input.password, account.passwordHash);
  if (!passwordOk) {
    // Login failure event
    const failureEnvelope: EventEnvelope<LoginFailurePayload> = createEnvelope({
      eventId: deps.idGenerator.generate(),
      aggregateId: account.id,
      occurredAt: deps.clock.now().toISOString(),
      tenantId: input.tenantId,
      correlationId: input.correlationId,
      causationId: '',
      engine: 'identity',
      eventType: 'auth.login.failure',
      schemaRef: 'auth.login.failure.v1',
      payload: {
        email: normalizedEmail,
        reason: 'invalid_credentials',
        failedAt: deps.clock.now().toISOString(),
      },
    });
    await deps.eventBus.emit(failureEnvelope);

    return Err(new AuthenticationError('Invalid credentials', { details: { reason: 'invalid_credentials' } }));
  }

  // 4. Session 생성
  const sessionId = deps.idGenerator.generate();
  const issuedAt = deps.clock.now();
  const expiresAt = new Date(issuedAt.getTime() + sessionDurationHours * 3600 * 1000);

  const sessionToken = await deps.sessionSigner.sign({
    accountId: account.id,
    sessionId,
    tenantId: input.tenantId,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  const sessionRecord: SessionRecord = {
    id: sessionId,
    accountId: account.id,
    tenantId: input.tenantId,
    token: sessionToken,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
  await deps.sessionRepository.insert(sessionRecord);

  // 5. Login success event
  const successEnvelope: EventEnvelope<LoginSuccessPayload> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: account.id,
    occurredAt: issuedAt.toISOString(),
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'identity',
    eventType: 'auth.login.success',
    schemaRef: 'auth.login.success.v1',
    payload: {
      accountId: account.id,
      sessionId,
      loginAt: issuedAt.toISOString(),
    },
  });
  await deps.eventBus.emit(successEnvelope);

  return Ok({
    accountId: account.id,
    sessionToken,
    expiresAt: expiresAt.toISOString(),
  });
}

export interface LoginDeps {
  accountRepository: IAccountRepository;
  passwordHasher: IPasswordHasher;
  sessionSigner: ISessionSigner;
  sessionRepository: ISessionRepository;
  idGenerator: IIdGenerator;
  clock: IClock;
  eventBus: IEventBus;
}
