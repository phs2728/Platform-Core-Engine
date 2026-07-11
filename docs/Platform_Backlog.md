# Platform Backlog (RFC Priority)

> **사장님 Platform Owner 확립 (2026-07-11)**:
> "RFC가 7개까지 늘었습니다. 이 정도면 충분합니다. 이제부터는 RFC를 무한히 만들지 말고 우선순위를 붙이세요."
> "P1만 현재 개발에 영향을 주고, P2/P3는 백로그로 유지하면 됩니다."

**Status**: 🟡 Backlog (P1만 현재 개발, P2/P3는 대기)

---

## Priority 정의

| Priority | 의미 | 처리 |
|---|---|---|
| **P1** | 현재 개발에 영향. 즉시 처리. | Active Sprint에 포함 |
| **P2** | 가까운 미래에 필요. 다음 Sprint 검토. | Backlog |
| **P3** | 장기 백로그. 기회 생기면. | Frozen (사장님 명시 없으면 보류) |

---

## Sprint 2B-2 피드백 TODO (사장님 평가 92/100)

| ID | Priority | Target | 항목 | 사유 |
|---|---|---|---|---|
| **RFC-001** | **P1** | Phase 2 | Configuration Engine 분리 (Policy Engine에서 Loader 추출) | SRP 위반. 장기적으로 별도 엔진이 됨. |
| **RFC-003** | **P1** | Sprint 2C | 3단 Cache (Memory → Redis → DB) | 매번 DB 조회 → Resolver 비효율. |
| **RFC-002** | P2 | Sprint 2C | Policy Resolution Metadata 확장 (tenantId, engine, cacheHit) | Debugging에 필수. |
| **RFC-005** | P2 | Sprint 2B | Event Bus Universal Core 통합 | EventEnvelope과 Universal Core IEventBus 연결. |
| **RFC-006** | P2 | Sprint 2C | Repository 인터페이스 (IPolicyRepository) | DB 연결 추상화. |
| **RFC-008** | P2 | Sprint 2C 이후 | Policy Engine → Core SDK PlatformError Migration | strict mode 호환성 이슈. Sprint 2B-2에서 보류. |
| **RFC-019** | **P2** | Sprint 2C 이후 | Industry-Agnostic False Positive 16건 | GitHub actions/checkout, processor, rules 등 일반 단어 제외 규칙. Sprint 2B-2 발견. |
| **RFC-004** | P3 | Future | Watch API (Hot Reload) | 정책 변경 시 자동 reload. 장기. |
| **RFC-007** | P3 | Future | Sprint 2A 후속 (Repository + Provider 실제) | 모노레포 workspace 설정 후 재검토. |

### P1 처리 (Active)

- **RFC-001**: Phase 2에서 Configuration Engine 신규 엔진으로 분리
- **RFC-003**: Sprint 2C (Identity Engine과 함께) 3단 Cache 구현

### P2 처리 (Backlog)

- **RFC-002**: Sprint 2C (Identity Engine 구현 시 Metadata 추가)
- **RFC-005**: Sprint 2B (Core SDK Event와 함께 Universal Core 통합)
- **RFC-006**: Sprint 2C (Identity Engine Repository 구현)

### P3 처리 (Frozen)

- **RFC-004**: Hot Reload — 보류 (성능 최적화 후)
- **RFC-007**: 모노레포 workspace 정리 — 보류 (사장님 명령 대기)

---

## Sprint 2C-2 확립 (사장님 Audit, 2026-07-11)

| ID | 항목 | 사유 |
|---|---|---|
| **RFC-026 (Sprint 2C-2-1)** | Email Verification | Token Hash만 DB 저장 (raw ❌) |
| **RFC-027 (Sprint 2C-2-2)** | Password Reset | Token Hash만 DB 저장 |
| **RFC-028 (Sprint 2C-2-3)** | Account Lock | 로그인 실패 N회 → 계정 잠금 |
| **RFC-029 (Sprint 2C-2-4)** | Session Refresh (Rotation) | 주기적 Session ID 재발급 |
| **RFC-030 (Sprint 2C-2-5)** | Audit Log | LOGIN_SUCCESS/FAILED, PASSWORD_*, EMAIL_*, SESSION_* |
| **RFC-031 (Sprint 2C-2-6)** | OAuth (Google, Apple, Facebook) | OAuth는 가장 마지막 (실제 서비스 우선순위) |

**사장님 확립**: 실제 서비스에서는 OAuth보다 이메일 인증/비밀번호 재설정/계정 잠금이 먼저 필요.

## 향후 RFC 후보 (장기) — **P3**

| ID | Priority | 항목 | 사유 |
|---|---|---|---|
| RFC-008 | P3 | Notification Engine | Phase 2 예정 (Identity 이후) |
| RFC-009 | P3 | Media Engine | Phase 3 예정 |
| RFC-010 | P3 | CMS Engine | Phase 3 예정 |
| RFC-011 | P3 | Audit Engine | Phase 4 예정 |
| RFC-012 | P3 | Permission (RBAC) Engine | Phase 4 예정 |
| RFC-013 | P3 | Booking Engine | Phase 5 예정 |
| RFC-014 | P3 | Payment Engine | Phase 5 예정 |
| RFC-015 | P3 | Review Engine | Phase 5 예정 |
| RFC-016 | P3 | Analytics Engine | Phase 6 예정 |
| RFC-017 | P3 | AI Engine | Phase 6 예정 |
| RFC-018 | P3 | Search Engine | Phase 6 예정 |

> 사장님 명령: "RFC를 무한히 만들지 마십시오." — Phase 2~6 엔진은 **각 Phase 진입 시** RFC 작성.

---

## RFC 진입 절차 (사장님 헌법 §C-17 준수)

```
1. RFC 후보로 등록 (이 문서) — P1/P2/P3 명시
2. 사장님/Platform CTO 검토
3. ADR 작성 (승인 시)
4. Sprint로 진입 (사장님 명령)
5. 헌법/PRD 즉석 수정 ❌
```

**P1만 즉시 Sprint 진입. P2/P3는 사장님 명령 시.**

---

## 사장님 헌법 준수

- **C-17 Stop Designing Rule**: 새 문서 만들지 말고 SPR + Backlog만
- **C-19 Working Software**: P1 RFC만 Active Sprint에 포함

---

**End of Platform Backlog v1.1** (Priority 추가)

> 사장님 Platform Owner: "P1만 현재 개발에 영향을 주고, P2/P3는 백로그로 유지하면 됩니다."