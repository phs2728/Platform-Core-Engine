/**
 * Billing Engine — 8-state Status Machine
 *
 * 사장님 확립 (2026-07-11) Phase 5:
 *   Draft → Issued → Open → PartiallyPaid → Paid → Closed
 *   Draft → Cancelled (terminal)
 *   Issued → Voided (terminal) | Cancelled
 *   Open → PartiallyPaid | Closed | Voided | Cancelled
 *   PartiallyPaid → Paid | Closed | Cancelled
 *   Paid → Closed | Cancelled
 *
 * Cancelled, Voided, Closed = terminal
 */

import { ConflictError, Err, Ok, type Result } from '@platform/core-sdk';

/**
 * Allowed status transitions for invoices.
 *
 * Terminal states (Cancelled / Voided / Closed) have no outgoing transitions.
 */
export const BILLING_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  Draft: ['Issued', 'Cancelled'],
  Issued: ['Open', 'Voided', 'Cancelled'],
  Open: ['PartiallyPaid', 'Closed', 'Voided', 'Cancelled'],
  PartiallyPaid: ['Paid', 'Closed', 'Cancelled'],
  Paid: ['Closed', 'Cancelled'],
  Closed: [],          // terminal
  Cancelled: [],       // terminal
  Voided: [],          // terminal
} as const;

/**
 * Validate an invoice status transition.
 *
 * Returns Ok(true) if the transition is allowed, or Err(ConflictError) with a
 * descriptive message and details otherwise. Same-status transitions are
 * rejected (idempotency is handled at the use-case layer).
 */
export function validateInvoiceStatusTransition(
  current: string,
  next: string,
): Result<true, ConflictError> {
  if (current === next) {
    return Err(new ConflictError(
      `Invoice is already in status "${current}"`,
      { details: { current, next } },
    ));
  }

  const terminal = ['Cancelled', 'Voided', 'Closed'];
  if (terminal.includes(current)) {
    return Err(new ConflictError(
      `Invoice in terminal status "${current}" cannot transition to "${next}"`,
      { details: { current, next } },
    ));
  }

  const allowed = BILLING_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    return Err(new ConflictError(
      `Invoice status transition "${current}" → "${next}" is not allowed`,
      { details: { current, next, allowed } },
    ));
  }
  return Ok(true);
}

/**
 * Whether an invoice in the given status can be mutated
 * (lines added/removed, adjustments, references, metadata, etc.).
 *
 * Terminal states and Closed invoices are immutable.
 */
export function isInvoiceMutable(status: string): boolean {
  return status !== 'Closed'
    && status !== 'Cancelled'
    && status !== 'Voided';
}
