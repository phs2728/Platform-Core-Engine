# Platform Review Gate (PRG)

> **사장님 Product Owner 확립 (2026-07-11)**
> **엔진 자체를 검증하는 체크리스트 — 문서가 아닌 실제 엔진 대상**

**Version**: v1.0
**Status**: 🔒 FROZEN (헌법 §C-13 적용, 변경은 ADR)
**Effective Date**: 2026-07-11
**Owner**: 사장님 (박흥식 / Tim Park)
**Companion**: [Platform_Acceptance_Criteria.md](./Platform_Acceptance_Criteria.md), [Engine_Certification.md](./Engine_Certification.md)

---

## 0. 목적

> **엔진 구현이 끝나면 아래 5개 카테고리, 19개 질문에 모두 YES가 나와야 한다.**

- **PAC (Platform Acceptance Criteria)** = 플랫폼 단위 합격 기준
- **Engine Certification** = 7개 인증 항목 (Architecture/Security/Performance/Constitution/Documentation/Test/Backward Compatibility)
- **PRG (Platform Review Gate)** = 엔진 자체의 **19개 질문** (Architecture/Platform/Security/Performance/Maintainability)

```
[PAC]  → 10개 영구 기준 (플랫폼 단위)
[Certification] → 7개 인증 항목 (릴리스 직전)
[PRG] → 19개 질문 (PR마다 / Sprint 종료마다)
```

**PRG는 PR마다 또는 Sprint 종료 시점에 실행. 자동화 가능한 것은 자동화.**

---

## 1. Architecture (4개 질문)

| # | 질문 | PASS 기준 | 측정 방법 |
|---|---|---|---|
| **A-1** | Engine이 Policy를 **직접 참조**하지 않는가? | `IPolicyProvider` 경유만. DB 직접 쿼리 금지. | `grep "db.query.*polic" engines/<name>/src/` = 0 |
| **A-2** | Engine이 Config를 **직접 읽지** 않는가? | `IConfigProvider` 경유만. `process.env` 직접 접근 금지. | `grep "process.env" engines/<name>/src/` = 0 (테스트 제외) |
| **A-3** | Engine이 다른 Engine을 **직접 호출**하지 않는가? | Event Bus 경유만. `engines/<other>/` import 금지. | `grep "engines/[a-z]" engines/<name>/src/` = 0 |
| **A-4** | Engine이 자신의 책임 범위 밖 로직을 포함하지 않는가? | Identity는 인증만, Notification은 알림만. | Manual review (Architect) |

**자동화**: 3개 (grep 기반)
**수동**: 1개 (Architect review)

---

## 2. Platform (4개 질문)

| # | 질문 | PASS 기준 | 측정 방법 |
|---|---|---|---|
| **P-1** | 새로운 OAuth Provider를 **코드 수정 없이** 추가할 수 있는가? | 새 폴더 1개 + Registry 1줄. 기존 코드 0줄 변경. | `engines/<name>/src/provider/<new>/index.ts` 작성 후 기존 파일 diff 0줄 |
| **P-2** | 새로운 Tenant를 **코드 수정 없이** 생성할 수 있는가? | Admin Console/API로 생성. DB INSERT만. 코드 0줄. | Admin Console 시연 |
| **P-3** | 새로운 Engine을 **30분 안에** 추가할 수 있는가? | PAC-001과 동일. 폴더 + 매니페스트 + 워크스페이스 등록. | Timer 측정 |
| **P-4** | Engine이 **독립적으로 테스트** 가능한가? | Engine 단독 `npm test` 실행 가능. 다른 Engine 의존 없음. | `cd engines/<name> && npm test` exit 0 |

**자동화**: 4개 (CI에서)
**수동**: 0개

---

## 3. Security (4개 질문)

| # | 질문 | PASS 기준 | 측정 방법 |
|---|---|---|---|
| **S-1** | 모든 보안 이벤트가 **Event를 발생**시키는가? | login.success/failure/locked/disabled/2fa.changed/credentials.changed 모두 Event 발행. | Event 카탈로그 vs Use Case 매칭 |
| **S-2** | **Audit Log**가 빠지는 경우가 없는가? | 모든 인증 mutation → audit_logs append. | 코드 커버리지 + Audit Log e2e |
| **S-3** | 비밀번호가 **평문으로 로그/저장**되지 않는 않는가? | Argon2id 해시. 로그/응답에 평문 없음. | `grep "console.log.*password" engines/<name>/src/` = 0 |
| **S-4** | **Rate Limiting**이 우회 불가능한가? | IP/Identifier 기반 한도. X-Forwarded-For 신뢰는 명시적 설정. | 부하 테스트 + Bypass 시뮬레이션 |

**자동화**: 4개 (CI + e2e)
**수동**: 0개

---

## 4. Performance (4개 질문)

| # | 질문 | PASS 기준 | 측정 방법 |
|---|---|---|---|
| **PF-1** | 로그인이 **병목**이 되지 않는가? | Login p95 < 300ms (사장님 확립 시) | k6 부하 테스트 |
| **PF-2** | **Session 조회**가 확장 가능한가? | Session 검증 < 50ms (캐시 적중) / 200ms (DB) | k6 부하 테스트 |
| **PF-3** | **동시 사용자** 1,000명까지 p95 < 목표? | (사장님 확립 시) | k6 부하 테스트 |
| **PF-4** | **DB 쿼리**가 N+1 문제가 없는가? | Repository 메서드 단위 쿼리 카운트. | 코드 리뷰 + slow query log |

**자동화**: 4개 (k6 + slow query)
**수동**: 0개

---

## 5. Maintainability (3개 질문)

| # | 질문 | PASS 기준 | 측정 방법 |
|---|---|---|---|
| **M-1** | 새로운 개발자가 **하루 안에** 이해할 수 있는가? | README → PRD → TRD 순서로 읽으면 Use Case 흐름 파악 가능. | 외부 개발자 onboarding 시간 측정 |
| **M-2** | **문서와 코드가 일치**하는가? | Decision Bible의 Status가 실제 구현과 일치. Deprecated된 API가 문서에 없음. | PR review + AVR |
| **M-3** | **테스트가 의도를 설명**하는가? | 테스트 이름이 "왜"를 설명. 구현 세부 X. | 코드 review |

**자동화**: 0개
**수동**: 3개 (외부 개발자 onboarding + review)

---

## 6. PRG 판정

```
PRG PASS 조건: 19/19 YES

자동 항목 (15개) → CI에서 자동 검사
수동 항목 (4개) → Architect + 사장님 review
```

| 카테고리 | 자동 | 수동 | 합계 |
|---|---|---|---|
| Architecture | 3 | 1 | 4 |
| Platform | 4 | 0 | 4 |
| Security | 4 | 0 | 4 |
| Performance | 4 | 0 | 4 |
| Maintainability | 0 | 3 | 3 |
| **합계** | **15** | **4** | **19** |

---

## 7. PRG 자동화 도구

`tools/scripts/prg-check.sh` (구현 예정):

```bash
#!/bin/bash
# Platform Review Gate - 자동 검사 (15개)

ENGINE=$1  # 'identity' | 'policy' | 'core-sdk' | ...

# Architecture (3)
echo "=== Architecture ==="
[ $(grep -r "db.query.*polic" engines/$ENGINE/src/ 2>/dev/null | wc -l) -eq 0 ] && echo "A-1 PASS" || echo "A-1 FAIL"
[ $(grep -r "process.env" engines/$ENGINE/src/ 2>/dev/null | wc -l) -eq 0 ] && echo "A-2 PASS" || echo "A-2 FAIL"
[ $(grep -rE "engines/[a-z]+" engines/$ENGINE/src/ 2>/dev/null | wc -l) -eq 0 ] && echo "A-3 PASS" || echo "A-3 FAIL"

# Security (2)
[ $(grep -r "console.log.*password" engines/$ENGINE/src/ 2>/dev/null | wc -l) -eq 0 ] && echo "S-3 PASS" || echo "S-3 FAIL"

# ... etc
```

**CI 통합**: PR마다 자동 실행. 실패 시 머지 차단.

---

## 8. PRG vs Engine Certification vs PAC

| 도구 | 시점 | 목적 | 자동화 |
|---|---|---|---|
| **PAC** | 플랫폼 단위 (10개 영구 기준) | 플랫폼이 진짜 플랫폼인지 | 3 자동, 7 수동 |
| **PRG** | PR / Sprint 종료 (19개 질문) | 엔진이 진짜 엔진인지 | 15 자동, 4 수동 |
| **Certification** | Release 직전 (7개 인증) | Release 가능 여부 | 4 자동, 3 수동 |

**3개가 상호 보완**:
- PAC = 플랫폼의 약속
- PRG = 엔진의 자기 점검
- Certification = Release의 최종 관문

---

## 9. PRG 실행 흐름

```
[1] Sprint 2A 시작
    ↓
[2] 구현
    ↓
[3] PR 생성
    ↓
[4] PRG 자동 검사 (CI) — 15개 자동
    ↓ (PASS)
[5] PRG 수동 review (Architect + 사장님) — 4개 수동
    ↓ (PASS)
[6] Merge
    ↓
[7] Sprint 2B 시작
    ...
```

---

## 10. Identity Engine PRG 예상 결과 (Sprint 2C 종료 시점)

| # | 질문 | 예상 |
|---|---|---|
| A-1 | Identity가 Policy 직접 참조? | ✅ NO (IPolicyProvider 경유) |
| A-2 | Identity가 Config 직접 읽음? | ✅ NO (IConfigProvider 경유) |
| A-3 | Identity가 다른 Engine 직접 호출? | ✅ NO (Event Bus 경유) |
| A-4 | Identity 책임 범위? | ✅ YES (인증/보안/세션/자격증명/감사) |
| P-1 | 새 OAuth Provider 무수정 추가? | ✅ YES (Plugin 패턴) |
| P-2 | 새 Tenant 무수정 생성? | ✅ YES (Admin Console) |
| P-3 | 새 Engine 30분 추가? | 🟡 TBD (Identity 자체가 기준) |
| P-4 | 독립 테스트? | ✅ YES (Engine 단독 npm test) |
| S-1 | 모든 보안 이벤트? | ✅ YES (29개 Event) |
| S-2 | Audit Log 누락? | ✅ NO (모든 mutation append) |
| S-3 | 비밀번호 평문? | ✅ NO (Argon2id) |
| S-4 | Rate Limit 우회? | ✅ NO (Redis + trusted proxy) |
| PF-1 | Login 병목? | 🟡 TBD (k6 측정) |
| PF-2 | Session 조회 확장? | 🟡 TBD (k6 측정) |
| PF-3 | 동시 1,000명? | 🟡 TBD (사장님 확립) |
| PF-4 | N+1? | 🟡 TBD (코드 리뷰) |
| M-1 | 하루 이해? | 🟡 TBD (외부 개발자 측정) |
| M-2 | 문서-코드 일치? | 🟡 TBD (review) |
| M-3 | 테스트 의도? | 🟡 TBD (review) |

**총 19개 중 자동 측정 가능 15개, 사장님/Architect review 4개.**

---

**End of Platform Review Gate v1.0**

> 사장님 Product Owner 확립: "엔진 자체를 검증하는 체크리스트 — 문서가 아닌 실제 엔진 대상"