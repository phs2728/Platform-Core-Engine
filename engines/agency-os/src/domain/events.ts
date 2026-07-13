/** Agency OS Engine — Events */
export const AGENCY_EVENTS = {
  WORKFLOW_INITIATED: 'agency.workflow.initiated',
  WORKFLOW_PHASE_CHANGED: 'agency.workflow.phase_changed',
  WORKFLOW_RELEASED: 'agency.workflow.released',
  WORKFLOW_FAILED: 'agency.workflow.failed',
  SWARM_CREATED: 'agency.swarm.created',
  SWARM_COMPLETED: 'agency.swarm.completed',
  SWARM_FAILED: 'agency.swarm.failed',
  TASK_ASSIGNED: 'agency.task.assigned',
  TASK_COMPLETED: 'agency.task.completed',
  TASK_FAILED: 'agency.task.failed',
  TASK_RETRIED: 'agency.task.retried',
  DEBATE_STARTED: 'agency.debate.started',
  DEBATE_RESOLVED: 'agency.debate.resolved',
  DECISION_MADE: 'agency.decision.made',
  DECISION_REJECTED: 'agency.decision.rejected',
  MEMORY_STORED: 'agency.memory.stored',
  MEMORY_UPDATED: 'agency.memory.updated',
  REPORT_GENERATED: 'agency.report.generated',
} as const;

export type AgencyEventType = typeof AGENCY_EVENTS[keyof typeof AGENCY_EVENTS];

export const AGENCY_EVENT_SCHEMAS: Record<AgencyEventType, string> = {
  'agency.workflow.initiated': 'agency.workflow.initiated.v1',
  'agency.workflow.phase_changed': 'agency.workflow.phase_changed.v1',
  'agency.workflow.released': 'agency.workflow.released.v1',
  'agency.workflow.failed': 'agency.workflow.failed.v1',
  'agency.swarm.created': 'agency.swarm.created.v1',
  'agency.swarm.completed': 'agency.swarm.completed.v1',
  'agency.swarm.failed': 'agency.swarm.failed.v1',
  'agency.task.assigned': 'agency.task.assigned.v1',
  'agency.task.completed': 'agency.task.completed.v1',
  'agency.task.failed': 'agency.task.failed.v1',
  'agency.task.retried': 'agency.task.retried.v1',
  'agency.debate.started': 'agency.debate.started.v1',
  'agency.debate.resolved': 'agency.debate.resolved.v1',
  'agency.decision.made': 'agency.decision.made.v1',
  'agency.decision.rejected': 'agency.decision.rejected.v1',
  'agency.memory.stored': 'agency.memory.stored.v1',
  'agency.memory.updated': 'agency.memory.updated.v1',
  'agency.report.generated': 'agency.report.generated.v1',
};