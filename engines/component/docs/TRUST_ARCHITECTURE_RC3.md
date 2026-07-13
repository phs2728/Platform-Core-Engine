# Platform Vision v2 — Trust Architecture 적용 (Component Engine)

> 2026-07-13
> **Component Engine은 RC3에서 "Component 만들기"에서 "Trust 목적 Component 설계"로 패러다임 전환**

---

## RC2 vs RC3

### RC2 (이전)
> "Component 만들기"

### RC3 (Vision v2)
> **"모든 Component는 Trust 목적을 가져야 한다"**

---

## Component별 Trust 목적

| Component | Trust 목적 |
|---|---|
| **Hero** | 감성 → 신뢰 → 행동 (3초 안에 신뢰 형성) |
| **Review** | 사회적 증거 (다른 사람의 검증) |
| **About** | 회사 신뢰 (누가, 언제부터, 무엇을) |
| **FAQ** | 불안 제거 (예상 질문 해소) |
| **CTA** | 행동 유도 (명확한 다음 단계) |
| **Testimonial** | 실사용자 후기 (구체적 결과) |
| **Team** | 사람 신뢰 (얼굴, 경력) |
| **Certifications** | 외부 검증 (인증, 수상) |
| **Pricing** | 투명성 (숨김 없음) |

---

## 5 Industries별 필수 Components

### Restaurant
- ChefSection, MenuDisplay, ReservationCTA, OpenToday, ReviewsBlock, Location

### Hotel
- RoomGallery, BookingReviews, AwardsSection, Since, BestPriceBadge, OfficialSite

### Travel
- LocalOffice, GuideProfile, TourGallery, EmergencyContact, LocalPartner

### Hospital
- DoctorProfile, SocietyAffiliations, EquipmentGallery, Certifications, CaseCount

### SaaS
- EnterpriseLogos, CaseStudyCard, SOC2Badge, UptimeSLA, APIDocLink

---

## 다음 단계 (RC3 구현 시)

- [ ] Component Manifest에 `trustPurpose` 필드 추가
- [ ] Component Taxonomy를 Industry별로 분리
- [ ] ComponentRegistry가 Trust Profile과 자동 매핑
- [ ] Studio가 Component 선택 시 Trust Evidence 자동 완성