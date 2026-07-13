# Creative Intelligence RC2 — Senior Art Director Upgrade

> 사장님 확립 2026-07-13
> **"AI가 만든 것 같은 웹"이 아니라 "세계적인 디지털 에이전시가 만든 것 같은 웹"**

---

## Mission

Creative Intelligence Engine을 **Senior Art Director + Creative Director + UX Director + Brand Strategist + Conversion Director** 수준으로 업그레이드한다.

이 엔진은 더 이상 "디자인 생성"이 아니라 **세계 최고 수준의 디자인 품질을 판단하고 개선하는 것**이다.

---

## 첫 3초 임프레션 목표

사용자가 웹사이트를 본 **첫 3초** 안에 다음 인상을 받아야 한다:

- **Premium** (고급스러움)
- **Trust** (신뢰감)
- **Boutique** (독점성)
- **Luxury** (럭셔리감)
- **Modern** (현대성)
- **Professional** (전문성)

---

## 절대 원칙 (Constitution C-1 ~ C-23)

- **Industry Agnostic** — 도메인별 평가 기준 사용 안 함 (Luxury/Premium/Boutique는 보편 디자인 언어)
- **Business Logic 금지** — 결제/주문/예약 등의 비즈니스 플로우 개입 금지
- **Host Interface만 사용** — 외부 엔진은 read-only Host Interface로만 호출
- **새 헌법 생성 금지** — 기존 Constitution 준수

---

## 신규 Domain (23 entities)

### Art Direction Layer
- `ArtDirection` — 스타일별 (Luxury/Premium/Editorial/Boutique/Corporate/Minimal/Modern/Playful) 룰
- `VisualStory` — Emotion → Story → Trust → Action 흐름 평가
- `FirstImpression` — 3초 안에 전달되는 신뢰/고급감/브랜드/전문성/기억성 점수

### Visual Review Layer
- `VisualHierarchy` — 시각적 위계 평가
- `Composition` — 화면 구성 평가
- `PhotographyDirection` — Mood/Lighting/Composition/People/Environment/Camera Angle/Depth/Color Temperature/Negative Space
- `TypographyDirection` — Scale/Contrast/Weight/Line Height/Reading Rhythm/Headline Impact
- `WhitespaceStrategy` — 여백 전략
- `GridSystem` — 그리드 시스템
- `VisualRhythm` — 시각적 리듬
- `VisualConsistency` — 시각적 일관성

### Review & Score Layer
- `PremiumReview` — Premium/Luxury/Trust/Visual Hierarchy/Whitespace/Typography/Photography/Composition/Micro Interaction/Consistency 10 dimensions
- `DesignCritique` — Senior Art Director 비평
- `DesignRecommendation` — 자동 생성된 개선안
- `ConversionReview` — CTA/Above-the-fold/Emotional Journey
- `EmotionalJourney` — 감정 흐름 평가 (CTA가 먼저 나오면 감점)
- `InteractionReview` — Micro Interaction 평가
- `MicroInteractionProfile` — Micro Interaction 디자인
- `MotionDirection` — Motion 디자인

### AI Artifact Detection
- `AIArtifactDetection` — AI Layout/Copy/Hero/Card/CTA/Gradient/Icon Pattern/Generic Section/Template Feeling 9 categories
- `BrandEmotion` — 브랜드 감정
- `BrandExpression` — 브랜드 표현
- `LuxuryScore` — Luxury/Boutique/Premium/Editorial/Emotional/Minimal/Modern 7 dimensions

---

## 신규 UseCases (30+)

### Visual Review (12)
- reviewFirstImpressionUseCase
- reviewPremiumQualityUseCase
- reviewVisualHierarchyUseCase
- reviewWhitespaceUseCase
- reviewTypographyUseCase
- reviewPhotographyUseCase
- reviewCompositionUseCase
- reviewScrollExperienceUseCase
- reviewMicroInteractionUseCase
- reviewVisualConsistencyUseCase
- reviewBrandExpressionUseCase
- reviewEmotionalJourneyUseCase

### Conversion + AI Smell + Luxury (3)
- reviewConversionUseCase
- reviewAISmellUseCase
- reviewLuxuryUseCase

### Generation (6)
- generateCreativeCritiqueUseCase
- generateArtDirectionUseCase
- generateVisualRecommendationsUseCase
- generatePhotographyGuideUseCase
- generateMotionGuideUseCase
- generateInteractionGuideUseCase

### Quality Gate (2)
- approveCreativeUseCase
- rejectCreativeUseCase

### Report (4)
- generateCreativeReviewReportUseCase
- generateArtDirectionReportUseCase
- generatePremiumReportUseCase
- generateLuxuryReportUseCase

### Three Second + Misc (3)
- generateThreeSecondReportUseCase
- generateDesignCritiqueReportUseCase
- generateDesignRecommendationReportUseCase

총 **30+ UCs**

---

## Art Direction Styles

Engine은 8개 스타일별 Art Direction Rule 보유:

- **Luxury** — Generous whitespace, Editorial typography, Subtle motion, AAA contrast
- **Premium** — Strong hierarchy, High-end photography, Refined interactions
- **Editorial** — Magazine-style layout, Long-form typography, Generous whitespace
- **Boutique** — Curated feel, Personal touch, Distinctive voice
- **Corporate** — Professional, Trustworthy, Clear hierarchy, Conservative
- **Minimal** — Less is more, White space dominant, Single focal point
- **Modern** — Cutting-edge, Asymmetric, Bold typography, Vibrant accents
- **Playful** — Vibrant colors, Dynamic motion, Casual voice, Illustrated elements

---

## Photography Direction

생성:
- Mood (Emotion/Energy)
- Lighting (Natural/Studio/Golden Hour/etc.)
- Composition (Rule of Thirds/Symmetry/etc.)
- People (Candid/Posed/Solo/Group)
- Environment (Interior/Exterior/Urban/Natural)
- Camera Angle (Eye-level/Top-down/Low-angle)
- Depth (Shallow DOF/Deep Focus)
- Color Temperature (Warm/Cool/Neutral)
- Negative Space (Generous/Tight)

---

## Typography Direction

결정:
- Scale (Display/Heading/Body/Caption)
- Contrast (Bold/Regular/Light)
- Weight (300/400/500/600/700/800)
- Line Height (Tight/Standard/Loose)
- Reading Rhythm (Editorial/Scannable)
- Headline Impact (Statement/Subtle)

---

## Visual Story 평가 흐름

모든 페이지는 다음 순서로 평가:

```
Emotion → Story → Trust → Action
```

**CTA가 먼저 나오면 감점** (Story가 부족하다는 신호)

---

## Premium Score (10 dimensions)

- Premium Feeling
- Luxury
- Trust
- Visual Hierarchy
- Whitespace
- Typography
- Photography
- Composition
- Micro Interaction
- Consistency

---

## 3-Second Impression Score (5 dimensions)

3초 안에 전달되는지:
- 신뢰 (Trust)
- 고급감 (Premium Feeling)
- 브랜드 (Brand Recognition)
- 전문성 (Professionalism)
- 기억성 (Memorability)

---

## AI Artifact Detection (9 categories)

탐지:
- AI Layout (반복적 그리드 패턴)
- AI Copy ("Unlock your potential" 류 클리셰)
- AI Hero (3D-rendered character + gradient overlay)
- AI Card (border + shadow + glassmorphism 남용)
- AI CTA (빨간 버튼 + "Get Started")
- AI Gradient (purple→blue 그라데이션)
- AI Icon Pattern (lucide/react 기본 아이콘)
- Generic Section (Features × 3, Pricing × 3)
- Template Feeling (WordPress/Wix 템플릿 느낌)

발견 시:
- **Reject** → 자동 거절
- **Rewrite** → Copy 재작성 요청
- **Regenerate** → 디자인 재생성 요청

---

## Design Critique (Senior Art Director 톤)

비평 생성 예:

```
"Hero가 약함 — 첫 스크롤에서 신뢰감을 주지 못함"
"사진이 브랜드와 맞지 않음 — 라이프스타일이 보이지 않음"
"Whitespace 부족 — 럭셔리 느낌이 깨짐"
"CTA 너무 이름 — 강요 느낌"
"Typography Scale 문제 — Editorial 리듬 부족"
"Story Flow 부족 — Emotional Journey가 끊김"
```

---

## Luxury Review (7 dimensions)

- Luxury
- Boutique
- Premium
- Editorial
- Emotional
- Minimal
- Modern

---

## Quality Gate

아래 조건 **하나라도** 미달 시 **Approve 금지**:

```
First Impression     ≥95
Premium              ≥95
Trust                ≥95
Luxury               ≥90
Brand                ≥95
Typography           ≥95
Whitespace           ≥95
Hierarchy            ≥95
Photography          ≥95
Visual Story         ≥90
AI Smell             ≤5   (lower is better)
```

---

## Reports (자동 생성)

- Creative Review Report
- Art Direction Report
- Premium Report
- Luxury Report
- 3-Second Report
- Design Critique Report
- Design Recommendation Report

---

## Acceptance

> "Creative Intelligence RC2를 삭제하면 플랫폼의 Senior Art Direction, Premium Design Review, Luxury Review, First Impression Review, AI Artifact Detection이 모두 사라지는가?"

**YES**

---

## 최종 목표

Creative Intelligence는 단순한 AI가 아니라:

```
Creative Director
+
Senior UX Director
+
Senior Art Director
+
Brand Strategist
+
Conversion Director
```

의 역할을 수행한다.

생성된 디자인이 세계 최고 수준의 **Boutique Hospitality, Luxury Travel, SaaS, Marketplace, Restaurant, Hotel** 웹사이트와 비교해도 경쟁력이 있는지 **스스로 평가**하고, 기준에 미달하면 **자동으로 개선안을 제시**한 뒤 **재생성을 요구**한다.

---

## 다음 단계 (사장님 권장)

이 업그레이드 완료 후, **Design Benchmark Engine**을 마지막으로 하나 더 추가:
- Apple, Stripe, Airbnb, Aman Resorts, Four Seasons, Linear, Notion 등 우수 사례의 "원칙" 비교·평가
- Creative Knowledge = "수집"
- Creative Intelligence = "판단"
- **Design Benchmark = "비교 기준"**

이 3-Engine이 합쳐져서 플랫폼의 디자인 품질을 한 단계 더 끌어올림.

---

## 변경 이력

- 2026-07-13: Sprint RC2 시작, Senior Art Director 수준 업그레이드 확정 (사장님 승인)