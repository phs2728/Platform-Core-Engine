/**
 * skill_standard/index.ts — Enterprise Skill Standard v1
 *
 * 사장님 확립 2026-07-13:
 * "Evidence → Pattern → Skill → Execution. Never Opinion → Skill."
 *
 * Agency OS must never execute an unverified Skill.
 * Every execution must be reproducible, auditable, versioned, and evidence-based.
 */

// ═══════════════════════════════════════════
// Skill Certification (4 grades)
// ═══════════════════════════════════════════

export type SkillCertification = 'A' | 'B' | 'C' | 'D';

export const CERTIFICATION_DESCRIPTIONS: Record<SkillCertification, string> = {
  A: 'Industry Standard — backed by authoritative specs (WCAG, W3C, RFC, etc.)',
  B: 'Enterprise Proven — battle-tested in production at scale',
  C: 'Community Proven — widely adopted, peer-reviewed but not standardized',
  D: 'Experimental — emerging practice, insufficient evidence',
};

/**
 * Only A/B Skills may be used by default inside Platform Agency OS.
 * C Skills require explicit approval.
 * D Skills are disabled.
 */
export function canExecuteByDefault(cert: SkillCertification): boolean {
  return cert === 'A' || cert === 'B';
}

export function requiresApproval(cert: SkillCertification): boolean {
  return cert === 'C';
}

export function isDisabled(cert: SkillCertification): boolean {
  return cert === 'D';
}

// ═══════════════════════════════════════════
// Evidence Sources (authoritative only)
// ═══════════════════════════════════════════

export type EvidenceSource =
  | 'Apple HIG' | 'Material Design' | 'Microsoft Fluent' | 'IBM Carbon'
  | 'Atlassian Design System' | 'Shopify Polaris' | 'Stripe Design Principles'
  | 'Airbnb Design Language' | 'Figma Best Practices'
  | 'Nielsen Norman Group' | 'Baymard Institute'
  | 'WCAG 2.2' | 'W3C' | 'Google Search Essentials'
  | 'OpenTelemetry' | 'CNCF' | 'OWASP'
  | 'PostgreSQL Best Practices' | 'Twelve-Factor App'
  | 'Martin Fowler' | 'Eric Evans DDD' | 'Vaughn Vernon'
  | 'Gregor Hohpe' | 'Microsoft Architecture Center'
  | 'AWS Well-Architected' | 'Azure Architecture' | 'Google Cloud Architecture'
  | 'React Documentation' | 'Next.js Documentation' | 'Tailwind CSS'
  | 'shadcn/ui' | 'Framer Motion'
  | 'OpenAI API Best Practices' | 'Anthropic Claude Best Practices'
  | 'Vercel AI SDK' | 'LangGraph' | 'CrewAI' | 'AutoGen'
  | 'OpenAPI Specification' | 'GraphQL Specification' | 'JSON Schema'
  | 'RFC Standards' | 'ISO Standards' | 'NIST';

/**
 * Evidence source tier — determines trust weight.
 */
export function evidenceTier(source: EvidenceSource): 'authoritative' | 'enterprise' | 'community' {
  const authoritative: EvidenceSource[] = ['WCAG 2.2', 'W3C', 'RFC Standards', 'ISO Standards', 'NIST', 'Google Search Essentials', 'OpenAPI Specification', 'GraphQL Specification', 'JSON Schema', 'OWASP'];
  if (authoritative.includes(source)) return 'authoritative';
  const enterprise: EvidenceSource[] = ['Apple HIG', 'Material Design', 'Microsoft Fluent', 'IBM Carbon', 'Atlassian Design System', 'Shopify Polaris', 'Stripe Design Principles', 'Airbnb Design Language', 'PostgreSQL Best Practices', 'Twelve-Factor App', 'Martin Fowler', 'Eric Evans DDD', 'Vaughn Vernon', 'Gregor Hohpe', 'Microsoft Architecture Center', 'AWS Well-Architected', 'Azure Architecture', 'Google Cloud Architecture', 'React Documentation', 'Next.js Documentation', 'Nielsen Norman Group', 'Baymard Institute', 'OpenTelemetry', 'CNCF'];
  if (enterprise.includes(source)) return 'enterprise';
  return 'community';
}

// ═══════════════════════════════════════════
// Skill Category Taxonomy (36 categories)
// ═══════════════════════════════════════════

export type SkillCategory =
  // Design & UX
  | 'Design' | 'UX' | 'Animation' | 'Accessibility' | 'Copywriting' | 'Psychology'
  // Engineering
  | 'Frontend' | 'Backend' | 'Architecture' | 'Performance' | 'Security' | 'Testing' | 'Deployment'
  // Platform
  | 'CMS' | 'Component' | 'Theme' | 'Studio' | 'Localization' | 'SEO'
  // Agency
  | 'AI' | 'Agency' | 'Customer Decision' | 'Trust Evidence' | 'Detail Page' | 'AI Chat' | 'FAQ' | 'Customer Support'
  // Industry
  | 'Hospitality' | 'Restaurant' | 'Travel' | 'Marketplace' | 'SaaS';

export const ALL_SKILL_CATEGORIES: SkillCategory[] = [
  'Design', 'UX', 'Animation', 'Accessibility', 'Copywriting', 'Psychology',
  'Frontend', 'Backend', 'Architecture', 'Performance', 'Security', 'Testing', 'Deployment',
  'CMS', 'Component', 'Theme', 'Studio', 'Localization', 'SEO',
  'AI', 'Agency', 'Customer Decision', 'Trust Evidence', 'Detail Page', 'AI Chat', 'FAQ', 'Customer Support',
  'Hospitality', 'Restaurant', 'Travel', 'Marketplace', 'SaaS',
];

// ═══════════════════════════════════════════
// Skill Definition (15 required fields)
// ═══════════════════════════════════════════

export interface SkillDefinition {
  // Identity (4)
  readonly id: string;
  readonly name: string;
  readonly category: SkillCategory;
  readonly version: string;                 // SemVer
  // Evidence (3)
  readonly evidenceSources: EvidenceSource[];
  readonly evidenceLevel: SkillCertification;   // A/B/C/D
  readonly evidenceUrl?: string | undefined;
  // Specification (8)
  readonly purpose: string;
  readonly problemSolved: string;
  readonly whenToUse: string;
  readonly whenNotToUse: string;
  readonly requiredInputs: SkillInput[];
  readonly expectedOutputs: SkillOutput[];
  readonly executionSteps: SkillStep[];
  readonly acceptanceCriteria: string[];
  // Quality (4)
  readonly commonFailures: string[];
  readonly qualityChecklist: string[];
  readonly references: SkillReference[];
  readonly industryStandards: string[];
  // Lifecycle
  readonly compatibility: SkillCompatibility;
}

export interface SkillInput {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly description: string;
}

export interface SkillOutput {
  readonly name: string;
  readonly type: string;
  readonly description: string;
}

export interface SkillStep {
  readonly order: number;
  readonly action: string;
  readonly detail: string;
}

export interface SkillReference {
  readonly title: string;
  readonly source: EvidenceSource;
  readonly url: string;
  readonly section?: string | undefined;
}

export interface SkillCompatibility {
  readonly platformVersion: string;         // min Platform version
  readonly engineDependencies: string[];    // engine IDs required
  readonly skillDependencies: string[];     // other skill IDs required
  readonly conflictingSkills: string[];     // skills that conflict
  readonly frameworks: string[];            // compatible frameworks
}

// ═══════════════════════════════════════════
// Skill Manifest
// ═══════════════════════════════════════════

export interface SkillManifest {
  readonly schemaVersion: '1.0.0';
  readonly skillCount: number;
  readonly byCategory: Record<string, number>;
  readonly byCertification: Record<SkillCertification, number>;
  readonly generatedAt: string;
}

// ═══════════════════════════════════════════
// Skill Validation
// ═══════════════════════════════════════════

export interface SkillValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

/**
 * Validate a Skill Definition has all 15 required fields populated.
 */
export function validateSkill(skill: SkillDefinition): SkillValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Identity checks
  if (!skill.id) errors.push('Missing required field: id');
  if (!skill.name) errors.push('Missing required field: name');
  if (!skill.version) errors.push('Missing required field: version');
  if (!skill.category) errors.push('Missing required field: category');
  if (!ALL_SKILL_CATEGORIES.includes(skill.category)) errors.push(`Invalid category: ${skill.category}`);

  // Evidence checks
  if (skill.evidenceSources.length === 0) errors.push('At least one evidence source required');
  if (!['A', 'B', 'C', 'D'].includes(skill.evidenceLevel)) errors.push('Invalid evidence level');

  // Spec checks
  if (!skill.purpose) errors.push('Missing: purpose');
  if (!skill.problemSolved) errors.push('Missing: problemSolved');
  if (!skill.whenToUse) errors.push('Missing: whenToUse');
  if (!skill.whenNotToUse) errors.push('Missing: whenNotToUse');
  if (skill.requiredInputs.length === 0) warnings.push('No required inputs defined');
  if (skill.expectedOutputs.length === 0) warnings.push('No expected outputs defined');
  if (skill.executionSteps.length === 0) errors.push('At least one execution step required');
  if (skill.acceptanceCriteria.length === 0) errors.push('At least one acceptance criterion required');

  // Quality checks
  if (skill.commonFailures.length === 0) warnings.push('No common failures documented');
  if (skill.qualityChecklist.length === 0) warnings.push('No quality checklist defined');
  if (skill.references.length === 0) errors.push('At least one reference required');
  if (skill.industryStandards.length === 0) warnings.push('No industry standards cited');

  // Compatibility checks
  if (!skill.compatibility.platformVersion) errors.push('Missing: compatibility.platformVersion');

  // Forbidden content check
  const allText = JSON.stringify(skill).toLowerCase();
  if (allText.includes('i think') || allText.includes('in my opinion') || allText.includes('i believe')) {
    errors.push('Forbidden: opinion-based language detected ("I think" / "in my opinion" / "I believe")');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ═══════════════════════════════════════════
// Skill Registry
// ═══════════════════════════════════════════

export interface ISkillRegistry {
  register(skill: SkillDefinition): void;
  get(id: string): SkillDefinition | null;
  getByCategory(category: SkillCategory): SkillDefinition[];
  getByCertification(cert: SkillCertification): SkillDefinition[];
  findExecutable(): SkillDefinition[];
  validateAll(): SkillValidationReport;
  manifest(): SkillManifest;
  all(): SkillDefinition[];
}

export interface SkillValidationReport {
  readonly totalSkills: number;
  readonly validCount: number;
  readonly invalidCount: number;
  readonly findings: { skillId: string; errors: string[]; warnings: string[] }[];
}

export class InMemorySkillRegistry implements ISkillRegistry {
  private skills = new Map<string, SkillDefinition>();

  register(skill: SkillDefinition): void {
    this.skills.set(skill.id, skill);
  }

  get(id: string): SkillDefinition | null {
    return this.skills.get(id) ?? null;
  }

  getByCategory(category: SkillCategory): SkillDefinition[] {
    return [...this.skills.values()].filter(s => s.category === category);
  }

  getByCertification(cert: SkillCertification): SkillDefinition[] {
    return [...this.skills.values()].filter(s => s.evidenceLevel === cert);
  }

  findExecutable(): SkillDefinition[] {
    return [...this.skills.values()].filter(s => canExecuteByDefault(s.evidenceLevel));
  }

  validateAll(): SkillValidationReport {
    const findings: { skillId: string; errors: string[]; warnings: string[] }[] = [];
    let validCount = 0;
    for (const skill of this.skills.values()) {
      const result = validateSkill(skill);
      if (result.valid) validCount++;
      findings.push({ skillId: skill.id, errors: result.errors, warnings: result.warnings });
    }
    return {
      totalSkills: this.skills.size,
      validCount,
      invalidCount: this.skills.size - validCount,
      findings,
    };
  }

  manifest(): SkillManifest {
    const byCategory: Record<string, number> = {};
    const byCertification: Record<SkillCertification, number> = { A: 0, B: 0, C: 0, D: 0 };
    for (const skill of this.skills.values()) {
      byCategory[skill.category] = (byCategory[skill.category] ?? 0) + 1;
      byCertification[skill.evidenceLevel]++;
    }
    return {
      schemaVersion: '1.0.0',
      skillCount: this.skills.size,
      byCategory,
      byCertification,
      generatedAt: new Date().toISOString(),
    };
  }

  all(): SkillDefinition[] {
    return [...this.skills.values()];
  }
}

// ═══════════════════════════════════════════
// Skill Quality Gates
// ═══════════════════════════════════════════

export interface QualityGateResult {
  readonly gate: string;
  readonly passed: boolean;
  readonly message: string;
}

export function runQualityGates(skill: SkillDefinition): QualityGateResult[] {
  const results: QualityGateResult[] = [];

  // Gate 1: Evidence present
  results.push({
    gate: 'evidence-present',
    passed: skill.evidenceSources.length > 0,
    message: skill.evidenceSources.length > 0 ? `${skill.evidenceSources.length} evidence sources` : 'No evidence sources',
  });

  // Gate 2: Certification A or B
  results.push({
    gate: 'certification-executable',
    passed: canExecuteByDefault(skill.evidenceLevel),
    message: `Level ${skill.evidenceLevel} — ${canExecuteByDefault(skill.evidenceLevel) ? 'executable' : (isDisabled(skill.evidenceLevel) ? 'disabled' : 'requires approval')}`,
  });

  // Gate 3: References with URLs
  results.push({
    gate: 'references-verifiable',
    passed: skill.references.length > 0 && skill.references.every(r => r.url.startsWith('http')),
    message: `${skill.references.length} references`,
  });

  // Gate 4: Execution steps are ordered
  const orders = skill.executionSteps.map(s => s.order);
  const isOrdered = orders.every((o, i) => i === 0 || o > orders[i - 1]!);
  results.push({
    gate: 'execution-ordered',
    passed: isOrdered,
    message: isOrdered ? 'Steps properly ordered' : 'Steps not in sequential order',
  });

  // Gate 5: No opinion language
  const text = JSON.stringify(skill).toLowerCase();
  const hasOpinion = text.includes('i think') || text.includes('in my opinion') || text.includes('i feel') || text.includes('i believe');
  results.push({
    gate: 'no-opinion-language',
    passed: !hasOpinion,
    message: hasOpinion ? 'Opinion-based language detected' : 'No opinion language',
  });

  // Gate 6: Acceptance criteria testable
  results.push({
    gate: 'acceptance-testable',
    passed: skill.acceptanceCriteria.length > 0,
    message: `${skill.acceptanceCriteria.length} acceptance criteria`,
  });

  return results;
}

// ═══════════════════════════════════════════
// Skill Governance
// ═══════════════════════════════════════════

export type GovernanceAction =
  | 'approve' | 'reject' | 'deprecate' | 'upgrade-certification'
  | 'downgrade-certification' | 'quarantine';

export interface GovernanceDecision {
  readonly skillId: string;
  readonly action: GovernanceAction;
  readonly by: string;
  readonly reason: string;
  readonly timestamp: string;
}

export interface SkillGovernance {
  review(skill: SkillDefinition): GovernanceDecision;
  approveForExecution(skill: SkillDefinition): GovernanceDecision;
  revoke(skill: SkillDefinition, reason: string): GovernanceDecision;
}

/**
 * Default Governance: strict A/B enforcement.
 */
export class DefaultSkillGovernance implements SkillGovernance {
  constructor(private readonly reviewer: string = 'platform-skill-committee') {}

  review(skill: SkillDefinition): GovernanceDecision {
    const validation = validateSkill(skill);
    const gates = runQualityGates(skill);
    const allGatesPassed = gates.every(g => g.passed);

    if (!validation.valid) {
      return { skillId: skill.id, action: 'reject', by: this.reviewer, reason: `Validation failed: ${validation.errors.join('; ')}`, timestamp: new Date().toISOString() };
    }
    if (!allGatesPassed) {
      return { skillId: skill.id, action: 'quarantine', by: this.reviewer, reason: 'Quality gates not met', timestamp: new Date().toISOString() };
    }
    return { skillId: skill.id, action: 'approve', by: this.reviewer, reason: 'All checks passed', timestamp: new Date().toISOString() };
  }

  approveForExecution(skill: SkillDefinition): GovernanceDecision {
    if (!canExecuteByDefault(skill.evidenceLevel)) {
      return { skillId: skill.id, action: 'reject', by: this.reviewer, reason: `Certification ${skill.evidenceLevel} not executable by default`, timestamp: new Date().toISOString() };
    }
    return { skillId: skill.id, action: 'approve', by: this.reviewer, reason: 'Executable', timestamp: new Date().toISOString() };
  }

  revoke(skill: SkillDefinition, reason: string): GovernanceDecision {
    return { skillId: skill.id, action: 'deprecate', by: this.reviewer, reason, timestamp: new Date().toISOString() };
  }
}

// ═══════════════════════════════════════════
// Skill Execution Audit
// ═══════════════════════════════════════════

export interface SkillExecutionRecord {
  readonly id: string;
  readonly skillId: string;
  readonly skillVersion: string;
  readonly tenantId: string;
  readonly inputs: Record<string, unknown>;
  readonly outputs: Record<string, unknown>;
  readonly acceptanceResults: { criterion: string; passed: boolean }[];
  readonly allPassed: boolean;
  readonly evidenceRefs: string[];
  readonly traceId: string;
  readonly executedAt: string;
  readonly durationMs: number;
}

/**
 * Execution audit log — Agency OS must never execute an unverified Skill.
 * Every execution must be reproducible, auditable, versioned, evidence-based.
 */
export class SkillExecutionAudit {
  private records: SkillExecutionRecord[] = [];

  record(execution: SkillExecutionRecord): void {
    this.records.push(execution);
  }

  bySkill(skillId: string): SkillExecutionRecord[] {
    return this.records.filter(r => r.skillId === skillId);
  }

  byTenant(tenantId: string): SkillExecutionRecord[] {
    return this.records.filter(r => r.tenantId === tenantId);
  }

  recent(limit: number): SkillExecutionRecord[] {
    return [...this.records].sort((a, b) => b.executedAt.localeCompare(a.executedAt)).slice(0, limit);
  }

  all(): SkillExecutionRecord[] {
    return [...this.records];
  }

  count(): number {
    return this.records.length;
  }
}