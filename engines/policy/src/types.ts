/**
 * Policy Engine — Type Definitions
 *
 * 헌법 §C-14 (Policy Injection) 참조.
 * 모든 엔진은 Configuration을 직접 조회하지 않고, 이 타입들을 통해 Policy Engine과 통신.
 */

/**
 * Policy Key
 *
 * dot-notation. 예: 'security.password.minLength'
 * 사장님 확립 (헌법 §12.11 + Decision≠Configuration): Configuration 값은 Policy Engine에 저장.
 */
export type PolicyKey = `${string}.${string}.${string}`;

/**
 * Configuration Key
 *
 * 전역 설정 (Tenant/Engine 무관). 예: 'platform.version'
 */
export type ConfigKey = `${string}.${string}`;

/**
 * Engine 식별자
 *
 * Policy Engine이 Policy Key를 lookup할 때 어느 엔진의 책임인지 식별.
 */
export type EngineName =
  | 'identity'
  | 'notification'
  | 'media'
  | 'cms'
  | 'booking'
  | 'payment'
  | 'review'
  | 'analytics'
  | 'ai'
  | 'workflow'
  | 'universal-core'
  | 'policy'
  | 'core-sdk';

/**
 * Policy 호출 Context
 *
 * 3계층 해결 시 Tenant/Engine/User 식별.
 */
export interface PolicyContext {
  /** Tenant ID (없으면 Global 기본값 사용) */
  tenantId?: string;
  /** Engine 식별자 */
  engine: EngineName;
  /** User ID (선택 — User별 Override 가능) */
  userId?: string;
}

/**
 * Configuration 호출 Context
 */
export interface ConfigContext {
  tenantId?: string;
  engine?: EngineName;
}

/**
 * Policy 해결 결과
 *
 * 사장님 확립: "Engine은 정책 출처를 모른다" — 그러나 Audit/Debug용으로 source 제공.
 */
export interface PolicyResolution<T = unknown> {
  value: T;
  source: PolicySource;
  policyId?: string;
  resolvedAt: string;
  schemaRef?: string;
}

export type PolicySource = 'tenant' | 'engine' | 'global' | 'default';

/**
 * 일괄 해결된 Policy Set (캐시 단위)
 */
export interface ResolvedPolicySet {
  tenantId: string;
  engine: EngineName;
  policies: Record<string, PolicyResolution<unknown>>;
  resolvedAt: string;
  version: number;
}

/**
 * Policy 메타데이터
 */
export interface PolicyMeta {
  key: PolicyKey;
  source: PolicySource;
  exists: boolean;
  description?: string;
  schemaRef?: string;
  version?: number;
}

/**
 * Hot Reload Event
 */
export interface ConfigChange<T = unknown> {
  key: ConfigKey | PolicyKey;
  oldValue: T | undefined;
  newValue: T;
  changedAt: string;
  changedBy: string;
}

/**
 * Cache Invalidation Scope
 */
export interface PolicyInvalidationScope {
  tenantId?: string;
  engine?: EngineName;
  key?: PolicyKey;
  /** true면 전체 무효화 */
  all?: boolean;
}

/**
 * Unsubscribe (Hot Reload)
 */
export type Unsubscribe = () => void;
