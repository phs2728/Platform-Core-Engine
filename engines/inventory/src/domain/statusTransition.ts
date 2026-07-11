/**
 * Inventory Engine — 3-state Status Machine
 *
 * 사장님 확립 (2026-07-11): Active / Archived / Deleted
 *
 * Archived/Deleted는 잠금 (변경 불가, restore 만 가능).
 */

import { ConflictError, Err, Ok, type Result } from '@platform/core-sdk';

export const ALLOWED_INVENTORY_STATUS_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  Active: ['Archived'],
  Archived: ['Active'], // restore 별도 API
  Deleted: [], // terminal
} as const;

export function validateInventoryStatusTransition(
  current: string,
  next: string,
): Result<true, ConflictError> {
  if (current === next) {
    return Err(new ConflictError(
      `Inventory is already in status "${current}"`,
      { details: { current, next } },
    ));
  }
  if (current === 'Deleted') {
    return Err(new ConflictError(
      'Deleted inventory cannot transition to any other status',
    ));
  }
  if (current === 'Archived' && next !== 'Active') {
    return Err(new ConflictError(
      'Archived inventory can only be restored to Active via restoreInventoryUseCase',
      { details: { current, next } },
    ));
  }
  const allowed = ALLOWED_INVENTORY_STATUS_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    return Err(new ConflictError(
      `Inventory status transition "${current}" → "${next}" is not allowed`,
      { details: { current, next, allowed } },
    ));
  }
  return Ok(true);
}

export function isInventoryMutable(status: string): boolean {
  return status !== 'Archived' && status !== 'Deleted';
}
