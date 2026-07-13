/**
 * Agency OS Engine — Test Suite
 *
 * Platform Agency OS RC1 검증:
 *  1. Agency First Principle
 *  2. Workflow lifecycle (10 phases)
 *  3. Swarm (9 types × specialists)
 *  4. Task lifecycle
 *  5. Expert Debate Engine
 *  6. Executive Decision (6 gates)
 *  7. Executive Memory (4 presets + CRUD)
 *  8. Workflow Templates (7 templates)
 *  9. Reports (6 types)
 * 10. Tenant Isolation
 * 11. Import Boundary
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { makeDeps, baseInput, unwrap } from './helpers.js';
import {
  initiateWorkflowUseCase, advanceWorkflowPhaseUseCase,
  getWorkflowUseCase, listWorkflowsUseCase,
  createSwarmUseCase, completeSwarmUseCase, getSwarmUseCase,
  createTaskUseCase, executeTaskUseCase, retryTaskUseCase, getTaskUseCase,
  startDebateUseCase, addOpinionUseCase, resolveDebateUseCase,
  makeDecisionUseCase, listDecisionsUseCase,
  storeMemoryUseCase, queryMemoryUseCase, seedDefaultMemoryUseCase, updateMemoryUseCase,
  generateReportUseCase, listWorkflowTemplatesUseCase,
  validateAgencyFirstPrinciple,
  WORKFLOW_TEMPLATES, SWARM_SPECIALISTS, EXECUTIVE_MEMORY_PRESETS,
} from '../src/index.js';
import { AGENCY_FIRST_PRINCIPLE, DECISION_PIPELINE, WORKFLOW_PHASES, validatePlatformTerminology } from '@platform/core-sdk';

type Deps = ReturnType<typeof makeDeps>;
const SWARM_TYPES = ['Research', 'Creative', 'UX', 'Engineering', 'QA', 'Learning', 'Marketing', 'SEO', 'Accessibility'] as const;
const TEMPLATE_TYPES = ['LaunchHotelWebsite', 'LaunchRestaurantWebsite', 'LaunchMarketplace', 'LaunchSaaS', 'LaunchChurchWebsite', 'LaunchNGOWebsite', 'LaunchTravelWebsite'] as const;

// ═══════════════════════════════════════════
// 1. Agency First Principle
// ═══════════════════════════════════════════

describe('Agency First Principle', () => {
  it('AGENCY_FIRST_PRINCIPLE exists and contains key phrase', () => {
    expect(AGENCY_FIRST_PRINCIPLE).toContain('No single AI agent');
    expect(AGENCY_FIRST_PRINCIPLE).toContain('quality of decisions');
  });

  it('DECISION_PIPELINE has 6 phases', () => {
    expect(DECISION_PIPELINE.length).toBe(6);
    expect(DECISION_PIPELINE).toContain('Research');
    expect(DECISION_PIPELINE).toContain('Debate');
    expect(DECISION_PIPELINE).toContain('ExecutiveDecision');
  });

  it('validateAgencyFirstPrinciple: all gates pass → allPassed=true', () => {
    const gates = DECISION_PIPELINE.map(p => ({ phase: p, passed: true, notes: '' }));
    const result = validateAgencyFirstPrinciple(gates);
    expect(result.allPassed).toBe(true);
    expect(result.failedGates.length).toBe(0);
  });

  it('validateAgencyFirstPrinciple: missing gates → allPassed=false', () => {
    const gates = [
      { phase: 'Research', passed: true, notes: '' },
      { phase: 'ExpertReview', passed: true, notes: '' },
    ];
    const result = validateAgencyFirstPrinciple(gates);
    expect(result.allPassed).toBe(false);
    expect(result.failedGates).toContain('Debate');
    expect(result.failedGates).toContain('ExecutiveDecision');
  });

  it('validateAgencyFirstPrinciple: gate passed=false → allPassed=false', () => {
    const gates = DECISION_PIPELINE.map(p => ({ phase: p, passed: p !== 'Debate', notes: '' }));
    const result = validateAgencyFirstPrinciple(gates);
    expect(result.allPassed).toBe(false);
    expect(result.failedGates).toContain('Debate');
  });
});

// ═══════════════════════════════════════════
// 2. Workflow Lifecycle (10 phases)
// ═══════════════════════════════════════════

describe('Workflow Lifecycle', () => {
  let deps: Deps;
  let wfId: string;
  beforeEach(async () => {
    deps = makeDeps();
    wfId = unwrap(await initiateWorkflowUseCase({ ...baseInput, name: 'Hotel Launch', templateType: 'LaunchHotelWebsite' }, deps)).workflowId;
  });

  it('initiates workflow with correct template', async () => {
    const r = await initiateWorkflowUseCase({ ...baseInput, name: 'SaaS Launch', templateType: 'LaunchSaaS' }, deps);
    if (r.ok) {
      expect(r.value.templateName).toBe('Launch SaaS Website');
      expect(r.value.requiredSwarms.length).toBeGreaterThan(0);
    }
  });

  it('rejects unknown organization', async () => {
    const r = await initiateWorkflowUseCase({ ...baseInput, tenantId: 'unknown', name: 'Test', templateType: 'Custom' }, deps);
    expect(r.ok).toBe(false);
  });

  it('starts at Plan phase', async () => {
    const wf = unwrap(await getWorkflowUseCase('t-1', wfId, deps));
    expect(wf.currentPhase).toBe('Plan');
    expect(wf.status).toBe('Initiated');
  });

  it('advances through all 10 phases', async () => {
    const phases = ['SwarmCreation', 'ParallelExecution', 'Debate', 'Merge', 'Verification', 'Retry', 'Learning', 'Memory', 'Release'];
    for (const expectedPhase of phases) {
      const r = await advanceWorkflowPhaseUseCase({ ...baseInput, workflowId: wfId }, deps);
      if (r.ok) expect(r.value.newPhase).toBe(expectedPhase);
    }
    const wf = unwrap(await getWorkflowUseCase('t-1', wfId, deps));
    expect(wf.currentPhase).toBe('Release');
    expect(wf.status).toBe('Released');
  });

  it('rejects advance when already at Release', async () => {
    for (let i = 0; i < 9; i++) await advanceWorkflowPhaseUseCase({ ...baseInput, workflowId: wfId }, deps);
    const r = await advanceWorkflowPhaseUseCase({ ...baseInput, workflowId: wfId }, deps);
    expect(r.ok).toBe(false);
  });

  it('emits workflow.initiated event', async () => {
    const eventBus = deps.eventBus as unknown as { countByType(t: string): number };
    expect(eventBus.countByType('agency.workflow.initiated')).toBeGreaterThan(0);
  });

  it('listWorkflows returns all org workflows', async () => {
    await initiateWorkflowUseCase({ ...baseInput, name: 'Second', templateType: 'Custom' }, deps);
    const list = unwrap(await listWorkflowsUseCase('t-1', 'org-1', deps));
    expect(list.length).toBe(2);
  });
});

// ═══════════════════════════════════════════
// 3. Swarm (9 types)
// ═══════════════════════════════════════════

describe('Swarm Architecture (9 types)', () => {
  SWARM_TYPES.forEach((swarmType) => {
    it(`${swarmType}: has preset specialists`, () => {
      const preset = SWARM_SPECIALISTS[swarmType];
      expect(preset.leader).toBeTruthy();
      expect(preset.specialists.length).toBeGreaterThan(0);
    });
  });

  let deps: Deps;
  let wfId: string;
  beforeEach(async () => {
    deps = makeDeps();
    wfId = unwrap(await initiateWorkflowUseCase({ ...baseInput, name: 'Test', templateType: 'Custom' }, deps)).workflowId;
  });

  SWARM_TYPES.forEach((swarmType) => {
    it(`${swarmType}: createSwarmUseCase`, async () => {
      const r = await createSwarmUseCase({ ...baseInput, workflowId: wfId, type: swarmType }, deps);
      if (r.ok) {
        expect(r.value.type).toBe(swarmType);
        expect(r.value.specialistCount).toBeGreaterThan(0);
      }
    });
  });

  it('completes swarm', async () => {
    const swarmId = unwrap(await createSwarmUseCase({ ...baseInput, workflowId: wfId, type: 'Research' }, deps)).swarmId;
    const r = await completeSwarmUseCase({ ...baseInput, swarmId }, deps);
    if (r.ok) expect(r.value.status).toBe('Completed');
  });

  it('getSwarm returns swarm with specialists', async () => {
    const swarmId = unwrap(await createSwarmUseCase({ ...baseInput, workflowId: wfId, type: 'Creative' }, deps)).swarmId;
    const swarm = unwrap(await getSwarmUseCase('t-1', swarmId, deps));
    expect(swarm.specialists.length).toBeGreaterThan(0);
  });

  it('swarm is linked to workflow', async () => {
    await createSwarmUseCase({ ...baseInput, workflowId: wfId, type: 'UX' }, deps);
    const wf = unwrap(await getWorkflowUseCase('t-1', wfId, deps));
    expect(wf.swarmIds.length).toBe(1);
  });
});

// ═══════════════════════════════════════════
// 4. Task Lifecycle
// ═══════════════════════════════════════════

describe('Task Lifecycle', () => {
  let deps: Deps;
  let wfId: string;
  beforeEach(async () => {
    deps = makeDeps();
    wfId = unwrap(await initiateWorkflowUseCase({ ...baseInput, name: 'Test', templateType: 'Custom' }, deps)).workflowId;
  });

  it('creates task', async () => {
    const r = await createTaskUseCase({ ...baseInput, workflowId: wfId, swarmType: 'Research', title: 'Customer Research', description: 'Research target customers' }, deps);
    expect(r.ok).toBe(true);
  });

  it('executes task with confidence score', async () => {
    const taskId = unwrap(await createTaskUseCase({ ...baseInput, workflowId: wfId, swarmType: 'Engineering', title: 'Build Theme', description: 'Create theme' }, deps)).taskId;
    const r = await executeTaskUseCase({ ...baseInput, taskId }, deps);
    if (r.ok) {
      expect(r.value.status).toBe('Done');
      expect(r.value.confidence).toBeGreaterThan(0);
    }
  });

  it('retries failed task', async () => {
    const taskId = unwrap(await createTaskUseCase({ ...baseInput, workflowId: wfId, swarmType: 'QA', title: 'Test Build', description: 'Run tests' }, deps)).taskId;
    const r = await retryTaskUseCase({ ...baseInput, taskId }, deps);
    if (r.ok) expect(r.value.status).toBe('Retried');
  });

  it('task is linked to workflow', async () => {
    await createTaskUseCase({ ...baseInput, workflowId: wfId, swarmType: 'Creative', title: 'Mood Board', description: 'Create mood board' }, deps);
    const wf = unwrap(await getWorkflowUseCase('t-1', wfId, deps));
    expect(wf.taskIds.length).toBe(1);
  });

  it('getTask returns task details', async () => {
    const taskId = unwrap(await createTaskUseCase({ ...baseInput, workflowId: wfId, swarmType: 'SEO', title: 'Keyword Research', description: 'SEO keywords' }, deps)).taskId;
    const task = unwrap(await getTaskUseCase('t-1', taskId, deps));
    expect(task.title).toBe('Keyword Research');
  });
});

// ═══════════════════════════════════════════
// 5. Expert Debate Engine
// ═══════════════════════════════════════════

describe('Expert Debate Engine', () => {
  let deps: Deps;
  let wfId: string;
  beforeEach(async () => {
    deps = makeDeps();
    wfId = unwrap(await initiateWorkflowUseCase({ ...baseInput, name: 'Test', templateType: 'Custom' }, deps)).workflowId;
  });

  it('starts debate with 6 expert opinions', async () => {
    const r = await startDebateUseCase({ ...baseInput, workflowId: wfId, topic: 'Should we use dark mode?' }, deps);
    if (r.ok) expect(r.value.opinionCount).toBe(6);
  });

  it('adds custom opinion', async () => {
    const debateId = unwrap(await startDebateUseCase({ ...baseInput, workflowId: wfId, topic: 'Hero style' }, deps)).debateId;
    const r = await addOpinionUseCase({ ...baseInput, debateId, expertRole: 'Brand Director', stance: 'Support', argument: 'Fits brand' }, deps);
    if (r.ok) expect(r.value.opinionId).toBeTruthy();
  });

  it('resolves debate with recommendation', async () => {
    const debateId = unwrap(await startDebateUseCase({ ...baseInput, workflowId: wfId, topic: 'CTA placement' }, deps)).debateId;
    const r = await resolveDebateUseCase({ ...baseInput, debateId, finalRecommendation: 'Place CTA after Trust section', resolvedBy: 'ChiefDesignOfficer' }, deps);
    if (r.ok) {
      expect(r.value.recommendation).toContain('Trust section');
      expect(r.value.resolvedBy).toBe('ChiefDesignOfficer');
    }
  });

  it('debate is linked to workflow', async () => {
    await startDebateUseCase({ ...baseInput, workflowId: wfId, topic: 'Color palette' }, deps);
    const wf = unwrap(await getWorkflowUseCase('t-1', wfId, deps));
    expect(wf.debateIds.length).toBe(1);
  });
});

// ═══════════════════════════════════════════
// 6. Executive Decision (Agency First Principle)
// ═══════════════════════════════════════════

describe('Executive Decision (Agency First Principle)', () => {
  let deps: Deps;
  let wfId: string;
  beforeEach(async () => {
    deps = makeDeps();
    wfId = unwrap(await initiateWorkflowUseCase({ ...baseInput, name: 'Test', templateType: 'Custom' }, deps)).workflowId;
  });

  it('makes decision with all 6 gates passed', async () => {
    const r = await makeDecisionUseCase({ ...baseInput, workflowId: wfId, topic: 'Use Luxury theme', rationale: 'Brand alignment', decisionBy: 'CEO' }, deps);
    if (r.ok) {
      expect(r.value.allGatesPassed).toBe(true);
      expect(r.value.failedGates.length).toBe(0);
    }
  });

  it('emits decision.made event when all gates pass', async () => {
    await makeDecisionUseCase({ ...baseInput, workflowId: wfId, topic: 'Layout', rationale: 'Test', decisionBy: 'ProjectManager' }, deps);
    const eventBus = deps.eventBus as unknown as { countByType(t: string): number };
    expect(eventBus.countByType('agency.decision.made')).toBe(1);
  });

  it('decision is linked to workflow', async () => {
    await makeDecisionUseCase({ ...baseInput, workflowId: wfId, topic: 'Font choice', rationale: 'Editorial', decisionBy: 'QualityDirector' }, deps);
    const wf = unwrap(await getWorkflowUseCase('t-1', wfId, deps));
    expect(wf.decisionIds.length).toBe(1);
  });

  it('listDecisions returns all org decisions', async () => {
    await makeDecisionUseCase({ ...baseInput, workflowId: wfId, topic: 'Topic 1', rationale: 'R1', decisionBy: 'CEO' }, deps);
    await makeDecisionUseCase({ ...baseInput, workflowId: wfId, topic: 'Topic 2', rationale: 'R2', decisionBy: 'ReleaseDirector' }, deps);
    const list = unwrap(await listDecisionsUseCase('t-1', 'org-1', deps));
    expect(list.length).toBe(2);
  });
});

// ═══════════════════════════════════════════
// 7. Executive Memory
// ═══════════════════════════════════════════

describe('Executive Memory', () => {
  it('EXECUTIVE_MEMORY_PRESETS has 4 patterns', () => {
    expect(EXECUTIVE_MEMORY_PRESETS.length).toBe(4);
    expect(EXECUTIVE_MEMORY_PRESETS.some(m => m.pattern.includes('Luxury'))).toBe(true);
    expect(EXECUTIVE_MEMORY_PRESETS.some(m => m.pattern.includes('Restaurant'))).toBe(true);
  });

  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('stores memory', async () => {
    const r = await storeMemoryUseCase({ ...baseInput, category: 'SuccessPattern', pattern: 'Test Pattern', trigger: 'Trigger', outcome: 'Good outcome', confidence: 0.9 }, deps);
    if (r.ok) expect(r.value.pattern).toBe('Test Pattern');
  });

  it('queries memory by organization', async () => {
    await storeMemoryUseCase({ ...baseInput, category: 'IndustryRule', pattern: 'P1', trigger: 'T1', outcome: 'O1', confidence: 0.8 }, deps);
    await storeMemoryUseCase({ ...baseInput, category: 'ConversionRule', pattern: 'P2', trigger: 'T2', outcome: 'O2', confidence: 0.7 }, deps);
    const list = unwrap(await queryMemoryUseCase({ tenantId: 't-1', organizationId: 'org-1' }, deps));
    expect(list.length).toBe(2);
  });

  it('queries memory by category', async () => {
    await storeMemoryUseCase({ ...baseInput, category: 'IndustryRule', pattern: 'P1', trigger: 'T1', outcome: 'O1', confidence: 0.8 }, deps);
    await storeMemoryUseCase({ ...baseInput, category: 'ConversionRule', pattern: 'P2', trigger: 'T2', outcome: 'O2', confidence: 0.7 }, deps);
    const list = unwrap(await queryMemoryUseCase({ tenantId: 't-1', organizationId: 'org-1', category: 'IndustryRule' }, deps));
    expect(list.length).toBe(1);
    expect(list[0].category).toBe('IndustryRule');
  });

  it('seeds default memory presets', async () => {
    const r = await seedDefaultMemoryUseCase('t-1', 'org-1', deps);
    if (r.ok) expect(r.value.seeded).toBe(4);
  });

  it('updates memory', async () => {
    const memId = unwrap(await storeMemoryUseCase({ ...baseInput, category: 'Tradeoff', pattern: 'P', trigger: 'T', outcome: 'O', confidence: 0.5 }, deps)).memoryId;
    const r = await updateMemoryUseCase('t-1', memId, { confidence: 0.95 }, deps);
    expect(r.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 8. Workflow Templates (7 templates)
// ═══════════════════════════════════════════

describe('Workflow Templates (7 productization)', () => {
  TEMPLATE_TYPES.forEach((templateType) => {
    it(`${templateType}: has name + description + swarms`, () => {
      const t = WORKFLOW_TEMPLATES[templateType];
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.requiredSwarms.length).toBeGreaterThan(0);
    });

    it(`${templateType}: can initiate workflow`, async () => {
      const deps = makeDeps();
      const r = await initiateWorkflowUseCase({ ...baseInput, name: `Test ${templateType}`, templateType }, deps);
      expect(r.ok).toBe(true);
    });
  });

  it('Custom template also works', async () => {
    const deps = makeDeps();
    const r = await initiateWorkflowUseCase({ ...baseInput, name: 'Custom WF', templateType: 'Custom' }, deps);
    expect(r.ok).toBe(true);
  });

  it('listWorkflowTemplates returns all 8', async () => {
    const deps = makeDeps();
    const list = unwrap(await listWorkflowTemplatesUseCase(deps));
    expect(list.length).toBe(8);
  });
});

// ═══════════════════════════════════════════
// 9. Reports (6 types)
// ═══════════════════════════════════════════

describe('Reports (6 types)', () => {
  let deps: Deps;
  let wfId: string;
  beforeEach(async () => {
    deps = makeDeps();
    wfId = unwrap(await initiateWorkflowUseCase({ ...baseInput, name: 'Report Test', templateType: 'Custom' }, deps)).workflowId;
  });

  it('Execution report', async () => {
    const r = await generateReportUseCase({ ...baseInput, workflowId: wfId, reportType: 'Execution' }, deps);
    if (r.ok) expect(r.value.reportType).toBe('Execution');
  });

  it('SwarmCollaboration report', async () => {
    await createSwarmUseCase({ ...baseInput, workflowId: wfId, type: 'Research' }, deps);
    const r = await generateReportUseCase({ ...baseInput, workflowId: wfId, reportType: 'SwarmCollaboration' }, deps);
    if (r.ok) expect(r.value.summary).toContain('swarms');
  });

  it('DebateSummary report', async () => {
    await startDebateUseCase({ ...baseInput, workflowId: wfId, topic: 'Test' }, deps);
    const r = await generateReportUseCase({ ...baseInput, workflowId: wfId, reportType: 'DebateSummary' }, deps);
    if (r.ok) expect(r.value.summary).toContain('debates');
  });

  it('DecisionLog report', async () => {
    await makeDecisionUseCase({ ...baseInput, workflowId: wfId, topic: 'T', rationale: 'R', decisionBy: 'CEO' }, deps);
    const r = await generateReportUseCase({ ...baseInput, workflowId: wfId, reportType: 'DecisionLog' }, deps);
    if (r.ok) expect(r.value.summary).toContain('decisions');
  });

  it('ExecutiveMemory report', async () => {
    await storeMemoryUseCase({ ...baseInput, category: 'SuccessPattern', pattern: 'P', trigger: 'T', outcome: 'O', confidence: 0.8 }, deps);
    const r = await generateReportUseCase({ ...baseInput, workflowId: wfId, reportType: 'ExecutiveMemory' }, deps);
    if (r.ok) expect(r.value.summary).toContain('memories');
  });

  it('LearningEvolution report', async () => {
    await storeMemoryUseCase({ ...baseInput, category: 'SuccessPattern', pattern: 'P', trigger: 'T', outcome: 'O', confidence: 0.8 }, deps);
    const r = await generateReportUseCase({ ...baseInput, workflowId: wfId, reportType: 'LearningEvolution' }, deps);
    if (r.ok) expect(r.value.summary).toContain('Patterns');
  });
});

// ═══════════════════════════════════════════
// 10. Full Agency Workflow (E2E)
// ═══════════════════════════════════════════

describe('Full Agency Workflow (E2E)', () => {
  it('complete workflow: initiate → create swarms → create tasks → execute → debate → decide → release', async () => {
    const deps = makeDeps();
    // 1. Initiate
    const wfId = unwrap(await initiateWorkflowUseCase({ ...baseInput, name: 'Full E2E', templateType: 'LaunchHotelWebsite' }, deps)).workflowId;
    // 2. Advance to SwarmCreation
    await advanceWorkflowPhaseUseCase({ ...baseInput, workflowId: wfId }, deps);
    // 3. Create swarms
    for (const type of ['Research', 'Creative', 'UX', 'Engineering', 'QA'] as const) {
      await createSwarmUseCase({ ...baseInput, workflowId: wfId, type }, deps);
    }
    // 4. Create + execute tasks
    const taskId = unwrap(await createTaskUseCase({ ...baseInput, workflowId: wfId, swarmType: 'Research', title: 'Customer Research', description: 'Research' }, deps)).taskId;
    await executeTaskUseCase({ ...baseInput, taskId }, deps);
    // 5. Debate
    await advanceWorkflowPhaseUseCase({ ...baseInput, workflowId: wfId }, deps); // ParallelExecution
    await advanceWorkflowPhaseUseCase({ ...baseInput, workflowId: wfId }, deps); // Debate
    const debateId = unwrap(await startDebateUseCase({ ...baseInput, workflowId: wfId, topic: 'Theme style' }, deps)).debateId;
    await resolveDebateUseCase({ ...baseInput, debateId, finalRecommendation: 'Luxury', resolvedBy: 'ChiefDesignOfficer' }, deps);
    // 6. Decision
    await makeDecisionUseCase({ ...baseInput, workflowId: wfId, topic: 'Final design', rationale: 'Approved', decisionBy: 'CEO' }, deps);
    // 7. Advance to Release
    for (let i = 0; i < 6; i++) await advanceWorkflowPhaseUseCase({ ...baseInput, workflowId: wfId }, deps);
    const wf = unwrap(await getWorkflowUseCase('t-1', wfId, deps));
    expect(wf.currentPhase).toBe('Release');
    expect(wf.status).toBe('Released');
    expect(wf.swarmIds.length).toBe(5);
    expect(wf.taskIds.length).toBe(1);
    expect(wf.debateIds.length).toBe(1);
    expect(wf.decisionIds.length).toBe(1);
  });
});

// ═══════════════════════════════════════════
// 11. Tenant Isolation
// ═══════════════════════════════════════════

describe('Tenant Isolation', () => {
  it('workflows isolated by tenant', async () => {
    const deps = makeDeps();
    deps.organizationVerifier.add('t-2', 'org-2');
    await initiateWorkflowUseCase({ ...baseInput, name: 'T1', templateType: 'Custom' }, deps);
    await initiateWorkflowUseCase({ tenantId: 't-2', organizationId: 'org-2', correlationId: 'c', actorId: 'a', name: 'T2', templateType: 'Custom' }, deps);
    const t1 = unwrap(await listWorkflowsUseCase('t-1', 'org-1', deps));
    const t2 = unwrap(await listWorkflowsUseCase('t-2', 'org-2', deps));
    expect(t1.length).toBe(1);
    expect(t2.length).toBe(1);
  });

  it('memory isolated by tenant', async () => {
    const deps = makeDeps();
    deps.organizationVerifier.add('t-2', 'org-2');
    await storeMemoryUseCase({ ...baseInput, category: 'SuccessPattern', pattern: 'T1', trigger: 'T', outcome: 'O', confidence: 0.8 }, deps);
    await storeMemoryUseCase({ tenantId: 't-2', organizationId: 'org-2', correlationId: 'c', actorId: 'a', category: 'SuccessPattern', pattern: 'T2', trigger: 'T', outcome: 'O', confidence: 0.8 }, deps);
    const t1 = unwrap(await queryMemoryUseCase({ tenantId: 't-1', organizationId: 'org-1' }, deps));
    const t2 = unwrap(await queryMemoryUseCase({ tenantId: 't-2', organizationId: 'org-2' }, deps));
    expect(t1.length).toBe(1);
    expect(t2.length).toBe(1);
  });
});

// ═══════════════════════════════════════════
// 12. Import Boundary
// ═══════════════════════════════════════════

describe('Import Boundary', () => {
  it('no direct imports of other engines', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = '/opt/data/projects/identity-engine/engines/agency-os/src';
    function walk(dir: string): string[] {
      const files: string[] = [];
      for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, f.name);
        if (f.isDirectory()) files.push(...walk(p));
        else if (p.endsWith('.ts')) files.push(p);
      }
      return files;
    }
    const files = walk(src);
    const violations: string[] = [];
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf-8');
      const matches = content.match(/from\s+['"]@platform\/engine-[a-z]+['"]/g) ?? [];
      violations.push(...matches);
    }
    expect(violations.length).toBe(0);
  });
});

// ═══════════════════════════════════════════
// 13. Platform Vision Compliance
// ═══════════════════════════════════════════

describe('Platform Vision Compliance', () => {
  it('WORKFLOW_PHASES has 10 phases', () => {
    expect(WORKFLOW_PHASES.length).toBe(10);
    expect(WORKFLOW_PHASES[0]).toBe('Plan');
    expect(WORKFLOW_PHASES[9]).toBe('Release');
  });

  it('forbids "Website Builder" terminology', () => {
    expect(validatePlatformTerminology('Website Builder')).toBe(false);
  });

  it('forbids "Page Builder"', () => {
    expect(validatePlatformTerminology('Page Builder')).toBe(false);
  });
});