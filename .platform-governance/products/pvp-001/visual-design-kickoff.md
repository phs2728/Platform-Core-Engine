---
product_id: PVP-001
phase: 5
deliverable: Visual Design Kickoff
status: drafted
filed: 2026-07-15
authority: PCR-002 + Phase 5 pipeline + Brand DNA + 사장님 확립 디자인 헌장
---

# Visual Design Kickoff — PVP-001 Phase 5

> **Phase**: 5 of 14. Visual surface that carries the brand and the Trust Evidence.
> **Source**: Brand DNA Report + Trust Evidence Blueprint + 사장님 확립 디자인 헌장 (Kinfolk / Aman급 럭셔리 미니멀, Pretendard + qvevri-wine).

---

## 1. Visual design principles (사장님 확립 — verbatim from memory)

| Principle | Rule |
|---|---|
| Density | Kinfolk / Aman급 럭셔리 미니멀 — 정돈된 공간, 압도하지 않는 위계 |
| Typography | Pretendard ExtraBold(800) 제목 + Pretendard 400 본문. **세리프 거부** (Playfair, NotoSerifKR, RIDIBatang 등) |
| Color palette | caucasus-snow(#faf8f5) / qvevri-wine(#7c2d3a) / forest-stone(#292524) |
| Avoid | AI 그라데이션, shadow-xl 둔탁함, 순흑(#000), 검색창 든 히어로, sky/cyan |
| Prefer | 고스트 버튼, text-shadow 가시성, Apple/Nike fixed 히어로, Bento Box 비대칭, Framer Motion spring 슬라이더, 비디오 히어로, rounded-xl |

---

## 2. Page composition (Phase 5 outputs)

### Landing

- **Hero**: Fixed full-bleed video hero (hostel exterior, soft motion) — Apple/Nike 패턴.
- **Hero overlay text**: Pretendard ExtraBold 800, qvevri-wine 또는 흰색(text-shadow 적용).
- **Booking CTA**: 고스트 버튼 (wine stroke + snow text on hover fill), bottom-right 또는 center-bottom.
- **Featured rooms**: Bento Box layout, asymmetric.
- **Trust cluster**: Google rating badge + reviews summary + secure-payment + refundability.

### Room detail

- Photo gallery: large hero + scrollable thumbnails.
- Pricing block: transparent, with cancellation policy inline (font-weight 600 for emphasis).
- Manager profile: large photo (caucasus-snow border), name, response-time badge.
- Reviews summary: persona-tagged filters.

### Booking flow

- Sticky CTA on step 3 (payment) — sticky-book behavior per HYP-PVP-001-003.
- Step indicator (4 steps), minimal.
- Trust evidence cluster repeated on step 3.

### Confirmation

- Restrained typography: large "You're booked" with brushstroke accent.
- Manager contact with response time SLA.
- Optional cross-sell region (placeholder until Phase 14).

---

## 3. Component library

| Component | Source | Style |
|---|---|---|
| Button (ghost, primary, secondary) | Component engine | rounded-xl, qvevri-wine stroke or fill |
| Card (room, review, evidence) | Component engine | rounded-xl, soft shadow, snow background |
| Hero | Component engine | fixed full-bleed, motion, layered overlay text |
| Trust badge cluster | Component engine | 4-up grid with icon + label |
| Form fields | Component engine | Pretendard 400, ample padding, qvevri-wine focus |
| Modal / Dialog | Component engine | rounded-xl, dimmed scrim (forest-stone 70%) |

All components use **existing Platform Component Engine** (C-24 satisfied — no new component engine needed).

---

## 4. Forbidden patterns (re-confirmed)

| Pattern | Forbidden because |
|---|---|
| AI 그라데이션 mesh | 사장님 확립 거부 |
| shadow-xl 둔탁 | 사장님 확립 거부 |
| 순흑(#000) 배경 | 사장님 확립 거부 |
| 검색창 들고 있는 히어로 (iOS Safari style) | 사장님 확립 거부 |
| sky/cyan 강조색 | 사장님 확립 거부 |
| Playfair/NotoSerifKR/RIDIBatang 제목 | 사장님 확립 거부 ("신문느낌") |
| global h1에 color 설정 (text-white 덮어씀) | 사장님 확립 거부 |

---

## 5. Hypothesis-tied visual variants

| Hypothesis | Variants |
|---|---|
| HYP-PVP-001-001 (booking page trust) | Gallery position top vs. middle; manager photo presence on/off |
| HYP-PVP-001-002 (detail page sections) | Section ordering: pricing → gallery → reviews → manager vs. gallery → pricing → reviews → manager |
| HYP-PVP-001-003 (CTAs) | Sticky vs. floating vs. inline; copy A vs. B |
| HYP-PVP-001-004 (trust evidence) | Trust badge cluster placement: header bar vs. inline with CTA vs. footer |

---

## 6. Acceptance criteria (Phase 5 PASS)

- [ ] All 4 pages (Landing / Detail / Booking / Confirmation) have high-fidelity mock-ups.
- [ ] Each page has 2+ hypothesis variants documented.
- [ ] Brand DNA + 사장님 확립 디자인 헌장 constraints validated.
- [ ] Handoff to Frontend possible.

---

## 7. Cross-references

- Brand DNA Report (`/opt/data/Brand_DNA_Report.md`)
- Trust Evidence Blueprint (`/opt/data/Trust_Evidence_Blueprint.md`)
- 사장님 확립 디자인 헌장 (memory; documented in original Council Charter)

---

## 8. Seal

```
VISUAL DESIGN KICKOFF DRAFTED 2026-07-15.
Phase 5 ready for execution (UX handoff).
Component engine is reused (C-24 satisfied).
사장님 확립 디자인 헌장 constraints documented.
```
