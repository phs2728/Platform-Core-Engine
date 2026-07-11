# Platform Backlog (RFC 후보 + 사장님 피드백 TODO)

> **사장님 Platform Owner 확립 (2026-07-11)**:
> "구현 중 떠오른 아이디어는 RFC 후보 또는 백로그로 기록. 현재 Sprint에서는 구현을 완료하는 것이 우선."
> **사장님 헌법 §C-19 (Working Software Validates Design)**: 즉석 헌법/PRD 수정 ❌

**Status**: 🟡 Backlog (각 RFC는 사장님/Platform CTO 확립 시 Sprint로 진입)

---

## Sprint 2A 피드백 TODO (사장님 평가 92/100)

| ID | 항목 | 사유 | 권장 Sprint |
|---|---|---|---|
| **RFC-001** | Configuration Engine 분리 (Policy Engine에서 Loader 추출) | SRP 위반. 장기적으로 Configuration Engine이 별도 엔진이 됨. | Phase 2 (Engine Development 순서) |
| **RFC-002** | Policy Resolution Metadata 확장 | `tenantId`, `engine`, `cacheHit` 필드 추가. Debugging에 필수. | Sprint 2A 후속 또는 2C |
| **RFC-003** | 3단 Cache (Memory → Redis → DB) | 매번 DB 조회 → Resolver는 비효율. | Sprint 2C (Identity Engine과 함께) |

### RFC-001 상세

**현재**:
```
Policy Engine
├── Resolver
├── Loader  ← 여기가 문제
├── Schema
```

**장기 (사장님 권고)**:
```
Configuration Engine (Phase 2)
├── Loader
├── Schema
└── ...

Policy Engine (Phase 1)
├── Resolver
└── (Configuration Engine 호출)
```

**사장님**: "지금은 구현을 멈출 필요는 없지만, **TODO로 남겨두는 것을 권장**합니다."

### RFC-002 상세

**현재 Metadata**:
```typescript
interface PolicyResolution {
  source: PolicySource;
  policyId?: string;
  version?: number;
  resolvedAt: string;
  schemaRef?: string;
}
```

**추가 필요 (사장님)**:
```typescript
interface PolicyResolution {
  // 기존
  source: PolicySource;
  policyId?: string;
  version?: number;
  resolvedAt: string;
  schemaRef?: string;
  // 추가
  tenantId: string;   // 어느 Tenant
  engine: EngineName;  // 어느 Engine
  cacheHit: boolean;   // Memory/Redis/DB 어디서 왔나
}
```

### RFC-003 상세

**현재** (Sprint 2A):
```
Use Case
  → IPolicyProvider
  → (Repository — Sprint 2A 후속)
  → DB
```

**3단 Cache (RFC-003)**:
```
Use Case
  → IPolicyProvider
  → Memory Cache (L1)  ← 가장 빠름
  → Redis Cache (L2)
  → DB (L3)
```

**Cache Invalidation**:
- Policy 변경 시 `policy.cache.invalidated` Event 발행
- Consumer (L1, L2)가 자기 캐시 무효화

---

## 향후 RFC 후보 (장기)

| ID | 항목 | 사유 | 비고 |
|---|---|---|---|
| RFC-004 | Watch API (Hot Reload) | 정책 변경 시 자동 reload | Sprint 2A 후속 |
| RFC-005 | Event Bus Universal Core 통합 | EventEnvelope과 Universal Core IEventBus 연결 | Sprint 2B |
| RFC-006 | Repository 인터페이스 | IPolicyRepository 정의 | Sprint 2A 후속 |
| RFC-007 | Sprint 2A 후속 (Repository + Provider 실제 구현) | DB 연결 + IPolicyProvider 실제 | Sprint 2C와 함께 |

---

## RFC 진입 절차 (사장님 헌법 §C-17 준수)

```
1. RFC 후보로 등록 (이 문서)
2. 사장님/Platform CTO 검토
3. ADR 작성 (승인 시)
4. Sprint로 진입 (사장님 명령)
5. 헌법/PRD 즉석 수정 ❌
```

---

## 사장님 헌법 준수

- **C-17 Stop Designing Rule**: 새 문서 만들지 말고 SPR + Backlog만
- **C-19 Working Software**: RFC-001~003은 Sprint 2A 후속 또는 Phase 2+에서 구현

---

**End of Platform Backlog v1.0**

> 사장님 Platform Owner: "TODO로 남겨두는 것을 권장합니다."