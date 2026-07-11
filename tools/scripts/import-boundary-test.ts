/**
 * Import Boundary Test (헌법 §C-20 SDK Stability Rule 검증)
 *
 * 사장님 Platform Owner 확립 (2026-07-11):
 * "Core SDK는 어떤 Engine도 참조하면 안 됩니다.
 *  이 테스트를 자동화하세요."
 *
 * Core SDK
 *   imports
 *     NOTHING (Engine 무관, Universal Core만 가능)
 *
 * Policy Engine
 *   imports
 *     Core SDK
 *
 * Identity Engine
 *   imports
 *     Core SDK, Policy Engine
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

interface ImportViolation {
  file: string;
  forbiddenImport: string;
  reason: string;
}

const FORBIDDEN_ENGINES = ['identity', 'policy', 'notification', 'media', 'cms', 'booking', 'payment', 'review', 'analytics', 'ai', 'workflow'];

interface CheckResult {
  passed: boolean;
  violations: ImportViolation[];
  totalFiles: number;
  totalImports: number;
}

/**
 * 모든 .ts 파일에서 import 패턴 검사
 */
function findAllTsFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string): void {
    if (!existsSync(currentDir)) return;
    const entries = readdirSync(currentDir);
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        // node_modules, dist, coverage, examples 제외
        if (['node_modules', 'dist', 'coverage', '.git'].includes(entry)) continue;
        walk(fullPath);
      } else if (entry.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

function checkForbiddenImports(filePath: string): ImportViolation[] {
  const violations: ImportViolation[] = [];
  const content = readFileSync(filePath, 'utf-8');

  // import 라인 검사
  const importRegex = /import\s+(?:.*from\s+)?['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];

    for (const engine of FORBIDDEN_ENGINES) {
      // engine.json 체크 또는 @platform/<engine> 또는 상대 경로
      const isEngineImport =
        importPath === `@platform/${engine}` ||
        importPath === `@aibg/${engine}` ||
        // 동일 engine 내 import는 허용 (policy/src/types.ts → policy/src/resolver.ts)
        // 다른 engine 내 import는 금지
        new RegExp(`engines/${engine}/`).test(importPath) &&
        !filePath.includes(`/engines/${engine}/`);

      if (isEngineImport) {
        // core-sdk는 제외 (모든 engine이 import 가능)
        if (engine === 'core-sdk') continue;
        if (filePath.includes(`/engines/core-sdk/`)) {
          // core-sdk가 다른 engine을 import하는지 검사
          violations.push({
            file: filePath,
            forbiddenImport: importPath,
            reason: `core-sdk cannot import from '${engine}' engine`,
          });
        } else if (!filePath.includes(`/engines/${engine}/`)) {
          // 다른 engine에서 다른 engine을 import
          violations.push({
            file: filePath,
            forbiddenImport: importPath,
            reason: `engine cross-import not allowed (Source: ${filePath.includes('/engines/') ? filePath.split('/engines/')[1].split('/')[0] : 'root'} → Target: ${engine})`,
          });
        }
      }
    }
  }

  return violations;
}

/**
 * Core SDK 전용 특별 검사
 */
function checkCoreSdkBoundaries(rootDir: string): ImportViolation[] {
  const violations: ImportViolation[] = [];
  const coreSdkDir = join(rootDir, 'engines/core-sdk/src');

  if (!existsSync(coreSdkDir)) return violations;

  const files = findAllTsFiles(coreSdkDir);
  for (const file of files) {
    const fileViolations = checkForbiddenImports(file);
    violations.push(...fileViolations.filter((v) => v.reason.includes('core-sdk cannot')));
  }

  return violations;
}

/**
 * 모든 Engine 간 Cross-Import 검사
 */
function checkEngineCrossImports(rootDir: string): ImportViolation[] {
  const violations: ImportViolation[] = [];
  const enginesDir = join(rootDir, 'engines');

  if (!existsSync(enginesDir)) return violations;

  for (const engine of FORBIDDEN_ENGINES) {
    const engineDir = join(enginesDir, engine);
    if (!existsSync(engineDir)) continue;
    if (engine === 'core-sdk') continue; // 이미 별도 검사

    const files = findAllTsFiles(engineDir);
    for (const file of files) {
      const fileViolations = checkForbiddenImports(file);
      violations.push(
        ...fileViolations.filter((v) => v.reason.includes('engine cross-import')),
      );
    }
  }

  return violations;
}

/**
 * 메인 검증
 */
export function validate(): CheckResult {
  const rootDir = resolve(join(process.cwd()));
  const violations: ImportViolation[] = [];

  // 1. core-sdk는 다른 engine을 import ❌
  violations.push(...checkCoreSdkBoundaries(rootDir));

  // 2. 다른 engine끼리 cross-import ❌
  violations.push(...checkEngineCrossImports(rootDir));

  return {
    passed: violations.length === 0,
    violations,
    totalFiles: 0, // 향후 측정
    totalImports: 0,
  };
}

/**
 * CLI 진입점
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = validate();

  console.log('==================================================');
  console.log('  Import Boundary Test (헌법 §C-20 SDK Stability)');
  console.log('==================================================\n');

  if (result.passed) {
    console.log('✅ PASS — 모든 boundary 준수');
    console.log('   - core-sdk → 다른 engine import ❌');
    console.log('   - engine cross-import ❌');
    process.exit(0);
  } else {
    console.log(`❌ FAIL — ${result.violations.length}개 위반\n`);
    for (const v of result.violations) {
      console.log(`  ${v.file}`);
      console.log(`    forbidden: ${v.forbiddenImport}`);
      console.log(`    reason: ${v.reason}`);
      console.log('');
    }
    process.exit(1);
  }
}
