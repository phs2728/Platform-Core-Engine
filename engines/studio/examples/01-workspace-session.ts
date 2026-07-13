/**
 * Example 01 — Studio Workspace + BuildSession
 *
 * Sprint D: Studio manages process (workspace, session).
 * Theme/Component are read-only references.
 */
import { makeDemoDeps, unwrap, base } from './_helpers.js';
import {
  createWorkspaceUseCase, startBuildSessionUseCase, attachComponentLibraryUseCase,
  listWorkspacesUseCase,
} from '../src/index.js';

async function main() {
  const deps = makeDemoDeps();

  console.log('▶ Step 1: Create Workspace (read-only Theme ref)');
  const workspaceId = unwrap(await createWorkspaceUseCase({
    ...base, name: 'Aman Studio', slug: 'aman-studio', defaultThemeRef: 'theme-luxury',
  }, deps)).workspaceId;
  console.log(`  Workspace ID: ${workspaceId}`);
  console.log(`  Default theme: theme-luxury (read-only ref)`);

  console.log('▶ Step 2: Start Build Session (read-only Theme + Component library)');
  const sessionId = unwrap(await startBuildSessionUseCase({
    ...base, workspaceId, themeRef: 'theme-luxury', componentRefs: ['hero-exp', 'cta-btn'],
  }, deps)).sessionId;
  console.log(`  Session ID: ${sessionId}`);
  console.log(`  Theme: theme-luxury (read-only)`);
  console.log(`  Component Library: hero-exp, cta-btn (read-only)`);

  console.log('▶ Step 3: List Workspaces');
  const ws = unwrap(await listWorkspacesUseCase('demo', 'org-demo', deps));
  console.log(`  Workspace count: ${ws.length}`);

  console.log('\n✓ Workspace + BuildSession Example Complete');
  console.log('  Studio owns: Workspace, BuildSession');
  console.log('  Read-only: themeRef, componentRefs (verified via readers)');
}

main().catch((err) => { console.error('✗ Example failed:', err); process.exit(1); });