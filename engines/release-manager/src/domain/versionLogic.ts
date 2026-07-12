/** Release Manager — Version Logic + Pipeline State Machine */
import { ConflictError, Err, Ok, type Result } from '@platform/core-sdk';
import type { SemanticVersion, ReleaseStatus, ReleaseStage, Channel, ChecklistItem, ReleaseChecklist } from '../interfaces/index.js';

// ═══════════════════════════════════════════
// Version utilities
// ═══════════════════════════════════════════

export function parseVersion(str: string): SemanticVersion {
  // v1.2.3-rc1, v1.2.3-beta, v1.2.0-alpha, v1.2.3
  const match = str.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-(alpha|beta|rc)(\d+)?)?$/);
  if (!match) throw new Error(`Invalid version: ${str}`);
  return {
    major: parseInt(match[1]!, 10),
    minor: parseInt(match[2]!, 10),
    patch: parseInt(match[3]!, 10),
    channel: (match[4] ?? 'stable') as Channel,
    rcNumber: match[5] ? parseInt(match[5], 10) : null,
  };
}

export function formatVersion(v: SemanticVersion): string {
  const base = `v${v.major}.${v.minor}.${v.patch}`;
  if (v.channel === 'stable') return base;
  return v.rcNumber ? `${base}-${v.channel}${v.rcNumber}` : `${base}-${v.channel}`;
}

export function compareVersions(a: SemanticVersion, b: SemanticVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
  // Channel precedence: stable > rc > beta > alpha
  const channelOrder: Record<string, number> = { stable: 4, rc: 3, beta: 2, alpha: 1 };
  const aCh = channelOrder[a.channel] ?? 0;
  const bCh = channelOrder[b.channel] ?? 0;
  if (aCh !== bCh) return aCh - bCh;
  return (a.rcNumber ?? 0) - (b.rcNumber ?? 0);
}

export function nextRCVersion(current: SemanticVersion): SemanticVersion {
  if (current.channel === 'rc') {
    return { ...current, rcNumber: (current.rcNumber ?? 0) + 1 };
  }
  // First RC from alpha/beta/stable
  return { ...current, channel: 'rc', rcNumber: 1 };
}

export function promoteToStable(v: SemanticVersion): SemanticVersion {
  return { major: v.major, minor: v.minor, patch: v.patch, channel: 'stable', rcNumber: null };
}

export function bumpVersion(v: SemanticVersion, level: 'major' | 'minor' | 'patch'): SemanticVersion {
  switch (level) {
    case 'major': return { major: v.major + 1, minor: 0, patch: 0, channel: 'alpha', rcNumber: null };
    case 'minor': return { major: v.major, minor: v.minor + 1, patch: 0, channel: 'alpha', rcNumber: null };
    case 'patch': return { major: v.major, minor: v.minor, patch: v.patch + 1, channel: 'alpha', rcNumber: null };
  }
}

export function calculateNextVersion(
  current: SemanticVersion | null,
  hasBreakingChanges: boolean,
  hasNewFeatures: boolean,
): SemanticVersion {
  if (!current) return { major: 0, minor: 1, patch: 0, channel: 'alpha', rcNumber: null };
  if (hasBreakingChanges) return bumpVersion(current, 'major');
  if (hasNewFeatures) return bumpVersion(current, 'minor');
  return bumpVersion(current, 'patch');
}

// ═══════════════════════════════════════════
// Pipeline state machine
// ═══════════════════════════════════════════

const PIPELINE_ORDER: ReleaseStage[] = [
  'compatibility', 'validation', 'guardian',
  'checklist', 'version_check', 'tag',
  'release_note', 'stable',
];

export function getNextStage(current: ReleaseStage): ReleaseStage | null {
  const idx = PIPELINE_ORDER.indexOf(current);
  if (idx < 0 || idx >= PIPELINE_ORDER.length - 1) return null;
  return PIPELINE_ORDER[idx + 1]!;
}

export function validateStageTransition(current: ReleaseStage, next: ReleaseStage): Result<true, ConflictError> {
  const expected = getNextStage(current);
  if (expected !== next) {
    return Err(new ConflictError(`Pipeline stage must go "${current}" → "${expected}", not "${next}"`));
  }
  return Ok(true);
}

export function isStagePassed(checklist: ReleaseChecklist, stage: ReleaseStage): boolean {
  switch (stage) {
    case 'compatibility': return checklist.compatibility.status === 'passed';
    case 'validation': return checklist.validation.status === 'passed';
    case 'guardian': return checklist.guardian.status === 'passed';
    case 'checklist': return allChecklistPassed(checklist);
    case 'version_check': return checklist.certification.status === 'passed';
    default: return true;
  }
}

export function allChecklistPassed(checklist: ReleaseChecklist): boolean {
  const items: ChecklistItem[] = [
    checklist.build, checklist.lint, checklist.typecheck, checklist.tests,
    checklist.coverage, checklist.examples, checklist.compatibility,
    checklist.guardian, checklist.validation, checklist.certification,
  ];
  return items.every((item) => item.status === 'passed' || item.status === 'skipped');
}

export function canApprove(release: { status: ReleaseStatus; stage: ReleaseStage; checklist: ReleaseChecklist }): boolean {
  return release.status === 'RC1' || release.status === 'RC2' || release.status === 'RC3';
}

export function canPromoteToStable(release: { status: ReleaseStatus; stage: ReleaseStage; checklist: ReleaseChecklist }): boolean {
  return (release.status === 'Approved') && isStagePassed(release.checklist, 'checklist');
}

export function defaultChecklist(): ReleaseChecklist {
  const make = (name: string): ChecklistItem => ({ name, status: 'pending', score: null, details: null, completedAt: null });
  return {
    build: make('Build'), lint: make('Lint'), typecheck: make('Typecheck'),
    tests: make('Tests'), coverage: make('Coverage'), examples: make('Examples'),
    compatibility: make('Compatibility'), guardian: make('Guardian'),
    validation: make('Validation'), certification: make('Engine Certification'),
  };
}
