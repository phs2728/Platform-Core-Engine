/**
 * Organization Engine — Status State Machine
 *
 * 사장님 spec §Organization Status:
 *  Pending → Active → Suspended → Archived → Deleted
 *           ↑________|         (restore 가능)
 */

import { ConflictError, Err, Ok, type Result } from '@platform/core-sdk';
import {
  ALLOWED_STATUS_TRANSITIONS,
  type OrganizationStatus,
} from '../interfaces/index.js';

export function validateStatusTransition(
  current: OrganizationStatus,
  next: OrganizationStatus,
): Result<true, ConflictError> {
  if (current === next) {
    return Err(new ConflictError(
      `Organization is already in status "${current}"`,
      { details: { current, next } },
    ));
  }
  if (current === 'Deleted') {
    return Err(new ConflictError(
      'Deleted organization cannot transition to any other status',
      { details: { current } },
    ));
  }
  if (current === 'Archived') {
    // Archived → Active 는 별도 restore API. 여기서 직접 Archived → 다른 상태는 거부.
    if (next !== 'Archived') {
      return Err(new ConflictError(
        'Archived organization can only be transitioned to "Active" via restoreOrganizationUseCase',
        { details: { current, next } },
      ));
    }
    return Err(new ConflictError(
      'Already Archived',
      { details: { current, next } },
    ));
  }

  const allowed = ALLOWED_STATUS_TRANSITIONS[current];
  if (!allowed.includes(next)) {
    return Err(new ConflictError(
      `Status transition "${current}" → "${next}" is not allowed`,
      { details: { current, next, allowed } },
    ));
  }
  return Ok(true);
}

/**
 * 변경 가능 status 확인. Archived/Deleted 조직은 어떤 변경도 받을 수 없음.
 */
export function isMutable(status: OrganizationStatus): boolean {
  return status !== 'Archived' && status !== 'Deleted';
}

/**
 * restore 가능한 Archived 상태 검증.
 */
export function canRestore(status: OrganizationStatus): boolean {
  return status === 'Archived';
}
