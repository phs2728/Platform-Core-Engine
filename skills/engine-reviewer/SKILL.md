# Engine Reviewer Skill

> **사장님 Platform Owner 확립 (2026-07-11)**
> **AI가 코드 리뷰를 할 때 항상 같은 순서로 검토.**

## 목적

새 엔진 PR이 들어왔을 때, AI가 자동으로 표준 체크리스트로 리뷰.

## 리뷰 순서

```
1. 헌법 준수 (C-1 ~ C-23)
2. PRG (19개 질문)
3. RFC (해당 시)
4. ADR (Architecture Decision Record)
5. SDK Stability (Core SDK 하위 호환)
6. Dependency (Circular Dependency ❌)
7. Security (Token Hash, Timing Attack, PII)
8. Performance (N+1, Cache, Query)
```

## 체크리스트

### 1. 헌법 준수
- [ ] C-1: Industry Agnostic (금지 단어 없음)
- [ ] C-9: Plugin First (새 Provider 무수정 추가)
- [ ] C-13: Canonical before Code (설계 후 구현)
- [ ] C-14: Policy Injection (Config 직접 조회 ❌)
- [ ] C-15: Zero Business Logic in DB
- [ ] C-18: Circular Dependency ❌
- [ ] C-19: Working Software Validates Design
- [ ] C-20: SDK Stability (Minor 100% 호환)
- [ ] C-22: Merge Gate (실행 결과 기준)
- [ ] C-23: Conventional Commits

### 2. 코드 품질
- [ ] 모든 UseCase가 `Result<T,E>` 반환
- [ ] 모든 오류가 `PlatformError` 계층
- [ ] 모든 입력이 zod validation
- [ ] 모든 상태 변경이 `EventEnvelope` 발행
- [ ] Engine 간 직접 참조 없음
- [ ] `exactOptionalPropertyTypes` 준수
- [ ] `verbatimModuleSyntax` 준수

### 3. Security
- [ ] Timing-safe comparison (OTP, Token)
- [ ] Token Hash만 DB 저장 (raw ❌)
- [ ] PII 마스킹
- [ ] Account Lock
- [ ] Rate Limiting

### 4. Tests
- [ ] 성공 케이스
- [ ] 실패 케이스
- [ ] Edge case

### 5. Documentation
- [ ] README 존재
- [ ] Examples 존재
- [ ] engine.json 업데이트

## 리뷰 결과

```
APPROVE
REQUEST CHANGES
BLOCK
```

## 참조

- 헌법: `docs/000_PLATFORM_CONSTITUTION.md`
- PRG: `docs/Platform_Review_Gate.md`
- Import Boundary Test: `pnpm import-boundary`
- Dependency Validator: `pnpm dep`
