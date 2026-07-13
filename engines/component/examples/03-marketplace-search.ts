/**
 * Example 03 — Marketplace Search Experience
 *
 * Composes a Search Experience with variants for different industries.
 */
import { makeDemoDeps, unwrap, base } from './_helpers.js';
import {
  createComponentUseCase, createVariantUseCase, recommendVariantUseCase,
  registerStateUseCase, transitionStateUseCase, calculateComponentScoreUseCase,
  createBehaviorUseCase,
} from '../src/index.js';

async function main() {
  const deps = makeDemoDeps();

  console.log('▶ Create Search Experience');
  const searchId = unwrap(await createComponentUseCase(
    { ...base, name: 'Marketplace Search', slug: 'marketplace-search', tier: 'Experience', componentType: 'Search' }, deps,
  )).componentId;

  console.log('▶ Create Variants (Commerce / Standard)');
  unwrap(await createVariantUseCase(
    { ...base, componentId: searchId, name: 'Commerce', label: 'Commerce Search', propOverrides: { showFilters: true }, tokenOverrides: {}, isDefault: true }, deps,
  ));
  unwrap(await createVariantUseCase(
    { ...base, componentId: searchId, name: 'Standard', label: 'Standard Search', propOverrides: { showFilters: false }, tokenOverrides: {} }, deps,
  ));

  console.log('▶ Recommend best variant');
  const recommended = unwrap(await recommendVariantUseCase('t-1', searchId, { industry: 'marketplace', style: 'commerce' }, deps));
  console.log(`  Recommended: ${recommended?.name}`);

  console.log('▶ Register States');
  unwrap(await registerStateUseCase(
    { ...base, componentId: searchId, name: 'Loading', styleOverrides: { opacity: 0.7 }, tokenOverrides: {} }, deps,
  ));
  unwrap(await registerStateUseCase(
    { ...base, componentId: searchId, name: 'Empty', styleOverrides: { icon: 'magnify' }, tokenOverrides: {} }, deps,
  ));

  console.log('▶ Transition to Loading state');
  unwrap(await transitionStateUseCase({ ...base, componentId: searchId, targetState: 'Loading' }, deps));

  console.log('▶ Add Behavior Rule');
  unwrap(await createBehaviorUseCase(
    { ...base, componentId: searchId, name: 'Debounce Input', rule: 'onInput → debounce 300ms', condition: { event: 'input' }, action: { type: 'debounce', delay: 300 }, priority: 1 }, deps,
  ));

  console.log('▶ Score');
  const score = unwrap(await calculateComponentScoreUseCase({ ...base, componentId: searchId }, deps));
  console.log(`  Overall: ${score.overall}`);

  console.log('✓ Marketplace Search Example Complete');
}

main().catch(console.error);
