/**
 * Identity Engine — Public API (Sprint 2C-3 Enterprise Grade)
 *
 * 사장님 Engineering Manager 확립 (2026-07-11):
 * 10 Epics: Verification / Password / OAuth / MFA / Session / Security / Audit / Linking / Device / Risk
 *
 * 모든 Use Case는 Result<T,E> 반환
 * 모든 오류는 PlatformError 계층
 * 모든 상태 변경은 EventEnvelope 발행
 */

// ═══════════════════════════════════════════
// Core SDK Re-exports
// ═══════════════════════════════════════════

export {
  type Result,
  Ok,
  Err,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  InternalError,
  type EventEnvelope,
  createEnvelope,
  Email,
  Password,
  validate,
  z,
} from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Interfaces
// ═══════════════════════════════════════════

export type * from './interfaces/index.js';

// ═══════════════════════════════════════════
// Account Use Cases
// ═══════════════════════════════════════════

export {
  createAccountUseCase,
  type CreateAccountInput,
  type CreateAccountOutput,
  type CreateAccountDeps,
} from './use-cases/account/CreateAccountUseCase.js';

// ═══════════════════════════════════════════
// Login (Epic 5+6+9+10 Enterprise)
// ═══════════════════════════════════════════

export {
  loginUseCase,
  type LoginInput,
  type LoginOutput,
  type LoginDeps,
} from './use-cases/LoginUseCase.js';

// ═══════════════════════════════════════════
// Session Management (Epic 5)
// ═══════════════════════════════════════════

export {
  logoutAllUseCase,
  revokeSessionUseCase,
  refreshSessionUseCase,
  type LogoutAllInput,
  type LogoutAllDeps,
  type RevokeSessionInput,
  type RevokeSessionDeps,
  type RefreshSessionInput,
  type RefreshSessionOutput,
  type RefreshSessionDeps,
} from './use-cases/session/SessionManagementUseCases.js';

// ═══════════════════════════════════════════
// MFA (Epic 4)
// ═══════════════════════════════════════════

export {
  enrollTotpUseCase,
  type EnrollTotpInput,
  type EnrollTotpOutput,
  type EnrollTotpDeps,
} from './use-cases/mfa/EnrollTotpUseCase.js';

export {
  verifyMfaUseCase,
  type VerifyMfaInput,
  type VerifyMfaDeps,
} from './use-cases/mfa/VerifyMfaUseCase.js';

// ═══════════════════════════════════════════
// Device Trust (Epic 9)
// ═══════════════════════════════════════════

export {
  trustDeviceUseCase,
  revokeDeviceUseCase,
  listDevicesUseCase,
  type TrustDeviceInput,
  type TrustDeviceDeps,
  type RevokeDeviceInput,
} from './use-cases/device/DeviceTrustUseCases.js';

// ═══════════════════════════════════════════
// Verification (Epic 1)
// ═══════════════════════════════════════════

export {
  requestEmailVerificationUseCase,
  type RequestEmailVerificationInput,
  type RequestEmailVerificationOutput,
  type RequestEmailVerificationDeps,
} from './use-cases/verification/RequestEmailVerificationUseCase.js';

export {
  confirmEmailVerificationUseCase,
  type ConfirmEmailVerificationInput,
  type ConfirmEmailVerificationOutput,
  type ConfirmEmailVerificationDeps,
} from './use-cases/verification/ConfirmEmailVerificationUseCase.js';

export {
  requestPhoneVerificationUseCase,
  type RequestPhoneVerificationInput,
  type RequestPhoneVerificationOutput,
  type RequestPhoneVerificationDeps,
} from './use-cases/verification/RequestPhoneVerificationUseCase.js';

export {
  confirmPhoneVerificationUseCase,
  type ConfirmPhoneVerificationInput,
  type ConfirmPhoneVerificationOutput,
  type ConfirmPhoneVerificationDeps,
} from './use-cases/verification/ConfirmPhoneVerificationUseCase.js';

export {
  resendVerificationUseCase,
  type ResendVerificationInput,
  type ResendVerificationOutput,
  type ResendVerificationDeps,
} from './use-cases/verification/ResendVerificationUseCase.js';

export {
  sendOtpUseCase,
  type SendOtpInput,
  type SendOtpOutput,
  type SendOtpDeps,
  type SendOtpChannel,
} from './use-cases/verification/SendOtpUseCase.js';

// ═══════════════════════════════════════════
// Password (Epic 2)
// ═══════════════════════════════════════════

export {
  changePasswordUseCase,
  type ChangePasswordInput,
  type ChangePasswordOutput,
  type ChangePasswordDeps,
} from './use-cases/password/ChangePasswordUseCase.js';

export {
  requestPasswordResetUseCase,
  type RequestPasswordResetInput,
  type RequestPasswordResetOutput,
  type RequestPasswordResetDeps,
} from './use-cases/password/RequestPasswordResetUseCase.js';

export {
  confirmPasswordResetUseCase,
  type ConfirmPasswordResetInput,
  type ConfirmPasswordResetOutput,
  type ConfirmPasswordResetDeps,
} from './use-cases/password/ConfirmPasswordResetUseCase.js';

export {
  forcePasswordChangeUseCase,
  isPasswordChangeRequired,
  type ForcePasswordChangeInput,
  type ForcePasswordChangeOutput,
  type ForcePasswordChangeDeps,
} from './use-cases/password/ForcePasswordChangeUseCase.js';

// ═══════════════════════════════════════════
// In-Memory Repositories
// ═══════════════════════════════════════════

export { InMemoryAccountRepository } from './infrastructure/InMemoryAccountRepository.js';
export { InMemorySessionRepository } from './infrastructure/InMemorySessionRepository.js';
export { InMemoryAuditLogRepository } from './infrastructure/InMemoryAuditLogRepository.js';
export {
  InMemoryVerificationTokenRepository,
  hashToken,
} from './infrastructure/InMemoryVerificationTokenRepository.js';
export { InMemoryPasswordHistoryRepository } from './infrastructure/InMemoryPasswordHistoryRepository.js';
export { InMemoryOAuthAccountRepository } from './infrastructure/InMemoryOAuthAccountRepository.js';
export { InMemoryMfaRepository } from './infrastructure/InMemoryMfaRepository.js';
export { InMemoryDeviceRepository } from './infrastructure/InMemoryDeviceRepository.js';
export { InMemoryRateLimitRepository } from './infrastructure/InMemoryRateLimitRepository.js';
export { TotpImpl } from './infrastructure/TotpImpl.js';
export {
  InMemoryEmailSender,
  InMemorySmsSender,
  InMemoryRandom,
} from './infrastructure/InMemorySenders.js';

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export { recordAudit, type AuditLogInput } from './domain/audit.js';

// ═══════════════════════════════════════════
// OAuth (subagent가 작성 중 — 완료 시 export)
// ═══════════════════════════════════════════
