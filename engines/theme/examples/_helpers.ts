/** Theme Engine — Example Helpers */
import {
  InMemoryThemeRepository, InMemoryBrandRepository, InMemoryTokenSetRepository,
  InMemoryTokenSystemRepository,
  InMemoryThemeVariantRepository, InMemoryResponsiveTokensRepository,
  InMemoryWhiteLabelRepository, InMemoryThemeAuditRepository,
  InMemoryOrganizationVerifier, StaticThemePolicyProvider,
  MockThemeCompilerProvider, InMemoryEventBus,
} from '../src/index.js';
import type { TypographyScale, ColorPalette, SpacingSystem, MotionSpec, ElevationSystem } from '../src/interfaces/index.js';
import type { ThemeUseCaseDeps } from '../src/index.js';
type AnyResult<T = unknown> = { ok: true; value: T } | { ok: false; error: unknown };
export function unwrap<T>(r: AnyResult<T>): T { if (!r.ok) { const e = r.error as { message?: string }; throw new Error(e?.message ?? 'err'); } return r.value; }
export function makeDemoDeps(): ThemeUseCaseDeps {
  const organizationVerifier = new InMemoryOrganizationVerifier(); organizationVerifier.add('demo', 'org-demo');
  const policyProvider = new StaticThemePolicyProvider(); policyProvider.set('demo', { maxThemes: 50 });
  return {
    themeRepo: new InMemoryThemeRepository(), brandRepo: new InMemoryBrandRepository(),
    tokenSetRepo: new InMemoryTokenSetRepository(),
    typographyRepo: new InMemoryTokenSystemRepository<TypographyScale>(),
    colorRepo: new InMemoryTokenSystemRepository<ColorPalette>(),
    spacingRepo: new InMemoryTokenSystemRepository<SpacingSystem>(),
    motionRepo: new InMemoryTokenSystemRepository<MotionSpec>(),
    elevationRepo: new InMemoryTokenSystemRepository<ElevationSystem>(),
    variantRepo: new InMemoryThemeVariantRepository(), responsiveRepo: new InMemoryResponsiveTokensRepository(),
    whiteLabelRepo: new InMemoryWhiteLabelRepository(), auditRepo: new InMemoryThemeAuditRepository(),
    eventBus: new InMemoryEventBus(), organizationVerifier, policyProvider,
    themeCompiler: new MockThemeCompilerProvider(),
    idGenerator: { generate: () => `demo-${Math.random().toString(36).slice(2, 8)}` },
    clock: { now: () => new Date('2026-07-12T08:00:00.000Z') },
  };
}
