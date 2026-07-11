/**
 * Policy Engine — Configuration Loader
 *
 * 사장님 확립 (2026-07-11):
 * "Configuration은 Type-Safe Policy Schema (zod) 와 1:1 매핑"
 *
 * 헌법 §C-15 적용: Type-Safety First (PRD §3.7)
 *
 * Sprint 2A 범위:
 *   - zod Schema ↔ PolicyKey 매핑 정의
 *   - Schema 검증 (Type-Safe 보장)
 *   - Default Value 처리
 *
 * Sprint 2A 후속:
 *   - Hot Reload (Watch API)
 *   - DB Loader
 *   - Cache Integration
 */

import { z, ZodSchema } from 'zod';
import type { PolicyKey, EngineName } from './types.js';
import { PolicySchemaError } from './errors.js';

/**
 * Policy Definition
 *
 * PolicyKey + zod Schema + Default Value + Description 묶음.
 */
export interface PolicyDefinition<T = unknown> {
  /** Policy Key (e.g., 'security.password.minLength') */
  key: PolicyKey;
  /** 이 Policy가 속한 Engine */
  engine: EngineName;
  /** zod Schema (런타임 검증) */
  schema: ZodSchema<T>;
  /** Default Value (3계층 어디에도 없을 때) */
  defaultValue: T;
  /** 사람이 읽을 수 있는 설명 */
  description?: string;
}

/**
 * Policy Schema Registry
 *
 * 모든 Policy의 zod Schema 중앙 관리.
 * 새 Policy 추가 시 여기에 등록.
 */
export class PolicySchemaRegistry {
  private readonly definitions = new Map<PolicyKey, PolicyDefinition<unknown>>();

  /** Policy Definition 등록 */
  register<T>(def: PolicyDefinition<T>): this {
    if (this.definitions.has(def.key)) {
      throw new Error(`Policy already registered: ${def.key}`);
    }
    this.definitions.set(def.key, def as PolicyDefinition<unknown>);
    return this;
  }

  /** Policy Definition 조회 */
  get<T>(key: PolicyKey): PolicyDefinition<T> | undefined {
    return this.definitions.get(key) as PolicyDefinition<T> | undefined;
  }

  /** 모든 Definition */
  list(): PolicyDefinition<unknown>[] {
    return Array.from(this.definitions.values());
  }

  /** Engine별 Definition */
  listByEngine(engine: EngineName): PolicyDefinition<unknown>[] {
    return this.list().filter((d) => d.engine === engine);
  }
}

/**
 * Configuration Loader
 *
 * Application이 PolicyKey → Typed Value 변환 시 사용.
 * Default Value 처리 + Schema 검증 통합.
 */
export class ConfigurationLoader {
  constructor(private readonly registry: PolicySchemaRegistry) {}

  /**
   * Default Value 가져오기 (Schema 검증 후)
   *
   * 3계층 + Default 모두 없을 때 사용.
   */
  getDefault<T>(key: PolicyKey): T {
    const def = this.registry.get<T>(key);
    if (!def) {
      throw new PolicySchemaError(key, `Policy not registered: ${key}`);
    }
    const result = def.schema.safeParse(def.defaultValue);
    if (!result.success) {
      throw new PolicySchemaError(key, {
        reason: 'default_value_invalid',
        issues: result.error.errors,
      });
    }
    return result.data as T;
  }

  /**
   * Schema 검증 (3계층 해결 결과)
   */
  validate<T>(key: PolicyKey, value: unknown): T {
    const def = this.registry.get<T>(key);
    if (!def) {
      throw new PolicySchemaError(key, `Policy not registered: ${key}`);
    }
    const result = def.schema.safeParse(value);
    if (!result.success) {
      throw new PolicySchemaError(key, result.error.errors);
    }
    return result.data as T;
  }

  /**
   * Schema 조회
   */
  getSchema<T>(key: PolicyKey): ZodSchema<T> | undefined {
    return this.registry.get<T>(key)?.schema;
  }
}

/**
 * 표준 Policy Schema 정의 (사장님 확립 + 헌법 §C-15)
 *
 * 실제 값은 Policy Engine이 아닌 application/Configuration에서 제공.
 * 여기서는 **Type + Schema**만 정의.
 */
export const StandardPolicySchemas = {
  // Password (헌법 §C-15 + Identity PRD §3.4)
  'security.password.minLength': {
    engine: 'identity' as const,
    schema: z.number().int().min(8).max(128),
    defaultValue: 12,
  },
  'security.password.requireUppercase': {
    engine: 'identity' as const,
    schema: z.boolean(),
    defaultValue: true,
  },
  'security.password.requireLowercase': {
    engine: 'identity' as const,
    schema: z.boolean(),
    defaultValue: true,
  },
  'security.password.requireNumber': {
    engine: 'identity' as const,
    schema: z.boolean(),
    defaultValue: true,
  },
  'security.password.requireSpecial': {
    engine: 'identity' as const,
    schema: z.boolean(),
    defaultValue: true,
  },

  // Session
  'session.timeoutMinutes': {
    engine: 'identity' as const,
    schema: z.number().int().min(5).max(10080),
    defaultValue: 60,
  },
  'session.rememberMeDays': {
    engine: 'identity' as const,
    schema: z.number().int().min(1).max(365),
    defaultValue: 30,
  },

  // Lock & Failure
  'security.login.maxFailures': {
    engine: 'identity' as const,
    schema: z.number().int().min(1).max(100),
    defaultValue: 5,
  },
  'security.lock.durationMinutes': {
    engine: 'identity' as const,
    schema: z.number().int().min(1).max(10080),
    defaultValue: 30,
  },

  // Verification
  'verification.email.required': {
    engine: 'identity' as const,
    schema: z.boolean(),
    defaultValue: false,
  },
  'verification.phone.required': {
    engine: 'identity' as const,
    schema: z.boolean(),
    defaultValue: false,
  },
  'verification.expirationMinutes': {
    engine: 'identity' as const,
    schema: z.number().int().min(1).max(60),
    defaultValue: 15,
  },
  'verification.maxAttempts': {
    engine: 'identity' as const,
    schema: z.number().int().min(1).max(10),
    defaultValue: 5,
  },

  // 2FA
  'mfa.required': {
    engine: 'identity' as const,
    schema: z.boolean(),
    defaultValue: false,
  },
} as const;
