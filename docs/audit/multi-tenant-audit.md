# Multi-Tenant Audit Report — Identity Engine

> **Sprint 2C-4 Task 5** · 2026-07-11
> Engine: `@platform/engine-identity` v1.0.0-rc.1
> 테스트 파일: `engines/identity/test/multi-tenant.test.ts`

## 1. 개요

Identity Engine의 Multi-Tenant 격리(Isolation)를 6가지 시나리오로 검증한다.
모든 데이터 접근은 `tenantId`를 기준으로 분리되어야 한다.

### 검증 항목

1. Tenant Isolation (계정 격리)
2. Cross Tenant Access (타 테넌트 접근 차단)
3. Policy Override (테넌트별 정책)
4. Data Leakage (데이터 누출 방지)
5. Event Isolation (이벤트 테넌트 분리)
6. Session Isolation (세션 테넌트 분리)

## 2. 아키텍처 분석

### tenantId 기반 격리 메커니즘

Identity Engine의 모든 Repository는 `tenantId`를 복합 키의 일부로 사용한다:

```
InMemoryAccountRepository:
  emailIndex key = `${tenantId}:${email}`
  phoneIndex key = `${tenantId}:${phone}`

InMemoryOAuthAccountRepository:
  providerIndex key = `${tenantId}:${provider}:${providerUserId}`
```

### findById의 테넌트 검증

```typescript
async findById(tenantId: string, id: string): Promise<Result<AccountRecord, Error>> {
  const record = this.records.get(id);
  if (!record || record.tenantId !== tenantId) {  // ← tenantId 불일치 시 NotFound
    return Err(new NotFoundError('Account not found', { ... }));
  }
  return Ok(record);
}
```

## 3. 시나리오별 결과

### 3.1 Tenant Isolation (계정 격리)

| 항목 | 내용 |
|------|------|
| **시나리오** | 동일 이메일이 서로 다른 테넌트에 독립적으로 존재 가능한지 |
| **테스트** | Tenant A와 Tenant B에 각각 `user@example.com` 생성 |
| **결과** | ✅ **PASS** — 서로 다른 accountId로 독립 생성됨 |

```
Tenant A: user@example.com → accountId: mt-1
Tenant B: user@example.com → accountId: mt-2 (별개 계정)
```

**같은 Tenant 내 중복 불가**:
```
Tenant A: user@example.com → 생성 성공
Tenant A: user@example.com → ConflictError
```

### 3.2 Cross Tenant Access (타 테넌트 접근 차단)

| 항목 | 내용 |
|------|------|
| **시나리오** | Tenant A의 계정을 Tenant B 컨텍스트에서 접근 시도 |
| **테스트 1** | Tenant B 컨텍스트에서 `alice@a.com` Login 시도 |
| **테스트 2** | `findById('tenant-a', tenantB계정ID)` 조회 |
| **결과** | ✅ **PASS** — 모든 크로스 테넌트 접근 차단 |

**Login 시나리오**:
```
1. Tenant A에 alice@a.com 계정 생성
2. tenantId='tenant-b'로 alice@a.com Login → AuthenticationError
   (tenant-b 컨텍스트에 해당 이메일 없음)
```

**findById 시나리오**:
```
1. Tenant B에 계정 생성 (accountId: mt-3)
2. findById('tenant-a', 'mt-3') → NotFoundError
   (tenantId 불일치 → 존재하지 않는 것으로 처리)
```

### 3.3 Policy Override (테넌트별 정책)

| 항목 | 내용 |
|------|------|
| **시나리오** | 테넌트별로 다른 비밀번호 정책 적용 |
| **테스트** | Strict(min 16자) vs Lenient(min 8자) 정책 |
| **결과** | ✅ **PASS** — 각 UseCase 인스턴스에 독립 정책 적용 |

**Strict 테넌트**:
```
정책: minLength=16, requireUppercase=true, requireSpecial=true
비밀번호 'Short1!' (7자) → ValidationError ✅
```

**Lenient 테넌트**:
```
정책: minLength=8, requireUppercase=false, requireSpecial=false
비밀번호 'simple12' (8자) → 생성 성공 ✅
```

> 각 테넌트의 `deps.policy`가 독립적으로 주입되므로,
> 동일 UseCase 함수라도 테넌트별 다른 정책 적용 가능.

### 3.4 Data Leakage (데이터 누출 방지)

| 항목 | 내용 |
|------|------|
| **시나리오** | 감사 로그가 타 테넌트 데이터를 포함하는지 |
| **테스트** | Tenant A/B 각각 감사 로그 조회 후 교차 확인 |
| **결과** | ✅ **PASS** — 감사 로그가 테넌트별로 완벽 분리 |

```
findByTenant('tenant-a') → [tenantId: 'tenant-a'] ✅ (tenant-b 없음)
findByTenant('tenant-b') → [tenantId: 'tenant-b'] ✅ (tenant-a 없음)
```

### 3.5 Event Isolation (이벤트 테넌트 분리)

| 항목 | 내용 |
|------|------|
| **시나리오** | 발행된 EventEnvelope의 tenantId가 요청과 일치하는지 |
| **테스트 1** | 단일 테넌트 이벤트 tenantId 일치 확인 |
| **테스트 2** | 다중 테넌트 이벤트 버스 독립성 확인 |
| **결과** | ✅ **PASS** — 모든 이벤트가 올바른 tenantId 포함 |

**단일 테넌트**:
```
CreateAccount(tenantId='tenant-x')
→ 모든 eventBus.events[i].tenantId === 'tenant-x' ✅
```

**다중 테넌트**:
```
depsA.eventBus → 모든 이벤트 tenantId === 't-a' ✅
depsB.eventBus → 모든 이벤트 tenantId === 't-b' ✅
(이벤트 버스 인스턴스가 분리됨)
```

### 3.6 Session Isolation (세션 테넌트 분리)

| 항목 | 내용 |
|------|------|
| **시나리오** | 세션 토큰과 세션 레코드가 테넌트 분리되는지 |
| **테스트 1** | 세션 토큰 독립성 확인 |
| **테스트 2** | Session Payload tenantId 일치 확인 |
| **결과** | ✅ **PASS** — 모든 세션 레코드가 올바른 tenantId 포함 |

```
Login(tenantId='t-a')
→ sessionRepository.all() → 모든 s.tenantId === 't-a' ✅
```

**SessionPayload tenantId 전파**:
```
Login 요청 tenantId → SessionPayload.tenantId → SessionRecord.tenantId
→ EventEnvelope.tenantId → AuditLogRecord.tenantId
```

## 4. 종합 평가

| 시나리오 | Result |
|----------|--------|
| 1. Tenant Isolation | ✅ PASS |
| 2. Cross Tenant Access | ✅ PASS |
| 3. Policy Override | ✅ PASS |
| 4. Data Leakage | ✅ PASS |
| 5. Event Isolation | ✅ PASS |
| 6. Session Isolation | ✅ PASS |

**전체 결과: 6/6 PASS**

### 격리 보장 메커니즘 요약

| 레이어 | 격리 방법 | 검증 |
|--------|-----------|------|
| Repository | 복합 키 (`tenantId:resource`) | ✅ |
| findById | tenantId 일치 검증 | ✅ |
| findByEmail | tenantId 포함 조회 | ✅ |
| Login UseCase | tenantId 컨텍스트로 계정 조회 | ✅ |
| Event Envelope | tenantId 필드 전파 | ✅ |
| Audit Log | findByTenant(tenantId) 분리 | ✅ |
| Session | SessionRecord.tenantId 일관성 | ✅ |
| Policy | UseCase 인스턴스별 독립 주입 | ✅ |

### 테스트 통계

```
Test Files  1 passed (1)
     Tests  12 passed (12)
```
