/**
 * Policy Engine — Domain Errors
 *
 * 사장님 확립 (Sprint 2B-2 #4 Error Compatibility):
 * PlatformError (from @platform/core-sdk) 상속.
 * 모든 Engine이 동일한 Error 계층 사용 (헌법 §C-15 + §C-20).
 *
 * Sprint 2A의 자체 PolicyError → Sprint 2B-2에서 Core SDK PlatformError로 마이그레이션.
 */

export {
  PlatformError as PolicyErrorBase,
  ValidationError as PolicySchemaErrorLegacy,
  NotFoundError,
  ConflictError,
  InternalError,
  type PlatformErrorOptions,
} from '@platform/core-sdk/errors';

// Re-export for backward compat
import {
  PlatformError,
  ValidationError,
  NotFoundError,
  ConflictError,
  InternalError,
} from '@platform/core-sdk/errors';

/**
 * Policy Not Found — 3계층 + default 모두 없을 때
 *
 * Sprint 2B-2 마이그레이션: PolicyNotFoundError는 NotFoundError의 별칭.
 * 기존 PolicyNotFoundError 호출 사이트는 그대로 작동.
 */
export { NotFoundError as PolicyNotFoundError };

/**
 * Policy Schema Invalid — zod 검증 실패
 *
 * Sprint 2B-2: ValidationError 위임.
 */
export class PolicySchemaError extends ValidationError {
  override readonly code = 'POLICY_SCHEMA_INVALID'; // Policy-specific code
  readonly httpStatus = 422;

  constructor(
    public readonly key: string,
    public readonly violations: unknown,
    context?: Record<string, unknown>,
  ) {
    super(`Policy schema invalid: ${key}`, { ...context, violations });
  }
}

/**
 * Policy Conflict — Optimistic Locking 실패
 */
export class PolicyConflictError extends ConflictError {
  override readonly code = 'POLICY_CONFLICT';
  readonly httpStatus = 409;

  constructor(
    public readonly key: string,
    public readonly expectedVersion: number,
    public readonly actualVersion: number,
    context?: Record<string, unknown>,
  ) {
    super(`Policy version conflict: ${key} (expected ${expectedVersion}, got ${actualVersion})`, {
      ...context,
      key,
    });
  }
}

/**
 * Policy Internal Error (legacy alias)
 */
export class PolicyInternalError extends InternalError {
  override readonly code = 'POLICY_INTERNAL_ERROR';
  readonly httpStatus = 500;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }
}

// Core SDK 호환을 위해 re-export
export { PlatformError, ValidationError };
