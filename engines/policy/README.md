# Policy Engine

> **Platform Core's Second Engine**
>
> Configuration · Policy Resolution · Tenant Override

> **One Engine = One Folder = One README = One PRD = One TRD**

---

## 이 엔진은 무엇인가?

**Policy Engine**은 Platform Core의 **두 번째 엔진**으로, Identity Engine을 포함한 **모든 엔진에 정책 서비스를 제공**합니다.

Identity Engine이 자체적으로 정책을 직접 읽던 것을 (DB 쿼리 등) Policy Engine이 대신 처리합니다.

```
[기존 구조 — ❌]
Identity ─→ DB.security_policies 직접 조회
Notification ─→ DB.notification_preferences 직접 조회

[Policy Engine 구조 — ✅]
Identity ─→ Policy Engine ─→ Platform Default
                            └→ Engine Override
                            └→ Tenant Override
Notification ─→ Policy Engine ─→ (동일)
```

---

## 책임 (사장님 Platform CTO 확립, 2026-07-11)

1. **Configuration Provider** — 모든 설정의 단일 진실 공급원
2. **Policy Resolution** — Platform / Engine / Tenant 3계층 정책 해결
3. **Policy Injection** — Engine이 직접 조회하지 않고 주입받음
4. **Hot Reload** — 정책 변경 시 캐시 무효화 (Engine 재시작 불필요)
5. **Audit** — 모든 정책 조회/변경은 Audit Log 기록

---

## 사장님 확립 원칙 (헌법 §12.7, §12.8)

> **C-14 Policy Injection**: 엔진은 Configuration을 직접 조회하지 않는다.
> **C-15 Zero Business Logic in Database**: DB는 데이터 저장만 한다.

이 두 헌법 원칙이 **Policy Engine이 존재하는 이유**입니다.

---

## 사장님 확립 3계층 Policy (헌법 §15)

```
[1] Global Policy (Platform 차원)
    모든 엔진 공통 기본값
    예: Password, Session, OAuth, Security

[2] Engine Policy (엔진별)
    특정 엔진의 정책
    예: Identity의 Enable Google, Enable Apple, Remember Me

[3] Tenant Policy (테넌트별)
    특정 회사가 자기 환경에 맞게 override
    예: Password = 8 (Restaurant) vs 12 (Tour) vs 16 (Bank)
```

**해결 순서 (사장님 확립)**:
```
Tenant Policy (있으면 사용)
    ↓ (없으면)
Engine Policy (있으면 사용)
    ↓ (없으면)
Global Policy (항상 존재)
```

---

## 문서 색인

| 문서 | 내용 |
|---|---|
| [docs/01-prd.md](./docs/01-prd.md) | Product Requirements Document |
| [docs/02-trd.md](./docs/02-trd.md) | Technical Requirements Document |
| [docs/03-interfaces.md](./docs/03-interfaces.md) | **인터페이스 정의 (사장님 우선 지정)** |
| [docs/04-resolution.md](./docs/04-resolution.md) | 3계층 Policy Resolution 알고리즘 |
| [docs/05-event-contracts.md](./docs/05-event-contracts.md) | Policy Engine 발행 Event |
| [docs/06-decisions.md](./docs/06-decisions.md) | Decision Bible |

---

## 다른 엔진과의 관계

```
Identity Engine
       ↓ (호출)
Policy Engine
       ↓ (내부적으로 사용)
Universal Core (Tenant, Event)
```

- Policy Engine은 **모든 엔진의 의존성**
- Policy Engine은 **다른 엔진에 의존하지 않음** (Universal Core만 사용)
- Policy Engine은 **두 번째로 만들어질 엔진**

---

## Status

**Sprint 1-Design**: 헌법 확립 + 인터페이스 정의 (현재)
**Sprint 2-Implementation**: 사장님 확립 후 시작
**Sprint 3-Integration**: Identity Engine이 Policy Engine 사용하도록 변경

**Owner**: 사장님 (박흥식 / Tim Park)
**Date**: 2026-07-11