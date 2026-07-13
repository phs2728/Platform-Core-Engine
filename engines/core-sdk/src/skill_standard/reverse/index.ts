/**
 * skill_standard/reverse/index.ts — Reverse Engineering System
 *
 * The Platform learns from world-class websites.
 * Collect → Analyze → Extract → Normalize → Evidence → Pattern → Skill → Knowledge Base
 *
 * NEVER copy designs. Extract Design DNA.
 */

import type { SkillCertification, EvidenceSource } from '../index.js';

// ═══════════════════════════════════════════
// Input Sources
// ═══════════════════════════════════════════

export type ReverseEngineeringInputType =
  | 'website' | 'figma' | 'html' | 'css' | 'component-tree'
  | 'screenshot' | 'video' | 'design-system' | 'research-report'
  | 'competitor-website' | 'customer-website';

export interface ReverseEngineeringInput {
  readonly id: string;
  readonly type: ReverseEngineeringInputType;
  readonly source: string;                   // URL, file path, or identifier
  readonly sourceName?: string | undefined;  // e.g., "Apple.com", "Stripe.com"
  readonly capturedAt?: string | undefined;
  readonly metadata?: Record<string, unknown> | undefined;
}

// ═══════════════════════════════════════════
// Design DNA (extracted patterns — NOT copies)
// ═══════════════════════════════════════════

export type DesignDNAType =
  | 'WhitespaceStrategy' | 'TypographyRhythm' | 'VisualHierarchy'
  | 'InformationDensity' | 'CTAPlacement' | 'TrustPlacement'
  | 'NavigationPattern' | 'PhotoDirection' | 'AnimationTiming'
  | 'InteractionPattern' | 'ColorSystem' | 'GridSystem'
  | 'ScrollBehavior' | 'MicroInteraction' | 'LoadingStrategy';

export interface DesignDNA {
  readonly id: string;
  readonly type: DesignDNAType;
  readonly source: string;                   // extracted from which source
  readonly pattern: string;                  // normalized description
  readonly evidence: string;                 // measurement/observation
  readonly confidence: number;               // 0-1
  readonly extractable: boolean;             // can this be turned into a Skill?
}

// ═══════════════════════════════════════════
// Reverse Engineering Pipeline
// ═══════════════════════════════════════════

export type PipelineStage =
  | 'Collect' | 'Analyze' | 'Extract' | 'Normalize'
  | 'Evidence' | 'Pattern' | 'Skill' | 'SkillPack'
  | 'Playbook' | 'KnowledgeBase' | 'AgencyOS';

export const PIPELINE_STAGES: PipelineStage[] = [
  'Collect', 'Analyze', 'Extract', 'Normalize',
  'Evidence', 'Pattern', 'Skill', 'SkillPack',
  'Playbook', 'KnowledgeBase', 'AgencyOS',
];

export interface PipelineResult {
  readonly inputId: string;
  readonly stages: { stage: PipelineStage; status: 'pending' | 'running' | 'completed' | 'failed'; output?: string | undefined }[];
  readonly extractedDNA: DesignDNA[];
  readonly patternsFound: number;
  readonly skillsGenerated: number;
  readonly knowledgeEntries: number;
  readonly completedAt: string;
}

// ═══════════════════════════════════════════
// Production Proven Registry
// ═══════════════════════════════════════════

export interface ProductionProvenReference {
  readonly id: string;
  readonly name: string;                     // e.g., "Apple", "Stripe"
  readonly url: string;
  readonly industry: string;
  readonly dnaExtracted: DesignDNAType[];
  readonly evidenceLevel: 'Production Proven';
  readonly notes: string;
}

export const PRODUCTION_PROVEN_REGISTRY: ProductionProvenReference[] = [
  { id: 'ref-apple', name: 'Apple', url: 'https://apple.com', industry: 'Technology', dnaExtracted: ['WhitespaceStrategy', 'TypographyRhythm', 'VisualHierarchy', 'AnimationTiming', 'ColorSystem'], evidenceLevel: 'Production Proven', notes: 'Industry benchmark for minimal premium design' },
  { id: 'ref-stripe', name: 'Stripe', url: 'https://stripe.com', industry: 'Fintech', dnaExtracted: ['VisualHierarchy', 'CTAPlacement', 'ColorSystem', 'AnimationTiming', 'InteractionPattern'], evidenceLevel: 'Production Proven', notes: 'Best-in-class SaaS design — gradient backgrounds, code samples' },
  { id: 'ref-airbnb', name: 'Airbnb', url: 'https://airbnb.com', industry: 'Hospitality', dnaExtracted: ['PhotoDirection', 'TrustPlacement', 'NavigationPattern', 'CTAPlacement', 'GridSystem'], evidenceLevel: 'Production Proven', notes: 'Trust-first marketplace UX' },
  { id: 'ref-booking', name: 'Booking.com', url: 'https://booking.com', industry: 'Hospitality', dnaExtracted: ['CTAPlacement', 'TrustPlacement', 'InformationDensity', 'ConversionStrategy' as DesignDNAType], evidenceLevel: 'Production Proven', notes: 'Conversion optimization benchmark' },
  { id: 'ref-amazon', name: 'Amazon', url: 'https://amazon.com', industry: 'Marketplace', dnaExtracted: ['InformationDensity', 'CTAPlacement', 'TrustPlacement', 'NavigationPattern'], evidenceLevel: 'Production Proven', notes: 'E-commerce conversion leader' },
  { id: 'ref-shopify', name: 'Shopify', url: 'https://shopify.com', industry: 'SaaS', dnaExtracted: ['VisualHierarchy', 'CTAPlacement', 'ColorSystem', 'TrustPlacement'], evidenceLevel: 'Production Proven', notes: 'Polaris design system — enterprise e-commerce' },
  { id: 'ref-linear', name: 'Linear', url: 'https://linear.app', industry: 'SaaS', dnaExtracted: ['TypographyRhythm', 'ColorSystem', 'AnimationTiming', 'MicroInteraction', 'LoadingStrategy'], evidenceLevel: 'Production Proven', notes: 'Modern SaaS design benchmark — dark mode, motion' },
  { id: 'ref-notion', name: 'Notion', url: 'https://notion.so', industry: 'SaaS', dnaExtracted: ['WhitespaceStrategy', 'TypographyRhythm', 'GridSystem', 'InformationDensity'], evidenceLevel: 'Production Proven', notes: 'Content-first minimal design' },
  { id: 'ref-figma', name: 'Figma', url: 'https://figma.com', industry: 'SaaS', dnaExtracted: ['ColorSystem', 'InteractionPattern', 'GridSystem', 'MicroInteraction'], evidenceLevel: 'Production Proven', notes: 'Design tool industry standard' },
  { id: 'ref-aman', name: 'Aman Resorts', url: 'https://aman.com', industry: 'Hospitality', dnaExtracted: ['WhitespaceStrategy', 'PhotoDirection', 'TypographyRhythm', 'AnimationTiming', 'LoadingStrategy'], evidenceLevel: 'Production Proven', notes: 'Ultra-luxury hospitality design DNA — extreme whitespace, full-bleed photography' },
  { id: 'ref-fourseasons', name: 'Four Seasons', url: 'https://fourseasons.com', industry: 'Hospitality', dnaExtracted: ['PhotoDirection', 'TrustPlacement', 'NavigationPattern', 'WhitespaceStrategy'], evidenceLevel: 'Production Proven', notes: 'Luxury hotel benchmark' },
  { id: 'ref-marriott', name: 'Marriott', url: 'https://marriott.com', industry: 'Hospitality', dnaExtracted: ['NavigationPattern', 'TrustPlacement', 'CTAPlacement', 'GridSystem'], evidenceLevel: 'Production Proven', notes: 'Large-scale hotel chain UX' },
  { id: 'ref-tesla', name: 'Tesla', url: 'https://tesla.com', industry: 'Automotive', dnaExtracted: ['WhitespaceStrategy', 'VisualHierarchy', 'CTAPlacement', 'AnimationTiming'], evidenceLevel: 'Production Proven', notes: 'Minimal product showcase' },
  { id: 'ref-openai', name: 'OpenAI', url: 'https://openai.com', industry: 'AI', dnaExtracted: ['WhitespaceStrategy', 'TypographyRhythm', 'ColorSystem'], evidenceLevel: 'Production Proven', notes: 'AI company design standard' },
  { id: 'ref-anthropic', name: 'Anthropic', url: 'https://anthropic.com', industry: 'AI', dnaExtracted: ['WhitespaceStrategy', 'TypographyRhythm', 'ColorSystem', 'TrustPlacement'], evidenceLevel: 'Production Proven', notes: 'AI safety-first design' },
  { id: 'ref-github', name: 'GitHub', url: 'https://github.com', industry: 'Technology', dnaExtracted: ['NavigationPattern', 'GridSystem', 'InformationDensity', 'InteractionPattern'], evidenceLevel: 'Production Proven', notes: 'Developer platform UX benchmark' },
  { id: 'ref-vercel', name: 'Vercel', url: 'https://vercel.com', industry: 'Technology', dnaExtracted: ['AnimationTiming', 'ColorSystem', 'TypographyRhythm', 'LoadingStrategy'], evidenceLevel: 'Production Proven', notes: 'Next.js creator — frontend performance benchmark' },
];

// ═══════════════════════════════════════════
// Reverse Engineering Mock Pipeline
// ═══════════════════════════════════════════

/**
 * Simulates the reverse engineering pipeline for a given input.
 * In production, each stage would invoke specialized analysis tools.
 */
export function runReverseEngineeringPipeline(input: ReverseEngineeringInput): PipelineResult {
  const stages = PIPELINE_STAGES.map(stage => ({
    stage,
    status: 'completed' as 'completed',
    output: `${stage} completed for ${input.sourceName ?? input.source}`,
  }));

  // Generate mock DNA based on input type
  const dnaTypes: DesignDNAType[] = input.type === 'website'
    ? ['WhitespaceStrategy', 'TypographyRhythm', 'VisualHierarchy', 'CTAPlacement', 'PhotoDirection']
    : ['ColorSystem', 'GridSystem', 'TypographyRhythm'];

  const extractedDNA: DesignDNA[] = dnaTypes.map((type, idx) => ({
    id: `dna-${input.id}-${idx}`,
    type,
    source: input.sourceName ?? input.source,
    pattern: `${type} pattern extracted from ${input.sourceName ?? input.source}`,
    evidence: `Measured via automated analysis — ${type} ratio/spacing observed`,
    confidence: 0.7 + Math.random() * 0.25,
    extractable: true,
  }));

  return {
    inputId: input.id,
    stages,
    extractedDNA,
    patternsFound: extractedDNA.length,
    skillsGenerated: extractedDNA.filter(d => d.extractable && d.confidence > 0.75).length,
    knowledgeEntries: extractedDNA.length,
    completedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════
// Evidence Classification (8 levels)
// ═══════════════════════════════════════════

export type EvidenceClassification =
  | 'Industry Standard' | 'Enterprise Proven' | 'Production Proven'
  | 'Research Proven' | 'Community Proven' | 'Experimental'
  | 'Deprecated' | 'Rejected';

export const EVIDENCE_CLASSIFICATION_ORDER: EvidenceClassification[] = [
  'Industry Standard', 'Enterprise Proven', 'Production Proven',
  'Research Proven', 'Community Proven', 'Experimental',
  'Deprecated', 'Rejected',
];

export function evidenceClassificationToCertification(cls: EvidenceClassification): SkillCertification {
  switch (cls) {
    case 'Industry Standard': return 'A';
    case 'Enterprise Proven': return 'B';
    case 'Production Proven': return 'B';
    case 'Research Proven': return 'B';
    case 'Community Proven': return 'C';
    case 'Experimental': return 'D';
    case 'Deprecated': return 'D';
    case 'Rejected': return 'D';
  }
}