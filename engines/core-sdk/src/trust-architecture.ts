/**
 * Trust Architecture — Platform Vision v2
 *
 * 사장님 확립 2026-07-13
 * "AI는 점수를 매기는 것이 아니라, 고객이 회사를 신뢰하는 것을 설계한다."
 *
 * 점수 표시 금지 — Trust Evidence 배치 기반 설계
 */

// ═══════════════════════════════════════════
// Industry Trust Profile (산업별 신뢰 요소)
// ═══════════════════════════════════════════

export type IndustryType = 'Restaurant' | 'Hotel' | 'Travel' | 'Hospital' | 'SaaS' | 'Marketplace' | 'Generic';

export interface TrustEvidence {
  id: string;
  name: string;
  description: string;
  /** 이 Evidence가 영향을 주는 고객 불안 사항 */
  objectionAddressed: string[];
  /** Evidence가 자연스럽게 배치되는 page 타입 */
  naturalPages: string[];
  /** 우선순위 (1=가장 중요) */
  priority: number;
}

export interface IndustryTrustProfile {
  industry: IndustryType;
  description: string;
  /** 산업이 요구하는 핵심 Trust Evidence */
  requiredEvidence: TrustEvidence[];
  /** 산업에서 가장 효과적인 신뢰 신호 */
  topSignals: string[];
}

// ═══════════════════════════════════════════
// Trust Architecture (신뢰 아키텍처)
// ═══════════════════════════════════════════

export type TrustStage = 'Anxiety' | 'Discovery' | 'Evaluation' | 'Confidence' | 'Action';

export interface TrustJourney {
  id: string;
  tenantId: string;
  organizationId: string;
  industry: IndustryType;
  pageRef: string;
  /** 불안 → 신뢰 → 행동 단계별 evidence 배치 */
  stages: { stage: TrustStage; evidence: string; placement: string; rationale: string }[];
  /** 진행도 (0-100) — 내부 계산용, 표시 금지 */
  progressInternal: number;
  createdAt: string;
}

export interface ObjectionMap {
  id: string;
  tenantId: string;
  organizationId: string;
  industry: IndustryType;
  objections: { concern: string; severity: 'High' | 'Medium' | 'Low'; resolution: string; evidenceRef: string }[];
  createdAt: string;
}

export interface EvidencePlacement {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  slot: string;          // e.g., 'hero-secondary', 'about-section', 'review-block'
  evidenceRef: string;   // references TrustEvidence.id
  rationale: string;
  priority: number;      // 1-5
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface ConfidenceJourney {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  steps: { step: string; evidence: string; confidenceGain: number }[];
  totalConfidenceGain: number;
  createdAt: string;
}

export interface DecisionJourney {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  decisionSteps: { step: string; trigger: string; outcome: string }[];
  createdAt: string;
}

// ═══════════════════════════════════════════
// Trust Checklist (최종 검증)
// ═══════════════════════════════════════════

export type TrustChecklistItemStatus = 'Pass' | 'Fail' | 'Warning' | 'N/A';

export interface TrustChecklistItem {
  id: string;
  category: 'Evidence' | 'Content' | 'UX' | 'Accessibility' | 'Brand' | 'SocialProof';
  description: string;
  status: TrustChecklistItemStatus;
  evidenceRef?: string;
  notes?: string;
}

export interface TrustChecklist {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  items: TrustChecklistItem[];
  passedCount: number;
  failedCount: number;
  warningCount: number;
  /** internal score for analytics — UI 노출 금지 */
  internalHealthScore: number;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Trust Architecture Report (7대 산출물 1/7)
// ═══════════════════════════════════════════

export interface TrustArchitectureReport {
  id: string;
  tenantId: string;
  organizationId: string;
  industry: IndustryType;
  requiredEvidence: TrustEvidence[];
  coverage: { evidenceRef: string; placed: boolean; placementRef?: string }[];
  gaps: string[];
  recommendations: string[];
  createdAt: string;
}

// ═══════════════════════════════════════════
// Customer Psychology Report (7대 산출물 2/7)
// ═══════════════════════════════════════════

export interface CustomerPsychologyReport {
  id: string;
  tenantId: string;
  organizationId: string;
  industry: IndustryType;
  customerProfile: {
    demographics: string[];
    primaryMotivations: string[];
    primaryFears: string[];
    decisionTriggers: string[];
  };
  psychologyPathway: { stage: TrustStage; psychologicalState: string; designIntent: string }[];
  createdAt: string;
}

// ═══════════════════════════════════════════
// Evidence Placement Strategy (7대 산출물 3/7)
// ═══════════════════════════════════════════

export interface EvidencePlacementStrategy {
  id: string;
  tenantId: string;
  organizationId: string;
  pageRef: string;
  placements: { evidenceRef: string; slot: string; why: string; visualHint: string }[];
  priorityOrder: string[];
  createdAt: string;
}

// ═══════════════════════════════════════════
// Forbidden UI Patterns (v2 Vision Enforcement)
// ═══════════════════════════════════════════

/**
 * 점수 UI 패턴 (절대 표시 금지)
 * - Trust Score, Premium Score, Luxury Score, Company Score
 * - "95/100" 형태의 점수
 * - "AI Score"
 */
export const FORBIDDEN_UI_PATTERNS = [
  'Trust Score',
  'Premium Score',
  'Luxury Score',
  'Company Score',
  'Website Score',
  'AI Score',
  '/100',  // 95/100 패턴
  '점수',
] as const;

/**
 * 점수 표시 검증 — 이 함수가 true면 UI 표시 OK
 * false면 점수 표시가 UI에 노출됨 (V2 위반)
 */
export function validateTrustUIPattern(displayString: string): boolean {
  if (!displayString) return true;
  for (const pattern of FORBIDDEN_UI_PATTERNS) {
    if (displayString.toLowerCase().includes(pattern.toLowerCase())) {
      return false;
    }
  }
  return true;
}