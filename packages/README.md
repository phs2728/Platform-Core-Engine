# packages/

> **Shared Platform Core Packages**
>
> 모든 엔진이 공통으로 의존하는 패키지들

---

## 이 폴더의 책임

여기에 사는 것들은 **어떤 엔진에도 종속되지 않는** 순수한 패키지들입니다.

엔진(예: `engines/identity/`, `engines/notification/`)이 가져다 쓰는 **공통 어휘**를 정의합니다.

---

## 예정된 패키지

| 패키지 | 책임 | 상태 |
|---|---|---|
| `@platform/core` | Universal Core 추상화 (Tenant, Event, Entity, Plugin 인터페이스) | 예정 |
| `@platform/primitives` | 공통 value object, type, util (UUID, Money, Time 등) | 예정 |
| `@platform/testing` | 테스트 헬퍼, fixture, mock factory | 예정 |

---

## 의존성 규칙

```
packages/*   ← engines/* (engines는 packages에 의존 가능)
engines/*    ← packages/* (packages는 engines를 import 금지)
engines/*    ← engines/* (엔진끼리 직접 import 금지, Event Bus로만 통신)
```

> 패키지는 엔진을 절대 import 하지 않습니다.
> 패키지는 도메인 지식이 없습니다.

---

## 패키지 추가 절차

1. 사장님 확립 (헌법 Extension Rules)
2. ADR-NNN 작성
3. `packages/<name>/` 생성
4. `package.json` 작성 (사장님 확립 naming convention 준수)
5. 단위 테스트 100%
6. PR 제출

---

**Status**: 예정 (Sprint 3+)
**Owner**: 사장님 (박흥식 / Tim Park)
**Version**: v0.1 (placeholder)

> 사장님 확립: "패키지는 엔진을 import 하지 않는다. 패키지는 도메인 지식이 없다."