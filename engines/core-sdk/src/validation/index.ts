/**
 * validation/ — zod 통합
 *
 * 사장님 확립: zod schema + Result 통합.
 * throw 대신 ValidationError 반환.
 */

import { z, ZodSchema, ZodError } from 'zod';
import { Ok, Err, type Result } from '../result/index.js';
import { ValidationError } from '../errors/index.js';

/**
 * Schema 검증 → Result<ValidValue, ValidationError>
 *
 * @example
 * ```ts
 * const emailSchema = z.string().email();
 * const result = validate(emailSchema, 'tim@example.com');
 * if (result.ok) console.log(result.value);
 * else console.log(result.error.code);
 * ```
 */
export function validate<T>(
  schema: ZodSchema<T>,
  input: unknown,
): Result<T, ValidationError> {
  const result = schema.safeParse(input);
  if (result.success) {
    return Ok(result.data);
  }
  return Err(
    new ValidationError('Validation failed', {
      details: { issues: result.error.errors },
    }),
  );
}

/**
 * Schema 검증 (throw 버전 — 시작점에서만)
 */
export function validateOrThrow<T>(schema: ZodSchema<T>, input: unknown): T {
  return schema.parse(input);
}

/**
 * 도메인 검증 함수 (Email, Phone)
 */
export const Email = {
  /** RFC 5321 + 도메인 검증 */
  schema: () => z.string().email().max(254),

  /** 정규화 (lowercase) */
  normalize(raw: string): string {
    const [local, domain] = raw.toLowerCase().trim().split('@');
    if (!local || !domain) throw new Error('Invalid email');
    return `${local}@${domain}`;
  },
};

export const Phone = {
  /** E.164 정규식 (간단 버전) */
  schema: () => z.string().regex(/^\+[1-9]\d{1,14}$/, 'Phone must be E.164 format'),

  /** 정규화 (E.164 형식) */
  normalize(raw: string): string {
    // 호스트가 libphonenumber 주입 가능 (Sprint 후속)
    const cleaned = raw.replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+')) {
      return `+${cleaned}`;
    }
    return cleaned;
  },
};

export const Password = {
  /** 기본 Schema (8자 이상, 헌법 §C-15) */
  schema: () =>
    z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(1024, 'Password too long'),

  /** 정책 기반 Schema (zod refine) */
  withPolicy(policy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumber: boolean;
    requireSpecial: boolean;
  }): ZodSchema<string> {
    let schema = z.string().min(policy.minLength).max(1024);
    if (policy.requireUppercase) schema = schema.regex(/[A-Z]/, 'Need uppercase');
    if (policy.requireLowercase) schema = schema.regex(/[a-z]/, 'Need lowercase');
    if (policy.requireNumber) schema = schema.regex(/[0-9]/, 'Need number');
    if (policy.requireSpecial)
      schema = schema.regex(/[^A-Za-z0-9]/, 'Need special character');
    return schema;
  },
};

export { z, ZodSchema, ZodError };
