/**
 * Example 01 — Full Agency Workflow (E2E)
 *
 * Agency OS RC1: AI Digital Agency Operating System
 * Workflow: initiate → swarm → task → debate → decide → release
 */
import { makeDemoDeps, unwrap, base } from './_helpers.js';
import {
  initiateWorkflowUseCase, advanceWorkflowPhaseUseCase, getWorkflowUseCase,
  createSwarmUseCase, createTaskUseCase, executeTaskUseCase,
  startDebateUseCase, resolveDebateUseCase,
  makeDecisionUseCase, generateReportUseCase,
} from '../src/index.js';
import { AGENCY_FIRST_PRINCIPLE } from '@platform/core-sdk';

async function main() {
  const deps = makeDemoDeps();

  console.log('▶ Agency First Principle:');
  console.log(`  "${AGENCY_FIRST_PRINCIPLE.substring(0, 80)}..."`);

  console.log('\n▶ Step 1: Initiate Hotel Website Workflow');
  const wfId = unwrap(await initiateWorkflowUseCase({
    ...base, name: 'Aman Tokyo Launch', templateType: 'LaunchHotelWebsite',
  }, deps)).workflowId;
  console.log(`  Workflow ID: ${wfId}`);

  console.log('\n▶ Step 2: Advance to SwarmCreation');
  await advanceWorkflowPhaseUseCase({ ...base, workflowId: wfId }, deps);

  console.log('▶ Step 3: Create 5 Swarms');
  for (const type of ['Research', 'Creative', 'UX', 'Engineering', 'QA'] as const) {
    const r = unwrap(await createSwarmUseCase({ ...base, workflowId: wfId, type }, deps));
    console.log(`  ${type}: ${r.specialistCount} specialists, leader=${r.type}`);
  }

  console.log('\n▶ Step 4: Create + Execute Tasks');
  const taskId = unwrap(await createTaskUseCase({
    ...base, workflowId: wfId, swarmType: 'Research', title: 'Customer Research', description: 'Target customer analysis',
  }, deps)).taskId;
  const exec = unwrap(await executeTaskUseCase({ ...base, taskId }, deps));
  console.log(`  Task executed: confidence=${exec.confidence}`);

  console.log('\n▶ Step 5: Expert Debate');
  await advanceWorkflowPhaseUseCase({ ...base, workflowId: wfId }, deps); // ParallelExecution
  await advanceWorkflowPhaseUseCase({ ...base, workflowId: wfId }, deps); // Debate
  const debateId = unwrap(await startDebateUseCase({ ...base, workflowId: wfId, topic: 'Theme: Luxury vs Modern' }, deps)).debateId;
  console.log(`  Debate started: 6 expert opinions generated`);
  const resolved = unwrap(await resolveDebateUseCase({ ...base, debateId, finalRecommendation: 'Luxury — Brand alignment', resolvedBy: 'ChiefDesignOfficer' }, deps));
  console.log(`  Resolved: "${resolved.recommendation}" by ${resolved.resolvedBy}`);

  console.log('\n▶ Step 6: Executive Decision (Agency First Principle)');
  const decision = unwrap(await makeDecisionUseCase({
    ...base, workflowId: wfId, topic: 'Final Design Approval',
    rationale: 'All 6 gates passed', decisionBy: 'CEO',
  }, deps));
  console.log(`  All Gates Passed: ${decision.allGatesPassed}`);
  console.log(`  Failed Gates: ${decision.failedGates.length}`);

  console.log('\n▶ Step 7: Advance to Release');
  for (let i = 0; i < 6; i++) await advanceWorkflowPhaseUseCase({ ...base, workflowId: wfId }, deps);
  const wf = unwrap(await getWorkflowUseCase('demo', wfId, deps));
  console.log(`  Status: ${wf.status}`);
  console.log(`  Phase: ${wf.currentPhase}`);

  console.log('\n▶ Step 8: Generate Execution Report');
  const report = unwrap(await generateReportUseCase({ ...base, workflowId: wfId, reportType: 'Execution' }, deps));
  console.log(`  Report: ${report.summary}`);

  console.log('\n✓ Agency OS E2E Example Complete');
  console.log('  Platform = AI Digital Agency Operating System');
  console.log('  Not Website Builder; IS Human Decision Experience Platform');
}

main().catch((err) => { console.error('✗ Example failed:', err); process.exit(1); });