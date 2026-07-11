import { PlatformError, type PlatformErrorOptions } from './PlatformError.js';

/**
 * InternalError — 내부 시스템 오류
 *
 * safeToExpose = false (클라이언트에 stack trace 노출 안 함)
 *
 * @example
 * ```ts
 * throw new InternalError('DB connection failed', { cause: originalError });
 * ```
 */
export class InternalError extends PlatformError {
  readonly code = 'PLATFORM_INTERNAL_ERROR';
  readonly httpStatus = 500;
  readonly safeToExpose = false; // ← 중요: 클라이언트에 상세 노출 안 함

  constructor(message: string = 'Internal server error', options: PlatformErrorOptions = {}) {
    super(message, options);
  }
}
