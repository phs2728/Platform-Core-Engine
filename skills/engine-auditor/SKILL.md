# Engine Auditor Skill

> **사장님 Platform Owner 확립 (2026-07-11)**
> **새 엔진이 만들어질 때마다 자동으로 전체 검사.**

## 목적

엔진 Release 전 자동 감사. Sprint 2C-4 Production Readiness Audit과 동일한 체계.

## 감사 항목

```
1. PRG (19개 질문)
2. PAC (10개 영구 기준)
3. Engine Certification (7개 항목)
4. Security (14개 항목)
5. Performance (Load Test)
6. Dependency (Cycle Detection)
7. Industry Agnostic (금지 단어)
8. Breaking Change (Public API Snapshot)
```

## 감사 순서

### Phase 1: 자동 검사 (CI)
```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm import-boundary
pnpm dep
pnpm industry-agnostic
pnpm public-api-snapshot
pnpm commit-lint
```

### Phase 2: Security Audit (14개 항목)
1. SQL Injection
2. Timing Attack (timingSafeEqual 사용 확인)
3. Replay Attack (markUsed 확인)
4. CSRF (Host 책임 안내)
5. Session Fixation (새 Session ID 확인)
6. JWT Algorithm Confusion (Host 책임 안내)
7. OAuth State Validation (Host 책임 안내)
8. PKCE (Host 책임 안내)
9. Cookie Security (Host 책임 안내)
10. Password Hash Cost
11. Token Hash Storage (SHA256 only)
12. Secret Leakage
13. Sensitive Logging (PII 마스킹)
14. PII Masking

### Phase 3: Performance
- Load Test (100, 500, 1000, 5000)
- P95, P99, Error Rate

### Phase 4: Recovery
- DB Down, Redis Down, SMTP Down
- OAuth Provider Down, Clock Drift
- Expired Session, Invalid Refresh Token

### Phase 5: Upgrade
- Session Token 호환성
- Refresh Token 호환성
- Event Schema 하위 호환
- Public API 호환

### Phase 6: Multi Tenant
- Tenant Isolation
- Cross Tenant Access 차단
- Policy Override
- Data/Event/Session Isolation

## 감사 결과 형식

```
Audit: <Engine Name>

Security          PASS / CONDITIONAL PASS / FAIL
Performance       PASS / CONDITIONAL PASS / FAIL
Recovery          PASS / CONDITIONAL PASS / FAIL
Upgrade           PASS / CONDITIONAL PASS / FAIL
Multi Tenant      PASS / CONDITIONAL PASS / FAIL
Industry Agnostic PASS / CONDITIONAL PASS / FAIL
Breaking Change   PASS / CONDITIONAL PASS / FAIL
PRG               PASS / CONDITIONAL PASS / FAIL
PAC               PASS / CONDITIONAL PASS / FAIL
Certification     PASS / CONDITIONAL PASS / FAIL

Final: PASS / CONDITIONAL PASS / FAIL
```

## 산출물

```
docs/audit/<engine-name>-security-audit.md
docs/audit/<engine-name>-load-test.md
docs/audit/<engine-name>-recovery-audit.md
docs/audit/<engine-name>-upgrade-audit.md
docs/audit/<engine-name>-multi-tenant-audit.md
docs/audit/<engine-name>-production-checklist.md
```

## 참조

- Identity Engine Audit (reference): `docs/audit/identity-security-audit.md`
- 헌법 §C-21: Platform Release Rule
- 헌법 §C-22: Merge Gate
