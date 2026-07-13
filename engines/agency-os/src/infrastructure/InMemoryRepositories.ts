/**
 * Agency OS — In-Memory Repositories
 */
import type {
  AgencyWorkflow, Swarm, AgencyTask, ExpertDebate, ExecutiveDecision,
  ExecutiveMemory, AgencyAuditRecord,
  IWorkflowRepository, ISwarmRepository, ITaskRepository,
  IDebateRepository, IExecutiveDecisionRepository,
  IExecutiveMemoryRepository, IAgencyAuditRepository,
  SwarmType, MemoryCategory,
} from '../interfaces/index.js';

export class InMemoryWorkflowRepository implements IWorkflowRepository {
  private store = new Map<string, AgencyWorkflow>();
  async insert(w: AgencyWorkflow): Promise<void> { this.store.set(`${w.tenantId}::${w.id}`, { ...w }); }
  async findById(t: string, id: string): Promise<AgencyWorkflow | null> { const r = this.store.get(`${t}::${id}`); return r ? { ...r } : null; }
  async findByOrganization(t: string, o: string): Promise<AgencyWorkflow[]> {
    const results: AgencyWorkflow[] = [];
    this.store.forEach(w => { if (w.tenantId === t && w.organizationId === o) results.push({ ...w }); });
    return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async update(t: string, id: string, patch: Partial<AgencyWorkflow>): Promise<void> {
    const k = `${t}::${id}`; const e = this.store.get(k); if (!e) return;
    this.store.set(k, { ...e, ...patch, updatedAt: new Date().toISOString() });
  }
  clear(): void { this.store.clear(); }
}

export class InMemorySwarmRepository implements ISwarmRepository {
  private store = new Map<string, { swarm: Swarm; workflowId: string }>();
  async insert(s: Swarm & { workflowId?: string }): Promise<void> { this.store.set(`${s.tenantId}::${s.id}`, { swarm: { ...s }, workflowId: s.workflowId ?? '' }); }
  async findById(t: string, id: string): Promise<Swarm | null> { const r = this.store.get(`${t}::${id}`); return r ? { ...r.swarm } : null; }
  async findByWorkflow(t: string, wid: string): Promise<Swarm[]> {
    const results: Swarm[] = [];
    this.store.forEach(v => { if (v.swarm.tenantId === t && v.workflowId === wid) results.push({ ...v.swarm }); });
    return results;
  }
  async findByType(t: string, type: SwarmType): Promise<Swarm[]> {
    const results: Swarm[] = [];
    this.store.forEach(v => { if (v.swarm.tenantId === t && v.swarm.type === type) results.push({ ...v.swarm }); });
    return results;
  }
  async update(t: string, id: string, patch: Partial<Swarm>): Promise<void> {
    const k = `${t}::${id}`; const e = this.store.get(k); if (!e) return;
    this.store.set(k, { ...e, swarm: { ...e.swarm, ...patch } });
  }
  clear(): void { this.store.clear(); }
}

export class InMemoryTaskRepository implements ITaskRepository {
  private store = new Map<string, { task: AgencyTask; workflowId: string }>();
  async insert(t: AgencyTask & { workflowId?: string }): Promise<void> { this.store.set(`${t.tenantId}::${t.id}`, { task: { ...t }, workflowId: t.workflowId ?? '' }); }
  async findById(t: string, id: string): Promise<AgencyTask | null> { const r = this.store.get(`${t}::${id}`); return r ? { ...r.task } : null; }
  async findByWorkflow(t: string, wid: string): Promise<AgencyTask[]> {
    const results: AgencyTask[] = [];
    this.store.forEach(v => { if (v.task.tenantId === t && v.workflowId === wid) results.push({ ...v.task }); });
    return results;
  }
  async findBySwarm(t: string, sid: string): Promise<AgencyTask[]> {
    const results: AgencyTask[] = [];
    this.store.forEach(v => { if (v.task.tenantId === t && v.task.assignedSwarmId === sid) results.push({ ...v.task }); });
    return results;
  }
  async update(t: string, id: string, patch: Partial<AgencyTask>): Promise<void> {
    const k = `${t}::${id}`; const e = this.store.get(k); if (!e) return;
    this.store.set(k, { ...e, task: { ...e.task, ...patch, updatedAt: new Date().toISOString() } });
  }
  clear(): void { this.store.clear(); }
}

export class InMemoryDebateRepository implements IDebateRepository {
  private store = new Map<string, { debate: ExpertDebate; workflowId: string }>();
  async insert(d: ExpertDebate & { workflowId?: string }): Promise<void> { this.store.set(`${d.tenantId}::${d.id}`, { debate: { ...d }, workflowId: d.workflowId ?? '' }); }
  async findById(t: string, id: string): Promise<ExpertDebate | null> { const r = this.store.get(`${t}::${id}`); return r ? { ...r.debate } : null; }
  async findByWorkflow(t: string, wid: string): Promise<ExpertDebate[]> {
    const results: ExpertDebate[] = [];
    this.store.forEach(v => { if (v.debate.tenantId === t && v.workflowId === wid) results.push({ ...v.debate }); });
    return results;
  }
  clear(): void { this.store.clear(); }
}

export class InMemoryExecutiveDecisionRepository implements IExecutiveDecisionRepository {
  private store = new Map<string, ExecutiveDecision>();
  async insert(d: ExecutiveDecision): Promise<void> { this.store.set(`${d.tenantId}::${d.id}`, { ...d }); }
  async findById(t: string, id: string): Promise<ExecutiveDecision | null> { const r = this.store.get(`${t}::${id}`); return r ? { ...r } : null; }
  async findByOrganization(t: string, o: string): Promise<ExecutiveDecision[]> {
    const results: ExecutiveDecision[] = [];
    this.store.forEach(d => { if (d.tenantId === t && d.organizationId === o) results.push({ ...d }); });
    return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  clear(): void { this.store.clear(); }
}

export class InMemoryExecutiveMemoryRepository implements IExecutiveMemoryRepository {
  private store = new Map<string, ExecutiveMemory>();
  async insert(m: ExecutiveMemory): Promise<void> { this.store.set(`${m.tenantId}::${m.id}`, { ...m }); }
  async findById(t: string, id: string): Promise<ExecutiveMemory | null> { const r = this.store.get(`${t}::${id}`); return r ? { ...r } : null; }
  async findByOrganization(t: string, o: string): Promise<ExecutiveMemory[]> {
    const results: ExecutiveMemory[] = [];
    this.store.forEach(m => { if (m.tenantId === t && m.organizationId === o) results.push({ ...m }); });
    return results.sort((a, b) => b.confidence - a.confidence);
  }
  async findByCategory(t: string, o: string, cat: MemoryCategory): Promise<ExecutiveMemory[]> {
    return (await this.findByOrganization(t, o)).filter(m => m.category === cat);
  }
  async update(t: string, id: string, patch: Partial<ExecutiveMemory>): Promise<void> {
    const k = `${t}::${id}`; const e = this.store.get(k); if (!e) return;
    this.store.set(k, { ...e, ...patch, updatedAt: new Date().toISOString() });
  }
  clear(): void { this.store.clear(); }
}

export class InMemoryAgencyAuditRepository implements IAgencyAuditRepository {
  private store: AgencyAuditRecord[] = [];
  private idCounter = 0;
  async insert(record: Omit<AgencyAuditRecord, 'id' | 'createdAt'>): Promise<AgencyAuditRecord> {
    const full: AgencyAuditRecord = { ...record, id: `agency-audit-${++this.idCounter}`, createdAt: new Date().toISOString() };
    this.store.push(full);
    return full;
  }
  async findByTenant(t: string, limit = 100): Promise<AgencyAuditRecord[]> {
    return this.store.filter(r => r.tenantId === t).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit).map(r => ({ ...r }));
  }
  async findByOrganization(t: string, o: string, limit = 100): Promise<AgencyAuditRecord[]> {
    return this.store.filter(r => r.tenantId === t && r.organizationId === o).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit).map(r => ({ ...r }));
  }
  clear(): void { this.store = []; this.idCounter = 0; }
}