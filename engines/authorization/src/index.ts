/**
 * Authorization Engine — Public API
 *
 * 사장님 CTO 확립 (2026-07-11):
 * "RBAC만으로 부족. RBAC + ABAC + Policy + Resource/Tenant Restriction."
 * "Permission Simulator가 반드시 있어야 한다."
 * "Decision Engine이 모든 Resolver를 orchestration 해야 한다."
 * "explain() API가 있어야 한다."
 *
 * Permission Engine → Authorization Engine 승격 (Platform Architecture Review).
 * Permission은 Authorization Engine 내부 Module이다. 독립 Engine이 아니다.
 *
 * Public API (CTO 리뷰 #8 반영):
 *   authorize(), can(), cannot(), evaluate(), explain(), simulate(), whatIf()
 *
 * ══════════════════════════════════════════
 * Deprecated Backward Compatibility
 * ══════════════════════════════════════════
 * @deprecated 기존 Permission Engine API 호환용.
 * 새 코드는 Authorization Engine API를 사용할 것.
 */

// Interfaces
export type * from './interfaces/index.js';

// ═══════════════════════════════════════════════════════════
// Decision Engine (#1 CTO 리뷰 — 최상위 Orchestrator)
// ═══════════════════════════════════════════════════════════

export {
  evaluate,
  authorize,
  can,
  cannot,
  explain,            // #8 CTO 리뷰
  type DecisionEngineDeps,
} from './decision/index.js';

// ═══════════════════════════════════════════════════════════
// Domain Modules
// ═══════════════════════════════════════════════════════════

// Permission Module (내부) — #3 Permission String 표준
export {
  matchesPermission,
  parsePermissionKey,
  buildPermissionKey,
  crudPermissions,
  permissionSet,
  validatePermissionKey,   // #3 표준 검증
  normalizePermissionKey,  // #3 colon → dot 변환
} from './permissions/index.js';

// Role Module
export {
  extractPermissionKeys,
  isSystemRole,
  getInheritanceDepth,
  isDescendantOf,
  extractConditions,
} from './roles/index.js';

// Policy Module
export {
  sortPoliciesByPriority,
  filterActivePolicies,
  hasDenyPolicy,
  createTenantPolicy,
  createPermissionPolicy,
  createAuthorizationPolicy,
} from './policies/index.js';

// Condition Module — #4 Expression 기반 ABAC
export {
  evaluateCondition,
  evaluateExpression,      // #4 AST 평가
  validateExpression,      // #4 Expression 검증
  buildEvaluationContext,  // #4 평가 컨텍스트
  type EvaluationContext,  // #4
  ownershipCondition,
  resourceTypeCondition,
  attributeCondition,
  timeRestrictionCondition,
  departmentCondition,
  expressionCondition,     // #4 Expression 조건 빌더
  andConditions,
  evaluateTimeRestriction,
  evaluateOwnership,
} from './conditions/index.js';

// Assignment Module
export {
  type AssignmentKind,
  type TypedRoleAssignment,
  createUserAssignment,
  createTenantAssignment,
  isExpired,
  filterValidAssignments,
  matchesScope,
} from './assignments/index.js';

// Resolver Module
export {
  resolveRoleAssignments,
  resolveRolePermissions,
  resolveMatchingPermissions,
  resolvePolicies,
  resolveAll,
  type ResolutionResult,
} from './resolver/index.js';

// Resource Module — #2 CTO 리뷰
export {
  ResourceRegistry,
  extractResourceContext,
  resourcesEqual,
  STANDARD_RESOURCES,
} from './resources/index.js';

// Audit Module — #6 Reason 필수
export {
  recordAudit,
  buildAuthorizationAuditMetadata,
  buildDenyAuditMetadata,
  buildAllowAuditMetadata,
  type AuditLogInput,
} from './audit/index.js';

// Cache Module — #5 명확한 Cache Key
export {
  DecisionCache,
  buildCacheKey,
  buildCacheKeyComponents,
  type CacheKeyComponents,
} from './cache/index.js';

// Events Module
export {
  type AuthorizationEventType,
  createAuthorizationEvent,
} from './events/index.js';

// ═══════════════════════════════════════════════════════════
// Use Cases
// ═══════════════════════════════════════════════════════════

// AuthorizationService (기존 authorizeUseCase — Legacy Wrapper)
export { authorizeUseCase, type AuthorizeDeps } from './use-cases/AuthorizeUseCase.js';

// Permission Simulator + What-If — #7 CTO 리뷰
export {
  simulatePermissionsUseCase,
  whatIfUseCase,
  type SimulatorDeps,
} from './use-cases/SimulatePermissionsUseCase.js';

// Management Services: RoleService, PermissionService, PolicyService, AssignmentService
export {
  createRoleUseCase,
  assignPermissionToRoleUseCase,
  assignRoleUseCase,
  createPolicyUseCase,
  type CreateRoleInput,
  type AssignPermissionInput,
  type AssignRoleInput,
  type CreatePolicyInput,
} from './use-cases/ManagementUseCases.js';

// ═══════════════════════════════════════════════════════════
// Legacy Domain (하위 호환 — 기존 domain/PermissionMatcher.ts)
// ═══════════════════════════════════════════════════════════

export { matchesPermission as legacyMatchesPermission } from './domain/PermissionMatcher.js';

// ═══════════════════════════════════════════════════════════
// In-Memory Repositories
// ═══════════════════════════════════════════════════════════

export {
  InMemoryRoleRepository,
  InMemoryPermissionRepository,
  InMemoryRolePermissionRepository,
  InMemoryRoleAssignmentRepository,
  InMemoryPolicyRepository,
  InMemoryAuditLogRepository,
} from './infrastructure/InMemoryRepositories.js';

// ═══════════════════════════════════════════════════════════
// Core SDK re-exports
// ═══════════════════════════════════════════════════════════

export { type Result, Ok, Err, ValidationError, NotFoundError, ConflictError, type EventEnvelope, createEnvelope } from '@platform/core-sdk';
