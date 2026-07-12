/**
 * Platform Release Manager — Public Interfaces
 *
 * 사장님 확립 (2026-07-11) Phase 6 — Release Engineering Layer.
 * Manages RC→Stable promotion, release validation, tag creation,
 * changelog/release-note generation, rollback.
 *
 * Does NOT modify engine internals — only manages the release pipeline.
 * Integrates with Platform Compatibility, Validation, Guardian via host interfaces.
 */

import type { Result, EventEnvelope } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Core Infra
// ═══════════════════════════════════════════

export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IEventBus { emit<T>(envelope: EventEnvelope<T>): Promise<void>; }

// ═══════════════════════════════════════════
// Host Interfaces — Integration with Quality Layer
// ═══════════════════════════════════════════

/** Platform Compatibility provider — reads compatibility scores. */
export interface ICompatibilityProvider {
  runCheck(tenantId: string, engineId: string): Promise<Result<CompatibilityResult, Error>>;
  getScore(tenantId: string, engineId: string): Promise<number>;
}

export interface CompatibilityResult {
  engineId: string;
  score: number;           // 0-100
  violations: string[];
  passed: boolean;
}

/** Platform Validation provider — runs validation suite. */
export interface IValidationProvider {
  runValidation(tenantId: string, engineId: string): Promise<Result<ValidationResult, Error>>;
}

export interface ValidationResult {
  engineId: string;
  status: 'Passed' | 'Failed';
  scenariosRun: number;
  scenariosPassed: number;
  healthScore: number;
}

/** Platform Guardian provider — reads guardian decisions. */
export interface IGuardianProvider {
  runGuardianCheck(tenantId: string, engineId: string): Promise<Result<GuardianResult, Error>>;
}

export interface GuardianResult {
  engineId: string;
  decision: 'APPROVED' | 'CONDITIONS' | 'REVIEW_REQUIRED' | 'REJECTED';
  score: number;
  risks: string[];
}

/** Build provider — runs build/test/lint. */
export interface IBuildProvider {
  runBuild(engineId: string): Promise<Result<BuildResult, Error>>;
}

export interface BuildResult {
  engineId: string;
  build: boolean;
  lint: boolean;
  typecheck: boolean;
  tests: boolean;
  testCount: number;
  testPassed: number;
  examples: boolean;
}

/** Custom Data Policy */
export interface ICustomDataPolicyProvider {
  validateAttributes(tenantId: string, type: string, attributes: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>>;
  getMaxReleasesPerEngine(tenantId: string): Promise<number>;
  getRequiredApprovals(tenantId: string): Promise<number>;
}

// ═══════════════════════════════════════════
// Value Objects & Enums
// ═══════════════════════════════════════════

export type ReleaseStatus =
  | 'Draft' | 'RC1' | 'RC2' | 'RC3'
  | 'Approved' | 'Published' | 'Stable'
  | 'Rejected' | 'Cancelled' | 'RolledBack';

export type ReleaseStage =
  | 'compatibility' | 'validation' | 'guardian'
  | 'checklist' | 'version_check' | 'tag'
  | 'release_note' | 'stable';

export type VersionLevel = 'major' | 'minor' | 'patch';

export type Channel = 'alpha' | 'beta' | 'rc' | 'stable';

// ═══════════════════════════════════════════
// Core Entities
// ═══════════════════════════════════════════

/** Semantic Version */
export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  channel: Channel;
  rcNumber: number | null;     // 1, 2, 3 for rc1, rc2, rc3
}

/** Release — the aggregate root. */
export interface Release {
  id: string;
  tenantId: string;
  engineId: string;
  version: SemanticVersion;
  status: ReleaseStatus;
  stage: ReleaseStage;
  title: string;
  description: string;
  branch: string;
  commitSha: string | null;
  checklist: ReleaseChecklist;
  approvals: ReleaseApproval[];
  releaseNoteId: string | null;
  rollbackPlanId: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  approvedAt: string | null;
}

/** Release Checklist — automated verification items. */
export interface ReleaseChecklist {
  build: ChecklistItem;
  lint: ChecklistItem;
  typecheck: ChecklistItem;
  tests: ChecklistItem;
  coverage: ChecklistItem;
  examples: ChecklistItem;
  compatibility: ChecklistItem;
  guardian: ChecklistItem;
  validation: ChecklistItem;
  certification: ChecklistItem;
}

export interface ChecklistItem {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  score: number | null;
  details: string | null;
  completedAt: string | null;
}

/** Release Approval — who approved/rejected. */
export interface ReleaseApproval {
  id: string;
  approverId: string;
  approverRole: string;
  decision: 'approved' | 'rejected';
  reason: string;
  timestamp: string;
}

/** Release Note — auto-generated release documentation. */
export interface ReleaseNote {
  id: string;
  tenantId: string;
  releaseId: string;
  engineId: string;
  version: string;
  features: string[];
  bugFixes: string[];
  breakingChanges: string[];
  migration: string[];
  knownIssues: string[];
  upgradeGuide: string;
  generatedAt: string;
}

/** Changelog — diff between versions. */
export interface Changelog {
  id: string;
  tenantId: string;
  engineId: string;
  fromVersion: string;
  toVersion: string;
  entries: ChangelogEntry[];
  generatedAt: string;
}

export interface ChangelogEntry {
  type: 'feature' | 'fix' | 'breaking' | 'deprecation' | 'security';
  description: string;
  commitSha: string | null;
}

/** Tag — git tag record. */
export interface Tag {
  id: string;
  tenantId: string;
  engineId: string;
  name: string;                // e.g. "v1.0.0-rc1"
  version: SemanticVersion;
  releaseId: string;
  commitSha: string | null;
  message: string;
  verified: boolean;
  createdAt: string;
}

/** Rollback Plan — plan for reverting a release. */
export interface RollbackPlan {
  id: string;
  tenantId: string;
  releaseId: string;
  engineId: string;
  targetVersion: SemanticVersion;
  steps: RollbackStep[];
  status: 'pending' | 'executing' | 'completed' | 'failed';
  createdAt: string;
  executedAt: string | null;
}

export interface RollbackStep {
  name: string;
  description: string;
  command: string;
  status: 'pending' | 'done' | 'failed';
}

/** Release History — chronological record. */
export interface ReleaseHistory {
  id: string;
  tenantId: string;
  engineId: string;
  releases: { releaseId: string; version: string; status: ReleaseStatus; date: string }[];
}

/** Audit */
export type ReleaseAuditEventType =
  | 'release_created' | 'release_approved' | 'release_rejected'
  | 'release_published' | 'release_rolled_back' | 'release_cancelled'
  | 'tag_created' | 'tag_deleted' | 'note_generated'
  | 'validation_completed' | 'guardian_completed' | 'compatibility_completed';

export interface ReleaseAuditRecord {
  id: string;
  tenantId: string;
  releaseId?: string;
  tagId?: string;
  actorId: string;
  correlationId: string;
  eventType: ReleaseAuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Repositories
// ═══════════════════════════════════════════

export interface IReleaseRepository {
  insert(r: Release): Promise<void>;
  findById(tenantId: string, id: string): Promise<Release | null>;
  findByEngine(tenantId: string, engineId: string): Promise<Release[]>;
  findLatest(tenantId: string, engineId: string): Promise<Release | null>;
  update(tenantId: string, id: string, patch: Partial<Release>): Promise<void>;
  listAll(tenantId: string, limit?: number): Promise<Release[]>;
}

export interface IVersionRepository {
  insert(v: VersionRecord): Promise<void>;
  findByEngine(tenantId: string, engineId: string): Promise<VersionRecord[]>;
  findLatest(tenantId: string, engineId: string): Promise<VersionRecord | null>;
}

export interface VersionRecord {
  id: string;
  tenantId: string;
  engineId: string;
  version: SemanticVersion;
  releaseId: string;
  createdAt: string;
}

export interface ITagRepository {
  insert(t: Tag): Promise<void>;
  findById(tenantId: string, id: string): Promise<Tag | null>;
  findByName(tenantId: string, name: string): Promise<Tag | null>;
  findByEngine(tenantId: string, engineId: string): Promise<Tag[]>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface IHistoryRepository {
  upsert(h: ReleaseHistory): Promise<void>;
  findByEngine(tenantId: string, engineId: string): Promise<ReleaseHistory | null>;
}

export interface IChecklistRepository {
  upsert(releaseId: string, checklist: ReleaseChecklist): Promise<void>;
  findByRelease(releaseId: string): Promise<ReleaseChecklist | null>;
}

export interface IReleaseAuditRepository {
  insert(record: Omit<ReleaseAuditRecord, 'id' | 'createdAt'>): Promise<ReleaseAuditRecord>;
  findByTenant(tenantId: string, limit?: number): Promise<ReleaseAuditRecord[]>;
  findByRelease(tenantId: string, releaseId: string): Promise<ReleaseAuditRecord[]>;
}

export { type Result, type EventEnvelope };
