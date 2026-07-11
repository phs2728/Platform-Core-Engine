/**
 * Policy Engine — 3-Tier Resolution Algorithm
 *
 * 사장님 확립 (2026-07-11):
 *   "Tenant Policy → Engine Policy → Global Policy"
 *
 * 헌법 §C-15 준수: 정책 DEFAULT는 DB에 두지 않음.
 *   - 3계층 어느 곳에도 없으면 → "default" source로 fallback (Application 책임)
 *   - DB에 DEFAULT 값 없음 (모든 값은 application이 명시)
 */

import type {
  PolicyKey,
  PolicyContext,
  PolicyResolution,
  PolicySource,
} from './types.js';
import { PolicyNotFoundError, PolicySchemaError } from './errors.js';
import type { ZodSchema } from 'zod';

/**
 * Resolution 입력 (3계층 lookup 결과)
 */
export interface ResolutionInput {
  /** Tenant Policy 값 (있으면) */
  tenant?: { value: unknown; policyId: string; version: number } | null;
  /** Engine Policy 값 (있으면) */
  engine?: { value: unknown; policyId: string; version: number } | null;
  /** Global Policy 값 (있으면) */
  global?: { value: unknown; policyId: string; version: number } | null;
  /** Fallback (3계층 모두 없을 때) */
  defaultValue?: unknown;
  /** zod Schema (검증용) */
  schema?: ZodSchema<unknown>;
}

/**
 * Resolution 결과
 *
 * 3계층 우선순위:
 *   1. Tenant Policy (가장 specific)
 *   2. Engine Policy
 *   3. Global Policy
 *   4. Default Value (Application이 제공)
 *   5. 없으면 → PolicyNotFoundError
 */
export interface ResolutionResult<T = unknown> {
  value: T;
  source: PolicySource;
  policyId?: string;
  version?: number;
  schemaRef?: string;
  resolvedAt: string;
}

/**
 * 3계층 해결 알고리즘 (Pure Function)
 *
 * Repository 조회 결과를 받아 해결.
 * DB/Cache 호출은 Repository 책임.
 * 이 함수는 순수 (test 가능).
 *
 * @throws PolicyNotFoundError 3계층 + default 모두 없을 때
 * @throws PolicySchemaError schema 검증 실패 시
 */
export function resolvePolicy<T = unknown>(
  input: ResolutionInput,
  context: PolicyContext,
  resolvedAt: string,
): ResolutionResult<T> {
  // 1. Tenant Policy (가장 specific)
  if (input.tenant !== null && input.tenant !== undefined) {
    return validateAndWrap<T>(
      input.tenant.value,
      'tenant',
      input.tenant.policyId,
      input.tenant.version,
      input.schema,
      resolvedAt,
    );
  }

  // 2. Engine Policy
  if (input.engine !== null && input.engine !== undefined) {
    return validateAndWrap<T>(
      input.engine.value,
      'engine',
      input.engine.policyId,
      input.engine.version,
      input.schema,
      resolvedAt,
    );
  }

  // 3. Global Policy
  if (input.global !== null && input.global !== undefined) {
    return validateAndWrap<T>(
      input.global.value,
      'global',
      input.global.policyId,
      input.global.version,
      input.schema,
      resolvedAt,
    );
  }

  // 4. Default Value (Application이 제공)
  if (input.defaultValue !== undefined) {
    return validateAndWrap<T>(
      input.defaultValue,
      'default',
      undefined,
      undefined,
      input.schema,
      resolvedAt,
    );
  }

  // 5. Not found
  throw new PolicyNotFoundError(/* key injected by caller */ '', { context });
}

/**
 * zod Schema 검증 + 결과 wrapping
 */
function validateAndWrap<T = unknown>(
  value: unknown,
  source: PolicySource,
  policyId: string | undefined,
  version: number | undefined,
  schema: ZodSchema<unknown> | undefined,
  resolvedAt: string,
): ResolutionResult<T> {
  // Schema 검증 (헌법 §C-15 따라 application에서 검증)
  if (schema) {
    const result = schema.safeParse(value);
    if (!result.success) {
      throw new PolicySchemaError('policy', result.error.errors);
    }
    value = result.data;
  }

  return {
    value: value as T,
    source,
    ...(policyId !== undefined && { policyId }),
    ...(version !== undefined && { version }),
    resolvedAt,
  };
}
