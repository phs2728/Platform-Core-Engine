/**
 * Communication Demo App — Sprint Communication Engine
 * CLI 기반 동작 검증.
 */

import { createServer } from 'node:http';
import {
  sendMessageUseCase,
  createTemplateUseCase,
  setPreferenceUseCase,
  InMemoryMessageRepository,
  InMemoryTemplateRepository,
  InMemoryPreferenceRepository,
  InMemoryAnalyticsRepository,
  InMemoryProviderManager,
  InMemoryChannelProvider,
  DefaultTemplateRenderer,
} from '@platform/engine-communication';

const clock = { now: () => new Date() };
let idCounter = 0;
const idGen = { generate: () => `id-${++idCounter}` };
const eventBus = { events: [] as unknown[], async emit(e: unknown) { (this.events as unknown[]).push(e); } };

const messages = new InMemoryMessageRepository();
const templates = new InMemoryTemplateRepository();
const prefs = new InMemoryPreferenceRepository();
const analytics = new InMemoryAnalyticsRepository();
const providers = new InMemoryProviderManager();
const renderer = new DefaultTemplateRenderer();

providers.register(new InMemoryChannelProvider('email', 'in-memory'));
providers.register(new InMemoryChannelProvider('sms', 'in-memory'));

const deps = {
  messageRepository: messages,
  templateRepository: templates,
  templateRenderer: renderer,
  preferenceRepository: prefs,
  analyticsRepository: analytics,
  providerManager: providers,
  idGenerator: idGen,
  clock,
  eventBus,
};

const server = createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url ?? '/', `http://localhost`);
  const path = url.pathname;
  const method = req.method ?? 'GET';

  try {
    if (path === '/template' && method === 'POST') {
      const body = await readBody(req);
      const result = await createTemplateUseCase(body, { templateRepository: templates, idGenerator: idGen, clock });
      sendResult(res, result);
      return;
    }

    if (path === '/send' && method === 'POST') {
      const body = await readBody(req);
      const result = await sendMessageUseCase(body, deps);
      sendResult(res, result);
      return;
    }

    if (path === '/preference' && method === 'POST') {
      const body = await readBody(req);
      const result = await setPreferenceUseCase(body, { preferenceRepository: prefs, idGenerator: idGen, clock });
      sendResult(res, result);
      return;
    }

    if (path === '/messages' && method === 'GET') {
      const all = await messages.all();
      res.writeHead(200);
      res.end(JSON.stringify({ messages: all }));
      return;
    }

    if (path === '/stats' && method === 'GET') {
      const stats = await analytics.getStats('demo');
      res.writeHead(200);
      res.end(JSON.stringify({ stats }));
      return;
    }

    if (path === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'ok', engine: 'communication-demo' }));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch {
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Internal error' }));
  }
});

const PORT = 3211;
server.listen(PORT, () => {
  console.log(`╔══════════════════════════════════════╗`);
  console.log(`║  Communication Demo App              ║`);
  console.log(`║  http://localhost:${PORT}              ║`);
  console.log(`╠══════════════════════════════════════╣`);
  console.log(`║  POST /template   {name,channel,...} ║`);
  console.log(`║  POST /send       {to,template,...}  ║`);
  console.log(`║  POST /preference {accountId,...}    ║`);
  console.log(`║  GET  /messages                      ║`);
  console.log(`║  GET  /stats                         ║`);
  console.log(`║  GET  /health                        ║`);
  console.log(`╚══════════════════════════════════════╝`);
});

async function readBody(req: import('node:http').IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
  });
}

function sendResult(res: import('node:http').ServerResponse, result: { ok: boolean; value?: unknown; error?: { message?: string } }): void {
  if (result.ok) {
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true, data: result.value }));
  } else {
    res.writeHead(400);
    res.end(JSON.stringify({ ok: false, error: result.error?.message ?? 'Unknown' }));
  }
}
