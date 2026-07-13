/**
 * tenant/context.ts — AsyncLocalStorage Tenant Context
 *
 * Sprint A-2: Developers must never manually inject tenantId.
 * The platform automatically propagates tenant context through async boundaries.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { TraceContext } from '../reliability/tracing.js';

// ═══════════════════════════════════════════
// Tenant Context
// ═══════════════════════════════════════════

export interface TenantContext {
  readonly tenantId: string;
  readonly organizationId: string;
  readonly actorId: string;
  readonly correlationId: string;
  readonly trace: TraceContext;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly requestId: string;
}

// ═══════════════════════════════════════════
// AsyncLocalStorage
// ═══════════════════════════════════════════

const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Create a tenant context (typically at HTTP request boundary)
 */
export function createTenantContext(input: {
  tenantId: string;
  organizationId: string;
  actorId: string;
  correlationId?: string;
  roles?: string[];
  permissions?: string[];
  parentTrace?: TraceContext;
}): TenantContext {
  const trace = input.parentTrace
    ? { ...input.parentTrace, correlationId: input.correlationId ?? input.parentTrace.correlationId }
    : createTraceFromCorrelation(input.correlationId);
  return {
    tenantId: input.tenantId,
    organizationId: input.organizationId,
    actorId: input.actorId,
    correlationId: input.correlationId ?? trace.correlationId,
    trace,
    roles: input.roles ?? [],
    permissions: input.permissions ?? [],
    requestId: randomUUID(),
  };
}

function createTraceFromCorrelation(correlationId?: string): TraceContext {
  return {
    correlationId: correlationId ?? randomUUID(),
    causationId: '',
    traceId: randomUUID(),
    spanId: randomUUID(),
  };
}

/**
 * Run a function within a tenant context.
 * The context is automatically available to all async operations within.
 */
export function runInTenantContext<T>(ctx: TenantContext, fn: () => Promise<T>): Promise<T> {
  return tenantStorage.run(ctx, fn);
}

/**
 * Run a synchronous function within a tenant context.
 */
export function runInTenantContextSync<T>(ctx: TenantContext, fn: () => T): T {
  return tenantStorage.run(ctx, fn);
}

/**
 * Get the current tenant context.
 * Throws if called outside of a tenant context.
 */
export function getTenantContext(): TenantContext {
  const ctx = tenantStorage.getStore();
  if (!ctx) {
    throw new TenantContextError(
      'No tenant context available. Ensure the operation is running within runInTenantContext().',
    );
  }
  return ctx;
}

/**
 * Get the current tenant context or null.
 */
export function getTenantContextOrNull(): TenantContext | null {
  return tenantStorage.getStore() ?? null;
}

/**
 * Get current tenantId (convenience method)
 */
export function getTenantId(): string {
  return getTenantContext().tenantId;
}

/**
 * Get current organizationId (convenience method)
 */
export function getOrganizationId(): string {
  return getTenantContext().organizationId;
}

/**
 * Get current actorId (convenience method)
 */
export function getActorId(): string {
  return getTenantContext().actorId;
}

/**
 * Get current correlationId (convenience method)
 */
export function getCorrelationId(): string {
  return getTenantContext().correlationId;
}

// ═══════════════════════════════════════════
// Tenant Context Error
// ═══════════════════════════════════════════

export class TenantContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantContextError';
  }
}

// ═══════════════════════════════════════════
// RLS Ready — Row Level Security context value
// ═══════════════════════════════════════════

/**
 * Produces the `app.current_tenant` setting value for PostgreSQL RLS.
 * In production, this would be `SET LOCAL app.current_tenant = $1` per transaction.
 */
export function getRlsContext(): { tenantId: string; organizationId: string; actorId: string } {
  const ctx = getTenantContext();
  return {
    tenantId: ctx.tenantId,
    organizationId: ctx.organizationId,
    actorId: ctx.actorId,
  };
}

// ═══════════════════════════════════════════
// Tenant Isolation Validation
// ═══════════════════════════════════════════

/**
 * Validates that data being accessed belongs to the current tenant.
 * Use in repositories to enforce tenant isolation.
 */
export function assertTenantAccess(dataTenantId: string): void {
  const ctx = getTenantContext();
  if (dataTenantId !== ctx.tenantId) {
    throw new TenantIsolationViolationError(
      `Tenant isolation violation: attempted to access data belonging to tenant '${dataTenantId}' from tenant '${ctx.tenantId}'`,
    );
  }
}

export class TenantIsolationViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantIsolationViolationError';
  }
}