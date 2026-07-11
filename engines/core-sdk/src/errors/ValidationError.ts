import { PlatformError, type PlatformErrorOptions } from './PlatformError.js';

/**
 * ValidationError — 입력 검증 실패
 *
 * @example
 * ```ts
 * throw new ValidationError('Email invalid', { details: { field: 'email' } });
 * ```
 */
export class ValidationError extends PlatformError {
  readonly code = 'PLATFORM_VALIDATION_FAILED';
  readonly httpStatus = 400;
  readonly safeToExpose = true;

  constructor(message: string = 'Validation failed', options: PlatformErrorOptions = {}) {
    super(message, options);
  }
}
