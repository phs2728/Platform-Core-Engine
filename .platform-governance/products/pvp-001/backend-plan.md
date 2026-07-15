---
product_id: PVP-001
phase: 7
deliverable: Backend Plan
status: drafted (gated on PVC approval)
filed: 2026-07-15
authority: PCR-002 + Phase 7 pipeline
gate: Pre-Coding Plan MUST be pvc-approved; Frontend Phase ≥ 80%
---

# Backend Plan — PVP-001 Phase 7

> **Phase**: 7 of 14. Backend implementation plan.
> **GATE**: Pre-Coding Plan must be `pvc-approved`. Frontend Phase 6 ≥ 80% before backend deep integration begins.

---

## 1. Backend touchpoints

PVP-001 backend is the **frozen Platform Core v1.1** with consumer apps in `apps/pvp-001-hostel/`:

| Service | Engine | Behavior |
|---|---|---|
| Availability | booking | search_available_rooms(date_range, guests) → room options |
| Hold | booking | hold_room(roomId, dates, sessionId) → hold_id + expiry |
| Confirm | booking | confirm_booking(hold_id, payment_intent_id) → booking_id |
| Cancel | booking | cancel_booking(booking_id, reason) → cancellation |
| Payment intent | payment | create_payment_intent(amount, currency, idempotency_key) |
| Capture | payment | capture(intent_id) |
| Refund | payment | refund(intent_id, amount) |
| Reviews aggregate | review | list_reviews(org_id, source, page, per_page) |
| Booking confirmation | notification | send_booking_confirmation(booking_id) |
| Manager contact SLA | event-bus + agency-os | track response_time metric |

---

## 2. Booking flow server-side state machine

```
search_available_rooms (no state)
  ↓ user selects
hold_room → state: HELD (with TTL 15min)
  ↓ user pays
capture (payment intent + capture)
  ↓ both succeed
confirm_booking → state: CONFIRMED + event booking.confirmed
  ↓ on user cancel
cancel_booking → state: CANCELLED + refund
  ↓ host cancellation (Out-of-scope MVP — but the engine supports it)
```

State machine is **owned by booking engine**, not by pvp-001 app code.

---

## 3. API contract surface (per engine)

| Engine | Method | Endpoint | Auth |
|---|---|---|---|
| booking | POST /api/bookings/search | public | n/a |
| booking | POST /api/bookings/hold | public | session cookie |
| booking | POST /api/bookings/confirm | public | session cookie |
| booking | POST /api/bookings/cancel | user | bearer |
| payment | POST /api/payments/intent | public | session cookie |
| payment | POST /api/payments/capture | public | session cookie |
| payment | POST /api/payments/refund | admin | bearer |
| review | GET /api/reviews | public | n/a |
| notification | POST /api/notifications/send | internal | service token |
| agency-os | POST /api/sla/respond | staff | bearer |

All endpoints wire through the **API Gateway** which enforces tenant isolation (Constitution §2.7).

---

## 4. Idempotency, retries, errors

| Concern | Solution |
|---|---|
| Booking double-submit | Idempotency key per hold |
| Payment retry | Capture idempotency key per intent |
| Engine error | `Result<>` from core-sdk; HTTP 4xx/5xx mapped |
| Rate limit | per-IP and per-session for search; per-org for confirm |
| Audit | audit log writes for every state transition (Constitution §2.5 Audit-Everything) |

---

## 5. Performance + SLO

- Search latency: P95 < 200ms
- Hold latency: P95 < 300ms
- Confirm latency: P95 < 1s (includes payment)
- 99.9% availability target for booking pages

---

## 6. Acceptance criteria (Phase 7 PASS)

- [ ] Frontend Phase 6 ≥ 80% (gate).
- [ ] All endpoints implemented per contract.
- [ ] State machine logged + audited.
- [ ] P95 SLOs met in test environment.
- [ ] Integration tests passing.

---

## 7. Risk register

| Risk | Mitigation |
|---|---|
| Booking engine exposed APIs don't match pvp-001 needs | File ADR-002 (C-24 permits Engine contract amendments, NOT new Engines) |
| Payment provider rate limit | Pre-authorize via dedicated payment integration pattern |
| Refund logic complexity | Defer to Phase 14 |

---

## 8. Seal

```
BACKEND PLAN DRAFTED 2026-07-15.
Phase 7 BLOCKED on (a) PVC approval (Pre-Coding Plan) and (b) Frontend ≥ 80%.
Until both, NO new code.
```

## 9. **NEW ENGINE CHECK (C-24)**

| Potential new Engine | Status |
|---|---|
| Tours engine | ❌ **NOT added** — Tours integration deferred; existing `cms` + `booking` engines cover the tours-data carrier need |
| Booking-engine v2 | ❌ **NOT added** — v1.1 booking engine covers all MVP needs |
| Review-aggregation engine | ❌ **NOT added** — Review engine already aggregates |

C-24 satisfied.
