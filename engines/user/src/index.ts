/**
 * User Engine — Public API
 *
 * 사장님 CTO 확립 (2026-07-11):
 * "User Engine은 '사람'을 관리한다.
 *  Identity는 인증을 관리한다.
 *  Authorization은 권한을 관리한다.
 *  절대로 서로의 책임을 침범하지 않는다."
 */

// ═══════════════════════════════════════════
// Core SDK Re-exports
// ═══════════════════════════════════════════

export {
  type Result,
  Ok,
  Err,
  ValidationError,
  NotFoundError,
  ConflictError,
  type EventEnvelope,
  createEnvelope,
  z,
} from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Interfaces
// ═══════════════════════════════════════════

export type * from './interfaces/index.js';

// ═══════════════════════════════════════════
// Use Cases — CRUD
// ═══════════════════════════════════════════

export {
  createUserUseCase,
  type CreateUserInput,
  type CreateUserOutput,
  type CreateUserDeps,
} from './use-cases/CreateUserUseCase.js';

export {
  updateProfileUseCase,
  type UpdateProfileInput,
  type UpdateProfileDeps,
} from './use-cases/UpdateProfileUseCase.js';

export {
  updatePreferenceUseCase,
  type UpdatePreferenceInput,
  type UpdatePreferenceDeps,
} from './use-cases/UpdatePreferenceUseCase.js';

// ═══════════════════════════════════════════
// Use Cases — Attributes (Avatar, Language, Timezone, Tags)
// ═══════════════════════════════════════════

export {
  uploadAvatarUseCase,
  changeLanguageUseCase,
  changeTimezoneUseCase,
  addTagUseCase,
  removeTagUseCase,
  type UploadAvatarInput,
  type ChangeLanguageInput,
  type ChangeTimezoneInput,
  type AddTagInput,
  type RemoveTagInput,
} from './use-cases/UserAttributeUseCases.js';

// ═══════════════════════════════════════════
// Use Cases — Lifecycle (Archive, Restore, Search, Get, List)
// ═══════════════════════════════════════════

export {
  archiveUserUseCase,
  restoreUserUseCase,
  searchUsersUseCase,
  getUserUseCase,
  listUsersUseCase,
  type ArchiveUserInput,
  type RestoreUserInput,
  type SearchUsersInput,
  type GetUserInput,
  type ListUsersInput,
} from './use-cases/UserLifecycleUseCases.js';

// ═══════════════════════════════════════════
// In-Memory Repositories
// ═══════════════════════════════════════════

export { InMemoryUserRepository } from './infrastructure/InMemoryUserRepository.js';
export { InMemoryAuditLogRepository } from './infrastructure/InMemoryAuditLogRepository.js';
