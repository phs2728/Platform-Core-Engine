# Platform Client Rules Charter (C-26 / C-27 / C-28 / C-29)

**Charter ID**: PCR-CLIENT-001
**Adopted**: 2026-07-15
**Authority**: Platform Council (Chair: 사장님 박흥식 / Tim Park) — direct adoption by Chair authority (not by ADR-then-sabim; per Council Charter standard §9 "사장님 최상위 의사결정권자")
**Status**: 🔒 SEALED — Verbatim from Council Chair's instruction of 2026-07-15.
**Effective**: Immediately upon adoption
**Relation to Constitution**: This Charter **proposes** the elevation of 4 rules into Constitution v1.3 via ADR-003. The Charter is the verbatim source of truth; the Constitution absorbs them as C-26, C-27, C-28, C-29 sections (§20-§23).
**Purpose**: Set the non-negotiable client-project operating rules for every client (Envoy today, future clients tomorrow). Bind visual restraint, content-first, less-but-better, and project workspace separation as constitutional principles.

---

## 0. Provenance of this Charter

This Charter is captured **verbatim** from the Council Chair's instruction "추가할 Platform Client Rules" published in the session conversation log on 2026-07-15. Each rule in §1-§4 is **verbatim** with C-26 / C-27 / C-28 / C-29 numbering as supplied by the Chair. References from other documents must include the section number and verbatim text.

---

## 1. C-26 — Project Workspace Standard (verbatim)

```
C-26 Project Workspace Standard

모든 고객 프로젝트는 반드시 독립된 프로젝트 Workspace를 가진다.

예시

clients/
└── envoy/
    ├── hostel/
    │   ├── discovery/
    │   ├── prd/
    │   ├── trd/
    │   ├── design/
    │   ├── frontend/
    │   ├── backend/
    │   ├── cms/
    │   ├── assets/
    │   ├── seo/
    │   ├── qa/
    │   ├── qes/
    │   ├── deployment/
    │   └── docs/
    │
    └── tours/
        ├── discovery/
        ├── prd/
        ├── trd/
        ├── design/
        ├── frontend/
        ├── backend/
        ├── cms/
        ├── assets/
        ├── seo/
        ├── qa/
        ├── qes/
        ├── deployment/
        └── docs/

원칙

* Hostel과 Tours는 독립 프로젝트
* 공통 기능은 Platform 재사용
* 고객 산출물은 clients 아래에만 존재
* Platform과 Client를 절대 섞지 않는다.
```

---

## 2. C-27 — Premium Visual Restraint Principle (verbatim)

```
C-27 Premium Visual Restraint Principle

Premium websites use restraint.

Never design for decoration.

Design for trust.
```

### 2.1 기본 규칙 (verbatim)

```
금지

* Emoji 남용
* Icon 남용
* Gradient 남용
* Glass 효과 남용
* Animation 남용
* Card 남용
* Shadow 남용
* Badge 남용
* Color 남용

허용

* 의미가 있는 아이콘
* CTA를 위한 최소한의 강조
* 브랜드 컬러 중심
* 충분한 여백
* 타이포그래피 중심
* 사진 중심
* 콘텐츠 중심
```

### 2.2 Emoji Rule (verbatim)

```
기본값

0 emojis

허용되는 경우

* 여행 후기
* 블로그
* SNS
* 이벤트
* 마케팅 배너

금지

* Hero
* Navigation
* Pricing
* Booking
* Hotel Information
* Contact
* About
* FAQ
* Footer
```

### 2.3 Icon Rule (verbatim)

```
아이콘은 장식이 아니다.

아이콘은

* 정보를 빠르게 이해시키거나
* 행동을 유도하거나
* 상태를 설명할 때만 사용한다.
```

### 2.4 Premium Reference (verbatim)

```
디자인 우선순위

1. Aman
2. Apple
3. Stripe
4. Linear
5. Airbnb

참고는 하되 복제하지 않는다.
```

---

## 3. C-28 — Content First (verbatim)

```
C-28 Content First

사용자가 보는 순서

Photo

↓

Headline

↓

Content

↓

CTA

↓

Decoration

Decoration은 항상 마지막이다.
```

---

## 4. C-29 — Less But Better (verbatim)

```
C-29 Less But Better

한 화면에서는

* 하나의 핵심 메시지
* 하나의 핵심 CTA
* 하나의 시선 흐름

을 원칙으로 한다.
```

---

## 5. Envoy Project Structure (verbatim from Chair)

```
clients/
└── envoy/
    │
    ├── shared/
    │   ├── assets/
    │   ├── brand/
    │   ├── design-system/
    │   ├── components/
    │   └── content/
    │
    ├── hostel/
    │
    └── tours/
```

Chair's note (verbatim):

> 이렇게 하면
>
> * 브랜드
> * 디자인 시스템
> * 공통 컴포넌트
> * 사진
> * 폰트
> * 색상
> * SEO 설정
>
> 등은 `shared`에서 관리하고,
>
> `hostel`과 `tours`는 각자의 PRD, TRD, 구현, 콘텐츠를 독립적으로 진행할 수 있습니다.
>
> 이 구조는 이후 `restaurant`, `pilgrimage`, `transport`, `marketplace` 같은 서비스가 추가되어도 같은 패턴으로 확장할 수 있어 장기적으로도 관리하기 쉽습니다.

---

## 6. Operating interpretation (non-normative)

This section is **not** part of the Charter text. It records how the 4 rules operate in client project work.

### 6.1 C-26 Project Workspace Standard — operational meaning

- Every client project gets its own workspace directory under `clients/<client>/`.
- A client may have multiple products (Envoy has hostel + tours); each gets its own subdirectory.
- Shared assets (brand, design system, components, fonts, colors, common content, common SEO) live in a `shared/` subdirectory under the client root, not at Platform level.
- Platform and client concerns remain strictly separated:
  - **Platform** = `engines/`, `core-sdk/`, governance, frozen assets — never touched by client project work unless evidence-driven Platform Change Proposal is filed.
  - **Client project** = `clients/<client>/<product>/<phase>/...` — owns all client-facing artifacts.
- Common logic not Platform-specific (e.g., generic taxonomy, common Astro config) belongs in Platform only if reusable across ≥ 2 clients (per C-24 EPS L4 logic); otherwise it stays client-local.

### 6.2 C-27 Premium Visual Restraint Principle — operational meaning

- **Forbidden by default**: emoji, gradients, glass effects, decorative animations, default-card layouts, decorative shadows, decorative badges, decorative color.
- **Allowed by default**: meaningful icons (functional, not decorative); minimal CTA emphasis; brand-color focus; generous whitespace; typography-driven hierarchy; photo-driven layouts; content-driven layouts.
- **Emoji**: 0 by default. Allowed on blog/social/marketing contexts where conversational tone is appropriate.
- **Icons**: Functional only. Not decorative.
- **Reference design language**: Aman → Apple → Stripe → Linear → Airbnb. Reference, not clone.

This applies to ALL client projects, not just Envoy.

### 6.3 C-28 Content First — operational meaning

- Page composition order: Photo → Headline → Content → CTA → Decoration.
- Decoration is the **last** element considered, not the first. If a UI decision is "make it pretty" without a content purpose, skip it.

### 6.4 C-29 Less But Better — operational meaning

- Each screen = one core message + one core CTA + one visual flow.
- If a screen has multiple competing messages or CTAs, redesign, do not add.

### 6.5 Why this Charter is binding for *all* future clients (verbatim from Chair)

> 따라서 이 규칙은 Envoy만을 위한 것이 아니라 앞으로 모든 고객 프로젝트의 기본 원칙으로 삼는 것이 좋습니다.

Operationally:
- When a new client is onboarded (e.g., restaurant, pilgrimage, transport, marketplace), C-26-C-29 apply **by default**, without per-client exception.
- These rules compose with existing Platform rules (C-24, §15.4 anti-loop, §16/§17/§18, Hidden Platform Principle).

---

## 7. Compatibility with prior instruments

| Prior instrument | Compatible? | Notes |
|---|---|---|
| Platform Constitution v1.2 (Frozen + ADR-001 + ADR-002) | ✅ | This Charter proposes the amendment to v1.3 via ADR-003 |
| ADR-001 (C-24 / Lab Principle / Lab Standard) | ✅ | C-26-C-29 do not add Engines/Standards/Playbooks |
| ADR-002 (Hidden Platform Principle) | ✅ | C-26 keeps Platform/Client separation; C-27-C-29 govern client-facing presentation |
| PCR-001 / PCR-002 / PCR-003 | ✅ | All consistent |
| Council Final Directive (CFD-001) | ✅ | This Charter was a direct Council Chair instruction; supersedes the STOP clause as a direct Chair exception |
| PVP-001 / CP-001 internal artifacts | ✅ | They become sub-artifacts under `clients/envoy/hostel/` per C-26 |

---

## 8. Elevation to Constitution

Per the Charter's adoption by Chair authority, this Charter is **immediately binding** as a Charter. It also proposes the corresponding constitutional elevation:

| Charter Section | Constitution Section (Proposed v1.3) |
|---|---|
| C-26 Project Workspace Standard | §20 C-26 Project Workspace Standard |
| C-27 Premium Visual Restraint Principle | §21 C-27 Premium Visual Restraint Principle |
| C-28 Content First | §22 C-28 Content First |
| C-29 Less But Better | §23 C-29 Less But Better |

The Constitution patch + ADR-003 are filed in this session as well.

---

## 9. Seal

```
SEALED 2026-07-15.
PCR-CLIENT-001 ADOPTED by Council Chair.
4 Client Rules (C-26 / C-27 / C-28 / C-29) + Envoy project structure SEALED verbatim.
Constitution v1.2 -> v1.3 amendment filed via ADR-003.
Rules apply to all future client projects, not just Envoy.
```

---

> **For Operating Teams**: Effective immediately, every client project must conform to C-26 (workspace), C-27 (visual restraint), C-28 (content first), C-29 (less but better). Detailed operational guidance is in the §6 interpretations above.
