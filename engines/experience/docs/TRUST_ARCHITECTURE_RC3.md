# Platform Vision v2 — Trust Architecture 적용 (Experience Engine)

> 2026-07-13
> **Experience Engine은 RC3에서 "예쁜 Layout"에서 "신뢰 형성 경험"으로 패러다임 전환**

---

## RC2 vs RC3

### RC2 (이전)
> "예쁜 Layout 만들기"

### RC3 (Vision v2)
> **"고객이 불안 → 신뢰 → 행동으로 이동하도록 설계"**

---

## Trust Architecture 적용

Experience Engine은 다음을 책임진다:

1. **Customer Journey** — 방문자가 페이지에서 어디로 이동하는지
2. **Trust Stages** — Anxiety → Discovery → Evaluation → Confidence → Action
3. **Evidence Placement Slots** — Trust Evidence가 자연스럽게 배치되는 영역

---

## 통합 도메인 (Platform Vision v2)

Experience Engine의 Layout slot은 Creative Intelligence의 **5 Industries × Trust Profile**과 직접 연동:

| Industry | Trust Stage별 우선 Evidence |
|---|---|
| **Restaurant** | Anxiety: 사진/리뷰 → Discovery: 셰프/메뉴 → Action: 예약/영업시간 |
| **Hotel** | Anxiety: 객실 사진 → Confidence: Booking/Google 리뷰 → Action: Best Price |
| **Travel** | Anxiety: 현지 운영 → Discovery: 가이드/투어 → Action: 긴급 연락 |
| **Hospital** | Anxiety: 의사/학회 → Confidence: 인증/장비 → Action: 예약 |
| **SaaS** | Anxiety: SOC2/99.99% → Discovery: Enterprise → Action: API/Free Trial |

---

## 다음 단계 (RC3 구현 시)

- [ ] Experience types를 Trust Stage와 매핑
- [ ] Component binding 시 Evidence placement 자동 추천
- [ ] Studio가 Layout 선택 시 Industry Trust Profile 자동 조회