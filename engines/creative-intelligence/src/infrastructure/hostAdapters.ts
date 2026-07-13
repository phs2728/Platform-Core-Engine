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

// ═══════════════════════════════════════════
// RC3.1: 12개 산업 Detail Blueprint + Objection Library
// ═══════════════════════════════════════════

import type {
  IndustryBlueprint, IndustryDetailBlueprint, SectionBlueprint,
  Objection, FAQItem, ConciergeRecommendation, SocialProofAsset,
  StoryArchitecture, CustomerQuestion, CustomerQuestionModel, JourneyStep,
} from '../interfaces/index.js';

export const INDUSTRY_DETAIL_BLUEPRINTS: Record<IndustryBlueprint, IndustryDetailBlueprint> = {
  Hospitality: {
    industry: 'Hospitality', pageType: 'Home',
    sectionOrder: [
      { order: 1, name: 'Hero', purpose: '안전 + 위치 + 분위기 + 첫인상', required: true, answersQuestion: '안전한가? 위치는? 분위기는?', placement: 'hero-above-fold' },
      { order: 2, name: 'Trust Evidence', purpose: 'Booking Reviews + Guest Photos + 24h', required: true, answersQuestion: '후기는? 24시간?', placement: 'hero-secondary' },
      { order: 3, name: 'Room Gallery', purpose: '실제 객실 증명', required: true, answersQuestion: '실제 객실?', placement: 'section-mid' },
      { order: 4, name: 'Amenities FAQ', purpose: 'Decision Accelerator (와이파이/조식/수건/공항픽업)', required: true, answersQuestion: '와이파이? 조식? 수건? 공항픽업?', placement: 'section-mid' },
      { order: 5, name: 'Best Price Guarantee', purpose: 'Best Price + 공식 사이트 표시', required: true, answersQuestion: '저렴? 공식 사이트?', placement: 'before-cta' },
      { order: 6, name: 'CTA', purpose: 'Book Now', required: true, answersQuestion: '예약은?', placement: 'before-cta' },
    ],
    storyFlow: '안전 확인 → 실제 후기 → 실제 객실 → Amenities → Best Price → 예약',
    evidenceOrder: ['h-rooms', 'h-guests', 'h-booking-reviews', 'h-google', 'h-official', 'h-best-price'],
    faqTopics: ['안전', '여성 혼자', '늦은 체크인', '와이파이', '조식', '수건', '공항픽업'],
    primaryCta: 'Book Now',
    socialProofTypes: ['Review', 'Booking', 'Google', 'TripAdvisor', 'Award'],
    galleryStrategy: '실제 투숙객 사진 (스톡 금지)',
    objectionPriority: ['o-safe', 'o-late-checkin', 'o-female-solo', 'o-airport'],
  },
  Restaurant: {
    industry: 'Restaurant', pageType: 'Home',
    sectionOrder: [
      { order: 1, name: 'Hero', purpose: '실제 음식 사진 + 오늘 영업', required: true, answersQuestion: '실제 음식? 오늘 영업?', placement: 'hero-above-fold' },
      { order: 2, name: 'Reviews', purpose: 'Google/CatchTable 리뷰', required: true, answersQuestion: '리뷰는?', placement: 'hero-secondary' },
      { order: 3, name: 'Chef Profile', purpose: '셰프 경력 + 얼굴', required: true, answersQuestion: '셰프는?', placement: 'section-mid' },
      { order: 4, name: 'Menu', purpose: '메뉴 + 원산지', required: true, answersQuestion: '메뉴? 원산지?', placement: 'section-mid' },
      { order: 5, name: 'Reservation CTA', purpose: '실시간 예약', required: true, answersQuestion: '예약은?', placement: 'before-cta' },
    ],
    storyFlow: '음식 사진 → 리뷰 → 셰프 → 메뉴 → 예약',
    evidenceOrder: ['r-photos', 'r-reviews', 'r-chef', 'r-origin', 'r-reservation', 'r-open-today'],
    faqTopics: ['예약', '주차', '채식', '아이', '가격'],
    primaryCta: 'Reserve',
    socialProofTypes: ['Review', 'Google', 'Press', 'Award'],
    galleryStrategy: '전문 촬영된 음식 사진',
    objectionPriority: ['o-parking', 'o-veggie', 'o-kids', 'o-price'],
  },
  Travel: {
    industry: 'Travel', pageType: 'Home',
    sectionOrder: [
      { order: 1, name: 'Hero', purpose: '투어 사진 + 현지 운영', required: true, answersQuestion: '투어? 현지 운영?', placement: 'hero-above-fold' },
      { order: 2, name: 'Guide Profile', purpose: '실제 가이드 + 언어', required: true, answersQuestion: '가이드? 언어?', placement: 'hero-secondary' },
      { order: 3, name: 'Tour Itinerary', purpose: '구체적 일정', required: true, answersQuestion: '일정은?', placement: 'section-mid' },
      { order: 4, name: 'Reviews', purpose: 'TripAdvisor/Google 후기', required: true, answersQuestion: '후기?', placement: 'section-mid' },
      { order: 5, name: 'Local Office', purpose: '현지 사무소 + 24h 긴급 연락', required: true, answersQuestion: '긴급 연락?', placement: 'before-cta' },
      { order: 6, name: 'Book Tour', purpose: '예약 + Calendar', required: true, answersQuestion: '예약은?', placement: 'before-cta' },
    ],
    storyFlow: '투어 사진 → 가이드 → 일정 → 후기 → 긴급 연락 → 예약',
    evidenceOrder: ['t-tour-photos', 't-guide', 't-local', 't-itinerary', 't-reviews', 't-emergency'],
    faqTopics: ['환불', '비', '언어', '아이', '난이도'],
    primaryCta: 'Book Tour',
    socialProofTypes: ['TripAdvisor', 'Google', 'Review', 'Instagram'],
    galleryStrategy: '실제 투어 사진 (고객 포함)',
    objectionPriority: ['o-refund', 'o-visa', 'o-language', 'o-kids', 'o-difficulty'],
  },
  Marketplace: {
    industry: 'Marketplace', pageType: 'Home',
    sectionOrder: [
      { order: 1, name: 'Hero', purpose: 'Verified Seller + Escrow', required: true, answersQuestion: '가짜? 환불?', placement: 'hero-above-fold' },
      { order: 2, name: 'Categories', purpose: '검색 가능 카테고리', required: true, answersQuestion: '뭐 살 수 있나?', placement: 'hero-secondary' },
      { order: 3, name: 'Verified Sellers', purpose: '인증 판매자 표시', required: true, answersQuestion: '믿을만한 판매자?', placement: 'section-mid' },
      { order: 4, name: 'Reviews', purpose: '양방향 리뷰', required: true, answersQuestion: '다른 사람 후기?', placement: 'section-mid' },
      { order: 5, name: 'Escrow + Dispute', purpose: '안전 결제 + 분쟁 해결', required: true, answersQuestion: '안전? 분쟁?', placement: 'before-cta' },
    ],
    storyFlow: 'Verified Seller → 카테고리 → 인증 → 리뷰 → Escrow',
    evidenceOrder: ['mk-verified', 'mk-escrow', 'mk-dispute', 'mk-reviews'],
    faqTopics: ['사기', '환불', '배송', '품질', '판매자'],
    primaryCta: 'Browse',
    socialProofTypes: ['Review', 'Certification', 'Community'],
    galleryStrategy: '실제 판매자 상품 사진',
    objectionPriority: ['o-fraud', 'o-refund', 'o-shipping', 'o-quality'],
  },
  Retail: {
    industry: 'Retail', pageType: 'Home',
    sectionOrder: [
      { order: 1, name: 'Hero', purpose: '신상품 + 무료 배송', required: true, answersQuestion: '배송비? 신상품?', placement: 'hero-above-fold' },
      { order: 2, name: 'Categories', purpose: '카테고리 탐색', required: true, answersQuestion: '어떤 제품?', placement: 'hero-secondary' },
      { order: 3, name: 'Best Sellers', purpose: '인기 상품 + 리뷰', required: true, answersQuestion: '인기? 리뷰?', placement: 'section-mid' },
      { order: 4, name: 'Returns Policy', purpose: '반품 정책', required: true, answersQuestion: '반품?', placement: 'before-cta' },
    ],
    storyFlow: '신상품 → 카테고리 → 인기 → 리뷰 → 반품',
    evidenceOrder: ['rt-shipping', 'rt-returns', 'rt-reviews'],
    faqTopics: ['배송', '반품', '교환', '사이즈', '재고'],
    primaryCta: 'Shop Now',
    socialProofTypes: ['Review', 'Instagram', 'YouTube'],
    galleryStrategy: '고해상도 제품 사진',
    objectionPriority: ['o-shipping', 'o-returns', 'o-size', 'o-stock'],
  },
  Medical: {
    industry: 'Medical', pageType: 'Home',
    sectionOrder: [
      { order: 1, name: 'Hero', purpose: '의사 프로필 + 인증', required: true, answersQuestion: '의사? 인증?', placement: 'hero-above-fold' },
      { order: 2, name: 'Doctor Profile', purpose: '주치의 경력/학회', required: true, answersQuestion: '의사 경력?', placement: 'hero-secondary' },
      { order: 3, name: 'Equipment', purpose: '의료 장비 + 도입 연도', required: true, answersQuestion: '장비? 최신?', placement: 'section-mid' },
      { order: 4, name: 'Patient Stories', purpose: '실제 환자 후기', required: true, answersQuestion: '다른 환자?', placement: 'section-mid' },
      { order: 5, name: 'Insurance + Cost', purpose: '보험/비용 투명 공개', required: true, answersQuestion: '비용? 보험?', placement: 'before-cta' },
      { order: 6, name: 'Consultation CTA', purpose: '예약', required: true, answersQuestion: '예약?', placement: 'before-cta' },
    ],
    storyFlow: '의사 → 학회/인증 → 장비 → 환자 후기 → 비용 → 예약',
    evidenceOrder: ['m-doctor', 'm-society', 'm-equipment', 'm-cert', 'm-count', 'm-reviews'],
    faqTopics: ['의사', '경력', '비용', '보험', '장비'],
    primaryCta: 'Book Consultation',
    socialProofTypes: ['Certification', 'Review', 'Press'],
    galleryStrategy: '의료진 + 시설 사진',
    objectionPriority: ['o-doctor', 'o-cost', 'o-insurance', 'o-equipment'],
  },
  Education: {
    industry: 'Education', pageType: 'Home',
    sectionOrder: [
      { order: 1, name: 'Hero', purpose: '강사진 + 커리큘럼', required: true, answersQuestion: '강사? 커리큘럼?', placement: 'hero-above-fold' },
      { order: 2, name: 'Curriculum', purpose: '구체적 학습 내용', required: true, answersQuestion: '뭐 배우나?', placement: 'hero-secondary' },
      { order: 3, name: 'Outcomes', purpose: '취업/합격률', required: true, answersQuestion: '결과?', placement: 'section-mid' },
      { order: 4, name: 'Student Reviews', purpose: '수강생 후기', required: true, answersQuestion: '수강생 후기?', placement: 'section-mid' },
      { order: 5, name: 'Pricing + Financial Aid', purpose: '가격 + 학비 지원', required: true, answersQuestion: '가격? 지원?', placement: 'before-cta' },
    ],
    storyFlow: '강사 → 커리큘럼 → 결과 → 후기 → 가격',
    evidenceOrder: ['e-faculty', 'e-curriculum', 'e-outcomes', 'e-reviews'],
    faqTopics: ['입학', '비용', '장학금', '일정', '온라인'],
    primaryCta: 'Apply',
    socialProofTypes: ['Review', 'Certification', 'Press', 'Community'],
    galleryStrategy: '수업/캠퍼스 사진',
    objectionPriority: ['o-admission', 'o-cost', 'o-scholarship', 'o-online'],
  },
  RealEstate: {
    industry: 'RealEstate', pageType: 'Home',
    sectionOrder: [
      { order: 1, name: 'Hero', purpose: '매물 + 위치', required: true, answersQuestion: '매물? 위치?', placement: 'hero-above-fold' },
      { order: 2, name: 'Listings', purpose: '매물 목록', required: true, answersQuestion: '어떤 매물?', placement: 'hero-secondary' },
      { order: 3, name: 'Agent Profile', purpose: '중개인 프로필', required: true, answersQuestion: '중개인?', placement: 'section-mid' },
      { order: 4, name: 'Process', purpose: '구매/임대 절차', required: true, answersQuestion: '절차는?', placement: 'section-mid' },
      { order: 5, name: 'CTA', purpose: '상담 예약', required: true, answersQuestion: '상담?', placement: 'before-cta' },
    ],
    storyFlow: '매물 → 위치 → 중개인 → 절차 → 상담',
    evidenceOrder: ['re-listing', 're-agent', 're-process'],
    faqTopics: ['가격', '대출', '계약', '위치', '관리비'],
    primaryCta: 'Contact Agent',
    socialProofTypes: ['Review', 'Certification', 'Press'],
    galleryStrategy: '고해상도 매물 사진',
    objectionPriority: ['o-price', 'o-loan', 'o-contract', 'o-fee'],
  },
  SaaS: {
    industry: 'SaaS', pageType: 'Home',
    sectionOrder: [
      { order: 1, name: 'Hero', purpose: '핵심 가치 제안 + 99.99% SLA', required: true, answersQuestion: '안정성? 다운?', placement: 'hero-above-fold' },
      { order: 2, name: 'Enterprise Logos', purpose: '대기업 고객', required: true, answersQuestion: '신뢰성?', placement: 'hero-secondary' },
      { order: 3, name: 'Case Study', purpose: '구체적 성과 (정량)', required: true, answersQuestion: '효과?', placement: 'section-mid' },
      { order: 4, name: 'Security', purpose: 'SOC2 + GDPR + ISO', required: true, answersQuestion: '보안?', placement: 'section-mid' },
      { order: 5, name: 'Pricing', purpose: '투명한 가격', required: true, answersQuestion: '가격?', placement: 'section-mid' },
      { order: 6, name: 'API + Docs', purpose: 'API 문서 + Free Trial', required: true, answersQuestion: '연동? 사용?', placement: 'before-cta' },
    ],
    storyFlow: '안정성 → Enterprise → Case Study → 보안 → 가격 → API',
    evidenceOrder: ['s-uptime', 's-enterprise', 's-case-study', 's-soc2', 's-iso', 's-security', 's-api', 's-docs'],
    faqTopics: ['가격', 'API', '보안', '도입', '마이그레이션'],
    primaryCta: 'Start Free Trial',
    socialProofTypes: ['Review', 'Certification', 'Press', 'Community'],
    galleryStrategy: '제품 스크린샷 + Dashboard',
    objectionPriority: ['o-price', 'o-api', 'o-security', 'o-migration'],
  },
  NGO: {
    industry: 'NGO', pageType: 'Home',
    sectionOrder: [
      { order: 1, name: 'Hero', purpose: 'Mission + Impact', required: true, answersQuestion: '무엇을 하나?', placement: 'hero-above-fold' },
      { order: 2, name: 'Impact Numbers', purpose: '구체적 숫자 (도움 받은 사람 수)', required: true, answersQuestion: '얼마나?', placement: 'hero-secondary' },
      { order: 3, name: 'Stories', purpose: '실제 수혜자 이야기', required: true, answersQuestion: '누구에게?', placement: 'section-mid' },
      { order: 4, name: 'Transparency', purpose: '재정 투명성 (연례 보고서)', required: true, answersQuestion: '기부금은 어디로?', placement: 'section-mid' },
      { order: 5, name: 'Donate CTA', purpose: '기부', required: true, answersQuestion: '기부는?', placement: 'before-cta' },
    ],
    storyFlow: 'Mission → Impact → Stories → 투명성 → 기부',
    evidenceOrder: ['n-mission', 'n-impact', 'n-stories', 'n-transparency'],
    faqTopics: ['기부', '투명성', '세금', '자원봉사'],
    primaryCta: 'Donate',
    socialProofTypes: ['Press', 'Certification', 'Partner', 'Review'],
    galleryStrategy: '수혜자 + 활동 사진',
    objectionPriority: ['o-donation', 'o-transparency', 'o-tax', 'o-volunteer'],
  },
  Church: {
    industry: 'Church', pageType: 'Home',
    sectionOrder: [
      { order: 1, name: 'Hero', purpose: '환영 + 미션', required: true, answersQuestion: '어떤 교회?', placement: 'hero-above-fold' },
      { order: 2, name: 'Service Times', purpose: '예배 시간', required: true, answersQuestion: '언제?', placement: 'hero-secondary' },
      { order: 3, name: 'Pastor + Team', purpose: '담임 목사 + 리더', required: true, answersQuestion: '목사?', placement: 'section-mid' },
      { order: 4, name: 'What to Expect', purpose: '첫 방문 안내', required: true, answersQuestion: '처음 가면?', placement: 'section-mid' },
      { order: 5, name: 'Visit CTA', purpose: '방문 안내', required: true, answersQuestion: '방문은?', placement: 'before-cta' },
    ],
    storyFlow: '환영 → 예배 시간 → 목사 → 첫 방문 → 방문',
    evidenceOrder: ['ch-welcome', 'ch-times', 'ch-pastor', 'ch-expect'],
    faqTopics: ['예배', '위치', '아이', '복장', '처음'],
    primaryCta: 'Plan Your Visit',
    socialProofTypes: ['Review', 'Community', 'Partner'],
    galleryStrategy: '교회 + 예배 사진',
    objectionPriority: ['o-service', 'o-location', 'o-kids', 'o-dress'],
  },
  Government: {
    industry: 'Government', pageType: 'Home',
    sectionOrder: [
      { order: 1, name: 'Hero', purpose: '서비스 안내 + Citizen-focused', required: true, answersQuestion: '어떤 서비스?', placement: 'hero-above-fold' },
      { order: 2, name: 'Services', purpose: '주요 서비스 목록', required: true, answersQuestion: '어떤 서비스?', placement: 'hero-secondary' },
      { order: 3, name: 'How-to / Process', purpose: '절차 안내', required: true, answersQuestion: '어떻게?', placement: 'section-mid' },
      { order: 4, name: 'Transparency', purpose: '예산 + 운영 보고', required: true, answersQuestion: '투명한가?', placement: 'section-mid' },
      { order: 5, name: 'Contact + Office Hours', purpose: '연락처 + 업무 시간', required: true, answersQuestion: '연락?', placement: 'before-cta' },
    ],
    storyFlow: '서비스 → 절차 → 투명성 → 연락',
    evidenceOrder: ['g-services', 'g-process', 'g-transparency', 'g-contact'],
    faqTopics: ['서비스', '절차', '비용', '연락', '민원'],
    primaryCta: 'Find Service',
    socialProofTypes: ['Certification', 'Press', 'Community'],
    galleryStrategy: '공공 서비스 + 시민 사진',
    objectionPriority: ['o-service', 'o-process', 'o-cost', 'o-contact'],
  },
};

// ═══════════════════════════════════════════
// RC3.1: Objection Library (12개 산업)
// ═══════════════════════════════════════════

// OBJECTION_LIBRARIES의 Objection.industry는 IndustryBlueprint (RC3.1) 으로 casting
// (V2 Objection.industry는 IndustryType으로 좁게 정의되어 있어 union 확장)
export const OBJECTION_LIBRARIES: Record<IndustryBlueprint, import('../interfaces/index.js').Objection[]> = {
  Hospitality: [
    { id: 'o-safe', industry: 'Hospitality' as never, text: '안전한가?', type: 'Fear', severity: 'Critical', resolvedBy: ['h-rooms', 'h-guests', 'h-official'] },
    { id: 'o-female-solo', industry: 'Hospitality' as never, text: '여성 혼자 안전한가?', type: 'Fear', severity: 'Major', resolvedBy: ['h-reviews', 'h-24h'] },
    { id: 'o-late-checkin', industry: 'Hospitality' as never, text: '늦은 체크인 가능한가?', type: 'Risk', severity: 'Major', resolvedBy: ['h-24h'] },
    { id: 'o-wifi', industry: 'Hospitality' as never, text: '와이파이는?', type: 'Expectation', severity: 'Minor', resolvedBy: ['h-rooms'] },
    { id: 'o-breakfast', industry: 'Hospitality' as never, text: '조식 포함?', type: 'Expectation', severity: 'Minor', resolvedBy: ['h-rooms'] },
    { id: 'o-towel', industry: 'Hospitality' as never, text: '수건 제공?', type: 'Expectation', severity: 'Latent', resolvedBy: ['h-rooms'] },
    { id: 'o-airport', industry: 'Hospitality' as never, text: '공항픽업?', type: 'Expectation', severity: 'Major', resolvedBy: ['h-official'] },
  ],
  Restaurant: [
    { id: 'o-parking', industry: 'Restaurant' as never, text: '주차 가능한가?', type: 'Expectation', severity: 'Major', resolvedBy: ['r-location'] },
    { id: 'o-veggie', industry: 'Restaurant' as never, text: '채식 메뉴?', type: 'Expectation', severity: 'Major', resolvedBy: ['r-origin', 'r-chef'] },
    { id: 'o-kids', industry: 'Restaurant' as never, text: '아이 동반 가능한가?', type: 'Expectation', severity: 'Minor', resolvedBy: ['r-space'] },
    { id: 'o-price', industry: 'Restaurant' as never, text: '가격대는?', type: 'Cost', severity: 'Critical', resolvedBy: ['r-photos', 'r-reviews'] },
    { id: 'o-reservation', industry: 'Restaurant' as never, text: '예약 가능한가?', type: 'Risk', severity: 'Critical', resolvedBy: ['r-reservation'] },
  ],
  Travel: [
    { id: 'o-refund', industry: 'Travel' as never, text: '환불 가능한가?', type: 'Risk', severity: 'Critical', resolvedBy: ['t-office'] },
    { id: 'o-visa', industry: 'Travel' as never, text: '비자 필요?', type: 'Confusion', severity: 'Major', resolvedBy: ['t-itinerary'] },
    { id: 'o-language', industry: 'Travel' as never, text: '언어 소통?', type: 'Fear', severity: 'Major', resolvedBy: ['t-guide'] },
    { id: 'o-kids', industry: 'Travel' as never, text: '아이 동반?', type: 'Expectation', severity: 'Minor', resolvedBy: ['t-itinerary'] },
    { id: 'o-difficulty', industry: 'Travel' as never, text: '난이도는?', type: 'Expectation', severity: 'Major', resolvedBy: ['t-tour-photos', 't-reviews'] },
  ],
  Marketplace: [
    { id: 'o-fraud', industry: 'Marketplace' as never, text: '사기 안 당할까?', type: 'Fear', severity: 'Critical', resolvedBy: ['mk-verified', 'mk-escrow'] },
    { id: 'o-refund', industry: 'Marketplace' as never, text: '환불 가능한가?', type: 'Risk', severity: 'Critical', resolvedBy: ['mk-escrow', 'mk-dispute'] },
    { id: 'o-shipping', industry: 'Marketplace' as never, text: '배송 시간?', type: 'Expectation', severity: 'Major', resolvedBy: ['mk-dispute'] },
    { id: 'o-quality', industry: 'Marketplace' as never, text: '품질은?', type: 'Expectation', severity: 'Critical', resolvedBy: ['mk-reviews', 'mk-verified'] },
    { id: 'o-seller', industry: 'Marketplace' as never, text: '판매자 믿을만?', type: 'Fear', severity: 'Critical', resolvedBy: ['mk-verified', 'mk-reviews'] },
  ],
  Retail: [
    { id: 'o-shipping', industry: 'Retail' as never, text: '배송비는?', type: 'Cost', severity: 'Critical', resolvedBy: ['rt-shipping'] },
    { id: 'o-returns', industry: 'Retail' as never, text: '반품 가능?', type: 'Risk', severity: 'Critical', resolvedBy: ['rt-returns'] },
    { id: 'o-size', industry: 'Retail' as never, text: '사이즈는?', type: 'Confusion', severity: 'Major', resolvedBy: ['rt-reviews'] },
    { id: 'o-stock', industry: 'Retail' as never, text: '재고는?', type: 'Expectation', severity: 'Major', resolvedBy: [] },
  ],
  Medical: [
    { id: 'o-doctor', industry: 'Medical' as never, text: '어느 의사?', type: 'Risk', severity: 'Critical', resolvedBy: ['m-doctor', 'm-society'] },
    { id: 'o-cost', industry: 'Medical' as never, text: '비용은?', type: 'Cost', severity: 'Critical', resolvedBy: [] },
    { id: 'o-insurance', industry: 'Medical' as never, text: '보험 적용?', type: 'Cost', severity: 'Critical', resolvedBy: [] },
    { id: 'o-equipment', industry: 'Medical' as never, text: '장비는?', type: 'Expectation', severity: 'Major', resolvedBy: ['m-equipment'] },
  ],
  Education: [
    { id: 'o-admission', industry: 'Education' as never, text: '입학 요건?', type: 'Confusion', severity: 'Major', resolvedBy: ['e-faculty'] },
    { id: 'o-cost', industry: 'Education' as never, text: '비용은?', type: 'Cost', severity: 'Critical', resolvedBy: [] },
    { id: 'o-scholarship', industry: 'Education' as never, text: '장학금?', type: 'Cost', severity: 'Major', resolvedBy: [] },
    { id: 'o-online', industry: 'Education' as never, text: '온라인 가능?', type: 'Expectation', severity: 'Major', resolvedBy: [] },
  ],
  RealEstate: [
    { id: 'o-price', industry: 'RealEstate' as never, text: '가격 협상?', type: 'Cost', severity: 'Critical', resolvedBy: [] },
    { id: 'o-loan', industry: 'RealEstate' as never, text: '대출 가능?', type: 'Cost', severity: 'Critical', resolvedBy: [] },
    { id: 'o-contract', industry: 'RealEstate' as never, text: '계약 절차?', type: 'Confusion', severity: 'Major', resolvedBy: ['re-process'] },
    { id: 'o-fee', industry: 'RealEstate' as never, text: '관리비?', type: 'Cost', severity: 'Major', resolvedBy: [] },
  ],
  SaaS: [
    { id: 'o-price', industry: 'SaaS' as never, text: '가격은?', type: 'Cost', severity: 'Critical', resolvedBy: [] },
    { id: 'o-api', industry: 'SaaS' as never, text: 'API 있나?', type: 'Expectation', severity: 'Major', resolvedBy: ['s-api', 's-docs'] },
    { id: 'o-security', industry: 'SaaS' as never, text: '보안?', type: 'Risk', severity: 'Critical', resolvedBy: ['s-soc2', 's-iso', 's-security'] },
    { id: 'o-migration', industry: 'SaaS' as never, text: '마이그레이션?', type: 'Risk', severity: 'Major', resolvedBy: ['s-case-study', 's-docs'] },
  ],
  NGO: [
    { id: 'o-donation', industry: 'NGO' as never, text: '기부금은 어떻게 쓰이나?', type: 'Cost', severity: 'Critical', resolvedBy: ['n-transparency'] },
    { id: 'o-transparency', industry: 'NGO' as never, text: '투명한가?', type: 'Risk', severity: 'Critical', resolvedBy: ['n-transparency', 'n-stories'] },
    { id: 'o-tax', industry: 'NGO' as never, text: '세금 혜택?', type: 'Cost', severity: 'Major', resolvedBy: [] },
    { id: 'o-volunteer', industry: 'NGO' as never, text: '자원봉사?', type: 'Expectation', severity: 'Minor', resolvedBy: [] },
  ],
  Church: [
    { id: 'o-service', industry: 'Church' as never, text: '예배 시간?', type: 'Expectation', severity: 'Major', resolvedBy: ['ch-times'] },
    { id: 'o-location', industry: 'Church' as never, text: '어디에?', type: 'Expectation', severity: 'Major', resolvedBy: [] },
    { id: 'o-kids', industry: 'Church' as never, text: '아이 프로그램?', type: 'Expectation', severity: 'Major', resolvedBy: ['ch-expect'] },
    { id: 'o-dress', industry: 'Church' as never, text: '복장 규정?', type: 'Fear', severity: 'Minor', resolvedBy: ['ch-expect'] },
  ],
  Government: [
    { id: 'o-service', industry: 'Government' as never, text: '어떤 서비스?', type: 'Confusion', severity: 'Major', resolvedBy: ['g-services'] },
    { id: 'o-process', industry: 'Government' as never, text: '절차는?', type: 'Confusion', severity: 'Critical', resolvedBy: ['g-process'] },
    { id: 'o-cost', industry: 'Government' as never, text: '비용은?', type: 'Cost', severity: 'Major', resolvedBy: [] },
    { id: 'o-contact', industry: 'Government' as never, text: '연락처?', type: 'Expectation', severity: 'Major', resolvedBy: ['g-contact'] },
  ],
};

// ═══════════════════════════════════════════
// RC3.1: Customer Question Model (CQM) Generator
// ═══════════════════════════════════════════

/**
 * CQM: 페이지별 customer question 생성
 * "이 페이지에서 고객이 가장 궁금해할 질문 목록"
 */
export function generateCustomerQuestions(
  pageType: IndustryDetailBlueprint['pageType'], industry: IndustryBlueprint,
): CustomerQuestion[] {
  const questionsByPage: Record<IndustryDetailBlueprint['pageType'], Partial<Record<IndustryBlueprint, string[]>>> = {
    Home: {
      Hospitality: ['안전한가?', '위치는?', '분위기는?', '가격은?', '후기는?', '예약은?'],
      Restaurant: ['실제 음식?', '셰프는?', '리뷰는?', '가격은?', '예약은?', '영업시간은?'],
      Travel: ['투어 내용은?', '가이드는?', '현지 운영?', '환불?', '언어?', '예약은?'],
      Marketplace: ['믿을만?', '가짜 아닌가?', '환불?', '배송?', '품질?', '가격은?'],
      Retail: ['배송비?', '신상품?', '인기?', '리뷰?', '반품?', '사이즈?'],
      Medical: ['의사는?', '경력은?', '비용은?', '보험?', '장비는?', '예약은?'],
      Education: ['강사는?', '커리큘럼?', '결과?', '후기?', '가격?', '입학요건?'],
      RealEstate: ['매물은?', '위치는?', '중개인은?', '가격?', '대출?', '절차?'],
      SaaS: ['안정성?', '고객은?', '효과?', '보안?', '가격?', 'API?'],
      NGO: ['무엇을?', '얼마나?', '누구에게?', '기부금?', '투명한가?', '기부는?'],
      Church: ['어떤 교회?', '예배는?', '목사는?', '위치는?', '처음?', '방문은?'],
      Government: ['어떤 서비스?', '절차는?', '비용?', '연락?', '민원?', '서류?'],
    },
    Detail: {
      Hospitality: ['취소 가능한가?', '환불은?', '체크인은?', '체크아웃은?', '조식은?', '와이파이?'],
      Restaurant: ['메뉴는?', '원산지는?', '알레르기?', '가격?', '예약은?', '주차는?'],
      Travel: ['일정은?', '포함 사항?', '불포함?', '가이드?', '난이도?', '환불?'],
      Marketplace: ['정품?', '배송?', '반품?', '교환?', '보증?', '후기?'],
      Retail: ['상세 스펙?', '소재?', '사이즈?', '색상?', '재고?', '배송?'],
      Medical: ['시술 상세?', '준비 사항?', '회복 기간?', '부작용?', '비용?', '보험?'],
      Education: ['수업 내용?', '일정?', '교재?', '평가?', '자격증?', '취업 지원?'],
      RealEstate: ['상세 정보?', '평수?', '층수?', '옵션?', '입주 가능일?', '관리비?'],
      SaaS: ['상세 기능?', '플랜 비교?', 'API 한도?', '지원?', '통합?', '마이그레이션?'],
      NGO: ['프로그램 상세?', '사용 내역?', '연례 보고서?', '모니터링?', '평가?', '기부 방법?'],
      Church: ['예배 상세?', '설교?', '친교?', '교육?', '찬양?', '아이 프로그램?'],
      Government: ['서류 상세?', '양식?', '처리 기간?', '수수료?', '결과?', '이의 신청?'],
    },
    Booking: {
      Hospitality: ['취소 정책?', '환불?', '언제 결제?', '체크인?', '추가 비용?', '와이파이 비밀번호?'],
      Restaurant: ['예약 확인?', '변경?', '취소?', '인원 변경?', '특별 요청?', '결제?'],
      Travel: ['결제?', '확인서?', '환불?', '변경?', '픽업?', '긴급 연락?'],
      Marketplace: ['결제?', '배송 추적?', '반품?', '교환?', '환불?', '문의?'],
      Retail: ['결제?', '배송 추적?', '교환?', '반품?', '취소?', '문의?'],
      Medical: ['예약 확인?', '변경?', '취소?', '준비사항?', '비용?', '보험?'],
      Education: ['등록?', '결제?', '환불?', '장학금?', '변경?', '취소?'],
      RealEstate: ['상담 예약?', '확인?', '변경?', '취소?', '준비 서류?', '비용?'],
      SaaS: ['무료试用?', '결제?', '플랜 변경?', '취소?', '환불?', '엔터프라이즈 문의?'],
      NGO: ['기부?', '영수증?', '정기 기부?', '취소?', '세금 공제?', '문의?'],
      Church: ['방문 예약?', '확인?', '변경?', '취소?', '특별 요청?', '문의?'],
      Government: ['신청?', '확인?', '서류 제출?', '처리 기간?', '문의?', '이의 신청?'],
    },
    About: {
      Hospitality: ['호스트는 누구?', '왜 시작?', '왜 믿을만?', '운영 얼마나?', '리뷰는?', '차별점은?'],
      Restaurant: ['셰프는 누구?', '왜 시작?', '어디서 요리?', '운영 얼마나?', '리뷰는?', '차별점은?'],
      Travel: ['현지 운영은?', '왜 시작?', '경험은?', '리뷰는?', '파트너는?', '차별점은?'],
      Marketplace: ['회사 정보?', '왜 시작?', '운영 얼마나?', '신뢰성?', '리뷰는?', '차별점은?'],
      Retail: ['회사 정보?', '왜 시작?', '운영 얼마나?', '리뷰는?', '차별점은?', '반품 정책?'],
      Medical: ['병원은?', '의사 경력?', '학회?', '인증?', '차별점?', '환자 후기?'],
      Education: ['학교는?', '왜 시작?', '강사진?', '인증?', '차별점?', '수강생 후기?'],
      RealEstate: ['중개사무소?', '왜 시작?', '경력?', '인증?', '차별점?', '고객 후기?'],
      SaaS: ['회사는?', '왜 시작?', '팀?', '투자자?', '차별점?', '고객 후기?'],
      NGO: ['단체는?', '왜 시작?', '미션?', '투명성?', '차별점?', '수혜자 후기?'],
      Church: ['교회는?', '왜 시작?', '역사?', '목사님?', '차별점?', '성도 후기?'],
      Government: ['기관은?', '왜 존재?', '연혁?', '미션?', '차별점?', '서비스 후기?'],
    },
    Pricing: {
      Hospitality: ['1박 가격?', '추가 비용?', '세금 포함?', '할인?', '취소 수수료?', '멤버십?'],
      Restaurant: ['메뉴 가격?', '코스 가격?', '와인?', '서비스?', '팁?', '특별 메뉴?'],
      Travel: ['투어 가격?', '포함/불포함?', '할인?', '단체 할인?', '추가 비용?', '취소 수수료?'],
      Marketplace: ['제품 가격?', '배송비?', '수수료?', '할인?', '쿠폰?', '총 비용?'],
      Retail: ['제품 가격?', '배송비?', '할인?', '쿠폰?', '멤버십?', '총 비용?'],
      Medical: ['시술 비용?', '보험 적용?', '할인?', '분할 결제?', '총 비용?', '추가 비용?'],
      Education: ['수강료?', '교재비?', '할인?', '장학금?', '분할 결제?', '총 비용?'],
      RealEstate: ['매물 가격?', '중개 수수료?', '대출?', '세금?', '총 비용?', '관리비?'],
      SaaS: ['플랜 가격?', 'Free Trial?', '연간 할인?', '사용자 수?', '총 비용?', '엔터프라이즈?'],
      NGO: ['기부 금액?', '정기 vs 일시?', '세금 공제?', '영수증?', '최소 금액?', '멤버십?'],
      Church: ['헌금?', '등록비?', '특별 헌금?', '온라인 헌금?', '증거서?', '환불?'],
      Government: ['수수료?', '할인?', '무료?', '추가 비용?', '총 비용?', '온라인 결제?'],
    },
    FAQ: {
      Hospitality: ['예약 변경?', '취소?', '조식?', '주차?', '와이파이?', '공항픽업?'],
      Restaurant: ['예약?', '취소?', '주차?', '채식?', '아이?', '단체?'],
      Travel: ['환불?', '변경?', '날씨?', '준비물?', '픽업?', '식사?'],
      Marketplace: ['반품?', '교환?', '환불?', '배송 추적?', '문의?', '보증?'],
      Retail: ['반품?', '교환?', '환불?', '배송 추적?', '문의?', '사이즈?'],
      Medical: ['예약 변경?', '취소?', '준비사항?', '회복?', '부작용?', '비용?'],
      Education: ['등록?', '취소?', '환불?', '장학금?', '자격증?', '취업?'],
      RealEstate: ['대출?', '계약?', '취소?', '비용?', '서류?', '입주?'],
      SaaS: ['플랜 변경?', '취소?', '환불?', 'API?', '지원?', '마이그레이션?'],
      NGO: ['기부 변경?', '취소?', '세금?', '영수증?', '사용 내역?', '정기 기부?'],
      Church: ['방문?', '예배?', '등록?', '특별 모임?', '자원봉사?', '헌금?'],
      Government: ['신청 변경?', '취소?', '서류?', '처리 기간?', '이의 신청?', '문의?'],
    },
    Contact: {
      Hospitality: ['연락처?', '긴급 연락?', '프론트 데스크?', '이메일?', '주소?', '교통편?'],
      Restaurant: ['전화?', '이메일?', '주소?', '주차?', '영업시간?', '예약 변경?'],
      Travel: ['현지 연락?', '긴급?', '한국어 지원?', '이메일?', '주소?', '픽업?'],
      Marketplace: ['고객센터?', '이메일?', '채팅?', '전화?', '주소?', '긴급?'],
      Retail: ['고객센터?', '이메일?', '채팅?', '전화?', '매장?', '주소?'],
      Medical: ['전화?', '긴급?', '이메일?', '주소?', '영업시간?', '예약 변경?'],
      Education: ['입학처?', '이메일?', '전화?', '주소?', '상담?', '방문?'],
      RealEstate: ['중개인?', '전화?', '이메일?', '주소?', '영업시간?', '방문?'],
      SaaS: ['지원?', '영업?', '이메일?', '채팅?', '긴급?', '엔터프라이즈?'],
      NGO: ['사무국?', '이메일?', '전화?', '주소?', '자원봉사?', '문의?'],
      Church: ['사무국?', '목사님?', '이메일?', '전화?', '주소?', '긴급?'],
      Government: ['민원실?', '전화?', '이메일?', '주소?', '업무시간?', '긴급?'],
    },
  };
  const qs = questionsByPage[pageType]?.[industry] ?? [];
  return qs.map((q, idx) => ({
    id: `cq-${industry.toLowerCase()}-${pageType.toLowerCase()}-${idx}`,
    pageRef: pageType, question: q,
    priority: idx < 3 ? 'Critical' : idx < 5 ? 'High' : 'Medium',
    journeyStage: ['Problem', 'Discovery', 'Comparison', 'Evaluation', 'Trust', 'Decision', 'Action', 'Experience', 'Loyalty', 'Advocacy'][Math.min(idx, 9)] as never,
  }));
}

/**
 * CQM: 우선순위 기반 question sequence 생성
 */
export function generateQuestionSequence(questions: CustomerQuestion[]): string[] {
  return questions
    .slice()
    .sort((a, b) => {
      const order = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;
      return order[a.priority] - order[b.priority];
    })
    .map(q => q.id);
}

// ═══════════════════════════════════════════
// RC3.1: Customer Journey Steps (산업 공통 9-stage)
// ═══════════════════════════════════════════

export const JOURNEY_STEPS: JourneyStep[] = [
  { stage: 'Problem', goal: '문제 인식', question: '이 문제를 어떻게 해결하지?', objection: '해결 가능한가?', evidence: '관련성', decisionTrigger: '이 사이트가 나와 관련 있다', nextAction: 'Discovery' },
  { stage: 'Discovery', goal: '사이트 발견', question: '이 회사는 무엇인가?', objection: '관심 없는가?', evidence: '명확한 가치 제안', decisionTrigger: '내가 찾는 것이 있는가', nextAction: 'Comparison' },
  { stage: 'Comparison', goal: '다른 옵션과 비교', question: '다른 곳과 무엇이 다른가?', objection: '경쟁사보다 낫지 않은가?', evidence: '차별점', decisionTrigger: '차별점이 명확', nextAction: 'Evaluation' },
  { stage: 'Evaluation', goal: '상세 평가', question: '실제로 작동하는가?', objection: '실제 후기가 있는가?', evidence: 'Case Study + Reviews', decisionTrigger: '구체적 증거', nextAction: 'Trust' },
  { stage: 'Trust', goal: '신뢰 형성', question: '이 회사를 믿을 수 있는가?', objection: '사기 아닌가?', evidence: '인증 + 후기 + 투명성', decisionTrigger: '신뢰 가능', nextAction: 'Decision' },
  { stage: 'Decision', goal: '결정', question: '지금 행동해야 하는가?', objection: '더 기다릴까?', evidence: '사회적 증거 + 긴급성', decisionTrigger: '결정 가능', nextAction: 'Action' },
  { stage: 'Action', goal: '행동', question: '어떻게 행동하지?', objection: '실수하지 않을까?', evidence: '간단한 CTA + 보장', decisionTrigger: '행동', nextAction: 'Experience' },
  { stage: 'Experience', goal: '경험', question: '내가 잘한 선택인가?', objection: '실망할까?', evidence: '후속 커뮤니케이션', decisionTrigger: '만족', nextAction: 'Loyalty' },
  { stage: 'Loyalty', goal: '충성', question: '다시 이용해야 하나?', objection: '다른 곳이 더 낫지 않은가?', evidence: '멤버십 + 혜택', decisionTrigger: '충성', nextAction: 'Advocacy' },
  { stage: 'Advocacy', goal: '추천', question: '다른 사람에게 추천하나?', objection: '내 평판이 괜찮을까?', evidence: '추천 프로그램', decisionTrigger: '추천', nextAction: 'Cycle' },
];

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