# Platform Vision v2 — Trust Architecture 적용 (Studio Engine)

> 2026-07-13
> **Studio Engine은 RC3에서 "웹사이트 생성"에서 "신뢰 경험 생성"으로 패러다임 전환**

---

## RC2 vs RC3

### RC2 (이전)
> "웹사이트 생성"

### RC3 (Vision v2)
> **"신뢰 경험 생성"**

---

## Studio 순서 (Vision v2)

```
Research
  ↓
Customer Psychology
  ↓
Trust Architecture
  ↓
Creative
  ↓
Experience
  ↓
Theme
  ↓
Component
  ↓
CMS
  ↓
Publish
```

---

## Trust Architecture 통합 단계

Studio는 다음을 통합:

1. **Research** — Industry Trust Profile 조회 (5대 산업 중)
2. **Customer Psychology** — Industry별 Customer Profile 자동 적용
3. **Trust Architecture** — Industry Trust Profile 기반 Evidence 매핑
4. **Creative** — Art Direction + Style 선택 (8 styles)
5. **Experience** — Trust Stage별 Layout 선택
6. **Theme** — Industry별 Theme Profile 자동 추천
7. **Component** — Trust 목적별 Component 선택
8. **CMS** — Trust Architecture 검증 (mandatory content check)
9. **Publish** — Trust Checklist 검증 통과 시에만 publish 가능

---

## Trust Checklist (Publish Gate)

Studio는 publish 시 **Trust Checklist** 자동 검증:

- 모든 priority 1 evidence 배치 여부
- mandatory content 모두 존재 여부
- Trust Coverage (internal score) ≥ 80% (UI 노출 금지, 내부 검증)

실패 시 **publish 차단** + Recommendations 제공.

---

## 다음 단계 (RC3 구현 시)

- [ ] Studio Draft 생성 시 Industry Trust Profile 자동 조회
- [ ] BuildSession에 `trustArchitectureId` 추가
- [ ] `verifyDraftComposition` → `verifyDraftTrustArchitecture`로 확장
- [ ] `previewDraft`가 Trust Stage별 Preview 제공
- [ ] `createPublishIntent`가 Trust Checklist 통과 필수
- [ ] `createStudioAsset`이 Trust Evidence 자산도 포함