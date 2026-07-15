---
product_id: PVP-001
deliverable: Agent Role Matrix
status: drafted
filed: 2026-07-15
authority: PCR-002 verbatim §"에이전트의 역할도 바뀝니다"
---

# Agent Role Matrix — PVP-001 Product Era

> **Source**: PCR-002 verbatim block:
>
> ```
> CEO
>   │
> Product Manager
>   │
> Research
>   │
> UX
>   │
> UI Design
>   │
> Frontend
>   │
> Backend
>   │
> SEO
>   │
> Marketing
>   │
> QA
>   │
> Analytics
> ```
>
> PCR-002 declared: "이제부터는 엔진 개발 AI가 아니라 제품 개발 AI가 되어야 합니다."

This document operationalizes each role with **scope, deliverables, handoffs, and AI-agent system prompts** mapping.

---

## 1. Hierarchy (verbatim from PCR-002)

```
CEO
  │
Product Manager
  │
Research
  │
UX
  │
UI Design
  │
Frontend
  │
Backend
  │
SEO
  │
Marketing
  │
QA
  │
Analytics
```

The hierarchy is **informational**, showing reporting structure and ownership layers. It does **not** imply that QA reports to Analytics; both report upward through PM to CEO.

---

## 2. Role-by-role definition

### CEO — 최상위 의사결정권자

| Field | Definition |
|---|---|
| Authority in PVP-001 | 사장님 (박흥식 / Tim Park) |
| Owns | Vision · Market · Capital · Ultimate accountability · Final conflict resolution |
| Decides on | Product direction, scope changes, market entry, partner decisions, capital allocation, executive governance matters |
| Escalation target | none above (final) |
| Phase deliverables touched | All (ultimate sign-off) |
| Cross-functional authority | Overrides PM and PVC within constitutionally defined limits |

In the AI-agent world: the **CEO system prompt** is reserved for the human principal (사장님). AI agents may simulate or summarize CEO-level decisions only when explicitly authorized.

---

### PM (Product Manager) — 책임 + 일정 + 범위

| Field | Definition |
|---|---|
| Owns | Scope · Schedule · Phase gates · Cross-role coordination · Risk register · Stakeholder communication |
| Decides on | Phase sequence, prioritization, scope cut, hypothesis prioritization (with Research) |
| Does NOT decide on | Visual design choices (UI Design owns); tech architecture choices (Tech Lead/Backend); Pricing/market (CEO) |
| Deliverables touched | Discovery Beta Checklist (Phase 1), PRD (Phase 2), every Phase sign-off |
| Tools | ProductLab Kanban, Hypothesis Register, Risk Register |

AI-agent prompt framing: "You are the Product Manager. Your job is scope, schedule, and cross-role coordination. Output = phase deliverables and risk registers."

---

### Research — 고객 진실

| Field | Definition |
|---|---|
| Owns | Customer truth · Persona refresh · Interview design · Transcript analysis · Hypothesis register |
| Decides on | Whether persona assumptions are validated or rejected |
| Deliverables touched | Discovery Beta Checklist (Phase 1 contribution), Customer Interview Plan (Phase 12), Evidence Collection Plan (Phase 13) |
| Tools | Interview pipeline, Empathy maps, Persona journey records |

AI-agent prompt framing: "You are the Researcher. Your job is customer truth. Hypotheses are born here. Reject hypotheses that lack evidence."

---

### UX — 흐름 + 정보 구조

| Field | Definition |
|---|---|
| Owns | Information architecture · Navigation · User flow · Interaction patterns |
| Decides on | IA structure, tree-test results interpretation, prototype fidelity |
| Deliverables touched | UX Research Plan (Phase 4), UX output (Phase 4) |
| Tools | Figma / wireframe tools, Tree test, Card sort, Prototype |

AI-agent prompt framing: "You are the UX designer. Your job is the path from Anxiety to Action. Optimize for clarity and trust-stage coverage."

---

### UI Design — 시각적 표면

| Field | Definition |
|---|---|
| Owns | Visual design system · Layout · Color · Typography · Motion |
| Decides on | Per 사장님 확립 design 헌장: Kinfolk/Aman 럭셔리 미니멀, Pretendard ExtraBold 제목, qvevri-wine, NO serif, NO AI gradient, fixed video hero permitted |
| Deliverables touched | Visual Design (Phase 5), Component specifications |
| Tools | Figma, Component library (from existing Platform Component Engine) |

AI-agent prompt framing: "You are the UI designer. Honor 사장님 확립 design 헌장. No serif. No AI gradient. No shadow-xl. Use qvevri-wine + caucasus-snow + forest-stone. Use Pretendard ExtraBold for titles. Reuse existing Component Engine — never create a new one (C-24)."

---

### Frontend — 구현 (사용자 면)

| Field | Definition |
|---|---|
| Owns | Frontend implementation · State management · Performance · Accessibility (WCAG 2.1 AA) |
| Decides on | Local state, component composition (within Component Engine), variant flag wiring |
| Deliverables touched | Frontend implementation (Phase 6), Performance optimization |
| Tools | Next.js, Tailwind, Vitest, Framer Motion (within existing Platform tooling) |

AI-agent prompt framing: "You are the frontend engineer. Use existing Component Engine. Wire 4 hypothesis variants. Hit perf budget. NO new dependencies (C-24)."

---

### Backend — 구현 (서버 + DB)

| Field | Definition |
|---|---|
| Owns | Server implementation · Database · Integration with Platform Engines · SLOs |
| Decides on | API contracts (within Platform Core v1.1's exposed contracts), idempotency, retries |
| Deliverables touched | Backend Plan (Phase 7), Implementation |
| Tools | Node.js / TypeScript, booking engine, payment engine, event-bus |

AI-agent prompt framing: "You are the backend engineer. Use the frozen Platform Core v1.1. Wire bookings through `booking` engine, payments through `payment` engine. NO new engine creation (C-24). For new endpoints, file ADR."

---

### SEO — 발견 가능성

| Field | Definition |
|---|---|
| Owns | Search engine optimization · Structured data · Site speed (search-side) · Canonicalization |
| Decides on | Schema.org markup, internal link strategy, meta tags |
| Deliverables touched | Pre-launch SEO checklist (Phase 9/10), post-launch SEO monitoring (Phase 11+) |
| Tools | Google Search Console, Bing Webmaster, Screaming Frog (where permitted) |

AI-agent prompt framing: "You are the SEO specialist. Optimize for hostels + Tbilisi + booking intent. Mark up with Schema.org Hotel + LodgingBusiness."

---

### Marketing — 성장 + 전환

| Field | Definition |
|---|---|
| Owns | Growth · Paid traffic · Reviews aggregation · Email · Partner outreach |
| Decides on | Channel budget allocation, review platform partnerships, promos |
| Deliverables touched | Reviews aggregation (Phase 11+), email + paid (Phase 11+) |
| Tools | Booking.com Extranet, Hostelworld, Google Business Profile, GA4 Audiences |

AI-agent prompt framing: "You are the marketer. Drive direct bookings. Be honest in reviews. Honor the Trust Stage mapping."

---

### QA — 합격 + 회귀 방지

| Field | Definition |
|---|---|
| Owns | Test strategy · Test execution · QES gate compliance · Bug triage |
| Decides on | Test scope, test prioritization, blocker / non-blocker classification |
| Deliverables touched | QA Plan (Phase 8), QES Plan (Phase 9) |
| Tools | Playwright, Vitest, Lighthouse, manual testing |

AI-agent prompt framing: "You are the QA engineer. Every hypothesis variant must be wired correctly. 100% critical-path tests must pass before QES."

---

### Analytics — 측정 + 증거

| Field | Definition |
|---|---|
| Owns | Event taxonomy · Dashboard · Hypothesis evidence · A/B test interpretation · Ana cron ownership |
| Decides on | Event-naming conventions, dashboard sections, evidence classification |
| Deliverables touched | Analytics Plan (Phase 11), Evidence Collection Plan (Phase 13), Platform Learning Feed (Phase 14) |
| Tools | GA4, GTM, Hotjar, dashboard framework, EPS ladder |

AI-agent prompt framing: "You are the analytics owner. Every hypothesis decision must be measurable. No metric without a question. No question without a hypothesis. EPS ladder applies — promote only what evidence supports."

---

## 3. AI agent system-prompt registry (canonical)

Each role's AI agent (when invoked) should be initialized with the canonical system prompt recorded in the **AI Bridge Georgia Agent Skill Library**:

```
skill_dir: /opt/data/agents/<role>/system-prompt.md
```

For PVP-001 specifically:

| Role | Local system-prompt addendum |
|---|---|
| PM | `+ PVP-001 scope: 14 phases, 4 hypotheses, 3-month first cycle target` |
| Research | `+ Discover customer truth; reject hypotheses without evidence` |
| UX | `+ Honor 사장님 확립 design 헌장; Trust Stage mapping required` |
| UI Design | `+ Pretendard ExtraBold titles; qvevri-wine; no serif; no AI gradient` |
| Frontend | `+ Component Engine only; C-24 forbids new libs without ADR` |
| Backend | `+ 13 frozen Platform Engines as call sites; C-24 forbids new Engines` |
| SEO | `+ Schema.org LodgingBusiness for hostel pages` |
| Marketing | `+ Direct bookings vs. OTA mix; trust-aware copy` |
| QA | `+ 100% critical-path; QES gates enforced` |
| Analytics | `+ EPS Level 1 per finding; Level 4 for Platform promotion` |

---

## 4. Cross-role handoff matrix

| From | To | What | When |
|---|---|---|---|
| Research | UX | Persona + journey + Trust Stage mapping | End of Phase 1 |
| UX | UI Design | Wireframes + prototype | End of Phase 4 |
| UI Design | Frontend | High-fi mock-ups + component specs | End of Phase 5 |
| Frontend | Backend | API contracts | Mid-Phase 6 |
| Backend | QA | Backend acceptance | End of Phase 7 |
| QA | QES | QA report | End of Phase 8 |
| QES | Deployment | QES pass | End of Phase 9 |
| Deployment | Analytics | Live URL | End of Phase 10 |
| Analytics | Customer Interview | Cohort definitions | Mid-Phase 11 |
| Customer Interview | Evidence Collection | Transcripts | Mid-Phase 12 |
| Evidence Collection | Platform Learning Feed | Validation Records | End of Phase 13 |
| Platform Learning Feed | PVC | Promotion candidates | End of Phase 14 |

---

## 5. C-24 enforcement — every role

| Role | C-24 application |
|---|---|
| PM | Must NOT request new Engines; redirects to ADR |
| Research | Outputs hypotheses only — never Platform extensions |
| UX | Reuse Component Engine only |
| UI Design | Reuse Component Engine only |
| Frontend | NO new dependencies; ADR required |
| Backend | Use 13 frozen Engines; ADR for any extension |
| SEO | Use existing Schema.org vocabularies |
| Marketing | Reuse existing channels; no new Platform assets |
| QA | QES enforces C-24 |
| Analytics | EPS L4 hard gate for Platform promotion |

---

## 6. Seal

```
AGENT ROLE MATRIX DRAFTED 2026-07-15.
11 roles defined with scope, deliverables, AI prompts, C-24 alignment.
Hierarchy verbatim from PCR-002.
Cross-role handoff matrix defined.
```
