/**
 * Organization Engine — Public API
 *
 * 사장님 spec §Public API (16 use cases + 6 repositories + 14 domain types):
 *   createOrganization / updateOrganization / archiveOrganization /
 *   restoreOrganization / deleteOrganization / getOrganization /
 *   searchOrganizations / listOrganizations / addMember /
 *   removeMember / changeMembership / listMembers /
 *   updateOrganizationProfile / changeOrganizationStatus /
 *   changeOrganizationType / createBranch / createDepartment /
 *   createTeam / moveDepartment / moveTeam
 *
 * Boundary Discipline:
 *   - User/Address Engine을 직접 import 하지 않음.
 *     Host가 IUserVerifier / IAddressVerifier를 주입.
 *   - Policy Engine을 직접 import 하지 않음.
 *     Host가 IOrganizationPolicyProvider를 주입.
 *   - Event Bus는 EventEnvelope 형식으로만 발행.
 *   - Authorization Engine은 직접 호출하지 않음 (Engine 외부 결정).
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
// Domain Types & Constants
// ═══════════════════════════════════════════
export type {
  Organization,
  OrganizationProfile,
  OrganizationMetadata,
  OrganizationStatus,
  OrganizationType,
  Membership,
  MembershipType,
  Department,
  Branch,
  Team,
  HierarchyNodeType,
  OrganizationSearchCriteria,
  OrganizationSearchResult,
  MemberListCriteria,
  OrganizationAuditRecord,
  OrganizationAuditEventType,
} from './interfaces/index.js';

export {
  DEFAULT_PROFILE,
  DEFAULT_METADATA,
  SUPPORTED_ORGANIZATION_TYPES,
  SUPPORTED_MEMBERSHIP_TYPES,
  SUPPORTED_ORGANIZATION_STATUSES,
  ALLOWED_STATUS_TRANSITIONS,
} from './interfaces/index.js';

// ═══════════════════════════════════════════
// Host Interfaces (Host가 구현 주입)
// ═══════════════════════════════════════════
export type {
  IClock,
  IIdGenerator,
  IEventBus,
  IUserVerifier,
  IAddressVerifier,
  IOrganizationPolicyProvider,
} from './interfaces/index.js';

// ═══════════════════════════════════════════
// Repositories
// ═══════════════════════════════════════════
export type {
  IOrganizationRepository,
  IDepartmentRepository,
  IBranchRepository,
  ITeamRepository,
  IMembershipRepository,
  IOrganizationAuditRepository,
} from './interfaces/index.js';

// ═══════════════════════════════════════════
// Organization Lifecycle UseCases
// ═══════════════════════════════════════════
export {
  createOrganizationUseCase,
  updateOrganizationUseCase,
  updateOrganizationProfileUseCase,
  archiveOrganizationUseCase,
  restoreOrganizationUseCase,
  deleteOrganizationUseCase,
  getOrganizationUseCase,
  searchOrganizationsUseCase,
  listOrganizationsUseCase,
  changeOrganizationStatusUseCase,
  changeOrganizationTypeUseCase,
  type CreateOrganizationInput,
  type CreateOrganizationOutput,
  type UpdateOrganizationInput,
  type UpdateOrganizationError,
  type UpdateOrganizationProfileInput,
  type ArchiveOrganizationInput,
  type ArchiveOrganizationError,
  type RestoreOrganizationInput,
  type RestoreOrganizationError,
  type DeleteOrganizationInput,
  type DeleteOrganizationError,
  type GetOrganizationInput,
  type ListOrganizationsInput,
  type ChangeOrganizationStatusInput,
  type ChangeOrganizationTypeInput,
} from './use-cases/OrganizationLifecycleUseCases.js';

// ═══════════════════════════════════════════
// Membership UseCases
// ═══════════════════════════════════════════
export {
  addMemberUseCase,
  removeMemberUseCase,
  changeMembershipUseCase,
  listMembersUseCase,
  type AddMemberInput,
  type AddMemberError,
  type RemoveMemberInput,
  type ChangeMembershipInput,
  type ListMembersInput,
} from './use-cases/MembershipUseCases.js';

// ═══════════════════════════════════════════
// Hierarchy UseCases
// ═══════════════════════════════════════════
export {
  createBranchUseCase,
  createDepartmentUseCase,
  createTeamUseCase,
  moveDepartmentUseCase,
  moveTeamUseCase,
  type CreateBranchInput,
  type CreateBranchError,
  type CreateDepartmentInput,
  type CreateTeamInput,
  type MoveDepartmentInput,
  type MoveTeamInput,
} from './use-cases/HierarchyUseCases.js';

// ═══════════════════════════════════════════
// UseCase Deps
// ═══════════════════════════════════════════
export type { OrganizationUseCaseDeps } from './use-cases/types.js';

// ═══════════════════════════════════════════
// In-Memory Repositories (Test/Demo)
// ═══════════════════════════════════════════
export {
  InMemoryOrganizationRepository,
} from './infrastructure/InMemoryOrganizationRepository.js';

export {
  InMemoryDepartmentRepository,
  InMemoryBranchRepository,
  InMemoryTeamRepository,
  InMemoryMembershipRepository,
  InMemoryOrganizationAuditRepository,
} from './infrastructure/InMemoryRepositories.js';

// ═══════════════════════════════════════════
// Host Stubs (Test/Demo only)
// ═══════════════════════════════════════════
export {
  InMemoryUserVerifier,
  InMemoryAddressVerifier,
  StaticOrganizationPolicyProvider,
} from './infrastructure/hostAdapters.js';

export {
  InMemoryEventBus,
  type RecordedEnvelope,
} from './infrastructure/InMemoryEventBus.js';

// ═══════════════════════════════════════════
// Domain Helpers (Cycle detection, status transition)
// ═══════════════════════════════════════════
export {
  checkMoveCreatesCycle,
  validateParent,
  summarizeHierarchy,
  type HierarchySummary,
  type HierarchyNode,
} from './domain/hierarchy.js';

export {
  validateStatusTransition,
  isMutable,
  canRestore,
} from './domain/statusTransition.js';
