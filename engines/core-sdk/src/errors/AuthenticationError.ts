import { PlatformError, type PlatformErrorOptions } from './PlatformError.js';

export type AuthFailureReason =
  | 'invalid_credentials'
  | 'token_expired'
  | 'token_invalid'
  | 'account_locked'
  | 'account_disabled'
  | 'mfa_required'
  | 'mfa_failed';

/**
 * AuthenticationError — 인증 실패
 *
 * @example
 * ```ts
 * throw new AuthenticationError('Invalid credentials', { details: { reason: 'invalid_credentials' } });
 * ```
 */
export class AuthenticationError extends PlatformError {
  readonly code = 'PLATFORM_AUTH_FAILED';
  readonly httpStatus = 401;
  readonly safeToExpose = true;

  constructor(message: string = 'Authentication failed', options: PlatformErrorOptions = {}) {
    super(message, options);
  }
}
