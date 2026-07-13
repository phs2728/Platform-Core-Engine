/**
 * detail_strategy/index.ts — Design Detail Strategy Library
 *
 * Capability 5: Industry-specific detail page strategies.
 * AI must understand how to structure detail pages per industry.
 */

// ═══════════════════════════════════════════
// Detail Page Strategy
// ═══════════════════════════════════════════

export type DetailPageIndustry =
  | 'Restaurant' | 'Hotel' | 'Travel' | 'Marketplace' | 'Retail'
  | 'Medical' | 'Education' | 'RealEstate' | 'SaaS' | 'NGO' | 'Church' | 'Government';

export interface DetailSection {
  readonly order: number;
  readonly name: string;
  readonly purpose: string;
  readonly required: boolean;
  readonly answersQuestion: string;
  readonly cdaStage: 'Emotion' | 'Evidence' | 'Trust' | 'Decision' | 'Action';
  readonly trustEvidenceRef?: string | undefined;
}

export interface DetailPageStrategy {
  readonly industry: DetailPageIndustry;
  readonly pageType: 'menu' | 'room' | 'tour' | 'product' | 'doctor' | 'course' | 'property' | 'plan' | 'program' | 'listing';
  readonly sections: DetailSection[];
  readonly primaryCTA: string;
  readonly trustEvidenceOrder: string[];
  readonly objectionPriority: string[];
  readonly socialProofTypes: string[];
  readonly galleryStrategy: string;
  readonly comparisonStrategy?: string | undefined;
  readonly faqTopics: string[];
  readonly crossSellStrategy?: string | undefined;
  readonly upsellStrategy?: string | undefined;
  readonly relatedItemsStrategy?: string | undefined;
}

// ═══════════════════════════════════════════
// Industry Detail Strategy Library (12 industries)
// ═══════════════════════════════════════════

export const DETAIL_STRATEGY_LIBRARY: Record<string, DetailPageStrategy> = {
  // ── Restaurant Menu Detail ──
  'restaurant-menu': {
    industry: 'Restaurant', pageType: 'menu',
    sections: [
      { order: 1, name: 'Dish Hero Photo', purpose: '실제 음식 사진 (고해상도)', required: true, answersQuestion: '진짜 음식?', cdaStage: 'Emotion', trustEvidenceRef: 'r-photos' },
      { order: 2, name: 'Dish Description', purpose: '메뉴 설명 + 원산지', required: true, answersQuestion: '뭐가 들어갔나?', cdaStage: 'Evidence', trustEvidenceRef: 'r-origin' },
      { order: 3, name: 'Ingredients', purpose: '상세 식재료', required: false, answersQuestion: '알레르기?', cdaStage: 'Evidence' },
      { order: 4, name: 'Nutrition Info', purpose: '영양 정보', required: false, answersQuestion: '칼로리?', cdaStage: 'Evidence' },
      { order: 5, name: 'Chef Story', purpose: '셰프 시그니처 메뉴 story', required: false, answersQuestion: '왜 이 메뉴?', cdaStage: 'Trust', trustEvidenceRef: 'r-chef' },
      { order: 6, name: 'Reviews', purpose: '이 메뉴에 대한 리뷰', required: true, answersQuestion: '다른 사람은?', cdaStage: 'Trust', trustEvidenceRef: 'r-reviews' },
      { order: 7, name: 'Price + Add to Cart', purpose: '가격 + 주문', required: true, answersQuestion: '가격?', cdaStage: 'Action' },
      { order: 8, name: 'Related Dishes', purpose: '함께 주문하면 좋은 메뉴', required: false, answersQuestion: '더 추천?', cdaStage: 'Decision' },
    ],
    primaryCTA: 'Add to Order',
    trustEvidenceOrder: ['r-photos', 'r-reviews', 'r-chef', 'r-origin'],
    objectionPriority: ['o-price', 'o-veggie', 'o-allergy'],
    socialProofTypes: ['Review', 'Google', 'Press'],
    galleryStrategy: '고해상도 음식 사진 (다양한 각도)',
    comparisonStrategy: '비슷한 메뉴와 가격/재료 비교',
    faqTopics: ['알레르기', '채식 옵션', '매운 정도', '사이즈'],
    crossSellStrategy: '사이드 디시 + 음료 페어링',
    upsellStrategy: '라지 사이즈 / 프리미엄 토핑',
    relatedItemsStrategy: '같은 카테고리 인기 메뉴',
  },
  // ── Hotel Room Detail ──
  'hotel-room': {
    industry: 'Hotel', pageType: 'room',
    sections: [
      { order: 1, name: 'Room Gallery', purpose: '실제 객실 사진 (여러 각도)', required: true, answersQuestion: '실제 객실?', cdaStage: 'Emotion', trustEvidenceRef: 'h-rooms' },
      { order: 2, name: 'Room Details', purpose: '면적, 침대, 전망', required: true, answersQuestion: '크기?', cdaStage: 'Evidence' },
      { order: 3, name: 'Amenities', purpose: '객실 어메니티', required: true, answersQuestion: '뭐가 있나?', cdaStage: 'Evidence' },
      { order: 4, name: 'Policies', purpose: '체크인/체크아웃, 취소', required: true, answersQuestion: '취소 가능?', cdaStage: 'Trust' },
      { order: 5, name: 'Availability Calendar', purpose: '실시간 예약 가능', required: true, answersQuestion: '예약 가능?', cdaStage: 'Trust', trustEvidenceRef: 'h-official' },
      { order: 6, name: 'Guest Reviews', purpose: '이 객실 후기', required: true, answersQuestion: '후기?', cdaStage: 'Trust', trustEvidenceRef: 'h-guests' },
      { order: 7, name: 'Price + Book Now', purpose: '가격 + 예약', required: true, answersQuestion: '가격?', cdaStage: 'Action', trustEvidenceRef: 'h-best-price' },
    ],
    primaryCTA: 'Book Now',
    trustEvidenceOrder: ['h-rooms', 'h-guests', 'h-best-price', 'h-official'],
    objectionPriority: ['o-safe', 'o-late-checkin', 'o-wifi'],
    socialProofTypes: ['Review', 'Booking', 'Google', 'Award'],
    galleryStrategy: '객실 다각도 + 욕실 + 전망',
    comparisonStrategy: '다른 룸 타입과 비교표',
    faqTopics: ['체크인 시간', '취소 정책', '엑스트라 베드', '반려동물'],
    crossSellStrategy: '조식, 스파, 공항 픽업',
    upsellStrategy: '스위트 업그레이드',
    relatedItemsStrategy: '비슷한 가격대 객실',
  },
  // ── Travel Tour Detail ──
  'travel-tour': {
    industry: 'Travel', pageType: 'tour',
    sections: [
      { order: 1, name: 'Tour Gallery', purpose: '실제 투어 사진', required: true, answersQuestion: '실제 투어?', cdaStage: 'Emotion', trustEvidenceRef: 't-tour-photos' },
      { order: 2, name: 'Itinerary Timeline', purpose: '일자별 상세 일정', required: true, answersQuestion: '뭐 하나?', cdaStage: 'Evidence', trustEvidenceRef: 't-itinerary' },
      { order: 3, name: 'Map', purpose: '방문지 지도', required: true, answersQuestion: '어디 가나?', cdaStage: 'Evidence' },
      { order: 4, name: 'Guide Profile', purpose: '가이드 프로필', required: true, answersQuestion: '가이드?', cdaStage: 'Trust', trustEvidenceRef: 't-guide' },
      { order: 5, name: 'What\'s Included', purpose: '포함/불포함 사항', required: true, answersQuestion: '뭐 포함?', cdaStage: 'Evidence' },
      { order: 6, name: 'Reviews', purpose: '투어 후기', required: true, answersQuestion: '후기?', cdaStage: 'Trust', trustEvidenceRef: 't-reviews' },
      { order: 7, name: 'FAQ', purpose: '환불, 난이도, 준비물', required: true, answersQuestion: '환불?', cdaStage: 'Trust' },
      { order: 8, name: 'Book Now', purpose: '예약 + 캘린더', required: true, answersQuestion: '예약?', cdaStage: 'Action' },
    ],
    primaryCTA: 'Book Tour',
    trustEvidenceOrder: ['t-tour-photos', 't-guide', 't-reviews', 't-emergency'],
    objectionPriority: ['o-refund', 'o-language', 'o-difficulty'],
    socialProofTypes: ['TripAdvisor', 'Google', 'Instagram'],
    galleryStrategy: '실제 투어 사진 + 고객 사진',
    comparisonStrategy: '비슷한 투어 비교',
    faqTopics: ['환불 정책', '난이도', '준비물', '날씨'],
    crossSellStrategy: '현지 식사, 숙박 추가',
    upsellStrategy: '프라이빗 투어 업그레이드',
    relatedItemsStrategy: '같은 지역 다른 투어',
  },
  // ── Marketplace Product Detail ──
  'marketplace-product': {
    industry: 'Marketplace', pageType: 'product',
    sections: [
      { order: 1, name: 'Product Gallery', purpose: '실제 제품 사진', required: true, answersQuestion: '실제 제품?', cdaStage: 'Emotion', trustEvidenceRef: 'mk-verified' },
      { order: 2, name: 'Specifications', purpose: '상세 스펙', required: true, answersQuestion: '스펙?', cdaStage: 'Evidence' },
      { order: 3, name: 'Comparison', purpose: '유사 상품 비교', required: false, answersQuestion: '다른 제품과?', cdaStage: 'Evidence' },
      { order: 4, name: 'Reviews', purpose: '구매자 리뷰', required: true, answersQuestion: '후기?', cdaStage: 'Trust', trustEvidenceRef: 'mk-reviews' },
      { order: 5, name: 'Shipping Info', purpose: '배송 정보', required: true, answersQuestion: '배송?', cdaStage: 'Trust' },
      { order: 6, name: 'Returns Policy', purpose: '반품 정책', required: true, answersQuestion: '반품?', cdaStage: 'Trust', trustEvidenceRef: 'mk-escrow' },
      { order: 7, name: 'FAQ', purpose: '품질, 보증', required: true, answersQuestion: '품질?', cdaStage: 'Trust' },
      { order: 8, name: 'Buy Now', purpose: '구매', required: true, answersQuestion: '구매?', cdaStage: 'Action' },
    ],
    primaryCTA: 'Add to Cart',
    trustEvidenceOrder: ['mk-verified', 'mk-reviews', 'mk-escrow', 'mk-dispute'],
    objectionPriority: ['o-fraud', 'o-quality', 'o-shipping', 'o-refund'],
    socialProofTypes: ['Review', 'Certification', 'Community'],
    galleryStrategy: '제품 다각도 + 사용 시연',
    comparisonStrategy: '경쟁사 제품 스펙 비교표',
    faqTopics: ['정품 확인', '배송 시간', '반품 방법', '보증 기간'],
    crossSellStrategy: '관련 액세서리',
    upsellStrategy: '프리미엄 모델 / 연장 보증',
    relatedItemsStrategy: '같은 카테고리 인기 상품',
  },
  // ── Medical Doctor Profile ──
  'medical-doctor': {
    industry: 'Medical', pageType: 'doctor',
    sections: [
      { order: 1, name: 'Doctor Photo + Name', purpose: '의사 사진 + 이름 + 전공', required: true, answersQuestion: '어느 의사?', cdaStage: 'Emotion', trustEvidenceRef: 'm-doctor' },
      { order: 2, name: 'Credentials', purpose: '학회, 자격증', required: true, answersQuestion: '자격?', cdaStage: 'Trust', trustEvidenceRef: 'm-society' },
      { order: 3, name: 'Experience', purpose: '경력, 수술 건수', required: true, answersQuestion: '경험?', cdaStage: 'Evidence', trustEvidenceRef: 'm-count' },
      { order: 4, name: 'Treatments', purpose: '시술 가능 항목', required: true, answersQuestion: '때는 시술?', cdaStage: 'Evidence' },
      { order: 5, name: 'Equipment', purpose: '사용 장비', required: false, answersQuestion: '장비?', cdaStage: 'Evidence', trustEvidenceRef: 'm-equipment' },
      { order: 6, name: 'Patient Reviews', purpose: '환자 후기', required: true, answersQuestion: '후기?', cdaStage: 'Trust', trustEvidenceRef: 'm-reviews' },
      { order: 7, name: 'FAQ', purpose: '비용, 보험', required: true, answersQuestion: '비용?', cdaStage: 'Trust' },
      { order: 8, name: 'Book Appointment', purpose: '상담 예약', required: true, answersQuestion: '예약?', cdaStage: 'Action' },
    ],
    primaryCTA: 'Book Consultation',
    trustEvidenceOrder: ['m-doctor', 'm-society', 'm-cert', 'm-count', 'm-equipment', 'm-reviews'],
    objectionPriority: ['o-doctor', 'o-cost', 'o-insurance'],
    socialProofTypes: ['Certification', 'Review', 'Press'],
    galleryStrategy: '의사 + 진료실 + 장비',
    faqTopics: ['비용', '보험 적용', '회복 기간', '부작용'],
    crossSellStrategy: '관련 검진 패키지',
    upsellStrategy: '프리미엄 상담',
    relatedItemsStrategy: '같은 과 다른 의사',
  },
};

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

export function getDetailStrategy(industry: DetailPageIndustry, pageType: DetailPageStrategy['pageType']): DetailPageStrategy | null {
  const key = `${industry.toLowerCase()}-${pageType}`;
  return DETAIL_STRATEGY_LIBRARY[key] ?? null;
}

export function listAllDetailStrategies(): { key: string; industry: string; pageType: string; sectionCount: number }[] {
  return Object.entries(DETAIL_STRATEGY_LIBRARY).map(([key, s]) => ({
    key, industry: s.industry, pageType: s.pageType, sectionCount: s.sections.length,
  }));
}