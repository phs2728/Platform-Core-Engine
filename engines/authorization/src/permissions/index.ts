/**
 * Permission Module — Permission Aggregate
 *
 * Permission은 Authorization Engine 내부 Module이다.
 * 독립 Engine이 아니다.
 *
 * Permission만으로는 권한 판단이 불가능하다.
 * Role, Policy, Condition과 함께 사용되어야 한다.
 *
 * ══════════════════════════════════════════
 * Permission String 표준 (#3 CTO 리뷰 반영)
 * ══════════════════════════════════════════
 *
 * Platform 전체에서 dot notation으로 통일:
 *
 *   {resource}.{action}
 *
 *   booking.create    ← O 표준
 *   booking.update    ← O 표준
 *   payment.refund    ← O 표준
 *
 *   booking:create    ← X 사용 금지 (colon notation)
 *   booking-create    ← X 사용 금지
 *
 * Wildcard:
 *   booking.*         ← 모든 booking action
 *   *.*               ← 모든 권한 (superadmin)
 *   *                 ← 모든 권한
 */

export { matchesPermission } from './PermissionMatcher.js';

// ═══════════════════════════════════════════
// Permission String 표준 검증 (#3 CTO 리뷰)
// ═══════════════════════════════════════════

/**
 * Permission String이 표준(dot notation)을 따르는지 검증
 *
 * @returns valid 여부 + 정규화된 key
 */
export function validatePermissionKey(key: string): { valid: boolean; normalized: string; error?: string } {
  const trimmed = key.trim();

  // '*' 또는 '*.*' — 모두 유효
  if (trimmed === '*' || trimmed === '*.*') {
    return { valid: true, normalized: trimmed };
  }

  // Colon notation 감지 → 거부
  if (trimmed.includes(':')) {
    return {
      valid: false,
      normalized: trimmed,
      error: `Colon notation is not allowed. Use dot notation: '${trimmed.replace(/:/g, '.')}'. Standard: {resource}.{action}`,
    };
  }

  // Underline/dash notation 감지 → 경고만 (normalize하지 않음)
  // 'booking_create' 같은 것은 resource.action 구조가 아니므로 거부
  const parts = trimmed.split('.');
  if (parts.length < 2) {
    return {
      valid: false,
      normalized: trimmed,
      error: `Permission key must be '{resource}.{action}' format. Got: '${trimmed}'`,
    };
  }

  // 유효한 dot notation
  return { valid: true, normalized: trimmed };
}

/**
 * Permission String을 표준 형식으로 정규화
 * colon → dot 변환 (레거시 호환용)
 */
export function normalizePermissionKey(key: string): string {
  return key.trim().replace(/:/g, '.');
}

// ═══════════════════════════════════════════
// Permission Definition Helpers
// ═══════════════════════════════════════════

/**
 * Permission Key 파서
 * 'booking.create' → { resource: 'booking', action: 'create' }
 */
export function parsePermissionKey(key: string): { resource: string; action: string } {
  const normalized = normalizePermissionKey(key);
  const parts = normalized.split('.');
  if (parts.length < 2) {
    return { resource: parts[0] ?? '', action: '*' };
  }
  return { resource: parts[0]!, action: parts.slice(1).join('.') };
}

/**
 * Permission Key 생성
 */
export function buildPermissionKey(resource: string, action: string): string {
  return `${resource}.${action}`;
}

/**
 * 표준 CRUD Permission Keys 생성
 */
export function crudPermissions(resource: string): string[] {
  return [
    `${resource}.create`,
    `${resource}.read`,
    `${resource}.update`,
    `${resource}.delete`,
    `${resource}.*`,
  ];
}

/**
 * 표준 CRUD + 커스텀 actions
 */
export function permissionSet(resource: string, actions: string[]): string[] {
  return [...actions, '*'].map((a) => `${resource}.${a}`);
}
