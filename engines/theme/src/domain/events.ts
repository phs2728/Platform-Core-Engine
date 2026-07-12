/** Theme Engine — Events */
export const THEME_EVENTS = {
  THEME_CREATED: 'theme.created',
  THEME_UPDATED: 'theme.updated',
  THEME_ACTIVATED: 'theme.activated',
  THEME_ARCHIVED: 'theme.archived',
  BRAND_CREATED: 'brand.created',
  BRAND_UPDATED: 'brand.updated',
  TOKENSET_CREATED: 'tokenset.created',
  TOKENSET_UPDATED: 'tokenset.updated',
  VARIANT_CREATED: 'variant.created',
  VARIANT_UPDATED: 'variant.updated',
  THEME_COMPILED: 'theme.compiled',
  THEME_EXPORTED: 'theme.exported',
  THEME_IMPORTED: 'theme.imported',
  THEME_VALIDATED: 'theme.validated',
  THEME_SCORED: 'theme.scored',
} as const;

export type ThemeEventType = typeof THEME_EVENTS[keyof typeof THEME_EVENTS];

export const THEME_EVENT_SCHEMAS: Record<ThemeEventType, string> = {
  'theme.created': 'theme.created.v1',
  'theme.updated': 'theme.updated.v1',
  'theme.activated': 'theme.activated.v1',
  'theme.archived': 'theme.archived.v1',
  'brand.created': 'brand.created.v1',
  'brand.updated': 'brand.updated.v1',
  'tokenset.created': 'tokenset.created.v1',
  'tokenset.updated': 'tokenset.updated.v1',
  'variant.created': 'variant.created.v1',
  'variant.updated': 'variant.updated.v1',
  'theme.compiled': 'theme.compiled.v1',
  'theme.exported': 'theme.exported.v1',
  'theme.imported': 'theme.imported.v1',
  'theme.validated': 'theme.validated.v1',
  'theme.scored': 'theme.scored.v1',
};
