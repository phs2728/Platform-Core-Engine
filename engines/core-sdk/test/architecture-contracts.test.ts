/**
 * Sprint A-3 + A-4: Architecture Enforcement + Contract Testing
 */
import { describe, it, expect } from 'vitest';
import {
  verifyBoundaries, ALL_ARCHITECTURE_RULES,
  detectCircularDependencies, validateManifest,
  InMemoryContractRegistry, checkSchemaCompatibility,
  runConsumerContractTest, isVersionCompatible,
} from '../src/index.js';

// ═══════════════════════════════════════════
// Sprint A-3: Architecture Enforcement
// ═══════════════════════════════════════════

describe('Sprint A-3: Architecture Enforcement', () => {

  describe('Boundary Verification', () => {
    it('passes when no violations', () => {
      const imports = [
        { source: 'engines/theme/src/use-cases/x.ts', target: '@platform/core-sdk' },
      ];
      const result = verifyBoundaries(imports);
      expect(result.passed).toBe(true);
      expect(result.violations.length).toBe(0);
    });

    it('fails when engine imports from another engine', () => {
      const imports = [
        { source: 'engines/theme/src/x.ts', target: '@platform/engine-component' },
      ];
      const result = verifyBoundaries(imports);
      expect(result.passed).toBe(false);
      expect(result.violations[0].ruleId).toBe('no-direct-engine-import');
    });

    it('fails when interface imports from use-cases', () => {
      const imports = [
        { source: 'engines/x/src/interfaces/i.ts', target: './use-cases/uc.js' },
      ];
      const result = verifyBoundaries(imports);
      expect(result.passed).toBe(false);
    });

    it('fails when domain imports from infrastructure', () => {
      const imports = [
        { source: 'engines/x/src/domain/d.ts', target: './infrastructure/i.js' },
      ];
      const result = verifyBoundaries(imports);
      expect(result.passed).toBe(false);
    });

    it('allows multiple valid imports', () => {
      const imports = [
        { source: 'engines/a/src/use-cases/x.ts', target: '../interfaces/index.js' },
        { source: 'engines/a/src/infrastructure/r.ts', target: '../interfaces/index.js' },
        { source: 'engines/a/src/x.ts', target: '@platform/core-sdk' },
      ];
      const result = verifyBoundaries(imports);
      expect(result.passed).toBe(true);
    });
  });

  describe('Circular Dependency Detection', () => {
    it('detects simple cycle', () => {
      const graph = new Map([
        ['A', ['B']],
        ['B', ['C']],
        ['C', ['A']],
      ]);
      const cycles = detectCircularDependencies(graph);
      expect(cycles.length).toBe(1);
      expect(cycles[0].cycle).toContain('A');
    });

    it('returns empty for acyclic graph', () => {
      const graph = new Map([
        ['A', ['B']],
        ['B', ['C']],
        ['C', []],
      ]);
      const cycles = detectCircularDependencies(graph);
      expect(cycles.length).toBe(0);
    });
  });

  describe('Manifest Validation', () => {
    it('validates complete manifest', () => {
      const manifest = {
        id: 'test', name: 'Test', version: '1.0.0', status: 'RC1',
        provides: ['doSomething'],
        events_emitted: ['test.event'],
        strict_boundaries: { owns: ['Entity'], forbidden: ['Bad'] },
      };
      const result = validateManifest(manifest);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('fails for missing fields', () => {
      const result = validateManifest({ id: '', name: '', version: '', status: '', provides: [], events_emitted: [], strict_boundaries: { owns: [], forbidden: [] } });
      expect(result.valid).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════
// Sprint A-4: Contract Testing
// ═══════════════════════════════════════════

describe('Sprint A-4: Contract Testing', () => {

  describe('Contract Registry', () => {
    it('registers and retrieves contracts', () => {
      const registry = new InMemoryContractRegistry();
      registry.register({
        eventType: 'test.created', version: '1.0.0', schemaRef: 'v1',
        producerEngine: 'test', payloadSchema: { id: 'string' },
      });
      const contract = registry.get('test.created');
      expect(contract).not.toBeNull();
      expect(contract!.eventType).toBe('test.created');
    });

    it('returns null for unregistered contract', () => {
      const registry = new InMemoryContractRegistry();
      expect(registry.get('unknown')).toBeNull();
    });
  });

  describe('Schema Compatibility', () => {
    it('compatible when only fields added', () => {
      const old = { id: 'string', name: 'string' };
      const next = { id: 'string', name: 'string', email: 'string' };
      const result = checkSchemaCompatibility(old, next);
      expect(result.compatible).toBe(true);
      expect(result.additiveChanges.length).toBe(1);
    });

    it('breaking when field removed', () => {
      const old = { id: 'string', name: 'string' };
      const next = { id: 'string' };
      const result = checkSchemaCompatibility(old, next);
      expect(result.compatible).toBe(false);
      expect(result.breakingChanges.length).toBe(1);
    });

    it('breaking when type changed', () => {
      const old = { id: 'string' };
      const next = { id: 42 };
      const result = checkSchemaCompatibility(old, next);
      expect(result.compatible).toBe(false);
    });
  });

  describe('Consumer Contract Test', () => {
    it('passes when all fields present', () => {
      const test = {
        name: 'test-event-consumer', eventType: 'test.created', version: '1.0.0',
        expectedFields: ['id', 'name'], testPayload: {},
      };
      const result = runConsumerContractTest(test, { id: '1', name: 'test' });
      expect(result.passed).toBe(true);
    });

    it('fails when fields missing', () => {
      const test = {
        name: 'test-event-consumer', eventType: 'test.created', version: '1.0.0',
        expectedFields: ['id', 'name', 'email'], testPayload: {},
      };
      const result = runConsumerContractTest(test, { id: '1' });
      expect(result.passed).toBe(false);
      expect(result.missingFields).toContain('name');
      expect(result.missingFields).toContain('email');
    });
  });

  describe('Version Compatibility', () => {
    it('compatible for same major', () => {
      expect(isVersionCompatible('1.0.0', '1.5.0')).toBe(true);
    });

    it('incompatible for different major', () => {
      expect(isVersionCompatible('1.0.0', '2.0.0')).toBe(false);
    });
  });
});