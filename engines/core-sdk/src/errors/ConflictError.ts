import { PlatformError, type PlatformErrorOptions } from './PlatformError.js';

/**
 * ConflictError — 동시성 충돌 (Optimistic Locking, Unique 제약)
 *
 * @example
 * ```ts
 * throw new ConflictError('Version mismatch', { details: { resource: 'user', expectedVersion: 5, actualVersion: 3 } });
 * ```
 */
export class ConflictError extends PlatformError {
  readonly code = 'PLATFORM_CONFLICT';
  readonly httpStatus = 409;
  readonly safeToExpose = true;

  constructor(message: string = 'Resource conflict', options: PlatformErrorOptions = {}) {
    super(message, options);
  }
}
