# Policy Engine — Decision Bible

**Version**: v0.1-draft
**Status**: 🟡 Draft — 사장님 확립 대기
**Effective Date**: 2026-07-11

---

## 0. 사장님 헌법 (C-13)

> **AI는 값을 추측하지 않는다. 사장님 확립 또는 ADR 기록만 canonical.**

이 문서의 모든 결정은 **사장님이 직접 확립**해야 합니다.

---

## 1. Level 1 — 사장님 Platform CTO 확립 (2026-07-11)

| ID | 결정 | Current Value | Status |
|---|---|---|---|
| D-POL-001 | Policy Engine이 Platform의 두 번째 엔진 | `true` | ✅ Approved |
| D-POL-002 | 3계층: Global / Engine / Tenant | `true` | ✅ Approved |
| D-POL-003 | Engine은 Configuration 직접 조회 금지 (C-14) | `true` | ✅ Approved |
| D-POL-004 | DB DEFAULT는 기술 필드만 (C-15) | `true` | ✅ Approved |
| D-POL-005 | Event First Architecture (C-16) | `true` | ✅ Approved |
| D-POL-006 | Tenant Policy > Engine Policy > Global Policy 우선순위 | `tenant > engine > global` | ✅ Approved |
| D-POL-007 | Restaurant = 8, Tour = 12, Bank = 16 예시 (multi-tenant) | `tenant-specific` | ✅ Approved |
| D-POL-008 | Policy Engine은 Universal Core만 의존 (다른 엔진 import 금지) | `true` | ✅ Approved |

---

## 2. Level 2 — 사장님 확립 대기

| ID | 결정 | Allowed Values | Recommended | Status |
|---|---|---|---|---|
| D-POL-009 | Platform Global Default — Password Min Length | `8` / `10` / `12` / `14` | `12` | 🟥 Draft |
| D-POL-010 | Platform Global Default — Session Timeout (분) | `15` / `30` / `60` / `240` | `60` | 🟥 Draft |
| D-POL-011 | Platform Global Default — Login Max Failures | `3` / `5` / `10` | `5` | 🟥 Draft |
| D-POL-012 | Platform Global Default — Lock Duration (분) | `15` / `30` / `60` | `30` | 🟥 Draft |
| D-POL-013 | Cache TTL (Policy) | `60` / `300` / `600` 초 | `300` (5분) | 🟥 Draft |
| D-POL-014 | Cache TTL (Configuration) | `60` / `300` / `600` 초 | `600` (10분) | 🟥 Draft |
| D-POL-015 | Hot Reload 방식 | `Pub/Sub` / `Polling` / `Webhook` | `Pub/Sub` (Redis) | 🟥 Draft |
| D-POL-016 | Policy Versioning 보관 기간 | `30일` / `1년` / `무기한` | `1년` | 🟥 Draft |
| D-POL-017 | Policy Engine 인스턴스 위치 | `embedded` / `sidecar` / `standalone` | `embedded` | 🟥 Draft |
| D-POL-018 | 정책 변경 시 즉시 반영 vs TTL 대기 | `immediate` / `ttl` | `immediate` (audit 후 즉시) | 🟥 Draft |
| D-POL-019 | Schema 검증 실패 시 동작 | `reject` / `fallback_to_global` | `reject` | 🟥 Draft |
| D-POL-020 | Type-Safe Schema 자동 생성 도구 | `codegen` / `manual` | `codegen` (Phase 2) | 🟥 Draft |

---

## 3. 결정 프로세스

```
1. 사장님이 위 항목 중 결정할 값 전달
2. AI가 Policy Engine PRD/TRD/Schema 업데이트
3. ADR-NNN 기록
4. v1.0 Frozen 선언
5. Sprint 2-Implementation 시작 가능
```

---

**End of Policy Engine Decision Bible v0.1-draft**