# Engine Certification

> **사장님 Product Owner 확립 (2026-07-11)**
> **모든 엔진이 Release 전에 통과해야 하는 인증 기준**

**Version**: v1.0
**Status**: 🔒 FROZEN (헌법 §C-13 적용, 변경은 ADR)
**Effective Date**: 2026-07-11
**Owner**: 사장님 (박흥식 / Tim Park)
**Companion**: [Platform_Acceptance_Criteria.md](./Platform_Acceptance_Criteria.md)

---

## 0. 목적

> **모든 엔진(Identity, Notification, Booking, CMS, Media, AI 등)은 출시 전에 7개 항목을 모두 PASS해야 한다.**

각 항목은 **명확한 PASS/FAIL 기준**을 가짐.

---

## 7개 인증 항목

| # | 항목 | 측정 방법 | 자동화 |
|---|---|---|---|
| 1 | **Architecture** | PRD/TRD/Decision/AVR 일관성 | 🟡 수동 (AVR 자동화 부분) |
| 2 | **Security** | 위협 모델 (STRIDE) 검토 + 보안 테스트 통과 | 🟢 자동 (security tests) |
| 3 | **Performance** | p95 응답시간 목표치 충족 | 🟢 자동 (k6 등) |
| 4 | **Constitution** | 헌법 C-1 ~ C-17 준수 | 🟢 자동 (verify-industry-agnostic) |
| 5 | **Documentation** | README + PRD + TRD + Decision 모두 존재 | 🟢 자동 (lint) |
| 6 | **Test** | 단위/통합/E2E 테스트 통과 + 커버리지 90%+ | 🟢 자동 (Vitest) |
| 7 | **Backward Compatibility** | SemVer 준수, Contract 변경 시 ADR | 🟡 수동 (ADR review) |

---

## 인증서 양식 (Engine Certification)

```yaml
---
engine: <name>
version: <semver>
date: YYYY-MM-DD
certified_by: <sajangnim>

architecture: PASS | FAIL
security: PASS | FAIL
performance: PASS | FAIL
constitution: PASS | FAIL
documentation: PASS | FAIL
test: PASS | FAIL
backward_compatibility: PASS | FAIL

overall: PASS | FAIL

notes: |
  <인증 메모>
---
```

---

## 항목별 상세 기준

### 1. Architecture

**PASS 기준**:
- [ ] PRD 존재 (`docs/01-prd.md`)
- [ ] TRD 존재 (`docs/02-trd.md`)
- [ ] Decision Bible 존재 (`docs/NN-decisions.md`) — 철학적 결정만
- [ ] Architecture Validation Report (AVR) PASS
- [ ] API/Event/Schema 일관성

**측정**:
```bash
# AVR 검증
cat docs/AVR/AVR-<engine>.md | grep "Status.*PASS"
# 결과: 🟢 PASS
```

### 2. Security

**PASS 기준**:
- [ ] STRIDE 위협 모델 검토 완료
- [ ] SQL Injection / XSS / CSRF / Account Enumeration / Brute Force 테스트 통과
- [ ] Argon2id (또는 동등) 비밀번호 해시
- [ ] AES-256-GCM으로 민감 정보 암호화
- [ ] Audit Log append-only + hash chain
- [ ] Rate Limiting
- [ ] PII 마스킹 (로그/응답)

**측정**:
```bash
cd engines/<name> && npm run test:security
# 결과: 0 failures
```

### 3. Performance

**PASS 기준** (사장님 확립 필요 — 기본 제안):
- [ ] Login p95 < 300ms
- [ ] Session Verify p95 < 50ms
- [ ] Token Refresh p95 < 200ms

**측정**:
```bash
# k6 부하 테스트
k6 run tools/perf/<engine>.js
# 결과: 95th percentile < target
```

### 4. Constitution

**PASS 기준** (헌법 C-1 ~ C-17):
- [ ] C-1 Industry-Agnostic — `verify-industry-agnostic.sh` 0 violations
- [ ] C-2 Multi-Tenant — 모든 테이블 `tenant_id` + RLS
- [ ] C-3 Audit Everything — 모든 mutation 이벤트 발행
- [ ] C-4 Plugin-Ready — Provider 플러그인 인터페이스
- [ ] C-5 ~ C-8 Configuration — Policy Engine 경유
- [ ] C-9 Plugin First — 기존 코드 무수정
- [ ] C-10 Domain Isolation — 다른 Engine import 금지
- [ ] C-11 Backward Compatibility — SemVer
- [ ] C-12 Public Contract — API/Event/DTO/Schema
- [ ] C-13 Canonical before Code — Frozen 후 설계 없음
- [ ] C-14 Policy Injection — IPolicyProvider
- [ ] C-15 Zero Business Logic in DB — 정책 DEFAULT 없음
- [ ] C-16 Event First — 모든 변경 Event
- [ ] C-17 Stop Designing Rule — Frozen 후 설계 금지

**측정**:
```bash
# 자동 검사
bash tools/scripts/constitution-check.sh engines/<name>
# 결과: 17/17 PASS
```

### 5. Documentation

**PASS 기준**:
- [ ] `README.md` 존재 (엔진 소개)
- [ ] `docs/01-prd.md` (PRD)
- [ ] `docs/02-trd.md` (TRD)
- [ ] Decision Bible 존재 (Level 1 철학 결정만)
- [ ] AVR PASS
- [ ] 코드 주석 (Public API)
- [ ] `CHANGELOG.md` (버전별 변경)

**측정**:
```bash
ls engines/<name>/README.md engines/<name>/docs/*.md
# 결과: 모두 존재
```

### 6. Test

**PASS 기준**:
- [ ] Unit Test 통과 (라인 커버리지 90%+)
- [ ] Integration Test 통과
- [ ] E2E Test 통과
- [ ] Security Test 통과
- [ ] CI에서 자동 실행

**측정**:
```bash
cd engines/<name> && npm test -- --coverage
# 결과: 커버리지 90%+, 0 failures
```

### 7. Backward Compatibility

**PASS 기준**:
- [ ] SemVer 준수 (Major/Minor/Patch)
- [ ] Public Contract 변경 시 ADR 작성
- [ ] v1.x 내 API 안정성 보장
- [ ] Deprecation 정책 (6개월 통지)
- [ ] v1 → v2 시 마이그레이션 가이드

**측정**:
```bash
# Contract 변경 검사
git diff --stat main..HEAD engines/<name>/src/index.ts
# 결과: 변경 사항이 ADR에 기록되어야 함
```

---

## 인증 흐름

```
[1] Engine 구현 완료
   ↓
[2] PR 생성
   ↓
[3] 자동 검사 (CI)
    - Constitution (C-1~C-17) 자동 PASS
    - Test 자동 실행
    - Security 자동 실행
    - Performance 자동 실행
    - Documentation 자동 lint
   ↓
[4] 수동 인증 (Architect + 사장님)
    - Architecture (AVR PASS 확인)
    - Backward Compatibility (ADR review)
   ↓
[5] Engine Certification 서명
   ↓
[6] Release (Tag + CHANGELOG + Deploy)
```

---

## 인증 책임

| 역할 | 책임 |
|---|---|
| **Engine Architect** | Architecture + Documentation |
| **Security Lead** | Security |
| **Performance Engineer** | Performance |
| **QA Lead** | Test |
| **Platform Architect** | Constitution + Backward Compatibility |
| **사장님 (Product Owner)** | 최종 Release 승인 |

---

## 인증 예시 (Identity Engine v1.0.0)

```yaml
---
engine: identity
version: 1.0.0
date: 2026-XX-XX
certified_by: 사장님

architecture: PASS
security: PASS
performance: PASS
constitution: PASS
documentation: PASS
test: PASS
backward_compatibility: PASS

overall: PASS

notes: |
  Identity Engine v1.0.0 인증 완료.
  - PRD/TRD/Decision (8개 철학)/AVR 모두 PASS
  - 17개 헌법 원칙 준수
  - 11개 테이블 + 31 API endpoints + 26 Events 일관성 확인
  - Unit/Integration/E2E/Security 테스트 모두 통과
  - 커버리지 90%+

  Sprint 2 구현 완료 후 인증.
---
```

---

**End of Engine Certification v1.0**

> 사장님 Product Owner 확립: "모든 엔진은 출시 전에 인증을 받아야 합니다."