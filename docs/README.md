# docs/

> **Platform-Level Documentation**
>
> 헌장, ADR, KPI, Roadmap

---

## 이 폴더의 책임

이 폴더는 **플랫폼 차원의 문서**입니다. 특정 엔진에 속하지 않습니다.

```
docs/
├── 000_PLATFORM_CONSTITUTION.md   ← 헌법 (사장님 확립)
├── ADR/                           ← Architecture Decision Records
├── ROADMAP.md                     ← 플랫폼 roadmap
├── KPI.md                         ← 플랫폼 KPI
└── CHANGELOG.md                   ← 플랫폼 전체 변경 이력
```

---

## 엔진 내부 문서는 어디에?

각 엔진 폴더 안에 있습니다:

```
engines/
├── identity/
│   └── docs/
│       ├── 01-prd.md
│       ├── 02-trd.md
│       ├── ...
│       └── 15-identity-decisions.md
├── notification/   ← (예정)
└── ...
```

**규칙**: PRD/TRD/도메인 모델/스키마/API 명세는 **각 엔진의 `docs/` 안에** 둡니다.

이 `docs/` (루트)는 **플랫폼 전체에 적용되는** 헌법/ADR/로드맵만 둡니다.

---

## 헌법 vs ADR

| 종류 | 위치 | 내용 |
|---|---|---|
| 헌법 (Constitution) | `docs/000_PLATFORM_CONSTITUTION.md` | 절대 변경 안 됨. 사장님 확립만. |
| ADR | `docs/ADR/ADR-NNN-title.md` | 결정 기록. 사장님 승인 후 Frozen. |

---

**Status**: 헌법 작성 예정 (Sprint 1-Constitution)
**Owner**: 사장님 (박흥식 / Tim Park)

> 사장님 확립: "엔진 안에 있는 문서는 그 엔진의 것. 루트 docs/는 플랫폼 전체의 것."