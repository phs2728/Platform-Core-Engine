/**
 * frontend_gen/index.ts — AI Frontend Generation Contract
 *
 * Capability 4: Platform must expose everything AI needs
 * to generate production-ready UI without reading source code.
 */

// ═══════════════════════════════════════════
// Output Targets
// ═══════════════════════════════════════════

export type FrontendOutputTarget =
  | 'react' | 'nextjs' | 'vue' | 'flutter' | 'swiftui' | 'jetpack-compose';

export const ALL_FRONTEND_TARGETS: FrontendOutputTarget[] =
  ['react', 'nextjs', 'vue', 'flutter', 'swiftui', 'jetpack-compose'];

// ═══════════════════════════════════════════
// Manifests AI receives
// ═══════════════════════════════════════════

export interface ThemeManifestForAI {
  readonly colors: Record<string, string>;
  readonly typography: Record<string, { fontFamily: string; fontSize: string; fontWeight: number; lineHeight: string }>;
  readonly spacing: Record<string, string>;
  readonly borderRadius: Record<string, string>;
  readonly shadows: Record<string, string>;
  readonly motion: { duration: string; easing: string }[];
  readonly breakpoints: Record<string, string>;
  readonly darkMode: boolean;
}

export interface ExperienceManifestForAI {
  readonly layouts: { name: string; regions: string[]; responsive: boolean }[];
  readonly pageTypes: string[];
  readonly navigationPattern: 'header-footer' | 'sidebar' | 'bottom-nav' | 'split';
}

export interface ComponentManifestForAI {
  readonly components: {
    readonly name: string;
    readonly slug: string;
    readonly type: string;
    readonly tier: 'Experience' | 'Atomic';
    readonly props: Record<string, { type: string; required: boolean; defaultValue?: string | undefined }>;
    readonly slots: string[];
    readonly variants: string[];
    readonly responsive: boolean;
    readonly accessibilityRole: string;
  }[];
}

export interface CMSSchemaForAI {
  readonly contentTypes: {
    readonly name: string;
    readonly fields: { name: string; type: string; localized: boolean; required: boolean }[];
  }[];
}

export interface APIContractForAI {
  readonly endpoints: { path: string; method: string; requestShape: Record<string, string>; responseShape: Record<string, string> }[];
  readonly baseApiUrl: string;
}

export interface LocalizationContractForAI {
  readonly defaultLocale: string;
  readonly supportedLocales: string[];
  readonly urlStrategy: string;
  readonly machineTranslationEnabled: boolean;
}

export interface AccessibilityRulesForAI {
  readonly wcagLevel: 'A' | 'AA' | 'AAA';
  readonly rules: { id: string; description: string; appliesTo: string[] }[];
}

export interface SEORulesForAI {
  readonly metaTags: string[];
  readonly structuredData: string[];
  readonly sitemapEnabled: boolean;
  readonly openGraphEnabled: boolean;
}

export interface AnimationRulesForAI {
  readonly durations: Record<string, string>;
  readonly easings: Record<string, string>;
  readonly disabledOnReducedMotion: boolean;
}

export interface ResponsiveRulesForAI {
  readonly breakpoints: Record<string, string>;
  readonly strategy: 'mobile-first' | 'desktop-first';
  readonly containerQueries: boolean;
}

export interface ImageRulesForAI {
  readonly formats: string[];
  readonly lazyLoad: boolean;
  readonly responsive: boolean;
  readonly placeholder: 'blur' | 'empty' | 'dominant-color';
}

export interface TypographyRulesForAI {
  readonly scale: Record<string, string>;
  readonly pairing: { heading: string; body: string };
  readonly lineHeight: Record<string, string>;
}

export interface InteractionRulesForAI {
  readonly hover: { scale: string; duration: string };
  readonly focus: { outline: string; offset: string };
  readonly active: { scale: string };
  readonly disabled: { opacity: string };
}

// ═══════════════════════════════════════════
// Full Frontend Generation Contract
// ═══════════════════════════════════════════

export interface FrontendGenerationContract {
  readonly target: FrontendOutputTarget;
  readonly theme: ThemeManifestForAI;
  readonly experience: ExperienceManifestForAI;
  readonly components: ComponentManifestForAI;
  readonly cms: CMSSchemaForAI;
  readonly api: APIContractForAI;
  readonly localization: LocalizationContractForAI;
  readonly trustArchitecture: { industry: string; requiredEvidence: string[] };
  readonly customerDecisionArchitecture: { pageQuestions: Record<string, string[]> };
  readonly accessibility: AccessibilityRulesForAI;
  readonly seo: SEORulesForAI;
  readonly animation: AnimationRulesForAI;
  readonly responsive: ResponsiveRulesForAI;
  readonly images: ImageRulesForAI;
  readonly typography: TypographyRulesForAI;
  readonly interactions: InteractionRulesForAI;
}

// ═══════════════════════════════════════════
// Builder
// ═══════════════════════════════════════════

export function createFrontendGenerationContract(input: {
  target: FrontendOutputTarget;
  theme: ThemeManifestForAI;
  experience: ExperienceManifestForAI;
  components: ComponentManifestForAI;
  cms: CMSSchemaForAI;
  api: APIContractForAI;
  localization: LocalizationContractForAI;
  trustArchitecture: { industry: string; requiredEvidence: string[] };
  customerDecisionArchitecture: { pageQuestions: Record<string, string[]> };
}): FrontendGenerationContract {
  return {
    ...input,
    accessibility: {
      wcagLevel: 'AAA',
      rules: [
        { id: 'color-contrast', description: 'All text must have WCAG AAA contrast ratio', appliesTo: ['text', 'button', 'link'] },
        { id: 'keyboard-nav', description: 'All interactive elements must be keyboard navigable', appliesTo: ['button', 'link', 'form'] },
        { id: 'screen-reader', description: 'All visual elements must have ARIA labels', appliesTo: ['icon', 'image', 'card'] },
        { id: 'focus-visible', description: 'Focus indicators must be visible', appliesTo: ['all'] },
      ],
    },
    seo: {
      metaTags: ['title', 'description', 'og:title', 'og:description', 'og:image', 'twitter:card'],
      structuredData: ['Organization', 'WebSite', 'BreadcrumbList'],
      sitemapEnabled: true,
      openGraphEnabled: true,
    },
    animation: {
      durations: { fast: '150ms', normal: '300ms', slow: '500ms', page: '800ms' },
      easings: { ease: 'cubic-bezier(0.4, 0, 0.2, 1)', spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
      disabledOnReducedMotion: true,
    },
    responsive: {
      breakpoints: { mobile: '375px', tablet: '768px', desktop: '1024px', wide: '1440px' },
      strategy: 'mobile-first',
      containerQueries: true,
    },
    images: {
      formats: ['avif', 'webp', 'jpg'],
      lazyLoad: true,
      responsive: true,
      placeholder: 'dominant-color',
    },
    typography: {
      scale: { display: 'clamp(3rem, 8vw, 6rem)', h1: 'clamp(2rem, 5vw, 3.5rem)', h2: 'clamp(1.5rem, 4vw, 2.5rem)', body: '1rem', small: '0.875rem' },
      pairing: { heading: 'Pretendard', body: 'Pretendard' },
      lineHeight: { heading: '1.1', body: '1.6' },
    },
    interactions: {
      hover: { scale: '1.02', duration: '200ms' },
      focus: { outline: '2px solid currentColor', offset: '2px' },
      active: { scale: '0.98' },
      disabled: { opacity: '0.5' },
    },
  };
}

/**
 * Validate that a contract has all required fields for AI generation.
 */
export function validateGenerationContract(contract: FrontendGenerationContract): {
  valid: boolean; missing: string[];
} {
  const required: (keyof FrontendGenerationContract)[] = [
    'target', 'theme', 'experience', 'components', 'cms', 'api',
    'localization', 'trustArchitecture', 'customerDecisionArchitecture',
    'accessibility', 'seo', 'animation', 'responsive', 'images', 'typography', 'interactions',
  ];
  const missing = required.filter(k => contract[k] === undefined || contract[k] === null);
  return { valid: missing.length === 0, missing: missing.map(String) };
}