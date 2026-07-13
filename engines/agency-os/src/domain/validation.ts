/** Agency OS Engine — Validation Schemas */
import { z } from '@platform/core-sdk';

const baseFields = {
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  organizationId: z.string().min(1),
};

// ── Workflow ──
export const initiateWorkflowSchema = z.object({
  ...baseFields,
  name: z.string().min(1).max(200),
  templateType: z.enum(['LaunchHotelWebsite', 'LaunchRestaurantWebsite', 'LaunchMarketplace',
    'LaunchSaaS', 'LaunchChurchWebsite', 'LaunchNGOWebsite', 'LaunchTravelWebsite', 'Custom']),
});

export const workflowActionSchema = z.object({
  ...baseFields,
  workflowId: z.string().min(1),
});

export const advanceWorkflowSchema = z.object({
  ...baseFields,
  workflowId: z.string().min(1),
});

// ── Swarm ──
export const createSwarmSchema = z.object({
  ...baseFields,
  workflowId: z.string().min(1),
  type: z.enum(['Research', 'Creative', 'UX', 'Engineering', 'QA', 'Learning', 'Marketing', 'SEO', 'Accessibility']),
});

export const swarmActionSchema = z.object({
  ...baseFields,
  swarmId: z.string().min(1),
});

// ── Task ──
export const createTaskSchema = z.object({
  ...baseFields,
  workflowId: z.string().min(1),
  swarmType: z.enum(['Research', 'Creative', 'UX', 'Engineering', 'QA', 'Learning', 'Marketing', 'SEO', 'Accessibility']),
  title: z.string().min(1).max(200),
  description: z.string(),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']).default('Medium'),
  dependencies: z.array(z.string()).optional(),
});

export const taskActionSchema = z.object({
  ...baseFields,
  taskId: z.string().min(1),
});

export const completeTaskSchema = z.object({
  ...baseFields,
  taskId: z.string().min(1),
  result: z.object({
    output: z.record(z.string(), z.unknown()),
    evidenceRefs: z.array(z.string()),
    confidenceScore: z.number().min(0).max(100),
    issues: z.array(z.string()),
  }),
});

// ── Debate ──
export const startDebateSchema = z.object({
  ...baseFields,
  workflowId: z.string().min(1),
  topic: z.string().min(1),
});

export const addOpinionSchema = z.object({
  ...baseFields,
  debateId: z.string().min(1),
  expertRole: z.string().min(1),
  stance: z.enum(['Support', 'Oppose', 'Neutral']),
  argument: z.string().min(1),
  evidence: z.array(z.string()).optional(),
});

export const resolveDebateSchema = z.object({
  ...baseFields,
  debateId: z.string().min(1),
  finalRecommendation: z.string().min(1),
  resolvedBy: z.enum(['Consensus', 'ChiefDesignOfficer', 'CEO']),
});

// ── Decision ──
export const makeDecisionSchema = z.object({
  ...baseFields,
  workflowId: z.string().min(1).optional(),
  topic: z.string().min(1),
  rationale: z.string().min(1),
  decisionBy: z.enum(['CEO', 'ProjectManager', 'AgencyOrchestrator', 'MemoryManager', 'QualityDirector', 'ReleaseDirector']),
});

// ── Memory ──
export const storeMemorySchema = z.object({
  ...baseFields,
  category: z.enum(['SuccessPattern', 'FailurePattern', 'Tradeoff', 'IndustryRule', 'ConversionRule']),
  pattern: z.string().min(1),
  trigger: z.string().min(1),
  outcome: z.string().min(1),
  evidence: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).default(0.5),
});

export const memoryQuerySchema = z.object({
  tenantId: z.string().min(1),
  organizationId: z.string().min(1),
  category: z.enum(['SuccessPattern', 'FailurePattern', 'Tradeoff', 'IndustryRule', 'ConversionRule']).optional(),
});

// ── Report ──
export const generateReportSchema = z.object({
  ...baseFields,
  workflowId: z.string().min(1),
  reportType: z.enum(['Execution', 'SwarmCollaboration', 'DebateSummary', 'DecisionLog', 'ExecutiveMemory', 'LearningEvolution']),
});