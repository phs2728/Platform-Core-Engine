/**
 * Cache Module — Authorization Decision Cache (#5 CTO 리뷰 반영)
 *
 * 사장님 CTO 확립:
 * "Cache Key를 명확히 정의하십시오.
 *  Tenant, Role, Permission, Resource, Attributes가 포함되어야 합니다."
 *
 * Cache Key 구조:
 *   {tenantId}:{accountId}:{permission}:{resourceType}:{resourceId}:{resourceOwner}:{attributesHash}
 *
 * TTL 전략:
 *   ALLOW: 60s (권한 변경 후 최대 60s 지연)
 *   DENY:  10s (보안상 빠른 갱신)
 *   CONDITIONAL: 5s (가장 빠른 만료)
 */

import type { AuthorizationRequest, AuthorizationDecision } from '../interfaces/index.js';

// ═══════════════════════════════════════════
// Cache Entry
// ═══════════════════════════════════════════

interface CacheEntry {
  decision: AuthorizationDecision;
  expiresAt: number;
}

// ═══════════════════════════════════════════
// Cache Key Builder (#5 CTO 리뷰)
// ═══════════════════════════════════════════

/**
 * Cache Key 구성 요소
 */
export interface CacheKeyComponents {
  tenantId: string;
  accountId: string;
  permission: string;
  resourceType: string | null;
  resourceId: string | null;
  resourceOwner: string | null;
  /** 리소스 속성의 해시 (ABAC 정확성 보장) */
  attributesHash: string;
}

/**
 * AuthorizationRequest → CacheKeyComponents
 *
 * Cache Key에는 다음이 모두 포함된다:
 * - Tenant (멀티테넨시 격리)
 * - Account (사용자별 권한)
 * - Permission (권한 키)
 * - Resource type, id, ownerId (ABAC)
 * - Resource attributes hash (속성 기반 조건 정확성)
 */
export function buildCacheKeyComponents(request: AuthorizationRequest): CacheKeyComponents {
  const resource = request.resource;

  // Attributes hash — JSON 정규화 후 간단한 해시
  const attributesHash = resource?.attributes
    ? hashAttributes(resource.attributes)
    : '';

  return {
    tenantId: request.tenantId,
    accountId: request.accountId,
    permission: request.permission,
    resourceType: resource?.type ?? null,
    resourceId: resource?.id ?? null,
    resourceOwner: resource?.ownerId ?? null,
    attributesHash,
  };
}

/**
 * Attributes를 결정론적 해시로 변환
 * (동일한 속성 → 동일한 해시 보장)
 */
function hashAttributes(attributes: Record<string, unknown>): string {
  const sortedKeys = Object.keys(attributes).sort();
  const parts = sortedKeys.map((k) => `${k}=${String(attributes[k])}`);
  return parts.join('|');
}

/**
 * CacheKeyComponents → string
 */
export function buildCacheKey(components: CacheKeyComponents): string {
  return [
    components.tenantId,
    components.accountId,
    components.permission,
    components.resourceType ?? '*',
    components.resourceId ?? '*',
    components.resourceOwner ?? '*',
    components.attributesHash || '*',
  ].join(':');
}

// ═══════════════════════════════════════════
// Decision Cache
// ═══════════════════════════════════════════

export class DecisionCache {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly allowTtlMs: number;
  private readonly denyTtlMs: number;
  private readonly conditionalTtlMs: number;
  private hits = 0;
  private misses = 0;

  constructor(options?: {
    allowTtlMs?: number;
    denyTtlMs?: number;
    conditionalTtlMs?: number;
  }) {
    this.allowTtlMs = options?.allowTtlMs ?? 60_000;        // 60s
    this.denyTtlMs = options?.denyTtlMs ?? 10_000;           // 10s
    this.conditionalTtlMs = options?.conditionalTtlMs ?? 5_000; // 5s
  }

  /**
   * 캐시에서 결과 조회
   */
  get(request: AuthorizationRequest): AuthorizationDecision | null {
    const key = buildCacheKey(buildCacheKeyComponents(request));
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.decision;
  }

  /**
   * 캐시에 결과 저장
   *
   * Decision별로 다른 TTL 적용:
   * - deny: 짧은 TTL (보안상 빠른 갱신)
   * - conditional: 가장 짧은 TTL
   * - allow: 표준 TTL
   */
  set(request: AuthorizationRequest, decision: AuthorizationDecision): void {
    const key = buildCacheKey(buildCacheKeyComponents(request));
    const ttl = this.getTtl(decision.decision);
    this.cache.set(key, {
      decision,
      expiresAt: Date.now() + ttl,
    });
  }

  private getTtl(decision: string): number {
    switch (decision) {
      case 'deny': return this.denyTtlMs;
      case 'conditional': return this.conditionalTtlMs;
      default: return this.allowTtlMs;
    }
  }

  /**
   * 특정 테넌트의 캐시 무효화
   */
  invalidateTenant(tenantId: string): void {
    const prefix = `${tenantId}:`;
    for (const [key] of this.cache) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 특정 사용자의 캐시 무효화 (Role 변경 시)
   */
  invalidateAccount(tenantId: string, accountId: string): void {
    const prefix = `${tenantId}:${accountId}:`;
    for (const [key] of this.cache) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 특정 권한의 캐시 무효화 (Permission 변경 시)
   */
  invalidatePermission(tenantId: string, permission: string): void {
    const prefix = `${tenantId}:`;
    for (const [key] of this.cache) {
      // Key 구조: tenant:account:permission:...
      const parts = key.split(':');
      if (parts[0] === tenantId && parts[2] === permission) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 전체 캐시 무효화
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * 캐시 통계
   */
  getStats(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }
}
