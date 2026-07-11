# Core SDK

> **Platform Core's Third Engine (Shared SDK)**
>
> Logger · Config · Policy · Errors · Result · Event · Validation

> **One Engine = One Folder = One README = One PRD = One TRD**

---

## 이 SDK는 무엇인가?

**Core SDK**는 Platform Core의 **세 번째 엔진**으로, 모든 엔진(Identity, Notification, Booking, Media, AI 등)이 **공통으로 사용하는 SDK**입니다.

사장님 Product Owner 확립 (2026-07-11):
> **"Policy → Core SDK → Identity. Core SDK가 Logger, Config, Policy, Errors, Result, Event, Validation을 제공합니다. 그러면 Notification, Booking, Media, AI 전부 같은 SDK를 씁니다."**

---

## 책임

Core SDK는 **도메인 지식이 없습니다**. 따라서 **Engine이 아니라 SDK**로 분류됩니다.

다만, 모든 Engine이 import해서 사용하므로 **Platform의 일급 시민**입니다.

```
Policy Engine ────┐
                 ├─→ Core SDK ─→ Identity Engine (Sprint 2)
                 │            ─→ Notification Engine (Phase 2)
                 │            ─→ Booking Engine (Phase 2)
                 │            ─→ Media Engine (Phase 2)
                 │            ─→ AI Engine (Phase 2)
                 │            ─→ CMS, Review, Analytics, Workflow (Phase 2)
Universal Core ───┘
```

---

## 제공 모듈 (7개)

| 모듈 | 책임 | 사용처 |
|---|---|---|
| **Logger** | 구조화 로그 (JSON) | 모든 Engine |
| **Config** | 환경 변수 / Boot-time 설정 로딩 | 모든 Engine |
| **Policy** | IPolicyProvider 래퍼 (Policy Engine 호출) | 모든 Engine (C-14) |
| **Errors** | 도메인 에러 계층 (IdentityError, PolicyError 등) | 모든 Engine |
| **Result** | Type-safe Result<T, E> (성공/실패) | 모든 Engine (예외 대신) |
| **Event** | IEventBus 래퍼 (Universal Core 호출) | 모든 Engine (C-16) |
| **Validation** | zod 스키마 통합 + 도메인 검증 | 모든 Engine |

---

## 문서 색인

| 문서 | 내용 |
|---|---|
| [docs/01-prd.md](./docs/01-prd.md) | Product Requirements Document |
| [docs/02-trd.md](./docs/02-trd.md) | Technical Requirements Document (7개 모듈 명세) |
| [src/](./src/) | (Sprint 2 구현) |

---

## 개발 순서 (사장님 Product Owner 확립)

```
[1] Policy Engine (인터페이스 Frozen 완료)   ← 현재
[2] Core SDK (현재)                          ← 이 문서
[3] Identity Engine (Sprint 2 구현 시작)     ← 다음
```

Core SDK가 Frozen된 후에만 Identity Engine 구현이 가능 (헌법 §C-13).

---

## 다른 Engine과의 관계

```
engines/
├── policy/       ← 정책 SSoT (모든 Engine이 의존)
├── core-sdk/     ← 공통 SDK (모든 Engine이 의존)  ← 이 폴더
├── identity/     ← Identity Engine (Policy + Core SDK 의존)
├── notification/ ← (예정) (Policy + Core SDK 의존)
├── booking/      ← (예정) (Policy + Core SDK 의존)
├── media/        ← (예정) (Policy + Core SDK 의존)
└── ai/           ← (예정) (Policy + Core SDK 의존)
```

**핵심**: 모든 Engine은 **Policy Engine + Core SDK + Universal Core**만 의존.
Engine끼리 **직접 import 금지** (헌법 §C-10 Domain Isolation).

---

## Status

**Sprint 1-Design**: PRD + TRD 작성 (현재)
**Sprint 2-Implementation**: 사장님 확립 후 시작

**Owner**: 사장님 (박흥식 / Tim Park)
**Date**: 2026-07-11