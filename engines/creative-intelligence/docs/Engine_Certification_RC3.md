# Engine Certification — Creative Intelligence Engine RC3

> Sprint: Platform Vision v2 — Customer Psychology Director · 2026-07-13

## 패러다임 전환 (RC2 → RC3)

| 영역 | RC2 | RC3 |
|---|---|---|
| **Mission** | Senior Art Director | **Customer Psychology Director** |
| **출력** | 점수 (Premium/Luxury/AI Score) | **Trust Evidence 배치** |
| **UI 노출** | 점수 표시 | **점수 표시 절대 금지** |
| **신뢰 요소** | 디자인 품질 | **5 Industries × Trust Profile** |
| **신규 산출물** | 7개 reports | **7개 Trust Architecture 산출물** |

---

## V2 Vision Mission (확립)

> "AI는 점수를 매기지 않는다. Trust Evidence를 배치한다."

Platform은 점수를 보여주는 시스템이 아니라, **고객이 회사를 신뢰하는 것을 설계하는 시스템**이다.

---

## 5 Industries × Trust Profile

| Industry | Evidence Count | Top Signals |
|---|---|---|
| **Restaurant** | 8 | food photos, chef face, live reservation, operating hours, reviews |
| **Hotel** | 9 | real rooms, verified reviews, since year, 24h desk, best price |
| **Travel** | 8 | local operation, real guide, tour photos, local office, 24h emergency |
| **Hospital** | 7 | doctor profile, society, certification, equipment, case count |
| **SaaS** | 8 | enterprise logos, SOC2, 99.99% uptime, case study, API docs |
| **Marketplace** | 4 | verified seller, escrow, dispute resolution, reviews |
| **Generic** | 3 | about, contact, reviews |

---

## 7 Trust Architecture 산출물 (RC3)

1. **Trust Architecture Report** — Industry별 evidence 매핑 + coverage + gaps
2. **Customer Psychology Report** — 5단계 pathway (Anxiety→Discovery→Evaluation→Confidence→Action)
3. **Evidence Placement Strategy** — Evidence를 어디에 배치할지
4. **Objection Map** — 고객 우려 사항과 해소 방법 (severity High/Medium/Low)
5. **Confidence Journey** — 신뢰 형성 단계 (confidenceGain 합산)
6. **Decision Journey** — 행동 결정 5단계 (신뢰→사회적 증거→실용성→질문 해소→행동)
7. **Trust Checklist** — 최종 검증 (Evidence 배치 여부 + Pass/Fail/Warning)

---

## 점수 표시 금지 (V2 Vision Enforcement)

`validateTrustUIPattern()` 함수로 8개 패턴 검증:

```
Forbidden: Trust Score, Premium Score, Luxury Score, Company Score,
            Website Score, AI Score, 95/100, 점수
```

UI 노출 시 **false** 반환 (즉시 노출 금지).

---

## UseCases (38개)

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
- **총 38 UseCases (RC2: 30 + RC3: 8)**

---

## Architecture: A

- Clean separation: interfaces → domain → infrastructure → use-cases → index
- 23 domain entities + 7 Trust Architecture re-exports from core-sdk
- 28 events
- 8 InMemory repositories
- INDUSTRY_TRUST_PROFILES (5 industries, 47 evidence total)
- MockCreativeDirector (Senior Art Director simulation, 점수 내부 계산용)

## Platform: A

- EngineName union updated ('creative-intelligence')
- Constitution C-1~C-23 준수
- engine.json strict_boundaries explicitly lists owns + forbidden
- **V2 Vision 추가: 점수 UI 금지 명시**

## Security: A

- Tenant isolation all repositories
- Trust Checklist enforces strict thresholds
- 점수 UI 노출 차단 (validateTrustUIPattern)

## Performance: A

- Deterministic scoring (no external calls in test path)
- Trust Evidence 매칭은 Map lookup
- 점수는 내부 계산용, UI 노출 없음

## Maintainability: A

- 4 use-case files (ArtDirection / VisualReview / CritiqueApproval / **TrustArchitecture**) by concern
- INDUSTRY_TRUST_PROFILES 중앙 집중 관리
- 6 examples (5 RC2 + 1 RC3 Trust Architecture)

## Test: A

- **79 tests PASS** (RC2 51 + RC3 28)
- 5 Industries Trust Profile (6): 8/9/8/7/8 evidence
- 7 Trust Architecture Deliverables (7)
- 점수 표시 금지 (8 forbidden patterns)
- Customer Psychology Pathway (5 stages)
- Trust Checklist Coverage (0% / 100%)

## Backward Compatibility: A (RC3 promotion)

- v1.0.0-rc3
- Public API: 30 RC2 UCs + 8 RC3 UCs = 38 total
- INDUSTRY_TRUST_PROFILES exported as data
- validateTrustUIPattern exported for callers

---

## Merge Gate Summary

| Gate | Result |
|---|---|
| Build | ✅ PASS |
| Typecheck | ✅ PASS |
| Tests | ✅ PASS (79/79) |
| Examples | ✅ PASS (6/6) |
| Import Boundary | ✅ PASS (0 violations) |
| Industry Agnostic | ✅ PASS (0 violations) |
| **점수 표시 금지** | ✅ PASS (validateTrustUIPattern 테스트) |

**Overall: CONDITIONAL PASS → RC3**

---

## Acceptance

> "Platform이 더 이상 점수를 보여주는 AI가 아니라, 고객이 회사를 신뢰하도록 설계하는 플랫폼이 되었는가?"

**YES** ✅

---

## 5대 엔진 RC3 영향 (다음 단계)

| 엔진 | RC3 변경 |
|---|---|
| **Experience Engine** | "Layout 만들기" → "불안→신뢰→행동 Journey 설계" |
| **Theme Engine** | "색상 생성" → "브랜드 신뢰감 표현" |
| **Component Engine** | "Component 만들기" → "Trust 목적 Component 설계" |
| **CMS Engine** | "콘텐츠 저장" → "Trust Architecture 지원 검증" |
| **Studio Engine** | "웹사이트 생성" → "신뢰 경험 생성" |

각 엔진 docs/TRUST_ARCHITECTURE_RC3.md 작성 완료.

---

## 변경 이력

- 2026-07-13: Platform Vision v2 확립 (사장님 승인)
- 2026-07-13: Creative Intelligence RC3 (점수 제거 + 7 Trust 산출물)
- 2026-07-13: 5대 엔진 docs TRUST_ARCHITECTURE_RC3.md 작성
- 2026-07-13: VISION_V2.md (Platform 철학) 작성
- 2026-07-13: core-sdk Trust Architecture 타입 추가
- 다음: 5대 엔진 RC3 실제 구현 (Trust Architecture 통합)