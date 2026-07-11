/**
 * Policy Engine — Resolver Test
 *
 * Sprint 2A 범위: 3계층 해결 알고리즘 (Pure Function)
 * 사장님 PRG §T-6 (Test 작성 완료) 충족.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { resolvePolicy } from '../src/resolver.js';
import { PolicyNotFoundError, PolicySchemaError } from '../src/errors.js';
import type { PolicyContext } from '../src/types.js';

const ctx: PolicyContext = {
  tenantId: 'tenant-123',
  engine: 'identity',
};

const now = '2026-07-11T08:00:00.000Z';

describe('resolvePolicy — 3-Tier Resolution', () => {
  describe('Priority Order', () => {
    it('Tenant Policy wins over Engine and Global', () => {
      const result = resolvePolicy(
        {
          tenant: { value: 'tenant-value', policyId: 't-1', version: 1 },
          engine: { value: 'engine-value', policyId: 'e-1', version: 1 },
          global: { value: 'global-value', policyId: 'g-1', version: 1 },
        },
        ctx,
        now,
      );
      expect(result.value).toBe('tenant-value');
      expect(result.source).toBe('tenant');
    });

    it('Engine Policy wins over Global when no Tenant', () => {
      const result = resolvePolicy(
        {
          tenant: null,
          engine: { value: 'engine-value', policyId: 'e-1', version: 2 },
          global: { value: 'global-value', policyId: 'g-1', version: 1 },
        },
        ctx,
        now,
      );
      expect(result.value).toBe('engine-value');
      expect(result.source).toBe('engine');
    });

    it('Global Policy used when no Tenant and Engine', () => {
      const result = resolvePolicy(
        {
          tenant: null,
          engine: null,
          global: { value: 'global-value', policyId: 'g-1', version: 1 },
        },
        ctx,
        now,
      );
      expect(result.value).toBe('global-value');
      expect(result.source).toBe('global');
    });
  });

  describe('Default Value Fallback', () => {
    it('Default value used when 3 tiers all empty', () => {
      const result = resolvePolicy(
        {
          tenant: null,
          engine: null,
          global: null,
          defaultValue: 'default-fallback',
        },
        ctx,
        now,
      );
      expect(result.value).toBe('default-fallback');
      expect(result.source).toBe('default');
    });

    it('3 tiers all empty and no default → PolicyNotFoundError', () => {
      expect(() =>
        resolvePolicy(
          {
            tenant: null,
            engine: null,
            global: null,
          },
          ctx,
          now,
        ),
      ).toThrow(PolicyNotFoundError);
    });
  });

  describe('Schema Validation (헌법 §C-15)', () => {
    it('Valid value passes schema', () => {
      const result = resolvePolicy(
        {
          tenant: { value: 12, policyId: 't-1', version: 1 },
          defaultValue: 12,
          schema: z.number().int().min(8).max(128),
        },
        ctx,
        now,
      );
      expect(result.value).toBe(12);
    });

    it('Invalid value throws PolicySchemaError', () => {
      expect(() =>
        resolvePolicy(
          {
            tenant: { value: 3, policyId: 't-1', version: 1 }, // Below min(8)
            defaultValue: 12,
            schema: z.number().int().min(8).max(128),
          },
          ctx,
          now,
        ),
      ).toThrow(PolicySchemaError);
    });
  });

  describe('Metadata Preservation', () => {
    it('preserves policyId and version from resolved tier', () => {
      const result = resolvePolicy(
        {
          tenant: { value: 12, policyId: 'policy-uuid-123', version: 5 },
        },
        ctx,
        now,
      );
      expect(result.policyId).toBe('policy-uuid-123');
      expect(result.version).toBe(5);
    });

    it('resolvedAt is set from argument', () => {
      const result = resolvePolicy(
        {
          tenant: { value: 12, policyId: 't-1', version: 1 },
        },
        ctx,
        now,
      );
      expect(result.resolvedAt).toBe(now);
    });
  });
});
