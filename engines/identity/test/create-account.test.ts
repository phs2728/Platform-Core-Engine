import { describe, it, expect } from 'vitest';
import {
  createAccountUseCase,
  loginWithEmailUseCase,
  logoutUseCase,
  type IClock,
  type IIdGenerator,
  type IPasswordHasher,
  type ISessionSigner,
  type IAccountRepository,
  type ISessionRepository,
  type IEventBus,
  type AccountRecord,
  type SessionRecord,
  type SessionPayload,
} from '../src/index.js';

// In-memory test deps
function makeEventBus(): IEventBus & { events: unknown[] } {
  const events: unknown[] = [];
  return {
    events,
    async emit(envelope) {
      events.push(envelope);
    },
  };
}

function makeIdGenerator(): IIdGenerator {
  let counter = 0;
  return {
    generate() {
      counter += 1;
      return `id-${counter}`;
    },
  };
}

const fixedClock: IClock = {
  now: () => new Date('2026-07-11T08:00:00.000Z'),
};

async function makePasswordHasher(): Promise<IPasswordHasher> {
  // Simple hash for testing (NOT for production)
  return {
    async hash(plain: string) {
      return `hashed:${plain}`;
    },
    async verify(plain: string, hashed: string) {
      return hashed === `hashed:${plain}`;
    },
  };
}

function makeSessionSigner(): ISessionSigner {
  const tokens = new Map<string, SessionPayload>();
  return {
    async sign(payload) {
      const token = `token:${payload.sessionId}`;
      tokens.set(token, payload);
      return token;
    },
    async verify(token) {
      return tokens.get(token) ?? null;
    },
  };
}

function makeAccountRepository(): IAccountRepository & { records: Map<string, AccountRecord> } {
  const records = new Map<string, AccountRecord>();
  return {
    records,
    async insert(record) {
      records.set(record.id, record);
    },
    async findByEmail(tenantId, email) {
      for (const r of records.values()) {
        if (r.tenantId === tenantId && r.email === email) {
          return { ok: true, value: r };
        }
      }
      return { ok: false, error: new Error('NotFound') as any };
    },
    async findById(tenantId, id) {
      const r = records.get(id);
      if (r && r.tenantId === tenantId) return { ok: true, value: r };
      return { ok: false, error: new Error('NotFound') as any };
    },
  };
}

function makeSessionRepository(): ISessionRepository & { records: Map<string, SessionRecord> } {
  const records = new Map<string, SessionRecord>();
  return {
    records,
    async insert(record) {
      records.set(record.id, record);
    },
    async findByToken(token) {
      for (const r of records.values()) {
        if (r.token === token) return { ok: true, value: r };
      }
      return { ok: false, error: new Error('NotFound') as any };
    },
    async delete(id) {
      records.delete(id);
    },
    async deleteByAccountId(accountId) {
      for (const [id, r] of records) {
        if (r.accountId === accountId) records.delete(id);
      }
    },
  };
}

describe('createAccountUseCase', () => {
  it('Account 생성 성공 (이메일 + 비밀번호)', async () => {
    const accountRepo = makeAccountRepository();
    const sessionRepo = makeSessionRepository();
    const eventBus = makeEventBus();

    const result = await createAccountUseCase(
      { email: 'tim@example.com', password: 'SecurePassword123!', tenantId: 't-1', correlationId: 'r-1' },
      {
        accountRepository: accountRepo,
        passwordHasher: await makePasswordHasher(),
        idGenerator: makeIdGenerator(),
        clock: fixedClock,
        eventBus,
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.email).toBe('tim@example.com');
      expect(result.value.createdAt).toBe('2026-07-11T08:00:00.000Z');
    }
    expect(eventBus.events.length).toBe(1);
  });

  it('중복 이메일이면 ConflictError 반환', async () => {
    const accountRepo = makeAccountRepository();
    const eventBus = makeEventBus();

    // 첫 번째 생성
    await createAccountUseCase(
      { email: 'dup@example.com', password: 'SecurePassword123!', tenantId: 't-1', correlationId: 'r-1' },
      {
        accountRepository: accountRepo,
        passwordHasher: await makePasswordHasher(),
        idGenerator: makeIdGenerator(),
        clock: fixedClock,
        eventBus,
      },
    );

    // 두 번째 시도 (중복)
    const dup = await createAccountUseCase(
      { email: 'dup@example.com', password: 'SecurePassword123!', tenantId: 't-1', correlationId: 'r-2' },
      {
        accountRepository: accountRepo,
        passwordHasher: await makePasswordHasher(),
        idGenerator: makeIdGenerator(),
        clock: fixedClock,
        eventBus,
      },
    );

    expect(dup.ok).toBe(false);
    if (!dup.ok) {
      expect(dup.error.code).toBe('PLATFORM_CONFLICT');
    }
  });

  it('Password 정책 위반 (8자 미만)이면 ValidationError', async () => {
    const accountRepo = makeAccountRepository();
    const eventBus = makeEventBus();

    const result = await createAccountUseCase(
      { email: 'short@example.com', password: 'short', tenantId: 't-1', correlationId: 'r-1' },
      {
        accountRepository: accountRepo,
        passwordHasher: await makePasswordHasher(),
        idGenerator: makeIdGenerator(),
        clock: fixedClock,
        eventBus,
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('PLATFORM_VALIDATION_FAILED');
    }
  });
});

describe('loginWithEmailUseCase', () => {
  it('올바른 Email/Password로 Login 성공, Session 생성', async () => {
    const accountRepo = makeAccountRepository();
    const sessionRepo = makeSessionRepository();
    const eventBus = makeEventBus();
    const passwordHasher = await makePasswordHasher();
    const sessionSigner = makeSessionSigner();
    const idGenerator = makeIdGenerator();

    // 먼저 Account 생성
    await createAccountUseCase(
      { email: 'login@example.com', password: 'SecurePassword123!', tenantId: 't-1', correlationId: 'r-0' },
      { accountRepository: accountRepo, passwordHasher, idGenerator, clock: fixedClock, eventBus },
    );

    // 로그인 시도
    const result = await loginWithEmailUseCase(
      { email: 'login@example.com', password: 'SecurePassword123!', tenantId: 't-1', correlationId: 'r-1' },
      {
        accountRepository: accountRepo,
        passwordHasher,
        sessionSigner,
        sessionRepository: sessionRepo,
        idGenerator,
        clock: fixedClock,
        eventBus,
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.accountId).toBe('id-1'); // 첫 번째 ID
      expect(result.value.sessionToken).toContain('token:');
      expect(result.value.expiresAt).toBeDefined();
    }
  });

  it('잘못된 Password면 AuthenticationError', async () => {
    const accountRepo = makeAccountRepository();
    const sessionRepo = makeSessionRepository();
    const eventBus = makeEventBus();
    const passwordHasher = await makePasswordHasher();
    const idGenerator = makeIdGenerator();

    await createAccountUseCase(
      { email: 'wrong@example.com', password: 'SecurePassword123!', tenantId: 't-1', correlationId: 'r-0' },
      { accountRepository: accountRepo, passwordHasher, idGenerator, clock: fixedClock, eventBus },
    );

    const result = await loginWithEmailUseCase(
      { email: 'wrong@example.com', password: 'WrongPassword456!', tenantId: 't-1', correlationId: 'r-1' },
      {
        accountRepository: accountRepo,
        passwordHasher,
        sessionSigner: makeSessionSigner(),
        sessionRepository: sessionRepo,
        idGenerator,
        clock: fixedClock,
        eventBus,
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('PLATFORM_AUTH_FAILED');
    }
  });
});

describe('logoutUseCase', () => {
  it('Session 삭제 + auth.logout Event', async () => {
    const sessionRepo = makeSessionRepository();
    const eventBus = makeEventBus();

    // Session 직접 삽입
    await sessionRepo.insert({
      id: 'sess-1',
      accountId: 'account-1',
      tenantId: 't-1',
      token: 'token:sess-1',
      issuedAt: '2026-07-11T08:00:00.000Z',
      expiresAt: '2026-07-12T08:00:00.000Z',
    });

    const result = await logoutUseCase(
      { sessionToken: 'token:sess-1', accountId: 'account-1', tenantId: 't-1', correlationId: 'r-1' },
      { sessionRepository: sessionRepo, eventBus, clock: fixedClock },
    );

    expect(result.ok).toBe(true);
    expect(eventBus.events.length).toBe(1);
    // Session 삭제 확인
    const after = await sessionRepo.findByToken('token:sess-1');
    expect(after.ok).toBe(false);
  });
});
