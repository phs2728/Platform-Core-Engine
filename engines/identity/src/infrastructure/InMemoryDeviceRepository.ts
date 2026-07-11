/**
 * In-Memory Device Repository (Epic 9 — Device Trust)
 */
import type { IDeviceRepository, DeviceRecord } from '../interfaces/index.js';

export class InMemoryDeviceRepository implements IDeviceRepository {
  private readonly records = new Map<string, DeviceRecord>();

  async insert(record: DeviceRecord): Promise<void> {
    this.records.set(record.id, record);
  }

  async findByFingerprint(accountId: string, fingerprint: string): Promise<DeviceRecord | null> {
    for (const record of this.records.values()) {
      if (record.accountId === accountId && record.fingerprint === fingerprint && !record.revokedAt) {
        return record;
      }
    }
    return null;
  }

  async findByAccount(accountId: string): Promise<DeviceRecord[]> {
    return Array.from(this.records.values()).filter(
      (r) => r.accountId === accountId && !r.revokedAt,
    );
  }

  async trust(id: string): Promise<void> {
    const record = this.records.get(id);
    if (record) {
      record.trusted = true;
    }
  }

  async revoke(id: string): Promise<void> {
    const record = this.records.get(id);
    if (record) {
      record.revokedAt = new Date().toISOString();
      record.trusted = false;
    }
  }

  async updateLastSeen(id: string): Promise<void> {
    const record = this.records.get(id);
    if (record) {
      record.lastSeenAt = new Date().toISOString();
    }
  }
}
