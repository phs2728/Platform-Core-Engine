#!/usr/bin/env node
/**
 * Engine Generator CLI
 *
 * Usage: pnpm create-engine <name> [--phase N] [--description "..."]
 *
 * 사장님 Engineering Manager 확립 (2026-07-11):
 * "pnpm create-engine booking 그러면 전부 생성됩니다."
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: pnpm create-engine <name> [--phase N] [--description "..."]');
  process.exit(1);
}

const name = args[0].replace(/[^a-z0-9-]/gi, '-').toLowerCase();
const phaseArg = args.find((a) => a.startsWith('--phase='));
const phase = phaseArg ? parseInt(phaseArg.split('=')[1], 10) : 99;
const descArg = args.find((a) => a.startsWith('--description='));
const description = descArg ? descArg.split('=')[1] : `${name} engine`;

const title = name.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const rootDir = process.cwd();
const templateDir = join(rootDir, '.engine-template');
const targetDir = join(rootDir, 'engines', name);

if (existsSync(targetDir)) {
  console.error(`❌ Engine already exists: engines/${name}`);
  process.exit(1);
}

// Template variables
const vars = {
  TEMPLATE_NAME: name,
  TEMPLATE_TITLE: title,
  TEMPLATE_DESCRIPTION: description,
  TEMPLATE_PHASE: String(phase),
  TEMPLATE_DATE: new Date().toISOString().split('T')[0],
  '{{NAME}}': name,
  '{{TITLE}}': title,
  '{{DESCRIPTION}}': description,
  '{{PHASE}}': String(phase),
};

function replaceVars(content) {
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(key, value);
  }
  return result;
}

function copyRecursive(srcDir, destDir) {
  mkdirSync(destDir, { recursive: true });
  const entries = readdirSync(srcDir);
  for (const entry of entries) {
    const srcPath = join(srcDir, entry);
    const destPath = join(destDir, entry);
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else if (entry.endsWith('.ts') || entry.endsWith('.json') || entry.endsWith('.md') || entry.endsWith('.template')) {
      const content = readFileSync(srcPath, 'utf-8');
      writeFileSync(destPath, replaceVars(content));
    } else {
      const raw = readFileSync(srcPath);
      writeFileSync(destPath, raw);
    }
  }
}

console.log(`╔══════════════════════════════════════╗`);
console.log(`║  Platform Engine Generator           ║`);
console.log(`╠══════════════════════════════════════╣`);
console.log(`║  Name:        ${name.padEnd(24)}║`);
console.log(`║  Title:       ${title.padEnd(24)}║`);
console.log(`║  Phase:       ${String(phase).padEnd(24)}║`);
console.log(`║  Description: ${description.slice(0, 24).padEnd(24)}║`);
console.log(`╚══════════════════════════════════════╝`);
console.log('');

copyRecursive(templateDir, targetDir);

// Rename package.json.template → package.json
const { renameSync } = await import('node:fs');
const templatePkg = join(targetDir, 'package.json.template');
const realPkg = join(targetDir, 'package.json');
try { renameSync(templatePkg, realPkg); } catch {}

console.log(`✅ Engine created: engines/${name}/`);
console.log('');
console.log('Generated files:');
function listFiles(dir, prefix) {
  const entries = readdirSync(dir).sort();
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      console.log(`${prefix}${entry}/`);
      listFiles(fullPath, prefix + '  ');
    } else {
      console.log(`${prefix}${entry}`);
    }
  }
}
listFiles(targetDir, '  ');

console.log('');
console.log('Next steps:');
console.log(`  1. cd engines/${name}`);
console.log(`  2. Edit src/interfaces/index.ts — define your interfaces`);
console.log(`  3. Edit src/use-cases/ — implement your use cases`);
console.log(`  4. pnpm install`);
console.log(`  5. pnpm test`);
console.log(`  6. Update engine.json — add events_emitted, provides`);
