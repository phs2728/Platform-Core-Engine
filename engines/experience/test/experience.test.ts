/**
 * Experience Engine — Core Test Suite
 * Reconstructed under Recovery Authorization EXP-RECOVERY-001.
 */
import { describe, it, expect } from 'vitest';
import { makeDeps } from './helpers.js';
import {
  createExperienceUseCase, getExperienceUseCase, updateExperienceUseCase, deleteExperienceUseCase,
  archiveExperienceUseCase, restoreExperienceUseCase, listExperiencesUseCase, searchExperiencesUseCase,
} from '../src/use-cases/ExperienceUseCases.js';
import {
  createLayoutUseCase, updateLayoutUseCase, publishLayoutUseCase, validateLayoutUseCase,
  createHeroUseCase, updateHeroUseCase, publishHeroUseCase,
  createBannerUseCase, updateBannerUseCase, publishBannerUseCase,
  createNavigationUseCase, updateNavigationUseCase, publishNavigationUseCase,
  createDashboardUseCase, updateDashboardUseCase, publishDashboardUseCase,
} from '../src/use-cases/ComponentUseCases.js';
import {
  createSearchExperienceUseCase, updateSearchExperienceUseCase, publishSearchExperienceUseCase,
  createPersonalizationUseCase, updatePersonalizationUseCase,
  registerPatternUseCase, publishPatternUseCase, clonePatternUseCase,
  validateExperienceUseCase, calculateUXScoreUseCase, recommendExperienceUseCase,
} from '../src/use-cases/UXPatternUseCases.js';

const base = {
  tenantId: 'tenant-test', organizationId: 'org-test', actorId: 'actor-test',
  correlationId: 'corr-test',
};

describe('Experience Engine — Happy Path', () => {
  it('creates an experience', async () => {
    const deps = makeDeps();
    const r = await createExperienceUseCase({ ...base, name: 'Test', slug: 'test', type: 'Landing' }, deps);
    expect(r.ok).toBe(true);
  });

  it('rejects duplicate slug', async () => {
    const deps = makeDeps();
    const a = await createExperienceUseCase({ ...base, name: 'A', slug: 'dup', type: 'Landing' }, deps);
    expect(a.ok).toBe(true);
    const b = await createExperienceUseCase({ ...base, name: 'B', slug: 'dup', type: 'Landing' }, deps);
    expect(b.ok).toBe(false);
  });

  it('retrieves and updates an experience', async () => {
    const deps = makeDeps();
    const a = await createExperienceUseCase({ ...base, name: 'A', slug: 'a', type: 'Landing' }, deps);
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    const getR = await getExperienceUseCase({ tenantId: base.tenantId, experienceId: a.value.experienceId }, deps);
    expect(getR.ok).toBe(true);
    if (!getR.ok) return;
    const updR = await updateExperienceUseCase(
      { ...base, experienceId: a.value.experienceId, name: 'A2' },
      deps,
    );
    expect(updR.ok).toBe(true);
    if (!updR.ok) return;
    const get2 = await getExperienceUseCase({ tenantId: base.tenantId, experienceId: a.value.experienceId }, deps);
    expect(get2.ok && get2.value.name === 'A2').toBe(true);
  });

  it('archives and restores an experience', async () => {
    const deps = makeDeps();
    const a = await createExperienceUseCase({ ...base, name: 'A', slug: 'arc', type: 'Landing' }, deps);
    if (!a.ok) throw new Error('setup');
    const arch = await archiveExperienceUseCase({ ...base, experienceId: a.value.experienceId }, deps);
    expect(arch.ok).toBe(true);
    if (!arch.ok) return;
    const getR = await getExperienceUseCase({ tenantId: base.tenantId, experienceId: a.value.experienceId }, deps);
    if (getR.ok) expect(getR.value.status).toBe('Archived');
    const rest = await restoreExperienceUseCase({ ...base, experienceId: a.value.experienceId }, deps);
    expect(rest.ok).toBe(true);
  });

  it('deletes an experience', async () => {
    const deps = makeDeps();
    const a = await createExperienceUseCase({ ...base, name: 'A', slug: 'del', type: 'Landing' }, deps);
    if (!a.ok) throw new Error('setup');
    const del = await deleteExperienceUseCase({ ...base, experienceId: a.value.experienceId }, deps);
    expect(del.ok).toBe(true);
    if (!del.ok) return;
    const getR = await getExperienceUseCase({ tenantId: base.tenantId, experienceId: a.value.experienceId }, deps);
    expect(getR.ok).toBe(false);
  });

  it('lists and searches experiences', async () => {
    const deps = makeDeps();
    await createExperienceUseCase({ ...base, name: 'A', slug: 'la', type: 'Landing' }, deps);
    await createExperienceUseCase({ ...base, name: 'B', slug: 'lb', type: 'Dashboard' }, deps);
    const listR = await listExperiencesUseCase(base.tenantId, deps);
    expect(listR.ok).toBe(true);
    if (listR.ok) expect(listR.value.length).toBe(2);
    const searchR = await searchExperiencesUseCase({ ...base, type: 'Landing' }, deps);
    expect(searchR.ok).toBe(true);
  });
});

describe('Experience Engine — Layout Lifecycle', () => {
  it('creates, updates, publishes, and validates a layout', async () => {
    const deps = makeDeps();
    const c = await createLayoutUseCase({ ...base, name: 'L', slug: 'l', type: 'Landing' }, deps);
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    const u = await updateLayoutUseCase({ ...base, layoutId: c.value.layoutId, name: 'L2' }, deps);
    expect(u.ok).toBe(true);
    if (!u.ok) return;
    const p = await publishLayoutUseCase({ ...base, layoutId: c.value.layoutId }, deps);
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    const v = await validateLayoutUseCase({ ...base, layoutId: c.value.layoutId }, deps);
    expect(v.ok).toBe(true);
  });
});

describe('Experience Engine — Component Lifecycle', () => {
  it('hero/banner/navigation/dashboard CRUD + publish', async () => {
    const deps = makeDeps();
    const h = await createHeroUseCase({ ...base, name: 'H', headline: 'Hi' }, deps);
    expect(h.ok).toBe(true);
    if (!h.ok) return;
    const hu = await updateHeroUseCase({ ...base, heroId: h.value.heroId, headline: 'Hi2' }, deps);
    expect(hu.ok).toBe(true);
    if (!hu.ok) return;
    const hp = await publishHeroUseCase({ ...base, heroId: h.value.heroId }, deps);
    expect(hp.ok).toBe(true);

    const b = await createBannerUseCase({ ...base, name: 'B', type: 'Info', title: 'T', message: 'M' }, deps);
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    const bu = await updateBannerUseCase({ ...base, bannerId: b.value.bannerId, title: 'T2' }, deps);
    expect(bu.ok).toBe(true);
    if (!bu.ok) return;
    const bp = await publishBannerUseCase({ ...base, bannerId: b.value.bannerId }, deps);
    expect(bp.ok).toBe(true);

    const n = await createNavigationUseCase({ ...base, name: 'N', type: 'Top' }, deps);
    expect(n.ok).toBe(true);
    if (!n.ok) return;
    const nu = await updateNavigationUseCase({ ...base, navigationId: n.value.navigationId, type: 'Side' }, deps);
    expect(nu.ok).toBe(true);
    if (!nu.ok) return;
    const np = await publishNavigationUseCase({ ...base, navigationId: n.value.navigationId }, deps);
    expect(np.ok).toBe(true);

    const d = await createDashboardUseCase({ ...base, name: 'D', slug: 'd' }, deps);
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    const du = await updateDashboardUseCase({ ...base, dashboardId: d.value.dashboardId, name: 'D2' }, deps);
    expect(du.ok).toBe(true);
    if (!du.ok) return;
    const dp = await publishDashboardUseCase({ ...base, dashboardId: d.value.dashboardId }, deps);
    expect(dp.ok).toBe(true);
  });
});

describe('Experience Engine — UX Pattern Lifecycle', () => {
  it('search experience CRUD + publish', async () => {
    const deps = makeDeps();
    const c = await createSearchExperienceUseCase({
      ...base, name: 'SE',
      features: { autocomplete: true, spellCheck: true, synonyms: true, recommendations: true, facets: [] },
    }, deps);
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    const u = await updateSearchExperienceUseCase({
      ...base, searchExperienceId: c.value.searchExperienceId, name: 'SE2',
    }, deps);
    expect(u.ok).toBe(true);
    if (!u.ok) return;
    const p = await publishSearchExperienceUseCase({
      ...base, searchExperienceId: c.value.searchExperienceId,
    }, deps);
    expect(p.ok).toBe(true);
  });

  it('personalization CRUD', async () => {
    const deps = makeDeps();
    const c = await createPersonalizationUseCase({
      ...base, name: 'P', rules: [{ condition: 'a', action: 'b', priority: 1 }],
    }, deps);
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    const u = await updatePersonalizationUseCase({
      ...base, personalizationId: c.value.personalizationId, name: 'P2',
    }, deps);
    expect(u.ok).toBe(true);
  });

  it('pattern register/publish/clone', async () => {
    const deps = makeDeps();
    const r = await registerPatternUseCase({
      ...base, name: 'P', category: 'c', reference: 'ref', industryTags: ['x'],
    }, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const p = await publishPatternUseCase({ ...base, patternId: r.value.patternId }, deps);
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    const c = await clonePatternUseCase({ ...base, sourcePatternId: r.value.patternId, newName: 'P2' }, deps);
    expect(c.ok).toBe(true);
  });

  it('validates and scores an experience', async () => {
    const deps = makeDeps();
    const a = await createExperienceUseCase({ ...base, name: 'A', slug: 'score', type: 'Landing' }, deps);
    if (!a.ok) throw new Error('setup');
    const v = await validateExperienceUseCase({ ...base, experienceId: a.value.experienceId }, deps);
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    const s = await calculateUXScoreUseCase({ ...base, experienceId: a.value.experienceId }, deps);
    expect(s.ok).toBe(true);
    const rec = await recommendExperienceUseCase({ ...base, experienceId: a.value.experienceId }, deps);
    expect(rec.ok).toBe(true);
  });
});
