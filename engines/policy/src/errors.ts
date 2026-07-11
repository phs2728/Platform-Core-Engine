/**
 * Policy Engine — Domain Errors
 *
 * Sprint 2A Frozen (self-contained).
 * Core SDK PlatformError migration deferred to Sprint 후속 (RFC-008).
 *
 * 헌법 §12.8 (C-15 Zero Business Logic in DB) 준수.
 */

export abstract class PolicyError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
  abstract readonly safeToExpose: boolean;
  readonly context?: Record<string, unknown>;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    if (context !== undefined) {
      this.context = context;
    }
  }

  toJSON(): { code: string; message: string; context?: Record<string, unknown> } {
    const result: { code: string; message: string; context?: Record<string, unknown> } = {
      code: this.code,
      message: this.safeToExpose ? this.message : 'An internal error occurred',
    };
    if (this.safeToExpose && this.context !== undefined) {
      result.context = this.context;
    }
    return result;
  }
}

export class PolicyNotFoundError extends PolicyError {
  readonly code = 'POLICY_NOT_FOUND';
  readonly httpStatus = 404;
  readonly safeToExpose = true;
  constructor(public readonly key: string, context?: Record<string, unknown>) {
    super(`Policy not found: ${key}`, context);
  }
}

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

export class PolicyInternalError extends PolicyError {
  readonly code = 'POLICY_INTERNAL_ERROR';
  readonly httpStatus = 500;
  readonly safeToExpose = false;
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }
}
