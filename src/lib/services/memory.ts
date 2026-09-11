import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type MemoryType =
  | 'fact'
  | 'knowledge'
  | 'decision'
  | 'preference'
  | 'outcome'
  | 'lesson'
  | 'active_context'
  | 'historical_context'
  | 'episodic';

export type MemoryLifecycle = 'permanent' | 'long' | 'medium' | 'short' | 'archived' | 'needs_review';

// ── Contradiction / Expiration Types ──

export interface ContradictionResult {
  memory1Id: string;
  memory2Id: string;
  type: string;
  reason: string;
  confidence1: number;
  confidence2: number;
  recommendedAction: 'keep_newer' | 'keep_higher_confidence' | 'merge' | 'manual_review';
}

export interface ExpirationResult {
  expiredCount: number;
  contradictionCount: number;
  autoResolvedCount: number;
  needsReviewCount: number;
  contradictions: ContradictionResult[];
}

// Internal shape of a memory row used by the heuristic detection logic.
interface MemoryRow {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  source: string;
  sourceId: string | null;
  confidence: number;
  owner: string | null;
  lifecycle: string;
  expiresAt: Date | null;
  tags: string;
  relatedMemoryIds: string;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Heuristic helpers ──

/**
 * Normalize free-form content into a "topic key" so that two memories about
 * the same subject (but with different values) collapse to the same key.
 * e.g. "preferred model is GPT-4" and "preferred model is Claude" both become
 * "preferred model is". Numbers and dates are replaced with placeholders so
 * "founded in 2024" and "founded in 2023" share a key.
 */
function normalizeForTopic(content: string): string {
  let s = content.toLowerCase().trim();
  // Drop the value portion after common assignment separators.
  s = s.replace(/\s+is\s+.*$/g, ' is');
  s = s.replace(/\s+are\s+.*$/g, ' are');
  s = s.replace(/\s*=\s*.*$/g, '=');
  s = s.replace(/\s*:\s*.*$/g, ':');
  // Replace dates and numbers with placeholders.
  s = s.replace(/\d{4}-\d{2}-\d{2}/g, '#date#');
  s = s.replace(/\d{4}/g, '#year#');
  s = s.replace(/\b\d+\b/g, '#num#');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/** Jaccard word-set similarity between two strings (0..1). */
function wordSimilarity(a: string, b: string): number {
  const wa = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const wb = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  if (wa.size === 0 && wb.size === 0) return 1;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  const union = new Set([...wa, ...wb]).size;
  return union === 0 ? 0 : inter / union;
}

/** Build a ContradictionResult, choosing a recommended action by type. */
function buildContradiction(
  m1: MemoryRow,
  m2: MemoryRow,
  reason: string,
  actionOverride?: ContradictionResult['recommendedAction'],
): ContradictionResult {
  let recommendedAction: ContradictionResult['recommendedAction'];
  if (actionOverride) {
    recommendedAction = actionOverride;
  } else if (m1.type === 'decision') {
    recommendedAction = 'keep_newer';
  } else if (m1.type === 'fact') {
    recommendedAction = 'keep_higher_confidence';
  } else if (m1.type === 'preference') {
    recommendedAction =
      Math.abs(m1.confidence - m2.confidence) >= 0.2 ? 'keep_higher_confidence' : 'keep_newer';
  } else {
    recommendedAction = 'manual_review';
  }

  return {
    memory1Id: m1.id,
    memory2Id: m2.id,
    type: m1.type,
    reason,
    confidence1: m1.confidence,
    confidence2: m2.confidence,
    recommendedAction,
  };
}

/** Check a single pair of memories (same group) for a contradiction. */
function checkPair(m1: MemoryRow, m2: MemoryRow): ContradictionResult | null {
  // Identical content is not a contradiction.
  if (m1.content === m2.content) return null;

  const type = m1.type;

  if (type === 'preference' || type === 'fact') {
    // Same subject (normalized topic key) but different values.
    if (normalizeForTopic(m1.content) === normalizeForTopic(m2.content)) {
      return buildContradiction(m1, m2, `${type} values differ for the same subject`);
    }
    return null;
  }

  if (type === 'decision') {
    // A newer decision in the same group with different content overrides an
    // older one — flag as a contradiction to resolve.
    return buildContradiction(m1, m2, 'newer decision conflicts with older decision', 'keep_newer');
  }

  // Other types: flag memories from the same source with very different content.
  if (m1.source === m2.source && wordSimilarity(m1.content, m2.content) < 0.3) {
    return buildContradiction(
      m1,
      m2,
      'memories from same source have very different content',
      'manual_review',
    );
  }

  return null;
}

/**
 * Run contradiction detection over an in-memory list of memories.
 *
 * Preference/fact/decision memories are grouped by `type + (sourceId ?? topic)`
 * so that conflicting values about the same subject collide. Other types are
 * grouped by `type + source` so that divergent content from the same source
 * can be flagged. Each pair within a group is then checked heuristically.
 */
function detectContradictionsInMemories(memories: MemoryRow[]): ContradictionResult[] {
  const topicGroups = new Map<string, MemoryRow[]>();
  const sourceGroups = new Map<string, MemoryRow[]>();

  for (const m of memories) {
    if (m.type === 'preference' || m.type === 'fact' || m.type === 'decision') {
      const topicKey = m.sourceId ?? normalizeForTopic(m.content);
      const key = `${m.type}:${topicKey}`;
      const list = topicGroups.get(key);
      if (list) list.push(m);
      else topicGroups.set(key, [m]);
    } else {
      const key = `${m.type}:${m.source}`;
      const list = sourceGroups.get(key);
      if (list) list.push(m);
      else sourceGroups.set(key, [m]);
    }
  }

  const results: ContradictionResult[] = [];
  const checkGroup = (list: MemoryRow[]) => {
    if (list.length < 2) return;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const c = checkPair(list[i], list[j]);
        if (c) results.push(c);
      }
    }
  };
  for (const list of topicGroups.values()) checkGroup(list);
  for (const list of sourceGroups.values()) checkGroup(list);
  return results;
}

// ── Memory Service ──

export const MemoryService = {
  /**
   * List memories for a workspace, optionally filtered by type.
   */
  async list(workspaceId: string, filters?: { type?: MemoryType; tags?: string[] }, take: number = 100) {
    return safePrisma(() =>
      prisma.memory.findMany({
        where: {
          workspaceId,
          ...(filters?.type && { type: filters.type }),
        },
        orderBy: [{ confidence: 'desc' }, { updatedAt: 'desc' }],
        take: Math.min(take, 500),
      }),
    []);
  },

  /**
   * Get a single memory by ID.
   */
  async get(memoryId: string) {
    return safePrisma(() => prisma.memory.findUnique({ where: { id: memoryId } }), null);
  },

  /**
   * Create a new memory record.
   */
  async create(input: {
    workspaceId: string;
    organizationId: string;
    type: MemoryType;
    content: string;
    source?: string;
    sourceId?: string;
    confidence?: number;
    owner?: string;
    lifecycle?: MemoryLifecycle;
    tags?: string[];
    createdBy: string;
  }) {
    return prisma.memory.create({
      data: {
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
        type: input.type,
        content: input.content.slice(0, 10000),
        source: input.source || 'system',
        sourceId: input.sourceId || null,
        confidence: Math.max(0, Math.min(1, input.confidence || 0.5)),
        owner: input.owner || null,
        lifecycle: input.lifecycle || 'medium',
        tags: JSON.stringify(input.tags || []),
        createdBy: input.createdBy,
      },
    });
  },

  /**
   * Update a memory record.
   */
  async update(memoryId: string, input: {
    content?: string;
    confidence?: number;
    lifecycle?: MemoryLifecycle;
    tags?: string[];
  }) {
    const data: Record<string, unknown> = {};
    if (input.content !== undefined) data.content = input.content.slice(0, 10000);
    if (input.confidence !== undefined) data.confidence = Math.max(0, Math.min(1, input.confidence));
    if (input.lifecycle !== undefined) data.lifecycle = input.lifecycle;
    if (input.tags !== undefined) data.tags = JSON.stringify(input.tags);

    return prisma.memory.update({ where: { id: memoryId }, data });
  },

  /**
   * Verify a memory (mark as verified by a user or agent).
   */
  async verify(memoryId: string, verifiedBy: string) {
    return prisma.memory.update({
      where: { id: memoryId },
      data: {
        verifiedBy,
        verifiedAt: new Date(),
        confidence: 1.0,
      },
    });
  },

  /**
   * Delete a memory.
   */
  async delete(memoryId: string) {
    return prisma.memory.delete({ where: { id: memoryId } });
  },

  /**
   * Assemble relevant context for an agent run.
   * Returns a subset of memories, documents, and events relevant to the task.
   */
  async assembleContext(input: {
    workspaceId: string;
    organizationId: string;
    objective?: string;
    taskDescription?: string;
    tags?: string[];
    maxMemories?: number;
  }) {
    const max = input.maxMemories || 20;

    // Fetch relevant memories (by tags, type, recency, confidence)
    const memories = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          workspaceId: input.workspaceId,
          OR: [
            // Active context is always included
            { type: 'active_context' },
            // Facts and decisions are high-priority
            { type: 'fact', confidence: { gte: 0.7 } },
            { type: 'decision', confidence: { gte: 0.7 } },
            // Lessons and outcomes
            { type: 'lesson', confidence: { gte: 0.5 } },
            { type: 'outcome', confidence: { gte: 0.5 } },
          ],
        },
        orderBy: [{ confidence: 'desc' }, { updatedAt: 'desc' }],
        take: max,
      }),
    []);

    return {
      memories,
      summary: `${memories.length} memories assembled`,
    };
  },

  /**
   * Expire stale memories (mark for review).
   */
  async expireStale() {
    const now = new Date();
    const result = await prisma.memory.updateMany({
      where: {
        expiresAt: { lt: now },
        lifecycle: { not: 'permanent' },
      },
      data: { confidence: 0.3 }, // Lower confidence for expired memories
    });
    return result.count;
  },

  /**
   * Create an episodic memory — short-term event record for an agent run.
   * Episodic memories have a 24h TTL and are swept by the cron job.
   *
   * @see src/lib/services/reward-engine.ts (writes episodic memories)
   * @see /api/cron/durable-exec (sweeps expired episodic memories)
   */
  async createEpisodic(input: {
    workspaceId: string;
    organizationId: string;
    agentRunId: string;
    agentRole?: string;
    content: string;
    tags?: string[];
    createdBy: string;
  }) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h TTL
    return prisma.memory.create({
      data: {
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
        type: 'episodic',
        content: input.content.slice(0, 10000),
        source: 'agent',
        sourceId: input.agentRunId,
        confidence: 0.6,
        lifecycle: 'short',
        expiresAt,
        tags: JSON.stringify(['episodic', input.agentRole || 'agent', ...(input.tags || [])]),
        createdBy: input.createdBy,
      },
    });
  },

  /**
   * List episodic memories for a workspace, optionally filtered by agent run.
   * Used by the context assembler to include recent episodic events.
   */
  async listEpisodic(workspaceId: string, filters?: { agentRunId?: string; agentRole?: string }, take: number = 50) {
    const tags = filters?.agentRole ? [filters.agentRole] : [];
    return safePrisma(() =>
      prisma.memory.findMany({
        where: {
          workspaceId,
          type: 'episodic',
          ...(filters?.agentRunId && { sourceId: filters.agentRunId }),
          ...(tags.length > 0 && { tags: { contains: tags[0] } }),
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(take, 200),
      }),
    []);
  },

  /**
   * Sweep expired episodic memories — delete or archive.
   * Called by the cron job. Returns the count of swept memories.
   */
  async sweepExpiredEpisodic(): Promise<number> {
    const now = new Date();
    // Archive expired episodic memories (lower confidence, mark as archived)
    const result = await prisma.memory.updateMany({
      where: {
        type: 'episodic',
        expiresAt: { lt: now },
        lifecycle: 'short',
      },
      data: {
        lifecycle: 'archived',
        confidence: 0.2,
      },
    }).catch(() => ({ count: 0 }));
    return result.count;
  },

  /**
   * Detect contradictions between active memories in a workspace.
   * Memories are grouped by type + topic (sourceId or a normalized content key)
   * and checked heuristically for conflicting values, overriding decisions, or
   * divergent content from the same source.
   */
  async detectContradictions(workspaceId: string): Promise<ContradictionResult[]> {
    const memories = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          workspaceId,
          lifecycle: { notIn: ['archived', 'needs_review'] },
        },
        orderBy: [{ updatedAt: 'desc' }],
      }),
    [] as unknown[]);
    return detectContradictionsInMemories(memories as MemoryRow[]);
  },

  /**
   * Resolve a contradiction between two memories.
   *
   * - keep_newer: archive the older memory (set lifecycle to 'archived').
   * - keep_higher_confidence: archive the lower-confidence memory.
   * - merge: archive both and create a new merged memory.
   * - manual_review: flag both for review (set lifecycle to 'needs_review').
   */
  async resolveContradiction(
    memory1Id: string,
    memory2Id: string,
    action: 'keep_newer' | 'keep_higher_confidence' | 'merge' | 'manual_review',
    mergedContent?: string,
  ): Promise<{ resolved: boolean; keptMemoryId?: string; archivedMemoryId?: string }> {
    const m1 = await MemoryService.get(memory1Id);
    const m2 = await MemoryService.get(memory2Id);
    if (!m1 || !m2) return { resolved: false };

    if (action === 'manual_review') {
      await prisma.memory.update({
        where: { id: memory1Id },
        data: { lifecycle: 'needs_review' },
      });
      await prisma.memory.update({
        where: { id: memory2Id },
        data: { lifecycle: 'needs_review' },
      });
      return { resolved: true };
    }

    if (action === 'merge') {
      await prisma.memory.update({
        where: { id: memory1Id },
        data: { lifecycle: 'archived' },
      });
      await prisma.memory.update({
        where: { id: memory2Id },
        data: { lifecycle: 'archived' },
      });
      const created = await prisma.memory.create({
        data: {
          workspaceId: m1.workspaceId,
          organizationId: m1.organizationId,
          type: m1.type,
          content: (mergedContent || `${m1.content}\n---\n${m2.content}`).slice(0, 10000),
          source: 'system',
          sourceId: null,
          confidence: Math.max(m1.confidence, m2.confidence),
          owner: m1.owner,
          lifecycle: 'medium',
          tags: m1.tags,
          createdBy: m1.createdBy,
        },
      });
      const createdRow = created as { id: string };
      return { resolved: true, keptMemoryId: createdRow.id };
    }

    // keep_newer or keep_higher_confidence
    let keptMemoryId: string;
    let archivedMemoryId: string;
    if (action === 'keep_newer') {
      const t1 = m1.updatedAt ? new Date(m1.updatedAt).getTime() : 0;
      const t2 = m2.updatedAt ? new Date(m2.updatedAt).getTime() : 0;
      if (t2 > t1) {
        keptMemoryId = memory2Id;
        archivedMemoryId = memory1Id;
      } else {
        keptMemoryId = memory1Id;
        archivedMemoryId = memory2Id;
      }
    } else {
      // keep_higher_confidence (ties keep the first memory)
      if (m2.confidence > m1.confidence) {
        keptMemoryId = memory2Id;
        archivedMemoryId = memory1Id;
      } else {
        keptMemoryId = memory1Id;
        archivedMemoryId = memory2Id;
      }
    }

    await prisma.memory.update({
      where: { id: archivedMemoryId },
      data: { lifecycle: 'archived' },
    });
    return { resolved: true, keptMemoryId, archivedMemoryId };
  },

  /**
   * Run a full expiration cycle, suitable for invocation by a cron job.
   *
   * 1. Expire all memories past their `expiresAt`.
   * 2. Detect contradictions in the remaining active memories.
   * 3. Auto-resolve simple contradictions (keep newer for decisions, keep
   *    higher confidence for facts); leave the rest for manual review.
   * 4. Return a summary of what was expired and what contradictions were found.
   */
  async runExpirationCycle(organizationId?: string): Promise<ExpirationResult> {
    // 1. Expire stale memories.
    const expiredCount = await MemoryService.expireStale();

    // 2. Detect contradictions in remaining active memories.
    const memories = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          ...(organizationId ? { organizationId } : {}),
          lifecycle: { notIn: ['archived', 'needs_review'] },
        },
        orderBy: [{ updatedAt: 'desc' }],
      }),
    [] as unknown[]);
    const contradictions = detectContradictionsInMemories(memories as MemoryRow[]);

    // 3. Auto-resolve simple contradictions; flag the rest for review.
    let autoResolvedCount = 0;
    let needsReviewCount = 0;
    for (const c of contradictions) {
      if (c.recommendedAction === 'keep_newer' || c.recommendedAction === 'keep_higher_confidence') {
        const res = await MemoryService.resolveContradiction(
          c.memory1Id,
          c.memory2Id,
          c.recommendedAction,
        );
        if (res.resolved) autoResolvedCount++;
      } else {
        needsReviewCount++;
      }
    }

    return {
      expiredCount,
      contradictionCount: contradictions.length,
      autoResolvedCount,
      needsReviewCount,
      contradictions,
    };
  },
};
