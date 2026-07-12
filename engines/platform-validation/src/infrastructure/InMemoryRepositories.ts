/**
 * In-Memory Repositories — Scenario/Validation/Report/Metrics/Certification/Audit
 *
 * 사장님 확립: Multi-Tenant key = `${tenantId}::${id}`
 */

import type {
  IScenarioRepository,
  IValidationRepository,
  IReportRepository,
  IMetricsRepository,
  ICertificationRepository,
  IValidationAuditRepository,
  Scenario,
  ValidationRun,
  ValidationResult,
  ValidationReport,
  Certification,
  ValidationAuditRecord,
  ScenarioSearchCriteria,
  ScenarioSearchResult,
  ValidationMetrics,
} from '../interfaces/index.js';

function key(t: string, id: string): string { return `${t}::${id}`; }

// ═══════════════════════════════════════════
// Scenario
// ═══════════════════════════════════════════

export class InMemoryScenarioRepository implements IScenarioRepository {
  private store = new Map<string, Scenario>();

  async insert(s: Scenario): Promise<void> {
    const k = key(s.tenantId, s.id);
    if (this.store.has(k)) throw new Error(`Duplicate scenario id: ${s.id}`);
    this.store.set(k, s);
  }

  async findById(tenantId: string, id: string): Promise<Scenario | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findAll(tenantId: string): Promise<Scenario[]> {
    const list: Scenario[] = [];
    for (const s of this.store.values()) {
      if (s.tenantId === tenantId) list.push(s);
    }
    return list;
  }

  async findByCategory(tenantId: string, category: string): Promise<Scenario[]> {
    const list: Scenario[] = [];
    for (const s of this.store.values()) {
      if (s.tenantId === tenantId && s.category === category) list.push(s);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<Scenario>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Scenario not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  async search(criteria: ScenarioSearchCriteria): Promise<ScenarioSearchResult> {
    const limit = criteria.limit ?? 20;
    const offset = criteria.offset ?? 0;
    let candidates: Scenario[] = [];
    for (const s of this.store.values()) {
      if (s.tenantId !== criteria.tenantId) continue;
      if (criteria.category !== undefined && s.category !== criteria.category) continue;
      if (criteria.type !== undefined && s.type !== criteria.type) continue;
      if (criteria.status !== undefined && s.status !== criteria.status) continue;
      if (criteria.tags !== undefined && !criteria.tags.every((t) => s.tags.includes(t))) continue;
      if (criteria.query !== undefined) {
        const q = criteria.query.toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !s.description.toLowerCase().includes(q)) continue;
      }
      candidates.push(s);
    }
    const total = candidates.length;
    return { scenarios: candidates.slice(offset, offset + limit), total, limit, offset };
  }

  async delete(tenantId: string, id: string): Promise<void> {
    this.store.delete(key(tenantId, id));
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Validation (runs + results)
// ═══════════════════════════════════════════

export class InMemoryValidationRepository implements IValidationRepository {
  private runs = new Map<string, ValidationRun>();
  private results = new Map<string, ValidationResult>();

  async insertRun(run: ValidationRun): Promise<void> {
    const k = key(run.tenantId, run.id);
    if (this.runs.has(k)) throw new Error(`Duplicate run id: ${run.id}`);
    this.runs.set(k, run);
  }

  async findRunById(tenantId: string, id: string): Promise<ValidationRun | null> {
    return this.runs.get(key(tenantId, id)) ?? null;
  }

  async updateRun(tenantId: string, id: string, patch: Partial<ValidationRun>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.runs.get(k);
    if (!ex) throw new Error(`Run not found: ${id}`);
    this.runs.set(k, { ...ex, ...patch });
  }

  async listRuns(tenantId: string, limit?: number): Promise<ValidationRun[]> {
    const list: ValidationRun[] = [];
    for (const r of this.runs.values()) {
      if (r.tenantId === tenantId) list.push(r);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  async insertResult(result: ValidationResult): Promise<void> {
    const k = key(result.tenantId, result.id);
    this.results.set(k, result);
  }

  async findResultsByRun(tenantId: string, runId: string): Promise<ValidationResult[]> {
    const list: ValidationResult[] = [];
    for (const r of this.results.values()) {
      if (r.tenantId === tenantId && r.runId === runId) list.push(r);
    }
    return list;
  }

  async findResultsByScenario(tenantId: string, scenarioId: string): Promise<ValidationResult[]> {
    const list: ValidationResult[] = [];
    for (const r of this.results.values()) {
      if (r.tenantId === tenantId && r.scenarioId === scenarioId) list.push(r);
    }
    return list;
  }

  clear(): void { this.runs.clear(); this.results.clear(); }
}

// ═══════════════════════════════════════════
// Report
// ═══════════════════════════════════════════

export class InMemoryReportRepository implements IReportRepository {
  private store = new Map<string, ValidationReport>();

  async insert(r: ValidationReport): Promise<void> {
    const k = key(r.tenantId, r.id);
    if (this.store.has(k)) throw new Error(`Duplicate report id: ${r.id}`);
    this.store.set(k, r);
  }

  async findById(tenantId: string, id: string): Promise<ValidationReport | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByRun(tenantId: string, runId: string): Promise<ValidationReport | null> {
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId && r.runId === runId) return r;
    }
    return null;
  }

  async listByTenant(tenantId: string, limit?: number): Promise<ValidationReport[]> {
    const list: ValidationReport[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId) list.push(r);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Metrics
// ═══════════════════════════════════════════

type MetricsRecord = ValidationMetrics & { id: string; tenantId: string; runId: string; createdAt: string };

export class InMemoryMetricsRepository implements IMetricsRepository {
  private store = new Map<string, MetricsRecord>();

  async insert(m: MetricsRecord): Promise<void> {
    const k = key(m.tenantId, m.id);
    this.store.set(k, m);
  }

  async findByTenant(tenantId: string, limit?: number): Promise<MetricsRecord[]> {
    const list: MetricsRecord[] = [];
    for (const m of this.store.values()) {
      if (m.tenantId === tenantId) list.push(m);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Certification
// ═══════════════════════════════════════════

export class InMemoryCertificationRepository implements ICertificationRepository {
  private store = new Map<string, Certification>();

  async insert(c: Certification): Promise<void> {
    const k = key(c.tenantId, c.id);
    if (this.store.has(k)) throw new Error(`Duplicate certification id: ${c.id}`);
    this.store.set(k, c);
  }

  async findById(tenantId: string, id: string): Promise<Certification | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByEngine(tenantId: string, engineId: string): Promise<Certification[]> {
    const list: Certification[] = [];
    for (const c of this.store.values()) {
      if (c.tenantId === tenantId && c.engineId === engineId) list.push(c);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<Certification>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Certification not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export class InMemoryValidationAuditRepository implements IValidationAuditRepository {
  private store = new Map<string, ValidationAuditRecord>();
  private counter = 0;

  async insert(record: Omit<ValidationAuditRecord, 'id' | 'createdAt'>): Promise<ValidationAuditRecord> {
    this.counter += 1;
    const full: ValidationAuditRecord = {
      ...record,
      id: `val-audit-${this.counter}`,
      createdAt: new Date().toISOString(),
    };
    this.store.set(full.id, full);
    return full;
  }

  async findByTenant(tenantId: string, limit?: number): Promise<ValidationAuditRecord[]> {
    const list: ValidationAuditRecord[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId) list.push(r);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  async findByRun(tenantId: string, runId: string, limit?: number): Promise<ValidationAuditRecord[]> {
    const list: ValidationAuditRecord[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId !== tenantId) continue;
      if (r.runId !== runId) continue;
      list.push(r);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  clear(): void { this.store.clear(); this.counter = 0; }
}
