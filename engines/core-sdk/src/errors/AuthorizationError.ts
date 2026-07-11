import { PlatformError, type PlatformErrorOptions } from './PlatformError.js';

/**
 * AuthorizationError — 권한 부족 (RBAC 실패)
 *
 * @example
 * ```ts
 * throw new AuthorizationError('Access denied', { details: { requiredPermission: 'admin' } });
 * ```
 */
export class AuthorizationError extends PlatformError {
  readonly code = 'PLATFORM_AUTHZ_FAILED';
  readonly httpStatus = 403;
  readonly safeToExpose = true;

  constructor(message: string = 'Access denied', options: PlatformErrorOptions = {}) {
    super(message, options);
  }
}
