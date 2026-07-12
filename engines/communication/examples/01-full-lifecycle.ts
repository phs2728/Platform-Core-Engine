/**
 * Communication Engine — Demo
 */
import {
  InMemoryMessageRepository,
  InMemoryTemplateRepository,
  InMemoryPreferenceRepository,
  InMemoryAnalyticsRepository,
  InMemoryProviderManager,
  DefaultTemplateRenderer,
  sendMessageUseCase,
  createTemplateUseCase,
  setPreferenceUseCase,
} from '../src/index.js';

async function main() {
  console.log('═══ Communication Engine — Demo ═══\n');
  let idc = 0;
  const messageRepository = new InMemoryMessageRepository();
  const templateRepository = new InMemoryTemplateRepository();
  const preferenceRepository = new InMemoryPreferenceRepository();
  const analyticsRepository = new InMemoryAnalyticsRepository();
  const providerManager = new InMemoryProviderManager();
  const templateRenderer = new DefaultTemplateRenderer();
  const eventBus = { emitted: [] as unknown[], async emit(e: unknown) { this.emitted.push(e); } };
  const commonDeps = {
    messageRepository, templateRepository, templateRenderer,
    preferenceRepository, analyticsRepository, providerManager,
    eventBus,
    idGenerator: { generate: () => `demo-${++idc}` },
    clock: { now: () => new Date('2026-07-11T08:00:00.000Z') },
  };

  console.log('▶ 1) Create Template');
  const tmpl = await createTemplateUseCase(
    { tenantId: 'demo', name: 'welcome', channel: 'email', locale: 'en', bodyTemplate: 'Hello {{name}}', subjectTemplate: 'Welcome', variables: ['name'] },
    commonDeps,
  );
  console.log(`  ✓ template: ${tmpl.ok ? 'created' : tmpl.error.message}\n`);

  console.log('▶ 2) Set Preference');
  const pref = await setPreferenceUseCase(
    { tenantId: 'demo', accountId: 'user-1', channels: { email: true, sms: false, push: true }, categories: {} },
    commonDeps,
  );
  console.log(`  ✓ preference: ${pref.ok ? 'set' : pref.error.message}\n`);

  console.log('▶ 3) Send Message');
  const send = await sendMessageUseCase(
    { tenantId: 'demo', channel: 'email', to: 'user-1@example.com', templateName: 'welcome', locale: 'en', variables: { name: 'Tim' } },
    commonDeps,
  );
  console.log(`  ✓ message: ${send.ok ? 'sent' : send.error.message}\n`);

  console.log(`═══ Demo Complete ═══`);
}
main().catch(console.error);
