/**
 * Identity Engine — Public API (Sprint 2C-1 MVP)
 *
 * 사장님 Platform Owner 확립 (2026-07-11):
 * Sprint 2C-1 범위 = Account 생성 + Email 로그인 + Password Hash + Session + Logout
 *
 * Use Cases (Email 기반):
 * - createAccountUseCase
 * - loginWithEmailUseCase
 * - logoutUseCase
 *
 * 미구범 (Sprint 2C-2 이후):
 * - OAuth, MFA, Phone Login, Passkey, Account Linking, Device Trust, Social Login
 */

// Core SDK re-export
export {
  type Result,
  Ok,
  Err,
  Ok as ok,
  Err as err,
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

// Interfaces (Host가 구현 주입)
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
} from './interfaces/index.js';

// Use Cases
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
  type LoggedOutPayload,
  type LogoutDeps,
} from './use-cases/LogoutUseCase.js';
