/**
 * Example 04 — Layout Snapshot (deterministic record of render state)
 */
import { makeDemoDeps, unwrap, base } from './_helpers.js';
import {
  createContentUseCase, createPageUseCase, addSectionUseCase,
  createContentSlotUseCase, createLayoutSnapshotUseCase, getLayoutSnapshotUseCase,
  compareLayoutSnapshotsUseCase,
} from '../src/index.js';

async function main() {
  const deps = makeDemoDeps();

  console.log('▶ Step 1: Setup Page');
  const pageId = unwrap(await createPageUseCase({ ...base, slug: '/', title: 'Home', defaultLocale: 'en', themeRef: 'theme-luxury' }, deps)).pageId;
  const contentId = unwrap(await createContentUseCase({ ...base, type: 'Text', body: 'Content v1', locale: 'en' }, deps)).contentId;
  const sectionId = unwrap(await addSectionUseCase({ ...base, pageId, name: 'Hero', order: 0, componentRef: 'hero-section' }, deps)).sectionId;
  unwrap(await createContentSlotUseCase({ ...base, sectionId, slotName: 'headline', contentId, required: true }, deps));

  console.log('▶ Step 2: Create Layout Snapshot A');
  const snapA = unwrap(await createLayoutSnapshotUseCase({ ...base, pageId, device: 'desktop' }, deps));
  console.log(`  Snapshot A: ${snapA.snapshotId}`);
  console.log(`  Rendered Hash: ${snapA.renderedHash}`);

  console.log('▶ Step 3: Create Layout Snapshot B (identical state)');
  const snapB = unwrap(await createLayoutSnapshotUseCase({ ...base, pageId, device: 'desktop' }, deps));
  console.log(`  Snapshot B: ${snapB.snapshotId}`);

  console.log('▶ Step 4: Compare A and B → identical');
  const cmp = unwrap(await compareLayoutSnapshotsUseCase({ tenantId: 'demo', snapshotIdA: snapA.snapshotId, snapshotIdB: snapB.snapshotId }, deps));
  console.log(`  Identical: ${cmp.identical ? '✅' : '❌'}`);
  console.log(`  Differences: ${cmp.differences.length}`);

  console.log('▶ Step 5: Snapshot details');
  const snap = unwrap(await getLayoutSnapshotUseCase('demo', snapA.snapshotId, deps));
  console.log(`  Theme Hash: ${snap.themeManifestHash}`);
  console.log(`  Component Hashes: ${Object.keys(snap.componentManifestHashes).length}`);
  console.log(`  Content Hashes: ${Object.keys(snap.contentHashes).length}`);

  console.log('\n✓ Layout Snapshot Example Complete');
  console.log('  Snapshot is deterministic + captures Theme/Component/Content hashes');
}

main().catch((err) => { console.error('✗ Example failed:', err); process.exit(1); });