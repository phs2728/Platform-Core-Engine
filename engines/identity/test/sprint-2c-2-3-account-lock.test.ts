import { describe, it, expect } from 'vitest';
import {
  createAccountUseCase,
  loginWithEmailUseCase,
} from '../src/index.js';
import {
  makeClock,
  makeIdGenerator,
  makePasswordHasher,
  makeSessionSigner,
  makeEventBus,
  makeAccounts,
  makeSessions,
  makeAuditLogs,
  defaultPolicy,
} from './helpers.js';

describe('Sprint 2C-2-3: Account Lock', () => {
  it('로그인 N회 실패 → account_locked + AuthenticationError', async () => {
    const accounts = makeAccounts();
    const sessions = makeSessions();
    const audit = makeAuditLogs();
    const clock = makeClock();
    const ids = makeIdGenerator();
    const eventBus = makeEventBus();

    await createAccountUseCase(
      { email: 'lock@example.com', password: 'CorrectPassword123!', tenantId: 't-1', correlationId: 'r-0' },
      { accountRepository: accounts, passwordHasher: makePasswordHasher(), idGenerator: ids, clock, eventBus, auditLogRepository: audit },
    );

    for (let i = 1; i <= 3; i++) {
      await loginWithEmailUseCase(
        { email: 'lock@example.com', password: 'WrongPassword!', tenantId: 't-1', correlationId: `r-${i}` },
        { accountRepository: accounts, passwordHasher: makePasswordHasher(), sessionSigner: makeSessionSigner(), sessionRepository: sessions, idGenerator: ids, clock, eventBus, auditLogRepository: audit, policy: defaultPolicy },
      );
    }

    const locked = await loginWithEmailUseCase(
      { email: 'lock@example.com', password: 'CorrectPassword123!', tenantId: 't-1', correlationId: 'r-4' },
      { accountRepository: accounts, passwordHasher: makePasswordHasher(), sessionSigner: makeSessionSigner(), sessionRepository: sessions, idGenerator: ids, clock, eventBus, auditLogRepository: audit, policy: defaultPolicy },
    );

    expect(locked.ok).toBe(false);
    if (!locked.ok) {
      expect(locked.error.code).toBe('PLATFORM_AUTH_FAILED');
      expect(locked.error.details?.['reason']).toBe('account_locked');
    }

    const logs = await audit.all();
    const eventTypes = logs.map(l => l.eventType);
    expect(eventTypes).toContain('account_locked');
  });
});

describe('Sprint 2C-2-4: Session Refresh — basic', () => {
  it('Login 후 Session 생성', async () => {
    const accounts = makeAccounts();
    const sessions = makeSessions();
    const audit = makeAuditLogs();
    const clock = makeClock();
    const ids = makeIdGenerator();
    const eventBus = makeEventBus();

    await createAccountUseCase(
      { email: 'refresh@example.com', password: 'SecurePassword123!', tenantId: 't-1', correlationId: 'r-0' },
      { accountRepository: accounts, passwordHasher: makePasswordHasher(), idGenerator: ids, clock, eventBus, auditLogRepository: audit },
    );

    const login = await loginWithEmailUseCase(
      { email: 'refresh@example.com', password: 'SecurePassword123!', tenantId: 't-1', correlationId: 'r-1' },
      { accountRepository: accounts, passwordHasher: makePasswordHasher(), sessionSigner: makeSessionSigner(), sessionRepository: sessions, idGenerator: ids, clock, eventBus, auditLogRepository: audit, policy: defaultPolicy },
    );

    expect(login.ok).toBe(true);
  });
});

describe('Sprint 2C-2-5: Audit Log', () => {
  it('Account 생성 + Login → Audit 기록', async () => {
    const accounts = makeAccounts();
    const sessions = makeSessions();
    const audit = makeAuditLogs();
    const clock = makeClock();
    const ids = makeIdGenerator();
    const eventBus = makeEventBus();

    await createAccountUseCase(
      { email: 'audit@example.com', password: 'SecurePassword123!', tenantId: 't-1', correlationId: 'r-0' },
      { accountRepository: accounts, passwordHasher: makePasswordHasher(), idGenerator: ids, clock, eventBus, auditLogRepository: audit },
    );

    await loginWithEmailUseCase(
      { email: 'audit@example.com', password: 'SecurePassword123!', tenantId: 't-1', correlationId: 'r-1' },
      { accountRepository: accounts, passwordHasher: makePasswordHasher(), sessionSigner: makeSessionSigner(), sessionRepository: sessions, idGenerator: ids, clock, eventBus, auditLogRepository: audit, policy: defaultPolicy },
    );

    const logs = await audit.all();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.some(l => l.eventType === 'login_success')).toBe(true);
  });
});
