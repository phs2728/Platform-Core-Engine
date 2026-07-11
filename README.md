# Platform Core Engine

> **AI Bridge Georgia Platform Core**
>
> 인증 · 알림 · 미디어 · CMS · 예약 · 리뷰 · AI
>
> **Industry-Agnostic Reusable Engines**

---

## 이게 뭔가요?

**Platform Core Engine**은 AI Bridge Georgia Platform의 **공통 엔진 모음**입니다.

각 엔진은 **특정 산업을 전혀 알지 못합니다** — 여행, 호텔, 식당, 카페, 렌트카 등 어떤 도메인에도 종속되지 않습니다.

각 엔진은 **독립적인 제품**입니다. 독립 폴더, 독립 README, 독립 PRD, 독립 TRD.

```
One Engine = One Folder = One README = One PRD = One TRD
```

이 엔진들은 앞으로 10년 이상 모든 제품(Tour OS, Hospitality OS, Restaurant OS, Cafe OS, RentCar OS 등)이 공통으로 사용합니다.

```
This is NOT an application.
This is NOT a demo.
This is NOT an MVP.
These are reusable Platform Core Engines.

Every design decision maximizes extensibility, configurability and long-term maintainability.
```

---

## 왜 engines/ 폴더인가?

엔진이 5개일 때는 루트에 직접 두어도 됩니다.

엔진이 20개, 30개가 되면 루트가 지저분해집니다.

그래서 **지금이 마지막 기회** — 처음부터 분리합니다.

```
Platform-Core-Engine/
├── README.md            ← 이 파일 (플랫폼 소개)
├── engines/             ← 모든 엔진이 사는 곳
│   ├── identity/        ← (현재 작업 중)
│   ├── notification/    ← (예정)
│   ├── media/
│   ├── cms/
│   ├── booking/
│   ├── review/
│   └── ai/
├── packages/            ← 공유 패키지 (universal-core, primitives 등)
├── docs/                ← 플랫폼 차원의 문서 (헌장, ADR, KPI)
├── examples/            ← 호스트 통합 예시 (Hono, Next.js, Worker Thread)
└── tools/               ← 모노레포 운영 도구 (검증, CI/CD, 스크립트)
```

이 구조는 VS Code, TurboRepo, pnpm Workspace, Nx 같은 모노레포 도구에서 **자연스럽게 확장**됩니다.

---

## 엔진 카탈로그

### 🟢 Active

| 엔진 | 책임 | README |
|---|---|---|
| **identity** | 인증, 보안, 세션, 자격증명, 감사 | [engines/identity/README.md](./engines/identity/README.md) |

### 🟡 Planned

| 엔진 | 책임 | 상태 |
|---|---|---|
| **notification** | 이메일, SMS, Push 발송 | 예정 |
| **media** | 이미지, 비디오, OCR | 예정 |
| **cms** | 콘텐츠 관리 (블로그, 페이지) | 예정 |
| **booking** | 예약/주문 도메인 엔진 | 예정 (Universal Core 별도 검토 필요) |
| **review** | 리뷰, 평점, 신뢰 표시 | 예정 |
| **ai** | AI 통합, 캐시, 추천 | 예정 |

---

## 설계 원칙 (모든 엔진 공통)

```
80% Universal / 20% Domain
Business modules must never modify the Core
Event First — 모든 중요 액션은 도메인 이벤트를 발생시킨다
TypeScript Everywhere
Plugin-Ready — 새 Provider는 코드 수정 없이 추가 가능
Configuration Over Code — 관리자 UI로 모든 정책 변경
Encrypt Everything Sensitive
Audit Everything — append-only + hash chain
API Stability (SemVer)
```

### Industry-Agnostic 보장

모든 엔진은 다음 단어를 **절대 사용하지 않습니다**:

```
❌ tour / travel / booking / hotel / restaurant
❌ order / product / payment / passport
❌ travel_history / cafe / rentcar / visa / flight / itinerary
```

자동 검증 도구: 각 엔진 폴더의 `scripts/verify-industry-agnostic.sh` (PR마다 자동 실행).

---

## 헌법

이 모노레포는 사장님 확립 헌법을 따릅니다:

1. **사람이 직접 정한 것만 canonical** — AI 추측은 `draft-superseded` 표시
2. **모든 결정은 ADR-NNN**으로 기록
3. **Schema Freeze** — 변경 시 ADR + v2.0 마이그레이션
4. **모노레포 단일 CI** — 모든 엔진이 같은 lint/typecheck/test 게이트 통과

---

## 모노레포 도구

| 도구 | 사용처 | 비고 |
|---|---|---|
| **pnpm Workspace** | 패키지 매니저 | 사장님 확립 (성능 + 디스크 효율) |
| **Turborepo** | 빌드 캐시 | (예정) |
| **TypeScript** | 언어 | strict mode, ESM only |
| **Vitest** | 테스트 | 단위 + 통합 |
| **ESLint + Prettier** | lint + format | |

---

## 다음 단계

1. **identity 엔진 완성**: 사장님 Level 1 결정 8개 확립 (engines/identity/docs/15-identity-decisions.md)
2. **Universal Core 패키지**: `packages/core/` 작성 (Tenant, Event, Plugin 인터페이스)
3. **notification 엔진**: identity 다음 우선순위
4. **CI/CD**: 모노레포 단일 파이프라인

---

**Owner**: 사장님 (박흥식 / Tim Park)
**Version**: v0.1 (모노레포 초기 구조)
**Date**: 2026-07-11

---

> 사장님 확립: "한 엔진을 만들 때 한 폴더에 README 하나, PRD 하나, TRD 하나."