/**
 * In-Memory Repositories — Workflow / Instance / ApprovalStep / Task / Timer / History / Timeline / Audit
 *
 * 사장님 확립: Multi-Tenant key = `${tenantId}::${id}`
 */

import type {
  IWorkflowRepository,
  IWorkflowInstanceRepository,
  IApprovalStepRepository,
  ITaskRepository,
  ITimerRepository,
  IHistoryRepository,
  ITimelineRepository,
  IWorkflowAuditRepository,
  Workflow,
  WorkflowInstance,
  ApprovalStep,
  WorkflowTask,
  WorkflowTimer,
  WorkflowHistoryEntry,
  WorkflowTimelineEntry,
  WorkflowAuditRecord,
  WorkflowSearchCriteria,
  WorkflowSearchResult,
  InstanceSearchCriteria,
  InstanceSearchResult,
} from '../interfaces/index.js';

function key(t: string, id: string): string { return `${t}::${id}`; }

// ═══════════════════════════════════════════
// Workflow
// ═══════════════════════════════════════════

export class InMemoryWorkflowRepository implements IWorkflowRepository {
  private store = new Map<string, Workflow>();

  async insert(workflow: Workflow): Promise<void> {
    const k = key(workflow.tenantId, workflow.id);
    if (this.store.has(k)) throw new Error(`Duplicate workflow id: ${workflow.id}`);
    this.store.set(k, workflow);
  }

  async findById(tenantId: string, id: string): Promise<Workflow | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findBySlug(tenantId: string, organizationId: string, slug: string): Promise<Workflow | null> {
    for (const wf of this.store.values()) {
      if (wf.tenantId === tenantId && wf.organizationId === organizationId && wf.slug === slug) return wf;
    }
    return null;
  }

  async update(tenantId: string, id: string, patch: Partial<Workflow>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Workflow not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const k = key(tenantId, id);
    if (!this.store.has(k)) throw new Error(`Workflow not found: ${id}`);
    this.store.delete(k);
  }

  async search(criteria: WorkflowSearchCriteria): Promise<WorkflowSearchResult> {
    const limit = criteria.limit ?? 20;
    const offset = criteria.offset ?? 0;
    const sortBy = criteria.sortBy ?? 'createdAt';
    const sortOrder = criteria.sortOrder ?? 'desc';

    let candidates: Workflow[] = [];
    for (const wf of this.store.values()) {
      if (wf.tenantId !== criteria.tenantId) continue;
      if (criteria.organizationId !== undefined && wf.organizationId !== criteria.organizationId) continue;
      if (criteria.type !== undefined && wf.type !== criteria.type) continue;
      if (criteria.status !== undefined && wf.status !== criteria.status) continue;
      if (criteria.tags !== undefined && !criteria.tags.every((t) => wf.tags.includes(t))) continue;
      if (criteria.query !== undefined) {
        const q = criteria.query.toLowerCase();
        const hay = `${wf.name} ${wf.slug} ${wf.description ?? ''}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      candidates.push(wf);
    }

    candidates.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'updatedAt') cmp = a.updatedAt.localeCompare(b.updatedAt);
      else cmp = a.createdAt.localeCompare(b.createdAt);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    const total = candidates.length;
    return {
      workflows: candidates.slice(offset, offset + limit),
      total, limit, offset,
    };
  }

  async countByOrganization(tenantId: string, organizationId: string): Promise<number> {
    let count = 0;
    for (const wf of this.store.values()) {
      if (wf.tenantId === tenantId && wf.organizationId === organizationId) count += 1;
    }
    return count;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Workflow Instance
// ═══════════════════════════════════════════

export class InMemoryWorkflowInstanceRepository implements IWorkflowInstanceRepository {
  private store = new Map<string, WorkflowInstance>();

  async insert(instance: WorkflowInstance): Promise<void> {
    const k = key(instance.tenantId, instance.id);
    if (this.store.has(k)) throw new Error(`Duplicate instance id: ${instance.id}`);
    this.store.set(k, instance);
  }

  async findById(tenantId: string, id: string): Promise<WorkflowInstance | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByInstanceNumber(tenantId: string, instanceNumber: string): Promise<WorkflowInstance | null> {
    for (const inst of this.store.values()) {
      if (inst.tenantId === tenantId && inst.instanceNumber === instanceNumber) return inst;
    }
    return null;
  }

  async update(tenantId: string, id: string, patch: Partial<WorkflowInstance>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Instance not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  async search(criteria: InstanceSearchCriteria): Promise<InstanceSearchResult> {
    const limit = criteria.limit ?? 20;
    const offset = criteria.offset ?? 0;

    let candidates: WorkflowInstance[] = [];
    for (const inst of this.store.values()) {
      if (inst.tenantId !== criteria.tenantId) continue;
      if (criteria.organizationId !== undefined && inst.organizationId !== criteria.organizationId) continue;
      if (criteria.workflowId !== undefined && inst.workflowId !== criteria.workflowId) continue;
      if (criteria.status !== undefined && inst.status !== criteria.status) continue;
      if (criteria.currentState !== undefined && inst.currentState !== criteria.currentState) continue;
      if (criteria.initiatedBy !== undefined && inst.initiatedBy !== criteria.initiatedBy) continue;
      candidates.push(inst);
    }

    candidates.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const total = candidates.length;
    return {
      instances: candidates.slice(offset, offset + limit),
      total, limit, offset,
    };
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Approval Step
// ═══════════════════════════════════════════

export class InMemoryApprovalStepRepository implements IApprovalStepRepository {
  private store = new Map<string, ApprovalStep>();

  async insert(step: ApprovalStep): Promise<void> {
    const k = key(step.tenantId, step.id);
    if (this.store.has(k)) throw new Error(`Duplicate approval step id: ${step.id}`);
    this.store.set(k, step);
  }

  async findById(tenantId: string, id: string): Promise<ApprovalStep | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByInstance(tenantId: string, instanceId: string): Promise<ApprovalStep[]> {
    const list: ApprovalStep[] = [];
    for (const step of this.store.values()) {
      if (step.tenantId === tenantId && step.instanceId === instanceId) list.push(step);
    }
    return list.sort((a, b) => a.sequence - b.sequence);
  }

  async update(tenantId: string, id: string, patch: Partial<ApprovalStep>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Approval step not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Task
// ═══════════════════════════════════════════

export class InMemoryTaskRepository implements ITaskRepository {
  private store = new Map<string, WorkflowTask>();

  async insert(task: WorkflowTask): Promise<void> {
    const k = key(task.tenantId, task.id);
    if (this.store.has(k)) throw new Error(`Duplicate task id: ${task.id}`);
    this.store.set(k, task);
  }

  async findById(tenantId: string, id: string): Promise<WorkflowTask | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByInstance(tenantId: string, instanceId: string): Promise<WorkflowTask[]> {
    const list: WorkflowTask[] = [];
    for (const task of this.store.values()) {
      if (task.tenantId === tenantId && task.instanceId === instanceId) list.push(task);
    }
    return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async findByAssignee(tenantId: string, assigneeId: string): Promise<WorkflowTask[]> {
    const list: WorkflowTask[] = [];
    for (const task of this.store.values()) {
      if (task.tenantId === tenantId && task.assigneeId === assigneeId) list.push(task);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<WorkflowTask>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Task not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Timer
// ═══════════════════════════════════════════

export class InMemoryTimerRepository implements ITimerRepository {
  private store = new Map<string, WorkflowTimer>();

  async insert(timer: WorkflowTimer): Promise<void> {
    const k = key(timer.tenantId, timer.id);
    if (this.store.has(k)) throw new Error(`Duplicate timer id: ${timer.id}`);
    this.store.set(k, timer);
  }

  async findById(tenantId: string, id: string): Promise<WorkflowTimer | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByInstance(tenantId: string, instanceId: string): Promise<WorkflowTimer[]> {
    const list: WorkflowTimer[] = [];
    for (const timer of this.store.values()) {
      if (timer.tenantId === tenantId && timer.instanceId === instanceId) list.push(timer);
    }
    return list;
  }

  async findExpired(tenantId: string, now: string): Promise<WorkflowTimer[]> {
    const list: WorkflowTimer[] = [];
    for (const timer of this.store.values()) {
      if (timer.tenantId === tenantId && timer.status === 'Scheduled' && timer.fireAt <= now) {
        list.push(timer);
      }
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<WorkflowTimer>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Timer not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// History (append-only)
// ═══════════════════════════════════════════

export class InMemoryHistoryRepository implements IHistoryRepository {
  private store = new Map<string, WorkflowHistoryEntry>();

  async insert(entry: WorkflowHistoryEntry): Promise<void> {
    const k = key(entry.tenantId, entry.id);
    this.store.set(k, entry);
  }

  async findByInstance(tenantId: string, instanceId: string, limit?: number): Promise<WorkflowHistoryEntry[]> {
    const list: WorkflowHistoryEntry[] = [];
    for (const entry of this.store.values()) {
      if (entry.tenantId === tenantId && entry.instanceId === instanceId) list.push(entry);
    }
    list.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Timeline
// ═══════════════════════════════════════════

export class InMemoryTimelineRepository implements ITimelineRepository {
  private store = new Map<string, WorkflowTimelineEntry>();

  async insert(entry: WorkflowTimelineEntry): Promise<void> {
    const k = key(entry.tenantId, entry.id);
    this.store.set(k, entry);
  }

  async findByInstance(tenantId: string, instanceId: string, limit?: number): Promise<WorkflowTimelineEntry[]> {
    const list: WorkflowTimelineEntry[] = [];
    for (const entry of this.store.values()) {
      if (entry.tenantId === tenantId && entry.instanceId === instanceId) list.push(entry);
    }
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export class InMemoryWorkflowAuditRepository implements IWorkflowAuditRepository {
  private store = new Map<string, WorkflowAuditRecord>();
  private counter = 0;

  async insert(record: Omit<WorkflowAuditRecord, 'id' | 'createdAt'>): Promise<WorkflowAuditRecord> {
    this.counter += 1;
    const full: WorkflowAuditRecord = {
      ...record,
      id: `workflow-audit-${this.counter}`,
      createdAt: new Date().toISOString(),
    };
    this.store.set(full.id, full);
    return full;
  }

  async findByTenant(tenantId: string, limit?: number): Promise<WorkflowAuditRecord[]> {
    const list: WorkflowAuditRecord[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId) list.push(r);
    }
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  async findByInstance(tenantId: string, instanceId: string, limit?: number): Promise<WorkflowAuditRecord[]> {
    const list: WorkflowAuditRecord[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId !== tenantId) continue;
      if (r.instanceId !== instanceId) continue;
      list.push(r);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  clear(): void { this.store.clear(); this.counter = 0; }
}
