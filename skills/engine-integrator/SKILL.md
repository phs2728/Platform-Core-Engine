# Engine Integrator Skill

> **사장님 Platform Owner 확립 (2026-07-11)**
> **새 Engine이 Platform에 통합될 때 의존성/이벤트/설정을 연결.**

## 목적

새 Engine이 기존 Platform과 **올바르게 연결**되는지 검증.

## 책임

```
1. Dependency 검사 (Circular Dependency ❌)
2. Event 연결 (Event Bus 구독/발행)
3. Configuration 연결 (Policy Engine)
4. Permission 연결 (RBAC — Phase 4)
5. Notification 연결 (Phase 2)
6. Demo App 연결 (통합 테스트)
```

## 통합 순서

```
1. engine.json 의존성 확인
   ├── depends_on이 올바른가?
   ├── Circular Dependency 없는가? (pnpm dep)
   └── Phase 순서 올바른가?

2. Event 연결
   ├── events_emitted가 올바른가?
   ├── events_subscribed가 올바른가?
   ├── Event Bus가 구독 가능한가?
   └── Event Envelope version/schemaRef 명시?

3. Configuration 연결
   ├── Policy Engine에서 설정 조회하는가?
   ├── Tenant별 Policy Override 가능한가?
   └── Default 값이 정의되어 있는가?

4. Import Boundary
   ├── Core SDK만 import 하는가? (pnpm import-boundary)
   ├── 다른 Engine 직접 import ❌
   └── Event Bus 경유만 허용

5. Demo App 연결
   ├── apps/identity-demo에 통합 가능한가?
   └── End-to-End 테스트

6. CI 통과
   ├── pnpm install / lint / typecheck / test / build
   └── GitHub Actions Green
```

## Event 연결 패턴

```typescript
// Engine A (Event 발행)
await eventBus.emit(createEnvelope({
  eventType: 'identity.login.success',
  schemaRef: 'identity.login.success.v1',
  payload: { accountId, sessionId },
  ...
}));

// Engine B (Event 구독 — Notification Engine)
eventBus.on('identity.login.success', async (envelope) => {
  // envelope.tenantId로 격리
  // envelope.payload로 데이터 접근
  // envelope.schemaRef로 버전 확인
  await sendWelcomeEmail(envelope.payload.accountId);
});
```

## 의존성 매트릭스 확인

```bash
pnpm dep  # Engine Dependency Validator
# Cycle Detection + Phase Order 검증
```

```
✅ No cycles detected
✅ All engines in correct phase order
```

## 통합 체크리스트

- [ ] engine.json 의존성 올바름
- [ ] Circular Dependency 없음
- [ ] Import Boundary 준수
- [ ] Event Bus 구독/발행 올바름
- [ ] Policy Engine 설정 조회
- [ ] Demo App 통합 가능
- [ ] CI 전체 PASS

## 참조

- 헌법 §C-10: Engine-to-Engine 직접 호출 금지
- 헌법 §C-14: Policy Injection
- 헌법 §C-16: Event First Architecture
- 헌법 §C-18: Circular Dependency 금지
- Engine Dependency Graph: `docs/Engine_Dependency_Graph.md`
