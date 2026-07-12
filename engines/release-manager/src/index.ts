/** Platform Release Manager — Public API */
export { type Result, Ok, Err, ValidationError, NotFoundError, ConflictError, type EventEnvelope, createEnvelope, z } from '@platform/core-sdk';

export type {
  Release, SemanticVersion, ReleaseStatus, ReleaseStage, Channel, VersionLevel,
  ReleaseChecklist, ChecklistItem, ReleaseApproval, ReleaseNote, Changelog, ChangelogEntry,
  Tag, RollbackPlan, RollbackStep, ReleaseHistory, ReleaseAuditRecord, ReleaseAuditEventType,
  VersionRecord,
  CompatibilityResult, ValidationResult, GuardianResult, BuildResult,
  ICompatibilityProvider, IValidationProvider, IGuardianProvider, IBuildProvider, ICustomDataPolicyProvider,
  IClock, IIdGenerator, IEventBus,
  IReleaseRepository, IVersionRepository, ITagRepository,
  IHistoryRepository, IChecklistRepository, IReleaseAuditRepository,
} from './interfaces/index.js';

// Version logic
export {
  parseVersion, formatVersion, compareVersions, calculateNextVersion,
  nextRCVersion, promoteToStable, bumpVersion,
  defaultChecklist, allChecklistPassed, canApprove, canPromoteToStable,
} from './domain/versionLogic.js';

// Release Core UseCases (8)
export {
  createReleaseUseCase, approveReleaseUseCase, rejectReleaseUseCase,
  publishReleaseUseCase, rollbackReleaseUseCase, cancelReleaseUseCase,
  getReleaseUseCase, listReleasesUseCase,
} from './use-cases/ReleaseUseCases.js';

// Version + Tag + Pipeline + Changelog + Rollback UseCases (14)
export {
  calculateVersionUseCase, validateVersionUseCase, registerVersionUseCase, compareVersionUseCase,
  createTagUseCase, deleteTagUseCase, verifyTagUseCase,
  runPipelineUseCase, runCompatibilityUseCase, runGuardianUseCase, runValidationUseCase, runChecklistUseCase,
  generateReleaseNoteUseCase, generateChangelogUseCase, listReleaseHistoryUseCase,
  createRollbackPlanUseCase, executeRollbackUseCase, verifyRollbackUseCase,
} from './use-cases/PipelineVersionUseCases.js';

export type { ReleaseUseCaseDeps } from './use-cases/types.js';

// In-Memory Repositories
export {
  InMemoryReleaseRepository, InMemoryVersionRepository, InMemoryTagRepository,
  InMemoryHistoryRepository, InMemoryChecklistRepository, InMemoryReleaseAuditRepository,
} from './infrastructure/InMemoryRepositories.js';

// Host Stubs
export {
  MockCompatibilityProvider, MockValidationProvider, MockGuardianProvider,
  MockBuildProvider, StaticReleasePolicyProvider, InMemoryEventBus, type RecordedEnvelope,
} from './infrastructure/hostAdapters.js';
