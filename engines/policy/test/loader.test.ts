/**
 * Policy Engine — Configuration Loader Test
 *
 * Sprint 2A: Schema Registry + Default Value 처리 테스트.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  PolicySchemaRegistry,
  ConfigurationLoader,
  StandardPolicySchemas,
} from '../src/loader.js';
import { PolicySchemaError } from '../src/errors.js';

describe('PolicySchemaRegistry', () => {
  it('registers and retrieves policy definitions', () => {
    const registry = new PolicySchemaRegistry();
    registry.register({
      key: 'security.password.minLength',
      engine: 'identity',
      schema: z.number().int().min(8),
      defaultValue: 12,
      description: 'Minimum password length',
    });

    const def = registry.get('security.password.minLength');
    expect(def).toBeDefined();
    expect(def?.defaultValue).toBe(12);
    expect(def?.engine).toBe('identity');
  });

  it('throws on duplicate registration', () => {
    const registry = new PolicySchemaRegistry();
    registry.register({
      key: 'security.password.minLength',
      engine: 'identity',
      schema: z.number(),
      defaultValue: 12,
    });
    expect(() =>
      registry.register({
        key: 'security.password.minLength',
        engine: 'identity',
        schema: z.number(),
        defaultValue: 16,
      }),
    ).toThrow(/already registered/);
  });

  it('listByEngine filters correctly', () => {
    const registry = new PolicySchemaRegistry();
    registry.register({
      key: 'identity.policy1.test' as `${string}.${string}.${string}`,
      engine: 'identity',
      schema: z.boolean(),
      defaultValue: true,
    });
    registry.register({
      key: 'notification.policy1.test' as `${string}.${string}.${string}`,
      engine: 'notification',
      schema: z.boolean(),
      defaultValue: false,
    });

    const identityPolicies = registry.listByEngine('identity');
    expect(identityPolicies).toHaveLength(1);
    expect(identityPolicies[0]?.key).toBe('identity.policy1.test');
  });
});

describe('ConfigurationLoader', () => {
  it('returns default value', () => {
    const registry = new PolicySchemaRegistry();
    registry.register({
      key: 'security.password.minLength',
      engine: 'identity',
      schema: z.number().int().min(8),
      defaultValue: 12,
    });
    const loader = new ConfigurationLoader(registry);
    const value = loader.getDefault<number>('security.password.minLength');
    expect(value).toBe(12);
  });

  it('validates incoming value', () => {
    const registry = new PolicySchemaRegistry();
    registry.register({
      key: 'security.password.minLength',
      engine: 'identity',
      schema: z.number().int().min(8).max(128),
      defaultValue: 12,
    });
    const loader = new ConfigurationLoader(registry);
    const value = loader.validate<number>('security.password.minLength', 16);
    expect(value).toBe(16);
  });

  it('throws PolicySchemaError on invalid value', () => {
    const registry = new PolicySchemaRegistry();
    registry.register({
      key: 'security.password.minLength',
      engine: 'identity',
      schema: z.number().int().min(8).max(128),
      defaultValue: 12,
    });
    const loader = new ConfigurationLoader(registry);
    expect(() =>
      loader.validate('security.password.minLength', 3),
    ).toThrow(PolicySchemaError);
  });

  it('throws on unregistered policy', () => {
    const registry = new PolicySchemaRegistry();
    const loader = new ConfigurationLoader(registry);
    expect(() => loader.getDefault('unknown.policy.key' as `${string}.${string}.${string}`)).toThrow(PolicySchemaError);
  });
});

describe('StandardPolicySchemas', () => {
  it('has password schemas', () => {
    expect(StandardPolicySchemas['security.password.minLength'].defaultValue).toBe(12);
    expect(StandardPolicySchemas['security.password.requireUppercase'].defaultValue).toBe(true);
  });

  it('has session schemas', () => {
    expect(StandardPolicySchemas['session.timeoutMinutes'].defaultValue).toBe(60);
    expect(StandardPolicySchemas['session.rememberMeDays'].defaultValue).toBe(30);
  });

  it('has lock schemas', () => {
    expect(StandardPolicySchemas['security.login.maxFailures'].defaultValue).toBe(5);
    expect(StandardPolicySchemas['security.lock.durationMinutes'].defaultValue).toBe(30);
  });
});
