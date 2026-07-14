/** CMS Engine — Events */
export const CMS_EVENTS = {
  CONTENT_CREATED: 'cms.content.created',
  CONTENT_UPDATED: 'cms.content.updated',
  CONTENT_DELETED: 'cms.content.deleted',
  CONTENT_PUBLISHED: 'cms.content.published',
  PAGE_CREATED: 'cms.page.created',
  PAGE_UPDATED: 'cms.page.updated',
  PAGE_PUBLISHED: 'cms.page.published',
  PAGE_ARCHIVED: 'cms.page.archived',
  SECTION_ADDED: 'cms.section.added',
  SECTION_REMOVED: 'cms.section.removed',
  SLOT_CREATED: 'cms.slot.created',
  SLOT_ASSIGNED: 'cms.slot.assigned',
  LOCALE_VARIANT_CREATED: 'cms.locale.created',
  LAYOUT_SNAPSHOT_CREATED: 'cms.snapshot.created',
  PAGE_RENDERED: 'cms.page.rendered',
} as const;

export type CMSEventType = typeof CMS_EVENTS[keyof typeof CMS_EVENTS];

export const CMS_EVENT_SCHEMAS: Record<CMSEventType, string> = {
  'cms.content.created': 'cms.content.created.v1',
  'cms.content.updated': 'cms.content.updated.v1',
  'cms.content.deleted': 'cms.content.deleted.v1',
  'cms.content.published': 'cms.content.published.v1',
  'cms.page.created': 'cms.page.created.v1',
  'cms.page.updated': 'cms.page.updated.v1',
  'cms.page.published': 'cms.page.published.v1',
  'cms.page.archived': 'cms.page.archived.v1',
  'cms.section.added': 'cms.section.added.v1',
  'cms.section.removed': 'cms.section.removed.v1',
  'cms.slot.created': 'cms.slot.created.v1',
  'cms.slot.assigned': 'cms.slot.assigned.v1',
  'cms.locale.created': 'cms.locale.created.v1',
  'cms.snapshot.created': 'cms.snapshot.created.v1',
  'cms.page.rendered': 'cms.page.rendered.v1',
};