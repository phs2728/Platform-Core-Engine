# Engine Builder Skill

> **사장님 Platform Owner 확립 (2026-07-11)**
> **AI가 새 엔진을 만드는 표준 방법.**

## 목적

AI가 `"Booking Engine 만들어줘"` 명령을 받았을 때, 자동으로 동일한 패턴으로 전체 엔진을 생성.

## 전제 조건

1. Platform Core Engine repo가 존재
2. 헌법 (C-1 ~ C-23) Frozen
3. Core SDK v1.0+ Stable
4. Engine Template (`engines/_template/`) 존재
5. Engine Generator (`pnpm create-engine`) 존재

## 엔진 생성 순서

```
1. 헌법 확인 (Industry Agnostic, Plugin First, etc.)
2. Dependency 확인 (Engine Dependency Graph)
3. PRD 작성 (목적, 책임, 하지 않는 것)
4. TRD 작성 (기술 아키텍처)
5. Decision Catalog (핵심 결정 사항)
6. Architecture Review (AVR)
7. Engine Generator 실행 (pnpm create-engine <name>)
8. Interfaces 정의 (Host가 주입)
9. Domain 로직 구현
10. Repository 구현 (In-Memory)
11. UseCases 구현 (Result<T,E> 반환)
12. Tests 작성 (성공/실패 케이스)
13. Examples 작성
14. CI 통과 (pnpm install, lint, typecheck, test, build)
15. PRG (19개 질문)
16. Engine Certification (7개 항목)
```

## 구현 규칙 (필수)

### Use Case 패턴
```typescript
import { Ok, Err, type Result, ValidationError, createEnvelope } from '@platform/core-sdk';

export async function someUseCase(
  input: SomeInput,
  deps: SomeDeps,
): Promise<Result<SomeOutput, ValidationError>> {
  // 1. zod 검증
  // 2. Repository 조회
  // 3. 비즈니스 로직
  // 4. Event 발행 (EventEnvelope)
  // 5. Audit 기록
  // 6. Result 반환
}
```

### 필수 규칙
- 모든 Use Case는 `Result<T,E>` 반환 (throw ❌)
- 모든 오류는 `PlatformError` 계층 (ValidationError, AuthenticationError, etc.)
- 모든 입력은 `zod` validation
- 모든 상태 변경은 `EventEnvelope` 발행
- 모든 설정은 Policy Engine에서 조회
- Engine 간 직접 참조 금지 (Core SDK만 import)
- `exactOptionalPropertyTypes: true` 준수 (conditional spread)
- `verbatimModuleSyntax: true` 준수 (`import type`)

### Industry Agnostic 확인
금지 단어: tour, booking, hotel, restaurant, order, product, payment, passport, travel_history

### 파일 구조
```
engines/<name>/
├── src/
│   ├── interfaces/index.ts      # Host 주입 인터페이스
│   ├── domain/                  # 순수 도메인 로직
│   ├── infrastructure/          # In-Memory 구현
│   ├── use-cases/               # UseCase 함수들
│   └── index.ts                 # Public API
├── test/
├── docs/                        # PRD, TRD
├── engine.json                  # 의존성 명세
├── package.json
├── tsconfig.json
└── README.md
```

## Merge Gate

```
pnpm install   PASS
pnpm lint      PASS
pnpm typecheck PASS
pnpm test      PASS
pnpm build     PASS
```

## 참조

- 헌법: `docs/000_PLATFORM_CONSTITUTION.md`
- PRG: `docs/Platform_Review_Gate.md`
- PAC: `docs/Platform_Acceptance_Criteria.md`
- Dependency Graph: `docs/Engine_Dependency_Graph.md`
- Engine Template: `engines/_template/`
- Reference Implementation: `engines/identity/` (v1.0 Stable)
