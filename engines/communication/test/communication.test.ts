import { describe, it, expect } from 'vitest';
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
  type SendMessageDeps,
} from '../src/index.js';

// ═══════════════════════════════════════════
// Fixtures
// ═══════════════════════════════════════════

const clock = { now: () => new Date('2026-07-11T12:00:00.000Z') };
let idCounter = 0;
const idGen = { generate: () => `id-${++idCounter}` };
const eventBus = { events: [] as unknown[], async emit(e) { this.events.push(e); } };

function makeDeps() {
  const messages = new InMemoryMessageRepository();
  const templates = new InMemoryTemplateRepository();
  const prefs = new InMemoryPreferenceRepository();
  const analytics = new InMemoryAnalyticsRepository();
  const providers = new InMemoryProviderManager();
  const renderer = new DefaultTemplateRenderer();

  const emailProvider = new InMemoryChannelProvider('email', 'in-memory');
  providers.register(emailProvider);

  return {
    messages, templates, prefs, analytics, providers, renderer,
    deps: {
      messageRepository: messages,
      templateRepository: templates,
      templateRenderer: renderer,
      preferenceRepository: prefs,
      analyticsRepository: analytics,
      providerManager: providers,
      idGenerator: idGen,
      clock,
      eventBus,
    } satisfies SendMessageDeps,
  };
}

// ═══════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════

describe('Template Renderer', () => {
  it('변수 치환: {{name}}', () => {
    const renderer = new DefaultTemplateRenderer();
    const result = renderer.render('Hello {{name}}!', { name: 'Tim' });
    expect(result).toBe('Hello Tim!');
  });

  it('중첩 변수: {{user.email}}', () => {
    const renderer = new DefaultTemplateRenderer();
    const result = renderer.render('Email: {{user.email}}', { user: { email: 'tim@example.com' } });
    expect(result).toBe('Email: tim@example.com');
  });

  it('Conditional block: {{#if}}', () => {
    const renderer = new DefaultTemplateRenderer();
    const result = renderer.render('{{#if show}}visible{{/if}}', { show: true });
    expect(result).toBe('visible');
    const result2 = renderer.render('{{#if show}}visible{{/if}}', { show: false });
    expect(result2).toBe('');
  });
});

describe('Create Template', () => {
  it('성공: 템플릿 생성', async () => {
    const { templates } = makeDeps();
    const result = await createTemplateUseCase(
      { name: 'welcome', channel: 'email', locale: 'en', bodyTemplate: 'Hello {{name}}!' },
      { templateRepository: templates, idGenerator: idGen, clock },
    );
    expect(result.ok).toBe(true);
  });

  it('실패: 지원하지 않는 locale', async () => {
    const { templates } = makeDeps();
    const result = await createTemplateUseCase(
      { name: 'welcome', channel: 'email', locale: 'xx', bodyTemplate: 'Hello' },
      { templateRepository: templates, idGenerator: idGen, clock },
    );
    expect(result.ok).toBe(false);
  });
});

describe('Send Message', () => {
  it('성공: Template 렌더링 + Provider 발송', async () => {
    const ctx = makeDeps();

    await createTemplateUseCase(
      { name: 'welcome', channel: 'email', locale: 'en', bodyTemplate: 'Hello {{name}}!', subjectTemplate: 'Welcome' },
      { templateRepository: ctx.templates, idGenerator: idGen, clock },
    );

    const result = await sendMessageUseCase(
      {
        tenantId: 't-1', accountId: 'user-1', channel: 'email',
        to: 'user@example.com', templateName: 'welcome',
        variables: { name: 'Tim' }, locale: 'en', correlationId: 'r-1',
      },
      ctx.deps,
    );

    expect(result.ok).toBe(true);
    if (result.ok && result.value.status === 'sent') {
      expect(result.value.messageId).toBeDefined();
      expect(result.value.providerMessageId).toBeDefined();
    }

    // Provider outbox 확인
    const emailProvider = ctx.providers.getDefault('email') as InMemoryChannelProvider;
    expect(emailProvider.outbox).toHaveLength(1);
    expect(emailProvider.outbox[0]!.body).toBe('Hello Tim!');
  });

  it('실패: Template 없음', async () => {
    const ctx = makeDeps();
    const result = await sendMessageUseCase(
      {
        tenantId: 't-1', accountId: null, channel: 'email',
        to: 'user@example.com', templateName: 'nonexistent',
        variables: {}, locale: 'en', correlationId: 'r-1',
      },
      ctx.deps,
    );
    expect(result.ok).toBe(false);
  });

  it('실패: Provider 없음 → failed', async () => {
    const ctx = makeDeps();
    // SMS provider 등록 안 함

    await createTemplateUseCase(
      { name: 'sms-test', channel: 'sms', locale: 'en', bodyTemplate: 'Code: {{code}}' },
      { templateRepository: ctx.templates, idGenerator: idGen, clock },
    );

    const result = await sendMessageUseCase(
      {
        tenantId: 't-1', accountId: null, channel: 'sms',
        to: '+995555123456', templateName: 'sms-test',
        variables: { code: '123456' }, locale: 'en', correlationId: 'r-1',
      },
      ctx.deps,
    );

    // Provider 없음 → failed
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(['failed', 'queued']).toContain(result.value.status);
    }
  });
});

describe('User Preference', () => {
  it('성공: Preference 설정', async () => {
    const { prefs } = makeDeps();
    const result = await setPreferenceUseCase(
      { accountId: 'user-1', tenantId: 't-1', locale: 'ko', quietHoursStart: '22:00', quietHoursEnd: '08:00' },
      { preferenceRepository: prefs, idGenerator: idGen, clock },
    );
    expect(result.ok).toBe(true);

    const saved = await prefs.findByAccount('user-1');
    expect(saved).not.toBeNull();
    expect(saved!.locale).toBe('ko');
    expect(saved!.quietHoursStart).toBe('22:00');
  });

  it('Preference: 채널 비활성화 시 발송 안 함', async () => {
    const ctx = makeDeps();

    await setPreferenceUseCase(
      { accountId: 'user-1', tenantId: 't-1', locale: 'en', channelPreferences: { email: false } },
      { preferenceRepository: ctx.prefs, idGenerator: idGen, clock },
    );

    await createTemplateUseCase(
      { name: 'test', channel: 'email', locale: 'en', bodyTemplate: 'Test' },
      { templateRepository: ctx.templates, idGenerator: idGen, clock },
    );

    const result = await sendMessageUseCase(
      {
        tenantId: 't-1', accountId: 'user-1', channel: 'email',
        to: 'user@example.com', templateName: 'test',
        variables: {}, locale: 'en', correlationId: 'r-1',
      },
      ctx.deps,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('failed'); // suppressed
    }

    // Provider outbox 확인 — 발송 안 됨
    const emailProvider = ctx.providers.getDefault('email') as InMemoryChannelProvider;
    expect(emailProvider.outbox).toHaveLength(0);
  });
});

describe('Analytics', () => {
  it('발송 후 Analytics 기록', async () => {
    const ctx = makeDeps();

    await createTemplateUseCase(
      { name: 'analytics-test', channel: 'email', locale: 'en', bodyTemplate: 'Test' },
      { templateRepository: ctx.templates, idGenerator: idGen, clock },
    );

    await sendMessageUseCase(
      {
        tenantId: 't-1', accountId: null, channel: 'email',
        to: 'user@example.com', templateName: 'analytics-test',
        variables: {}, locale: 'en', correlationId: 'r-1',
      },
      ctx.deps,
    );

    const stats = await ctx.analytics.getStats('t-1');
    expect(stats.total).toBeGreaterThanOrEqual(1);
    expect(stats.delivered).toBeGreaterThanOrEqual(1);
  });
});

describe('Provider Manager (Plugin)', () => {
  it('Provider 등록/조회/해제', () => {
    const mgr = new InMemoryProviderManager();
    const emailProvider = new InMemoryChannelProvider('email', 'test-provider');

    mgr.register(emailProvider);
    expect(mgr.getDefault('email')?.name).toBe('test-provider');

    const found = mgr.get('email', 'test-provider');
    expect(found).not.toBeNull();

    mgr.unregister('email', 'test-provider');
    expect(mgr.getDefault('email')).toBeNull();
  });

  it('다중 Provider + default 변경', () => {
    const mgr = new InMemoryProviderManager();
    const p1 = new InMemoryChannelProvider('email', 'smtp');
    const p2 = new InMemoryChannelProvider('email', 'ses');

    mgr.register(p1);
    mgr.register(p2);

    expect(mgr.getDefault('email')?.name).toBe('smtp'); // 첫 등록이 default

    mgr.setDefault('email', 'ses');
    expect(mgr.getDefault('email')?.name).toBe('ses');

    expect(mgr.list('email')).toHaveLength(2);
  });
});
