/**
 * observability/index.ts — OpenTelemetry Interface + Structured Logging + Health
 *
 * Sprint A-5: Platform Observability Framework
 */
import { getTenantContextOrNull } from '../tenant/context.js';

// ═══════════════════════════════════════════
// Structured Logging
// ═══════════════════════════════════════════

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface StructuredLogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly message: string;
  readonly tenantId?: string | undefined;
  readonly correlationId?: string | undefined;
  readonly traceId?: string | undefined;
  readonly spanId?: string | undefined;
  readonly engine?: string | undefined;
  readonly [key: string]: unknown;
}

export interface IStructuredLogger {
  log(entry: Omit<StructuredLogEntry, 'timestamp'>): void;
  trace(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  fatal(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Console Structured Logger — JSON output
 */
export class ConsoleStructuredLogger implements IStructuredLogger {
  constructor(private readonly engine: string = 'platform') {}

  private emit(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const ctx = getTenantContextOrNull();
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      engine: this.engine,
      tenantId: ctx?.tenantId,
      correlationId: ctx?.correlationId,
      traceId: ctx?.trace.traceId,
      spanId: ctx?.trace.spanId,
      ...meta,
    };
    const output = JSON.stringify(entry);
    if (level === 'error' || level === 'fatal') {
      process.stderr.write(output + '\n');
    } else {
      process.stdout.write(output + '\n');
    }
  }

  log(entry: Omit<StructuredLogEntry, 'timestamp'>): void {
    this.emit(entry.level as LogLevel, String(entry.message), entry as Record<string, unknown>);
  }
  trace(message: string, meta?: Record<string, unknown>): void { this.emit('trace', message, meta); }
  debug(message: string, meta?: Record<string, unknown>): void { this.emit('debug', message, meta); }
  info(message: string, meta?: Record<string, unknown>): void { this.emit('info', message, meta); }
  warn(message: string, meta?: Record<string, unknown>): void { this.emit('warn', message, meta); }
  error(message: string, meta?: Record<string, unknown>): void { this.emit('error', message, meta); }
  fatal(message: string, meta?: Record<string, unknown>): void { this.emit('fatal', message, meta); }
}

// ═══════════════════════════════════════════
// Metrics
// ═══════════════════════════════════════════

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

export interface MetricSample {
  readonly name: string;
  readonly type: MetricType;
  readonly value: number;
  readonly labels: Record<string, string>;
  readonly timestamp: string;
}

export interface IMetricsCollector {
  incrementCounter(name: string, value?: number, labels?: Record<string, string>): void;
  setGauge(name: string, value: number, labels?: Record<string, string>): void;
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void;
  getSamples(): MetricSample[];
}

/**
 * In-Memory Metrics Collector
 */
export class InMemoryMetricsCollector implements IMetricsCollector {
  private samples: MetricSample[] = [];
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();

  incrementCounter(name: string, value = 1, labels: Record<string, string> = {}): void {
    const key = `${name}:${JSON.stringify(labels)}`;
    this.counters.set(key, (this.counters.get(key) ?? 0) + value);
    this.samples.push({ name, type: 'counter', value, labels, timestamp: new Date().toISOString() });
  }

  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = `${name}:${JSON.stringify(labels)}`;
    this.gauges.set(key, value);
    this.samples.push({ name, type: 'gauge', value, labels, timestamp: new Date().toISOString() });
  }

  observeHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    this.samples.push({ name, type: 'histogram', value, labels, timestamp: new Date().toISOString() });
  }

  getSamples(): MetricSample[] { return [...this.samples]; }
  clear(): void { this.samples = []; this.counters.clear(); this.gauges.clear(); }
}

// ═══════════════════════════════════════════
// Health Check
// ═══════════════════════════════════════════

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheckResult {
  readonly name: string;
  readonly status: HealthStatus;
  readonly message?: string;
  readonly latencyMs?: number;
  readonly metadata?: Record<string, unknown>;
}

export interface HealthCheck {
  readonly name: string;
  check(): Promise<HealthCheckResult>;
}

export interface HealthCheckFramework {
  register(check: HealthCheck): void;
  runAll(): Promise<{ status: HealthStatus; checks: HealthCheckResult[]; timestamp: string }>;
}

/**
 * Default Health Check Framework
 */
export class DefaultHealthCheckFramework implements HealthCheckFramework {
  private checks: HealthCheck[] = [];

  register(check: HealthCheck): void { this.checks.push(check); }

  async runAll(): Promise<{ status: HealthStatus; checks: HealthCheckResult[]; timestamp: string }> {
    const results = await Promise.allSettled(
      this.checks.map(async (c) => {
        const start = Date.now();
        try {
          const result = await c.check();
          return { ...result, latencyMs: Date.now() - start };
        } catch (err) {
          return {
            name: c.name, status: 'unhealthy' as HealthStatus,
            message: err instanceof Error ? err.message : String(err),
            latencyMs: Date.now() - start,
          };
        }
      }),
    );
    const checks = results.map(r => r.status === 'fulfilled' ? r.value : { name: 'unknown', status: 'unhealthy' as HealthStatus, message: 'Check failed' });
    const hasUnhealthy = checks.some(c => c.status === 'unhealthy');
    const hasDegraded = checks.some(c => c.status === 'degraded');
    const status: HealthStatus = hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy';
    return { status, checks, timestamp: new Date().toISOString() };
  }
}

// ═══════════════════════════════════════════
// OpenTelemetry Interface (adapter-ready)
// ═══════════════════════════════════════════

export interface ITracer {
  startSpan(name: string, attributes?: Record<string, string | number | boolean>): ISpan;
}

export interface ISpan {
  readonly spanId: string;
  readonly traceId: string;
  setAttribute(key: string, value: string | number | boolean): void;
  recordError(err: Error): void;
  end(): void;
}

/**
 * No-op Tracer (default — production replaces with OTel adapter)
 */
export class NoopTracer implements ITracer {
  startSpan(_name: string, _attributes?: Record<string, string | number | boolean>): ISpan {
    return {
      spanId: 'noop',
      traceId: 'noop',
      setAttribute() {},
      recordError() {},
      end() {},
    };
  }
}

// ═══════════════════════════════════════════
// Observability Container
// ═══════════════════════════════════════════

export interface ObservabilityContainer {
  logger: IStructuredLogger;
  metrics: IMetricsCollector;
  tracer: ITracer;
  healthChecks: HealthCheckFramework;
}

export function createDefaultObservability(engine?: string): ObservabilityContainer {
  return {
    logger: new ConsoleStructuredLogger(engine),
    metrics: new InMemoryMetricsCollector(),
    tracer: new NoopTracer(),
    healthChecks: new DefaultHealthCheckFramework(),
  };
}