/**
 * tenant/index.ts — Public API
 */
export {
  type TenantContext, createTenantContext,
  runInTenantContext, runInTenantContextSync,
  getTenantContext, getTenantContextOrNull,
  getTenantId, getOrganizationId, getActorId, getCorrelationId,
  TenantContextError,
  getRlsContext,
  assertTenantAccess, TenantIsolationViolationError,
} from './context.js';