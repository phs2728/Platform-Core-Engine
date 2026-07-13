# Platform Vision v2 — Trust Architecture 적용 (Theme Engine)

> 2026-07-13
> **Theme Engine은 RC3에서 "색상/타이포 생성"에서 "브랜드 신뢰감 표현"으로 패러다임 전환**

---

## RC2 vs RC3

### RC2 (이전)
> "색상/타이포 생성"

### RC3 (Vision v2)
> **"브랜드 신뢰감을 표현하는 시각 언어"**

---

## Trust 표현 패턴

### Luxury
```
큰 여백
+ 고급 사진
+ 절제된 Motion
+ Editorial Typography
= Trust
```

### Editorial
```
Magazine grid
+ Long-form typography
+ Pull quotes
= Trust (전문성)
```

### Minimal
```
Generous whitespace (60%+)
+ Single focal point
= Trust (집중)
```

---

## Industry별 Theme Profile 연동

Theme Manifest는 5대 산업의 Trust Profile에 따라 **자동 추천**된다:

| Industry | Theme Profile |
|---|---|
| **Restaurant** | Warm + Editorial + Lifestyle Photography |
| **Hotel** | Luxury + Generous Whitespace + Subtle Motion |
| **Travel** | Premium + Editorial + Local Photography |
| **Hospital** | Corporate + Trustworthy + Clear Hierarchy |
| **SaaS** | Modern + Trust + API Documentation Style |

---

## 다음 단계 (RC3 구현 시)

- [ ] Theme Manifest가 Industry 선택 시 자동 Trust Profile 적용
- [ ] Color Profile이 Industry별 Trust palette 매핑
- [ ] Theme는 점수 UI를 절대 표시하지 않음 (V2 Vision)