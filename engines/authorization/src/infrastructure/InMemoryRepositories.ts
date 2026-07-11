import type {
  IRoleRepository, IRole,
  IPermissionRepository, IPermission,
  IRolePermissionRepository, IRolePermission,
  IRoleAssignmentRepository, IRoleAssignment,
  IPolicyRepository, IPolicy,
  IAuditLogRepository, AuditLogRecord, AuditEventType,
} from "../interfaces/index.js";

// ═══ Role Repository ═══
export class InMemoryRoleRepository implements IRoleRepository {
  private records = new Map<string, IRole>();
  async insert(role: IRole) { this.records.set(role.id, role); }
  async findById(t: string, id: string) { const r = this.records.get(id); return r && r.tenantId === t ? r : null; }
  async findByName(t: string, name: string) { for (const r of this.records.values()) if (r.tenantId === t && r.name === name) return r; return null; }
  async findByTenant(t: string) { return [...this.records.values()].filter(r => r.tenantId === t); }
  async update(id: string, patch: Partial<IRole>) { const r = this.records.get(id); if (r) Object.assign(r, patch, { updatedAt: new Date().toISOString() }); }
  async delete(id: string) { this.records.delete(id); }
}

// ═══ Permission Repository ═══
export class InMemoryPermissionRepository implements IPermissionRepository {
  private records = new Map<string, IPermission>();
  async insert(p: IPermission) { this.records.set(p.id, p); }
  async findByKey(t: string, key: string) { for (const p of this.records.values()) if (p.tenantId === t && p.key === key) return p; return null; }
  async findByTenant(t: string) { return [...this.records.values()].filter(p => p.tenantId === t); }
  async findByResource(t: string, resource: string) { return [...this.records.values()].filter(p => p.tenantId === t && p.resource === resource); }
  async delete(id: string) { this.records.delete(id); }
}

// ═══ Role-Permission Repository ═══
export class InMemoryRolePermissionRepository implements IRolePermissionRepository {
  private records: IRolePermission[] = [];
  async insert(rp: IRolePermission) { this.records.push(rp); }
  async findByRole(roleId: string) { return this.records.filter(r => r.roleId === roleId); }
  async findByRoleAndPermission(roleId: string, key: string) { return this.records.find(r => r.roleId === roleId && r.permissionKey === key) ?? null; }
  async delete(id: string) { this.records = this.records.filter(r => r.id !== id); }
  async deleteByRole(roleId: string) { this.records = this.records.filter(r => r.roleId !== roleId); }
}

// ═══ Role Assignment Repository ═══
export class InMemoryRoleAssignmentRepository implements IRoleAssignmentRepository {
  private records: IRoleAssignment[] = [];
  async insert(a: IRoleAssignment) { this.records.push(a); }
  async findByAccount(t: string, accountId: string) { return this.records.filter(a => a.tenantId === t && a.accountId === accountId); }
  async findByRole(t: string, roleId: string) { return this.records.filter(a => a.tenantId === t && a.roleId === roleId); }
  async delete(id: string) { this.records = this.records.filter(r => r.id !== id); }
  async deleteByAccount(t: string, accountId: string) { const before = this.records.length; this.records = this.records.filter(r => !(r.tenantId === t && r.accountId === accountId)); return before - this.records.length; }
}

// ═══ Policy Repository ═══
export class InMemoryPolicyRepository implements IPolicyRepository {
  private records = new Map<string, IPolicy>();
  async insert(p: IPolicy) { this.records.set(p.id, p); }
  async findById(t: string, id: string) { const p = this.records.get(id); return p && p.tenantId === t ? p : null; }
  async findByTenant(t: string) { return [...this.records.values()].filter(p => p.tenantId === t); }
  async findByPermissionPattern(t: string, pattern: string) { return [...this.records.values()].filter(p => p.tenantId === t && p.permissionPattern === pattern); }
  async update(id: string, patch: Partial<IPolicy>) { const p = this.records.get(id); if (p) Object.assign(p, patch, { updatedAt: new Date().toISOString() }); }
  async delete(id: string) { this.records.delete(id); }
}

// ═══ Audit Log Repository ═══
export class InMemoryAuditLogRepository implements IAuditLogRepository {
  private records: AuditLogRecord[] = [];
  private counter = 0;
  async insert(r: Omit<AuditLogRecord, "id" | "createdAt">) { const full: AuditLogRecord = { ...r, id: `audit-${++this.counter}`, createdAt: new Date().toISOString() }; this.records.push(full); return full; }
  async findByTenant(t: string, limit = 1000) { return this.records.filter(r => r.tenantId === t).slice(0, limit); }
  async findByAccount(accountId: string) { return this.records.filter(r => r.accountId === accountId); }
  async all() { return [...this.records]; }
}
