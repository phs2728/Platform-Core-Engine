/**
 * Pricing Engine — 4-state Status Machine
 *
 * 사장님 확립 (2026-07-11): Draft / Active / Archived / Deleted
 *
 * Archived/Deleted는 잠금 (변경 불가, restore 만 가능).
 */

import { ConflictError, Err, Ok, type Result } from '@platform/core-sdk';

export const ALLOWED_PRICING_STATUS_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  Draft: ['Active', 'Archived'],
  Active: ['Archived', 'Draft'],
  Archived: ['Active'], // restore 별도 API
  Deleted: [], // terminal
} as const;

export function validatePricingStatusTransition(
  current: string,
  next: string,
): Result<true, ConflictError> {
  if (current === next) {
    return Err(new ConflictError(
      `Pricing plan is already in status "${current}"`,
      { details: { current, next } },
    ));
  }
  if (current === 'Deleted') {
    return Err(new ConflictError(
      'Deleted pricing plan cannot transition to any other status',
    ));
  }
  if (current === 'Archived' && next !== 'Active') {
    return Err(new ConflictError(
      'Archived pricing plan can only be restored to Active via restorePricingPlanUseCase',
      { details: { current, next } },
    ));
  }
  const allowed = ALLOWED_PRICING_STATUS_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    return Err(new ConflictError(
      `Pricing status transition "${current}" → "${next}" is not allowed`,
      { details: { current, next, allowed } },
    ));
  }
  return Ok(true);
}

export function isPricingMutable(status: string): boolean {
  return status !== 'Archived' && status !== 'Deleted';
}
