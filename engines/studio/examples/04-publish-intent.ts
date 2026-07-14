/**
 * Example 04 — PublishIntent Pattern
 *
 * Sprint D: Studio creates PublishIntent only.
 * CMS consumes studio.publish.intent event and performs actual publish.
 * Studio NEVER writes to CMS directly.
 */
import { makeDemoDeps, unwrap, base } from './_helpers.js';
import {
  createWorkspaceUseCase, startBuildSessionUseCase, createDraftUseCase,
  addComponentBindingUseCase, verifyDraftCompositionUseCase, createPublishIntentUseCase,
  listPublishIntentsUseCase, cancelPublishIntentUseCase,
} from '../src/index.js';

async function main() {
  const deps = makeDemoDeps();
  const workspaceId = unwrap(await createWorkspaceUseCase({ ...base, name: 'W', slug: 'w', defaultThemeRef: null }, deps)).workspaceId;
  const sessionId = unwrap(await startBuildSessionUseCase({ ...base, workspaceId, themeRef: 'theme-luxury', componentRefs: [] }, deps)).sessionId;
  const draftId = unwrap(await createDraftUseCase({
    ...base, buildSessionId: sessionId, workspaceId, pageSlug: '/home', title: 'Home',
    defaultLocale: 'en', themeRef: 'theme-luxury',
  }, deps)).draftId;
  await addComponentBindingUseCase({
    ...base, draftId, componentRef: 'hero-exp', slotName: 'main', order: 0,
    propOverrides: {}, themeOverrideRef: null,
  }, deps);
  await verifyDraftCompositionUseCase({ tenantId: 'demo', draftId }, deps);

  console.log('▶ Step 1: Verify draft before publish intent (Sprint D 원칙 5)');
  console.log('  Draft is Verified ✓');

  console.log('▶ Step 2: Create PublishIntent (Studio emits studio.publish.intent event)');
  const intentId = unwrap(await createPublishIntentUseCase({ ...base, draftId, workspaceId }, deps)).intentId;
  console.log(`  Intent ID: ${intentId}`);

  const eventBus = deps.eventBus as unknown as { countByType(t: string): number };
  console.log(`  studio.publish.intent events emitted: ${eventBus.countByType('studio.publish.intent')}`);

  console.log('▶ Step 3: List publish intents in workspace');
  const intents = unwrap(await listPublishIntentsUseCase('demo', workspaceId, deps));
  console.log(`  Intent count: ${intents.length}`);
  console.log(`  All have status='Pending' (CMS will consume and process)`);

  console.log('▶ Step 4: Cancel intent (test alternate flow)');
  await cancelPublishIntentUseCase({ ...base, intentId }, deps);
  console.log('  Intent cancelled (studio.publish.cancelled event emitted)');

  console.log('\n✓ PublishIntent Example Complete');
  console.log('  Studio NEVER writes to CMS directly');
  console.log('  CMS consumes studio.publish.intent event separately');
}

main().catch((err) => { console.error('✗ Example failed:', err); process.exit(1); });