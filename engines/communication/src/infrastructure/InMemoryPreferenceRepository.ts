import type {
  IPreferenceRepository,
  IUserPreference,
} from '../interfaces/index.js';

export class InMemoryPreferenceRepository implements IPreferenceRepository {
  private readonly records = new Map<string, IUserPreference>(); // accountId → pref

  async upsert(pref: IUserPreference): Promise<void> {
    this.records.set(pref.accountId, pref);
  }

  async findByAccount(accountId: string): Promise<IUserPreference | null> {
    return this.records.get(accountId) ?? null;
  }
}
