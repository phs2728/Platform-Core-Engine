/**
 * Agency OS Engine — Public Interfaces
 *
 * Platform Agency OS RC1 — AI Digital Agency Operating System
 * Executive Layer + Swarm Layer + Debate + Workflow + Memory
 */
import type { Result, EventEnvelope } from '@platform/core-sdk';

// Re-export all Agency OS types from core-sdk
export type {
  DecisionPhase, DecisionGate,
  ExecutiveRole, ExecutiveAgent, ExecutiveDecision,
  SwarmType, SwarmSpecialist, Swarm,
  TaskStatus, TaskPriority, AgencyTask, TaskResult,
  DebateStance, DebateOpinion, ExpertDebate,
  WorkflowPhase, WorkflowStatus, AgencyWorkflow,
  WorkflowTemplateType, WorkflowTemplate,
  MemoryCategory, ExecutiveMemory,
  AgencyExecutionReport, SwarmCollaborationReport,
  DebateSummaryReport, DecisionLogReport,
  ExecutiveMemoryReport, LearningEvolutionReport,
  AgencyAuditEventType, AgencyAuditRecord,
} from '@platform/core-sdk';
export { AGENCY_FIRST_PRINCIPLE, DECISION_PIPELINE, WORKFLOW_PHASES } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Core Infra
// ═══════════════════════════════════════════

export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IEventBus { emit<T>(envelope: EventEnvelope<T>): Promise<void>; }

export interface IOrganizationVerifier {
  verify(tenantId: string, organizationId: string): Promise<boolean>;
}

// ═══════════════════════════════════════════
// Repository Contracts
// ═══════════════════════════════════════════

export interface IWorkflowRepository {
  insert(w: AgencyWorkflow): Promise<void>;
  findById(tenantId: string, id: string): Promise<AgencyWorkflow | null>;
  findByOrganization(tenantId: string, orgId: string): Promise<AgencyWorkflow[]>;
  update(tenantId: string, id: string, patch: Partial<AgencyWorkflow>): Promise<void>;
}

export interface ISwarmRepository {
  insert(s: Swarm): Promise<void>;
  findById(tenantId: string, id: string): Promise<Swarm | null>;
  findByWorkflow(tenantId: string, workflowId: string): Promise<Swarm[]>;
  findByType(tenantId: string, type: SwarmType): Promise<Swarm[]>;
  update(tenantId: string, id: string, patch: Partial<Swarm>): Promise<void>;
}

export interface ITaskRepository {
  insert(t: AgencyTask): Promise<void>;
  findById(tenantId: string, id: string): Promise<AgencyTask | null>;
  findByWorkflow(tenantId: string, workflowId: string): Promise<AgencyTask[]>;
  findBySwarm(tenantId: string, swarmId: string): Promise<AgencyTask[]>;
  update(tenantId: string, id: string, patch: Partial<AgencyTask>): Promise<void>;
}

export interface IDebateRepository {
  insert(d: ExpertDebate): Promise<void>;
  findById(tenantId: string, id: string): Promise<ExpertDebate | null>;
  findByWorkflow(tenantId: string, workflowId: string): Promise<ExpertDebate[]>;
}

export interface IExecutiveDecisionRepository {
  insert(d: ExecutiveDecision): Promise<void>;
  findById(tenantId: string, id: string): Promise<ExecutiveDecision | null>;
  findByOrganization(tenantId: string, orgId: string): Promise<ExecutiveDecision[]>;
}

export interface IExecutiveMemoryRepository {
  insert(m: ExecutiveMemory): Promise<void>;
  findById(tenantId: string, id: string): Promise<ExecutiveMemory | null>;
  findByOrganization(tenantId: string, orgId: string): Promise<ExecutiveMemory[]>;
  findByCategory(tenantId: string, orgId: string, category: MemoryCategory): Promise<ExecutiveMemory[]>;
  update(tenantId: string, id: string, patch: Partial<ExecutiveMemory>): Promise<void>;
}

export interface IAgencyAuditRepository {
  insert(record: Omit<AgencyAuditRecord, 'id' | 'createdAt'>): Promise<AgencyAuditRecord>;
  findByTenant(tenantId: string, limit?: number): Promise<AgencyAuditRecord[]>;
  findByOrganization(tenantId: string, orgId: string, limit?: number): Promise<AgencyAuditRecord[]>;
}

// ═══════════════════════════════════════════
// Workflow Templates (7 templates)
// ═══════════════════════════════════════════

import type {
  AgencyWorkflow, Swarm, AgencyTask, ExpertDebate, ExecutiveDecision,
  ExecutiveMemory, AgencyAuditRecord,
  WorkflowTemplateType, SwarmType, MemoryCategory,
} from '@platform/core-sdk';

export const WORKFLOW_TEMPLATES: Record<WorkflowTemplateType, {
  name: string;
  description: string;
  requiredSwarms: SwarmType[];
  estimatedTasks: number;
  industry?: string;
}> = {
  LaunchHotelWebsite: {
    name: 'Launch Hotel Website',
    description: 'Hospitality 웹사이트 런칭 — Real Rooms, Reviews, Best Price',
    requiredSwarms: ['Research', 'Creative', 'UX', 'Engineering', 'QA', 'SEO', 'Accessibility'],
    estimatedTasks: 25,
    industry: 'Hospitality',
  },
  LaunchRestaurantWebsite: {
    name: 'Launch Restaurant Website',
    description: 'Restaurant 웹사이트 런칭 — Food Photos, Chef, Reservation',
    requiredSwarms: ['Research', 'Creative', 'UX', 'Engineering', 'QA', 'SEO'],
    estimatedTasks: 20,
    industry: 'Restaurant',
  },
  LaunchMarketplace: {
    name: 'Launch Marketplace',
    description: 'Marketplace 웹사이트 런칭 — Verified Sellers, Escrow',
    requiredSwarms: ['Research', 'Creative', 'UX', 'Engineering', 'QA', 'SEO', 'Accessibility'],
    estimatedTasks: 30,
    industry: 'Marketplace',
  },
  LaunchSaaS: {
    name: 'Launch SaaS Website',
    description: 'SaaS 웹사이트 런칭 — SOC2, 99.99%, Enterprise',
    requiredSwarms: ['Research', 'Creative', 'UX', 'Engineering', 'QA', 'SEO'],
    estimatedTasks: 25,
    industry: 'SaaS',
  },
  LaunchChurchWebsite: {
    name: 'Launch Church Website',
    description: 'Church 웹사이트 런칭 — Welcome, Service Times, Visit',
    requiredSwarms: ['Research', 'Creative', 'UX', 'Engineering', 'QA'],
    estimatedTasks: 15,
    industry: 'Church',
  },
  LaunchNGOWebsite: {
    name: 'Launch NGO Website',
    description: 'NGO 웹사이트 런칭 — Mission, Impact, Transparency, Donate',
    requiredSwarms: ['Research', 'Creative', 'UX', 'Engineering', 'QA', 'SEO'],
    estimatedTasks: 18,
    industry: 'NGO',
  },
  LaunchTravelWebsite: {
    name: 'Launch Travel Website',
    description: 'Travel 웹사이트 런칭 — Local Operation, Guide, Tour Photos',
    requiredSwarms: ['Research', 'Creative', 'UX', 'Engineering', 'QA', 'SEO', 'Accessibility'],
    estimatedTasks: 28,
    industry: 'Travel',
  },
  Custom: {
    name: 'Custom Workflow',
    description: '사용자 정의 워크플로우',
    requiredSwarms: ['Research', 'Creative', 'UX', 'Engineering', 'QA'],
    estimatedTasks: 20,
  },
};

// ═══════════════════════════════════════════
// Swarm Specialist Presets (9 swarms)
// ═══════════════════════════════════════════

export const SWARM_SPECIALISTS: Record<SwarmType, { leader: string; specialists: { role: string; capabilities: string[] }[] }> = {
  Research: {
    leader: 'Research Lead',
    specialists: [
      { role: 'Customer Research', capabilities: ['persona', 'pain-point', 'behavior'] },
      { role: 'Competitor Research', capabilities: ['analysis', 'benchmarking'] },
      { role: 'Market Research', capabilities: ['trends', 'positioning'] },
      { role: 'Trend Research', capabilities: ['design-trends', 'tech-trends'] },
      { role: 'Evidence Research', capabilities: ['data-collection', 'validation'] },
    ],
  },
  Creative: {
    leader: 'Creative Director',
    specialists: [
      { role: 'Brand Director', capabilities: ['brand-strategy', 'identity'] },
      { role: 'Art Director', capabilities: ['visual', 'moodboard'] },
      { role: 'Copy Director', capabilities: ['messaging', 'tone'] },
      { role: 'Story Director', capabilities: ['narrative', 'flow'] },
      { role: 'Photography Director', capabilities: ['photo-direction', 'style'] },
    ],
  },
  UX: {
    leader: 'Decision Architect',
    specialists: [
      { role: 'Journey Architect', capabilities: ['decision-journey', 'cqm'] },
      { role: 'Trust Architect', capabilities: ['trust-evidence', 'placement'] },
      { role: 'FAQ Architect', capabilities: ['objection', 'decision-accelerator'] },
      { role: 'Detail Strategy Architect', capabilities: ['blueprint', 'section-order'] },
    ],
  },
  Engineering: {
    leader: 'Engineering Lead',
    specialists: [
      { role: 'Experience Engineer', capabilities: ['layout', 'experience'] },
      { role: 'Theme Engineer', capabilities: ['color', 'typography'] },
      { role: 'Component Engineer', capabilities: ['component', 'variant'] },
      { role: 'CMS Engineer', capabilities: ['content', 'page'] },
      { role: 'Studio Engineer', capabilities: ['draft', 'publish'] },
      { role: 'Runtime Engineer', capabilities: ['deploy', 'hosting'] },
    ],
  },
  QA: {
    leader: 'QA Lead',
    specialists: [
      { role: 'Compatibility Specialist', capabilities: ['browser', 'device'] },
      { role: 'Guardian Specialist', capabilities: ['constitution', 'boundary'] },
      { role: 'Validation Specialist', capabilities: ['typecheck', 'test'] },
      { role: 'Release Manager', capabilities: ['version', 'deploy'] },
    ],
  },
  Learning: {
    leader: 'Learning Lead',
    specialists: [
      { role: 'Pattern Analyst', capabilities: ['pattern-recognition'] },
      { role: 'Recommendation Engine', capabilities: ['recommendation'] },
      { role: 'Memory Curator', capabilities: ['memory', 'update'] },
    ],
  },
  Marketing: {
    leader: 'Marketing Lead',
    specialists: [
      { role: 'Content Strategist', capabilities: ['content', 'messaging'] },
      { role: 'Social Media Specialist', capabilities: ['social', 'campaign'] },
    ],
  },
  SEO: {
    leader: 'SEO Lead',
    specialists: [
      { role: 'Keyword Specialist', capabilities: ['keyword', 'research'] },
      { role: 'Meta Specialist', capabilities: ['meta', 'schema'] },
    ],
  },
  Accessibility: {
    leader: 'Accessibility Lead',
    specialists: [
      { role: 'WCAG Specialist', capabilities: ['wcag', 'aaa'] },
      { role: 'Screen Reader Specialist', capabilities: ['aria', 'sr-only'] },
    ],
  },
};

// ═══════════════════════════════════════════
// Executive Memory Presets (4 success patterns)
// ═══════════════════════════════════════════

export const EXECUTIVE_MEMORY_PRESETS = [
  { category: 'ConversionRule' as MemoryCategory, pattern: 'Luxury → Whitespace', trigger: 'Luxury style', outcome: 'Premium Conversion ↑', evidence: ['whitespace-ratio-0.5', 'editorial-typography'], confidence: 0.85 },
  { category: 'IndustryRule' as MemoryCategory, pattern: 'Hospitality → Real Staff', trigger: 'Hospitality industry', outcome: 'Trust ↑', evidence: ['staff-photos', 'verified-reviews'], confidence: 0.90 },
  { category: 'IndustryRule' as MemoryCategory, pattern: 'Restaurant → Chef Face', trigger: 'Restaurant industry', outcome: 'Reservation ↑', evidence: ['chef-profile', 'food-photos'], confidence: 0.88 },
  { category: 'ConversionRule' as MemoryCategory, pattern: 'Hostel → Community Photos', trigger: 'Budget hospitality', outcome: 'Booking ↑', evidence: ['guest-photos', 'community-reviews'], confidence: 0.82 },
];

export { type Result, type EventEnvelope };