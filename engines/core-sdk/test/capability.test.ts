/**
 * Platform Capability Upgrade RC1 — Test Suite (Cap 4-7)
 */
import { describe, it, expect } from 'vitest';
import {
  ALL_FRONTEND_TARGETS, createFrontendGenerationContract, validateGenerationContract,
  DETAIL_STRATEGY_LIBRARY, getDetailStrategy, listAllDetailStrategies,
  DEFAULT_ESCALATION_RULES, evaluateEscalation, DEFAULT_CONVERSATION_STRATEGY,
  PLATFORM_VALIDATION_RULES, APPROVED_ENGINES,
  validateNoDuplicateEngine, validateNoNewBusinessEngine,
  validateNoIndustryCoupling, validatePreservedEngines, runPlatformValidation,
} from '../src/index.js';
import type { ConversationSession } from '../src/index.js';

// ═══════════════════════════════════════════
// Capability 4: AI Frontend Generation Contract
// ═══════════════════════════════════════════

describe('Capability 4: AI Frontend Generation Contract', () => {
  it('ALL_FRONTEND_TARGETS has 6 targets', () => {
    expect(ALL_FRONTEND_TARGETS.length).toBe(6);
    expect(ALL_FRONTEND_TARGETS).toContain('react');
    expect(ALL_FRONTEND_TARGETS).toContain('nextjs');
    expect(ALL_FRONTEND_TARGETS).toContain('flutter');
  });

  it('createFrontendGenerationContract generates full contract', () => {
    const contract = createFrontendGenerationContract({
      target: 'nextjs',
      theme: { colors: {}, typography: {}, spacing: {}, borderRadius: {}, shadows: {}, motion: [], breakpoints: {}, darkMode: false },
      experience: { layouts: [], pageTypes: ['home'], navigationPattern: 'header-footer' },
      components: { components: [] },
      cms: { contentTypes: [] },
      api: { endpoints: [], baseApiUrl: '/api' },
      localization: { defaultLocale: 'en-US', supportedLocales: ['en-US', 'ko-KR'], urlStrategy: 'path', machineTranslationEnabled: true },
      trustArchitecture: { industry: 'Hospitality', requiredEvidence: ['h-rooms', 'h-reviews'] },
      customerDecisionArchitecture: { pageQuestions: { home: ['안전?', '가격?'] } },
    });
    expect(contract.accessibility.wcagLevel).toBe('AAA');
    expect(contract.animation.disabledOnReducedMotion).toBe(true);
    expect(contract.responsive.strategy).toBe('mobile-first');
    expect(contract.images.formats).toContain('avif');
  });

  it('validateGenerationContract passes for complete contract', () => {
    const contract = createFrontendGenerationContract({
      target: 'react',
      theme: { colors: {}, typography: {}, spacing: {}, borderRadius: {}, shadows: {}, motion: [], breakpoints: {}, darkMode: false },
      experience: { layouts: [], pageTypes: [], navigationPattern: 'sidebar' },
      components: { components: [] },
      cms: { contentTypes: [] },
      api: { endpoints: [], baseApiUrl: '' },
      localization: { defaultLocale: 'en', supportedLocales: ['en'], urlStrategy: 'none', machineTranslationEnabled: false },
      trustArchitecture: { industry: '', requiredEvidence: [] },
      customerDecisionArchitecture: { pageQuestions: {} },
    });
    const result = validateGenerationContract(contract);
    expect(result.valid).toBe(true);
    expect(result.missing.length).toBe(0);
  });
});

// ═══════════════════════════════════════════
// Capability 5: Design Detail Strategy
// ═══════════════════════════════════════════

describe('Capability 5: Design Detail Strategy', () => {
  it('DETAIL_STRATEGY_LIBRARY has 5 strategies', () => {
    const keys = Object.keys(DETAIL_STRATEGY_LIBRARY);
    expect(keys.length).toBeGreaterThanOrEqual(5);
    expect(keys).toContain('restaurant-menu');
    expect(keys).toContain('hotel-room');
    expect(keys).toContain('travel-tour');
  });

  it('restaurant-menu has 8 sections', () => {
    const strategy = DETAIL_STRATEGY_LIBRARY['restaurant-menu'];
    expect(strategy.sections.length).toBe(8);
    expect(strategy.primaryCTA).toBe('Add to Order');
  });

  it('hotel-room has booking CTA', () => {
    const strategy = DETAIL_STRATEGY_LIBRARY['hotel-room'];
    expect(strategy.primaryCTA).toBe('Book Now');
    expect(strategy.trustEvidenceOrder).toContain('h-rooms');
  });

  it('getDetailStrategy returns strategy by industry + pageType', () => {
    const strategy = getDetailStrategy('Marketplace', 'product');
    expect(strategy).not.toBeNull();
    expect(strategy!.sections.length).toBe(8);
  });

  it('getDetailStrategy returns null for unknown', () => {
    expect(getDetailStrategy('Restaurant', 'tour')).toBeNull();
  });

  it('listAllDetailStrategies returns summary', () => {
    const list = listAllDetailStrategies();
    expect(list.length).toBeGreaterThanOrEqual(5);
    expect(list[0].industry).toBeTruthy();
  });
});

// ═══════════════════════════════════════════
// Capability 6: Customer Assistance Layer
// ═══════════════════════════════════════════

describe('Capability 6: Customer Assistance Layer', () => {
  it('DEFAULT_ESCALATION_RULES has 6 rules', () => {
    expect(DEFAULT_ESCALATION_RULES.length).toBe(6);
  });

  it('DEFAULT_CONVERSATION_STRATEGY has greeting', () => {
    expect(DEFAULT_CONVERSATION_STRATEGY.greetingMessage).toBeTruthy();
    expect(DEFAULT_CONVERSATION_STRATEGY.maxAiAttempts).toBe(3);
  });

  it('evaluateEscalation stays at ai for normal conversation', () => {
    const session: ConversationSession = {
      id: 's1', tenantId: 't1', visitorId: 'v1', locale: 'en',
      messages: [{ id: 'm1', role: 'user', content: 'What are your hours?', timestamp: new Date().toISOString() }],
      context: { detectedObjections: [], detectedInterests: [], pageHistory: [], timeOnSite: 0, deviceType: 'desktop' },
      escalationLevel: 'ai', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    expect(evaluateEscalation(session)).toBe('ai');
  });

  it('evaluateEscalation escalates on repeated question', () => {
    const session: ConversationSession = {
      id: 's1', tenantId: 't1', visitorId: 'v1', locale: 'en',
      messages: [
        { id: 'm1', role: 'user', content: 'What is the price?', timestamp: new Date().toISOString() },
        { id: 'm2', role: 'user', content: 'What is the price?', timestamp: new Date().toISOString() },
      ],
      context: { detectedObjections: [], detectedInterests: [], pageHistory: [], timeOnSite: 0, deviceType: 'mobile' },
      escalationLevel: 'ai', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    expect(evaluateEscalation(session)).toBe('guided');
  });

  it('evaluateEscalation escalates on user request for human', () => {
    const session: ConversationSession = {
      id: 's1', tenantId: 't1', visitorId: 'v1', locale: 'en',
      messages: [{ id: 'm1', role: 'user', content: 'I want to talk to a human', timestamp: new Date().toISOString() }],
      context: { detectedObjections: [], detectedInterests: [], pageHistory: [], timeOnSite: 0, deviceType: 'desktop' },
      escalationLevel: 'ai', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    expect(evaluateEscalation(session)).toBe('human');
  });
});

// ═══════════════════════════════════════════
// Capability 7: Platform Validation
// ═══════════════════════════════════════════

describe('Capability 7: Platform Validation', () => {
  it('PLATFORM_VALIDATION_RULES has 18 rules', () => {
    expect(PLATFORM_VALIDATION_RULES.length).toBe(18);
  });

  it('APPROVED_ENGINES includes all required engines', () => {
    expect(APPROVED_ENGINES).toContain('agency-os');
    expect(APPROVED_ENGINES).toContain('creative-intelligence');
    expect(APPROVED_ENGINES).toContain('theme');
    expect(APPROVED_ENGINES).toContain('component');
    expect(APPROVED_ENGINES).toContain('cms');
    expect(APPROVED_ENGINES).toContain('studio');
  });

  it('validateNoDuplicateEngine detects duplicates', () => {
    const finding = validateNoDuplicateEngine(['theme', 'component'], 'theme');
    expect(finding).not.toBeNull();
    expect(finding!.severity).toBe('critical');
  });

  it('validateNoDuplicateEngine passes for new', () => {
    expect(validateNoDuplicateEngine(['theme'], 'component')).toBeNull();
  });

  it('validateNoNewBusinessEngine rejects unknown engine', () => {
    const finding = validateNoNewBusinessEngine('new-random-engine');
    expect(finding).not.toBeNull();
    expect(finding!.severity).toBe('critical');
  });

  it('validateNoNewBusinessEngine accepts approved engine', () => {
    expect(validateNoNewBusinessEngine('theme')).toBeNull();
  });

  it('validateNoIndustryCoupling detects coupling', () => {
    const finding = validateNoIndustryCoupling('this is a hotel booking system', ['hotel']);
    expect(finding).not.toBeNull();
  });

  it('validateNoIndustryCoupling passes for neutral code', () => {
    expect(validateNoIndustryCoupling('createPage(tenantId)', ['hotel', 'restaurant'])).toBeNull();
  });

  it('validatePreservedEngines returns empty when all present', () => {
    const allEngines = ['agency-os', 'creative-intelligence', 'experience', 'theme', 'component', 'cms', 'studio', 'learning'];
    expect(validatePreservedEngines(allEngines).length).toBe(0);
  });

  it('validatePreservedEngines detects missing', () => {
    const findings = validatePreservedEngines(['theme', 'component']);
    expect(findings.length).toBe(6);
    expect(findings.some(f => f.message.includes('agency-os'))).toBe(true);
  });

  it('runPlatformValidation passes for clean platform', () => {
    const allEngines = ['agency-os', 'creative-intelligence', 'experience', 'theme', 'component', 'cms', 'studio', 'learning'];
    const report = runPlatformValidation({
      existingEngines: allEngines,
      actualEngines: allEngines,
    });
    expect(report.passed).toBe(true);
    expect(report.criticalCount).toBe(0);
  });

  it('runPlatformValidation fails for boundary violation', () => {
    const allEngines = ['agency-os', 'creative-intelligence', 'experience', 'theme', 'component', 'cms', 'studio', 'learning'];
    const report = runPlatformValidation({
      existingEngines: allEngines,
      actualEngines: allEngines,
      importViolations: [{ source: 'engines/theme', target: '@platform/engine-component' }],
    });
    expect(report.passed).toBe(false);
    expect(report.errorCount).toBeGreaterThan(0);
  });

  it('runPlatformValidation fails for missing engine', () => {
    const report = runPlatformValidation({
      existingEngines: ['theme'],
      actualEngines: ['theme'],
    });
    expect(report.passed).toBe(false);
    expect(report.criticalCount).toBeGreaterThan(0);
  });
});