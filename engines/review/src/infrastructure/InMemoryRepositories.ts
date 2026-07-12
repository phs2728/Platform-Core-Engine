/**
 * In-Memory Repositories — Review/Reply/Report/Reaction/Helpful/Reputation/Audit
 *
 * 사장님 확립: Multi-Tenant key = `${tenantId}::${id}`
 */

import type {
  IReviewRepository,
  IReplyRepository,
  IReportRepository,
  IReactionRepository,
  IHelpfulVoteRepository,
  IReputationRepository,
  IReviewAuditRepository,
  Review,
  ReviewReply,
  ReviewReport,
  ReviewReaction,
  HelpfulVote,
  Reputation,
  ReviewAuditRecord,
  ReviewSearchCriteria,
  ReviewSearchResult,
  ReactionType,
} from '../interfaces/index.js';

function key(t: string, id: string): string { return `${t}::${id}`; }

// ═══════════════════════════════════════════
// Review
// ═══════════════════════════════════════════

export class InMemoryReviewRepository implements IReviewRepository {
  private store = new Map<string, Review>();

  async insert(r: Review): Promise<void> {
    const k = key(r.tenantId, r.id);
    if (this.store.has(k)) throw new Error(`Duplicate review id: ${r.id}`);
    this.store.set(k, r);
  }

  async findById(tenantId: string, id: string): Promise<Review | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByTarget(tenantId: string, targetRef: string): Promise<Review[]> {
    const list: Review[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId && r.targetRef === targetRef) list.push(r);
    }
    return list;
  }

  async findByReviewer(tenantId: string, reviewerId: string): Promise<Review[]> {
    const list: Review[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId && r.reviewerId === reviewerId) list.push(r);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<Review>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Review not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  async search(criteria: ReviewSearchCriteria): Promise<ReviewSearchResult> {
    const limit = criteria.limit ?? 20;
    const offset = criteria.offset ?? 0;
    const sortBy = criteria.sortBy ?? 'createdAt';
    const sortOrder = criteria.sortOrder ?? 'desc';

    let candidates: Review[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId !== criteria.tenantId) continue;
      if (r.status === 'Deleted') continue;
      if (criteria.organizationId !== undefined && r.organizationId !== criteria.organizationId) continue;
      if (criteria.targetRef !== undefined && r.targetRef !== criteria.targetRef) continue;
      if (criteria.targetType !== undefined && r.targetType !== criteria.targetType) continue;
      if (criteria.reviewerId !== undefined && r.reviewerId !== criteria.reviewerId) continue;
      if (criteria.status !== undefined && r.status !== criteria.status) continue;
      if (criteria.verified !== undefined && r.verified !== criteria.verified) continue;
      if (criteria.minRating !== undefined && r.rating.score < criteria.minRating) continue;
      if (criteria.maxRating !== undefined && r.rating.score > criteria.maxRating) continue;
      if (criteria.language !== undefined && r.language !== criteria.language) continue;
      if (criteria.tags !== undefined && !criteria.tags.every((t) => r.tags.includes(t))) continue;
      if (criteria.query !== undefined) {
        const q = criteria.query.toLowerCase();
        const title = r.title.toLowerCase();
        const content = r.content.toLowerCase();
        if (!title.includes(q) && !content.includes(q)) continue;
      }
      candidates.push(r);
    }

    candidates.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'createdAt') cmp = a.createdAt.localeCompare(b.createdAt);
      else if (sortBy === 'rating') cmp = a.rating.score - b.rating.score;
      else if (sortBy === 'helpfulCount') cmp = a.helpfulCount - b.helpfulCount;
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    const total = candidates.length;
    return { reviews: candidates.slice(offset, offset + limit), total, limit, offset };
  }

  async existsByReviewerAndTarget(
    tenantId: string, reviewerId: string, targetRef: string, excludeId?: string,
  ): Promise<boolean> {
    for (const r of this.store.values()) {
      if (r.tenantId !== tenantId) continue;
      if (r.reviewerId !== reviewerId) continue;
      if (r.targetRef !== targetRef) continue;
      if (excludeId !== undefined && r.id === excludeId) continue;
      if (r.status === 'Deleted') continue;
      return true;
    }
    return false;
  }

  async findByOrganization(tenantId: string, organizationId: string): Promise<Review[]> {
    const list: Review[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId && r.organizationId === organizationId) list.push(r);
    }
    return list;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Reply
// ═══════════════════════════════════════════

export class InMemoryReplyRepository implements IReplyRepository {
  private store = new Map<string, ReviewReply>();

  async insert(r: ReviewReply): Promise<void> {
    const k = key(r.tenantId, r.id);
    if (this.store.has(k)) throw new Error(`Duplicate reply id: ${r.id}`);
    this.store.set(k, r);
  }

  async findById(tenantId: string, id: string): Promise<ReviewReply | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByReview(tenantId: string, reviewId: string): Promise<ReviewReply[]> {
    const list: ReviewReply[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId && r.reviewId === reviewId) list.push(r);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<ReviewReply>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Reply not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Report
// ═══════════════════════════════════════════

export class InMemoryReportRepository implements IReportRepository {
  private store = new Map<string, ReviewReport>();

  async insert(r: ReviewReport): Promise<void> {
    const k = key(r.tenantId, r.id);
    if (this.store.has(k)) throw new Error(`Duplicate report id: ${r.id}`);
    this.store.set(k, r);
  }

  async findById(tenantId: string, id: string): Promise<ReviewReport | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByReview(tenantId: string, reviewId: string): Promise<ReviewReport[]> {
    const list: ReviewReport[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId && r.reviewId === reviewId) list.push(r);
    }
    return list;
  }

  async findByStatus(tenantId: string, status: string): Promise<ReviewReport[]> {
    const list: ReviewReport[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId && r.status === status) list.push(r);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<ReviewReport>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Report not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Reaction
// ═══════════════════════════════════════════

export class InMemoryReactionRepository implements IReactionRepository {
  private store = new Map<string, ReviewReaction>();

  async insert(r: ReviewReaction): Promise<void> {
    const k = key(r.tenantId, r.id);
    if (this.store.has(k)) throw new Error(`Duplicate reaction id: ${r.id}`);
    this.store.set(k, r);
  }

  async findById(tenantId: string, id: string): Promise<ReviewReaction | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByReviewAndUser(
    tenantId: string, reviewId: string, userId: string, type: ReactionType,
  ): Promise<ReviewReaction | null> {
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId && r.reviewId === reviewId && r.userId === userId && r.type === type) return r;
    }
    return null;
  }

  async findByReview(tenantId: string, reviewId: string): Promise<ReviewReaction[]> {
    const list: ReviewReaction[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId && r.reviewId === reviewId) list.push(r);
    }
    return list;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    this.store.delete(key(tenantId, id));
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Helpful Vote
// ═══════════════════════════════════════════

export class InMemoryHelpfulVoteRepository implements IHelpfulVoteRepository {
  private store = new Map<string, HelpfulVote>();

  async insert(v: HelpfulVote): Promise<void> {
    const k = key(v.tenantId, v.id);
    if (this.store.has(k)) throw new Error(`Duplicate vote id: ${v.id}`);
    this.store.set(k, v);
  }

  async findByReviewAndVoter(tenantId: string, reviewId: string, voterId: string): Promise<HelpfulVote | null> {
    for (const v of this.store.values()) {
      if (v.tenantId === tenantId && v.reviewId === reviewId && v.voterId === voterId) return v;
    }
    return null;
  }

  async findByReview(tenantId: string, reviewId: string): Promise<HelpfulVote[]> {
    const list: HelpfulVote[] = [];
    for (const v of this.store.values()) {
      if (v.tenantId === tenantId && v.reviewId === reviewId) list.push(v);
    }
    return list;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    this.store.delete(key(tenantId, id));
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Reputation
// ═══════════════════════════════════════════

export class InMemoryReputationRepository implements IReputationRepository {
  private store = new Map<string, Reputation>();

  async insert(rep: Reputation): Promise<void> {
    const k = key(rep.tenantId, rep.id);
    if (this.store.has(k)) throw new Error(`Duplicate reputation id: ${rep.id}`);
    this.store.set(k, rep);
  }

  async findByTarget(tenantId: string, targetRef: string): Promise<Reputation | null> {
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId && r.targetRef === targetRef) return r;
    }
    return null;
  }

  async update(tenantId: string, id: string, patch: Partial<Reputation>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Reputation not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  async listByTenant(tenantId: string, limit?: number): Promise<Reputation[]> {
    const list: Reputation[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId) list.push(r);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export class InMemoryReviewAuditRepository implements IReviewAuditRepository {
  private store = new Map<string, ReviewAuditRecord>();
  private counter = 0;

  async insert(record: Omit<ReviewAuditRecord, 'id' | 'createdAt'>): Promise<ReviewAuditRecord> {
    this.counter += 1;
    const full: ReviewAuditRecord = {
      ...record,
      id: `review-audit-${this.counter}`,
      createdAt: new Date().toISOString(),
    };
    this.store.set(full.id, full);
    return full;
  }

  async findByTenant(tenantId: string, limit?: number): Promise<ReviewAuditRecord[]> {
    const list: ReviewAuditRecord[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId) list.push(r);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  async findByReview(tenantId: string, reviewId: string, limit?: number): Promise<ReviewAuditRecord[]> {
    const list: ReviewAuditRecord[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId !== tenantId) continue;
      if (r.reviewId !== reviewId) continue;
      list.push(r);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  clear(): void { this.store.clear(); this.counter = 0; }
}
