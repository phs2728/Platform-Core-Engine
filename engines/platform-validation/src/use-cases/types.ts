/**
 * Platform Validation Engine — Shared Use Case Deps (3-Layer DI)
 */

import type {
  IClock,
  IIdGenerator,
  IEventBus,
  IScenarioRepository,
  IValidationRepository,
  IReportRepository,
  IMetricsRepository,
  ICertificationRepository,
  IValidationAuditRepository,
  IEngineManifestProvider,
  IEngineActionProvider,
  IGuardianProvider,
  ICompatibilityProvider,
  ICustomDataPolicyProvider,
} from '../interfaces/index.js';

export interface ValidationUseCaseDeps {
  scenarioRepo: IScenarioRepository;
  validationRepo: IValidationRepository;
  reportRepo: IReportRepository;
  metricsRepo: IMetricsRepository;
  certificationRepo: ICertificationRepository;
  auditRepo: IValidationAuditRepository;
  manifestProvider: IEngineManifestProvider;
  actionProvider: IEngineActionProvider;
  guardianProvider: IGuardianProvider;
  compatibilityProvider: ICompatibilityProvider;
  policyProvider: ICustomDataPolicyProvider;
  eventBus: IEventBus;
  idGenerator: IIdGenerator;
  clock: IClock;
}
