/**
 * Example 04 — Restaurant Order Experience
 *
 * Composes a Checkout Experience: Menu Display + Cart + Payment Button
 */
import { makeDemoDeps, unwrap, base } from './_helpers.js';
import {
  createComponentUseCase, composeExperienceUseCase, createAnimationUseCase,
  createResponsiveRuleUseCase, calculateComponentScoreUseCase,
  createVersionUseCase, getVersionHistoryUseCase, validateAccessibilityUseCase,
} from '../src/index.js';

async function main() {
  const deps = makeDemoDeps();

  console.log('▶ Create Checkout Experience');
  const checkoutId = unwrap(await createComponentUseCase(
    { ...base, name: 'Checkout', slug: 'restaurant-checkout', tier: 'Experience', componentType: 'Checkout' }, deps,
  )).componentId;

  console.log('▶ Create Cart + Button');
  const cartId = unwrap(await createComponentUseCase(
    { ...base, name: 'Cart', slug: 'cart', tier: 'Atomic', componentType: 'Card' }, deps,
  )).componentId;
  const payBtnId = unwrap(await createComponentUseCase(
    { ...base, name: 'Pay Button', slug: 'pay-button', tier: 'Atomic', componentType: 'Button' }, deps,
  )).componentId;

  console.log('▶ Compose Checkout');
  unwrap(await composeExperienceUseCase(
    { ...base, name: 'Restaurant Checkout', slug: 'restaurant-checkout-comp', parentComponentId: checkoutId,
      childComponentIds: [cartId, payBtnId], slotMapping: { cart: cartId, action: payBtnId },
      experienceType: 'Checkout' }, deps,
  ));

  console.log('▶ Add Entrance Animation');
  unwrap(await createAnimationUseCase(
    { ...base, componentId: checkoutId, type: 'Entrance', duration: '300ms', easing: 'spring', keyframes: { from: { y: 20, opacity: 0 }, to: { y: 0, opacity: 1 } } }, deps,
  ));

  console.log('▶ Add Responsive Rules');
  unwrap(await createResponsiveRuleUseCase(
    { ...base, componentId: checkoutId, device: 'Mobile', rules: { columns: 1, padding: '16px' } }, deps,
  ));
  unwrap(await createResponsiveRuleUseCase(
    { ...base, componentId: checkoutId, device: 'Desktop', rules: { columns: 2, padding: '32px' } }, deps,
  ));

  console.log('▶ Create Version Snapshot');
  unwrap(await createVersionUseCase(
    { ...base, componentId: checkoutId, version: '1.0.0', changelog: 'Initial release' }, deps,
  ));

  console.log('▶ Version History');
  const history = unwrap(await getVersionHistoryUseCase('t-1', checkoutId, deps));
  console.log(`  Versions: ${history.length}`);

  console.log('▶ Accessibility Check');
  const a11y = unwrap(await validateAccessibilityUseCase({ ...base, componentId: checkoutId }, deps));
  console.log(`  Score: ${a11y.score}`);

  console.log('▶ Score');
  const score = unwrap(await calculateComponentScoreUseCase({ ...base, componentId: checkoutId }, deps));
  console.log(`  Overall: ${score.overall}`);

  console.log('✓ Restaurant Checkout Example Complete');
}

main().catch(console.error);
