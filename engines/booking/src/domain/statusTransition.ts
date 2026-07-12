/**
 * Booking Engine — 8-state Status Machine
 *
 * 사장님 확립 (2026-07-11):
 *   Draft → Pending → Confirmed → Active → Completed
 *   Draft → Rejected (terminal)
 *   Pending → Confirmed | Rejected | Cancelled | Expired
 *   Confirmed → Cancelled | Active
 *   Active → Completed | Cancelled
 *   Cancelled, Expired, Rejected, Completed = terminal
 */

import { ConflictError, Err, Ok, type Result } from '@platform/core-sdk';

export const BOOKING_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  Draft: ['Pending', 'Rejected'],
  Pending: ['Confirmed', 'Rejected', 'Cancelled', 'Expired'],
  Confirmed: ['Cancelled', 'Active'],
  Active: ['Completed', 'Cancelled'],
  Cancelled: [],
  Expired: [],
  Rejected: [],
  Completed: [],
} as const;

export function validateBookingStatusTransition(
  current: string,
  next: string,
): Result<true, ConflictError> {
  if (current === next) {
    return Err(new ConflictError(
      `Booking is already in status "${current}"`,
      { details: { current, next } },
    ));
  }

  // Terminal states — no outgoing transitions
  if (
    current === 'Cancelled' ||
    current === 'Expired' ||
    current === 'Rejected' ||
    current === 'Completed'
  ) {
    return Err(new ConflictError(
      `Booking in terminal status "${current}" cannot transition to any other status`,
      { details: { current, next } },
    ));
  }

  const allowed = BOOKING_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    return Err(new ConflictError(
      `Booking status transition "${current}" → "${next}" is not allowed`,
      { details: { current, next, allowed } },
    ));
  }
  return Ok(true);
}

export function isBookingMutable(status: string): boolean {
  return status !== 'Cancelled' &&
    status !== 'Expired' &&
    status !== 'Rejected' &&
    status !== 'Completed';
}
