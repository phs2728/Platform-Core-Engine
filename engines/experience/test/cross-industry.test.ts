/**
 * Experience Engine — Cross-Industry Test
 * Reconstructed under Recovery Authorization EXP-RECOVERY-001.
 */
import { describe, it, expect } from 'vitest';
import { makeDeps } from './helpers.js';
import { createExperienceUseCase, getExperienceUseCase, listExperiencesUseCase } from '../src/use-cases/ExperienceUseCases.js';
import { createLayoutUseCase } from '../src/use-cases/ComponentUseCases.js';
import { createHeroUseCase } from '../src/use-cases/ComponentUseCases.js';
import { calculateUXScoreUseCase } from '../src/use-cases/UXPatternUseCases.js';

const INDUSTRIES = [
  { name: 'Restaurant', slug: 'tbilisi-restaurant', type: 'Landing' as const },
  { name: 'Hotel', slug: 'tbilisi-boutique-hotel', type: 'Landing' as const },
  { name: 'Travel', slug: 'tbilisi-day-trip', type: 'Catalog' as const },
  { name: 'Hospital', slug: 'tbilisi-clinic', type: 'Workspace' as const },
  { name: 'SaaS', slug: 'tbilisi-saas', type: 'Dashboard' as const },
];

describe('Experience Engine — Cross-industry (regression)', () => {
  for (const ind of INDUSTRIES) {
    it(`scaffolds a full UX model for ${ind.name}`, async () => {
      const deps = makeDeps();
      // 1. Experience
      const expR = await createExperienceUseCase({
        tenantId: 'tenant-test', organizationId: 'org-test', actorId: 'actor-test',
        correlationId: `corr-${ind.slug}`, name: `${ind.name} UX`, slug: ind.slug, type: ind.type,
      }, deps);
      expect(expR.ok).toBe(true);
      if (!expR.ok) return;
      const expId = expR.value.experienceId;
      // 2. Layout
      const layR = await createLayoutUseCase({
        tenantId: 'tenant-test', organizationId: 'org-test', actorId: 'actor-test',
        correlationId: `corr-${ind.slug}`,
        name: `${ind.name} Layout`, slug: `layout-${ind.slug}`,
        type: ind.type,
      }, deps);
      expect(layR.ok).toBe(true);
      // 3. Hero
      const heroR = await createHeroUseCase({
        tenantId: 'tenant-test', organizationId: 'org-test', actorId: 'actor-test',
        correlationId: `corr-${ind.slug}`,
        name: `${ind.name} Hero`, headline: `Welcome to ${ind.name}`,
      }, deps);
      expect(heroR.ok).toBe(true);
      // 4. Score
      const scoreR = await calculateUXScoreUseCase({
        tenantId: 'tenant-test', organizationId: 'org-test', actorId: 'actor-test',
        correlationId: `corr-${ind.slug}`, experienceId: expId,
      }, deps);
      expect(scoreR.ok).toBe(true);
      // 5. Get
      const getR = await getExperienceUseCase({ tenantId: 'tenant-test', experienceId: expId }, deps);
      expect(getR.ok).toBe(true);
      // 6. List
      const listR = await listExperiencesUseCase('tenant-test', deps);
      expect(listR.ok).toBe(true);
      if (listR.ok) expect(listR.value.some((e) => e.id === expId)).toBe(true);
    });
  }
});
