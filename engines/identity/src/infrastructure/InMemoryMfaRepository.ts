/**
 * In-Memory MFA Repository (Epic 4 — MFA)
 */
import type {
  IMfaRepository,
  MfaEnrollmentRecord,
  MfaMethod,
  BackupCodeRecord,
} from '../interfaces/index.js';

export class InMemoryMfaRepository implements IMfaRepository {
  private readonly enrollments = new Map<string, MfaEnrollmentRecord>();
  private readonly backupCodes: BackupCodeRecord[] = [];

  async insertEnrollment(record: MfaEnrollmentRecord): Promise<void> {
    this.enrollments.set(record.id, record);
  }

  async findEnrollments(accountId: string): Promise<MfaEnrollmentRecord[]> {
    return Array.from(this.enrollments.values()).filter(
      (r) => r.accountId === accountId && r.enabled && !r.disabledAt,
    );
  }

  async findEnabledByMethod(accountId: string, method: MfaMethod): Promise<MfaEnrollmentRecord | null> {
    const enrollments = await this.findEnrollments(accountId);
    return enrollments.find((r) => r.method === method) ?? null;
  }

  async disableEnrollment(id: string): Promise<void> {
    const record = this.enrollments.get(id);
    if (record) {
      record.enabled = false;
      record.disabledAt = new Date().toISOString();
    }
  }

  async insertBackupCodes(records: BackupCodeRecord[]): Promise<void> {
    this.backupCodes.push(...records);
  }

  async findBackupCode(accountId: string, codeHash: string): Promise<BackupCodeRecord | null> {
    return (
      this.backupCodes.find(
        (r) => r.accountId === accountId && r.codeHash === codeHash && !r.usedAt,
      ) ?? null
    );
  }

  async markBackupCodeUsed(id: string): Promise<void> {
    const record = this.backupCodes.find((r) => r.id === id);
    if (record) {
      record.usedAt = new Date().toISOString();
    }
  }

  async countUnusedBackupCodes(accountId: string): Promise<number> {
    return this.backupCodes.filter((r) => r.accountId === accountId && !r.usedAt).length;
  }

  async allEnrollments(): Promise<MfaEnrollmentRecord[]> {
    return Array.from(this.enrollments.values());
  }
}
