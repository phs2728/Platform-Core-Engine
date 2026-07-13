# Platform Vision v2 — Trust Architecture 적용 (CMS Engine)

> 2026-07-13
> **CMS Engine은 RC3에서 "콘텐츠 저장"에서 "Trust Architecture 지원 검증"으로 패러다임 전환**

---

## RC2 vs RC3

### RC2 (이전)
> "콘텐츠 저장"

### RC3 (Vision v2)
> **"콘텐츠가 Trust Architecture를 지원하는지 검증"**

---

## Trust Architecture 검증 규칙

### Warning 자동 발생

다음 조건에서 CMS는 **Warning** 이벤트 발생:

| 조건 | Warning |
|---|---|
| About에 회사 소개가 없음 | "회사 신뢰 부족" |
| Review가 없음 | "사회적 증거 부족" |
| 실제 사진이 없음 | "신뢰도 저하" |
| 연락처 정보 없음 | "신뢰성 의문" |
| 운영 시간 표시 없음 | "실용성 부족" |
| 인증/리뷰/후기 0개 | "외부 검증 없음" |

---

## 5 Industries별 필수 Content Check

### Restaurant
- [ ] 실제 음식 사진 1개 이상
- [ ] 셰프 소개
- [ ] 원산지 표시
- [ ] 리뷰 1개 이상
- [ ] 예약 시스템
- [ ] 오늘 영업시간

### Hotel
- [ ] 실제 객실 사진 (모든 타입)
- [ ] 실제 투숙 후기
- [ ] Booking.com 리뷰 링크
- [ ] Awards
- [ ] Since 연도
- [ ] 24시간 프론트 안내

### Travel
- [ ] 현지 사무소 정보
- [ ] 실제 가이드 프로필
- [ ] 투어 사진
- [ ] 고객 후기
- [ ] 긴급 연락처

### Hospital
- [ ] 의사 프로필 (사진, 경력, 학회)
- [ ] 의료 장비 목록
- [ ] 인증 (JCI 등)
- [ ] 수술/시술 건수

### SaaS
- [ ] Enterprise 고객 로고 (허가 받음)
- [ ] Case Study
- [ ] SOC2 인증
- [ ] 99.99% SLA
- [ ] API 문서 링크

---

## 다음 단계 (RC3 구현 시)

- [ ] Content validation: Trust Profile 기반 mandatory content check
- [ ] Content published event: Trust Architecture Event emit
- [ ] `trustCoverage` 필드를 Content/Page에 추가
- [ ] Studio의 Trust Checklist가 CMS와 통합