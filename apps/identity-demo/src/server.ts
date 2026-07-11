/**
 * Identity Demo App — Sprint 2C-4 Task 8
 *
 * 사장님 Engineering Manager 확립:
 * "새 앱 하나만 만든다. UI는 단순해도 된다. 목적은 실제 동작 검증이다."
 *
 * CLI 기반 Demo — HTTP Server 없이 콘솔에서 전체 플로우 검증.
 */

import { createServer } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import {
  createAccountUseCase,
  loginUseCase,
  type AccountRecord,
  type IdentityPolicy,
  InMemoryAccountRepository,
  InMemorySessionRepository,
  InMemoryAuditLogRepository,
  InMemoryMfaRepository,
  InMemoryRateLimitRepository,
  InMemoryDeviceRepository,
  InMemoryPasswordHistoryRepository,
  InMemoryVerificationTokenRepository,
  TotpImpl,
  type IAccountRepository,
  type ISessionRepository,
  type IAuditLogRepository,
  type IMfaRepository,
  type IRateLimitRepository,
  type IDeviceRepository,
  type IPasswordHistoryRepository,
  type IVerificationTokenRepository,
  type IClock,
  type IIdGenerator,
  type IPasswordHasher,
  type ISessionSigner,
  type SessionPayload,
  type IEventBus,
  type IEmailSender,
  type ISmsSender,
} from '@platform/engine-identity';

// ═══════════════════════════════════════════
// In-Memory Implementations
// ═══════════════════════════════════════════

const clock: IClock = { now: () => new Date() };
let idCounter = 0;
const idGen: IIdGenerator = { generate: () => `id-${++idCounter}` };

const hasher: IPasswordHasher = {
  async hash(p) { return createHash('sha256').update(p).digest('hex'); },
  async verify(p, h) { return h === createHash('sha256').update(p).digest('hex'); },
};

const tokens = new Map<string, SessionPayload>();
const signer: ISessionSigner = {
  async sign(payload) {
    const token = `tok:${payload.sessionId}`;
    tokens.set(token, payload);
    return token;
  },
  async verify(token) { return tokens.get(token) ?? null; },
};

const eventBus: IEventBus = {
  events: [] as unknown[],
  async emit(e) { (this.events as unknown[]).push(e); },
};

const emailSender: IEmailSender = {
  outbox: [] as { to: string; subject: string; body: string }[],
  async send(m) { this.outbox.push(m); },
};

const smsSender: ISmsSender = {
  outbox: [] as { to: string; body: string }[],
  async send(m) { this.outbox.push(m); },
};

const policy: IdentityPolicy = {
  password: {
    minLength: 12, requireUppercase: true, requireLowercase: true,
    requireNumber: true, requireSpecial: true, expirationDays: 0, historyCount: 5,
  },
  session: { durationHours: 24, refreshThresholdMinutes: 60, maxConcurrent: 5 },
  security: {
    maxLoginFailures: 3, lockDurationMinutes: 30, rateLimitWindowMs: 60_000,
    rateLimitMaxRequests: 10, ipLockDurationMinutes: 15, captchaThreshold: 5,
  },
  verification: { tokenTtlMinutes: 15, otpTtlMinutes: 5, maxAttempts: 5, resendCooldownSeconds: 60 },
  mfa: { required: false, backupCodeCount: 8 },
};

// ═══════════════════════════════════════════
// Repositories
// ═══════════════════════════════════════════

const accounts = new InMemoryAccountRepository();
const sessions = new InMemorySessionRepository();
const auditLog = new InMemoryAuditLogRepository();
const mfaRepo = new InMemoryMfaRepository();
const rateLimit = new InMemoryRateLimitRepository();
const devices = new InMemoryDeviceRepository();
const pwHistory = new InMemoryPasswordHistoryRepository();
const verificationTokens = new InMemoryVerificationTokenRepository();

// ═══════════════════════════════════════════
// HTTP Server (간단한 JSON API)
// ═══════════════════════════════════════════

const server = createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method ?? 'GET';

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  try {
    // POST /register
    if (path === '/register' && method === 'POST') {
      const body = await readBody(req);
      const result = await createAccountUseCase(
        { email: body.email, password: body.password, tenantId: 'demo', correlationId: 'demo' },
        { accountRepository: accounts, passwordHasher: hasher, passwordHistoryRepository: pwHistory, idGenerator: idGen, clock, eventBus, auditLogRepository: auditLog, policy },
      );
      sendResult(res, result);
      return;
    }

    // POST /login
    if (path === '/login' && method === 'POST') {
      const body = await readBody(req);
      const result = await loginUseCase(
        { email: body.email, password: body.password, tenantId: 'demo', correlationId: 'demo', ipAddress: req.socket.remoteAddress },
        { accountRepository: accounts, passwordHasher: hasher, sessionSigner: signer, sessionRepository: sessions, mfaRepository: mfaRepo, rateLimitRepository: rateLimit, deviceRepository: devices, auditLogRepository: auditLog, eventBus, idGenerator: idGen, clock, riskHook: null, captchaVerifier: null, policy: { ...policy.security, sessionDurationHours: policy.session.durationHours } },
      );
      sendResult(res, result);
      return;
    }

    // GET /sessions
    if (path === '/sessions' && method === 'GET') {
      const all = await sessions.all();
      res.writeHead(200);
      res.end(JSON.stringify({ sessions: all }));
      return;
    }

    // GET /audit
    if (path === '/audit' && method === 'GET') {
      const logs = await auditLog.findByTenant('demo');
      res.writeHead(200);
      res.end(JSON.stringify({ audit: logs }));
      return;
    }

    // GET /health
    if (path === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'ok', engine: 'identity-demo' }));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (e) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Internal error' }));
  }
});

const PORT = 3210;
server.listen(PORT, () => {
  console.log(`╔══════════════════════════════════════╗`);
  console.log(`║  Identity Demo App                   ║`);
  console.log(`║  http://localhost:${PORT}              ║`);
  console.log(`╠══════════════════════════════════════╣`);
  console.log(`║  POST /register  {email, password}  ║`);
  console.log(`║  POST /login     {email, password}  ║`);
  console.log(`║  GET  /sessions                     ║`);
  console.log(`║  GET  /audit                        ║`);
  console.log(`║  GET  /health                       ║`);
  console.log(`╚══════════════════════════════════════╝`);
});

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

interface IncomingBody { email?: string; password?: string; [k: string]: unknown; }

async function readBody(req: import('node:http').IncomingMessage): Promise<IncomingBody> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); } catch { resolve({}); }
    });
  });
}

function sendResult(res: import('node:http').ServerResponse, result: { ok: boolean; value?: unknown; error?: { message?: string } }): void {
  if (result.ok) {
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true, data: result.value }));
  } else {
    res.writeHead(400);
    res.end(JSON.stringify({ ok: false, error: result.error?.message ?? 'Unknown error' }));
  }
}
