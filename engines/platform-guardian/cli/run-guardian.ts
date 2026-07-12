#!/usr/bin/env tsx
/**
 * Platform Guardian — CLI: Full Guardian Scan
 *
 * Usage: pnpm guardian:scan
 *
 * Runs the full Guardian audit and prints the decision.
 * Also generates all 5 Guardian reports.
 */

import {
  InMemoryInputProvider,
  InMemoryGuardianReportWriter,
  runFullGuardianScanWithReportsUseCase,
} from '../src/index.js';
import type { GuardianInput } from '../src/index.js';

// This CLI expects GuardianInput to be passed via stdin (JSON) or
// collected from the Compatibility Suite's result store.
// For now, it reads from a JSON file passed as argument.

import { readFileSync } from 'node:fs';

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Platform Guardian — CTO-Level Platform Audit');
  console.log('═══════════════════════════════════════════════════\n');

  // Read input from file or use empty default
  let input: GuardianInput;
  const inputFile = process.argv[2];
  if (inputFile) {
    try {
      input = JSON.parse(readFileSync(inputFile, 'utf-8')) as GuardianInput;
    } catch {
      console.error(`Failed to read input file: ${inputFile}`);
      process.exit(1);
    }
  } else {
    console.log('  ⚠️  No input file provided. Usage: pnpm guardian:scan <input.json>');
    console.log('  Alternatively, run the Compatibility Suite first and pipe results.\n');
    process.exit(1);
  }

  const provider = new InMemoryInputProvider(input);
  const writer = new InMemoryGuardianReportWriter();

  const deps = { inputProvider: provider, reportWriter: writer };

  console.log('  ⏳ Running Guardian analysis...\n');

  const result = await runFullGuardianScanWithReportsUseCase(deps);
  if (!result.ok) {
    console.error('  ❌ Guardian scan failed:', result.error);
    process.exit(1);
  }

  const { audit } = result.value;

  // Print decision
  const d = audit.decision;
  const icon = d.decision === 'APPROVED' ? '✅'
    : d.decision === 'APPROVED_WITH_CONDITIONS' ? '⚠️'
    : d.decision === 'REVIEW_REQUIRED' ? '🔍'
    : '❌';

  console.log(`  ${icon} Guardian Decision: ${d.decision}`);
  console.log(`  Can Merge: ${d.canMerge ? 'YES' : 'NO'}\n`);

  console.log('  ┌─────────────────────────────────────────────┐');
  console.log('  │            GUARDIAN SCORE                    │');
  console.log('  ├─────────────────────────────────────────────┤');
  console.log(`  │  Grade:          ${(audit.score.grade).padEnd(25)}│`);
  console.log(`  │  Overall:        ${(audit.score.overall + '/100').padEnd(25)}│`);
  console.log(`  │  Architecture:   ${(audit.score.architectureScore + '/100').padEnd(25)}│`);
  console.log(`  │  Compatibility:  ${(audit.score.compatibilityScore + '/100').padEnd(25)}│`);
  console.log(`  │  Maintainability:${(audit.score.maintainabilityScore + '/100').padEnd(25)}│`);
  console.log(`  │  Security:       ${(audit.score.securityScore + '/100').padEnd(25)}│`);
  console.log(`  │  Performance:    ${(audit.score.performanceScore + '/100').padEnd(25)}│`);
  console.log(`  │  Contracts:      ${(audit.score.contractScore + '/100').padEnd(25)}│`);
  console.log('  └─────────────────────────────────────────────┘');
  console.log('');

  console.log(`  Risk: ${audit.risk.overallRisk} (${audit.risk.riskScore}/100) — ${audit.risk.risks.length} items`);
  console.log(`  Tech Debt: ${audit.technicalDebt.totalDebtItems} items (score: ${audit.technicalDebt.debtScore}/100)`);
  console.log(`  Roadmap: ${audit.roadmap.recommendations.length} recommendations\n`);

  if (d.blockers.length > 0) {
    console.log('  ❌ BLOCKERS:');
    for (const b of d.blockers) {
      console.log(`    • ${b}`);
    }
    console.log('');
  }

  if (d.conditions.length > 0) {
    console.log('  ⚠️ CONDITIONS:');
    for (const c of d.conditions) {
      console.log(`    • ${c.description}`);
    }
    console.log('');
  }

  console.log(`  📄 Reports: ${result.value.reports.join(', ')}`);
  console.log('');

  if (d.canMerge) {
    console.log('  ✅ Platform Guardian APPROVES this merge.');
    process.exit(0);
  } else {
    console.log('  ❌ Platform Guardian BLOCKS this merge.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
