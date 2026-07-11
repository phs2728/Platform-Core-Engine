/**
 * Order Engine — 10-state Status Machine
 *
 * 사장님 확립 (2026-07-11):
 *   Draft → Submitted → Approved → Confirmed → InProgress → Completed → Closed
 *   Draft → Cancelled (terminal)
 *   Submitted → Approved | Rejected | Cancelled | Expired
 *   Approved → Confirmed | Cancelled
 *   Confirmed → InProgress | Cancelled
 *   InProgress → Completed | Cancelled
 *   Completed → Closed | Cancelled
 *
 * Terminal states: Cancelled, Rejected, Expired, Closed
 */

import { ConflictError, Err, Ok, type Result } from '@platform/core-sdk';

export const ORDER_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  Draft: ['Submitted', 'Cancelled'],
  Submitted: ['Approved', 'Rejected', 'Cancelled', 'Expired'],
  Approved: ['Confirmed', 'Cancelled'],
  Confirmed: ['InProgress', 'Cancelled'],
  InProgress: ['Completed', 'Cancelled'],
  Completed: ['Closed', 'Cancelled'],
  Cancelled: [],
  Rejected: [],
  Expired: [],
  Closed: [],
} as const;

export function validateOrderStatusTransition(
  current: string,
  next: string,
): Result<true, ConflictError> {
  if (current === next) {
    return Err(new ConflictError(
      `Order is already in status "${current}"`,
      { details: { current, next } },
    ));
  }

  const allowed = ORDER_TRANSITIONS[current] ?? [];
  if (allowed.length === 0) {
    return Err(new ConflictError(
      `Order in terminal status "${current}" cannot transition to any other status`,
      { details: { current, next, allowed } },
    ));
  }

  if (!allowed.includes(next)) {
    return Err(new ConflictError(
      `Order status transition "${current}" → "${next}" is not allowed`,
      { details: { current, next, allowed } },
    ));
  }

  return Ok(true);
}

export function isOrderMutable(status: string): boolean {
  return status !== 'Cancelled'
    && status !== 'Rejected'
    && status !== 'Expired'
    && status !== 'Closed';
}
