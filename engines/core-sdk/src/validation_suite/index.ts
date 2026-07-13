/**
 * validation_suite/index.ts — Platform Validation
 *
 * Capability 7: Validate no duplicated responsibility, no new business engine,
 * no boundary violation, no industry coupling, no architecture drift.
 */

// ═══════════════════════════════════════════
// Validation Types
// ═══════════════════════════════════════════

export type ValidationSeverity = 'critical' | 'error' | 'warning' | 'info';

export interface ValidationFinding {
  readonly ruleId: string;
  readonly severity: ValidationSeverity;
  readonly message: string;
  readonly location?: string | undefined;
  readonly recommendation?: string | undefined;
}

export interface ValidationReport {
  readonly passed: boolean;
  readonly findings: ValidationFinding[];
  readonly criticalCount: number;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly infoCount: number;
}

// ═══════════════════════════════════════════
// Validation Rules
// ═══════════════════════════════════════════

export interface ValidationRule {
  readonly id: string;
  readonly description: string;
  readonly severity: ValidationSeverity;
}

export const PLATFORM_VALIDATION_RULES: ValidationRule[] = [
  { id: 'no-duplicate-engine', description: 'No duplicate engine responsibility', severity: 'critical' },
  { id: 'no-new-business-engine', description: 'No new business engine beyond approved set', severity: 'critical' },
  { id: 'no-boundary-violation', description: 'No engine boundary violation', severity: 'error' },
  { id: 'no-industry-coupling', description: 'No industry-specific coupling in core', severity: 'error' },
  { id: 'no-architecture-drift', description: 'No architecture drift from established patterns', severity: 'error' },
  { id: 'preserve-agency-os', description: 'Agency OS layer must be preserved', severity: 'critical' },
  { id: 'preserve-creative-intelligence', description: 'Creative Intelligence must be preserved', severity: 'critical' },
  { id: 'preserve-experience', description: 'Experience Engine must be preserved', severity: 'critical' },
  { id: 'preserve-theme', description: 'Theme Engine must be preserved', severity: 'critical' },
  { id: 'preserve-component', description: 'Component Engine must be preserved', severity: 'critical' },
  { id: 'preserve-cms', description: 'CMS Engine must be preserved', severity: 'critical' },
  { id: 'preserve-studio', description: 'Studio Engine must be preserved', severity: 'critical' },
  { id: 'preserve-learning', description: 'Learning Engine must be preserved', severity: 'critical' },
  { id: 'host-interface-only', description: 'Cross-engine communication via Host Interface only', severity: 'error' },
  { id: 'plugin-architecture', description: 'Adapters must use Plugin Architecture', severity: 'warning' },
  { id: 'trust-architecture', description: 'Trust Architecture must be maintained', severity: 'critical' },
  { id: 'customer-decision-architecture', description: 'CDA must be maintained', severity: 'critical' },
  { id: 'industry-agnostic', description: 'Platform must remain Industry Agnostic', severity: 'error' },
];

// ═══════════════════════════════════════════
// Approved Engine Registry
// ═══════════════════════════════════════════

export const APPROVED_ENGINES: readonly string[] = [
  // Foundation
  'identity', 'communication', 'authorization', 'user', 'address', 'organization',
  'catalog', 'pricing', 'notification', 'event-bus', 'media',
  // Business
  'cms', 'booking', 'payment', 'billing', 'review', 'analytics', 'ai', 'workflow',
  // Platform
  'universal-core', 'policy', 'core-sdk', 'platform-compatibility', 'platform-guardian',
  'platform-validation', 'query', 'search', 'release-manager', 'package-manager', 'runtime',
  // Experience
  'experience', 'theme', 'creative-intelligence', 'creative-knowledge', 'learning',
  'inventory', 'order', 'component', 'studio',
  // Agency OS
  'agency-os',
];

// ═══════════════════════════════════════════
// Validators
// ═══════════════════════════════════════════

export function validateNoDuplicateEngine(existingEngines: string[], newEngineId: string): ValidationFinding | null {
  if (existingEngines.includes(newEngineId)) {
    return {
      ruleId: 'no-duplicate-engine',
      severity: 'critical',
      message: `Duplicate engine '${newEngineId}' already exists`,
      recommendation: 'Use the existing engine or extend it via Host Interface',
    };
  }
  return null;
}

export function validateNoNewBusinessEngine(newEngineId: string): ValidationFinding | null {
  if (!APPROVED_ENGINES.includes(newEngineId)) {
    return {
      ruleId: 'no-new-business-engine',
      severity: 'critical',
      message: `Engine '${newEngineId}' is not in the approved engine registry`,
      recommendation: 'Architecture is COMPLETE. No new business engines. Extend existing engines or core-sdk capabilities.',
    };
  }
  return null;
}

export function validateNoIndustryCoupling(source: string, industryTerms: string[]): ValidationFinding | null {
  const lower = source.toLowerCase();
  for (const term of industryTerms) {
    if (lower.includes(term.toLowerCase())) {
      return {
        ruleId: 'no-industry-coupling',
        severity: 'error',
        message: `Industry coupling detected: '${term}' in source`,
        recommendation: 'Move industry-specific logic to Creative Intelligence or Detail Strategy Library',
      };
    }
  }
  return null;
}

export function validatePreservedEngines(actualEngines: string[]): ValidationFinding[] {
  const required = ['agency-os', 'creative-intelligence', 'experience', 'theme', 'component', 'cms', 'studio', 'learning'];
  const missing = required.filter(e => !actualEngines.includes(e));
  return missing.map(engine => ({
    ruleId: `preserve-${engine}`,
    severity: 'critical' as ValidationSeverity,
    message: `Required engine '${engine}' is missing`,
    recommendation: `Restore ${engine} engine immediately`,
  }));
}

// ═══════════════════════════════════════════
// Full Platform Validation
// ═══════════════════════════════════════════

export function runPlatformValidation(input: {
  existingEngines: string[];
  actualEngines: string[];
  newEngineId?: string;
  importViolations?: { source: string; target: string }[];
  industryCouplingCheck?: { source: string; terms: string[] }[];
}): ValidationReport {
  const findings: ValidationFinding[] = [];

  // Check no duplicate
  if (input.newEngineId) {
    const dup = validateNoDuplicateEngine(input.existingEngines, input.newEngineId);
    if (dup) findings.push(dup);
  }

  // Check no new business engine
  if (input.newEngineId) {
    const newEngine = validateNoNewBusinessEngine(input.newEngineId);
    if (newEngine) findings.push(newEngine);
  }

  // Check preserved engines
  findings.push(...validatePreservedEngines(input.actualEngines));

  // Check import violations
  if (input.importViolations) {
    for (const v of input.importViolations) {
      findings.push({
        ruleId: 'no-boundary-violation',
        severity: 'error',
        message: `Boundary violation: ${v.source} imports ${v.target}`,
        location: v.source,
        recommendation: 'Use Host Interface for cross-engine communication',
      });
    }
  }

  // Check industry coupling
  if (input.industryCouplingCheck) {
    for (const check of input.industryCouplingCheck) {
      const finding = validateNoIndustryCoupling(check.source, check.terms);
      if (finding) findings.push(finding);
    }
  }

  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const errorCount = findings.filter(f => f.severity === 'error').length;
  const warningCount = findings.filter(f => f.severity === 'warning').length;
  const infoCount = findings.filter(f => f.severity === 'info').length;

  return {
    passed: criticalCount === 0 && errorCount === 0,
    findings,
    criticalCount, errorCount, warningCount, infoCount,
  };
}