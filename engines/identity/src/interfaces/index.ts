/**
 * Identity Engine — Complete Interfaces (Sprint 2C-3 Enterprise Grade)
 *
 * 사장님 Engineering Manager 확립 (2026-07-11):
 * 10 Epics: Verification / Password / OAuth / MFA / Session / Security / Audit / Linking / Device / Risk
 *
 * 모든 Use Case는 Core SDK Result<T,E> 반환
 * 모든 오류는 PlatformError 계층
 * 모든 입력은 Validation 사용
 * 모든 상태 변경은 EventEnvelope 발행
 * 모든 설정은 Policy Engine에서 조회
 * Engine 간 직접 참조 금지
 */

import type { Result, EventEnvelope } from '@platform/core-sdk';

// ═══════════════════════════════════════════════════════════
// Core Infra Interfaces
// ═══════════════════════════════════════════════════════════

export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IRandom { bytes(n: number): string; digits(n: number): string; }

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

export interface IEventBus {
  emit<T>(envelope: EventEnvelope<T>): Promise<void>;
}

// ═══════════════════════════════════════════════════════════
// Email / SMS
// ═══════════════════════════════════════════════════════════

export interface EmailMessage { to: string; subject: string; body: string; html?: string; }
export interface IEmailSender { send(message: EmailMessage): Promise<void>; }

export interface SmsMessage { to: string; body: string; }
export interface ISmsSender { send(message: SmsMessage): Promise<void>; }

// ═══════════════════════════════════════════════════════════
// Epic 7: Audit (Foundation — 모든 Epic에서 사용)
// ═══════════════════════════════════════════════════════════

export type AuditEventType =
  | 'login_success' | 'login_failed'
  | 'logout' | 'logout_all'
  | 'email_verified' | 'phone_verified' | 'verification_failed' | 'verification_resent' | 'verification_expired'
  | 'password_changed' | 'password_reset' | 'password_expired' | 'password_reuse_blocked' | 'force_password_change'
  | 'session_refreshed' | 'session_revoked'
  | 'oauth_login' | 'oauth_linked' | 'oauth_unlinked'
  | 'mfa_enrolled' | 'mfa_disabled' | 'mfa_challenged' | 'mfa_verified' | 'mfa_failed' | 'backup_code_used'
  | 'account_created' | 'account_locked' | 'account_unlocked' | 'account_disabled' | 'account_enabled'
  | 'device_trusted' | 'device_revoked'
  | 'rate_limit_exceeded' | 'brute_force_detected' | 'ip_locked' | 'captcha_failed'
  | 'risk_challenge' | 'risk_deny'
  | 'admin_action';

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

// ═══════════════════════════════════════════════════════════
// Epic: Account
// ═══════════════════════════════════════════════════════════

export interface AccountRecord {
  id: string;
  tenantId: string;
  email: string;
  phone: string | null;
  passwordHash: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lockedUntil: string | null;
  failedAttempts: number;
  disabled: boolean;
  forcePasswordChange: boolean;
  passwordChangedAt: string | null;
  passwordExpiresAt: string | null;
}

export interface IAccountRepository {
  insert(record: AccountRecord): Promise<void>;
  findByEmail(tenantId: string, email: string): Promise<Result<AccountRecord, Error>>;
  findByPhone(tenantId: string, phone: string): Promise<Result<AccountRecord, Error>>;
  findById(tenantId: string, id: string): Promise<Result<AccountRecord, Error>>;
  update(id: string, patch: Partial<AccountRecord>): Promise<void>;
  incrementFailedAttempts(id: string): Promise<number>;
  resetFailedAttempts(id: string): Promise<void>;
}

// ═══════════════════════════════════════════════════════════
// Epic 5: Session
// ═══════════════════════════════════════════════════════════

export type SessionType = 'web' | 'mobile' | 'api' | 'device';

export interface SessionRecord {
  id: string;
  accountId: string;
  tenantId: string;
  token: string;
  refreshToken: string | null;
  type: SessionType;
  deviceFingerprint: string | null;
  deviceName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  issuedAt: string;
  expiresAt: string;
  lastUsedAt: string;
}

export interface ISessionRepository {
  insert(record: SessionRecord): Promise<void>;
  findByToken(token: string): Promise<Result<SessionRecord, Error>>;
  findById(id: string): Promise<Result<SessionRecord, Error>>;
  findByAccountId(accountId: string): Promise<SessionRecord[]>;
  delete(id: string): Promise<void>;
  deleteByAccountId(accountId: string): Promise<number>;
  update(id: string, patch: Partial<SessionRecord>): Promise<void>;
}

// ═══════════════════════════════════════════════════════════
// Epic 1: Verification
// ═══════════════════════════════════════════════════════════

export type VerificationChannel = 'email' | 'phone';
export type VerificationPurpose = 'email_verification' | 'phone_verification' | 'password_reset' | 'mfa_email' | 'mfa_sms';

export interface VerificationTokenRecord {
  tokenHash: string;
  accountId: string;
  tenantId: string;
  channel: VerificationChannel;
  purpose: VerificationPurpose;
  code: string | null; // OTP code (for SMS/Email OTP)
  target: string; // email address or phone number
  expiresAt: string;
  attempts: number;
  maxAttempts: number;
  usedAt: string | null;
  createdAt: string;
}

export interface IVerificationTokenRepository {
  insert(record: Omit<VerificationTokenRecord, 'tokenHash'> & { rawToken: string }): Promise<{ tokenHash: string }>;
  insertOtp(record: Omit<VerificationTokenRecord, 'tokenHash' | 'code'> & { code: string }): Promise<void>;
  findByHash(tokenHash: string): Promise<VerificationTokenRecord | null>;
  findByOtp(target: string, purpose: VerificationPurpose): Promise<VerificationTokenRecord | null>;
  markUsed(tokenHash: string): Promise<void>;
  incrementAttempts(tokenHash: string): Promise<number>;
  invalidateForAccount(accountId: string, purpose: VerificationPurpose): Promise<void>;
  deleteExpired(): Promise<number>;
}

// ═══════════════════════════════════════════════════════════
// Epic 2: Password History
// ═══════════════════════════════════════════════════════════

export interface PasswordHistoryRecord {
  id: string;
  accountId: string;
  tenantId: string;
  passwordHash: string;
  changedAt: string;
}

export interface IPasswordHistoryRepository {
  insert(record: PasswordHistoryRecord): Promise<void>;
  findByAccount(accountId: string, limit?: number): Promise<PasswordHistoryRecord[]>;
  checkReuse(accountId: string, passwordHash: string, checkCount: number): Promise<boolean>;
}

// ═══════════════════════════════════════════════════════════
// Epic 3: OAuth Account Linking
// ═══════════════════════════════════════════════════════════

export interface OAuthAccountRecord {
  id: string;
  accountId: string;
  tenantId: string;
  provider: string;
  providerUserId: string;
  providerEmail: string | null;
  linkedAt: string;
  unlinkedAt: string | null;
}

export interface IOAuthAccountRepository {
  insert(record: OAuthAccountRecord): Promise<void>;
  findByProvider(tenantId: string, provider: string, providerUserId: string): Promise<Result<OAuthAccountRecord, Error>>;
  findByAccount(accountId: string): Promise<OAuthAccountRecord[]>;
  unlink(id: string): Promise<void>;
}

export interface IOAuthProvider {
  readonly name: string;
  exchangeCode(code: string, redirectUri: string): Promise<OAuthTokenResponse>;
  fetchUserProfile(accessToken: string): Promise<OAuthUserProfile>;
}

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope?: string;
  tokenType: string;
}

export interface OAuthUserProfile {
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  pictureUrl?: string;
  locale?: string;
}

// ═══════════════════════════════════════════════════════════
// Epic 4: MFA
// ═══════════════════════════════════════════════════════════

export type MfaMethod = 'totp' | 'email_otp' | 'sms_otp' | 'backup_code';

export interface MfaEnrollmentRecord {
  id: string;
  accountId: string;
  tenantId: string;
  method: MfaMethod;
  secret: string | null; // TOTP secret (encrypted)
  phone: string | null; // for SMS OTP
  email: string | null; // for Email OTP
  enabled: boolean;
  enrolledAt: string;
  disabledAt: string | null;
}

export interface BackupCodeRecord {
  id: string;
  accountId: string;
  tenantId: string;
  codeHash: string;
  usedAt: string | null;
  createdAt: string;
}

export interface IMfaRepository {
  insertEnrollment(record: MfaEnrollmentRecord): Promise<void>;
  findEnrollments(accountId: string): Promise<MfaEnrollmentRecord[]>;
  findEnabledByMethod(accountId: string, method: MfaMethod): Promise<MfaEnrollmentRecord | null>;
  disableEnrollment(id: string): Promise<void>;
  insertBackupCodes(records: BackupCodeRecord[]): Promise<void>;
  findBackupCode(accountId: string, codeHash: string): Promise<BackupCodeRecord | null>;
  markBackupCodeUsed(id: string): Promise<void>;
  countUnusedBackupCodes(accountId: string): Promise<number>;
}

export interface ITotp {
  generateSecret(): string;
  generateUri(secret: string, accountName: string, issuer: string): string;
  verify(secret: string, code: string): boolean;
  generateBackupCodes(count: number): string[];
}

// ═══════════════════════════════════════════════════════════
// Epic 9: Device Trust
// ═══════════════════════════════════════════════════════════

export interface DeviceRecord {
  id: string;
  accountId: string;
  tenantId: string;
  fingerprint: string;
  name: string;
  platform: string;
  trusted: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
}

export interface IDeviceRepository {
  insert(record: DeviceRecord): Promise<void>;
  findByFingerprint(accountId: string, fingerprint: string): Promise<DeviceRecord | null>;
  findByAccount(accountId: string): Promise<DeviceRecord[]>;
  trust(id: string): Promise<void>;
  revoke(id: string): Promise<void>;
  updateLastSeen(id: string): Promise<void>;
}

// ═══════════════════════════════════════════════════════════
// Epic 6: Security (Rate Limit)
// ═══════════════════════════════════════════════════════════

export interface RateLimitEntry {
  key: string;
  count: number;
  windowStart: string;
  blockedUntil: string | null;
}

export interface IRateLimitRepository {
  increment(key: string, windowMs: number): Promise<{ count: number; blocked: boolean }>;
  block(key: string, durationMs: number): Promise<void>;
  reset(key: string): Promise<void>;
  get(key: string): Promise<RateLimitEntry | null>;
}

export interface ICaptchaVerifier {
  verify(token: string): Promise<boolean>;
}

// ═══════════════════════════════════════════════════════════
// Epic 10: Risk Hook
// ═══════════════════════════════════════════════════════════

export type RiskDecision = 'allow' | 'challenge_mfa' | 'deny';

export interface RiskContext {
  accountId: string | null;
  tenantId: string;
  email: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceFingerprint: string | null;
}

export interface IRiskHook {
  evaluate(ctx: RiskContext): Promise<RiskDecision>;
}

// ═══════════════════════════════════════════════════════════
// Policy (from Policy Engine)
// ═══════════════════════════════════════════════════════════

export interface IdentityPolicy {
  password: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumber: boolean;
    requireSpecial: boolean;
    expirationDays: number;
    historyCount: number;
  };
  session: {
    durationHours: number;
    refreshThresholdMinutes: number;
    maxConcurrent: number;
  };
  security: {
    maxLoginFailures: number;
    lockDurationMinutes: number;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    ipLockDurationMinutes: number;
    captchaThreshold: number;
  };
  verification: {
    tokenTtlMinutes: number;
    otpTtlMinutes: number;
    maxAttempts: number;
    resendCooldownSeconds: number;
  };
  mfa: {
    required: boolean;
    backupCodeCount: number;
  };
}

export { type Result };
