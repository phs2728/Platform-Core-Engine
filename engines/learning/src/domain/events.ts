/** Learning Engine — Events */
export const LEARNING_EVENTS = {
  LEARNING_STARTED: 'learning.started',
  LEARNING_COMPLETED: 'learning.completed',
  PATTERN_LEARNED: 'pattern.learned',
  PATTERN_UPDATED: 'pattern.updated',
  TREND_DETECTED: 'trend.detected',
  RECOMMENDATION_LEARNED: 'recommendation.learned',
  KNOWLEDGE_EVOLVED: 'knowledge.evolved',
  MEMORY_UPDATED: 'memory.updated',
  CONFIDENCE_UPDATED: 'confidence.updated',
  REPORT_GENERATED: 'learning.report.generated',
  IMPROVEMENT_DETECTED: 'improvement.detected',
  ANALYTICS_UPDATED: 'analytics.updated',
} as const;

export type LearningEventType = typeof LEARNING_EVENTS[keyof typeof LEARNING_EVENTS];

export const LEARNING_EVENT_SCHEMAS: Record<LearningEventType, string> = {
  'learning.started': 'learning.started.v1',
  'learning.completed': 'learning.completed.v1',
  'pattern.learned': 'pattern.learned.v1',
  'pattern.updated': 'pattern.updated.v1',
  'trend.detected': 'trend.detected.v1',
  'recommendation.learned': 'recommendation.learned.v1',
  'knowledge.evolved': 'knowledge.evolved.v1',
  'memory.updated': 'memory.updated.v1',
  'confidence.updated': 'confidence.updated.v1',
  'learning.report.generated': 'learning.report.generated.v1',
  'improvement.detected': 'improvement.detected.v1',
  'analytics.updated': 'analytics.updated.v1',
};
