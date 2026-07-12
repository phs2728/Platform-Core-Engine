# SPR-007 — Payment Engine Sprint 1 (RC1)

## Goal

Phase 5 Business Layer Engine: Payment Engine v0.1 RC1.
플랫폼의 결제 도메인 표준 모델과 프로세스를 제공하는 엔진 구축.
NOT a payment processor — Provider Plugin Architecture.

## Completed

### Sprint 1 UseCases (30)
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
| **Reference** | 1 | attachReference |
| **Search/List** | 2 | searchPayments, listPayments |

### Architecture
- 9-state machine: Draft→Pending→Authorized→Captured→Settled (+Cancelled/Failed/Expired/Refunded)
- Failed → Pending retry transition 지원
- Provider Plugin Architecture (`IPaymentProvider` + `IPaymentProviderResolver`)
- MockPaymentProvider for test/demo (approve/decline/fail modes)
- Webhook signature verification
- Transaction immutable ledger (every provider interaction recorded)
- Settlement batch processing (transitions Captured → Settled)
- Reconciliation (expected vs actual amount matching)
- Organization Ownership (mandatory)
- CustomDataPolicy (1회 호출 at entry)
- 10 InMemory Repositories
- 19 Event types
- 5 Host Interfaces (Organization/User/Policy/ProviderResolver/EventBus)

### Tests
- 56 tests
- 11 describe blocks: State Machine, Payment Lifecycle, Provider Decline/Fail, Full Flow, Invoice, Receipt, Settlement, Transaction, Webhook, Payment Method, Reconciliation, References

## Remaining (Sprint 2+)
- Tax calculation engine (VAT/GST/SalesTax automatic computation)
- Multi-currency exchange rate integration (Pricing Engine reference)
- Partial refund support (multiple refunds per payment)
- 3DS / SCA authorization flow
- Subscription/recurring payment support
- Webhook event → payment state auto-sync
- Dispute/chargeback handling

## Coverage
- State Machine: 11 tests
- Payment Lifecycle: 16 tests
- Provider Decline/Fail: 2 tests
- Full Flow: 1 test (create→authorize→capture→settle E2E)
- Invoice: 4 tests
- Receipt: 3 tests
- Settlement: 2 tests
- Transaction: 3 tests
- Webhook: 4 tests
- Payment Method: 4 tests
- Reconciliation: 2 tests
- References: 2 tests
- Error paths: extensive (unknown org/provider/user, bad status transitions, etc.)

## Next Sprint
Sprint 2: Tax calculation + Partial refunds + 3DS flow + Webhook→state auto-sync.
