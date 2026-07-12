/**
 * Payment Engine — 9-state Status Machine
 *
 * 사장님 확립 (2026-07-11) Phase 5:
 *   Draft → Pending → Authorized → Captured → Settled
 *   Pending → Cancelled (terminal) | Failed (terminal) | Expired (terminal)
 *   Authorized → Cancelled | Failed
 *   Captured → Refunded (terminal) | Cancelled
 *   Failed → Pending (retry)
 *
 * Terminal: Cancelled, Expired, Settled, Refunded
 */

import { ConflictError, Err, Ok, type Result } from '@platform/core-sdk';

export const PAYMENT_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  Draft: ['Pending', 'Cancelled'],
  Pending: ['Authorized', 'Cancelled', 'Failed', 'Expired'],
  Authorized: ['Captured', 'Cancelled', 'Failed'],
  Captured: ['Settled', 'Refunded', 'Cancelled'],
  Settled: [],
  Refunded: [],
  Cancelled: [],
  Failed: ['Pending'],   // retry
  Expired: [],
} as const;

export function validatePaymentStatusTransition(
  current: string,
  next: string,
): Result<true, ConflictError> {
  if (current === next) {
    return Err(new ConflictError(
      `Payment is already in status "${current}"`,
      { details: { current, next } },
    ));
  }

  const allowed = PAYMENT_TRANSITIONS[current] ?? [];
  if (allowed.length === 0) {
    return Err(new ConflictError(
      `Payment in terminal status "${current}" cannot transition to "${next}"`,
      { details: { current, next, allowed } },
    ));
  }

  if (!allowed.includes(next)) {
    return Err(new ConflictError(
      `Payment status transition "${current}" → "${next}" is not allowed`,
      { details: { current, next, allowed } },
    ));
  }
  return Ok(true);
}

export function isPaymentMutable(status: string): boolean {
  return status !== 'Settled'
    && status !== 'Cancelled'
    && status !== 'Expired'
    && status !== 'Refunded';
}

export function isTerminalStatus(status: string): boolean {
  return status === 'Settled'
    || status === 'Cancelled'
    || status === 'Expired'
    || status === 'Refunded';
}
