import { PlatformError, type PlatformErrorOptions } from './PlatformError.js';

/**
 * NotFoundError — 리소스 없음
 *
 * @example
 * ```ts
 * throw new NotFoundError('User not found', { details: { resource: 'user', id: 'usr-123' } });
 * ```
 */
export class NotFoundError extends PlatformError {
  readonly code = 'PLATFORM_NOT_FOUND';
  readonly httpStatus = 404;
  readonly safeToExpose = true;

  constructor(message: string = 'Resource not found', options: PlatformErrorOptions = {}) {
    super(message, options);
  }
}
