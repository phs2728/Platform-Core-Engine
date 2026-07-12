# Contract Report

## Per-Engine Contract Status

| Engine | Status | Critical | Warning | Info |
|---|---|---|---|---|
| address | ✅ PASS | 0 | 0 | 0 |
| authorization | ✅ PASS | 0 | 0 | 0 |
| billing | ❌ FAIL | 1 | 0 | 0 |
| catalog | ❌ FAIL | 1 | 1 | 0 |
| communication | ❌ FAIL | 11 | 0 | 0 |
| core-sdk | ✅ PASS | 0 | 0 | 0 |
| event-bus | ✅ PASS | 0 | 0 | 0 |
| identity | ✅ PASS | 0 | 0 | 0 |
| media | ✅ PASS | 0 | 0 | 0 |
| organization | ✅ PASS | 0 | 2 | 0 |
| platform-compatibility | ✅ PASS | 0 | 0 | 0 |
| policy | ✅ PASS | 0 | 0 | 0 |
| pricing | ✅ PASS | 0 | 0 | 0 |
| user | ❌ FAIL | 1 | 0 | 0 |

## Violations Detail

### billing

- **[dependency]** dependency.forbidden_import: Engine depends on unknown engine(s): order

### catalog

- **[event]** event.subscribe_missing: Engine subscribes to "user.deleted" which has no publisher

### communication

- **[event]** event.subscribe_missing: Engine subscribes to "booking.cancelled" which has no publisher
- **[event]** event.subscribe_missing: Engine subscribes to "booking.created" which has no publisher
- **[event]** event.subscribe_missing: Engine subscribes to "identity.account.created" which has no publisher
- **[event]** event.subscribe_missing: Engine subscribes to "identity.email.verified" which has no publisher
- **[event]** event.subscribe_missing: Engine subscribes to "identity.login.failed" which has no publisher
- **[event]** event.subscribe_missing: Engine subscribes to "identity.login.success" which has no publisher
- **[event]** event.subscribe_missing: Engine subscribes to "identity.password.reset" which has no publisher
- **[event]** event.subscribe_missing: Engine subscribes to "payment.completed" which has no publisher
- **[event]** event.subscribe_missing: Engine subscribes to "payment.failed" which has no publisher
- **[event]** event.subscribe_missing: Engine subscribes to "review.requested" which has no publisher
- **[event]** event.subscribe_missing: Engine subscribes to "system.announcement" which has no publisher

### user

- **[event]** event.subscribe_missing: Engine subscribes to "identity.account.created" which has no publisher
