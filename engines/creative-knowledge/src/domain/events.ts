/** Creative Knowledge Engine — Events */
export const KNOWLEDGE_EVENTS = {
  RESEARCH_CREATED: 'research.created',
  RESEARCH_COMPLETED: 'research.completed',
  INTERVIEW_COMPLETED: 'interview.completed',
  WEBSITE_AUDITED: 'website.audited',
  COMPETITOR_ANALYZED: 'competitor.analyzed',
  KNOWLEDGE_CREATED: 'knowledge.created',
  KNOWLEDGE_UPDATED: 'knowledge.updated',
  BENCHMARK_GENERATED: 'benchmark.generated',
  RECOMMENDATION_GENERATED: 'recommendation.generated',
  EVIDENCE_GENERATED: 'evidence.generated',
  BRIEF_GENERATED: 'brief.generated',
  MEMORY_UPDATED: 'memory.updated',
} as const;

export type KnowledgeEventType = typeof KNOWLEDGE_EVENTS[keyof typeof KNOWLEDGE_EVENTS];

export const KNOWLEDGE_EVENT_SCHEMAS: Record<KnowledgeEventType, string> = {
  'research.created': 'research.created.v1',
  'research.completed': 'research.completed.v1',
  'interview.completed': 'interview.completed.v1',
  'website.audited': 'website.audited.v1',
  'competitor.analyzed': 'competitor.analyzed.v1',
  'knowledge.created': 'knowledge.created.v1',
  'knowledge.updated': 'knowledge.updated.v1',
  'benchmark.generated': 'benchmark.generated.v1',
  'recommendation.generated': 'recommendation.generated.v1',
  'evidence.generated': 'evidence.generated.v1',
  'brief.generated': 'brief.generated.v1',
  'memory.updated': 'memory.updated.v1',
};
