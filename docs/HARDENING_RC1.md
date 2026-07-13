# Platform Hardening RC1 — Documentation

> Sprint A-1 ~ A-8 · 2026-07-13
> **POC → Production Candidate 변환**

---

## Readiness Matrix

| Sprint | Module | Status | Tests |
|---|---|---|---|
| **A-1** | Transactional Reliability | ✅ PASS | 15 (Outbox + Idempotency + Retry + Backoff + Poison + Trace) |
| **A-2** | Tenant Context | ✅ PASS | 8 (AsyncLocalStorage + RLS + Isolation) |
| **A-3** | Architecture Enforcement | ✅ PASS | 10 (Boundary + Circular + Manifest) |
| **A-4** | Contract Testing | ✅ PASS | 8 (Registry + Schema Compat + Consumer + Version) |
| **A-5** | Observability | ✅ PASS | 10 (Logger + Metrics + Health + Tracer + Container) |
| **A-6** | Production Adapters | ✅ PASS | 3 (AdapterManager + 7 adapter interfaces) |
| **A-7** | CI Hardening | ✅ Config | ci-hardening.yaml |
| **A-8** | Documentation | ✅ This file | — |

**Total core-sdk tests: 79 PASS**

---

## Sprint A-1: Transactional Reliability

### Transactional Outbox
- `OutboxMessage` — PENDING → DISPATCHED | FAILED | DEAD_LETTER
- `OutboxDispatcher` — polls, dispatches, retries, dead-letters
- `IOutboxRepository` — save/findPending/markDispatched/markFailed/markDeadLetter
- Exponential backoff with cap
- Poison message detection after maxAttempts

### Idempotency
- `IIdempotencyStore` — check/record/get/invalidate
- `InMemoryIdempotencyStore` — TTL-based expiry
- Prevents duplicate side effects from at-least-once delivery

### Distributed Tracing
- `TraceContext` — correlationId, causationId, traceId, spanId, parentSpanId
- `createTraceContext` / `createChildTraceContext`
- `RetryPolicy` + `executeWithRetry` — exponential/linear/fixed backoff

### Dead Letter Queue
- `IDeadLetterQueue` — enqueue/dequeue/peek/replay
- `DeadLetterEntry` — original message + error + attempt count

---

## Sprint A-2: Tenant Context

### AsyncLocalStorage
- `TenantContext` — tenantId, organizationId, actorId, correlationId, trace, roles, permissions
- `runInTenantContext()` — wraps async operations with context
- `getTenantContext()` — auto-injects tenantId (no manual passing)

### RLS Ready
- `getRlsContext()` — returns `{ tenantId, organizationId, actorId }` for PostgreSQL RLS

### Tenant Isolation Validation
- `assertTenantAccess(dataTenantId)` — throws `TenantIsolationViolationError` on mismatch

---

## Sprint A-3: Architecture Enforcement

### Rules (CI must fail on violations)
1. `NO_DIRECT_ENGINE_IMPORT` — engines must not import from other engines
2. `NO_INTERFACE_TO_USECASE` — interfaces must not import from use-cases
3. `NO_DOMAIN_TO_INFRA` — domain must not import from infrastructure

### Circular Dependency Detection
- DFS-based cycle detection in module dependency graph

### Manifest Validation
- Validates engine.json structure (id, name, version, provides, strict_boundaries)

---

## Sprint A-4: Contract Testing

### Event Contracts
- `EventContract` — eventType, version, schemaRef, producerEngine, payloadSchema
- `InMemoryContractRegistry` — register/get/getAll

### Schema Compatibility
- `checkSchemaCompatibility(old, new)` — detects breaking changes (removed/changed fields)

### Consumer Contract Tests
- `runConsumerContractTest(test, actualPayload)` — verifies expected fields present

### Version Compatibility
- `isVersionCompatible(consumer, provider)` — major version must match

---

## Sprint A-5: Observability

### Structured Logging
- `ConsoleStructuredLogger` — JSON output with tenant/correlation/trace context
- Auto-injects `getTenantContextOrNull()` values

### Metrics
- `InMemoryMetricsCollector` — counter/gauge/histogram
- `MetricSample` — name/type/value/labels/timestamp

### Health Check Framework
- `DefaultHealthCheckFramework` — register/runAll
- Returns `healthy | degraded | unhealthy` aggregate status
- Records latency per check

### OpenTelemetry Interface
- `ITracer` / `ISpan` — adapter-ready (NoopTracer default, OTel adapter in production)

---

## Sprint A-6: Production Adapter Framework

### Host Interfaces (NOT tightly coupled)

| Adapter | Interface | Implementations |
|---|---|---|
| Database | `DatabaseAdapter` | PostgreSQL, MySQL |
| Cache | `CacheAdapter` | Redis, Memory |
| Message Queue | `MessageQueueAdapter` | RabbitMQ, Kafka, SQS |
| Object Storage | `ObjectStorageAdapter` | S3, GCS, Azure |
| Email | `EmailAdapter` | SMTP, SES, SendGrid |
| Payment | `PaymentAdapter` | Stripe, PayPal, Toss |
| Search | `SearchAdapter` | Elasticsearch, OpenSearch, Meilisearch |

### AdapterManager
- `register(registry)` — runtime registration
- `getDatabase/getCache/...` — lazy access with `AdapterNotConfiguredError`

---

## Sprint A-7: CI Hardening

See `ci-hardening.yaml` for full configuration.

- Coverage: 80% minimum (per-engine thresholds)
- Architecture: boundary checks + circular dependency detection
- Performance: build < 30s, tests < 60s, typecheck < 15s
- Security: npm audit + secrets scan
- License: MIT/Apache/BSD/ISC only
- **Dummy PASS forbidden**

---

## Merge Gate

```
Build           PASS
Lint            PASS
Typecheck       PASS
Tests           PASS (79/79)
Architecture    PASS (verifyBoundaries)
Outbox          PASS (dispatch + retry + DLQ)
Tenant Context  PASS (AsyncLocalStorage + RLS)
Tracing         PASS (correlationId + traceId)
Observability   PASS (logger + metrics + health)
CI              PASS (ci-hardening.yaml)
Contracts       PASS (schema compat + consumer tests)
Boundary        PASS (no engine-to-engine imports)
Production Readiness: CONDITIONAL PASS
```