/**
 * Resource Module — 권한 판단의 대상 (#2 CTO 리뷰 반영)
 *
 * Booking, Order, Payment, Review, Media, CMS 등
 * 모든 Business Entity가 Resource가 될 수 있다.
 *
 * Authorization Engine은 Resource의 CRUD를 수행하지 않는다.
 * Resource의 타입과 속성을 기반으로 권한 판단에 사용한다.
 */

import type { IResource, IResourceDefinition } from '../interfaces/index.js';

// ═══════════════════════════════════════════
// Resource Registry
// ═══════════════════════════════════════════

/**
 * ResourceRegistry — 플랫폼의 리소스 타입을 등록하고 관리.
 *
 * 각 Business Engine이 자신의 리소스 타입을 등록한다.
 * Authorization Engine은 등록된 리소스 타입을 기반으로 권한을 검증한다.
 */
export class ResourceRegistry {
  private readonly definitions = new Map<string, IResourceDefinition>();

  /**
   * 리소스 정의 등록
   */
  register(definition: IResourceDefinition): void {
    this.definitions.set(definition.type, definition);
  }

  /**
   * 리소스 정의 조회
   */
  get(type: string): IResourceDefinition | null {
    return this.definitions.get(type) ?? null;
  }

  /**
   * 리소스 타입이 등록되어 있는지 확인
   */
  has(type: string): boolean {
    return this.definitions.has(type);
  }

  /**
   * 모든 리소스 정의 조회
   */
  list(): IResourceDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * 리소스가 특정 권한을 지원하는지 확인
   */
  supportsPermission(type: string, permissionKey: string): boolean {
    const def = this.definitions.get(type);
    if (!def) return true; // 미등록 리소스는 통과 (느슨한 검증)
    return def.permissions.some((p) => p === permissionKey || p === `${type}.*`);
  }

  /**
   * 등록 해제
   */
  unregister(type: string): void {
    this.definitions.delete(type);
  }
}

// ═══════════════════════════════════════════
// Resource Helpers
// ═══════════════════════════════════════════

/**
 * Resource에서 권한 판단에 필요한 컨텍스트 추출
 */
export function extractResourceContext(resource: IResource | undefined): {
  hasResource: boolean;
  type: string | null;
  ownerId: string | null;
  attributes: Record<string, unknown>;
} {
  if (!resource) {
    return { hasResource: false, type: null, ownerId: null, attributes: {} };
  }
  return {
    hasResource: true,
    type: resource.type,
    ownerId: resource.ownerId ?? null,
    attributes: resource.attributes ?? {},
  };
}

/**
 * 두 Resource가 동일한지 확인 (Cache Key 생성용)
 */
export function resourcesEqual(
  a: IResource | undefined,
  b: IResource | undefined,
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.type === b.type && a.id === b.id && (a.ownerId ?? '') === (b.ownerId ?? '');
}

/**
 * 표준 Business Resource Definitions (선택적 등록용)
 */
export const STANDARD_RESOURCES: IResourceDefinition[] = [
  {
    type: 'booking',
    description: 'Booking — 예약 관리',
    permissions: ['booking.create', 'booking.read', 'booking.update', 'booking.delete', 'booking.cancel', 'booking.*'],
  },
  {
    type: 'payment',
    description: 'Payment — 결제 관리',
    permissions: ['payment.create', 'payment.read', 'payment.refund', 'payment.*'],
  },
  {
    type: 'review',
    description: 'Review — 리뷰 관리',
    permissions: ['review.create', 'review.read', 'review.update', 'review.delete', 'review.*'],
  },
  {
    type: 'media',
    description: 'Media — 미디어 관리',
    permissions: ['media.create', 'media.read', 'media.update', 'media.delete', 'media.*'],
  },
  {
    type: 'cms',
    description: 'CMS — 콘텐츠 관리',
    permissions: ['cms.create', 'cms.read', 'cms.update', 'cms.delete', 'cms.*'],
  },
];
