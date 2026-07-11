/**
 * Engine Dependency Validator
 *
 * 사장님 CEO 확립 (2026-07-11): "Dependency Validator를 만들게 하겠습니다.
 *  이 기능은 지금 만들어두면 앞으로 30개의 엔진을 개발할 때 큰 도움이 됩니다."
 *
 * 헌법 §C-18: Circular Dependency 절대 금지
 *
 * Sprint 2D에서 구현 완성 (TypeScript → JavaScript 빌드 후 실행).
 * 현재는 인터페이스 + 알고리즘 시뮬레이션.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

interface EngineManifest {
  id: string;
  phase: number;
  depends_on: string[];
  events_subscribed?: string[];
}

interface ValidationResult {
  hasError: boolean;
  hasWarning: boolean;
  cycles: string[][];
  invalidPhaseOrder: Array<{ engine: string; dep: string; depPhase: number }>;
  missingDependencies: string[];
  unusedDependencies: string[];
  messages: string[];
}

/**
 * 모든 engine.json 로드
 */
function loadAllEngines(rootDir: string): EngineManifest[] {
  const enginesDir = join(rootDir, 'engines');
  if (!existsSync(enginesDir)) return [];

  const engines: EngineManifest[] = [];

  function walk(dir: string): void {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (entry === 'engine.json') {
        const content = readFileSync(fullPath, 'utf-8');
        try {
          const manifest = JSON.parse(content) as EngineManifest;
          engines.push(manifest);
        } catch (e) {
          console.error(`❌ Failed to parse ${fullPath}:`, (e as Error).message);
        }
      }
    }
  }

  walk(enginesDir);
  return engines;
}

/**
 * Cycle Detection (DFS + 3-color marking)
 */
function detectCycles(engines: EngineManifest[]): string[][] {
  const graph = new Map<string, string[]>();
  for (const e of engines) {
    graph.set(e.id, e.depends_on || []);
  }

  const colors = new Map<string, 'white' | 'gray' | 'black'>();
  const cycles: string[][] = [];

  function dfs(node: string, path: string[]): void {
    colors.set(node, 'gray');
    const deps = graph.get(node) || [];
    for (const dep of deps) {
      if (colors.get(dep) === 'gray') {
        const cycleStart = path.indexOf(dep);
        if (cycleStart >= 0) {
          cycles.push([...path.slice(cycleStart), dep]);
        }
      } else if (colors.get(dep) === 'white' || !colors.has(dep)) {
        dfs(dep, [...path, dep]);
      }
    }
    colors.set(node, 'black');
  }

  for (const node of graph.keys()) {
    if (!colors.has(node) || colors.get(node) === 'white') {
      dfs(node, [node]);
    }
  }

  return cycles;
}

/**
 * Phase 순서 검증 (의존하는 엔진이 자신의 Phase보다 빠름)
 */
function validatePhaseOrder(engines: EngineManifest[]): ValidationResult['invalidPhaseOrder'] {
  const invalid: ValidationResult['invalidPhaseOrder'] = [];
  const engineMap = new Map(engines.map((e) => [e.id, e]));

  for (const engine of engines) {
    for (const dep of engine.depends_on || []) {
      const depEngine = engineMap.get(dep);
      if (!depEngine) continue; // 외부 의존성 (universal-core 등)
      if (depEngine.phase > engine.phase) {
        invalid.push({
          engine: engine.id,
          dep: dep,
          depPhase: depEngine.phase,
        });
      }
    }
  }

  return invalid;
}

/**
 * 통합 검증
 */
export function validate(engines: EngineManifest[]): ValidationResult {
  const result: ValidationResult = {
    hasError: false,
    hasWarning: false,
    cycles: [],
    invalidPhaseOrder: [],
    missingDependencies: [],
    unusedDependencies: [],
    messages: [],
  };

  // 1. Cycle Detection
  result.cycles = detectCycles(engines);
  if (result.cycles.length > 0) {
    result.hasError = true;
    result.messages.push(`❌ CIRCULAR DEPENDENCY DETECTED: ${result.cycles.length}개`);
    for (const cycle of result.cycles) {
      result.messages.push(`   Cycle: ${cycle.join(' → ')}`);
    }
  }

  // 2. Phase Order
  result.invalidPhaseOrder = validatePhaseOrder(engines);
  if (result.invalidPhaseOrder.length > 0) {
    result.hasError = true;
    result.messages.push(`❌ INVALID PHASE ORDER: ${result.invalidPhaseOrder.length}개`);
    for (const inv of result.invalidPhaseOrder) {
      result.messages.push(`   ${inv.engine} (Phase ?) depends on ${inv.dep} (Phase ${inv.depPhase})`);
    }
  }

  if (!result.hasError) {
    result.messages.push('✅ No cycles detected');
    result.messages.push('✅ All engines in correct phase order');
  }

  return result;
}

/**
 * CLI 진입점 (Sprint 2D에서 빌드 후 실행)
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const rootDir = resolve(join(process.cwd()));
  const engines = loadAllEngines(rootDir);
  const result = validate(engines);

  console.log('=== Engine Dependency Check ===\n');
  for (const msg of result.messages) {
    console.log(msg);
  }

  console.log(`\nEngines loaded: ${engines.length}`);
  for (const e of engines) {
    console.log(`  - ${e.id} (Phase ${e.phase})`);
  }

  console.log(
    `\n=== Result: ${result.hasError ? '❌ FAIL' : result.hasWarning ? '⚠️ WARN' : '✅ PASS'} ===`,
  );
  process.exit(result.hasError ? 1 : 0);
}
