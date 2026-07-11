/**
 * Identity Engine — Public API (Sprint 2C-2 COMPLETE)
 *
 * 사장님 Platform Owner 확립 (2026-07-11) Sprint 2C-2:
 * - RFC-026 Email Verification
 * - RFC-027 Password Reset
 * - RFC-028 Account Lock
 * - RFC-029 Session Refresh (Rotation)
 * - RFC-030 Audit Log
 * - RFC-031 OAuth
 */

// Core SDK re-export
export {
  type Result,
  Ok,
  Err,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  type EventEnvelope,
  createEnvelope,
  Email,
  Password,
  validate,
  z,
} from '@platform/core-sdk';

// Interfaces (Host 주입)
export type {
  IClock,
  IIdGenerator,
  IPasswordHasher,
  ISessionSigner,
  SessionPayload,
  AccountRecord,
  IAccountRepository,
  SessionRecord,
  ISessionRepository,
  IEventBus,
  IAuditLogRepository,
  AuditEventType,
  AuditLogRecord,
  IVerificationTokenRepository,
  VerificationTokenType,
  VerificationTokenRecord,
  IEmailSender,
  EmailMessage,
} from './interfaces/index.js';

// Sprint 2C-1 Use Cases
export {
  createAccountUseCase,
  type CreateAccountInput,
  type CreateAccountOutput,
  type CreateAccountDeps,
  type AccountCreatedPayload,
} from './use-cases/CreateAccountUseCase.js';

export {
  loginWithEmailUseCase,
  type LoginInput,
  type LoginOutput,
  type LoginDeps,
  type LoginSuccessPayload,
  type LoginFailurePayload,
} from './use-cases/LoginWithEmailUseCase.js';

export {
  logoutUseCase,
  type LogoutInput,
  type LogoutDeps,
  type LoggedOutPayload,
} from './use-cases/LogoutUseCase.js';

// Sprint 2C-2 Use Cases
export {
  requestEmailVerificationUseCase,
  confirmEmailVerificationUseCase,
  type RequestEmailVerificationInput,
  type RequestEmailVerificationOutput,
  type RequestEmailVerificationDeps,
  type ConfirmEmailVerificationInput,
  type ConfirmEmailVerificationOutput,
  type ConfirmEmailVerificationDeps,
} from './use-cases/VerifyEmailUseCase.js';

export {
  requestPasswordResetUseCase,
  confirmPasswordResetUseCase,
  type PasswordResetRequestInput,
  type PasswordResetRequestOutput,
  type PasswordResetRequestDeps,
  type PasswordResetConfirmInput,
  type PasswordResetConfirmOutput,
  type PasswordResetConfirmDeps,
} from './use-cases/PasswordResetUseCase.js';

export {
  refreshSessionUseCase,
  type SessionRefreshInput,
  type SessionRefreshOutput,
  type SessionRefreshDeps,
} from './use-cases/RefreshSessionUseCase.js';

export {
  oauthLoginUseCase,
  GoogleOAuthProvider,
  type OAuthLoginInput,
  type OAuthLoginOutput,
  type OAuthLoginDeps,
  type IOAuthProvider,
  type OAuthTokenResponse,
  type OAuthUserProfile,
} from './use-cases/OAuthLoginUseCase.js';

// In-Memory Implementations (테스트 + 개발용)
export {
  InMemoryAccountRepository,
  type AccountRecordExtended,
} from './infrastructure/InMemoryAccountRepository.js';
export { InMemorySessionRepository } from './infrastructure/InMemorySessionRepository.js';
export {
  InMemoryVerificationTokenRepository,
  hashToken,
  type VerificationTokenType as _VerificationTokenType,
} from './infrastructure/InMemoryVerificationTokenRepository.js';
export {
  InMemoryAuditLogRepository,
  type IAuditLogRepository as _IAuditLogRepositoryImpl,
} from './infrastructure/InMemoryAuditLogRepository.js';
export { InMemoryEmailSender } from './interfaces/IEmailSender.js';

// Audit helper
export { recordAudit, type AuditLogInput } from './domain/audit.js';
