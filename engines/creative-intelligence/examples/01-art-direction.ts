/**
 * Example 01 — Art Direction (8 styles)
 *
 * Senior Art Director Upgrade: 8 art direction styles with default principles.
 */
import { makeDemoDeps, unwrap, base } from './_helpers.js';
import {
  createArtDirectionUseCase, generateArtDirectionUseCase, getArtDirectionByStyleUseCase,
} from '../src/index.js';

async function main() {
  const deps = makeDemoDeps();

  console.log('▶ Step 1: Create Art Direction for Luxury style (Aman Resorts)');
  const luxury = unwrap(await createArtDirectionUseCase({
    ...base, style: 'Luxury', name: 'Aman Tokyo Luxury',
  }, deps)).artDirectionId;
  // Activate to make it findable
  await import('../src/index.js').then(m => m.activateArtDirectionUseCase({ ...base, artDirectionId: luxury }, deps));
  const ad1 = unwrap(await getArtDirectionByStyleUseCase({ tenantId: 'demo', style: 'Luxury' }, deps));
  console.log(`  Motion Principles: ${ad1!.motionPrinciples.length}`);
  console.log(`  Color Principles: ${ad1!.colorPrinciples.length}`);
  console.log(`  Typography Principles: ${ad1!.typographyPrinciples.length}`);
  console.log(`  Layout Principles: ${ad1!.layoutPrinciples.length}`);

  console.log('▶ Step 2: Generate Art Direction (Editorial)');
  const editorial = unwrap(await generateArtDirectionUseCase({
    ...base, style: 'Editorial', industry: 'magazine',
  }, deps)).artDirectionId;
  console.log(`  Generated Art Direction ID: ${editorial}`);

  console.log('▶ Step 3: Art Direction for Boutique (Aman-style personal touch)');
  const boutiqueId = unwrap(await createArtDirectionUseCase({ ...base, style: 'Boutique', name: 'Boutique' }, deps)).artDirectionId;
  await import('../src/index.js').then(m => m.activateArtDirectionUseCase({ ...base, artDirectionId: boutiqueId }, deps));
  const ad2 = unwrap(await getArtDirectionByStyleUseCase({ tenantId: 'demo', style: 'Boutique' }, deps));
  console.log(`  Boutique: ${ad2!.motionPrinciples[0]}`);

  console.log('\n✓ Art Direction Example Complete');
  console.log('  8 styles: Luxury / Premium / Editorial / Boutique / Corporate / Minimal / Modern / Playful');
}

main().catch((err) => { console.error('✗ Example failed:', err); process.exit(1); });