/**
 * Errors — Platform 단일 Error 계층
 *
 * 사장님 Platform Owner 확립 (2026-07-11):
 * "모든 Engine이 Error를 다르게 만들면 플랫폼이 망가집니다."
 *
 * 5개 속성 (PlatformError):
 * - code
 * - message
 * - details
 * - cause
 * - safeToExpose
 */

// Base
export { PlatformError, type PlatformErrorOptions, type ErrorResponse } from './PlatformError.js';

// 6개 표준 Error
export { ValidationError } from './ValidationError.js';
export { AuthenticationError, type AuthFailureReason } from './AuthenticationError.js';
export { AuthorizationError } from './AuthorizationError.js';
export { ConflictError } from './ConflictError.js';
export { NotFoundError } from './NotFoundError.js';
export { InternalError } from './InternalError.js';
