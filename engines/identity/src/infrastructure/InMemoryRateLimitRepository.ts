/**
 * In-Memory Rate Limit Repository (Epic 6 — Security)
 */
import type { IRateLimitRepository, RateLimitEntry } from '../interfaces/index.js';

export class InMemoryRateLimitRepository implements IRateLimitRepository {
  private readonly entries = new Map<string, RateLimitEntry>();

  async increment(key: string, windowMs: number): Promise<{ count: number; blocked: boolean }> {
    const now = Date.now();
    let entry = this.entries.get(key);

    if (!entry || now - new Date(entry.windowStart).getTime() > windowMs) {
      entry = { key, count: 0, windowStart: new Date(now).toISOString(), blockedUntil: null };
      this.entries.set(key, entry);
    }

    if (entry.blockedUntil && new Date(entry.blockedUntil).getTime() > now) {
      return { count: entry.count, blocked: true };
    }

    entry.count += 1;
    return { count: entry.count, blocked: false };
  }

  async block(key: string, durationMs: number): Promise<void> {
    const entry = this.entries.get(key);
    const blockedUntil = new Date(Date.now() + durationMs).toISOString();
    if (entry) {
      entry.blockedUntil = blockedUntil;
    } else {
      this.entries.set(key, {
        key,
        count: 0,
        windowStart: new Date().toISOString(),
        blockedUntil,
      });
    }
  }

  async reset(key: string): Promise<void> {
    this.entries.delete(key);
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    return this.entries.get(key) ?? null;
  }
}
