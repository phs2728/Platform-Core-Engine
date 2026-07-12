# Payment Engine

**Phase 5 — Business Layer Engine**

Platform SSoT for **payment domain model**: intent, authorization, capture, refund, settlement, invoice, receipt, tax, and payment methods.

**NOT a payment processor** — uses Provider Plugin Architecture. The engine defines the interfaces; the Host provides real provider implementations (Stripe, Adyen, PayPal, Square, etc.).

## Acceptance

> "Payment Engine을 삭제하면 플랫폼의 결제, 정산, 영수증, 세금 처리가 모두 사라지는가?"

**YES** — 플랫폼의 모든 서비스가 결제 처리와 정산 기능을 수행할 수 없다.

## Single Responsibility

- Payment Intent (9-state machine)
- Authorization / Capture / Void / Refund
- Settlement (batch reconciliation)
- Invoice (financial document)
- Receipt (customer-facing)
- Tax (VAT, GST, Sales Tax, Custom)
- Payment Method (tokenized)
- Payment Provider (Plugin Architecture)
- Webhook (provider event ingestion)
- Reconciliation (audit-grade matching)

Provider 결제 처리 자체는 Host가 구현한다.

## Public API (30 UseCases)

| Domain | Count | UseCases |
|--------|-------|----------|
| **Payment** | 8 | create, authorize, capture, cancel, refund, void, retry, expire |
| **Invoice** | 4 | create, update, issue, cancel |
| **Receipt** | 2 | generate, get |
| **Settlement** | 3 | create, complete, list |
| **Transaction** | 3 | get, list, search |
| **Webhook** | 3 | receive, replay, verifySignature |
| **Payment Method** | 3 | register, archive, list |
| **Reconciliation** | 1 | runReconciliation |

## State Machine (9 states)

```
Draft → Pending → Authorized → Captured → Settled
                 │           │           │
                 ├──→ Cancelled (terminal)
                 ├──→ Failed (terminal, can retry)
                 └──→ Expired (terminal)
Captured → Refunded (terminal)
```

## Provider Plugin Architecture

Engine defines `IPaymentProvider` — Host implements:
- `authorize()` / `capture()` / `void()` / `refund()`
- Provider never touches card numbers / bank details

## Status: v0.1.0-rc1 (Sprint 1)
