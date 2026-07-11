/**
 * Load Test Script — Identity Engine Login (Sprint 2C-4 Task 2)
 *
 * 사장님 지시: In-Memory 기반 Login의 동시성 성능 측정.
 * 100 / 500 / 1000 / 5000 동시 Login 요청에 대해:
 *   - Average Response Time (ms)
 *   - P95 Latency (ms)
 *   - P99 Latency (ms)
 *   - Error Rate (%)
 *
 * 실행: npx tsx test/load-test.ts
 *
 * 주의: vitest 대신 독립 실행 스크립트 (측정 정확도 위해).
 */

import {
  createAccountUseCase,
  loginUseCase,
  InMemoryAccountRepository,
  InMemorySessionRepository,
  InMemoryAuditLogRepository,
  InMemoryMfaRepository,
  InMemoryRateLimitRepository,
  InMemoryDeviceRepository,
  InMemoryPasswordHistoryRepository,
  type IdentityPolicy,
} from '../src/index.js';

// ─── 고정 Clock / ID Generator ───────────────────────────────

const fixedTime = new Date('2026-07-11T08:00:00.000Z');
let idCounter = 0;

const clock = { now: () => new Date(fixedTime) };
const idGen = { generate: () => `id-${++idCounter}` };
const hasher = {
  async hash(p: string) { return `h:${p}`; },
  async verify(p: string, h: string) { return h === `h:${p}`; },
};
const signer = {
  async sign(payload: { sessionId: string }) { return `tok:${payload.sessionId}`; },
  async verify() { return null; },
};
const eventBus = { events: [] as unknown[], async emit(e: unknown) { this.events.push(e); } };

// ─── Policy ──────────────────────────────────────────────────

const defaultPolicy: IdentityPolicy = {
  password: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
    expirationDays: 0,
    historyCount: 5,
  },
  session: { durationHours: 24, refreshThresholdMinutes: 60, maxConcurrent: 5 },
  security: {
    maxLoginFailures: 3,
    lockDurationMinutes: 30,
    rateLimitWindowMs: 60_000,
    rateLimitMaxRequests: 10_000, // 로드 테스트 중 Rate Limit 방지
    ipLockDurationMinutes: 15,
    captchaThreshold: 999,
  },
  verification: { tokenTtlMinutes: 15, otpTtlMinutes: 5, maxAttempts: 5, resendCooldownSeconds: 60 },
  mfa: { required: false, backupCodeCount: 8 },
};

// ─── 측정 유틸 ────────────────────────────────────────────────

interface LoadResult {
  concurrent: number;
  total: number;
  avgMs: number;
  p95Ms: number;
  p99Ms: number;
  errorRate: number;
  durationMs: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(Math.ceil((p / 100) * sorted.length) - 1, sorted.length - 1);
  return sorted[idx]!;
}

async function runLoadTest(concurrent: number): Promise<LoadResult> {
  const accounts = new InMemoryAccountRepository();
  const total = concurrent;

  // 사전 계정 생성 (각각 고유한 IP로 Rate Limit 회피)
  for (let i = 0; i < total; i++) {
    await createAccountUseCase(
      { email: `load${i}@test.com`, password: 'SecurePass123!', tenantId: 't-load', correlationId: `c-${i}` },
      {
        accountRepository: accounts,
        passwordHasher: hasher,
        passwordHistoryRepository: new InMemoryPasswordHistoryRepository(),
        idGenerator: idGen,
        clock,
        eventBus,
        auditLogRepository: new InMemoryAuditLogRepository(),
        policy: defaultPolicy,
      },
    );
  }

  const loginDeps = {
    accountRepository: accounts,
    passwordHasher: hasher,
    sessionSigner: signer,
    sessionRepository: new InMemorySessionRepository(),
    mfaRepository: new InMemoryMfaRepository(),
    rateLimitRepository: new InMemoryRateLimitRepository(),
    deviceRepository: new InMemoryDeviceRepository(),
    auditLogRepository: new InMemoryAuditLogRepository(),
    eventBus,
    idGenerator: idGen,
    clock,
    riskHook: null,
    captchaVerifier: null,
    policy: {
      ...defaultPolicy.security,
      sessionDurationHours: defaultPolicy.session.durationHours,
    },
  };

  const latencies: number[] = [];
  let errors = 0;
  const start = performance.now();

  // 동시 Login 요청
  const tasks: Promise<void>[] = [];
  for (let i = 0; i < total; i++) {
    tasks.push(
      (async () => {
        const reqStart = performance.now();
        try {
          const result = await loginUseCase(
            {
              email: `load${i}@test.com`,
              password: 'SecurePass123!',
              tenantId: 't-load',
              correlationId: `login-${i}`,
              ipAddress: `10.0.${Math.floor(i / 256)}.${i % 256}`,
            },
            loginDeps,
          );
          if (!result.ok) errors++;
        } catch {
          errors++;
        }
        latencies.push(performance.now() - reqStart);
      })(),
    );
  }

  await Promise.all(tasks);
  const durationMs = performance.now() - start;

  latencies.sort((a, b) => a - b);

  return {
    concurrent,
    total,
    avgMs: latencies.reduce((s, v) => s + v, 0) / latencies.length,
    p95Ms: percentile(latencies, 95),
    p99Ms: percentile(latencies, 99),
    errorRate: (errors / total) * 100,
    durationMs,
  };
}

// ─── 메인 ─────────────────────────────────────────────────────

async function main(): Promise<void> {
  const levels = [100, 500, 1000, 5000];
  const results: LoadResult[] = [];

  console.log('════════════════════════════════════════════════════════');
  console.log('  Identity Engine — Load Test (Login)');
  console.log('  Engine: In-Memory · Node.js Single Process');
  console.log('════════════════════════════════════════════════════════\n');

  for (const n of levels) {
    // 각 레벨 전 GC 힌트
    if (global.gc) global.gc();

    process.stdout.write(`  → ${n} concurrent ... `);
    const result = await runLoadTest(n);
    results.push(result);
    console.log(
      `avg=${result.avgMs.toFixed(2)}ms  p95=${result.p95Ms.toFixed(2)}ms  ` +
      `p99=${result.p99Ms.toFixed(2)}ms  err=${result.errorRate.toFixed(1)}%`,
    );
  }

  // 결과 테이블
  console.log('\n┌──────────┬──────────┬──────────┬──────────┬──────────┬───────────┐');
  console.log('│ Concurrent│ Avg (ms) │ P95 (ms) │ P99 (ms) │ Total (s) │ Err Rate  │');
  console.log('├──────────┼──────────┼──────────┼──────────┼──────────┼───────────┤');
  for (const r of results) {
    console.log(
      `│ ${String(r.concurrent).padStart(8)} │ ${r.avgMs.toFixed(2).padStart(8)} │ ` +
      `${r.p95Ms.toFixed(2).padStart(8)} │ ${r.p99Ms.toFixed(2).padStart(8)} │ ` +
      `${(r.durationMs / 1000).toFixed(2).padStart(8)} │ ${r.errorRate.toFixed(1).padStart(7)}% │`,
    );
  }
  console.log('└──────────┴──────────┴──────────┴──────────┴──────────┴───────────┘');
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
