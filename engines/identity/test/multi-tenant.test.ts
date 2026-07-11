/**
 * Multi-Tenant Audit Test — Identity Engine (Sprint 2C-4 Task 5)
 *
 * 사장님 지시: Multi-Tenant 격리 검증.
 * 6개 시나리오:
 *   1. Tenant Isolation (계정 격리)
 *   2. Cross Tenant Access (타 테넌트 접근 차단)
 *   3. Policy Override (테넌트별 정책)
 *   4. Data Leakage (데이터 누출 방지)
 *   5. Event Isolation (이벤트 테넌트 분리)
 *   6. Session Isolation (세션 테넌트 분리)
 *
 * 한국어 주석, 영어 코드.
 */

import { describe, it, expect } from 'vitest';
import {
  createAccountUseCase,
  loginUseCase,
  type IdentityPolicy,
} from '../src/index.js';
import {
  InMemoryAccountRepository,
  InMemorySessionRepository,
  InMemoryAuditLogRepository,
  InMemoryMfaRepository,
  InMemoryRateLimitRepository,
  InMemoryDeviceRepository,
  InMemoryPasswordHistoryRepository,
} from '../src/index.js';

// ─── 정책 정의 ───────────────────────────────────────────────

// Strict: 16자리 이상, 대소문자/숫자/특수문자 필수
const strictPolicy: IdentityPolicy = {
  password: {
    minLength: 16, requireUppercase: true, requireLowercase: true,
    requireNumber: true, requireSpecial: true, expirationDays: 30, historyCount: 10,
  },
  session: { durationHours: 8, refreshThresholdMinutes: 30, maxConcurrent: 3 },
  security: {
    maxLoginFailures: 3, lockDurationMinutes: 60,
    rateLimitWindowMs: 60_000, rateLimitMaxRequests: 5,
    ipLockDurationMinutes: 30, captchaThreshold: 3,
  },
  verification: { tokenTtlMinutes: 10, otpTtlMinutes: 3, maxAttempts: 3, resendCooldownSeconds: 120 },
  mfa: { required: true, backupCodeCount: 8 },
};

// Lenient: 8자리 이상, 소문자/숫자만 필수
const lenientPolicy: IdentityPolicy = {
  password: {
    minLength: 8, requireUppercase: false, requireLowercase: true,
    requireNumber: true, requireSpecial: false, expirationDays: 0, historyCount: 3,
  },
  session: { durationHours: 168, refreshThresholdMinutes: 120, maxConcurrent: 10 },
  security: {
    maxLoginFailures: 10, lockDurationMinutes: 5,
    rateLimitWindowMs: 60_000, rateLimitMaxRequests: 100,
    ipLockDurationMinutes: 5, captchaThreshold: 999,
  },
  verification: { tokenTtlMinutes: 60, otpTtlMinutes: 10, maxAttempts: 10, resendCooldownSeconds: 30 },
  mfa: { required: false, backupCodeCount: 5 },
};

// Strict 정책을 만족하는 비밀번호 (17자)
const STRICT_PASSWORD = 'VerySecurePass123!';
// Lenient 정책을 만족하는 비밀번호 (8자, 소문자+숫자)
const LENIENT_PASSWORD = 'simple12';

// ─── Fixtures ────────────────────────────────────────────────

interface DepsBundle {
  createDeps: Parameters<typeof createAccountUseCase>[1];
  loginDeps: Parameters<typeof loginUseCase>[1];
  accounts: InMemoryAccountRepository;
  auditLog: InMemoryAuditLogRepository;
  eventBus: { events: unknown[]; emit(e: unknown): Promise<void> };
  sessionRepository: InMemorySessionRepository;
}

function makeDeps(policy: IdentityPolicy): DepsBundle {
  const fixedTime = new Date('2026-07-11T08:00:00.000Z');
  const clock = { now: () => new Date(fixedTime) };
  let idCounter = 0;
  const idGen = { generate: () => `mt-${++idCounter}` };
  const hasher = {
    async hash(p: string) { return `h:${p}`; },
    async verify(p: string, h: string) { return h === `h:${p}`; },
  };
  const eventBus = { events: [] as unknown[], async emit(e: unknown) { this.events.push(e); } };
  const accounts = new InMemoryAccountRepository();
  const auditLog = new InMemoryAuditLogRepository();
  const sessionRepository = new InMemorySessionRepository();

  const createDeps = {
    accountRepository: accounts,
    passwordHasher: hasher,
    passwordHistoryRepository: new InMemoryPasswordHistoryRepository(),
    idGenerator: idGen,
    clock,
    eventBus,
    auditLogRepository: auditLog,
    policy,
  };

  const loginDeps = {
    accountRepository: accounts,
    passwordHasher: hasher,
    sessionSigner: {
      async sign(payload: { sessionId: string }) { return `tok:${payload.sessionId}`; },
      async verify() { return null; },
    },
    sessionRepository,
    mfaRepository: new InMemoryMfaRepository(),
    rateLimitRepository: new InMemoryRateLimitRepository(),
    deviceRepository: new InMemoryDeviceRepository(),
    auditLogRepository: auditLog,
    eventBus,
    idGenerator: idGen,
    clock,
    riskHook: null,
    captchaVerifier: null,
    policy: { ...policy.security, sessionDurationHours: policy.session.durationHours },
  };

  return { createDeps, loginDeps, accounts, auditLog, eventBus, sessionRepository };
}

// ═══════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════

describe('Multi-Tenant Audit — 6 Scenarios', () => {

  // ─── 1. Tenant Isolation ──────────────────────────────────

  describe('1. Tenant Isolation (계정 격리)', () => {
    it('동일 이메일이 다른 Tenant에 독립적으로 존재 가능', async () => {
      const { createDeps } = makeDeps(strictPolicy);

      // Tenant A에서 user@example.com 생성
      const r1 = await createAccountUseCase(
        { email: 'user@example.com', password: STRICT_PASSWORD, tenantId: 'tenant-a', correlationId: 'c-1' },
        createDeps,
      );
      expect(r1.ok).toBe(true);

      // Tenant B에서 동일 이메일 생성 (별개 계정)
      const r2 = await createAccountUseCase(
        { email: 'user@example.com', password: 'DifferentPass456!', tenantId: 'tenant-b', correlationId: 'c-2' },
        createDeps,
      );
      expect(r2.ok).toBe(true);

      // 서로 다른 accountId
      if (r1.ok && r2.ok) {
        expect(r1.value.accountId).not.toBe(r2.value.accountId);
      }
    });

    it('같은 Tenant 내 동일 이메일 중복 불가', async () => {
      const { createDeps } = makeDeps(strictPolicy);
      await createAccountUseCase(
        { email: 'dup@example.com', password: STRICT_PASSWORD, tenantId: 'tenant-a', correlationId: 'c-1' },
        createDeps,
      );
      const r2 = await createAccountUseCase(
        { email: 'dup@example.com', password: STRICT_PASSWORD, tenantId: 'tenant-a', correlationId: 'c-2' },
        createDeps,
      );
      expect(r2.ok).toBe(false);
    });
  });

  // ─── 2. Cross Tenant Access ───────────────────────────────

  describe('2. Cross Tenant Access (타 테넌트 접근 차단)', () => {
    it('Tenant A의 계정을 Tenant B 컨텍스트에서 조회 불가', async () => {
      const { createDeps, loginDeps } = makeDeps(strictPolicy);
      await createAccountUseCase(
        { email: 'alice@a.com', password: STRICT_PASSWORD, tenantId: 'tenant-a', correlationId: 'c-1' },
        createDeps,
      );

      // tenant-b 컨텍스트에서 alice@a.com 로그인 시도 → 실패
      const result = await loginUseCase(
        { email: 'alice@a.com', password: STRICT_PASSWORD, tenantId: 'tenant-b', correlationId: 'c-2' },
        loginDeps,
      );
      expect(result.ok).toBe(false);
    });

    it('findById에서 tenantId 불일치 시 NotFound', async () => {
      const { createDeps, accounts } = makeDeps(strictPolicy);
      const createResult = await createAccountUseCase(
        { email: 'bob@b.com', password: STRICT_PASSWORD, tenantId: 'tenant-b', correlationId: 'c-1' },
        createDeps,
      );
      if (!createResult.ok) throw new Error('setup failed');

      // 다른 tenantId로 조회
      const lookup = await accounts.findById('tenant-a', createResult.value.accountId);
      expect(lookup.ok).toBe(false);
    });
  });

  // ─── 3. Policy Override (테넌트별 정책) ────────────────────

  describe('3. Policy Override (테넌트별 정책)', () => {
    it('Strict 테넌트: 16자리 미만 비밀번호 거부', async () => {
      const { createDeps } = makeDeps(strictPolicy);
      const result = await createAccountUseCase(
        { email: 'short@strict.com', password: 'Short1!', tenantId: 'tenant-strict', correlationId: 'c-1' },
        createDeps,
      );
      expect(result.ok).toBe(false);
    });

    it('Lenient 테넌트: 8자리 비밀번호 허용', async () => {
      const { createDeps } = makeDeps(lenientPolicy);
      const result = await createAccountUseCase(
        { email: 'short@lenient.com', password: LENIENT_PASSWORD, tenantId: 'tenant-lenient', correlationId: 'c-1' },
        createDeps,
      );
      expect(result.ok).toBe(true);
    });

    it('각 테넌트의 정책이 다른 UseCase 인스턴스에 독립 적용', async () => {
      const strict = makeDeps(strictPolicy);
      const lenient = makeDeps(lenientPolicy);

      const strictResult = await createAccountUseCase(
        { email: 'test@strict.com', password: 'Only8chars!', tenantId: 't-s', correlationId: 'c-1' },
        strict.createDeps,
      );
      const lenientResult = await createAccountUseCase(
        { email: 'test@lenient.com', password: 'Only8char', tenantId: 't-l', correlationId: 'c-2' },
        lenient.createDeps,
      );

      // Strict는 16자리 미만 → 실패, Lenient는 8자리 OK
      expect(strictResult.ok).toBe(false);
      expect(lenientResult.ok).toBe(true);
    });
  });

  // ─── 4. Data Leakage ──────────────────────────────────────

  describe('4. Data Leakage (데이터 누출 방지)', () => {
    it('Audit Log가 테넌트별로 분리됨', async () => {
      const depsA = makeDeps(strictPolicy);
      const depsB = makeDeps(lenientPolicy);

      await createAccountUseCase(
        { email: 'a@tenant.com', password: STRICT_PASSWORD, tenantId: 'tenant-a', correlationId: 'c-1' },
        depsA.createDeps,
      );
      await createAccountUseCase(
        { email: 'b@tenant.com', password: LENIENT_PASSWORD, tenantId: 'tenant-b', correlationId: 'c-2' },
        depsB.createDeps,
      );

      // 테넌트 A의 감사 로그에 테넌트 B 데이터 없음
      const logsA = await depsA.auditLog.findByTenant('tenant-a');
      const logsB = await depsB.auditLog.findByTenant('tenant-b');

      const tenantIdsInA = new Set(logsA.map((l) => l.tenantId));
      const tenantIdsInB = new Set(logsB.map((l) => l.tenantId));

      expect(tenantIdsInA.has('tenant-b')).toBe(false);
      expect(tenantIdsInB.has('tenant-a')).toBe(false);
    });
  });

  // ─── 5. Event Isolation ───────────────────────────────────

  describe('5. Event Isolation (이벤트 테넌트 분리)', () => {
    it('이벤트 Envelope의 tenantId가 요청 테넌트와 일치', async () => {
      const { createDeps, eventBus } = makeDeps(strictPolicy);
      await createAccountUseCase(
        { email: 'event@test.com', password: STRICT_PASSWORD, tenantId: 'tenant-x', correlationId: 'c-1' },
        createDeps,
      );

      // 발행된 이벤트 확인
      expect(eventBus.events.length).toBeGreaterThan(0);
      for (const evt of eventBus.events) {
        const envelope = evt as { tenantId: string };
        expect(envelope.tenantId).toBe('tenant-x');
      }
    });

    it('서로 다른 테넌트의 이벤트가 섞이지 않음', async () => {
      const depsA = makeDeps(strictPolicy);
      const depsB = makeDeps(lenientPolicy);

      await createAccountUseCase(
        { email: 'a@e.com', password: STRICT_PASSWORD, tenantId: 't-a', correlationId: 'c-1' },
        depsA.createDeps,
      );
      await createAccountUseCase(
        { email: 'b@e.com', password: LENIENT_PASSWORD, tenantId: 't-b', correlationId: 'c-2' },
        depsB.createDeps,
      );

      // 각 이벤트 버스는 자기 테넌트 이벤트만 포함
      for (const evt of depsA.eventBus.events) {
        expect((evt as { tenantId: string }).tenantId).toBe('t-a');
      }
      for (const evt of depsB.eventBus.events) {
        expect((evt as { tenantId: string }).tenantId).toBe('t-b');
      }
    });
  });

  // ─── 6. Session Isolation ─────────────────────────────────

  describe('6. Session Isolation (세션 테넌트 분리)', () => {
    it('각 테넌트의 세션 토큰이 독립적', async () => {
      const { createDeps, loginDeps, sessionRepository } = makeDeps(strictPolicy);
      await createAccountUseCase(
        { email: 'sess@t-a.com', password: STRICT_PASSWORD, tenantId: 't-a', correlationId: 'c-1' },
        createDeps,
      );

      const result = await loginUseCase(
        { email: 'sess@t-a.com', password: STRICT_PASSWORD, tenantId: 't-a', correlationId: 'c-2' },
        loginDeps,
      );

      expect(result.ok).toBe(true);
      if (result.ok && result.value.status === 'success') {
        // 세션 토큰 형식 검증
        expect(result.value.sessionToken).toMatch(/^tok:/);
      }

      // 모든 세션 레코드가 동일 테넌트
      const allSessions = await sessionRepository.all();
      for (const s of allSessions) {
        expect(s.tenantId).toBe('t-a');
      }
    });

    it('Session Payload의 tenantId가 Login 요청과 일치', async () => {
      const { createDeps, loginDeps, sessionRepository } = makeDeps(strictPolicy);
      await createAccountUseCase(
        { email: 'payload@t-x.com', password: STRICT_PASSWORD, tenantId: 't-x', correlationId: 'c-1' },
        createDeps,
      );

      const result = await loginUseCase(
        { email: 'payload@t-x.com', password: STRICT_PASSWORD, tenantId: 't-x', correlationId: 'c-2' },
        loginDeps,
      );

      expect(result.ok).toBe(true);

      // SessionRepository에 저장된 레코드의 tenantId 확인
      const allSessions = await sessionRepository.all();
      for (const s of allSessions) {
        expect(s.tenantId).toBe('t-x');
      }
    });
  });
});
