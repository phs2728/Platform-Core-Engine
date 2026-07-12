/**
 * Review Engine — 8-state Status Machine
 *
 * 사장님 확립 (2026-07-11):
 *   Draft → Pending → Published
 *   Published → Hidden / Reported
 *   Hidden → Published (restore)
 *   Reported → Published / Rejected (resolve)
 *   Draft/Rejected/Published → Archived
 *   Archived → Published (restore)
 *   Deleted = terminal
 */

import { ConflictError, Err, Ok, type Result } from '@platform/core-sdk';

export const ALLOWED_REVIEW_STATUS_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  Draft:     ['Pending', 'Published', 'Archived', 'Deleted'],
  Pending:   ['Published', 'Rejected', 'Archived', 'Deleted'],
  Published: ['Hidden', 'Reported', 'Archived', 'Deleted'],
  Hidden:    ['Published', 'Archived', 'Deleted'],
  Reported:  ['Published', 'Rejected', 'Hidden', 'Archived', 'Deleted'],
  Rejected:  ['Published', 'Archived', 'Deleted'],
  Archived:  ['Published', 'Deleted'],
  Deleted:   [],
} as const;

export function validateReviewStatusTransition(
  current: string,
  next: string,
): Result<true, ConflictError> {
  if (current === next) {
    return Err(new ConflictError(
      `Review is already in status "${current}"`,
      { details: { current, next } },
    ));
  }

  if (current === 'Deleted') {
    return Err(new ConflictError(
      'Deleted review cannot transition to any other status',
    ));
  }

  const allowed = ALLOWED_REVIEW_STATUS_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    return Err(new ConflictError(
      `Review status transition "${current}" → "${next}" is not allowed`,
      { details: { current, next, allowed } },
    ));
  }
  return Ok(true);
}

export function isReviewMutable(status: string): boolean {
  return status !== 'Archived' && status !== 'Deleted';
}

export function isReviewVisible(status: string): boolean {
  return status === 'Published';
}
