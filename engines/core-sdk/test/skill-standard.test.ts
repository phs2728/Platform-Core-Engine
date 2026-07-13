/**
 * Enterprise Skill Standard v1 — Test Suite
 */
import { describe, it, expect } from 'vitest';
import {
  canExecuteByDefault, requiresApproval, isDisabled,
  evidenceTier,
  ALL_SKILL_CATEGORIES,
  validateSkill,
  InMemorySkillRegistry,
  runQualityGates,
  DefaultSkillGovernance,
  SkillExecutionAudit,
  INITIAL_SKILL_LIBRARY,
  CERTIFICATION_DESCRIPTIONS,
} from '../src/index.js';
import type { SkillDefinition } from '../src/index.js';

// ═══════════════════════════════════════════
// Certification System
// ═══════════════════════════════════════════

describe('Skill Certification', () => {
  it('A is executable by default', () => {
    expect(canExecuteByDefault('A')).toBe(true);
  });

  it('B is executable by default', () => {
    expect(canExecuteByDefault('B')).toBe(true);
  });

  it('C requires approval', () => {
    expect(canExecuteByDefault('C')).toBe(false);
    expect(requiresApproval('C')).toBe(true);
  });

  it('D is disabled', () => {
    expect(isDisabled('D')).toBe(true);
    expect(canExecuteByDefault('D')).toBe(false);
  });

  it('CERTIFICATION_DESCRIPTIONS has all 4', () => {
    expect(Object.keys(CERTIFICATION_DESCRIPTIONS).length).toBe(4);
  });
});

// ═══════════════════════════════════════════
// Evidence Tier
// ═══════════════════════════════════════════

describe('Evidence Tier', () => {
  it('WCAG is authoritative', () => {
    expect(evidenceTier('WCAG 2.2')).toBe('authoritative');
  });

  it('OWASP is authoritative', () => {
    expect(evidenceTier('OWASP')).toBe('authoritative');
  });

  it('Nielsen Norman Group is enterprise', () => {
    expect(evidenceTier('Nielsen Norman Group')).toBe('enterprise');
  });

  it('React Documentation is enterprise', () => {
    expect(evidenceTier('React Documentation')).toBe('enterprise');
  });
});

// ═══════════════════════════════════════════
// Category Taxonomy
// ═══════════════════════════════════════════

describe('Skill Category Taxonomy', () => {
  it('has 31+ categories', () => {
    expect(ALL_SKILL_CATEGORIES.length).toBeGreaterThanOrEqual(31);
  });

  it('includes all design categories', () => {
    expect(ALL_SKILL_CATEGORIES).toContain('Design');
    expect(ALL_SKILL_CATEGORIES).toContain('UX');
    expect(ALL_SKILL_CATEGORIES).toContain('Animation');
    expect(ALL_SKILL_CATEGORIES).toContain('Accessibility');
  });

  it('includes all platform categories', () => {
    expect(ALL_SKILL_CATEGORIES).toContain('CMS');
    expect(ALL_SKILL_CATEGORIES).toContain('Theme');
    expect(ALL_SKILL_CATEGORIES).toContain('Component');
    expect(ALL_SKILL_CATEGORIES).toContain('Studio');
  });

  it('includes all industry categories', () => {
    expect(ALL_SKILL_CATEGORIES).toContain('Hospitality');
    expect(ALL_SKILL_CATEGORIES).toContain('Restaurant');
    expect(ALL_SKILL_CATEGORIES).toContain('Travel');
    expect(ALL_SKILL_CATEGORIES).toContain('SaaS');
  });
});

// ═══════════════════════════════════════════
// Skill Validation (15 required fields)
// ═══════════════════════════════════════════

describe('Skill Validation', () => {
  const validSkill: SkillDefinition = INITIAL_SKILL_LIBRARY[0]!;

  it('validates a complete skill', () => {
    const result = validateSkill(validSkill);
    expect(result.errors.length).toBe(0);
  });

  it('fails for missing id', () => {
    const broken = { ...validSkill, id: '' } as SkillDefinition;
    const result = validateSkill(broken);
    expect(result.errors.some(e => e.includes('id'))).toBe(true);
  });

  it('fails for missing evidence sources', () => {
    const broken = { ...validSkill, evidenceSources: [] } as SkillDefinition;
    const result = validateSkill(broken);
    expect(result.errors.some(e => e.includes('evidence'))).toBe(true);
  });

  it('fails for missing execution steps', () => {
    const broken = { ...validSkill, executionSteps: [] } as SkillDefinition;
    const result = validateSkill(broken);
    expect(result.errors.some(e => e.includes('execution'))).toBe(true);
  });

  it('fails for missing references', () => {
    const broken = { ...validSkill, references: [] } as SkillDefinition;
    const result = validateSkill(broken);
    expect(result.errors.some(e => e.includes('reference'))).toBe(true);
  });

  it('detects opinion language', () => {
    const opinionated = { ...validSkill, purpose: 'I think this is good' } as SkillDefinition;
    const result = validateSkill(opinionated);
    expect(result.errors.some(e => e.includes('opinion'))).toBe(true);
  });
});

// ═══════════════════════════════════════════
// Quality Gates
// ═══════════════════════════════════════════

describe('Quality Gates', () => {
  const skill: SkillDefinition = INITIAL_SKILL_LIBRARY[0]!;

  it('passes all gates for a valid A-grade skill', () => {
    const results = runQualityGates(skill);
    results.forEach(r => expect(r.passed).toBe(true));
  });

  it('gate certification-executable fails for C skill', () => {
    const cSkill = { ...skill, evidenceLevel: 'C' as const } as SkillDefinition;
    const results = runQualityGates(cSkill);
    const certGate = results.find(r => r.gate === 'certification-executable')!;
    expect(certGate.passed).toBe(false);
  });

  it('gate no-opinion-language detects opinion text', () => {
    const opinionated = { ...skill, purpose: 'In my opinion this works' } as SkillDefinition;
    const results = runQualityGates(opinionated);
    const gate = results.find(r => r.gate === 'no-opinion-language')!;
    expect(gate.passed).toBe(false);
  });

  it('gate references-verifiable checks for http URLs', () => {
    const badRefs = { ...skill, references: [{ title: 'Opinion Blog', source: 'W3C' as never, url: 'not-a-url' }] } as SkillDefinition;
    const results = runQualityGates(badRefs);
    const gate = results.find(r => r.gate === 'references-verifiable')!;
    expect(gate.passed).toBe(false);
  });
});

// ═══════════════════════════════════════════
// Skill Registry
// ═══════════════════════════════════════════

describe('Skill Registry', () => {
  it('registers and retrieves skills', () => {
    const registry = new InMemorySkillRegistry();
    INITIAL_SKILL_LIBRARY.forEach(s => registry.register(s));
    expect(registry.get('wcag-color-contrast-aaa')).not.toBeNull();
    expect(registry.get('nonexistent')).toBeNull();
  });

  it('getByCategory returns correct skills', () => {
    const registry = new InMemorySkillRegistry();
    INITIAL_SKILL_LIBRARY.forEach(s => registry.register(s));
    const accessibility = registry.getByCategory('Accessibility');
    expect(accessibility.length).toBe(1);
    expect(accessibility[0]!.id).toBe('wcag-color-contrast-aaa');
  });

  it('findExecutable returns only A/B skills', () => {
    const registry = new InMemorySkillRegistry();
    INITIAL_SKILL_LIBRARY.forEach(s => registry.register(s));
    const executable = registry.findExecutable();
    expect(executable.length).toBe(INITIAL_SKILL_LIBRARY.length); // all are A or B
    executable.forEach(s => expect(['A', 'B']).toContain(s.evidenceLevel));
  });

  it('manifest generates summary', () => {
    const registry = new InMemorySkillRegistry();
    INITIAL_SKILL_LIBRARY.forEach(s => registry.register(s));
    const m = registry.manifest();
    expect(m.skillCount).toBe(INITIAL_SKILL_LIBRARY.length);
    expect(m.byCertification.A).toBeGreaterThan(0);
    expect(m.schemaVersion).toBe('1.0.0');
  });

  it('validateAll validates every skill', () => {
    const registry = new InMemorySkillRegistry();
    INITIAL_SKILL_LIBRARY.forEach(s => registry.register(s));
    const report = registry.validateAll();
    expect(report.totalSkills).toBe(INITIAL_SKILL_LIBRARY.length);
    expect(report.validCount).toBe(INITIAL_SKILL_LIBRARY.length);
    expect(report.invalidCount).toBe(0);
  });
});

// ═══════════════════════════════════════════
// Governance
// ═══════════════════════════════════════════

describe('Skill Governance', () => {
  const skill: SkillDefinition = INITIAL_SKILL_LIBRARY[0]!;

  it('approves valid A-grade skill', () => {
    const gov = new DefaultSkillGovernance();
    const decision = gov.review(skill);
    expect(decision.action).toBe('approve');
  });

  it('rejects invalid skill', () => {
    const gov = new DefaultSkillGovernance();
    const broken = { ...skill, executionSteps: [] } as SkillDefinition;
    const decision = gov.review(broken);
    expect(decision.action).toBe('reject');
  });

  it('quarantines skill with failed quality gates', () => {
    const gov = new DefaultSkillGovernance();
    const cSkill = { ...skill, evidenceLevel: 'C' as const } as SkillDefinition;
    const decision = gov.review(cSkill);
    expect(decision.action).toBe('quarantine');
  });

  it('approveForExecution rejects C skill', () => {
    const gov = new DefaultSkillGovernance();
    const cSkill = { ...skill, evidenceLevel: 'C' as const } as SkillDefinition;
    const decision = gov.approveForExecution(cSkill);
    expect(decision.action).toBe('reject');
  });
});

// ═══════════════════════════════════════════
// Execution Audit
// ═══════════════════════════════════════════

describe('Skill Execution Audit', () => {
  it('records and retrieves executions', () => {
    const audit = new SkillExecutionAudit();
    audit.record({
      id: 'exec-1', skillId: 'wcag-color-contrast-aaa', skillVersion: '1.0.0',
      tenantId: 't1', inputs: {}, outputs: {},
      acceptanceResults: [{ criterion: 'ratio ≥ 7:1', passed: true }],
      allPassed: true, evidenceRefs: ['ref1'], traceId: 'trace-1',
      executedAt: new Date().toISOString(), durationMs: 42,
    });
    expect(audit.count()).toBe(1);
    expect(audit.bySkill('wcag-color-contrast-aaa').length).toBe(1);
    expect(audit.byTenant('t1').length).toBe(1);
  });

  it('recent returns sorted by time', () => {
    const audit = new SkillExecutionAudit();
    audit.record({
      id: 'exec-1', skillId: 's1', skillVersion: '1.0.0', tenantId: 't1',
      inputs: {}, outputs: {}, acceptanceResults: [], allPassed: true,
      evidenceRefs: [], traceId: 't1', executedAt: '2026-07-13T10:00:00Z', durationMs: 10,
    });
    audit.record({
      id: 'exec-2', skillId: 's2', skillVersion: '1.0.0', tenantId: 't1',
      inputs: {}, outputs: {}, acceptanceResults: [], allPassed: true,
      evidenceRefs: [], traceId: 't2', executedAt: '2026-07-13T11:00:00Z', durationMs: 10,
    });
    const recent = audit.recent(1);
    expect(recent[0]!.id).toBe('exec-2');
  });
});

// ═══════════════════════════════════════════
// Initial Skill Library
// ═══════════════════════════════════════════

describe('Initial Skill Library', () => {
  it('has 7 skills', () => {
    expect(INITIAL_SKILL_LIBRARY.length).toBe(7);
  });

  it('all skills are A or B certified', () => {
    INITIAL_SKILL_LIBRARY.forEach(s => {
      expect(['A', 'B']).toContain(s.evidenceLevel);
    });
  });

  it('all skills pass validation', () => {
    INITIAL_SKILL_LIBRARY.forEach(s => {
      const result = validateSkill(s);
      expect(result.errors.length).toBe(0);
    });
  });

  it('all skills have evidence URLs', () => {
    INITIAL_SKILL_LIBRARY.forEach(s => {
      expect(s.evidenceUrl).toBeTruthy();
      expect(s.evidenceUrl!.startsWith('https://')).toBe(true);
    });
  });

  it('all skills have 15 required fields', () => {
    const requiredFields: (keyof SkillDefinition)[] = [
      'id', 'name', 'category', 'version',
      'evidenceSources', 'evidenceLevel',
      'purpose', 'problemSolved', 'whenToUse', 'whenNotToUse',
      'requiredInputs', 'expectedOutputs', 'executionSteps', 'acceptanceCriteria',
      'commonFailures', 'qualityChecklist', 'references', 'industryStandards',
      'compatibility',
    ];
    INITIAL_SKILL_LIBRARY.forEach(s => {
      requiredFields.forEach(f => {
        expect(s[f]).toBeDefined();
      });
    });
  });

  it('all references have http URLs', () => {
    INITIAL_SKILL_LIBRARY.forEach(s => {
      s.references.forEach(r => {
        expect(r.url.startsWith('https://')).toBe(true);
      });
    });
  });

  it('covers key categories', () => {
    const categories = INITIAL_SKILL_LIBRARY.map(s => s.category);
    expect(categories).toContain('Accessibility');
    expect(categories).toContain('SEO');
    expect(categories).toContain('Performance');
    expect(categories).toContain('Security');
    expect(categories).toContain('Architecture');
    expect(categories).toContain('UX');
    expect(categories).toContain('Testing');
  });
});