/**
 * Query Engine — Projection State Machine & Helpers
 */
import { ConflictError, Err, Ok, type Result } from '@platform/core-sdk';

export function isProjectionTerminal(status: string): boolean {
  return status === 'Archived' || status === 'Failed';
}

export function isProjectionUsable(status: string): boolean {
  return status === 'Ready' || status === 'Stale';
}

export function validateProjectionTransition(current: string, next: string): Result<true, ConflictError> {
  if (current === next) return Err(new ConflictError(`Projection already "${current}"`));
  if (current === 'Archived') return Err(new ConflictError('Archived projection cannot transition'));
  const allowed: Record<string, string[]> = {
    Building: ['Ready', 'Failed'],
    Ready: ['Stale', 'Building', 'Failed'],
    Stale: ['Building', 'Ready', 'Failed'],
    Failed: ['Building'],
  };
  const ok = allowed[current] ?? [];
  if (!ok.includes(next)) return Err(new ConflictError(`Transition "${current}" → "${next}" not allowed`));
  return Ok(true);
}

/** Idempotency check — has this event already been processed? */
export function isEventProcessed(checkpoint: number, eventPosition: number): boolean {
  return eventPosition <= checkpoint;
}

/** Version increment helper */
export function nextVersion(current: number): number {
  return current + 1;
}
