/**
 * skill_standard/packs/index.ts — Skill Pack Architecture
 *
 * Enterprise Skill Library v2: Skills → Skill Packs → Playbooks → Agency Workflows
 * Every Skill must belong to one or more Skill Packs.
 */

import type { SkillDefinition, SkillCertification } from '../index.js';

// ═══════════════════════════════════════════
// Skill Pack Definition
// ═══════════════════════════════════════════

export interface SkillPack {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;                 // SemVer
  readonly certification: SkillCertification;   // inherits min of member skills
  readonly skillIds: string[];              // skills included (execution order)
  readonly executionOrder: ExecutionPhase[];
  readonly acceptanceCriteria: string[];
  readonly qualityGates: string[];
  readonly packDependencies: string[];      // other pack IDs required
  readonly examples: string[];              // example projects/outputs
  readonly compatibility: { platformVersion: string; frameworks: string[] };
}

export type ExecutionPhaseName =
  | 'Research' | 'Design' | 'UX' | 'Copywriting' | 'Psychology'
  | 'Accessibility' | 'SEO' | 'Performance' | 'AI' | 'Testing' | 'Deployment'
  | 'Architecture' | 'Security';

export interface ExecutionPhase {
  readonly phase: ExecutionPhaseName;
  readonly skillIds: string[];
}

export interface SkillPackManifest {
  readonly schemaVersion: '2.0.0';
  readonly packId: string;
  readonly packName: string;
  readonly skillCount: number;
  readonly phasesCovered: ExecutionPhase[];
  readonly certification: SkillCertification;
  readonly version: string;
  readonly generatedAt: string;
}

// ═══════════════════════════════════════════
// Skill Pack Validation
// ═══════════════════════════════════════════

export interface PackValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

export function validateSkillPack(pack: SkillPack, registry: { get(id: string): SkillDefinition | null }): PackValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!pack.id) errors.push('Missing: id');
  if (!pack.name) errors.push('Missing: name');
  if (pack.skillIds.length === 0) errors.push('Skill Pack must contain at least one skill');
  if (pack.executionOrder.length === 0) errors.push('Execution order required');

  // Verify all skills exist
  const missingSkills = pack.skillIds.filter(id => !registry.get(id));
  if (missingSkills.length > 0) errors.push(`Skills not found in registry: ${missingSkills.join(', ')}`);

  // Verify execution order covers all phases
  const referencedSkills = pack.skillIds.filter(id => registry.get(id) !== null);
  const skillCategories = new Set(referencedSkills.map(id => registry.get(id)?.category).filter(Boolean));

  // Certification must be min of member skills
  if (referencedSkills.length > 0) {
    const certs = referencedSkills.map(id => registry.get(id)!.evidenceLevel);
    const minCert = certs.includes('D') ? 'D' : certs.includes('C') ? 'C' : certs.includes('B') ? 'B' : 'A';
    if (pack.certification !== minCert) {
      warnings.push(`Pack certification ${pack.certification} should be ${minCert} (min of member skills)`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ═══════════════════════════════════════════
// Skill Pack Registry
// ═══════════════════════════════════════════

export interface ISkillPackRegistry {
  register(pack: SkillPack): void;
  get(id: string): SkillPack | null;
  findBySkill(skillId: string): SkillPack[];
  all(): SkillPack[];
  manifest(): { totalPacks: number; packs: { id: string; name: string; skillCount: number }[] };
}

export class InMemorySkillPackRegistry implements ISkillPackRegistry {
  private packs = new Map<string, SkillPack>();

  register(pack: SkillPack): void { this.packs.set(pack.id, pack); }
  get(id: string): SkillPack | null { return this.packs.get(id) ?? null; }

  findBySkill(skillId: string): SkillPack[] {
    return [...this.packs.values()].filter(p => p.skillIds.includes(skillId));
  }

  all(): SkillPack[] { return [...this.packs.values()]; }

  manifest(): { totalPacks: number; packs: { id: string; name: string; skillCount: number }[] } {
    return {
      totalPacks: this.packs.size,
      packs: [...this.packs.values()].map(p => ({ id: p.id, name: p.name, skillCount: p.skillIds.length })),
    };
  }
}

// ═══════════════════════════════════════════
// Initial Skill Packs
// ═══════════════════════════════════════════

export const INITIAL_SKILL_PACKS: SkillPack[] = [
  {
    id: 'pack-premium-website-foundation',
    name: 'Premium Website Foundation Pack',
    description: 'Core skills required for any premium, production-ready website',
    version: '1.0.0',
    certification: 'A',
    skillIds: [
      'wcag-color-contrast-aaa',        // Accessibility
      'seo-structured-data-jsonld',      // SEO
      'core-web-vitals-lcp-optimization',// Performance
      'owasp-input-validation',          // Security
      'twelve-factor-config-separation', // Architecture
      'nng-visual-hierarchy',            // UX
      'boundary-import-isolation-test',  // Testing
    ],
    executionOrder: [
      { phase: 'Architecture', skillIds: ['twelve-factor-config-separation'] },
      { phase: 'UX', skillIds: ['nng-visual-hierarchy'] },
      { phase: 'Accessibility', skillIds: ['wcag-color-contrast-aaa'] },
      { phase: 'SEO', skillIds: ['seo-structured-data-jsonld'] },
      { phase: 'Performance', skillIds: ['core-web-vitals-lcp-optimization'] },
      { phase: 'Security', skillIds: ['owasp-input-validation'] },
      { phase: 'Testing', skillIds: ['boundary-import-isolation-test'] },
    ],
    acceptanceCriteria: [
      'All 7 foundation skills pass quality gates',
      'WCAG AAA compliance verified',
      'Core Web Vitals LCP ≤ 2.5s',
      'Zero OWASP Top 10 vulnerabilities',
      'Engine boundary isolation verified',
    ],
    qualityGates: [
      'All member skills pass validation',
      'Pack certification ≥ B',
      'Execution order has no circular dependencies',
      'All skills have evidence URLs',
    ],
    packDependencies: [],
    examples: ['Aman Tokyo', 'Stripe.com', 'Linear.app'],
    compatibility: { platformVersion: '1.0.0', frameworks: ['nextjs', 'react', 'vue', 'flutter'] },
  },
  {
    id: 'pack-conversion-optimization',
    name: 'Conversion Optimization Pack',
    description: 'Skills for maximizing conversion through psychology, trust, and UX',
    version: '1.0.0',
    certification: 'B',
    skillIds: [
      'nng-visual-hierarchy',
      'wcag-color-contrast-aaa',
      'seo-structured-data-jsonld',
      'core-web-vitals-lcp-optimization',
    ],
    executionOrder: [
      { phase: 'UX', skillIds: ['nng-visual-hierarchy'] },
      { phase: 'Accessibility', skillIds: ['wcag-color-contrast-aaa'] },
      { phase: 'Performance', skillIds: ['core-web-vitals-lcp-optimization'] },
      { phase: 'SEO', skillIds: ['seo-structured-data-jsonld'] },
    ],
    acceptanceCriteria: [
      'Visual hierarchy guides to primary CTA',
      'CTA accessible and high-contrast',
      'Page loads fast enough to prevent abandonment',
    ],
    qualityGates: [
      'All member skills pass validation',
      'CTA visual weight is highest on page',
    ],
    packDependencies: ['pack-premium-website-foundation'],
    examples: ['Booking.com', 'Airbnb.com'],
    compatibility: { platformVersion: '1.0.0', frameworks: ['nextjs', 'react'] },
  },
];