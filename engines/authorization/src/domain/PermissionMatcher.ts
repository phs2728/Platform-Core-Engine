/**
 * Permission Wildcard Matcher
 *
 * 'booking.*' matches 'booking.create', 'booking.view', etc.
 * '*.*' matches everything.
 * 'payment.refund' matches exactly 'payment.refund'.
 */

export function matchesPermission(pattern: string, permission: string): boolean {
  if (pattern === '*') return true;
  if (pattern === '*.*') return true;

  // Split into parts
  const patternParts = pattern.split('.');
  const permParts = permission.split('.');

  if (patternParts.length !== permParts.length) {
    // 'booking.*' vs 'booking.create' → same length (2)
    // But 'booking.*' could match 'booking.create.view'? No — exact part count.
    // Actually wildcard at last position: 'booking.*' should match any booking.xxx
    if (patternParts[patternParts.length - 1] === '*') {
      // Check prefix matches
      for (let i = 0; i < patternParts.length - 1; i++) {
        if (patternParts[i] !== '*' && patternParts[i] !== permParts[i]) return false;
      }
      return true;
    }
    return false;
  }

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i] !== '*' && patternParts[i] !== permParts[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Condition Evaluator (ABAC)
 *
 * 사장님 확립:
 * "가이드는 tour.edit ONLY Assigned Tour"
 * "호텔 직원은 room.update ONLY Own Hostel"
 */

import type { PolicyCondition, AuthorizationRequest } from '../interfaces/index.js';

export function evaluateCondition(
  condition: PolicyCondition,
  request: AuthorizationRequest,
): boolean {
  // 1. Resource type 제한
  if (condition.resourceType && request.resource?.type !== condition.resourceType) {
    return false;
  }

  // 2. Ownership 확인
  if (condition.requireOwnership) {
    if (!request.resource?.ownerId) return false;
    if (request.resource.ownerId !== request.accountId) return false;
  }

  // 3. 속성 매칭
  if (condition.attributes && request.resource?.attributes) {
    for (const [key, value] of Object.entries(condition.attributes)) {
      if (request.resource.attributes[key] !== value) {
        return false;
      }
    }
  }

  // 4. 시간 제한
  if (condition.timeRestriction) {
    const now = new Date();
    const hour = now.getHours();
    const start = parseInt(condition.timeRestriction.start.split(':')[0]!, 10);
    const end = parseInt(condition.timeRestriction.end.split(':')[0]!, 10);
    const inRange = start < end ? (hour >= start && hour < end) : (hour >= start || hour < end);
    if (!inRange) return false;
  }

  return true;
}
