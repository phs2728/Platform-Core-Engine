/**
 * skill_standard/library.ts — Initial Skill Library
 *
 * Every Skill is evidence-based with A or B certification.
 * No AI folklore. No prompt hacks. No unverified opinions.
 */

import type { SkillDefinition } from './index.js';

export const INITIAL_SKILL_LIBRARY: SkillDefinition[] = [

  // ═══════════════════════════════════════════
  // Accessibility (WCAG 2.2 — A grade)
  // ═══════════════════════════════════════════

  {
    id: 'wcag-color-contrast-aaa',
    name: 'WCAG 2.2 Color Contrast AAA',
    category: 'Accessibility',
    version: '1.0.0',
    evidenceSources: ['WCAG 2.2', 'W3C'],
    evidenceLevel: 'A',
    evidenceUrl: 'https://www.w3.org/WAI/WCAG22/quickref/#contrast-enhanced',
    purpose: 'Ensure all text meets WCAG 2.2 AAA contrast ratio (7:1 normal, 4.5:1 large)',
    problemSolved: 'Low contrast text is unreadable for visually impaired users and fails accessibility compliance',
    whenToUse: 'When generating any text element (body, heading, button, label, placeholder)',
    whenNotToUse: 'When text is purely decorative or disabled state with explicit opacity',
    requiredInputs: [
      { name: 'foreground', type: 'string (hex/rgb)', required: true, description: 'Text color' },
      { name: 'background', type: 'string (hex/rgb)', required: true, description: 'Background color' },
      { name: 'fontSize', type: 'number (px)', required: true, description: 'Font size in pixels' },
      { name: 'fontWeight', type: 'number', required: false, description: 'CSS font-weight (default 400)' },
    ],
    expectedOutputs: [
      { name: 'ratio', type: 'number', description: 'Computed contrast ratio (e.g., 7.2:1)' },
      { name: 'passes', type: 'boolean', description: 'Whether ratio meets AAA threshold' },
      { name: 'level', type: '"AAA" | "AA" | "Fail"', description: 'Achieved compliance level' },
    ],
    executionSteps: [
      { order: 1, action: 'Parse colors', detail: 'Convert foreground/background to relative luminance values per WCAG formula' },
      { order: 2, action: 'Compute ratio', detail: 'ratio = (L1 + 0.05) / (L2 + 0.05) where L1 > L2' },
      { order: 3, action: 'Determine threshold', detail: 'Large text (≥18pt or ≥14pt bold) requires 4.5:1; normal text requires 7:1' },
      { order: 4, action: 'Return result', detail: 'Output ratio, pass/fail, and achieved level' },
    ],
    acceptanceCriteria: [
      'Normal text (< 18px): ratio ≥ 7.0 → AAA',
      'Large text (≥ 18px or ≥ 14px bold): ratio ≥ 4.5 → AAA',
      'Pure black on pure white must return ratio 21:1',
    ],
    commonFailures: [
      'Using HSL/HSV values directly without converting to relative luminance',
      'Not accounting for font-weight in large text determination',
      'Rounding luminance intermediate values',
    ],
    qualityChecklist: [
      'Both colors parsed to sRGB',
      'Linearized using WCAG formula (not gamma approximation)',
      'Large text threshold correctly applied',
    ],
    references: [
      { title: 'WCAG 2.2 SC 1.4.6 Contrast (Enhanced)', source: 'WCAG 2.2', url: 'https://www.w3.org/WAI/WCAG22/quickref/#contrast-enhanced' },
      { title: 'W3C Contrast Ratio Definition', source: 'W3C', url: 'https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio' },
    ],
    industryStandards: ['WCAG 2.2 SC 1.4.6', 'W3C', 'Section 508', 'EN 301 549'],
    compatibility: { platformVersion: '1.0.0', engineDependencies: [], skillDependencies: [], conflictingSkills: [], frameworks: ['react', 'nextjs', 'vue', 'flutter'] },
  },

  // ═══════════════════════════════════════════
  // SEO (Google Search Essentials — A grade)
  // ═══════════════════════════════════════════

  {
    id: 'seo-structured-data-jsonld',
    name: 'SEO Structured Data (JSON-LD)',
    category: 'SEO',
    version: '1.0.0',
    evidenceSources: ['Google Search Essentials', 'W3C', 'JSON Schema'],
    evidenceLevel: 'A',
    evidenceUrl: 'https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data',
    purpose: 'Generate valid JSON-LD structured data for rich results in Google Search',
    problemSolved: 'Search engines cannot infer page content semantics from HTML alone',
    whenToUse: 'When generating any page that should appear in Google rich results',
    whenNotToUse: 'For pages not intended for search indexing (admin, internal tools)',
    requiredInputs: [
      { name: 'pageType', type: '"Organization" | "WebSite" | "Article" | "Product" | "FAQPage" | "BreadcrumbList"', required: true, description: 'Schema.org type' },
      { name: 'data', type: 'Record<string, unknown>', required: true, description: 'Structured data matching schema.org spec' },
      { name: 'locale', type: 'string', required: false, description: 'Page locale for hreflang' },
    ],
    expectedOutputs: [
      { name: 'jsonld', type: 'string (JSON)', description: 'Valid JSON-LD script tag content' },
      { name: 'validationErrors', type: 'string[]', description: 'Schema.org validation errors (empty if valid)' },
    ],
    executionSteps: [
      { order: 1, action: 'Select schema', detail: 'Map pageType to schema.org type definition' },
      { order: 2, action: 'Build graph', detail: 'Construct @context, @type, and required properties' },
      { order: 3, action: 'Validate', detail: 'Check against schema.org specification for required fields' },
      { order: 4, action: 'Serialize', detail: 'Output as JSON-LD script tag' },
    ],
    acceptanceCriteria: [
      'Output passes Google Rich Results Test',
      '@context is always "https://schema.org"',
      'All required properties for the type are present',
    ],
    commonFailures: [
      'Missing @context field',
      'Using microdata instead of JSON-LD (Google prefers JSON-LD)',
      'Not including all required properties per type',
    ],
    qualityChecklist: [
      '@context present and correct',
      '@type matches schema.org vocabulary',
      'Required properties validated',
      'URL fields are absolute URLs',
    ],
    references: [
      { title: 'Google Structured Data Documentation', source: 'Google Search Essentials', url: 'https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data' },
      { title: 'Schema.org Full Hierarchy', source: 'W3C', url: 'https://schema.org/docs/full.html' },
    ],
    industryStandards: ['Google Search Essentials', 'Schema.org', 'JSON-LD 1.1 (W3C)'],
    compatibility: { platformVersion: '1.0.0', engineDependencies: ['cms'], skillDependencies: [], conflictingSkills: [], frameworks: ['nextjs', 'react', 'vue'] },
  },

  // ═══════════════════════════════════════════
  // Performance (Web Vitals — B grade, Google-proven)
  // ═══════════════════════════════════════════

  {
    id: 'core-web-vitals-lcp-optimization',
    name: 'Core Web Vitals LCP Optimization',
    category: 'Performance',
    version: '1.0.0',
    evidenceSources: ['Google Search Essentials', 'Next.js Documentation', 'React Documentation'],
    evidenceLevel: 'B',
    evidenceUrl: 'https://web.dev/articles/lcp',
    purpose: 'Optimize Largest Contentful Paint to ≤ 2.5s for 75th percentile of page loads',
    problemSolved: 'Slow LCP causes poor user experience and lower Google search rankings',
    whenToUse: 'When generating pages that will be indexed by Google and served to users',
    whenNotToUse: 'For admin panels or internal tools not subject to Core Web Vitals',
    requiredInputs: [
      { name: 'heroElement', type: 'string', required: true, description: 'CSS selector or component ID of the LCP element' },
      { name: 'imageSources', type: 'string[]', required: false, description: 'Image URLs in hero area' },
      { name: 'fontStrategy', type: '"preload" | "swap" | "fallback"', required: false, description: 'Web font loading strategy' },
    ],
    expectedOutputs: [
      { name: 'recommendations', type: 'string[]', description: 'Ordered optimization recommendations' },
      { name: 'estimatedImprovement', type: 'number', description: 'Estimated LCP reduction in ms' },
    ],
    executionSteps: [
      { order: 1, action: 'Identify LCP element', detail: 'Determine which element triggers LCP (typically hero image or large heading)' },
      { order: 2, action: 'Optimize resource loading', detail: 'Preload LCP image, use fetchpriority="high", eliminate render-blocking resources' },
      { order: 3, action: 'Optimize font loading', detail: 'Use font-display: swap, preload critical fonts' },
      { order: 4, action: 'Optimize server response', detail: 'Ensure TTFB ≤ 600ms via CDN and edge rendering' },
      { order: 5, action: 'Generate recommendations', detail: 'Produce ordered list of actions with estimated improvement' },
    ],
    acceptanceCriteria: [
      'LCP ≤ 2.5s at 75th percentile on 4G connection',
      'No render-blocking scripts in <head>',
      'LCP image has fetchpriority="high"',
      'Critical fonts preloaded',
    ],
    commonFailures: [
      'Using background-image CSS instead of <img> for LCP (browser cannot prioritize)',
      'Not preloading web fonts',
      'Serving unoptimized images (no srcset/sizes)',
    ],
    qualityChecklist: [
      'LCP element identified',
      'Image preloaded with fetchpriority',
      'Fonts have display: swap',
      'No render-blocking resources',
      'TTFB optimized',
    ],
    references: [
      { title: 'Largest Contentful Paint (web.dev)', source: 'Google Search Essentials', url: 'https://web.dev/articles/lcp' },
      { title: 'Next.js Image Optimization', source: 'Next.js Documentation', url: 'https://nextjs.org/docs/app/building-your-application/optimizing/images' },
    ],
    industryStandards: ['Google Core Web Vitals', 'CrUX (Chrome User Experience Report)'],
    compatibility: { platformVersion: '1.0.0', engineDependencies: ['experience', 'theme'], skillDependencies: [], conflictingSkills: [], frameworks: ['nextjs', 'react', 'vue'] },
  },

  // ═══════════════════════════════════════════
  // Security (OWASP — A grade)
  // ═══════════════════════════════════════════

  {
    id: 'owasp-input-validation',
    name: 'OWASP Input Validation',
    category: 'Security',
    version: '1.0.0',
    evidenceSources: ['OWASP'],
    evidenceLevel: 'A',
    evidenceUrl: 'https://owasp.org/www-community/Input_Validation',
    purpose: 'Validate all untrusted input at trust boundaries using allowlist approach',
    problemSolved: 'Unvalidated input leads to injection attacks (SQLi, XSS, command injection)',
    whenToUse: 'At every trust boundary (HTTP request, message queue, external API response)',
    whenNotToUse: 'For internally generated data within a single trust boundary',
    requiredInputs: [
      { name: 'input', type: 'unknown', required: true, description: 'The input to validate' },
      { name: 'schema', type: 'ZodSchema', required: true, description: 'Strict validation schema (allowlist)' },
      { name: 'context', type: 'string', required: false, description: 'Validation context for error messages' },
    ],
    expectedOutputs: [
      { name: 'result', type: 'Result<T, ValidationError>', description: 'Validated input or error' },
      { name: 'sanitized', type: 'T', description: 'The validated, type-safe input' },
    ],
    executionSteps: [
      { order: 1, action: 'Define allowlist schema', detail: 'Use Zod with strict mode — reject unknown keys, specify exact types' },
      { order: 2, action: 'Parse input', detail: 'Run schema.parse() — do not use safeParse for untrusted input at boundaries' },
      { order: 3, action: 'Canonicalize', detail: 'Normalize encoding (UTF-8), reject double-encoded sequences' },
      { order: 4, action: 'Return result', detail: 'Return typed result or structured validation error' },
    ],
    acceptanceCriteria: [
      'All external input passes through Zod schema validation',
      'Unknown keys rejected (Zod strict)',
      'No raw user input reaches database queries',
      'Error messages do not leak internal structure',
    ],
    commonFailures: [
      'Using blocklist instead of allowlist validation',
      'Validating on client only (must validate server-side)',
      'Not handling encoding canonicalization',
      'Error messages revealing schema structure',
    ],
    qualityChecklist: [
      'Allowlist schema defined',
      'Zod strict mode enabled',
      'Server-side validation present',
      'Canonicalization handled',
      'Error messages sanitized',
    ],
    references: [
      { title: 'OWASP Input Validation Cheat Sheet', source: 'OWASP', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html' },
      { title: 'OWASP Top 10 — A03:2021 Injection', source: 'OWASP', url: 'https://owasp.org/Top10/A03_2021-Injection/' },
    ],
    industryStandards: ['OWASP Top 10', 'OWASP ASVS', 'NIST SP 800-53 IA-5'],
    compatibility: { platformVersion: '1.0.0', engineDependencies: [], skillDependencies: [], conflictingSkills: [], frameworks: ['react', 'nextjs', 'vue', 'flutter'] },
  },

  // ═══════════════════════════════════════════
  // Architecture (Twelve-Factor App — A grade)
  // ═══════════════════════════════════════════

  {
    id: 'twelve-factor-config-separation',
    name: 'Twelve-Factor Config Separation',
    category: 'Architecture',
    version: '1.0.0',
    evidenceSources: ['Twelve-Factor App', 'AWS Well-Architected', 'Google Cloud Architecture'],
    evidenceLevel: 'A',
    evidenceUrl: 'https://12factor.net/config',
    purpose: 'Strictly separate configuration from code via environment variables',
    problemSolved: 'Hardcoded config makes deployment across environments impossible and leaks secrets',
    whenToUse: 'When building any service that runs in multiple environments (dev/staging/prod)',
    whenNotToUse: 'For constants that are truly the same across all environments',
    requiredInputs: [
      { name: 'configKeys', type: 'string[]', required: true, description: 'Required environment variable names' },
      { name: 'defaults', type: 'Record<string, string>', required: false, description: 'Development-only defaults' },
    ],
    expectedOutputs: [
      { name: 'config', type: 'Record<string, string>', description: 'Validated configuration object' },
      { name: 'missing', type: 'string[]', description: 'Missing required keys (empty if valid)' },
    ],
    executionSteps: [
      { order: 1, action: 'List required keys', detail: 'Identify all env vars the service needs' },
      { order: 2, action: 'Read environment', detail: 'Read from process.env (server) — never hardcode in source' },
      { order: 3, action: 'Validate presence', detail: 'For each required key: throw if missing in production' },
      { order: 4, action: 'Type-cast values', detail: 'Convert strings to correct types (boolean, number, etc.)' },
    ],
    acceptanceCriteria: [
      'No secrets or environment-specific values in source code',
      'All config accessed via process.env at runtime',
      'Production startup fails if required env vars are missing',
      '.env files are in .gitignore',
    ],
    commonFailures: [
      'Committing .env files to version control',
      'Using different env var names across environments',
      'Not validating env var presence at startup',
      'Storing database URLs in config files instead of env vars',
    ],
    qualityChecklist: [
      'No hardcoded URLs or credentials',
      '.env in .gitignore',
      'Startup validation for required keys',
      'Type-safe config object',
    ],
    references: [
      { title: 'Twelve-Factor App: Config', source: 'Twelve-Factor App', url: 'https://12factor.net/config' },
      { title: 'AWS Well-Architected: Security Pillar', source: 'AWS Well-Architected', url: 'https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/security.html' },
    ],
    industryStandards: ['Twelve-Factor App', 'AWS Well-Architected Framework', 'Google Cloud Architecture Framework'],
    compatibility: { platformVersion: '1.0.0', engineDependencies: [], skillDependencies: [], conflictingSkills: [], frameworks: ['nextjs', 'react', 'vue', 'flutter'] },
  },

  // ═══════════════════════════════════════════
  // UX (Nielsen Norman Group — B grade)
  // ═══════════════════════════════════════════

  {
    id: 'nng-visual-hierarchy',
    name: 'Visual Hierarchy (Nielsen Norman)',
    category: 'UX',
    version: '1.0.0',
    evidenceSources: ['Nielsen Norman Group'],
    evidenceLevel: 'B',
    evidenceUrl: 'https://www.nngroup.com/articles/visual-hierarchy-ux-definition/',
    purpose: 'Guide user attention through deliberate size, contrast, spacing, and position hierarchy',
    problemSolved: 'Without visual hierarchy, users cannot identify the most important elements on a page',
    whenToUse: 'When designing any page layout or component arrangement',
    whenNotToUse: 'When all elements are truly equal in importance (rare — e.g., data tables)',
    requiredInputs: [
      { name: 'elements', type: '{ id: string; importance: 1-5 }[]', required: true, description: 'Page elements with importance ranking' },
      { name: 'pageType', type: 'string', required: true, description: 'Page type for hierarchy pattern selection' },
    ],
    expectedOutputs: [
      { name: 'hierarchy', type: 'HierarchicalLayout', description: 'Suggested layout with relative sizing/spacing' },
      { name: 'focalPoint', type: 'string', description: 'ID of the primary focal element' },
    ],
    executionSteps: [
      { order: 1, action: 'Rank elements', detail: 'Assign importance 1-5 based on user task priority' },
      { order: 2, action: 'Determine focal point', detail: 'Element with importance 1 is the primary focal point' },
      { order: 3, action: 'Apply scale', detail: 'More important elements get larger typography and more space' },
      { order: 4, action: 'Apply contrast', detail: 'Primary actions get highest color/value contrast' },
      { order: 5, action: 'Apply spacing', detail: 'Group related elements; separate unrelated ones with whitespace' },
    ],
    acceptanceCriteria: [
      'Primary CTA has highest visual weight (size + contrast + position)',
      'No more than 3 competing focal points per viewport',
      'Spacing increases with importance level',
      'Reading order matches visual hierarchy (F-pattern or Z-pattern)',
    ],
    commonFailures: [
      'Making everything equally prominent (no hierarchy)',
      'Using 4+ font sizes without a type scale',
      'Ignoring whitespace as a hierarchy tool',
      'Placing CTA below the fold without visual cue',
    ],
    qualityChecklist: [
      'Single primary focal point',
      'Type scale defined (max 5-6 sizes)',
      'Whitespace proportional to importance',
      'CTA visually dominant',
    ],
    references: [
      { title: 'Visual Hierarchy on the Web', source: 'Nielsen Norman Group', url: 'https://www.nngroup.com/articles/visual-hierarchy-ux-definition/' },
      { title: 'F-Pattern Reading', source: 'Nielsen Norman Group', url: 'https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/' },
    ],
    industryStandards: ['Nielsen Norman Group Guidelines', 'Gestalt Principles'],
    compatibility: { platformVersion: '1.0.0', engineDependencies: ['experience'], skillDependencies: [], conflictingSkills: [], frameworks: ['react', 'nextjs', 'vue', 'flutter'] },
  },

  // ═══════════════════════════════════════════
  // Testing (OWASP / Industry — B grade)
  // ═══════════════════════════════════════════

  {
    id: 'boundary-import-isolation-test',
    name: 'Engine Boundary Import Isolation Test',
    category: 'Testing',
    version: '1.0.0',
    evidenceSources: ['Martin Fowler', 'Eric Evans DDD'],
    evidenceLevel: 'B',
    evidenceUrl: 'https://martinfowler.com/articles/microservice-testing/',
    purpose: 'Verify engines never import directly from other engines — only via Host Interface',
    problemSolved: 'Tight coupling between engines creates monolith behavior and prevents independent deployment',
    whenToUse: 'In CI pipeline for every engine, on every commit',
    whenNotToUse: 'For core-sdk internal imports (core-sdk is the shared kernel)',
    requiredInputs: [
      { name: 'engineDir', type: 'string', required: true, description: 'Path to engine src/ directory' },
    ],
    expectedOutputs: [
      { name: 'violations', type: 'string[]', description: 'List of illegal imports found (empty if clean)' },
      { name: 'passed', type: 'boolean', description: 'True if no violations' },
    ],
    executionSteps: [
      { order: 1, action: 'Walk source tree', detail: 'Recursively find all .ts files under engineDir' },
      { order: 2, action: 'Scan imports', detail: 'Regex for: from \'@platform/engine-*\' pattern' },
      { order: 3, action: 'Collect violations', detail: 'Record file path + import statement for each match' },
      { order: 4, action: 'Report', detail: 'Return violations list and pass/fail status' },
    ],
    acceptanceCriteria: [
      'Zero imports matching @platform/engine-* in any engine source file',
      '@platform/core-sdk imports are allowed (shared kernel)',
      'Relative imports within same engine are allowed',
    ],
    commonFailures: [
      'Engine importing another engine\'s types directly',
      'Importing from a barrel file that re-exports engine types',
      'Using relative paths to escape engine boundary',
    ],
    qualityChecklist: [
      'All source files scanned',
      'Only @platform/core-sdk allowed as external import',
      'CI fails on any violation',
    ],
    references: [
      { title: 'Microservices Testing', source: 'Martin Fowler', url: 'https://martinfowler.com/articles/microservice-testing/' },
      { title: 'DDD Bounded Contexts', source: 'Eric Evans DDD', url: 'https://www.domainlanguage.com/ddd/' },
    ],
    industryStandards: ['DDD Bounded Context Pattern', 'Microservice Testing Pyramid'],
    compatibility: { platformVersion: '1.0.0', engineDependencies: [], skillDependencies: [], conflictingSkills: [], frameworks: ['nextjs', 'react', 'vue', 'flutter'] },
  },

];