# Plugin Audit Report — Identity Engine (OAuth Providers)

> **Sprint 2C-4 Task 6** · 2026-07-11
> Engine: `@platform/engine-identity` v1.0.0-rc.1
> 테스트 파일: `engines/identity/test/plugin-audit.test.ts`

## 1. 개요

Identity Engine의 OAuth Provider Plugin 시스템을 7개 주요 Provider에 대해 검증한다.
헌법 §C-9 (Plugin First): 신규 Provider 추가 시 기존 코드 무수정 원칙.

### 검증 대상 Provider

| Provider | 상태 | 비고 |
|----------|------|------|
| Google | ✅ 실제 구현체 | `GoogleOAuthProvider` (src/providers/) |
| Apple | ✅ Mock | `IOAuthProvider` 인터페이스 준수 |
| Facebook | ✅ Mock | `IOAuthProvider` 인터페이스 준수 |
| Microsoft | ✅ Mock | `IOAuthProvider` 인터페이스 준수 |
| GitHub | ✅ Mock | `IOAuthProvider` 인터페이스 준수 |
| Kakao | ✅ Mock | `IOAuthProvider` 인터페이스 준수 |
| Naver | ✅ Mock | `IOAuthProvider` 인터페이스 준수 |

### 검증 항목

각 Provider에 대해 다음 생명주기 검증:
1. **Register** — OAuthManager에 등록
2. **Enable / Disable** — 활성/비활성 토글
3. **Remove** — 등록 해제
4. **Update** — 설정 업데이트 (clientId, clientSecret)
5. **Failure Handling** — 장애 상황 처리

## 2. OAuthManager 아키텍처

### Plugin First 설계

```typescript
class OAuthManager {
  private readonly providers = new Map<string, IOAuthProvider>();

  register(provider: IOAuthProvider): void    // 등록
  unregister(name: string): boolean             // 제거
  get(name: string): IOAuthProvider | undefined // 조회
  has(name: string): boolean                    // 존재 확인
  names(): string[]                             // 전체 이름
  list(): IOAuthProvider[]                      // 전체 목록
  toRecord(): Record<string, IOAuthProvider>    // Record 변환
  get size(): number                            // 개수
}
```

### IOAuthProvider 인터페이스

```typescript
interface IOAuthProvider {
  readonly name: string;
  exchangeCode(code: string, redirectUri: string): Promise<OAuthTokenResponse>;
  fetchUserProfile(accessToken: string): Promise<OAuthUserProfile>;
}
```

> 새 Provider 추가 시 `IOAuthProvider`를 구현하여 `OAuthManager.register()` 호출만으로 통합.
> 기존 UseCase / Manager 코드 무수정 (§C-9 준수).

## 3. 시나리오별 결과

### 3.1 Register (등록)

| 항목 | 내용 |
|------|------|
| **시나리오** | 7개 Provider를 OAuthManager에 등록 |
| **테스트 1** | 모든 Provider 동시 등록 → size === 7 |
| **테스트 2** | 각 Provider를 `get(name)`으로 조회 가능 |
| **테스트 3** | 중복 등록 시 `ConflictError` throw |
| **테스트 4** | Google 실제 구현체 등록 |
| **결과** | ✅ **PASS** (4/4 케이스 통과) |

**중복 등록 보호**:
```typescript
manager.register(googleProvider);
manager.register(googleDuplicate);  // → ConflictError
```

### 3.2 Enable / Disable (활성화/비활성화)

| 항목 | 내용 |
|------|------|
| **시나리오** | Provider 활성/비활성 토글 및 비활성 상태 동작 |
| **테스트 1** | 비활성화 시 `exchangeCode` → Error throw |
| **테스트 2** | 재활성화 후 정상 동작 |
| **테스트 3** | 7개 Provider 각각 Enable/Disable 토글 |
| **결과** | ✅ **PASS** (3/3 케이스 통과) |

**비활성 상태 동작**:
```
Provider 비활성화 → exchangeCode() → 'Provider {name} is disabled'
```

### 3.3 Remove (제거)

| 항목 | 내용 |
|------|------|
| **시나리오** | Provider 등록 해제 및 상태 확인 |
| **테스트 1** | 제거 후 `get()` → undefined |
| **테스트 2** | 존재하지 않는 Provider 제거 → false 반환 |
| **테스트 3** | 모든 Provider 제거 → size === 0 |
| **결과** | ✅ **PASS** (3/3 케이스 통과) |

**제거 후 접근 차단**:
```
manager.unregister('google') → true
manager.has('google') → false
manager.get('google') → undefined
```

### 3.4 Update (설정 업데이트)

| 항목 | 내용 |
|------|------|
| **시나리오** | Provider 설정(clientId, clientSecret) 동적 업데이트 |
| **테스트 1** | 단일 Provider 설정 업데이트 |
| **테스트 2** | 7개 Provider 각각 설정 업데이트 |
| **결과** | ✅ **PASS** (2/2 케이스 통과) |

**설정 업데이트**:
```
provider.updateConfig({ clientId: 'new-id' })
provider.getConfig().clientId → 'new-id'
```

### 3.5 Failure Handling (장애 처리)

| 항목 | 내용 |
|------|------|
| **시나리오** | Provider 장애 상황 (잘못된 코드, 프로필 조회 실패, 타임아웃) |
| **테스트 1** | Token Exchange 실패 (invalid_grant) |
| **테스트 2** | Profile Fetch 실패 (401 Unauthorized) |
| **테스트 3** | Provider Timeout (ETIMEDOUT) |
| **테스트 4** | 7개 Provider 각각 실패 모드 검증 + 복구 |
| **테스트 5** | 하나의 Provider 장애 시 다른 Provider 영향 없음 |
| **테스트 6** | `toRecord()`로 전체 Provider 조회 |
| **결과** | ✅ **PASS** (6/6 케이스 통과) |

**장애 격리**:
```
google (failMode: 'exchange') → exchangeCode() → throw
apple  (정상)                  → exchangeCode() → 정상 토큰 반환
```

> Plugin First 아키텍처로 인해 하나의 Provider 장애가 다른 Provider에 전파되지 않음.

**실패 후 복구**:
```
provider (failMode: 'exchange') → 실패
provider.updateConfig({ failMode: 'none' }) → 복구
provider.exchangeCode() → 정상 작동 ✅
```

## 4. Provider별 상세 결과

### Google
| 검증 항목 | Result |
|-----------|--------|
| Register | ✅ 실제 구현체 (`GoogleOAuthProvider`) 등록 성공 |
| Enable/Disable | ✅ 토글 동작 |
| Remove | ✅ 제거 후 접근 차단 |
| Update | ✅ 설정 업데이트 |
| Failure | ✅ 장애 처리 및 복구 |

### Apple
| 검증 항목 | Result |
|-----------|--------|
| Register | ✅ Mock 등록 성공 |
| Enable/Disable | ✅ 비활성화 후 재활성화 |
| Failure | ✅ exchange/profile 장애 처리 |

### Facebook
| 검증 항목 | Result |
|-----------|--------|
| Register | ✅ Mock 등록 성공 |
| Failure | ✅ Profile Fetch 실패 (401) 처리 |

### Microsoft
| 검증 항목 | Result |
|-----------|--------|
| Register | ✅ Mock 등록 성공 |
| Failure | ✅ Timeout (ETIMEDOUT) 처리 |

### GitHub
| 검증 항목 | Result |
|-----------|--------|
| Register | ✅ Mock 등록 성공 |
| Failure | ✅ 장애 모드 검증 |

### Kakao
| 검증 항목 | Result |
|-----------|--------|
| Register | ✅ Mock 등록 성공 |
| Lifecycle | ✅ Register → Enable → Use → Disable → Remove 전체 흐름 |

### Naver
| 검증 항목 | Result |
|-----------|--------|
| Register | ✅ Mock 등록 성공 |
| Lifecycle | ✅ Register → Update → Use → Remove 전체 흐름 |

## 5. 종합 평가

| 검증 항목 | Result | 테스트 수 |
|-----------|--------|-----------|
| Register | ✅ PASS | 4 |
| Enable/Disable | ✅ PASS | 3 |
| Remove | ✅ PASS | 3 |
| Update | ✅ PASS | 2 |
| Failure Handling | ✅ PASS | 6 |
| Lifecycle (종합) | ✅ PASS | 2 |

**전체 결과: 20/20 테스트 PASS**

### Plugin First 원칙 검증

| 원칙 | 검증 |
|------|------|
| 신규 Provider 추가 시 기존 코드 무수정 | ✅ `IOAuthProvider` 구현 + `register()`만으로 통합 |
| Provider 간 독립성 | ✅ 하나의 장애가 다른 Provider에 영향 없음 |
| 동적 생명주기 관리 | ✅ Register/Disable/Remove 런타임 지원 |
| 일관된 인터페이스 | ✅ 모든 Provider가 동일한 `exchangeCode` / `fetchUserProfile` 계약 |

### 테스트 통계

```
Test Files  1 passed (1)
     Tests  20 passed (20)
```
