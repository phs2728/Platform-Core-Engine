import {
  InMemoryAccountRepository,
  InMemorySessionRepository,
  InMemoryVerificationTokenRepository,
  InMemoryAuditLogRepository,
  InMemoryEmailSender,
  type IClock,
  type IIdGenerator,
  type IPasswordHasher,
  type ISessionSigner,
  type SessionPayload,
  type IEventBus,
} from '../src/index.js';

export function makeClock(time: Date = new Date('2026-07-11T08:00:00.000Z')): IClock {
  return { now: () => new Date(time.getTime()) };
}

export function makeIdGenerator(): IIdGenerator {
  let counter = 0;
  return { generate: () => `id-${++counter}` };
}

export function makePasswordHasher(): IPasswordHasher {
  return {
    async hash(plain: string) { return `hashed:${plain}`; },
    async verify(plain: string, hashed: string) { return hashed === `hashed:${plain}`; },
  };
}

export function makeSessionSigner(): ISessionSigner {
  const tokens = new Map<string, SessionPayload>();
  return {
    async sign(payload: SessionPayload) {
      const token = `token:${payload.sessionId}`;
      tokens.set(token, payload);
      return token;
    },
    async verify(token: string) {
      return tokens.get(token) ?? null;
    },
  };
}

export function makeEventBus(): IEventBus & { events: unknown[] } {
  const events: unknown[] = [];
  return {
    events,
    async emit<T>(envelope: import('@platform/core-sdk').EventEnvelope<T>) { events.push(envelope); },
  };
}

export function makeAccounts(): InMemoryAccountRepository {
  return new InMemoryAccountRepository();
}

export function makeSessions(): InMemorySessionRepository {
  return new InMemorySessionRepository();
}

export function makeVerificationTokens(): InMemoryVerificationTokenRepository {
  return new InMemoryVerificationTokenRepository();
}

export function makeAuditLogs(): InMemoryAuditLogRepository {
  return new InMemoryAuditLogRepository();
}

export function makeEmail(): InMemoryEmailSender {
  return new InMemoryEmailSender();
}

export const defaultPolicy = {
  maxFailures: 3,
  lockDurationMinutes: 30,
  sessionDurationHours: 24,
  minRemainingMinutesForRotation: 60,
};
