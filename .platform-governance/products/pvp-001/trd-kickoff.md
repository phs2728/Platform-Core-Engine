---
product_id: PVP-001
phase: 3
deliverable: TRD Kickoff
status: drafted
filed: 2026-07-15
authority: PCR-002 + Phase 3 pipeline
inherits_from: /opt/data/envoy-hostel-trd-validation.md (legacy)
---

# TRD Kickoff — PVP-001 Phase 3

> **Phase**: 3 of 14. Maps PRD into Platform Engine / Module calls.
> **Constraint**: No new Engine creation allowed (C-24). Use only the 33 Engines in Platform Core v1.1.

---

## 1. TRD refresh targets

| # | Target | Status |
|---|---|---|
| 1 | Per-page module breakdown (Landing / Detail / Booking / Confirmation) | Drafted |
| 2 | Engine usage map (which Platform Engine does each module call?) | Drafted |
| 3 | API contract map (per Booking Engine, Payment Engine, Review Engine, etc.) | Drafted |
| 4 | Performance budget per page | Drafted |
| 5 | Hosting + scaling plan | Drafted |
| 6 | Open technical decisions (any that need ADR review) | Drafted |

---

## 2. Engine usage map (Platform Core v1.1 call sites)

PVP-001 uses the following frozen Platform Engines:

| Engine | Call sites |
|---|---|
| `booking` | Availability check, hold, confirm, cancel |
| `payment` | Payment intent, capture, refund |
| `review` | Aggregate Google + Booking.com + Hostelworld reviews |
| `notification` | Booking confirmation email, payment receipt |
| `identity` | Guest identity (lightweight) |
| `cms` | Page content (hero copy, room descriptions, FAQ) |
| `media` | Image storage, optimization, CDN |
| `search` | Room search / filter |
| `agency-os` | Operational rules (hostel hours, response SLA, manager contact) |
| `core-sdk` | Error/Result types, validation |
| `event-bus` | Cross-engine events (e.g., `booking.confirmed` → `notification` listener) |
| `organization` | Tenant (single hostel → org_id) |
| `query` | Read-model queries |

**Engines NOT used**: `experience` (deferred to Known Exception EXC-EXPERIENCE-001), `release-manager`, `agency-os` (used only in operational hooks, not user-facing).

---

## 3. Per-page module breakdown

### Landing page (`/`)

- Hero section (CMS-managed copy + media-managed image)
- Booking search box (calls `search` engine)
- Featured rooms (calls `cms` + `media`)
- Trust evidence cluster (calls `review` + `payment` engine for badges)
- CTA button (A/B variant for HYP-PVP-001-003)

### Room detail page (`/rooms/:slug`)

- Photo gallery (calls `media`)
- Room description (CMS)
- Pricing block (CMS + `booking` engine for availability)
- Cancellation policy (CMS)
- Manager profile (CMS + `media`)
- Reviews summary (calls `review`)
- Trust evidence cluster (HYP-PVP-001-004 variants)
- CTA (HYP-PVP-001-003 variants)

### Booking flow (`/book/:roomSlug`)

- Step 1: dates + guests (`booking` search again with filter)
- Step 2: guest details (`identity` light)
- Step 3: payment (`payment` intent)
- Step 4: confirmation (`booking` confirm + `notification` email + `event-bus` emit)

### Confirmation page (`/book/:bookingId`)

- Reservation summary
- Trust evidence (manager direct contact, response SLA)
- Optional cross-sell area (currently Out-of-scope per PRD §3, may appear in Phase 14 iteration)

---

## 4. Performance budget

| Page | TTFB | LCP | FID | CLS |
|---|---|---|---|---|
| Landing | < 200ms | < 2.0s | < 100ms | < 0.05 |
| Room detail | < 250ms | < 2.5s | < 100ms | < 0.05 |
| Booking flow | < 250ms | < 2.5s | < 100ms | < 0.05 |

CDN: Static assets via Media engine; HTML via SSR; dynamic via API.

---

## 5. Hosting + scaling

- **Frontend**: Vercel (per existing Platform deployment pattern).
- **Backend**: existing Platform Core deployment (read-only against v1.1 frozen).
- **Database**: Platform-managed (multi-tenant by default per Constitution §2.7).
- **Analytics**: GA4 + GTM (Ana owns).

---

## 6. Open technical decisions

| # | Question | Owner | Resolution route |
|---|---|---|---|
| 1 | Booking API rate limiting on search step (rate per IP per day) | Backend + Platform Guardian | Phase 8 (QA) |
| 2 | Cancellation policy enforcement (time-cutoff server-side vs. UI) | Backend | Phase 3 detail |
| 3 | Manager response time measurement (event-based vs. sampling) | Analytics | Phase 11 |

No new Engines required. No new Standards required. No new Playbooks required. **C-24 is satisfied** for all current TRD decisions.

---

## 7. Acceptance criteria (TRD refresh PASS)

- [ ] Every MVP feature has at least one Engine call site identified.
- [ ] Performance budgets defined per page.
- [ ] Hosting plan documented.
- [ ] Open technical decisions list reviewed by Backend.
- [ ] UX work can begin (Phase 4 gate).

---

## 8. Seal

```
TRD KICKOFF DRAFTED 2026-07-15.
No new Engines required for MVP (C-24 satisfied).
13 frozen Platform engines identified as call sites.
```
