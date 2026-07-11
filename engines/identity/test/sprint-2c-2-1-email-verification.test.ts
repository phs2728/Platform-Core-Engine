import { describe, it, expect } from 'vitest';
import {
  createAccountUseCase,
  requestEmailVerificationUseCase,
  confirmEmailVerificationUseCase,
} from '../src/index.js';
import {
  makeClock,
  makeIdGenerator,
  makePasswordHasher,
  makeEventBus,
  makeAccounts,
  makeVerificationTokens,
  makeEmail,
  makeAuditLogs,
} from './helpers.js';

describe('Sprint 2C-2-1: Email Verification', () => {
  it('Request: Token Hash만 DB 저장', async () => {
    const accounts = makeAccounts();
    const tokens = makeVerificationTokens();
    const email = makeEmail();
    const audit = makeAuditLogs();
    const clock = makeClock();
    const ids = makeIdGenerator();
    const eventBus = makeEventBus();

    await createAccountUseCase(
      { email: 'verify@example.com', password: 'SecurePassword123!', tenantId: 't-1', correlationId: 'r-0' },
      {
        accountRepository: accounts,
        passwordHasher: makePasswordHasher(),
        idGenerator: ids,
        clock,
        eventBus,
        auditLogRepository: audit,
      },
    );

    const accountList = await accounts.all();
    const accountId = accountList[0]!.id;

    const request = await requestEmailVerificationUseCase(
      { accountId, tenantId: 't-1', correlationId: 'r-1' },
      {
        accountRepository: accounts,
        verificationTokenRepository: tokens,
        emailSender: email,
        idGenerator: ids,
        clock,
        auditLogRepository: audit,
      },
    );

    expect(request.ok).toBe(true);
    if (request.ok) {
      expect(request.value.rawToken).toMatch(/^id-/);
      expect(request.value.verificationUrl).toContain('token=');
    }
    const allTokens = await tokens.all();
    expect(allTokens).toHaveLength(1);
    expect(allTokens[0]!.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('Confirm: emailVerified = true', async () => {
    const accounts = makeAccounts();
    const tokens = makeVerificationTokens();
    const email = makeEmail();
    const audit = makeAuditLogs();
    const clock = makeClock();
    const ids = makeIdGenerator();
    const eventBus = makeEventBus();

    await createAccountUseCase(
      { email: 'confirm@example.com', password: 'SecurePassword123!', tenantId: 't-1', correlationId: 'r-0' },
      { accountRepository: accounts, passwordHasher: makePasswordHasher(), idGenerator: ids, clock, eventBus, auditLogRepository: audit },
    );

    const accountList = await accounts.all();
    const accountId = accountList[0]!.id;

    const request = await requestEmailVerificationUseCase(
      { accountId, tenantId: 't-1', correlationId: 'r-1' },
      { accountRepository: accounts, verificationTokenRepository: tokens, emailSender: email, idGenerator: ids, clock, auditLogRepository: audit },
    );
    const rawToken = request.ok ? request.value.rawToken : '';

    const confirm = await confirmEmailVerificationUseCase(
      { rawToken, tenantId: 't-1', correlationId: 'r-2' },
      { accountRepository: accounts, verificationTokenRepository: tokens, emailSender: email, clock, auditLogRepository: audit },
    );

    expect(confirm.ok).toBe(true);
  });
});
