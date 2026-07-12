/** Release Manager — Shared Use Case Deps */
import type {
  IClock, IIdGenerator, IEventBus,
  IReleaseRepository, IVersionRepository, ITagRepository,
  IHistoryRepository, IChecklistRepository, IReleaseAuditRepository,
  ICompatibilityProvider, IValidationProvider, IGuardianProvider,
  IBuildProvider, ICustomDataPolicyProvider,
} from '../interfaces/index.js';

export interface ReleaseUseCaseDeps {
  releaseRepo: IReleaseRepository;
  versionRepo: IVersionRepository;
  tagRepo: ITagRepository;
  historyRepo: IHistoryRepository;
  checklistRepo: IChecklistRepository;
  auditRepo: IReleaseAuditRepository;
  compatibilityProvider: ICompatibilityProvider;
  validationProvider: IValidationProvider;
  guardianProvider: IGuardianProvider;
  buildProvider: IBuildProvider;
  policyProvider: ICustomDataPolicyProvider;
  eventBus: IEventBus;
  idGenerator: IIdGenerator;
  clock: IClock;
}
