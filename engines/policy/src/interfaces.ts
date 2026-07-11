/**
 * Policy Engine — Public Interfaces
 *
 * 사장님 Platform CTO 확립 (2026-07-11):
 * "Policy Engine이 Platform Core의 두 번째 엔진이 될 것입니다."
 *
 * 사장님 Product Owner 확립 (2026-07-11):
 * "Engine은 Configuration을 직접 조회하지 않는다. 모든 Policy는 Policy Provider를 통해 주입받는다." (헌법 §C-14)
 *
 * 사장님 지정 3개 인터페이스:
 *   - IPolicyProvider
 *   - IConfigurationProvider
 *   - ITenantPolicyResolver
 */

import type {
  PolicyKey,
  PolicyContext,
  PolicyResolution,
  PolicyMeta,
  ResolvedPolicySet,
  ConfigKey,
  ConfigContext,
  ConfigChange,
  PolicyInvalidationScope,
  Unsubscribe,
  EngineName,
} from './types.js';

/**
 * IPolicyProvider
 *
 * 정책 값 조회. 3계층 해결: Tenant → Engine → Global.
 * Engine은 이 인터페이스만 사용. DB 직접 조회 금지 (헌법 §C-15).
 */
export interface IPolicyProvider {
  /**
   * 정책 값 조회 (Context 없이 — Global 기본값)
   * @throws PolicyNotFoundError 정책이 없을 때
   */
  get<T = unknown>(key: PolicyKey): Promise<T>;

  /**
   * 정책 값 조회 (Context 명시)
   */
  get<T = unknown>(context: PolicyContext, key: PolicyKey): Promise<T>;

  /**
   * 정책 존재 여부
   */
  has(key: PolicyKey): Promise<boolean>;
  has(context: PolicyContext, key: PolicyKey): Promise<boolean>;

  /**
   * 정책 메타데이터 (해결 출처 포함)
   */
  getMeta(key: PolicyKey, context?: PolicyContext): Promise<PolicyMeta>;
}

/**
 * IConfigurationProvider
 *
 * 글로벌 설정 조회 + Hot Reload.
 * 정책이 아닌 시스템 설정 (예: 로깅 레벨, DB 연결 정보).
 */
export interface IConfigurationProvider {
  /**
   * 글로벌 설정 값 조회
   */
  get<T = unknown>(key: ConfigKey): Promise<T>;

  /**
   * Context 기반 설정 조회
   */
  get<T = unknown>(context: ConfigContext, key: ConfigKey): Promise<T>;

  /**
   * 설정 변경 감시 (Hot Reload)
   *
   * @returns unsubscribe 함수
   */
  watch<T = unknown>(
    key: ConfigKey,
    callback: (newValue: T, oldValue: T | undefined) => void | Promise<void>,
  ): Unsubscribe;

  /**
   * Context 단위 일괄 감시
   */
  watchAll(
    context: ConfigContext,
    callback: (changes: ConfigChange[]) => void | Promise<void>,
  ): Unsubscribe;
}

/**
 * ITenantPolicyResolver
 *
 * 특정 Tenant의 모든 정책을 한 번에 해결 (캐시 효율성).
 * Use Case 시작 시 한 번 호출 → Use Case 전체에서 사용.
 */
export interface ITenantPolicyResolver {
  /**
   * 특정 Tenant의 특정 Engine 정책 일괄 해결
   * @returns ResolvedPolicySet (key-value 쌍)
   */
  resolveAll(tenantId: string, engine: EngineName): Promise<ResolvedPolicySet>;

  /**
   * 단일 정책 해결 (3계층, 출처 포함)
   */
  resolve<T = unknown>(
    tenantId: string,
    engine: EngineName,
    key: PolicyKey,
  ): Promise<PolicyResolution<T>>;

  /**
   * 캐시 무효화
   */
  invalidate(scope: PolicyInvalidationScope): Promise<void>;
}

/**
 * Policy Engine Deps (호스트 제공)
 *
 * Sprint 2A에서는 Interface만 정의.
 * Sprint 2A 후속에서 실제 구현 (Repository, Cache, Clock, Random, Logger).
 */
export interface PolicyEngineDeps {
  // Sprint 2A 후속: 실제 구현
  // store: IEntityStore
  // cache: IPolicyCache
  // events: IEventBus
  // clock: IClock
  // random: IRandom
  // logger: ILogger
}
