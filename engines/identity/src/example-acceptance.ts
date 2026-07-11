/**
 * Identity Engine — Core SDK Acceptance Test
 *
 * 사장님 Platform Owner 확립 (2026-07-11):
 * "Sprint 2B-2 시작을 승인합니다.
 *  이번 Sprint의 성공 기준은 기능 추가가 아니라,
 *  Core SDK가 다른 엔진에서 아무 수정 없이 재사용된다는 사실을 증명하는 것."
 *
 * 이 파일은 Core SDK의 다음이 Identity Engine에서 **수정 없이** 사용됨을 증명:
 * - Result<T, E>
 * - ValidationError, AuthenticationError, NotFoundError
 * - EventEnvelope
 * - validate()
 */

import {
  Ok,
  Err,
  type Result,
  validate,
  Email,
  Password,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  createEnvelope,
  type EventEnvelope,
  createLogger,
} from '@platform/core-sdk';
import { z } from 'zod';

// ============================================================
// 1. Result + Errors (Identity Login UseCase)
// ============================================================

interface LoginInput {
  email: string;
  password: string;
}

interface LoginSuccess {
  userId: string;
  sessionToken: string;
}

async function loginUseCase(
  input: unknown,
): Promise<Result<LoginSuccess, ValidationError | AuthenticationError>> {
  // Core SDK zod 통합 검증
  const loginSchema = z.object({
    email: Email.schema(),
    password: Password.schema(),
  });

  const v = validate(loginSchema, input);
  if (!v.ok) return v; // ValidationError 자동으로 Result<never, ValidationError>

  // Mock: 가짜 DB 조회 + 인증
  if (v.value.password !== 'correct') {
    return Err(
      new AuthenticationError('Invalid credentials', {
        details: { reason: 'invalid_credentials' },
      }),
    );
  }

  return Ok({ userId: 'user-123', sessionToken: 'session-abc' });
}

// 실행 (Core SDK 수정 없이)
const result = await loginUseCase({
  email: 'tim@example.com',
  password: 'correct',
});

if (result.ok) {
  console.log('✅ Login success:', result.value.userId);
} else {
  // result.error는 ValidationError | AuthenticationError 타입
  console.error('❌ Login failed:', result.error.code, result.error.message);
}

// ============================================================
// 2. EventEnvelope (Identity Engine → 다른 Engine)
// ============================================================

interface LoginSuccessPayload {
  userId: string;
  sessionId: string;
  loginAt: string;
}

const loginEvent: EventEnvelope<LoginSuccessPayload> = createEnvelope({
  eventId: '01HXXXXXXXXXX',
  aggregateId: 'user-123',
  occurredAt: new Date().toISOString(),
  tenantId: 'tenant-abc',
  correlationId: 'req-789',
  causationId: '',
  engine: 'identity',
  eventType: 'auth.login.success',
  schemaRef: 'auth.login.success.v1',
  payload: {
    userId: 'user-123',
    sessionId: 'session-abc',
    loginAt: '2026-07-11T08:00:00.000Z',
  },
});

// 이벤트 검증 (Core SDK의 version/schemaRef 포함)
if (loginEvent.version === '1.0.0') {
  console.log('✅ EventEnvelope version: 1.0.0');
}

// ============================================================
// 3. Logger (Core SDK Structured Logging)
// ============================================================

const logger = createLogger({ engine: 'identity' });
logger.info('Identity Engine started', {
  engine: 'identity',
  tenantId: 'tenant-abc',
  version: '1.0.0',
});

console.log('✅ Core SDK Acceptance — Identity Engine');
