# Platform Definition of Done (DoD)

> **모든 프로젝트가 "완료되었다"고 인정받기 위한 절대 기준**
>
> 사장님 확립 2026-07-13
>
> 이 체크리스트를 모두 통과해야만 `Project Completed`가 됩니다.
> 하나라도 누락되면 `Project Incomplete`입니다.

---

## Phase 1: Discovery & Strategy

| # | Check | Requirement | Evidence |
|---|---|---|---|
| ☐ 1 | **Client Interview 완료** | 클라이언트와의 구체적인 인터뷰 완료, 요구사항 문서화 | Interview notes |
| ☐ 2 | **Industry Classification 확정** | PAG Decision Tree에 따라 Industry + Sub-type 확정 | Classification record |
| ☐ 3 | **Research 완료** | Research Swarm 실행: 고객 심리, 경쟁사, 시장 분석 | Research output |
| ☐ 4 | **Brand Strategy 승인** | Art Direction, Brand Voice, Copy Framework 정의 및 승인 | Creative Director sign-off |
| ☐ 5 | **Playbook 선택 완료** | Playbook Selection Matrix에 따라 deterministic 선택 | Playbook ID recorded |

## Phase 2: Architecture & Trust

| # | Check | Requirement | Evidence |
|---|---|---|---|
| ☐ 6 | **Trust Architecture 적용 완료** | Industry별 Trust Evidence 배치 전략 수립 및 적용 | Trust Architecture Report |
| ☐ 7 | **Customer Decision Architecture 적용 완료** | CDA 10-stage journey + CQM (Customer Question Model) 적용 | CDA Report |
| ☐ 8 | **Skill Pack 적용 완료** | Skill Selection Matrix에 따라 Pack 선택 및 실행 | Pack execution log |
| ☐ 9 | **Story Architecture 적용** | Emotion → Story → Evidence → Trust → Decision → Action | Story flow documented |

## Phase 3: Design & Content

| # | Check | Requirement | Evidence |
|---|---|---|---|
| ☐ 10 | **Theme Manifest 생성** | Theme Engine에서 ThemeManifest 생성 (colors, typography, spacing, motion) | ThemeManifest snapshot |
| ☐ 11 | **Photo Direction 확정** | 실제 사진 (stock 아님), 브랜드 무드, 조명, 구도 방향성 확정 | Photo direction doc |
| ☐ 12 | **Copy Review 완료** | Senior Copywriter review: benefit-first, no jargon, no placeholder | Copy review sign-off |

## Phase 4: Engineering & Generation

| # | Check | Requirement | Evidence |
|---|---|---|---|
| ☐ 13 | **Component Manifest 생성** | Component Engine에서 Manifest 생성 (Theme 참조, read-only) | ComponentManifest snapshot |
| ☐ 14 | **CMS Content 입력 완료** | 모든 페이지 콘텐츠, Trust Evidence, FAQ, CTA 입력 | Content audit |
| ☐ 15 | **Frontend Generation 완료** | Target framework (Next.js/React/Vue) 코드 생성 | Build PASS |

## Phase 5: Quality Gates (QES)

| # | Check | Requirement | Evidence |
|---|---|---|---|
| ☐ 16 | **QES Assessment: PASS** | `assessPage()` 모든 페이지 PASS (FAIL/WARNING 없음) | QES report |
| ☐ 17 | **AI Smell Detection: 0 rejects** | 13개 AI Smell 규칙 중 0개 reject | AI Smell report |
| ☐ 18 | **Professional Review: 9/9 PASS** | 모든 9 reviewer (Creative Director → Conversion Specialist) PASS | Review records |
| ☐ 19 | **Accessibility: WCAG AAA PASS** | 색상 대비, 키보드 네비게이션, 스크린 리더, ARIA | A11y audit |
| ☐ 20 | **SEO: Structured Data PASS** | JSON-LD, meta tags, sitemap, hreflang | Google Rich Results Test |
| ☐ 21 | **Performance: Core Web Vitals PASS** | LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms | Lighthouse / CrUX |
| ☐ 22 | **Mobile: Responsive PASS** | 모든 페이지 mobile-first 검증 | Mobile screenshots |
| ☐ 23 | **Execution Level: meets minimum** | Playbook.minimumLevel 달성 | QES level report |

## Phase 6: Deployment

| # | Check | Requirement | Evidence |
|---|---|---|---|
| ☐ 24 | **Deployment PASS** | Production 배포 완료, curl 200 확인 | Deploy log + HTTP 200 |
| ☐ 25 | **Analytics Setup 완료** | GA4 이벤트 트래킹 설정 | Analytics config verified |
| ☐ 26 | **Sitemap 제출 완료** | XML sitemap 생성, Google Search Console 제출 | Sitemap URL |

## Phase 7: Learning & Evolution

| # | Check | Requirement | Evidence |
|---|---|---|---|
| ☐ 27 | **Learning Engine 업데이트 완료** | 프로젝트 메트릭을 Knowledge Base에 피드백 | Learning event recorded |
| ☐ 28 | **Knowledge Evolution 완료** | 발견된 pattern/anti-pattern을 Knowledge Asset으로 저장 | Knowledge assets created |
| ☐ 29 | **Executive Memory 업데이트** | 성공/실패 패턴을 Executive Memory에 기록 | Memory entries stored |

---

## Completion Certificate

```
Project: _______________________________
Industry: _______________________________
Playbook: _______________________________
QES Level Achieved: _____________________
Reviewer: _______________________________
Date: _________________________________

All 29 checks: ✅ PASS

Project Status: COMPLETED
```

---

## Absolute Rules

1. **QES FAIL → Project Cannot Ship. No exceptions. No overrides.**
2. **AI Smell reject → Automatic QES FAIL.**
3. **Accessibility FAIL → Automatic QES FAIL.**
4. **Missing Trust Evidence → Automatic QES FAIL.**
5. **No Learning feedback → Project not considered complete.**
6. **"Completed" requires all 29 checks. Not 28. Not 26. All 29.**

---

> "생각으로 끝나면 실패, Repo가 더 좋아져야 완료. 배포했니? = 배포 + curl 200 + QES PASS + Learning까지가 완료."
>
> — 사장님 운영 원칙