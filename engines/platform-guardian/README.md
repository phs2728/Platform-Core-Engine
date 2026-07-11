# Platform Guardian

> **Platform CTO AI — Platform의 마지막 Gate. 모든 Compatibility Suite 결과를 종합하여 최종 Merge 여부를 결정한다. NO BUSINESS LOGIC. PLATFORM GOVERNANCE ONLY.**

**Version**: 0.1.0 (Draft — RC1)
**Phase**: 1 (Foundation)
**Branch**: `feature/platform-compatibility-suite`

---

## 목적

Platform Guardian은 Platform의 CTO 역할을 수행하는 AI입니다.

코드를 작성하는 것이 목적이 아닙니다. **Platform의 품질과 안정성을 보호하는 것이 목적입니다.**

Compatibility Suite의 모든 검증 결과를 종합하여:
- **Architecture Audit** — 레이어, 결합도, 경계, 드리프트
- **Risk Analysis** — critical/high/medium/low 위험 분류
- **Technical Debt** — 기술 부채 항목 및 심각도
- **Roadmap** — 다음 엔진, RFC, 마이그레이션 추천
- **Guardian Score** — AAA~F 등급 (6개 서브스코어)
- **Merge Decision** — APPROVED / CONDITIONS / REVIEW / REJECTED

---

## CLI

```bash
pnpm guardian          # Full scan + reports
pnpm guardian:scan     # 동일
pnpm guardian:merge    # Merge gate decision only
pnpm guardian:release  # Score only
pnpm guardian:roadmap  # Roadmap only
pnpm guardian:health   # Full scan + 5 reports
```

---

## Guardian Score (6 Sub-Scores)

| Dimension | Weight | 설명 |
|---|---|---|
| Architecture | 20% | 레이어링, 경계, 결합도, 드리프트 |
| Compatibility | 20% | 매트릭스 통과율, 이벤트/참조 건강도 |
| Contracts | 20% | 계약 위반, Breaking Change |
| Maintainability | 15% | 헬스 스코어, 기술 부채 |
| Security | 15% | 경계 위반, 금지된 import, 소유권 충돌 |
| Performance | 10% | 의존성 깊이, 결합 오버헤드 |

### Grade Mapping

| Score | Grade |
|---|---|
| 97–100 | AAA |
| 90–96 | AA |
| 80–89 | A |
| 70–79 | B |
| 60–69 | C |
| 50–59 | D |
| 0–49 | F |

---

## Decision Logic

| Condition | Decision |
|---|---|
| 순환 참조 | REJECTED |
| Critical 위험 (미해결) | REJECTED |
| Breaking Change (마이그레이션 없음) | REJECTED |
| Grade F | REJECTED |
| Grade D | REVIEW_REQUIRED |
| High 위험 | APPROVED_WITH_CONDITIONS |
| Warning 존재 | APPROVED_WITH_CONDITIONS |
| Clean | APPROVED |

---

## Reports (5개 자동 생성)

```
docs/platform/
├── guardian-report.md       ← 최종 의사결정 + 종합 점수
├── architecture-report.md   ← 아키텍처 분석
├── technical-debt.md         ← 기술 부채 항목
├── risk-report.md            ← 위험 분석
└── roadmap.md                ← 로드맵 추천
```

---

## Architecture

```
src/
├── interfaces/index.ts              ← 모든 Guardian 타입
├── analyzers/
│   ├── ArchitectureAnalyzer         ← 아키텍처 점수 (6 categories)
│   ├── RiskAnalyzer                 ← 위험 평가 (7 categories)
│   ├── TechnicalDebtAnalyzer        ← 부채 분석 (8 categories)
│   └── RoadmapGenerator             ← 전략 추천
├── scorer/GuardianScorer            ← 6개 서브스코어 → AAA~F
├── decision/GuardianDecisionMaker   ← APPROVED/CONDITIONS/REVIEW/REJECTED
├── report/GuardianReportGenerator   ← 5개 마크다운 리포트
├── use-cases/GuardianUseCases       ← 6개 유스케이스
├── infrastructure/                  ← Input providers + Report writers
└── index.ts                         ← Public API
```

---

## Tests

```bash
pnpm test   # 100 tests
```

| Category | Tests |
|---|---|
| Architecture | 14 |
| Risk | 14 |
| Technical Debt | 12 |
| Roadmap | 12 |
| Score & Decision | 14 |
| Report Generation | 12 |
| Use Cases | 12 |
| Integration | 10 |
| **Total** | **100** |
