/** Component Engine — Events */
export const COMPONENT_EVENTS = {
  COMPONENT_CREATED: 'component.created',
  COMPONENT_UPDATED: 'component.updated',
  COMPONENT_DELETED: 'component.deleted',
  COMPONENT_PUBLISHED: 'component.published',
  COMPONENT_COMPOSED: 'component.composed',
  COMPONENT_REVIEWED: 'component.reviewed',
  COMPONENT_SCORE_UPDATED: 'component.score.updated',
  COMPONENT_LEARNED: 'component.learned',
  COMPONENT_VARIANT_CREATED: 'component.variant.created',
  COMPONENT_ACCESSIBILITY_VALIDATED: 'component.accessibility.validated',
  COMPONENT_PERFORMANCE_UPDATED: 'component.performance.updated',
  COMPONENT_ANALYTICS_UPDATED: 'component.analytics.updated',
  COMPONENT_MARKETPLACE_REGISTERED: 'component.marketplace.registered',
} as const;

export type ComponentEventType = typeof COMPONENT_EVENTS[keyof typeof COMPONENT_EVENTS];

export const COMPONENT_EVENT_SCHEMAS: Record<ComponentEventType, string> = {
  'component.created': 'component.created.v1',
  'component.updated': 'component.updated.v1',
  'component.deleted': 'component.deleted.v1',
  'component.published': 'component.published.v1',
  'component.composed': 'component.composed.v1',
  'component.reviewed': 'component.reviewed.v1',
  'component.score.updated': 'component.score.updated.v1',
  'component.learned': 'component.learned.v1',
  'component.variant.created': 'component.variant.created.v1',
  'component.accessibility.validated': 'component.accessibility.validated.v1',
  'component.performance.updated': 'component.performance.updated.v1',
  'component.analytics.updated': 'component.analytics.updated.v1',
  'component.marketplace.registered': 'component.marketplace.registered.v1',
};
