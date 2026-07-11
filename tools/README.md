# tools/

> **Platform Core Development Tools**
>
> 모노레포 운영 도구 (스크립트, CI/CD, 검증 도구)

---

## 이 폴더의 책임

이 폴더는 **모노레포 운영 도구**입니다. 빌드/배포/검증 자동화에 사용됩니다.

각 엔진 안에도 자체 검증 도구가 있을 수 있지만, **모노레포 전체에 적용되는 도구**는 여기에 둡니다.

---

## 예정된 도구

```
tools/
├── scripts/
│   ├── industry-agnostic-check.sh    ← 모든 엔진 Industry-Agnostic 검증
│   ├── constitution-validator.sh     ← 헌법 준수 검증
│   └── monorepo-lint.sh              ← 모노레포 단일 lint 게이트
├── ci/
│   └── pipeline.yml                  ← GitHub Actions / Turbo pipeline
└── README.md
```

---

## 규칙

- 도구는 **모든 엔진에 동일한 기준**으로 적용
- 검증 도구는 **실패 시 PR 머지 차단**
- 도구 자체도 테스트 가능해야 함 (검증 도구의 정확성을 검증)

---

## Engine 내부 도구와의 관계

| 종류 | 위치 | 적용 범위 |
|---|---|---|
| Industry-Agnostic 검증 | `tools/scripts/` | 전체 모노레포 |
| Industry-Agnostic 검증 | `engines/identity/scripts/` | identity 엔진만 |
| 헌법 검증 | `tools/scripts/` | 전체 모노레포 |

> 엔진 내부 도구는 **해당 엔진에서만** 실행.
> 루트 도구는 **모노레포 전체**에서 실행.

---

**Status**: 예정
**Owner**: 사장님 (박흥식 / Tim Park)

> 사장님 확립: "도구는 모노레포 운영의 일부분이다. 표준화되면 도구도 표준이다."