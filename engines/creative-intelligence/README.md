# Creative Intelligence Engine RC3 — Customer Psychology Director

> Phase 7 · Sprint RC3 · v1.0.0-rc3
> **Platform Vision v2 (사장님 확립 2026-07-13)**

## Mission (RC3 — Platform Vision v2)

**AI는 점수를 매기지 않는다. Trust Evidence를 배치한다.**

Platform은 점수를 보여주는 시스템이 아니라, **고객이 회사를 신뢰하는 것을 설계하는 시스템**이다.

---

## 이전 (RC2) vs 이후 (RC3)

| 영역 | RC2 | RC3 |
|---|---|---|
| **역할** | Senior Art Director | Customer Psychology Director |
| **출력** | 점수 (Premium/Luxury/AI Score) | Trust Evidence 배치 + 7대 산출물 |
| **UI 노출** | 점수 표시 (95/100) | **점수 표시 금지** — evidence 추천만 |
| **평가 방식** | 시각적 점수화 | Trust Architecture 분석 |
| **신뢰 요소** | 디자인 품질 | **산업별 Trust Evidence (5 Industries)** |

---

## 5 Industries × Trust Evidence

5개 산업의 Trust Profile을 내장:

- **Restaurant** — 실제 음식 사진, 셰프, 원산지, 리뷰, 예약, 오늘 영업, 매장 사진, 위치
- **Hotel** — 실제 객실, 실제 투숙객, Booking Reviews, Google Reviews, Awards, Since, 24h, Best Price, 공식 사이트
- **Travel** — 현지 운영, 실제 가이드, 투어 사진, 후기, 여행 일정, 현지 사무소, 긴급 연락, 파트너
- **Hospital** — 의사, 학회, 경력, 장비, 인증, 수술 건수, 후기
- **SaaS** — Enterprise 고객, Case Study, SOC2, ISO, 99.99%, Security, API, Documentation
- **Marketplace** — Verified Sellers, Escrow, 분쟁 해결, 리뷰
- **Generic** — 회사 소개, 연락처, 리뷰

---

## 7대 신규 산출물 (RC3)

1. **Trust Architecture Report** — 산업별 신뢰 요소 매핑 + coverage + gaps
2. **Customer Psychology Report** — 고객 의사결정 과정 (불안 → 신뢰 → 행동)
3. **Evidence Placement Strategy** — Evidence를 어디에 배치할지
4. **Objection Map** — 고객 우려 사항과 해소 방법
5. **Confidence Journey** — 신뢰 형성 단계
6. **Decision Journey** — 행동 결정 단계
7. **Trust Checklist** — 최종 검증 (Evidence가 모두 배치되었는지)

---

## 점수 표시 금지 (V2 Vision Enforcement)

다음은 UI에 절대 표시 금지:
- ❌ Trust Score, Premium Score, Luxury Score
- ❌ Company Score, Website Score, AI Score
- ❌ "95/100" 형태의 점수

`validateTrustUIPattern()` 함수로 검증.

---

## UseCases

### Trust Architecture (RC3 신규 8개)
- generateTrustArchitectureReportUseCase
- generateCustomerPsychologyReportUseCase
- generateEvidencePlacementStrategyUseCase
- generateObjectionMapUseCase
- generateConfidenceJourneyUseCase
- generateDecisionJourneyUseCase
- generateTrustChecklistUseCase
- getIndustryTrustProfileUseCase

### RC2 (유지 — 점수는 내부 계산용)
- Art Direction (4), Visual Review (15), Critique (2), Guides (3), Gate (2), Report (1)

**총 38 UseCases**

---

## Merge Gate

```
pnpm install   PASS
pnpm typecheck PASS
pnpm test      PASS (60+)
pnpm build     PASS
Examples       PASS
Import Boundary PASS
Industry Agnostic PASS
점수 표시 금지  PASS (validateTrustUIPattern)
```