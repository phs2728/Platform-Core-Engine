# examples/

> **Host Integration Examples**
>
> 호스트가 엔진을 통합하는 예시 코드

---

## 이 폴더의 책임

이 폴더에는 **호스트가 엔진을 어떻게 통합하는지** 보여주는 예시 코드가 들어갑니다.

엔진 자체(`engines/*`)는 **호스트 독립적**이지만, 실제 사용 패턴을 보여주기 위한 reference implementation이 필요합니다.

---

## 예정된 예시

```
examples/
├── hono-server/        ← Hono 호스트 통합 (예정)
├── nextjs-app/         ← Next.js 15 호스트 통합 (예정)
├── worker-thread/      ← Argon2id Worker Thread 예시 (예정)
└── vercel-edge/        ← Vercel Edge Runtime 예시 (예정)
```

---

## 규칙

- `examples/` 안의 코드는 **production-ready가 아님**
- 참조용이며, 사장님 확립 표준 패턴을 따름
- 새 호스트 통합 패턴이 나오면 자유롭게 추가
- 엔진 내부 코드는 **수정 금지** (엔진 = 라이브러리)

---

**Status**: 예정 (각 엔진별 Sprint에 작성)
**Owner**: 사장님 (박흥식 / Tim Park)

> 사장님 확립: "엔진은 라이브러리다. 호스트가 가져다 쓴다. examples는 그 사용법을 보여준다."