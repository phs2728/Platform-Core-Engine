/**
 * Policy Engine — Public API
 *
 * 사장님 Platform CTO 확립 (2026-07-11):
 * "Policy Engine이 Platform Core의 두 번째 엔진이 될 것입니다."
 *
 * 헌법 §C-14 (Policy Injection) 준수:
 * - 모든 정책 조회는 이 인터페이스를 통해서만
 * - Engine은 Configuration을 직접 DB 조회하지 않음
 *
 * Sprint 2A 범위:
 * - 인터페이스 (interfaces.ts)
 * - 타입 (types.ts)
 * - 에러 (errors.ts)
 * - 3계층 해결 알고리즘 (resolver.ts)
 * - Configuration Loader + zod Schema (loader.ts)
 *
 * Sprint 2A 후속 (Sprint 2C와 함께):
 * - Repository (DB 연결)
 * - Provider 구현 (실제 IPolicyProvider)
 * - Hot Reload (Watch API)
 * - Event 발행 (policy.created/updated/deleted)
 */

// Types
export type {
  PolicyKey,
  ConfigKey,
  EngineName,
  PolicyContext,
  ConfigContext,
  PolicyResolution,
  PolicySource,
  ResolvedPolicySet,
  PolicyMeta,
  ConfigChange,
  PolicyInvalidationScope,
  Unsubscribe,
} from './types.js';

// Errors
export {
  PolicyError,
  PolicyNotFoundError,
  PolicySchemaError,
  PolicyConflictError,
  PolicyInternalError,
} from './errors.js';

// Interfaces (사장님 지정 3개)
export type {
  IPolicyProvider,
  IConfigurationProvider,
  ITenantPolicyResolver,
  PolicyEngineDeps,
} from './interfaces.js';

// Resolver (3계층 해결 알고리즘)
export {
  resolvePolicy,
  type ResolutionInput,
  type ResolutionResult,
} from './resolver.js';

// Configuration Loader
export {
  PolicySchemaRegistry,
  ConfigurationLoader,
  type PolicyDefinition,
  StandardPolicySchemas,
} from './loader.js';
