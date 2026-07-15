# Agency Operating Charter — From Platform Development to Agency Operations

> **Charter ID**: PCR-AGENCY-001
> **Version**: v1.1 (chair-instruction patch, 2026-07-15 — Deliverable-First direction)
> **Adopted**: 2026-07-15
> **Authority**: Platform Council Chair (사장님 박흥식 / Tim Park) — direct adoption.
> **Status**: 🔒 SEALED — Verbatim from Council Chair's instruction of 2026-07-15.
> **Effective**: Immediately upon adoption.
> **Relation to Constitution**: This Charter **operationalizes** the Constitutional cadence (§24-§26 C-30/31/32) into **Agency-grade** working rules. It does NOT amend the Constitution (which is saturated at v1.4 per Chair's "마지막 rules layer" indication). It binds all Platform Agency / Client Project delivery work going forward.
> **v1.1 patch (2026-07-15)**: Chair's "Deliverable First / Don't build pages — build experiences / Living Design System / No Fake Components" addition. **No further Charter layer is opened** — v1.1 is the final form.

---

## 0. v1.1 addendum — Deliverable-First Mode (verbatim from Chair)

> "지금은 너무 문서 중심입니다. **고객 프로젝트에서는 생산성이 떨어집니다.**"
>
> "**Deliverable First.**"
>
> "앞으로는 하루가 끝나면 반드시 브라우저에서 열리는 결과물이 있어야 합니다."

### 0.1 Operational consequence

| Past (charter factory) | Now (Agency Mode v1.1) |
|---|---|
| Charter / ADR / Constitution / PCR / Freeze / Council 산출물 누적 | **stop producing governance artifacts** |
| 문서 검토 = 진행 신호 | **브라우저에서 여는 것 = 진행 신호** |
| Day 1 = Discovery → IA → Prd → Trd → UI → Frontend → Backend (sequential) | **Day 1 = Homepage.html** |
| Plan-then-execute (perfect plan first) | Design-as-you-build (Living Design System) |

### 0.2 Updated 10-step execution sequence (verbatim from Chair)

```
01

Research

↓

02

Brand Direction

↓

03

Design System

↓

04

Homepage

↓

05

Room Pages

↓

06

Booking

↓

07

Tours

↓

08

CMS

↓

09

Admin

↓

10

Optimization
```

> "**Homepage를 가장 먼저 완성**합니다. 왜냐하면 Homepage가 만들어지면 나머지 디자인은 거의 따라오기 때문입니다."

### 0.3 Living Design System (verbatim from Chair)

> "지금처럼 Design System → 끝 으로 보입니다. 하지만 실제 Agency는 Homepage → 새 Component 발견 → Design System 추가 → 다음 페이지 제작 → 또 Component 발견 → 추가 입니다."
>
> **Design System은 완성되는 것이 아니라 계속 성장해야 합니다.**

Operationally: Design System is a **living document in /components**. Each new page cycle may add a new component. Pages never wait for Design System completion.

### 0.4 No Fake Components (verbatim from Chair)

> "AI들이 가장 많이 하는 실수가 일반적인 컴포넌트 (Hero, Card, Feature, CTA, Review, FAQ, Gallery, Contact)를 만드는 것입니다."
>
> **Envoy에는 Envoy만의 컴포넌트가 있어야 합니다.**

Forbidden (AI default components):
- Hero (generic)
- Card (generic)
- Feature (generic)
- CTA (generic)
- Review (generic)
- FAQ (generic)
- Gallery (generic)
- Contact (generic)

Required (Envoy-specific):
- Hostel Community Timeline
- Local Experience Cards
- Morning Cafe Section
- Common Ground Highlight
- Rooftop Experience
- Meet Travelers
- Trip Extension
- Guest Story
- Recommended Tours
- Our Impact

**The Envoy Design System is composed of these Envoy-named components only. No generic-named sections.**

### 0.5 Don't build pages. Build experiences. (verbatim from Chair)

> "Don't build pages. Build experiences.
>
> 홈페이지를 만드는 것이 아니라 **예약하고 싶게 만드는 경험**을 만드는 것입니다.
> 객실 페이지를 만드는 것이 아니라 **이 방에서 머물고 싶다는 감정을 만드는 것**입니다.
> 투어 페이지를 만드는 것이 아니라 **'이 여행은 Envoy에서 예약해야겠다.'라는 신뢰를 만드는 것**입니다."

### 0.6 Final declaration (verbatim from Chair)

> "지금부터의 목표는 단 하나입니다.
>
> 더 이상 플랫폼을 증명하는 것이 아니라, **Envoy Hostel과 Envoy Tours가 실제로 사용할 수 있는 세계적 수준의 웹사이트를 완성하는 것**입니다.
>
> 플랫폼은 이미 충분한 기반을 갖추었습니다. 이제는 모든 규칙과 엔진이 **고객에게 보이는 결과물**로 이어지는지를 검증하는 단계입니다. 그 기준은 문서의 수가 아니라, **실제 화면의 품질과 예약 전환율**입니다."

---

## 1. Mental model transformation (verbatim from Chair)

> "앞으로 envoy는 **플랫폼 검증 프로젝트가 아니라 고객 프로젝트**입니다."

```
Platform
↓
Client Project
↓
Website
↓
Customer
↓
Revenue
```

Operationally:
- The Platform is **invisible** (per Hidden Platform Principle §18).
- The Client Project is **the primary work product** (per PCR-002 / PCR-003).
- The Website is **the visible deliverable** (per C-26-§29 + Hidden Platform §18).
- The Customer's **booking behavior and trust signals** are the success metric.
- The Revenue is the **business result** that closes the loop.

Platform Engineering output is now measured by **how naturally it produces client projects**, not by how many engines / standards / playbooks exist.

---

## 2. Rule 1 — Platform Thinking 금지 (verbatim)

> "앞으로 문서에서
>
> ```
> Agency OS
>
> Playbook
>
> QES
>
> Engine
>
> Skill Pack
>
> ADR
>
> Constitution
>
> PCR
> ```
>
> 같은 내부 용어는 고객 프로젝트 문서에서 사용하지 않습니다.
>
> 이것들은 내부에서만 사용합니다."

**Operational meaning**:
- Internal Platform-Engineering vocabulary (Agency OS, Playbook, QES, Engine, Skill Pack, ADR, Constitution, PCR, etc.) is **for internal documents only**.
- **Client-facing documents** (Brief, Proposal, Design Comps, Acceptance Form, Delivery Checklist) **never mention** these terms.
- When internal documents are read by the client (rare), they are translated to client-facing equivalents — e.g., "QES" becomes "Quality Review", "ADR" becomes "Decision Record", "Engine" becomes "Module", "Playbook" becomes "Recipe", "Skill Pack" becomes "Capability", "Constitution" becomes "Operating Principles", "PCR" becomes "Council Resolution", "PVC" becomes "Steering Review", "Pre-Coding Plan" becomes "Delivery Plan".

This rule composes with **Hidden Platform Principle (§18 / PCR-003)** — clients see only the deliverable.

## 3. Rule 2 — Output First (verbatim)

> "매 단계마다
>
> ```
> 무엇을 만들었는가
>
> ↓
>
> 브라우저에서 무엇을 볼 수 있는가
>
> ↓
>
> 고객은 무엇을 사용할 수 있는가
> ```
>
> 이 세 가지만 보고합니다."

**Operational meaning**:
- Every delivery step must report these 3 outputs:
  1. **What was built** (artifact).
  2. **What can be seen in a browser** (visual deliverable).
  3. **What the customer can use** (functional value).
- Internal-only artifacts (PRDs, TRDs, internal docs) do NOT count as "Output" under this rule — only what a customer-facing browser shows counts.
- Reporting is **output-typed**, not process-typed.

## 4. Rule 3 — Every Step Must Produce UI (verbatim)

> "예를 들어
>
> ```
> Day 1
>
> ↓
>
> Homepage
>
> Day 2
>
> ↓
>
> Room Page
>
> Day 3
>
> ↓
>
> Booking Flow
>
> Day 4
>
> ↓
>
> Tour Page
>
> ...
> ```
>
> 항상 눈으로 확인 가능한 결과물이 있어야 합니다."

**Operational meaning**:
- Each delivery day produces **at least one visually verifiable artifact** (a real or proxy page, component, or screen).
- Artifacts are documented with **screenshots or live URLs** so they're inspectable.
- Even on days where the underlying work is research or schema, **at least one placeholder rendered page** is committed (e.g., a brand palette mock page, a sitemap-rendered page, a typography sample).
- This rule **composes** with C-32 (Working Website First) — the cadence is **Working → Beautiful → Perfect**, and each day produces a visible artifact.

## 5. Rule 4 — No Internal Perfectionism (verbatim)

> "다음과 같은 이유로 작업을 멈추지 않습니다.
>
> ```
> TRD 부족
>
> Decision 부족
>
> Brand DNA 부족
>
> Open Decision
>
> PVC
>
> Review
>
> ...
> ```
>
> 기술적으로 불가능한 경우가 아니라면 계속 진행합니다."

**Operational meaning**:
- Work stops ONLY when **technically impossible**, not when **internally unsatisfactory**.
- TRD-incomplete, Decision-pending, Brand-DNA-warn, PVC-feedback-pending → continue.
- This rule **operationalizes** C-30 (Progressive Decision Principle) at the daily-work level.
- "Done is better than perfect. Perfect is the enemy of done." (Operational motto derived from this rule.)
- This rule **supersedes** any pre-existing internal process gates when they conflict with working-output cadence (subject to safety rules like Production Deploy Gates and Payment Surface Gates which are Critical, not Internal-perfectionism).

## 6. Rule 5 — Real Browser Review (verbatim)

> "모든 주요 단계에서
>
> ```
> Desktop
>
> Tablet
>
> Mobile
>
> Lighthouse
>
> Core Web Vitals
>
> Accessibility
>
> SEO
> ```
>
> 실제 브라우저 기준으로 검토합니다."

**Operational meaning**:
- Every major delivery milestone is reviewed against:
  - **Desktop browser** (Chromium / Firefox / Safari-on-macOS / Edge)
  - **Tablet browser** (iPad / Android tablet width 768-1024px)
  - **Mobile browser** (iPhone / Android phone width 375-414px)
- **Lighthouse** audit (Performance / Accessibility / Best Practices / SEO scores)
- **Core Web Vitals** measured (LCP, FID, CLS, INP)
- **Accessibility audit** (axe, WAVE)
- **SEO audit** (sitemap, robots, meta, schema.org)
- **Real browser means** an actual browser rendering the artifact, not static analysis. Lighthouse runs in headless Chromium against the deployed URL.

## 7. Rule 6 — Envoy First (verbatim)

> "항상
>
> ```
> 현재 envoyhostel.com
>
> ↓
>
> 현재 envoytours.com
>
> ↓
>
> 새 디자인
>
> ↓
>
> 차이 분석
>
> ↓
>
> 구현
> ```
>
> 순서입니다.
>
> 이미 있는 사이트를 기준으로 개선해야 합니다."

**Operational meaning**:
- For each Envoy site, the **starting point** is the **current live site**.
- New design is **derived from** current site — not invented from scratch.
- Difference analysis identifies what to **add / remove / refine**.
- Implementation proceeds from the **smallest necessary deltas** first.
- This rule composes with **§21 (C-27 Premium Visual Restraint)** — current sites have years of accumulated visual debt; the deltas target **visual restraint and content-first** improvements, not rewrites.
- This rule **composes** with the website analysis (`02-website-analysis.md`) — the analysis is the input to this rule.

## 8. Rule 7 — Client Value Rule (verbatim)

> "에이전트는 항상 먼저 질문해야 합니다.
>
> ```
> 이 기능이
>
> 고객에게
>
> 예약을 늘려주는가?
>
> 신뢰를 높여주는가?
>
> 관리하기 쉬운가?
>
> 브랜드를 강화하는가?
>
> ```
>
> 아니면 만들지 않습니다."

**Operational meaning (verbatim four-question gate)**:

| Question | If NO on all 4 → Don't build. |
|---|---|
| Does it **increase bookings** (direct bookings via envoyhostel.com / envoytours.com)? | |
| Does it **raise trust** (reviews / social proof / secure-payment visible)? | |
| Does it **make management easier** (CPO / staff can update content without code)? | |
| Does it **strengthen the brand** (Aman / Apple / Stripe / Linear / Airbnb — premium visual discipline per §21)? | |

If the answer to **all four** is "no" or "weak", **the feature is not built**. Time is spent on higher-value work.

This rule **composes** with Hidden Platform Principle (§18) and C-21 (Premium Visual Restraint) — the client values delivered are externally visible; the Platform internals are invisible.

## 9. Project structure update (verbatim from Chair)

> "저는 프로젝트 구조도 조금 발전시키겠습니다.
>
> 현재는
>
> ```
> clients/
>
>     envoy/
>
>         hostel/
>
>         tours/
>
>         shared/
> ```
>
> 여기서 한 단계 더 가면 좋습니다.
>
> ```
> clients/
>
>     envoy/
>
>         shared/
>             assets/
>             research/
>             design-system/
>             content/
>             components/
>
>         hostel/
>             prd/
>             trd/
>             ui/
>             frontend/
>             backend/
>             qa/
>             release/
>
>         tours/
>             prd/
>             trd/
>             ui/
>             frontend/
>             backend/
>             qa/
>             release/
> ```

**Operational difference from prior structure** (from §20.1):

| Item | v1.0 structure | v1.1 structure |
|---|---|---|
| `shared/` ordering | assets / brand / design-system / components / content (alphabetical) | assets / research / design-system / content / components (logical layer order) |
| `hostel/`, `tours/` per-project | discovery/ research/ prd/ trd/ ui/ frontend/ backend/ cms/ seo/ qa/ qes/ deployment (12 dirs) | prd/ trd/ ui/ frontend/ backend/ qa/ release (7 dirs) — **simplified** per Agency Mode |
| Removed | discovery/, research/, cms/, seo/, qes/, deployment/ | (consolidated under shared/ and 7 main dirs) |

**Reduced per-project from 12 to 7 directories** — supersedes v1.0 structure (per C-26 §20.1) for **Agency Mode**. The shared directory handles cross-cutting concerns.

**Migration for existing clients**: Not required (current v1.0 structure is preserved). v1.1 is the **target shape for new work**; existing project subdirectories remain valid.

## 10. Recommended delivery sequence (verbatim from Chair)

> "저는 권장 순서는 다음과 같습니다.
>
> 1. **Design Discovery**: 현재 Envoy Hostel/Tours를 분석하고 디자인 시스템 정의.
> 2. **Information Architecture**: 메뉴와 사용자 흐름 확정.
> 3. **UI/UX Design**: 홈페이지부터 핵심 화면 설계.
> 4. **Frontend 구현**: 반응형 인터페이스 구현.
> 5. **Backend 연동**: 예약, 문의, CMS 등 연결.
> 6. **QES 검증**: 품질 기준 점검.
> 7. **실사용 테스트 및 배포**.
>
> 지금까지 만든 엔진, 스킬, 플레이북은 **이 과정을 빠르고 일관되게 수행하기 위한 내부 도구**입니다. 고객은 그것을 볼 필요가 없고, 결과물만 경험하면 됩니다."

**Mapping to Constitution + Project Lab Standard phases**:

| Chair's step | Phase in PCR-002 / C-30/31/32 | Critical gate? |
|---|---|---|
| 1. Design Discovery | Phase 1 (Discovery Beta) + Phase 5 (UI Design) — Design System | NO — start now (per C-30) |
| 2. Information Architecture | Phase 2 (PRD) + Phase 4 (UX Research) | NO — start now |
| 3. UI/UX Design | Phase 5 (Visual Design) — high-fi comps | NO — start now |
| 4. Frontend 구현 | Phase 6 (Frontend Development) | **YES** — gated on Pre-Coding Plan `pvc-approved` (헌법 §17 retained) |
| 5. Backend 연동 | Phase 7 (Backend Development) | **YES** — same gate |
| 6. QES 검증 | Phase 9 (QES Review) | **YES** — pre-launch critical gate |
| 7. 실사용 테스트 및 배포 | Phase 10 (Deployment) | **YES** — pre-deploy critical gate |

**Resolution**:
- Steps 1-3 are **non-blocking** and can start today (Working Website First cadence).
- Steps 4-5 are **blocked** on Pre-Coding Plan `pvc-approved` AND Critical decisions (Cloudbeds / Booking) resolved.
- Steps 6-7 are **blocked** on Phase 4-5 completion.

**Critical decisions still gating**:
- **Cloudbeds integration** (Path 5)
- **Booking Flow 방식** (direct vs Cloudbeds redirect) — directly affects Path 5

These 2 decisions are NOT auto-resolvable; they require 사장님 signature. The other 7 ODs are queued at Medium / Low per C-31 and resolved in parallel.

## 11. Internal tooling → External velocity (verbatim from Chair's closing)

> "지금까지 만든 엔진, 스킬, 플레이북은 **이 과정을 빠르고 일관되게 수행하기 위한 내부 도구**입니다. 고객은 그것을 볼 필요가 없고, 결과물만 경험하면 됩니다."

Operationally, the Platform's "Engines / Skills / Playbooks" become **internal accelerators** for the 7-step delivery process. They are:
- **Quality** (QES gates, testing patterns)
- **Speed** (component reuse via Component Engine)
- **Consistency** (Theme tokens, design system)
- **Discoverability** (Search, CMS)

But the team now talks about them only internally, never in client documents.

## 12. Operating principles composition

This Charter composes with all prior instruments:

| Instrument | Composes by |
|---|---|
| Constitution §15 (C-24 Platform Freeze) | C-24 binding preserved (Rule 1 explicitly excludes Engine/Standard/Playbook additions) |
| Constitution §17 (Product Lab Standard) | Pre-Coding Plan retained for Steps 4-5 (Frontend/Backend) only |
| Constitution §18 (Hidden Platform) | Composes: Rule 1 makes internal tools invisible to client |
| Constitution §20-§23 (C-26-C-29) | Compose: workspace structure, visual restraint, content first, less but better |
| Constitution §24-§26 (C-30-C-32) | Composes: Progressive Decision + Decision Queue + Working Website First |
| Hidden Platform Charter | Composes with Rule 1 directly |
| Platform Client Rules Charter | Composes with rules 1-7 |
| Product Delivery Cadence Charter | Composes: this Charter is the **operational layer** below that cadence layer |
| Council Final Directive | STOP clause preserved (no new governance artifacts beyond this Charter) |
| PVP-001 / CP-001 internal artifacts | Continue as internal working documents; Rule 1 keeps client from seeing them |

## 13. Cross-references

| Artifact | Path |
|---|---|
| Constitution v1.4 | `docs/000_PLATFORM_CONSTITUTION.md` |
| Hidden Platform Charter (PCR-003) | `.charters/HIDDEN_PLATFORM_CHARTER.md` |
| Platform Client Rules Charter (PCR-CLIENT-001) | `.charters/PLATFORM_CLIENT_RULES_C26_to_C29.md` |
| Product Delivery Cadence Charter (PCR-CADENCE-001) | `.charters/PRODUCT_DELIVERY_CADENCE_C27_to_C29.md` |
| This Agency Operating Charter | `.charters/AGENCY_OPERATING_RULES.md` |
| Envoy Project workspace | `/opt/data/clients/envoy/` |
| Envoy Import Receipt | `/opt/data/clients/envoy/shared/references/00-import-receipt.md` |
| Envoy Website Analysis | `/opt/data/clients/envoy/shared/references/01-website-analysis.md` |
| Envoy Gap Report | `/opt/data/clients/envoy/shared/references/02-gap-report.md` |
| Envoy Resumption Directive | `/opt/data/clients/envoy/shared/references/03-resumption-directive.md` |

## 14. Seal

```
SEALED 2026-07-15.
PCR-AGENCY-001 ADOPTED by Council Chair.
Mental model: Platform Development -> Agency Operations.
7 rules SEALED verbatim:
  Rule 1 Platform Thinking 금지
  Rule 2 Output First
  Rule 3 Every Step Must Produce UI
  Rule 4 No Internal Perfectionism
  Rule 5 Real Browser Review
  Rule 6 Envoy First
  Rule 7 Client Value Rule (verbatim four-question gate)
Project structure v1.1 SEALED (simplified 7 dirs per project).
Recommended 7-step delivery sequence SEALED.
Pre-Coding Plan status retained for Steps 4-5 (Frontend/Backend).
Critical decisions still gating: Cloudbeds + Booking.
Constitution v1.4 unchanged (saturated per Chair's "마지막 rules layer").
Council Final Directive STOP clause preserved (no new governance artifacts).
```

---

> **For Operating Teams**: Effective immediately, you are operating as Agency — not Platform Engineering. Output-First, UI-First, Client-First. Internal tools accelerate; they are not the work product.
