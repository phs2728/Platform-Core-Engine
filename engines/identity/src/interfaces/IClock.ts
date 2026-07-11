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
 * Account Record
 */
export interface AccountRecord {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  lockedUntil?: string | null;
  failedAttempts?: number;
  emailVerified?: boolean;
}

/**
 * Account Repository (Sprint 2C-2 강화)
 */
export interface IAccountRepository {
  insert(record: AccountRecord): Promise<void>;
  findByEmail(tenantId: string, email: string): Promise<Result<AccountRecord, NotFoundError>>;
  findById(tenantId: string, id: string): Promise<Result<AccountRecord, NotFoundError>>;
  /** Sprint 2C-2-3: Account Lock */
  incrementFailedAttempts(id: string): Promise<number>;
  resetFailedAttempts(id: string): Promise<void>;
  setLocked(id: string, lockedUntil: string | null): Promise<void>;
  /** Sprint 2C-2-1: Email Verification */
  setEmailVerified(id: string, verified: boolean): Promise<void>;
  /** Sprint 2C-2-2: Password Reset */
  setPassword(id: string, passwordHash: string): Promise<void>;
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
  /** Sprint 2C-2-4: Session Rotation */
  rotate?(oldId: string, newRecord: SessionRecord): Promise<void>;
  findByAccountId?(accountId: string): Promise<SessionRecord[]>;
}

/**
 * Event Bus Interface
 */
export interface IEventBus {
  emit<T>(envelope: EventEnvelope<T>): Promise<void>;
}

/**
 * IAuditLogRepository — Sprint 2C-2-5
 */
export type AuditEventType =
  | 'login_success'
  | 'login_failed'
  | 'password_changed'
  | 'password_reset'
  | 'email_changed'
  | 'session_revoked'
  | 'account_locked'
  | 'account_unlocked'
  | 'email_verified'
  | 'session_refreshed'
  | 'oauth_login'
  | 'oauth_unlinked';

export interface AuditLogRecord {
  id: string;
  accountId: string | null;
  tenantId: string;
  eventType: AuditEventType;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface IAuditLogRepository {
  insert(record: Omit<AuditLogRecord, 'id' | 'createdAt'>): Promise<AuditLogRecord>;
  findByAccount(accountId: string): Promise<AuditLogRecord[]>;
  findByTenant(tenantId: string, limit?: number): Promise<AuditLogRecord[]>;
  findByEventType(eventType: AuditEventType, limit?: number): Promise<AuditLogRecord[]>;
}

/**
 * IVerificationTokenRepository — Sprint 2C-2-1, 2-2
 */
export type VerificationTokenType = 'email_verification' | 'password_reset';

export interface VerificationTokenRecord {
  tokenHash: string;
  accountId: string;
  tenantId: string;
  type: VerificationTokenType;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

export interface IVerificationTokenRepository {
  insert(record: Omit<VerificationTokenRecord, 'tokenHash'> & { rawToken: string }): Promise<{ tokenHash: string }>;
  findByHash(tokenHash: string, type: VerificationTokenType): Promise<VerificationTokenRecord | null>;
  markUsed(tokenHash: string): Promise<void>;
  invalidateForAccount(accountId: string, type: VerificationTokenType): Promise<void>;
}

/**
 * IEmailSender — Sprint 2C-2 (토큰 전송용)
 */
export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export interface IEmailSender {
  send(message: EmailMessage): Promise<void>;
}
