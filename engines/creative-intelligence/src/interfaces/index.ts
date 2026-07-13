/**
 * Creative Intelligence Engine RC2 — Public Interfaces
 *
 * Sprint: Senior Art Director Upgrade
 * - Visual Review (First Impression / Premium / Luxury / Typography / etc.)
 * - Art Direction (8 styles)
 * - Photography / Motion / Interaction Direction
 * - AI Artifact Detection (9 categories)
 * - Design Critique + Recommendations
 * - Quality Gate (Approve/Reject)
 */
import type { Result, EventEnvelope } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Core Infra
// ═══════════════════════════════════════════

export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IEventBus { emit<T>(envelope: EventEnvelope<T>): Promise<void>; }

export interface IOrganizationVerifier {
  verify(tenantId: string, organizationId: string): Promise<boolean>;
}

// ═══════════════════════════════════════════
// Host Interfaces
// ═══════════════════════════════════════════

// Read-only: Creative Knowledge Engine (research)
export interface ICreativeKnowledgeReader {
  getCompetitorResearch(tenantId: string, industry: string): Promise<Result<CompetitorResearch, Error>>;
  getDesignTrends(tenantId: string, style: string): Promise<Result<DesignTrend, Error>>;
}

export interface CompetitorResearch {
  industry: string;
  topCompetitors: { name: string; strengths: string[]; weaknesses: string[] }[];
  marketStandards: { premiumLevel: number; trustSignals: string[] };
}

export interface DesignTrend {
  style: string;
  emergingPatterns: string[];
  colorTrends: string[];
  typographyTrends: string[];
}

// ═══════════════════════════════════════════
// Enums
// ═══════════════════════════════════════════

export type ArtDirectionStyle = 'Luxury' | 'Premium' | 'Editorial' | 'Boutique' | 'Corporate' | 'Minimal' | 'Modern' | 'Playful';
export type ArtDirectionStatus = 'Draft' | 'Active' | 'Archived';
export type ReviewStatus = 'Pending' | 'Approved' | 'Rejected' | 'ChangesRequested';
export type ReviewSeverity = 'Critical' | 'Major' | 'Minor' | 'Suggestion';
export type AIArtifactSeverity = 'Severe' | 'Moderate' | 'Mild' | 'None';

// ═══════════════════════════════════════════
// ART DIRECTION LAYER
// ═══════════════════════════════════════════

export interface ArtDirection {
  id: string;
  tenantId: string;
  organizationId: string;
  style: ArtDirectionStyle;
  name: string;
  description: string;
  rules: ArtDirectionRule[];
  motionPrinciples: string[];
  colorPrinciples: string[];
  typographyPrinciples: string[];
  layoutPrinciples: string[];
  status: ArtDirectionStatus;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ArtDirectionRule {
  category: 'motion' | 'color' | 'typography' | 'layout' | 'photography' | 'interaction';
  principle: string;
  rationale: string;
}

export interface VisualStory {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  emotion: string;
  story: string;
  trust: string;
  action: string;
  emotionalJourney: { stage: string; emotion: string; intensity: number }[];
  ctaPosition: 'early' | 'mid' | 'late';  // early = 감점
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface FirstImpression {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  trust: number;       // 0-100
  premium: number;     // 0-100
  brand: number;       // 0-100
  professional: number;// 0-100
  memorable: number;   // 0-100
  overall: number;     // average
  passed: boolean;     // ≥95 all 5?
  attributes: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// VISUAL REVIEW LAYER
// ═══════════════════════════════════════════

export interface VisualHierarchy {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  hierarchyScore: number;        // 0-100
  primaryFocus: string;
  secondaryFocus: string;
  tertiaryFocus: string;
  hasSingleHero: boolean;
  fPattern: boolean;
  zPattern: boolean;
  issues: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface Composition {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  compositionScore: number;
  ruleOfThirds: boolean;
  symmetry: 'symmetric' | 'asymmetric' | 'mixed';
  focalPointCount: number;
  whiteSpaceRatio: number;       // 0-1
  balance: number;                // 0-100
  issues: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface PhotographyDirection {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  mood: string;
  lighting: string;
  composition: string;
  people: string;
  environment: string;
  cameraAngle: string;
  depth: string;
  colorTemperature: 'warm' | 'cool' | 'neutral';
  negativeSpace: 'generous' | 'tight';
  directionScore: number;
  brandAlignment: number;
  issues: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface TypographyDirection {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  scale: 'display' | 'editorial' | 'balanced' | 'compact';
  contrast: 'bold' | 'regular' | 'light';
  weight: 300 | 400 | 500 | 600 | 700 | 800;
  lineHeight: 'tight' | 'standard' | 'loose';
  readingRhythm: 'editorial' | 'scannable' | 'mixed';
  headlineImpact: 'statement' | 'subtle';
  directionScore: number;
  scaleScore: number;
  rhythmScore: number;
  issues: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface WhitespaceStrategy {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  topFoldDensity: 'generous' | 'adequate' | 'dense' | 'cramped';
  scrollDensity: 'generous' | 'adequate' | 'dense';
  breathingRoom: number;        // 0-100
  rhythm: number;               // 0-100
  luxury: number;               // 0-100 (whitespace → luxury feeling)
  issues: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface GridSystem {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  columns: number;
  gutters: number;
  baseline: number;
  consistencyScore: number;
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface VisualRhythm {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  cadence: number;       // 0-100
  variation: number;     // 0-100 (good rhythm needs some variation)
  predictability: number; // 0-100
  issues: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface VisualConsistency {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  colorConsistency: number;
  typographyConsistency: number;
  spacingConsistency: number;
  componentConsistency: number;
  overall: number;
  issues: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// REVIEW & SCORE LAYER
// ═══════════════════════════════════════════

export interface PremiumReview {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  premiumFeeling: number;
  luxury: number;
  trust: number;
  visualHierarchy: number;
  whitespace: number;
  typography: number;
  photography: number;
  composition: number;
  microInteraction: number;
  consistency: number;
  overall: number;
  passed: boolean;
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface DesignCritique {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  tone: 'senior-art-director' | 'principal-designer' | 'creative-director';
  critiques: DesignCritiqueItem[];
  overallVerdict: string;
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface DesignCritiqueItem {
  severity: ReviewSeverity;
  category: string;
  observation: string;
  suggestion: string;
}

export interface DesignRecommendation {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  recommendations: DesignRecommendationItem[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface DesignRecommendationItem {
  category: 'photography' | 'layout' | 'motion' | 'cta' | 'hierarchy' | 'typography' | 'copy' | 'color';
  current: string;
  suggested: string;
  rationale: string;
}

export interface ConversionReview {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  aboveTheFoldCTA: boolean;  // true면 감점
  ctaVisibility: number;
  emotionalPath: number;
  friction: number;          // 0-100 (낮을수록 좋음)
  conversionScore: number;
  issues: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface EmotionalJourney {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  journey: { stage: string; emotion: string; intensity: number }[];
  flowScore: number;
  peaks: string[];
  valleys: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface InteractionReview {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  microInteractions: number;
  hoverQuality: number;
  feedbackQuality: number;
  delight: number;
  issues: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface MicroInteractionProfile {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  interactions: { trigger: string; response: string; duration: string; easing: string }[];
  consistency: number;
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface MotionDirection {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  intensity: 'none' | 'subtle' | 'moderate' | 'dynamic' | 'energetic';
  principles: string[];
  easings: string[];
  durations: string[];
  motionScore: number;
  attributes: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// AI ARTIFACT DETECTION
// ═══════════════════════════════════════════

export interface AIArtifactDetection {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  aiLayout: number;       // 0-100
  aiCopy: number;         // 0-100
  aiHero: number;
  aiCard: number;
  aiCTA: number;
  aiGradient: number;
  aiIconPattern: number;
  genericSection: number;
  templateFeeling: number;
  overallScore: number;   // 0-100 (lower = more AI smell)
  severity: AIArtifactSeverity;
  detectedPatterns: string[];
  recommendedAction: 'reject' | 'rewrite' | 'regenerate' | 'accept';
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface BrandEmotion {
  id: string;
  tenantId: string;
  organizationId: string;
  brandRef: string;
  primaryEmotion: string;
  secondaryEmotion: string;
  intensity: number;
  consistency: number;
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface BrandExpression {
  id: string;
  tenantId: string;
  organizationId: string;
  brandRef: string;
  voice: string;
  tone: string[];
  visualConsistency: number;
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface LuxuryScore {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  luxury: number;
  boutique: number;
  premium: number;
  editorial: number;
  emotional: number;
  minimal: number;
  modern: number;
  overall: number;
  attributes: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Quality Gate
// ═══════════════════════════════════════════

export interface CreativeApproval {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  status: ReviewStatus;
  failedGates: string[];
  passed: boolean;
  reviewerId: string;
  notes: string;
  attributes: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export type CreativeAuditEventType =
  | 'art_direction_created' | 'art_direction_activated'
  | 'first_impression_reviewed' | 'premium_reviewed' | 'luxury_reviewed'
  | 'visual_hierarchy_reviewed' | 'whitespace_reviewed' | 'typography_reviewed'
  | 'photography_reviewed' | 'composition_reviewed' | 'scroll_reviewed'
  | 'micro_interaction_reviewed' | 'visual_consistency_reviewed'
  | 'brand_expression_reviewed' | 'emotional_journey_reviewed' | 'conversion_reviewed'
  | 'ai_smell_detected' | 'design_critique_generated' | 'design_recommendation_generated'
  | 'creative_approved' | 'creative_rejected'
  | 'art_direction_report' | 'premium_report' | 'luxury_report' | 'three_second_report'
  | 'creative_review_report' | 'design_critique_report' | 'design_recommendation_report';

export interface CreativeAuditRecord {
  id: string;
  tenantId: string;
  organizationId: string;
  entityRef: string;
  actorId: string;
  correlationId: string;
  eventType: CreativeAuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Repository Contracts
// ═══════════════════════════════════════════

export interface IArtDirectionRepository {
  insert(a: ArtDirection): Promise<void>;
  findById(tenantId: string, id: string): Promise<ArtDirection | null>;
  findByStyle(tenantId: string, style: ArtDirectionStyle): Promise<ArtDirection | null>;
  findByOrganization(tenantId: string, orgId: string): Promise<ArtDirection[]>;
  update(tenantId: string, id: string, patch: Partial<ArtDirection>): Promise<void>;
}

export interface IVisualReviewRepository<T extends { id: string; tenantId: string; organizationId: string; pageRef: string }> {
  insert(entity: T): Promise<void>;
  findById(tenantId: string, id: string): Promise<T | null>;
  findByPage(tenantId: string, pageRef: string): Promise<T[]>;
}

export interface IPremiumReviewRepository {
  insert(p: PremiumReview): Promise<void>;
  findById(tenantId: string, id: string): Promise<PremiumReview | null>;
  findByPage(tenantId: string, pageRef: string): Promise<PremiumReview[]>;
}

export interface IDesignCritiqueRepository {
  insert(d: DesignCritique): Promise<void>;
  findById(tenantId: string, id: string): Promise<DesignCritique | null>;
  findByPage(tenantId: string, pageRef: string): Promise<DesignCritique[]>;
}

export interface IDesignRecommendationRepository {
  insert(d: DesignRecommendation): Promise<void>;
  findById(tenantId: string, id: string): Promise<DesignRecommendation | null>;
  findByPage(tenantId: string, pageRef: string): Promise<DesignRecommendation[]>;
}

export interface IAIArtifactDetectionRepository {
  insert(d: AIArtifactDetection): Promise<void>;
  findById(tenantId: string, id: string): Promise<AIArtifactDetection | null>;
  findByPage(tenantId: string, pageRef: string): Promise<AIArtifactDetection[]>;
}

export interface ILuxuryScoreRepository {
  insert(l: LuxuryScore): Promise<void>;
  findById(tenantId: string, id: string): Promise<LuxuryScore | null>;
  findByPage(tenantId: string, pageRef: string): Promise<LuxuryScore[]>;
}

export interface ICreativeApprovalRepository {
  insert(a: CreativeApproval): Promise<void>;
  findById(tenantId: string, id: string): Promise<CreativeApproval | null>;
  findByPage(tenantId: string, pageRef: string): Promise<CreativeApproval[]>;
  update(tenantId: string, id: string, patch: Partial<CreativeApproval>): Promise<void>;
}

export interface ICreativeAuditRepository {
  insert(record: Omit<CreativeAuditRecord, 'id' | 'createdAt'>): Promise<CreativeAuditRecord>;
  findByTenant(tenantId: string, limit?: number): Promise<CreativeAuditRecord[]>;
  findByOrganization(tenantId: string, orgId: string, limit?: number): Promise<CreativeAuditRecord[]>;
}

export { type Result, type EventEnvelope };