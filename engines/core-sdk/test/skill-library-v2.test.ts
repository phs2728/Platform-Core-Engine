/**
 * Enterprise Skill Library v2 — Test Suite (Packs, Playbooks, Reverse Engineering, Knowledge)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  INITIAL_SKILL_LIBRARY, InMemorySkillRegistry,
  INITIAL_SKILL_PACKS, InMemorySkillPackRegistry, validateSkillPack,
  INITIAL_PLAYBOOKS, InMemoryPlaybookRegistry, ALL_PLAYBOOK_SECTIONS,
  runReverseEngineeringPipeline, PRODUCTION_PROVEN_REGISTRY,
  EVIDENCE_CLASSIFICATION_ORDER, evidenceClassificationToCertification,
  InMemoryKnowledgeBase, KnowledgeEvolutionTracker,
} from '../src/index.js';

// ═══════════════════════════════════════════
// Part 1: Skill Packs
// ═══════════════════════════════════════════

describe('Part 1: Skill Packs', () => {
  it('INITIAL_SKILL_PACKS has 2 packs', () => {
    expect(INITIAL_SKILL_PACKS.length).toBe(2);
  });

  it('foundation pack has 7 skills', () => {
    const pack = INITIAL_SKILL_PACKS.find(p => p.id === 'pack-premium-website-foundation')!;
    expect(pack.skillIds.length).toBe(7);
  });

  it('pack has execution order', () => {
    const pack = INITIAL_SKILL_PACKS[0]!;
    expect(pack.executionOrder.length).toBeGreaterThan(0);
  });

  it('validateSkillPack passes with valid registry', () => {
    const registry = new InMemorySkillRegistry();
    INITIAL_SKILL_LIBRARY.forEach(s => registry.register(s));
    const pack = INITIAL_SKILL_PACKS[0]!;
    const result = validateSkillPack(pack, registry);
    expect(result.errors.length).toBe(0);
  });

  it('validateSkillPack fails for missing skills', () => {
    const registry = new InMemorySkillRegistry(); // empty
    const pack = INITIAL_SKILL_PACKS[0]!;
    const result = validateSkillPack(pack, registry);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('pack registry findBySkill returns containing packs', () => {
    const packReg = new InMemorySkillPackRegistry();
    INITIAL_SKILL_PACKS.forEach(p => packReg.register(p));
    const packs = packReg.findBySkill('nng-visual-hierarchy');
    expect(packs.length).toBe(2); // both packs contain this skill
  });
});

// ═══════════════════════════════════════════
// Part 2: Agency Playbooks
// ═══════════════════════════════════════════

describe('Part 2: Agency Playbooks', () => {
  it('INITIAL_PLAYBOOKS has 16 playbooks', () => {
    expect(INITIAL_PLAYBOOKS.length).toBe(16);
  });

  it('each playbook has 24 sections', () => {
    INITIAL_PLAYBOOKS.forEach(pb => {
      expect(pb.sections.length).toBe(24);
    });
  });

  it('ALL_PLAYBOOK_SECTIONS has 24 categories', () => {
    expect(ALL_PLAYBOOK_SECTIONS.length).toBe(24);
  });

  it('luxury hotel playbook exists', () => {
    const pb = INITIAL_PLAYBOOKS.find(p => p.id === 'playbook-luxury-hotel');
    expect(pb).toBeDefined();
    expect(pb!.industry).toBe('Hospitality');
  });

  it('each playbook has launch checklist', () => {
    INITIAL_PLAYBOOKS.forEach(pb => {
      expect(pb.launchChecklist.length).toBeGreaterThan(0);
    });
  });

  it('playbook registry getByIndustry works', () => {
    const reg = new InMemoryPlaybookRegistry();
    INITIAL_PLAYBOOKS.forEach(p => reg.register(p));
    const hospitality = reg.getByIndustry('Hospitality');
    expect(hospitality.length).toBe(2); // luxury-hotel + boutique-hostel
  });

  it('playbook registry findByPack works', () => {
    const reg = new InMemoryPlaybookRegistry();
    INITIAL_PLAYBOOKS.forEach(p => reg.register(p));
    const pbs = reg.findByPack('pack-premium-website-foundation');
    expect(pbs.length).toBe(16); // all playbooks reference foundation pack
  });
});

// ═══════════════════════════════════════════
// Part 3: Reverse Engineering
// ═══════════════════════════════════════════

describe('Part 3: Reverse Engineering System', () => {
  it('PRODUCTION_PROVEN_REGISTRY has 17 references', () => {
    expect(PRODUCTION_PROVEN_REGISTRY.length).toBe(17);
  });

  it('includes Apple, Stripe, Airbnb, Aman', () => {
    const names = PRODUCTION_PROVEN_REGISTRY.map(r => r.name);
    expect(names).toContain('Apple');
    expect(names).toContain('Stripe');
    expect(names).toContain('Airbnb');
    expect(names).toContain('Aman Resorts');
  });

  it('each reference has extracted DNA', () => {
    PRODUCTION_PROVEN_REGISTRY.forEach(r => {
      expect(r.dnaExtracted.length).toBeGreaterThan(0);
    });
  });

  it('runReverseEngineeringPipeline extracts DNA', () => {
    const result = runReverseEngineeringPipeline({
      id: 're-1', type: 'website', source: 'https://aman.com', sourceName: 'Aman Resorts',
    });
    expect(result.extractedDNA.length).toBeGreaterThan(0);
    expect(result.stages.length).toBe(11); // 11 pipeline stages
    expect(result.patternsFound).toBeGreaterThan(0);
  });

  it('pipeline stages cover full flow', () => {
    const result = runReverseEngineeringPipeline({ id: 're-2', type: 'screenshot', source: 'test.png' });
    const stageNames = result.stages.map(s => s.stage);
    expect(stageNames).toContain('Collect');
    expect(stageNames).toContain('Analyze');
    expect(stageNames).toContain('Skill');
    expect(stageNames).toContain('AgencyOS');
  });

  it('EVIDENCE_CLASSIFICATION_ORDER has 8 levels', () => {
    expect(EVIDENCE_CLASSIFICATION_ORDER.length).toBe(8);
  });

  it('evidenceClassificationToCertification maps correctly', () => {
    expect(evidenceClassificationToCertification('Industry Standard')).toBe('A');
    expect(evidenceClassificationToCertification('Production Proven')).toBe('B');
    expect(evidenceClassificationToCertification('Experimental')).toBe('D');
    expect(evidenceClassificationToCertification('Rejected')).toBe('D');
  });
});

// ═══════════════════════════════════════════
// Part 4: Knowledge Evolution
// ═══════════════════════════════════════════

describe('Part 4: Knowledge Evolution', () => {
  let kb: InMemoryKnowledgeBase;
  let tracker: KnowledgeEvolutionTracker;

  beforeEach(() => {
    kb = new InMemoryKnowledgeBase();
    tracker = new KnowledgeEvolutionTracker();
  });

  it('stores and retrieves knowledge assets', () => {
    kb.store({
      id: 'k-1', type: 'Pattern', title: 'Luxury Whitespace', description: '50%+ whitespace ratio for luxury',
      evidence: 'Aman, Four Seasons analysis', evidenceClassification: 'Production Proven',
      sourceAssets: ['ref-aman'], confidence: 0.9, tags: ['luxury', 'whitespace'],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      usageCount: 0, linkedSkillIds: [], linkedPackIds: [], linkedPlaybookIds: [],
    });
    expect(kb.get('k-1')).not.toBeNull();
    expect(kb.count()).toBe(1);
  });

  it('searches by query', () => {
    kb.store({
      id: 'k-1', type: 'ConversionRule', title: 'Sticky CTA on Mobile', description: 'Sticky CTA increases conversion',
      evidence: 'Booking.com analysis', evidenceClassification: 'Production Proven',
      sourceAssets: [], confidence: 0.85, tags: ['conversion', 'mobile'],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      usageCount: 0, linkedSkillIds: [], linkedPackIds: [], linkedPlaybookIds: [],
    });
    const results = kb.search('conversion');
    expect(results.length).toBe(1);
  });

  it('incrementUsage increases count', () => {
    kb.store({
      id: 'k-1', type: 'Pattern', title: 'Test', description: 'Test', evidence: 'Test',
      evidenceClassification: 'Community Proven', sourceAssets: [], confidence: 0.5,
      tags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      usageCount: 0, linkedSkillIds: [], linkedPackIds: [], linkedPlaybookIds: [],
    });
    kb.incrementUsage('k-1');
    kb.incrementUsage('k-1');
    expect(kb.get('k-1')!.usageCount).toBe(2);
  });

  it('linkToSkill connects knowledge to skill', () => {
    kb.store({
      id: 'k-1', type: 'Pattern', title: 'Test', description: 'Test', evidence: 'Test',
      evidenceClassification: 'Enterprise Proven', sourceAssets: [], confidence: 0.5,
      tags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      usageCount: 0, linkedSkillIds: [], linkedPackIds: [], linkedPlaybookIds: [],
    });
    kb.linkToSkill('k-1', 'wcag-color-contrast-aaa');
    expect(kb.get('k-1')!.linkedSkillIds).toContain('wcag-color-contrast-aaa');
  });

  it('feedbackFromProduction detects anti-patterns', () => {
    const events = tracker.feedbackFromProduction({
      projectId: 'proj-1',
      metrics: { bounceRate: 0.85, ctaClickRate: 0.02 },
      userFeedback: ['confusing layout'],
    }, kb);
    expect(events.some(e => e.type === 'anti_pattern_found')).toBe(true);
  });

  it('feedbackFromProduction detects patterns from A/B winners', () => {
    const events = tracker.feedbackFromProduction({
      projectId: 'proj-1',
      metrics: { ctaClickRate: 0.2 },
      abTestResults: [{ variant: 'sticky-cta', winner: true, uplift: 0.15 }],
    }, kb);
    expect(events.some(e => e.type === 'new_pattern_discovered')).toBe(true);
  });

  it('evolution report aggregates events', () => {
    tracker.feedbackFromProduction({
      projectId: 'p1', metrics: { bounceRate: 0.9 }, userFeedback: [],
    }, kb);
    tracker.feedbackFromProduction({
      projectId: 'p2', metrics: { ctaClickRate: 0.25 }, userFeedback: [],
    }, kb);
    const report = tracker.report();
    expect(report.totalEvents).toBe(2);
    expect(report.antiPatternsFound).toBe(1);
    expect(report.newPatterns).toBe(1);
  });
});

// ═══════════════════════════════════════════
// Integration: Skill → Pack → Playbook chain
// ═══════════════════════════════════════════

describe('Integration: Skill → Pack → Playbook Chain', () => {
  it('every initial skill belongs to at least one pack', () => {
    const packReg = new InMemorySkillPackRegistry();
    INITIAL_SKILL_PACKS.forEach(p => packReg.register(p));
    INITIAL_SKILL_LIBRARY.forEach(skill => {
      const containingPacks = packReg.findBySkill(skill.id);
      expect(containingPacks.length).toBeGreaterThan(0);
    });
  });

  it('every pack belongs to at least one playbook', () => {
    const pbReg = new InMemoryPlaybookRegistry();
    INITIAL_PLAYBOOKS.forEach(p => pbReg.register(p));
    INITIAL_SKILL_PACKS.forEach(pack => {
      const containingPlaybooks = pbReg.findByPack(pack.id);
      expect(containingPlaybooks.length).toBeGreaterThan(0);
    });
  });

  it('foundation pack is referenced by all 16 playbooks', () => {
    const pbReg = new InMemoryPlaybookRegistry();
    INITIAL_PLAYBOOKS.forEach(p => pbReg.register(p));
    const refs = pbReg.findByPack('pack-premium-website-foundation');
    expect(refs.length).toBe(16);
  });
});