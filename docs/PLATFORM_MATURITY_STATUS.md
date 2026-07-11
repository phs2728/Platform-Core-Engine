# Platform Core Engine — Maturity Status

> 사장님 Platform Owner 확립 (2026-07-11)
> "이 시점부터는 새로운 엔진을 만드는 것보다 각 엔진이 동일한 품질 기준(RC → Stable)을
> 반복적으로 통과하는 개발 공정을 유지하는 것이 플랫폼의 가장 큰 자산이 된다."

---

## 현재 Foundation 성숙도

| Engine | Phase | Status | Version | Sprint |
|---|---|---|---|---|
| Core SDK | 1 | ✅ Stable | v1.0.0 | Sprint 2B-2 |
| Policy | 1 | ✅ Stable | v1.0.0 | Sprint 2A |
| Identity | 1 | ✅ Stable | v1.0.0 | Sprint 2C-4 |
| User | 5 | ✅ Production | v1.0.0 | — |
| Address | 6 | ✅ Production | v1.0.0 | — |
| Organization | 3 | 🟡 RC1 | v0.1.0 | Sprint 1 |
| Authorization | 4 | 🟡 RC | v0.2.0 | — |
| Event Bus | 1 | 🟡 Beta | v0.1.0 | Phase 0 |
| Communication | 2 | 🟡 RC | v0.1.0 | — |
| **Catalog** | **4** | **🟡 RC1** | **v0.1.0** | **Sprint 1** |
| **Pricing** | **4** | **🟡 RC1** | **v0.1.0** | **Sprint 1** |

---

## Business Foundation Phase 순서 (사장님 확립 2026-07-11)

```
① Catalog (RC1) ← 완료
   ↓
② Pricing (RC1) ← 완료
   ↓
③ Media ← 다음
   ↓
④ Inventory → ⑤ Booking → ⑥ Order → ⑦ Payment → ⑧ Review
   ↓
⑨ Workflow
   ↓
⑩ Search → ⑪ Analytics → ⑫ AI
```

---

## Pricing Engine RFC 백로그 (사장님 확립, Sprint 2+)

| RFC | Priority | 항목 | 설명 |
|---|---|---|---|
| RFC-P01 | **P1** | Price Resolution Service | `resolvePrice()` 1회 호출로 최종 적용 Price 반환 (Plan + Tier + Time + Currency + Version) |
| RFC-P02 | **P1** | Effective Date Resolution | 현재 시점 기준 유효한 Price Version 자동 선택 |
| RFC-P03 | **P1** | Multi Currency Resolution | Exchange Rate 자동 적용 (USD → EUR → JPY → KRW) |
| RFC-P04 | P2 | Price Simulation | `simulatePrice()` Tier/Time/Currency 변경 시뮬레이션 (저장 ❌) |
| RFC-P05 | P2 | Explain API | `explainPrice()` 가격 결정 근거 반환 (Authorization `explain()` 패턴) |

**Stable 조건 (사장님 확립 4조건)**:
1. GitHub Actions Green
2. PRG 최종 PASS
3. Engine Certification 최종 승인
4. 실제 다른 엔진에서 사용 검증

---

## 다음 엔진: Media Engine (Phase 4)

사장님 권고 (2026-07-11):
> "Media가 먼저 있어야 이후 엔진들이 자연스럽게 연결된다."
> Catalog → 이미지, User → 프로필, Organization → 로고,
> Communication → 첨부파일, Booking → 문서, Payment → 영수증, Review → 이미지

Media Engine PRD v1.0 이미 작성 완료 (`engines/media/docs/01-prd.md`).
Sprint 1 = Catalog/Pricing 패턴 동일 적용 예정.
