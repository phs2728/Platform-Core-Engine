import { describe, it, expect } from 'vitest';
import {
  createAccountUseCase,
  loginUseCase,
  type AccountRecord,
  type IdentityPolicy,
} from '../src/index.js';

// ═══════════════════════════════════════════
// Test Fixtures
// ═══════════════════════════════════════════

import {
  InMemoryAccountRepository,
  InMemorySessionRepository,
  InMemoryAuditLogRepository,
  InMemoryMfaRepository,
  InMemoryRateLimitRepository,
  InMemoryDeviceRepository,
  InMemoryPasswordHistoryRepository,
  TotpImpl,
} from '../src/index.js';

const fixedTime = new Date('2026-07-11T08:00:00.000Z');
const clock = { now: () => new Date(fixedTime) };
let idCounter = 0;
const idGen = { generate: () => `id-${++idCounter}` };
const hasher = {
  async hash(p: string) { return `h:${p}`; },
  async verify(p: string, h: string) { return h === `h:${p}`; },
};
const signer = {
  async sign(payload: { sessionId: string }) { return `tok:${payload.sessionId}`; },
  async verify() { return null; },
};
const eventBus = { events: [] as unknown[], async emit(e: unknown) { this.events.push(e); } };

const defaultPolicy: IdentityPolicy = {
  password: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
    expirationDays: 0,
    historyCount: 5,
  },
  session: { durationHours: 24, refreshThresholdMinutes: 60, maxConcurrent: 5 },
  security: {
    maxLoginFailures: 3,
    lockDurationMinutes: 30,
    rateLimitWindowMs: 60_000,
    rateLimitMaxRequests: 10,
    ipLockDurationMinutes: 15,
    captchaThreshold: 5,
  },
  verification: { tokenTtlMinutes: 15, otpTtlMinutes: 5, maxAttempts: 5, resendCooldownSeconds: 60 },
  mfa: { required: false, backupCodeCount: 8 },
};

function makeAccountDeps() {
  const accounts = new InMemoryAccountRepository();
  return {
    accounts,
    deps: {
      accountRepository: accounts,
      passwordHasher: hasher,
      passwordHistoryRepository: new InMemoryPasswordHistoryRepository(),
      idGenerator: idGen,
      clock,
      eventBus,
      auditLogRepository: new InMemoryAuditLogRepository(),
      policy: defaultPolicy,
    },
  };
}

function makeLoginDeps(accounts: InMemoryAccountRepository) {
  return {
    accountRepository: accounts,
    passwordHasher: hasher,
    sessionSigner: signer,
    sessionRepository: new InMemorySessionRepository(),
    mfaRepository: new InMemoryMfaRepository(),
    rateLimitRepository: new InMemoryRateLimitRepository(),
    deviceRepository: new InMemoryDeviceRepository(),
    auditLogRepository: new InMemoryAuditLogRepository(),
    eventBus,
    idGenerator: idGen,
    clock,
    riskHook: null,
    captchaVerifier: null,
    policy: {
      ...defaultPolicy.security,
      sessionDurationHours: defaultPolicy.session.durationHours,
    },
  };
}

// ═══════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════

describe('CreateAccount', () => {
  it('성공: 유효한 email + password', async () => {
    const { deps } = makeAccountDeps();
    const result = await createAccountUseCase(
      { email: 'user@example.com', password: 'SecurePass123!', tenantId: 't-1', correlationId: 'r-1' },
      deps,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.email).toBe('user@example.com');
      expect(result.value.accountId).toBeDefined();
    }
  });

  it('실패: 약한 비밀번호 → ValidationError', async () => {
    const { deps } = makeAccountDeps();
    const result = await createAccountUseCase(
      { email: 'weak@example.com', password: 'short', tenantId: 't-1', correlationId: 'r-1' },
      deps,
    );
    expect(result.ok).toBe(false);
  });

  it('실패: 중복 이메일 → ConflictError', async () => {
    const { deps } = makeAccountDeps();
    await createAccountUseCase(
      { email: 'dup@example.com', password: 'SecurePass123!', tenantId: 't-1', correlationId: 'r-1' },
      deps,
    );
    const result = await createAccountUseCase(
      { email: 'dup@example.com', password: 'SecurePass123!', tenantId: 't-1', correlationId: 'r-2' },
      deps,
    );
    expect(result.ok).toBe(false);
  });
});

describe('Login (Enterprise)', () => {
  it('성공: 올바른 자격증명 → session 발급', async () => {
    const { accounts, deps: createDeps } = makeAccountDeps();
    await createAccountUseCase(
      { email: 'login@example.com', password: 'SecurePass123!', tenantId: 't-1', correlationId: 'r-0' },
      createDeps,
    );

    const loginDeps = makeLoginDeps(accounts);
    const result = await loginUseCase(
      { email: 'login@example.com', password: 'SecurePass123!', tenantId: 't-1', correlationId: 'r-1' },
      loginDeps,
    );

    expect(result.ok).toBe(true);
    if (result.ok && result.value.status === 'success') {
      expect(result.value.sessionToken).toMatch(/^tok:/);
    }
  });

  it('실패: 잘못된 비밀번호 → AuthenticationError', async () => {
    const { accounts, deps: createDeps } = makeAccountDeps();
    await createAccountUseCase(
      { email: 'fail@example.com', password: 'SecurePass123!', tenantId: 't-1', correlationId: 'r-0' },
      createDeps,
    );

    const loginDeps = makeLoginDeps(accounts);
    const result = await loginUseCase(
      { email: 'fail@example.com', password: 'WrongPass123!', tenantId: 't-1', correlationId: 'r-1' },
      loginDeps,
    );
    expect(result.ok).toBe(false);
  });

  it('실패: 3회 실패 → Account Lock', async () => {
    const { accounts, deps: createDeps } = makeAccountDeps();
    await createAccountUseCase(
      { email: 'lock@example.com', password: 'SecurePass123!', tenantId: 't-1', correlationId: 'r-0' },
      createDeps,
    );

    const loginDeps = makeLoginDeps(accounts);
    for (let i = 0; i < 3; i++) {
      await loginUseCase(
        { email: 'lock@example.com', password: 'Wrong!', tenantId: 't-1', correlationId: `r-${i}` },
        loginDeps,
      );
    }

    const locked = await loginUseCase(
      { email: 'lock@example.com', password: 'SecurePass123!', tenantId: 't-1', correlationId: 'r-4' },
      loginDeps,
    );
    expect(locked.ok).toBe(false);
    if (!locked.ok) {
      expect(locked.error.details?.['reason']).toBe('account_locked');
    }
  });

  it('성공: Audit Log에 login_success 기록', async () => {
    const { accounts, deps: createDeps } = makeAccountDeps();
    const createResult = await createAccountUseCase(
      { email: 'audit@example.com', password: 'SecurePass123!', tenantId: 't-1', correlationId: 'r-0' },
      createDeps,
    );
    const accountId = createResult.ok ? createResult.value.accountId : '';

    const loginDeps = makeLoginDeps(accounts);
    await loginUseCase(
      { email: 'audit@example.com', password: 'SecurePass123!', tenantId: 't-1', correlationId: 'r-1' },
      loginDeps,
    );

    const logs = await loginDeps.auditLogRepository.findByAccount(accountId);
    const types = logs.map((l) => l.eventType);
    expect(types).toContain('login_success');
  });
});

describe('TOTP', () => {
  it('성공: Secret + Backup Code 생성', () => {
    const totp = new TotpImpl();
    const secret = totp.generateSecret();
    expect(secret).toHaveLength(32);
    expect(secret).toMatch(/^[A-Z2-7]+$/);

    const uri = totp.generateUri(secret, 'user@example.com', 'TestApp');
    expect(uri).toContain('otpauth://totp/');

    const codes = totp.generateBackupCodes(8);
    expect(codes).toHaveLength(8);
    expect(codes[0]).toMatch(/^[A-F0-9]{5}-[A-F0-9]{5}$/);
  });

  it('성공: TOTP code verify', () => {
    const totp = new TotpImpl();
    const secret = totp.generateSecret();
    // Verify with current time code — just check it doesn't throw
    const code = (totp as unknown as { generateCode: (s: string, t: number) => string }).generateCode(secret, Math.floor(Date.now() / 1000));
    expect(totp.verify(secret, code)).toBe(true);
  });

  it('실패: 잘못된 TOTP code', () => {
    const totp = new TotpImpl();
    const secret = totp.generateSecret();
    expect(totp.verify(secret, '000000')).toBe(false);
  });
});
