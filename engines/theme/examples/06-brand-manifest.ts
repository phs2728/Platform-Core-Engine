/**
 * Theme Engine RC2 Example 06 — Brand & Design Language Manifest Pipeline
 *
 * End-to-end demo:
 *   1. Create Theme + Brand
 *   2. Generate Theme Intelligence (Industry → Personality/Voice/Emotion/DesignLanguage)
 *   3. Create Brand Personality, Voice, DesignLanguage
 *   4. Compose Theme Manifest (single source of truth for Component/CMS/Studio)
 *   5. Publish Manifest → triggers theme.changed → Component Engine notified
 *   6. Resolve Manifest → design tokens for downstream engines
 */
import { makeDemoDeps, unwrap } from './_helpers.js';
import {
  createThemeUseCase, createBrandUseCase,
  createBrandPersonalityUseCase, getBrandPersonalityUseCase,
  createBrandVoiceUseCase, getBrandVoiceUseCase,
  createDesignLanguageUseCase, getDesignLanguageUseCase,
  createThemeManifestUseCase, publishThemeManifestUseCase,
  getThemeManifestUseCase, resolveThemeManifestUseCase,
  generateThemeIntelligenceUseCase, getThemeIntelligenceUseCase,
} from '../src/index.js';

async function main() {
  const deps = makeDemoDeps();
  const base = { tenantId: 'demo', organizationId: 'org-demo', correlationId: 'demo-rc2', actorId: 'demo-user' };

  console.log('▶ Step 1: Create Theme + Brand');
  const themeId = unwrap(await createThemeUseCase({ ...base, name: 'Aman Tokyo Theme', slug: 'aman-tokyo' }, deps)).themeId;
  const brandId = unwrap(await createBrandUseCase({
    ...base, name: 'Aman', personality: ['Luxury', 'Minimal'], voice: 'Warm', primaryColor: '#7c2d3a',
  }, deps)).brandId;
  console.log(`  themeId=${themeId} brandId=${brandId}`);

  console.log('▶ Step 2: Generate Theme Intelligence (Luxury Travel)');
  const intelResult = unwrap(await generateThemeIntelligenceUseCase({
    ...base, brandId, industry: 'travel', targetAudience: 'High Income',
    positioning: 'Luxury serenity experiences', competitors: ['Aman', 'Four Seasons', 'Six Senses'],
  }, deps));
  const intel = unwrap(await getThemeIntelligenceUseCase(base.tenantId, brandId, deps));
  console.log(`  Generated Personality: ${intel.generatedPersonality.join(', ')}`);
  console.log(`  Generated Voice: ${intel.generatedVoice.join(', ')}`);
  console.log(`  Generated Emotion: ${intel.generatedEmotion.join(', ')}`);
  console.log(`  Generated Design Language: ${intel.generatedDesignLanguage.join(', ')}`);
  console.log(`  Recommendations: ${intel.recommendations.length} items, Confidence: ${intelResult.confidence}%`);

  console.log('▶ Step 3: Create Brand Personality + Voice + DesignLanguage');
  unwrap(await createBrandPersonalityUseCase({
    ...base, brandId, traits: intel.generatedPersonality, archetypes: ['Sage', 'Explorer'],
  }, deps));
  unwrap(await createBrandVoiceUseCase({
    ...base, brandId, tone: intel.generatedVoice, vocabulary: ['serenity', 'craft', 'quiet'],
    forbiddenWords: ['cheap', 'discount'], sentenceStyle: 'editorial',
  }, deps));
  unwrap(await createDesignLanguageUseCase({
    ...base, brandId, style: intel.generatedDesignLanguage,
    whitespace: 'generous', visualHierarchy: 'strong', informationDensity: 'low',
  }, deps));

  const personality = unwrap(await getBrandPersonalityUseCase(base.tenantId, brandId, deps));
  const voice = unwrap(await getBrandVoiceUseCase(base.tenantId, brandId, deps));
  const dl = unwrap(await getDesignLanguageUseCase(base.tenantId, brandId, deps));
  console.log(`  Personality traits: ${personality.traits.length}`);
  console.log(`  Voice tone: ${voice.tone.join(', ')}`);
  console.log(`  Design Language: ${dl.style.join(', ')} | whitespace=${dl.whitespace}`);

  console.log('▶ Step 4: Compose Theme Manifest');
  const manifestId = unwrap(await createThemeManifestUseCase({
    ...base, themeId, brandId, version: '1.0.0',
    personality: intel.generatedPersonality,
    voice: intel.generatedVoice,
    emotion: intel.generatedEmotion,
    designLanguage: intel.generatedDesignLanguage,
    whitespace: 'generous',
    hierarchy: 'strong',
    density: 'low',
    motionIntensity: 'subtle',
    motionDuration: '400ms',
    motionEasing: 'ease-out',
    wcagLevel: 'AAA',
    contrastRatio: 7,
    photography: 'editorial',
    illustration: 'minimal',
    iconography: 'outline',
    constraints: ['No pure black', 'Minimum 16px touch target', 'Editorial spacing'],
  }, deps)).manifestId;
  console.log(`  Manifest ID: ${manifestId}`);

  console.log('▶ Step 5: Publish Manifest → notifies Component Engine');
  unwrap(await publishThemeManifestUseCase({ ...base, manifestId }, deps));
  console.log(`  Notifications sent: ${deps.componentThemeProvider.notifications.length}`);
  console.log(`  Last notification: themeId=${deps.componentThemeProvider.notifications.at(-1)?.themeId}`);

  console.log('▶ Step 6: Resolve Manifest → Design Tokens');
  const resolved = unwrap(await resolveThemeManifestUseCase({ tenantId: base.tenantId, themeId }, deps));
  console.log(`  Manifest version: ${resolved.manifest.version}`);
  console.log(`  Resolved tokens count: ${Object.keys(resolved.resolvedTokens).length}`);
  console.log(`  --brand-whitespace: ${resolved.resolvedTokens['--brand-whitespace']}`);
  console.log(`  --brand-motion-intensity: ${resolved.resolvedTokens['--brand-motion-intensity']}`);
  console.log(`  --brand-wcag-level: ${resolved.resolvedTokens['--brand-wcag-level']}`);
  console.log(`  --brand-personality-1: ${resolved.resolvedTokens['--brand-personality-1']}`);

  const finalManifest = unwrap(await getThemeManifestUseCase(base.tenantId, themeId, deps));
  console.log(`\n✓ Brand Manifest Example Complete`);
  console.log(`  Status: ${finalManifest.status}`);
  console.log(`  Version: ${finalManifest.version}`);
  console.log(`  Personality: ${finalManifest.personality.length} traits`);
  console.log(`  Voice: ${finalManifest.voice.length} tones`);
  console.log(`  Design Language: ${finalManifest.designLanguage.length} styles`);
  console.log(`  Constraints: ${finalManifest.constraints.length} rules`);
}

main().catch((err) => { console.error('✗ Example failed:', err); process.exit(1); });