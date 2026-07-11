/**
 * Policy Module — Authorization Policy / Permission Policy / Tenant Policy
 *
 * Policy는 allow/deny 효과를 가지며, Permission Pattern + Condition으로 구성된다.
 * deny 정책이 allow보다 항상 우선한다.
 */

import type { IPolicy, PolicyEffect, PolicyCondition } from '../interfaces/index.js';

// ═══════════════════════════════════════════
// Policy Helpers
// ═══════════════════════════════════════════

/**
 * Policy 우선순위 정렬 (높을수록 먼저 평가)
 */
export function sortPoliciesByPriority(policies: IPolicy[]): IPolicy[] {
  return [...policies].sort((a, b) => b.priority - a.priority);
}

/**
 * 활성화된 Policy만 필터
 */
export function filterActivePolicies(policies: IPolicy[]): IPolicy[] {
  return policies.filter((p) => p.enabled);
}

/**
 * deny 정책이 있는지 확인
 */
export function hasDenyPolicy(policies: IPolicy[]): boolean {
  return policies.some((p) => p.enabled && p.effect === 'deny');
}

/**
 * Tenant Policy: 테넌트 전체에 적용되는 기본 정책
 */
export function createTenantPolicy(params: {
  tenantId: string;
  name: string;
  effect: PolicyEffect;
  permissionPattern: string;
  priority?: number;
}): Omit<IPolicy, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    tenantId: params.tenantId,
    name: params.name,
    description: `Tenant policy: ${params.name}`,
    effect: params.effect,
    permissionPattern: params.permissionPattern,
    condition: null,
    priority: params.priority ?? 0,
    enabled: true,
  };
}

/**
 * Permission Policy: 특정 Permission에 대한 정책
 */
export function createPermissionPolicy(params: {
  tenantId: string;
  name: string;
  permissionPattern: string;
  effect: PolicyEffect;
  condition?: PolicyCondition | null;
  priority?: number;
}): Omit<IPolicy, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    tenantId: params.tenantId,
    name: params.name,
    description: `Permission policy: ${params.name}`,
    effect: params.effect,
    permissionPattern: params.permissionPattern,
    condition: params.condition ?? null,
    priority: params.priority ?? 50,
    enabled: true,
  };
}

/**
 * Authorization Policy: ABAC 기반 복합 정책
 */
export function createAuthorizationPolicy(params: {
  tenantId: string;
  name: string;
  permissionPattern: string;
  effect: PolicyEffect;
  condition: PolicyCondition;
  priority?: number;
}): Omit<IPolicy, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    tenantId: params.tenantId,
    name: params.name,
    description: `Authorization policy (ABAC): ${params.name}`,
    effect: params.effect,
    permissionPattern: params.permissionPattern,
    condition: params.condition,
    priority: params.priority ?? 100,
    enabled: true,
  };
}
