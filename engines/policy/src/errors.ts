/**
 * Policy Engine — Domain Errors
 *
 * 헌법 §12.8 (C-15 Zero Business Logic in DB) 준수:
 * - error code, httpStatus, safeToExpose 명확화
 * - PII 평문 노출 금지
 */

/**
 * Base Domain Error
 *
 * 모든 Policy Engine Error는 이 클래스를 상속.
 * 헌법 §C-15 따라 safeToExpose: true면 클라이언트에 노출 가능.
 */
export abstract class PolicyError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
  readonly safeToExpose: boolean;
  readonly context?: Record<string, unknown>;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.context = context;
  }

  /** 직렬화 (응답용, safeToExpose=false인 경우 일반 메시지만) */
  toJSON(): { code: string; message: string; context?: Record<string, unknown> } {
    return {
      code: this.code,
      message: this.safeToExpose ? this.message : 'An internal error occurred',
      context: this.safeToExpose ? this.context : undefined,
    };
  }
}

/**
 * Policy Not Found
 *
 * Policy Key가 3계층 어디에도 없을 때.
 */
export class PolicyNotFoundError extends PolicyError {
  readonly code = 'POLICY_NOT_FOUND';
  readonly httpStatus = 404;
  readonly safeToExpose = true;

  constructor(public readonly key: string, context?: Record<string, unknown>) {
    super(`Policy not found: ${key}`, context);
  }
}

/**
 * Policy Schema Invalid
 *
 * Policy 값이 zod 스키마와 일치하지 않을 때.
 */
export class PolicySchemaError extends PolicyError {
  readonly code = 'POLICY_SCHEMA_INVALID';
  readonly httpStatus = 422;
  readonly safeToExpose = true;

  constructor(
    public readonly key: string,
    public readonly violations: unknown,
    context?: Record<string, unknown>,
  ) {
    super(`Policy schema invalid: ${key}`, { ...context, violations });
  }
}

/**
 * Policy Conflict
 *
 * Policy 변경 시 충돌 (optimistic locking).
 */
export class PolicyConflictError extends PolicyError {
  readonly code = 'POLICY_CONFLICT';
  readonly httpStatus = 409;
  readonly safeToExpose = true;

  constructor(
    public readonly key: string,
    public readonly expectedVersion: number,
    public readonly actualVersion: number,
    context?: Record<string, unknown>,
  ) {
    super(
      `Policy version conflict: ${key} (expected ${expectedVersion}, got ${actualVersion})`,
      context,
    );
  }
}

/**
 * Policy Internal Error
 *
 * 알 수 없는 내부 오류. 클라이언트에 상세 노출 안 함.
 */
export class PolicyInternalError extends PolicyError {
  readonly code = 'POLICY_INTERNAL_ERROR';
  readonly httpStatus = 500;
  readonly safeToExpose = false;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }
}
