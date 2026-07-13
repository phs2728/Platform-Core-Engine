/**
 * skill_standard/playbooks/index.ts — Agency Playbook Architecture
 *
 * Every Skill Pack must belong to one or more Playbooks.
 * Agency OS auto-selects Playbook → Skill Pack → Skills → Execution.
 */

import type { SkillCertification } from '../index.js';

// ═══════════════════════════════════════════
// Playbook Definition
// ═══════════════════════════════════════════

export interface AgencyPlaybook {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly certification: SkillCertification;
  readonly industry: string;
  readonly packIds: string[];               // Skill Packs referenced
  readonly sections: PlaybookSection[];
  readonly launchChecklist: string[];
  readonly compatibility: { platformVersion: string; agencyOsRequired: boolean };
}

export interface PlaybookSection {
  readonly name: string;
  readonly category: PlaybookSectionCategory;
  readonly required: boolean;
  readonly description: string;
  readonly linkedPackIds?: string[] | undefined;
}

export type PlaybookSectionCategory =
  | 'Customer Journey' | 'Decision Journey' | 'Trust Journey'
  | 'Information Architecture' | 'Navigation' | 'Homepage' | 'Landing Pages'
  | 'Detail Pages' | 'FAQ Strategy' | 'Chat Strategy' | 'Search Strategy'
  | 'Copy Strategy' | 'Brand Voice' | 'Photo Direction' | 'Video Direction'
  | 'CTA Strategy' | 'Conversion Strategy' | 'Trust Evidence'
  | 'SEO' | 'Accessibility' | 'Performance' | 'Analytics' | 'A/B Testing'
  | 'Launch Checklist';

export const ALL_PLAYBOOK_SECTIONS: PlaybookSectionCategory[] = [
  'Customer Journey', 'Decision Journey', 'Trust Journey',
  'Information Architecture', 'Navigation', 'Homepage', 'Landing Pages',
  'Detail Pages', 'FAQ Strategy', 'Chat Strategy', 'Search Strategy',
  'Copy Strategy', 'Brand Voice', 'Photo Direction', 'Video Direction',
  'CTA Strategy', 'Conversion Strategy', 'Trust Evidence',
  'SEO', 'Accessibility', 'Performance', 'Analytics', 'A/B Testing',
  'Launch Checklist',
];

// ═══════════════════════════════════════════
// Playbook Registry
// ═══════════════════════════════════════════

export interface IPlaybookRegistry {
  register(playbook: AgencyPlaybook): void;
  get(id: string): AgencyPlaybook | null;
  getByIndustry(industry: string): AgencyPlaybook[];
  findByPack(packId: string): AgencyPlaybook[];
  all(): AgencyPlaybook[];
}

export class InMemoryPlaybookRegistry implements IPlaybookRegistry {
  private playbooks = new Map<string, AgencyPlaybook>();

  register(pb: AgencyPlaybook): void { this.playbooks.set(pb.id, pb); }
  get(id: string): AgencyPlaybook | null { return this.playbooks.get(id) ?? null; }
  getByIndustry(industry: string): AgencyPlaybook[] {
    return [...this.playbooks.values()].filter(p => p.industry === industry);
  }
  findByPack(packId: string): AgencyPlaybook[] {
    return [...this.playbooks.values()].filter(p => p.packIds.includes(packId));
  }
  all(): AgencyPlaybook[] { return [...this.playbooks.values()]; }
}

// ═══════════════════════════════════════════
// Helper: Create standard section set for a playbook
// ═══════════════════════════════════════════

function standardSections(industry: string): PlaybookSection[] {
  return [
    { name: 'Customer Journey Map', category: 'Customer Journey', required: true, description: `${industry} 고객의 문제 인식 → 행동 전체 여정 매핑` },
    { name: 'Decision Architecture', category: 'Decision Journey', required: true, description: '고객 의사결정 10단계 (Problem → Advocacy)' },
    { name: 'Trust Evidence Strategy', category: 'Trust Journey', required: true, description: '신뢰 형성 요소 배치 전략' },
    { name: 'Site Map', category: 'Information Architecture', required: true, description: '페이지 구조 및 우선순위' },
    { name: 'Navigation Pattern', category: 'Navigation', required: true, description: '네비게이션 패턴 (헤더/푸터/사이드)' },
    { name: 'Homepage Layout', category: 'Homepage', required: true, description: '홈페이지 섹션 순서 + CDA 매핑' },
    { name: 'Landing Pages', category: 'Landing Pages', required: true, description: '캠페인/서비스별 랜딩 페이지' },
    { name: 'Detail Page Template', category: 'Detail Pages', required: true, description: '상세페이지 전략 (Detail Strategy Library 활용)' },
    { name: 'FAQ Strategy', category: 'FAQ Strategy', required: true, description: '고객 불안/거절 요인 해소 FAQ (Decision Accelerator)' },
    { name: 'AI Concierge Setup', category: 'Chat Strategy', required: false, description: 'AI Concierge 컨텍스트 + 에스컬레이션' },
    { name: 'Search & Filter', category: 'Search Strategy', required: false, description: '검색/필터 UX' },
    { name: 'Copy Framework', category: 'Copy Strategy', required: true, description: '카피 라이팅 원칙 + 톤앤매너' },
    { name: 'Brand Voice', category: 'Brand Voice', required: true, description: '브랜드 보이스 가이드' },
    { name: 'Photo Direction', category: 'Photo Direction', required: true, description: '사진 방향성 (조명, 구도, 무드)' },
    { name: 'Video Direction', category: 'Video Direction', required: false, description: '비디오 방향성' },
    { name: 'CTA Strategy', category: 'CTA Strategy', required: true, description: 'CTA 배치/문구/디자인' },
    { name: 'Conversion Funnels', category: 'Conversion Strategy', required: true, description: '전환 퍼널 설계' },
    { name: 'Social Proof Architecture', category: 'Trust Evidence', required: true, description: '리뷰/어워드/미디어/파트너 배치' },
    { name: 'SEO Blueprint', category: 'SEO', required: true, description: 'SEO 구조 (메타/구조화데이터/사이트맵)' },
    { name: 'Accessibility Audit', category: 'Accessibility', required: true, description: 'WCAG AAA 컴플라이언스' },
    { name: 'Performance Budget', category: 'Performance', required: true, description: 'Core Web Vitals 목표' },
    { name: 'Analytics Setup', category: 'Analytics', required: true, description: 'GA4/이벤트 트래킹' },
    { name: 'A/B Test Plan', category: 'A/B Testing', required: false, description: 'A/B 테스트 계획' },
    { name: 'Launch Checklist', category: 'Launch Checklist', required: true, description: '런칭 전 체크리스트' },
  ];
}

// ═══════════════════════════════════════════
// Initial Playbook Library (16 playbooks)
// ═══════════════════════════════════════════

export const INITIAL_PLAYBOOKS: AgencyPlaybook[] = [
  ['luxury-hotel', 'Luxury Hotel Website', 'Aman/Four Seasons급 럭셔리 호텔 웹사이트', 'Hospitality', 'pack-premium-website-foundation', 'pack-conversion-optimization'],
  ['boutique-hostel', 'Boutique Hostel', '부티크 호스텔 — 커뮤니티 + 가성비 + 신뢰', 'Hospitality', 'pack-premium-website-foundation'],
  ['restaurant', 'Restaurant Website', '레스토랑 — 실제 음식 사진 + 예약', 'Restaurant', 'pack-premium-website-foundation', 'pack-conversion-optimization'],
  ['coffee-shop', 'Coffee Shop', '커피샵 — 분위기 + 위치 + 메뉴', 'Restaurant', 'pack-premium-website-foundation'],
  ['travel-agency', 'Travel Agency', '여행사 — 현지 운영 + 가이드 + 투어', 'Travel', 'pack-premium-website-foundation', 'pack-conversion-optimization'],
  ['pilgrimage', 'Pilgrimage Tour', '성지순례 — 감성 + 신뢰 + 일정', 'Travel', 'pack-premium-website-foundation'],
  ['marketplace', 'Marketplace', '마켓플레이스 — 신뢰 + 에스크로 + 검증', 'Marketplace', 'pack-premium-website-foundation'],
  ['saas-landing', 'SaaS Landing', 'SaaS 랜딩 — SOC2 + 엔터프라이즈 + API', 'SaaS', 'pack-premium-website-foundation', 'pack-conversion-optimization'],
  ['ngo', 'NGO Website', 'NGO — 미션 + 임팩트 + 투명성 + 기부', 'NGO', 'pack-premium-website-foundation'],
  ['church', 'Church Website', '교회 — 환영 + 예배시간 + 방문안내', 'Church', 'pack-premium-website-foundation'],
  ['medical-clinic', 'Medical Clinic', '의원 — 의사 + 자격 + 후기 + 예약', 'Medical', 'pack-premium-website-foundation', 'pack-conversion-optimization'],
  ['dentist', 'Dentist', '치과 — 의사 + 장비 + 비용 + 예약', 'Medical', 'pack-premium-website-foundation'],
  ['law-firm', 'Law Firm', '로펌 — 변호사 + 성공사례 + 상담', 'SaaS', 'pack-premium-website-foundation'],
  ['corporate', 'Corporate Website', '기업 — 신뢰 + 투자자 + 채용', 'SaaS', 'pack-premium-website-foundation'],
  ['university', 'University', '대학 — 학과 + 입학 + 연구 + 캠퍼스', 'Education', 'pack-premium-website-foundation'],
  ['government', 'Government', '정부 — 신뢰 + 접근성 + 정보 + 서비스', 'Government', 'pack-premium-website-foundation'],
].map(([id, name, description, industry, ...packIds]) => ({
  id: `playbook-${id}`,
  name: name as string,
  description: description as string,
  version: '1.0.0',
  certification: 'B' as SkillCertification,
  industry: industry as string,
  packIds: packIds as string[],
  sections: standardSections(industry as string),
  launchChecklist: [
    'WCAG AAA 검증 완료',
    'Core Web Vitals LCP ≤ 2.5s',
    'Structured Data 검증 (Google Rich Results Test)',
    'Trust Evidence 배치 확인',
    'FAQ — 모든 Critical objections 해소 확인',
    'CTA — 모든 페이지에 primary CTA 존재',
    'Analytics — GA4 이벤트 트래킹 설정',
    'Sitemap — 모든 locale 포함',
  ],
  compatibility: { platformVersion: '1.0.0', agencyOsRequired: true },
}));