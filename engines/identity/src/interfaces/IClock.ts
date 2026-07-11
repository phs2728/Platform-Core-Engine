/**
 * Identity Engine — Dependency Interfaces
 * 호스트가 구현을 제공.
 */

import type { Result } from '@platform/core-sdk';
import type { EventEnvelope } from '@platform/core-sdk';
import type { NotFoundError } from '@platform/core-sdk';

export interface IClock {
  now(): Date;
}

export interface IIdGenerator {
  generate(): string; // UUID v7 preferred
}

export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

export interface ISessionSigner {
  sign(payload: SessionPayload): Promise<string>;
  verify(token: string): Promise<SessionPayload | null>;
}

export interface SessionPayload {
  accountId: string;
  sessionId: string;
  tenantId: string;
  issuedAt: string;
  expiresAt: string;
}

/**
 * Account Repository Interface (스키마만, 구현은 Sprint 후속)
 */
export interface AccountRecord {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface IAccountRepository {
  insert(record: AccountRecord): Promise<void>;
  findByEmail(tenantId: string, email: string): Promise<Result<AccountRecord, NotFoundError>>;
  findById(tenantId: string, id: string): Promise<Result<AccountRecord, NotFoundError>>;
}

/**
 * Session Repository Interface
 */
export interface SessionRecord {
  id: string;
  accountId: string;
  tenantId: string;
  token: string;
  issuedAt: string;
  expiresAt: string;
}

export interface ISessionRepository {
  insert(record: SessionRecord): Promise<void>;
  findByToken(token: string): Promise<Result<SessionRecord, NotFoundError>>;
  delete(id: string): Promise<void>;
  deleteByAccountId(accountId: string): Promise<void>;
}

/**
 * Event Bus Interface (Core SDK EventEnvelope 통합)
 */
export interface IEventBus {
  emit<T>(envelope: EventEnvelope<T>): Promise<void>;
}
