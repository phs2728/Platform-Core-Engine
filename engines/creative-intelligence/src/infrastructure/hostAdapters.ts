/**
 * Creative Intelligence RC2 — Host Adapters + Mock Creative Director
 *
 * Sprint: Senior Art Director Upgrade
 * - IOrganizationVerifier
 * - ICreativeKnowledgeReader (read-only)
 * - InMemoryEventBus
 *
 * The Mock Creative Director simulates AI-powered design review:
 * - Detects AI artifact patterns
 * - Scores Premium/Luxury based on style + heuristics
 * - Generates Design Critique with Senior Art Director tone
 */
import { Ok, type Result } from '@platform/core-sdk';
import type {
  IOrganizationVerifier, ICreativeKnowledgeReader,
  CompetitorResearch, DesignTrend, IndustryType, TrustEvidence, IndustryTrustProfile,
} from '../interfaces/index.js';

// ═══════════════════════════════════════════
// TRUST EVIDENCE LIBRARY (5 industries, Platform Vision v2)
// ═══════════════════════════════════════════

export const INDUSTRY_TRUST_PROFILES: Record<IndustryType, IndustryTrustProfile> = {
  Restaurant: {
    industry: 'Restaurant',
    description: '고객은 음식 사진, 셰프 정보, 매장 신뢰도를 본다',
    requiredEvidence: [
      { id: 'r-photos', name: '실제 음식 사진', description: '전문 촬영된 실제 음식 사진 (스톡 금지)', objectionAddressed: ['진짜 음식?', '주문 후失望?'], naturalPages: ['hero', 'menu', 'about'], priority: 1 },
      { id: 'r-chef', name: '셰프 소개', description: '셰프 경력, 철학, 얼굴', objectionAddressed: ['어느 셰프?'], naturalPages: ['about'], priority: 2 },
      { id: 'r-origin', name: '원산지', description: '식재료 원산지 표시', objectionAddressed: ['신선도?'], naturalPages: ['menu', 'about'], priority: 3 },
      { id: 'r-reviews', name: '리뷰', description: 'Google/CatchTable 등 외부 리뷰', objectionAddressed: ['다른 사람 후기?'], naturalPages: ['hero-secondary', 'footer'], priority: 1 },
      { id: 'r-reservation', name: '예약 시스템', description: '실시간 예약 가능', objectionAddressed: ['언제 가능한지?'], naturalPages: ['hero', 'footer'], priority: 1 },
      { id: 'r-open-today', name: '오늘 영업', description: '오늘 영업시간 표시', objectionAddressed: ['지금 영업?'], naturalPages: ['hero', 'header'], priority: 1 },
      { id: 'r-space', name: '매장 사진', description: '실제 매장 내부', objectionAddressed: ['분위기?'], naturalPages: ['about', 'gallery'], priority: 2 },
      { id: 'r-location', name: '위치/오시는 길', description: '지도, 주소, 교통편', objectionAddressed: ['어디?'], naturalPages: ['footer', 'contact'], priority: 2 },
    ],
    topSignals: ['food photos', 'chef face', 'live reservation', 'operating hours', 'reviews'],
  },
  Hotel: {
    industry: 'Hotel',
    description: '고객은 실제 객실, 투숙 후기, 운영 신뢰를 본다',
    requiredEvidence: [
      { id: 'h-rooms', name: '실제 객실', description: '실제 객실 사진 (여러 타입)', objectionAddressed: ['실제 객실?'], naturalPages: ['rooms', 'hero'], priority: 1 },
      { id: 'h-guests', name: '실제 투숙객', description: '실제 투숙 후기 (사진 포함)', objectionAddressed: ['진짜 후기?'], naturalPages: ['reviews', 'hero-secondary'], priority: 1 },
      { id: 'h-booking-reviews', name: 'Booking.com 리뷰', description: '외부 예약 사이트 후기', objectionAddressed: ['신뢰성?'], naturalPages: ['hero-secondary', 'reviews'], priority: 1 },
      { id: 'h-google', name: 'Google Reviews', description: 'Google 평점/리뷰', objectionAddressed: ['인정받는?'], naturalPages: ['footer', 'hero-secondary'], priority: 1 },
      { id: 'h-awards', name: 'Awards', description: '업계 수상 이력', objectionAddressed: ['품질 보증?'], naturalPages: ['about'], priority: 2 },
      { id: 'h-since', name: 'Since', description: '운영 시작 연도', objectionAddressed: ['오래됐나?'], naturalPages: ['about', 'footer'], priority: 2 },
      { id: 'h-24h', name: '24시간 운영', description: '24시간 프론트 데스크', objectionAddressed: ['늦은 체크인?'], naturalPages: ['rooms', 'footer'], priority: 2 },
      { id: 'h-best-price', name: 'Best Price Guarantee', description: '공식 사이트 최저가 보장', objectionAddressed: ['저렴?'], naturalPages: ['hero', 'rooms'], priority: 1 },
      { id: 'h-official', name: '공식 사이트', description: '공식 사이트 표시 (스팸/중개 사이트 구분)', objectionAddressed: ['진짜 사이트?'], naturalPages: ['header', 'footer'], priority: 1 },
    ],
    topSignals: ['real rooms', 'verified reviews', 'since year', '24h desk', 'best price guarantee'],
  },
  Travel: {
    industry: 'Travel',
    description: '고객은 현지 운영, 가이드, 투어 사진, 후기를 본다',
    requiredEvidence: [
      { id: 't-local', name: '현지 운영', description: '현지 사무소/운영자', objectionAddressed: ['중개만?'], naturalPages: ['about', 'footer'], priority: 1 },
      { id: 't-guide', name: '실제 가이드', description: '가이드 프로필, 사진, 언어', objectionAddressed: ['가이드?'], naturalPages: ['tours', 'about'], priority: 1 },
      { id: 't-tour-photos', name: '투어 사진', description: '실제 투어 사진 (고객 포함)', objectionAddressed: ['실제?'], naturalPages: ['tours', 'gallery'], priority: 1 },
      { id: 't-reviews', name: '후기', description: '고객 후기 (TripAdvisor/Google)', objectionAddressed: ['다른 사람?'], naturalPages: ['tours', 'hero-secondary'], priority: 1 },
      { id: 't-itinerary', name: '여행 일정', description: '구체적인 일자별 일정', objectionAddressed: ['뭐 하나?'], naturalPages: ['tours'], priority: 2 },
      { id: 't-office', name: '현지 사무소', description: '현지 사무소 위치/연락처', objectionAddressed: ['문제 생기면?'], naturalPages: ['footer', 'contact'], priority: 1 },
      { id: 't-emergency', name: '긴급 연락', description: '24시간 긴급 연락처', objectionAddressed: ['긴급시?'], naturalPages: ['footer', 'contact'], priority: 1 },
      { id: 't-partner', name: '파트너', description: '현지 파트너/공급자', objectionAddressed: ['믿을만?'], naturalPages: ['about'], priority: 2 },
    ],
    topSignals: ['local operation', 'real guide', 'tour photos', 'local office', '24h emergency'],
  },
  Hospital: {
    industry: 'Hospital',
    description: '고객은 의사, 학회, 경력, 장비, 인증을 본다',
    requiredEvidence: [
      { id: 'm-doctor', name: '의사 소개', description: '주치의 프로필, 전문과목, 사진', objectionAddressed: ['어느 의사?'], naturalPages: ['doctors', 'about'], priority: 1 },
      { id: 'm-society', name: '학회', description: '소속 학회, 위원회', objectionAddressed: ['전문성?'], naturalPages: ['doctors', 'about'], priority: 1 },
      { id: 'm-career', name: '경력', description: '연차, 주요 수술 이력', objectionAddressed: ['경험?'], naturalPages: ['doctors'], priority: 1 },
      { id: 'm-equipment', name: '장비', description: '의료 장비, 도입 연도', objectionAddressed: ['최신?'], naturalPages: ['facilities', 'about'], priority: 1 },
      { id: 'm-cert', name: '인증', description: 'JCI, 의료기관 인증', objectionAddressed: ['인증?'], naturalPages: ['about', 'footer'], priority: 1 },
      { id: 'm-count', name: '수술 건수', description: '연간 수술/시술 건수', objectionAddressed: ['실력?'], naturalPages: ['about', 'doctors'], priority: 2 },
      { id: 'm-reviews', name: '후기', description: '실제 환자 후기', objectionAddressed: ['다른 환자?'], naturalPages: ['hero-secondary', 'reviews'], priority: 2 },
    ],
    topSignals: ['doctor profile', 'society membership', 'certification', 'equipment', 'case count'],
  },
  SaaS: {
    industry: 'SaaS',
    description: '고객은 Enterprise 고객, Case Study, 인증, 보안을 본다',
    requiredEvidence: [
      { id: 's-enterprise', name: 'Enterprise 고객', description: '대기업 로고 (허가 받은)', objectionAddressed: ['신뢰성?'], naturalPages: ['hero-secondary', 'footer'], priority: 1 },
      { id: 's-case-study', name: 'Case Study', description: '구체적 성과 (정량 데이터)', objectionAddressed: ['효과?'], naturalPages: ['case-studies'], priority: 1 },
      { id: 's-soc2', name: 'SOC2', description: 'SOC 2 Type II 인증', objectionAddressed: ['보안?'], naturalPages: ['footer', 'security'], priority: 1 },
      { id: 's-iso', name: 'ISO 27001', description: 'ISO 27001 인증', objectionAddressed: ['보안?'], naturalPages: ['footer', 'security'], priority: 2 },
      { id: 's-uptime', name: '99.99% 가용성', description: 'SLA 99.99% 보장', objectionAddressed: ['다운?'], naturalPages: ['security', 'pricing'], priority: 1 },
      { id: 's-security', name: '보안', description: 'GDPR, HIPAA, 데이터 암호화', objectionAddressed: ['데이터?'], naturalPages: ['security'], priority: 1 },
      { id: 's-api', name: 'API', description: 'API 문서/SDK', objectionAddressed: ['연동?'], naturalPages: ['developers', 'docs'], priority: 2 },
      { id: 's-docs', name: 'Documentation', description: '상세한 기술 문서', objectionAddressed: ['사용?'], naturalPages: ['docs', 'developers'], priority: 2 },
    ],
    topSignals: ['enterprise logos', 'SOC2', '99.99% uptime', 'case study', 'API docs'],
  },
  Marketplace: {
    industry: 'Marketplace',
    description: '신뢰할 수 있는 seller, 안전한 결제, 분쟁 해결',
    requiredEvidence: [
      { id: 'mk-verified', name: 'Verified Sellers', description: '인증된 판매자 표시', objectionAddressed: ['가짜?'], naturalPages: ['listings'], priority: 1 },
      { id: 'mk-escrow', name: '안전 결제 (Escrow)', description: '에스크로 결제 보호', objectionAddressed: ['환불?'], naturalPages: ['footer', 'policy'], priority: 1 },
      { id: 'mk-dispute', name: '분쟁 해결', description: '분쟁 해결 정책', objectionAddressed: ['문제?'], naturalPages: ['policy', 'footer'], priority: 1 },
      { id: 'mk-reviews', name: '리뷰', description: '양방향 리뷰', objectionAddressed: ['다른 사람?'], naturalPages: ['listings', 'seller-profile'], priority: 1 },
    ],
    topSignals: ['verified seller', 'escrow payment', 'dispute resolution', 'reviews'],
  },
  Generic: {
    industry: 'Generic',
    description: '범용 신뢰 요소 (산업 미지정)',
    requiredEvidence: [
      { id: 'g-about', name: '회사 소개', description: '회사 정보, 연혁', objectionAddressed: ['어디 회사?'], naturalPages: ['about'], priority: 1 },
      { id: 'g-contact', name: '연락처', description: '실제 연락 가능한 정보', objectionAddressed: ['연락?'], naturalPages: ['footer', 'contact'], priority: 1 },
      { id: 'g-reviews', name: '리뷰/후기', description: '고객 후기', objectionAddressed: ['다른 사람?'], naturalPages: ['hero-secondary'], priority: 1 },
    ],
    topSignals: ['about', 'contact', 'reviews'],
  },
};

// ═══════════════════════════════════════════
// Original adapters
// ═══════════════════════════════════════════

// ── Organization Verifier ──
export class InMemoryOrganizationVerifier implements IOrganizationVerifier {
  private store = new Set<string>();
  add(t: string, o: string): void { this.store.add(`${t}::${o}`); }
  async verify(t: string, o: string): Promise<boolean> { return this.store.has(`${t}::${o}`); }
  clear(): void { this.store.clear(); }
}

// ── Creative Knowledge Reader (read-only) ──
export class MockCreativeKnowledgeReader implements ICreativeKnowledgeReader {
  private competitors = new Map<string, CompetitorResearch>();
  private trends = new Map<string, DesignTrend>();
  addCompetitor(industry: string, research: CompetitorResearch): void { this.competitors.set(industry, research); }
  addTrend(style: string, trend: DesignTrend): void { this.trends.set(style, trend); }
  clear(): void { this.competitors.clear(); this.trends.clear(); }
  async getCompetitorResearch(_t: string, industry: string): Promise<Result<CompetitorResearch, Error>> {
    const r = this.competitors.get(industry);
    if (r) return Ok(r);
    return Ok({
      industry,
      topCompetitors: [],
      marketStandards: { premiumLevel: 70, trustSignals: ['clear CTAs', 'professional photography'] },
    });
  }
  async getDesignTrends(_t: string, style: string): Promise<Result<DesignTrend, Error>> {
    const r = this.trends.get(style);
    if (r) return Ok(r);
    return Ok({
      style,
      emergingPatterns: [],
      colorTrends: [],
      typographyTrends: [],
    });
  }
}

// ── EventBus ──
export interface RecordedEnvelope<T = unknown> { envelope: import('@platform/core-sdk').EventEnvelope<T>; recordedAt: number; }
export class InMemoryEventBus {
  readonly emitted: RecordedEnvelope[] = [];
  async emit<T>(e: import('@platform/core-sdk').EventEnvelope<T>): Promise<void> {
    this.emitted.push({ envelope: e, recordedAt: Date.now() });
  }
  byType(t: string): RecordedEnvelope[] { return this.emitted.filter((r) => r.envelope.eventType === t); }
  countByType(t: string): number { return this.byType(t).length; }
  clear(): void { this.emitted.length = 0; }
}

// ── Mock Creative Director (Senior Art Director simulation) ──
// Deterministic scoring based on style + contentSnapshot heuristics
export class MockCreativeDirector {
  /** Senior Art Director tone — Premium score with style multiplier */
  scorePremium(style: string, contentSnapshot: Record<string, unknown> | undefined): {
    premiumFeeling: number; luxury: number; trust: number; visualHierarchy: number;
    whitespace: number; typography: number; photography: number; composition: number;
    microInteraction: number; consistency: number;
  } {
    const styleBoost = this.getStyleMultiplier(style);
    const base = 88;  // baseline premium score
    const hasLuxuryCues = this.detectLuxuryCues(contentSnapshot);
    const hasWhitespace = this.detectWhitespace(contentSnapshot);
    const hasPhotography = this.detectPhotography(contentSnapshot);
    return {
      premiumFeeling: Math.min(100, base + (hasLuxuryCues ? 8 : 0) + styleBoost),
      luxury: Math.min(100, base - 2 + (hasLuxuryCues ? 12 : 0) + styleBoost),
      trust: Math.min(100, base + 3 + (hasWhitespace ? 5 : 0)),
      visualHierarchy: Math.min(100, base + styleBoost),
      whitespace: Math.min(100, base + (hasWhitespace ? 10 : -5) + styleBoost),
      typography: Math.min(100, base + 4 + styleBoost),
      photography: Math.min(100, base + (hasPhotography ? 8 : -10) + styleBoost),
      composition: Math.min(100, base + styleBoost),
      microInteraction: Math.min(100, base + 2),
      consistency: Math.min(100, base + 5),
      // Corporate style = lower baseline
      ...(style === 'Corporate' ? {
        premiumFeeling: 80, luxury: 70, trust: 90, visualHierarchy: 85,
        whitespace: 80, typography: 80, photography: 75, composition: 82,
        microInteraction: 80, consistency: 88,
      } : {}),
    };
  }

  /** 3-Second First Impression scoring */
  scoreFirstImpression(contentSnapshot: Record<string, unknown> | undefined): {
    trust: number; premium: number; brand: number; professional: number; memorable: number;
  } {
    const hasHero = !!contentSnapshot?.['hero'];
    const hasPhotography = !!contentSnapshot?.['photography'];
    const hasNavigation = !!contentSnapshot?.['navigation'];
    return {
      trust: hasHero ? 96 : 78,
      premium: hasPhotography ? 96 : 75,
      brand: hasNavigation ? 95 : 80,
      professional: hasHero ? 96 : 82,
      memorable: hasPhotography ? 95 : 70,
    };
  }

  /** AI Artifact Detection (9 categories) */
  detectAIArtifacts(contentSnapshot: Record<string, unknown> | undefined): {
    aiLayout: number; aiCopy: number; aiHero: number; aiCard: number; aiCTA: number;
    aiGradient: number; aiIconPattern: number; genericSection: number; templateFeeling: number;
    detectedPatterns: string[];
  } {
    const detected: string[] = [];
    const cs = contentSnapshot ?? {};
    // Check for AI smell patterns
    if (typeof cs['heroTitle'] === 'string' && /unlock your potential|empower|transform/i.test(cs['heroTitle'])) {
      detected.push('AI Copy: cliché hero title');
    }
    if (cs['gradient'] === 'purple-blue') detected.push('AI Gradient: purple→blue');
    if (cs['cta'] === 'Get Started') detected.push('AI CTA: generic Get Started');
    if (cs['sections'] === 'Features-3x') detected.push('Generic Section: Features × 3');
    if (cs['heroImage'] === '3d-character') detected.push('AI Hero: 3D character');
    if (cs['cardStyle'] === 'glassmorphism') detected.push('AI Card: glassmorphism overuse');
    if (cs['icons'] === 'lucide-default') detected.push('AI Icon Pattern: lucide default');
    if (cs['template'] === 'wordpress-default') detected.push('Template Feeling');
    if (cs['layout'] === '3-column-grid') detected.push('AI Layout: 3-column grid');
    return {
      aiLayout: detected.some(d => d.includes('Layout')) ? 80 : 5,
      aiCopy: detected.some(d => d.includes('Copy')) ? 90 : 5,
      aiHero: detected.some(d => d.includes('Hero')) ? 85 : 5,
      aiCard: detected.some(d => d.includes('Card')) ? 75 : 5,
      aiCTA: detected.some(d => d.includes('CTA')) ? 80 : 5,
      aiGradient: detected.some(d => d.includes('Gradient')) ? 95 : 5,
      aiIconPattern: detected.some(d => d.includes('Icon')) ? 70 : 5,
      genericSection: detected.some(d => d.includes('Section')) ? 85 : 5,
      templateFeeling: detected.some(d => d.includes('Template')) ? 100 : 5,
      detectedPatterns: detected,
    };
  }

  /** Senior Art Director Critique */
  generateCritique(
    pageSnapshot: Record<string, unknown> | undefined,
    scores: { premium: number; whitespace: number; typography: number; photography: number; aiSmell: number },
  ): { critiques: { severity: 'Critical' | 'Major' | 'Minor' | 'Suggestion'; category: string; observation: string; suggestion: string }[]; verdict: string } {
    const critiques: { severity: 'Critical' | 'Major' | 'Minor' | 'Suggestion'; category: string; observation: string; suggestion: string }[] = [];
    if (scores.premium < 95) {
      critiques.push({
        severity: 'Critical', category: 'Premium',
        observation: 'Premium feeling below threshold — first impression lacks luxury cue',
        suggestion: 'Increase whitespace by 30%, add editorial photography, use serif headline accent',
      });
    }
    if (scores.whitespace < 95) {
      critiques.push({
        severity: 'Major', category: 'Whitespace',
        observation: 'Whitespace below threshold — sections feel cramped',
        suggestion: 'Double the padding between sections, reduce hero CTA count to 1',
      });
    }
    if (scores.typography < 95) {
      critiques.push({
        severity: 'Major', category: 'Typography',
        observation: 'Typography scale lacks editorial rhythm',
        suggestion: 'Adopt Display+Editorial scale pair: 96/64/24/16 instead of uniform 32/24/16',
      });
    }
    if (scores.photography < 90) {
      critiques.push({
        severity: 'Critical', category: 'Photography',
        observation: 'Photography does not communicate lifestyle — looks stock',
        suggestion: 'Use lifestyle photography with negative space, shallow DOF, warm light',
      });
    }
    if (scores.aiSmell > 30) {
      critiques.push({
        severity: 'Critical', category: 'AI Smell',
        observation: 'AI patterns detected — design feels generic',
        suggestion: 'Remove purple→blue gradient, replace with brand-specific palette',
      });
    }
    const verdict = critiques.length === 0
      ? 'Design meets Senior Art Director standards. Approve.'
      : `Design requires ${critiques.filter(c => c.severity === 'Critical').length} critical and ${critiques.filter(c => c.severity === 'Major').length} major revisions.`;
    return { critiques, verdict };
  }

  /** Design Recommendations */
  generateRecommendations(critique: { critiques: { severity: string; category: string }[] }): {
    recommendations: { category: 'photography' | 'layout' | 'motion' | 'cta' | 'hierarchy' | 'typography' | 'copy' | 'color'; current: string; suggested: string; rationale: string }[];
    priority: 'critical' | 'high' | 'medium' | 'low';
  } {
    const recommendations = critique.critiques.map(c => ({
      category: this.categoryToRecommendationCategory(c.category),
      current: `${c.category} requires attention`,
      suggested: `Improve ${c.category.toLowerCase()} per Senior Art Director review`,
      rationale: `Detected as ${c.severity} severity — addresses platform Premium/Luxury standards`,
    }));
    const priority: 'critical' | 'high' | 'medium' | 'low' =
      critique.critiques.some(c => c.severity === 'Critical') ? 'critical' :
      critique.critiques.some(c => c.severity === 'Major') ? 'high' :
      critique.critiques.some(c => c.severity === 'Minor') ? 'medium' : 'low';
    return { recommendations, priority };
  }

  // ── Helpers ──
  private getStyleMultiplier(style: string): number {
    const map: Record<string, number> = { Luxury: 6, Premium: 5, Editorial: 4, Boutique: 4, Corporate: 2, Minimal: 3, Modern: 2, Playful: 0 };
    return map[style] ?? 2;
  }
  private detectLuxuryCues(s: Record<string, unknown> | undefined): boolean {
    if (!s) return false;
    return s['serifAccent'] === true || s['editorialLayout'] === true || s['shallowDOF'] === true;
  }
  private detectWhitespace(s: Record<string, unknown> | undefined): boolean {
    if (!s) return false;
    const w = s['whitespaceRatio'] as number | undefined;
    return w !== undefined && w >= 0.4;
  }
  private detectPhotography(s: Record<string, unknown> | undefined): boolean {
    if (!s) return false;
    return s['lifestylePhotography'] === true || s['editorialPhotography'] === true;
  }
  private categoryToRecommendationCategory(c: string): 'photography' | 'layout' | 'motion' | 'cta' | 'hierarchy' | 'typography' | 'copy' | 'color' {
    if (c === 'Photography') return 'photography';
    if (c === 'AI Smell') return 'color';
    if (c === 'Typography') return 'typography';
    if (c === 'Whitespace') return 'layout';
    if (c === 'Premium') return 'hierarchy';
    return 'copy';
  }
}