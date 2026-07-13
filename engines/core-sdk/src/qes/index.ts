/**
 * qes/index.ts — Quality Execution Standard v1
 *
 * 사장님 확립 2026-07-13:
 * "Playbook defines WHAT. QES defines HOW WELL."
 * QES is the universal execution quality contract that every AI must satisfy.
 *
 * Never output scores. Only PASS / WARNING / FAIL.
 * Every WARNING must generate improvement tasks.
 */

// ═══════════════════════════════════════════
// Part 1: Execution Levels (7)
// ═══════════════════════════════════════════

export type ExecutionLevel =
  | 'Bronze' | 'Silver' | 'Gold' | 'Premium'
  | 'Agency Grade' | 'Enterprise Grade' | 'World Class';

export const EXECUTION_LEVEL_ORDER: ExecutionLevel[] = [
  'Bronze', 'Silver', 'Gold', 'Premium',
  'Agency Grade', 'Enterprise Grade', 'World Class',
];

export function levelRank(level: ExecutionLevel): number {
  return EXECUTION_LEVEL_ORDER.indexOf(level);
}

export function meetsMinimumLevel(actual: ExecutionLevel, required: ExecutionLevel): boolean {
  return levelRank(actual) >= levelRank(required);
}

// ═══════════════════════════════════════════
// Part 2: Universal Quality Categories (20)
// ═══════════════════════════════════════════

export type QualityCategory =
  | 'Layout' | 'Typography' | 'Whitespace' | 'Visual Hierarchy'
  | 'Information Architecture' | 'Navigation' | 'Interaction'
  | 'Accessibility' | 'SEO' | 'Performance' | 'Motion' | 'Responsiveness'
  | 'Copywriting' | 'Trust Evidence' | 'Customer Psychology'
  | 'Conversion' | 'Consistency' | 'Brand Expression'
  | 'Detail Completeness' | 'Production Readiness';

export const ALL_QUALITY_CATEGORIES: QualityCategory[] = [
  'Layout', 'Typography', 'Whitespace', 'Visual Hierarchy',
  'Information Architecture', 'Navigation', 'Interaction',
  'Accessibility', 'SEO', 'Performance', 'Motion', 'Responsiveness',
  'Copywriting', 'Trust Evidence', 'Customer Psychology',
  'Conversion', 'Consistency', 'Brand Expression',
  'Detail Completeness', 'Production Readiness',
];

// ═══════════════════════════════════════════
// Verdict (PASS / WARNING / FAIL — never scores)
// ═══════════════════════════════════════════

export type QESVerdict = 'PASS' | 'WARNING' | 'FAIL';

export interface CategoryAssessment {
  readonly category: QualityCategory;
  readonly verdict: QESVerdict;
  readonly evidence: string;                  // why this verdict
  readonly improvementTasks: string[];         // empty if PASS
}

export interface PageAssessment {
  readonly pageType: string;
  readonly overallVerdict: QESVerdict;
  readonly categoryAssessments: CategoryAssessment[];
  readonly reviewResults: ProfessionalReview[];
  readonly aiSmellFindings: AISmellFinding[];
  readonly goldenReferenceComparison: GoldenReferenceResult[];
  readonly executionLevel: ExecutionLevel;
  readonly improvementTasks: string[];
  readonly assessedAt: string;
}

// ═══════════════════════════════════════════
// Part 3: Page Quality Matrix (18 page types)
// ═══════════════════════════════════════════

export type PageType =
  | 'Homepage' | 'Landing Page' | 'Detail Page' | 'Product Detail'
  | 'Restaurant Menu' | 'Hotel Room' | 'Tour Detail' | 'Checkout'
  | 'Booking' | 'Pricing' | 'FAQ' | 'About' | 'Gallery'
  | 'Search' | 'Blog' | 'Contact' | 'Community' | 'AI Chat';

export interface PageQualityStandard {
  readonly pageType: PageType;
  readonly requiredSections: string[];
  readonly requiredInformation: string[];
  readonly trustRequirements: string[];
  readonly ctaRules: string[];
  readonly photoRules: string[];
  readonly videoRules: string[];
  readonly copyRules: string[];
  readonly animationRules: string[];
  readonly responsiveRules: string[];
  readonly accessibilityRules: string[];
  readonly seoRules: string[];
  readonly minimumLevel: ExecutionLevel;
}

export const PAGE_QUALITY_MATRIX: Record<string, PageQualityStandard> = {
  Homepage: {
    pageType: 'Homepage',
    requiredSections: ['Hero', 'Value Proposition', 'Social Proof', 'Primary CTA', 'Navigation', 'Footer'],
    requiredInformation: ['Brand name', 'Core service', 'Primary benefit', 'Trust signal'],
    trustRequirements: ['≥1 social proof element above fold', 'Reviews or testimonials visible'],
    ctaRules: ['Single primary CTA above fold', 'CTA uses action verb', 'CTA high contrast'],
    photoRules: ['Hero uses real photography (not illustration)', 'No stock photo faces'],
    videoRules: ['Hero video autoplays muted', 'Video has poster fallback'],
    copyRules: ['Headline ≤ 10 words', 'No jargon', 'Answers "what do you do?" in 3 seconds'],
    animationRules: ['Entrance ≤ 500ms', 'No random decorations', 'respect prefers-reduced-motion'],
    responsiveRules: ['Mobile-first', 'Touch targets ≥ 44px', 'No horizontal scroll'],
    accessibilityRules: ['WCAG AAA contrast', 'All images have alt text', 'Keyboard navigable'],
    seoRules: ['Title tag present', 'Meta description', 'JSON-LD Organization'],
    minimumLevel: 'Premium',
  },
  'Landing Page': {
    pageType: 'Landing Page',
    requiredSections: ['Hero', 'Benefits', 'Social Proof', 'Features', 'FAQ', 'CTA', 'Footer'],
    requiredInformation: ['Offer', 'Benefit', 'Proof', 'Price (if applicable)', 'Guarantee'],
    trustRequirements: ['Customer logos', 'Testimonials with name+photo', 'Guarantee/risk reversal'],
    ctaRules: ['CTA repeated every 2-3 sections', 'Sticky CTA on mobile', 'CTA action verb'],
    photoRules: ['Product in use', 'Real customer photos'],
    videoRules: ['Optional explainer video ≤ 60s'],
    copyRules: ['Benefit-first (not feature-first)', 'Scannable headings', 'No lorem ipsum'],
    animationRules: ['Scroll-triggered reveals', 'Stagger ≤ 100ms between items'],
    responsiveRules: ['Single column mobile', 'Sticky CTA bar'],
    accessibilityRules: ['WCAG AAA', 'Form labels associated', 'Error messages announced'],
    seoRules: ['Canonical URL', 'Noindex if temporary'],
    minimumLevel: 'Premium',
  },
  'Hotel Room': {
    pageType: 'Hotel Room',
    requiredSections: ['Gallery', 'Room Details', 'Amenities', 'Policies', 'Availability', 'Reviews', 'Price + Book'],
    requiredInformation: ['Room size', 'Bed type', 'View', 'Max occupancy', 'Price/night', 'Cancellation policy'],
    trustRequirements: ['Real room photos', 'Guest reviews', 'Official badge', 'Best price guarantee'],
    ctaRules: ['Book Now prominent', 'Price visible near CTA'],
    photoRules: ['≥5 room photos (bed, bathroom, view, amenities)', 'No renders — real photos only'],
    videoRules: ['Optional 360° or walkthrough'],
    copyRules: ['Specific measurements', 'No vague claims'],
    animationRules: ['Gallery smooth scroll', 'No decorative motion'],
    responsiveRules: ['Gallery swipeable on mobile', 'Booking form usable one-handed'],
    accessibilityRules: ['Gallery keyboard navigable', 'Price announced by screen reader'],
    seoRules: ['JSON-LD Hotel/Room schema', 'BreadcrumbList'],
    minimumLevel: 'Agency Grade',
  },
  FAQ: {
    pageType: 'FAQ',
    requiredSections: ['FAQ Categories', 'Search', 'Contact Fallback'],
    requiredInformation: ['Answers to top objections', 'Pricing clarity', 'Cancellation/refund'],
    trustRequirements: ['Direct honest answers', 'No deflection'],
    ctaRules: ['Contact CTA after last FAQ', 'Booking CTA if relevant'],
    photoRules: ['Minimal — FAQ is information-focused'],
    videoRules: ['Optional video answers for complex questions'],
    copyRules: ['Answers ≤ 3 sentences', 'Q as customer would ask', 'No corporate speak'],
    animationRules: ['Accordion expand smooth', 'No decorative motion'],
    responsiveRules: ['Full-width on mobile', 'Search bar visible'],
    accessibilityRules: ['Accordion ARIA expanded/collapsed', 'Search has label'],
    seoRules: ['JSON-LD FAQPage schema', 'Internal links to relevant pages'],
    minimumLevel: 'Gold',
  },
  About: {
    pageType: 'About',
    requiredSections: ['Story', 'Team/Founder', 'Mission/Values', 'Trust Evidence', 'CTA'],
    requiredInformation: ['Who founded it', 'Why it exists', 'Team credentials', 'Years of operation'],
    trustRequirements: ['Real team photos', 'Founder story', 'Credentials/certifications'],
    ctaRules: ['Contact or booking CTA at end'],
    photoRules: ['Real team/founder photos', 'No stock photos'],
    videoRules: ['Optional founder message video'],
    copyRules: ['Authentic voice', 'No corporate boilerplate', 'Answers "why trust you?"'],
    animationRules: ['Subtle scroll reveals', 'Team photo hover effects'],
    responsiveRules: ['Team grid stacks on mobile'],
    accessibilityRules: ['Team member names as alt text', 'WCAG AAA'],
    seoRules: ['JSON-LD Organization/AboutPage', 'Internal links'],
    minimumLevel: 'Gold',
  },
  Checkout: {
    pageType: 'Checkout',
    requiredSections: ['Order Summary', 'Payment Form', 'Trust Badges', 'Guest Checkout Option'],
    requiredInformation: ['Total price', 'Taxes/fees breakdown', 'Delivery estimate', 'Return policy'],
    trustRequirements: ['SSL badge', 'Payment security icons', 'Money-back guarantee'],
    ctaRules: ['Complete Order button clear', 'No distracting links'],
    photoRules: ['Product thumbnail in summary'],
    videoRules: [],
    copyRules: ['Reassuring microcopy', 'Error messages helpful'],
    animationRules: ['No decorative motion', 'Loading states for processing'],
    responsiveRules: ['Single column mobile', 'Thumb-friendly form'],
    accessibilityRules: ['All form fields labeled', 'Error announced', 'WCAG AAA'],
    seoRules: ['noindex'],
    minimumLevel: 'Enterprise Grade',
  },
};

// ═══════════════════════════════════════════
// Part 4: AI Smell Detection Rules
// ═══════════════════════════════════════════

export type AISmellType =
  | 'Generic Layout' | 'Repeated Cards' | 'Template Feeling'
  | 'Placeholder Copy' | 'Fake Luxury' | 'Random Animations'
  | 'Empty Whitespace' | 'Weak Hierarchy' | 'Missing Trust Evidence'
  | 'Poor CTA' | 'Weak Storytelling' | 'AI Gradient' | 'AI Icon Pattern';

export interface AISmellRule {
  readonly type: AISmellType;
  readonly description: string;
  readonly detectionHint: string;
  readonly severity: 'reject' | 'warning';
}

export const AI_SMELL_RULES: AISmellRule[] = [
  { type: 'Generic Layout', description: '3-column equal cards with no hierarchy', detectionHint: 'All sections same height/width/spacing', severity: 'reject' },
  { type: 'Repeated Cards', description: 'Same card repeated 4+ times with different content', detectionHint: 'Identical card structure with text swap', severity: 'reject' },
  { type: 'Template Feeling', description: 'Looks like a template, not custom design', detectionHint: 'Default spacing, no brand personality', severity: 'reject' },
  { type: 'Placeholder Copy', description: 'Lorem ipsum or generic filler', detectionHint: '"Lorem", " ipsum", " placeholder"', severity: 'reject' },
  { type: 'Fake Luxury', description: 'Gold gradient + serif = "luxury" without substance', detectionHint: 'Gradient gold on low-contrast background', severity: 'reject' },
  { type: 'Random Animations', description: 'Motion without purpose', detectionHint: 'Bouncing/floating elements with no interaction purpose', severity: 'warning' },
  { type: 'Empty Whitespace', description: 'Whitespace without purpose or rhythm', detectionHint: '>100vh gap between sections', severity: 'warning' },
  { type: 'Weak Hierarchy', description: 'No clear visual priority', detectionHint: 'All headings same size, no type scale', severity: 'reject' },
  { type: 'Missing Trust Evidence', description: 'No reviews, testimonials, or proof', detectionHint: 'Zero social proof elements on page', severity: 'reject' },
  { type: 'Poor CTA', description: 'CTA weak or missing', detectionHint: '"Submit" / "Click Here" / no action verb', severity: 'reject' },
  { type: 'Weak Storytelling', description: 'Information dump without narrative', detectionHint: 'Features listed without context/benefit', severity: 'warning' },
  { type: 'AI Gradient', description: 'Purple-blue-pink gradient (AI default)', detectionHint: '"purple", "blue", "pink" gradient backgrounds', severity: 'reject' },
  { type: 'AI Icon Pattern', description: 'Lucide/default icons in rounded squares', detectionHint: 'Same icon style in grid pattern', severity: 'warning' },
];

export interface AISmellFinding {
  readonly type: AISmellType;
  readonly severity: 'reject' | 'warning';
  readonly evidence: string;
  readonly recommendation: string;
}

/**
 * Detect AI smell in a page snapshot.
 */
export function detectAISmell(pageSnapshot: {
  sections: { type: string; layout?: string }[];
  copy?: string[];
  ctaText?: string;
  gradient?: string;
  iconPattern?: boolean;
  hasReviews?: boolean;
  hasTestimonials?: boolean;
}): AISmellFinding[] {
  const findings: AISmellFinding[] = [];

  // Generic Layout: 3+ sections with same layout
  const layoutCounts = new Map<string, number>();
  for (const s of pageSnapshot.sections) {
    if (s.layout) layoutCounts.set(s.layout, (layoutCounts.get(s.layout) ?? 0) + 1);
  }
  for (const [layout, count] of layoutCounts) {
    if (count >= 4) {
      findings.push({ type: 'Repeated Cards', severity: 'reject', evidence: `${count} sections with "${layout}" layout`, recommendation: 'Vary section layouts — use asymmetric, bento, or full-bleed patterns' });
    }
  }

  // Placeholder Copy
  if (pageSnapshot.copy) {
    const placeholder = pageSnapshot.copy.some(c => /lorem|ipsum|placeholder|dummy/i.test(c));
    if (placeholder) {
      findings.push({ type: 'Placeholder Copy', severity: 'reject', evidence: 'Placeholder text detected', recommendation: 'Replace with real, customer-specific copy' });
    }
  }

  // Poor CTA
  if (pageSnapshot.ctaText) {
    if (/submit|click here|learn more/i.test(pageSnapshot.ctaText)) {
      findings.push({ type: 'Poor CTA', severity: 'reject', evidence: `CTA "${pageSnapshot.ctaText}" is weak`, recommendation: 'Use action verb: Book Now, Get Started, Reserve' });
    }
  }

  // AI Gradient
  if (pageSnapshot.gradient && /purple|blue|pink/i.test(pageSnapshot.gradient)) {
    findings.push({ type: 'AI Gradient', severity: 'reject', evidence: `Gradient "${pageSnapshot.gradient}" matches AI default`, recommendation: 'Use brand-specific colors, avoid purple-blue-pink' });
  }

  // AI Icon Pattern
  if (pageSnapshot.iconPattern) {
    findings.push({ type: 'AI Icon Pattern', severity: 'warning', evidence: 'Same icon style in grid pattern', recommendation: 'Mix icon styles or use custom illustrations' });
  }

  // Missing Trust Evidence
  if (pageSnapshot.hasReviews === false && pageSnapshot.hasTestimonials === false) {
    findings.push({ type: 'Missing Trust Evidence', severity: 'reject', evidence: 'No reviews or testimonials found', recommendation: 'Add customer reviews, testimonials, or social proof' });
  }

  return findings;
}

// ═══════════════════════════════════════════
// Part 5: Golden Reference Comparison
// ═══════════════════════════════════════════

export interface GoldenReferenceResult {
  readonly referenceName: string;
  readonly comparisonCategory: QualityCategory;
  readonly verdict: QESVerdict;
  readonly gap: string;                        // what's missing vs reference
  readonly recommendation: string;
}

/**
 * Compare page execution quality against golden references.
 * NOT copying — only Execution Quality comparison.
 */
export function compareAgainstGoldenReference(input: {
  referenceName: string;
  category: QualityCategory;
  observedLevel: ExecutionLevel;
  referenceLevel: ExecutionLevel;
  gapDescription: string;
}): GoldenReferenceResult {
  const meets = meetsMinimumLevel(input.observedLevel, input.referenceLevel);
  const closeGap = levelRank(input.observedLevel) >= levelRank(input.referenceLevel) - 3;

  return {
    referenceName: input.referenceName,
    comparisonCategory: input.category,
    verdict: meets ? 'PASS' : closeGap ? 'WARNING' : 'FAIL',
    gap: input.gapDescription,
    recommendation: meets ? 'Execution quality matches reference' : `Upgrade from ${input.observedLevel} to ${input.referenceLevel}: ${input.gapDescription}`,
  };
}

// ═══════════════════════════════════════════
// Part 6: Professional Review Framework
// ═══════════════════════════════════════════

export type ReviewerRole =
  | 'Creative Director' | 'Art Director' | 'Senior UX Designer'
  | 'Senior UI Designer' | 'Senior Copywriter' | 'Accessibility Specialist'
  | 'SEO Lead' | 'Performance Engineer' | 'Conversion Specialist';

export const ALL_REVIEWER_ROLES: ReviewerRole[] = [
  'Creative Director', 'Art Director', 'Senior UX Designer',
  'Senior UI Designer', 'Senior Copywriter', 'Accessibility Specialist',
  'SEO Lead', 'Performance Engineer', 'Conversion Specialist',
];

export interface ProfessionalReview {
  readonly reviewer: ReviewerRole;
  readonly verdict: QESVerdict;
  readonly evidence: string;
  readonly improvementTasks: string[];
}

/**
 * Run full professional review on a page.
 * Each reviewer independently Approve/Warning/Reject with evidence.
 */
export function runProfessionalReview(input: {
  pageType: PageType;
  pageSnapshot: {
    hasVisualHierarchy?: boolean;
    hasAccessibilityAudit?: boolean;
    hasSEOSchema?: boolean;
    hasPerformanceBudget?: boolean;
    hasConversionStrategy?: boolean;
    hasBrandVoice?: boolean;
    hasTrustEvidence?: boolean;
    hasCopyReview?: boolean;
    hasInteractionDesign?: boolean;
  };
}): ProfessionalReview[] {
  const reviews: ProfessionalReview[] = [];

  const s = input.pageSnapshot;

  reviews.push({
    reviewer: 'Creative Director',
    verdict: s.hasBrandVoice ? 'PASS' : 'WARNING',
    evidence: s.hasBrandVoice ? 'Brand voice consistent' : 'Brand voice not clearly defined',
    improvementTasks: s.hasBrandVoice ? [] : ['Define brand voice guidelines', 'Review all copy for voice consistency'],
  });

  reviews.push({
    reviewer: 'Art Director',
    verdict: s.hasVisualHierarchy ? 'PASS' : 'FAIL',
    evidence: s.hasVisualHierarchy ? 'Clear visual hierarchy established' : 'No visual hierarchy detected',
    improvementTasks: s.hasVisualHierarchy ? [] : ['Establish type scale (max 5-6 sizes)', 'Create clear focal point per viewport'],
  });

  reviews.push({
    reviewer: 'Senior UX Designer',
    verdict: s.hasInteractionDesign ? 'PASS' : 'WARNING',
    evidence: s.hasInteractionDesign ? 'Interaction patterns defined' : 'Interaction patterns not specified',
    improvementTasks: s.hasInteractionDesign ? [] : ['Define hover/focus/active states', 'Map user flow for primary task'],
  });

  reviews.push({
    reviewer: 'Senior UI Designer',
    verdict: s.hasVisualHierarchy ? 'PASS' : 'WARNING',
    evidence: s.hasVisualHierarchy ? 'UI elements properly weighted' : 'UI elements lack visual differentiation',
    improvementTasks: s.hasVisualHierarchy ? [] : ['Differentiate primary/secondary buttons', 'Apply consistent spacing system'],
  });

  reviews.push({
    reviewer: 'Senior Copywriter',
    verdict: s.hasCopyReview ? 'PASS' : 'WARNING',
    evidence: s.hasCopyReview ? 'Copy reviewed for clarity and voice' : 'Copy not reviewed',
    improvementTasks: s.hasCopyReview ? [] : ['Review all headings for benefit-first language', 'Remove jargon'],
  });

  reviews.push({
    reviewer: 'Accessibility Specialist',
    verdict: s.hasAccessibilityAudit ? 'PASS' : 'FAIL',
    evidence: s.hasAccessibilityAudit ? 'WCAG AAA audit passed' : 'No accessibility audit found',
    improvementTasks: s.hasAccessibilityAudit ? [] : ['Run WCAG AAA audit', 'Fix color contrast', 'Add ARIA labels', 'Verify keyboard navigation'],
  });

  reviews.push({
    reviewer: 'SEO Lead',
    verdict: s.hasSEOSchema ? 'PASS' : 'WARNING',
    evidence: s.hasSEOSchema ? 'Structured data present' : 'Missing structured data',
    improvementTasks: s.hasSEOSchema ? [] : ['Add JSON-LD structured data', 'Verify meta tags', 'Create XML sitemap'],
  });

  reviews.push({
    reviewer: 'Performance Engineer',
    verdict: s.hasPerformanceBudget ? 'PASS' : 'WARNING',
    evidence: s.hasPerformanceBudget ? 'Performance budget defined' : 'No performance budget',
    improvementTasks: s.hasPerformanceBudget ? [] : ['Define Core Web Vitals targets', 'Optimize images (AVIF/WebP)', 'Minimize render-blocking resources'],
  });

  reviews.push({
    reviewer: 'Conversion Specialist',
    verdict: s.hasConversionStrategy ? 'PASS' : 'WARNING',
    evidence: s.hasConversionStrategy ? 'Conversion strategy defined' : 'No conversion strategy',
    improvementTasks: s.hasConversionStrategy ? [] : ['Define primary CTA per page', 'Map conversion funnel', 'Add trust evidence near CTA'],
  });

  return reviews;
}

// ═══════════════════════════════════════════
// Part 7: QES Assessment Engine
// ═══════════════════════════════════════════

/**
 * Aggregate verdicts — FAIL dominates, then WARNING, then PASS.
 */
export function aggregateVerdicts(verdicts: QESVerdict[]): QESVerdict {
  if (verdicts.some(v => v === 'FAIL')) return 'FAIL';
  if (verdicts.some(v => v === 'WARNING')) return 'WARNING';
  return 'PASS';
}

/**
 * Determine execution level from assessment results.
 */
export function determineExecutionLevel(input: {
  categoryVerdicts: Record<QualityCategory, QESVerdict>;
  reviewVerdicts: QESVerdict[];
  aiSmellFindings: AISmellFinding[];
  requiredLevel: ExecutionLevel;
}): { achieved: ExecutionLevel; passed: boolean } {
  // If any AI smell reject → cannot pass
  if (input.aiSmellFindings.some(f => f.severity === 'reject')) {
    return { achieved: 'Bronze', passed: false };
  }

  // If any FAIL in categories or reviews → Bronze
  const allVerdicts = [...Object.values(input.categoryVerdicts), ...input.reviewVerdicts];
  if (allVerdicts.some(v => v === 'FAIL')) {
    return { achieved: 'Bronze', passed: false };
  }

  // If any WARNING → cap at Gold (cannot reach Premium+)
  if (allVerdicts.some(v => v === 'WARNING')) {
    return { achieved: 'Gold', passed: meetsMinimumLevel('Gold', input.requiredLevel) };
  }

  // All PASS → meets required level
  return { achieved: input.requiredLevel, passed: true };
}

/**
 * Generate improvement tasks from all WARNINGs and FAILs.
 */
export function generateImprovementTasks(assessment: {
  categoryAssessments: CategoryAssessment[];
  reviewResults: ProfessionalReview[];
  aiSmellFindings: AISmellFinding[];
}): string[] {
  const tasks: string[] = [];

  for (const cat of assessment.categoryAssessments) {
    if (cat.verdict !== 'PASS') tasks.push(...cat.improvementTasks);
  }
  for (const review of assessment.reviewResults) {
    if (review.verdict !== 'PASS') tasks.push(...review.improvementTasks);
  }
  for (const smell of assessment.aiSmellFindings) {
    tasks.push(`[AI Smell — ${smell.type}] ${smell.recommendation}`);
  }

  return tasks;
}

// ═══════════════════════════════════════════
// Part 8: Continuous Improvement
// ═══════════════════════════════════════════

export interface QESUpdateEvent {
  readonly id: string;
  readonly type: 'rule_added' | 'rule_modified' | 'rule_deprecated'
    | 'level_adjusted' | 'category_added' | 'page_standard_added';
  readonly description: string;
  readonly evidence: string;                  // must be evidence-based
  readonly projectSource?: string | undefined;
  readonly timestamp: string;
}

export class QESContinuousImprovement {
  private events: QESUpdateEvent[] = [];

  proposeUpdate(event: QESUpdateEvent): void {
    // Only evidence-based improvements may modify QES
    if (!event.evidence || event.evidence.length < 10) {
      throw new Error('QES update requires evidence (minimum 10 chars)');
    }
    this.events.push(event);
  }

  history(): QESUpdateEvent[] { return [...this.events]; }

  count(): number { return this.events.length; }
}

// ═══════════════════════════════════════════
// Full Page Assessment
// ═══════════════════════════════════════════

export function assessPage(input: {
  pageType: PageType;
  pageSnapshot: {
    sections: { type: string; layout?: string }[];
    copy?: string[];
    ctaText?: string;
    gradient?: string;
    iconPattern?: boolean;
    hasReviews?: boolean;
    hasTestimonials?: boolean;
    hasVisualHierarchy?: boolean;
    hasAccessibilityAudit?: boolean;
    hasSEOSchema?: boolean;
    hasPerformanceBudget?: boolean;
    hasConversionStrategy?: boolean;
    hasBrandVoice?: boolean;
    hasCopyReview?: boolean;
    hasInteractionDesign?: boolean;
  };
  categoryChecks?: Partial<Record<QualityCategory, { verdict: QESVerdict; evidence: string; improvementTasks: string[] }>>;
  goldenReferences?: { referenceName: string; category: QualityCategory; observedLevel: ExecutionLevel; referenceLevel: ExecutionLevel; gapDescription: string }[];
}): PageAssessment {
  // AI Smell Detection
  const aiSmellFindings = detectAISmell(input.pageSnapshot);

  // Professional Review
  const reviewResults = runProfessionalReview({ pageType: input.pageType, pageSnapshot: input.pageSnapshot });

  // Category Assessments (from provided checks or derived from reviews)
  const categoryAssessments: CategoryAssessment[] = ALL_QUALITY_CATEGORIES.map(category => {
    const check = input.categoryChecks?.[category];
    if (check) return { category, ...check };
    // Derive from reviews
    const relevantReview = reviewResults.find(r => {
      if (category === 'Visual Hierarchy') return r.reviewer === 'Art Director';
      if (category === 'Accessibility') return r.reviewer === 'Accessibility Specialist';
      if (category === 'SEO') return r.reviewer === 'SEO Lead';
      if (category === 'Performance') return r.reviewer === 'Performance Engineer';
      if (category === 'Conversion') return r.reviewer === 'Conversion Specialist';
      if (category === 'Brand Expression') return r.reviewer === 'Creative Director';
      if (category === 'Copywriting') return r.reviewer === 'Senior Copywriter';
      if (category === 'Interaction') return r.reviewer === 'Senior UX Designer';
      return false;
    });
    if (relevantReview) {
      return { category, verdict: relevantReview.verdict, evidence: relevantReview.evidence, improvementTasks: relevantReview.improvementTasks };
    }
    return { category, verdict: 'PASS' as QESVerdict, evidence: 'Not explicitly assessed — no issues detected', improvementTasks: [] };
  });

  // Golden Reference Comparison
  const goldenReferenceComparison = (input.goldenReferences ?? []).map(ref =>
    compareAgainstGoldenReference(ref),
  );

  // Determine overall verdict
  const allVerdicts = [
    ...categoryAssessments.map(c => c.verdict),
    ...reviewResults.map(r => r.verdict),
  ];
  const overallVerdict = aggregateVerdicts(allVerdicts);

  // Determine execution level
  const standard = PAGE_QUALITY_MATRIX[input.pageType];
  const requiredLevel = standard?.minimumLevel ?? 'Premium';
  const categoryVerdictMap = Object.fromEntries(categoryAssessments.map(c => [c.category, c.verdict])) as Record<QualityCategory, QESVerdict>;
  const { achieved, passed } = determineExecutionLevel({
    categoryVerdicts: categoryVerdictMap,
    reviewVerdicts: reviewResults.map(r => r.verdict),
    aiSmellFindings,
    requiredLevel,
  });

  // Generate improvement tasks
  const improvementTasks = generateImprovementTasks({
    categoryAssessments, reviewResults, aiSmellFindings,
  });

  return {
    pageType: input.pageType,
    overallVerdict: passed ? overallVerdict : 'FAIL',
    categoryAssessments,
    reviewResults,
    aiSmellFindings,
    goldenReferenceComparison,
    executionLevel: achieved,
    improvementTasks,
    assessedAt: new Date().toISOString(),
  };
}