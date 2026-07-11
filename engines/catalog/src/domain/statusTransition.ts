/**
 * Catalog Engine — 4-state Status Machine
 *
 * 사장님 확립 (2026-07-11): Draft / Active / Archived / Deleted
 *
 * Archived/Deleted는 잠금 (변경 불가, restore 만 가능).
 */

import { ConflictError, Err, Ok, type Result } from '@platform/core-sdk';

export const ALLOWED_CATALOG_STATUS_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  Draft: ['Active', 'Archived'],
  Active: ['Archived', 'Draft'],
  Archived: ['Active'], // restore 별도 API
  Deleted: [], // terminal
} as const;

export function validateCatalogStatusTransition(
  current: string,
  next: string,
): Result<true, ConflictError> {
  if (current === next) {
    return Err(new ConflictError(
      `Catalog is already in status "${current}"`,
      { details: { current, next } },
    ));
  }
  if (current === 'Deleted') {
    return Err(new ConflictError(
      'Deleted catalog cannot transition to any other status',
    ));
  }
  if (current === 'Archived' && next !== 'Active') {
    return Err(new ConflictError(
      'Archived catalog can only be restored to Active via restoreCatalogUseCase',
      { details: { current, next } },
    ));
  }
  const allowed = ALLOWED_CATALOG_STATUS_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    return Err(new ConflictError(
      `Catalog status transition "${current}" → "${next}" is not allowed`,
      { details: { current, next, allowed } },
    ));
  }
  return Ok(true);
}

export function isCatalogMutable(status: string): boolean {
  return status !== 'Archived' && status !== 'Deleted';
}
