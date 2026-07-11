<!--
사장님 Product Owner 확립 (2026-07-11)
PRG (Platform Review Gate)와 함께 작동.
모든 PR은 아래 체크리스트를 통과해야 함.
-->

## 📋 PR Type

- [ ] 🆕 New Engine (engines/<name>/ 추가)
- [ ] 🔌 New OAuth Provider
- [ ] ⚙️ Configuration / Policy 변경
- [ ] 🐛 Bug Fix
- [ ] 📝 Documentation
- [ ] 🔒 Security Fix
- [ ] ♻️ Refactor

## 🎯 관련 자산

- Engine: <!-- identity / policy / core-sdk / other -->
- Decision ID: <!-- D-IDN-XXX -->
- ADR: <!-- ADR-NNN -->
- PAC: <!-- PAC-XXX (영향 있는 경우) -->

---

## ✅ PRG 체크리스트 (사장님 Product Owner 확립, 2026-07-11)

> **아래 6개 항목 모두 통과해야 PR merge 가능.**

- [ ] **□ Constitution 위반 없음** (헌법 C-1 ~ C-17 준수, [docs/000_PLATFORM_CONSTITUTION.md](./docs/000_PLATFORM_CONSTITUTION.md))
- [ ] **□ PAC 영향 없음** (또는 영향 있으면 [docs/Platform_Acceptance_Criteria.md](./docs/Platform_Acceptance_Criteria.md) 업데이트)
- [ ] **□ ADR 필요 없음** (Breaking Change / Schema 변경 / 헌법 변경 시 ADR 필수)
- [ ] **□ Backward Compatibility 유지** (Public API/Event/DTO/Schema 변경 시 6개월 Deprecation + ADR)
- [ ] **□ Test 작성 완료** (Unit + Integration, 커버리지 90%+)
- [ ] **□ Documentation 업데이트** (PRD/TRD/Decision Bible/AVR/PRG 중 영향 받은 것)

---

## 🔍 PRG 자동 검사 (15개)

> **CI에서 자동 실행. 실패 시 머지 차단.**

### Architecture (3)
- [ ] **A-1** Engine이 Policy를 직접 참조하지 않음 (`grep "db.query.*polic" = 0`)
- [ ] **A-2** Engine이 Config를 직접 읽지 않음 (`grep "process.env" = 0`)
- [ ] **A-3** Engine이 다른 Engine을 직접 호출하지 않음 (`grep "engines/[a-z]" = 0`)

### Platform (4)
- [ ] **P-1** 새 OAuth Provider 무수정 추가 가능
- [ ] **P-2** 새 Tenant 무수정 생성 가능
- [ ] **P-3** 새 Engine 30분 내 추가 가능
- [ ] **P-4** Engine 독립 테스트 가능 (`cd engines/<name> && npm test` exit 0)

### Security (4)
- [ ] **S-1** 모든 보안 이벤트 Event 발생
- [ ] **S-2** Audit Log 누락 없음 (모든 mutation append)
- [ ] **S-3** 비밀번호 평문 로그/저장 없음 (`grep "console.log.*password" = 0`)
- [ ] **S-4** Rate Limiting 우회 불가

### Performance (4)
- [ ] **PF-1** Login p95 < 목표 (기본 300ms)
- [ ] **PF-2** Session 조회 p95 < 목표 (기본 50ms 캐시 적중)
- [ ] **PF-3** 동시 1,000명 p95 < 목표
- [ ] **PF-4** N+1 쿼리 없음 (코드 review)

---

## 👥 PRG 수동 Review (4개)

> **Architect + 사장님 review 필수.**

- [ ] **A-4** Engine 책임 범위 내 (Manual)
- [ ] **M-1** 새 개발자가 하루 안에 이해 가능한 구조
- [ ] **M-2** 문서와 코드 일치
- [ ] **M-3** 테스트가 의도를 설명

---

## 🔗 관련 문서

- [헌법 (Constitution)](./docs/000_PLATFORM_CONSTITUTION.md)
- [PAC](./docs/Platform_Acceptance_Criteria.md)
- [Engine Certification](./docs/Engine_Certification.md)
- [PRG](./docs/Platform_Review_Gate.md)
- [AVR-001 (Identity Engine)](./docs/AVR/AVR-001-identity-engine.md)

---

## 📝 변경 요약

<!-- 무엇을, 왜, 어떻게 변경했는지 간단히 -->

### What
-

### Why
-

### How
-

---

## 🧪 테스트 결과

```
[ ] npm test (Unit + Integration) — exit 0
[ ] npm run test:security — exit 0
[ ] npm run lint — exit 0
[ ] npm run typecheck — exit 0
[ ] tools/scripts/pac-check.sh — exit 0
[ ] tools/scripts/prg-check.sh — exit 0
```

---

## ✅ 최종 확인

- [ ] 모든 PRG 체크리스트 통과
- [ ] 모든 자동 검사 PASS
- [ ] 모든 수동 review 승인
- [ ] Conflict resolved
- [ ] Rebase 완료

---

> **사장님 확립 (2026-07-11)**: "이것이 앞으로 플랫폼 품질을 유지해 줄 것입니다."
