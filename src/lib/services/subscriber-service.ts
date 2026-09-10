import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type SubscriberStatus = 'active' | 'unsubscribed' | 'bounced' | 'pending';

export interface SubscriberData {
  email: string;
  firstName?: string;
  lastName?: string;
  status?: SubscriberStatus;
  tags?: string[];
  metadata?: Record<string, unknown>;
  listIds?: string[];
  subscribedAt?: string;
}

export interface ListData {
  name: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface SegmentData {
  name: string;
  description?: string;
  rules: SegmentRule[];
  listId?: string;
}

export interface SegmentRule {
  field: string;
  operator: 'equals' | 'contains' | 'not_equals' | 'gt' | 'lt';
  value: string;
}

export interface SubscriberStats {
  total: number;
  byStatus: Record<string, number>;
  totalLists: number;
  totalSegments: number;
}

// ── Helpers ──

function parseRecord(mem: {
  id: string;
  content: string;
  tags: string;
  createdAt: Date;
  updatedAt: Date;
  workspaceId: string;
  organizationId: string;
  createdBy: string;
}): Record<string, unknown> & { id: string } {
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(mem.content); } catch { data = {}; }
  return {
    ...data,
    id: mem.id,
    workspaceId: mem.workspaceId,
    organizationId: mem.organizationId,
    createdBy: mem.createdBy,
    tags: safeParseArray(mem.tags),
    createdAt: mem.createdAt,
    updatedAt: mem.updatedAt,
  };
}

function safeParseArray(s: string): string[] {
  try {
    const a = JSON.parse(s);
    return Array.isArray(a) ? a : [];
  } catch { return []; }
}

// ── Subscriber Service ──

export const SubscriberService = {
  /**
   * Add a new subscriber (stored as Memory type='email_subscriber').
   */
  async addSubscriber(input: {
    workspaceId: string;
    organizationId: string;
    createdBy: string;
    data: SubscriberData;
  }) {
    const content = JSON.stringify({
      email: input.data.email,
      firstName: input.data.firstName || '',
      lastName: input.data.lastName || '',
      status: input.data.status || 'pending',
      tags: input.data.tags || [],
      metadata: input.data.metadata || {},
      listIds: input.data.listIds || [],
      subscribedAt: input.data.subscribedAt || new Date().toISOString(),
    });
    return prisma.memory.create({
      data: {
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
        type: 'email_subscriber',
        content: content.slice(0, 10000),
        source: 'user',
        sourceId: input.createdBy,
        confidence: 0.9,
        owner: input.createdBy,
        lifecycle: 'long',
        tags: JSON.stringify(['email_subscriber', ...(input.data.tags || [])]),
        createdBy: input.createdBy,
      },
    });
  },

  /**
   * Get a single subscriber by ID.
   */
  async getSubscriber(id: string) {
    const mem = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
    null);
    if (!mem || mem.type !== 'email_subscriber') return null;
    return parseRecord(mem);
  },

  /**
   * Get a subscriber by email address within a workspace.
   */
  async getSubscriberByEmail(workspaceId: string, email: string) {
    const memories = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          workspaceId,
          type: 'email_subscriber',
          content: { contains: `"email":"${email}"` },
        },
        take: 1,
      }),
    []);
    if (memories.length === 0) return null;
    return parseRecord(memories[0]);
  },

  /**
   * Update a subscriber's data.
   */
  async updateSubscriber(id: string, data: Partial<SubscriberData>) {
    const existing = await this.getSubscriber(id);
    if (!existing) throw new Error('Subscriber not found');

    const merged: SubscriberData = {
      email: String(existing.email || ''),
      firstName: existing.firstName as string | undefined,
      lastName: existing.lastName as string | undefined,
      status: existing.status as SubscriberStatus | undefined,
      tags: existing.tags as string[] | undefined,
      metadata: existing.metadata as Record<string, unknown> | undefined,
      listIds: existing.listIds as string[] | undefined,
      subscribedAt: existing.subscribedAt as string | undefined,
    };

    if (data.email !== undefined) merged.email = data.email;
    if (data.firstName !== undefined) merged.firstName = data.firstName;
    if (data.lastName !== undefined) merged.lastName = data.lastName;
    if (data.status !== undefined) merged.status = data.status;
    if (data.tags !== undefined) merged.tags = data.tags;
    if (data.metadata !== undefined) merged.metadata = data.metadata;
    if (data.listIds !== undefined) merged.listIds = data.listIds;
    if (data.subscribedAt !== undefined) merged.subscribedAt = data.subscribedAt;

    const content = JSON.stringify({
      email: merged.email,
      firstName: merged.firstName || '',
      lastName: merged.lastName || '',
      status: merged.status || 'pending',
      tags: merged.tags || [],
      metadata: merged.metadata || {},
      listIds: merged.listIds || [],
      subscribedAt: merged.subscribedAt || new Date().toISOString(),
    });

    return prisma.memory.update({
      where: { id },
      data: {
        content: content.slice(0, 10000),
        tags: JSON.stringify(['email_subscriber', ...(merged.tags || [])]),
      },
    });
  },

  /**
   * Remove a subscriber permanently.
   */
  async removeSubscriber(id: string) {
    return prisma.memory.delete({ where: { id } });
  },

  /**
   * Unsubscribe a subscriber (set status to 'unsubscribed').
   */
  async unsubscribe(id: string) {
    return this.updateSubscriber(id, { status: 'unsubscribed' });
  },

  /**
   * List subscribers with optional filters.
   */
  async listSubscribers(workspaceId: string, filters?: {
    listId?: string;
    tag?: string;
    status?: string;
    search?: string;
  }) {
    const memories = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          workspaceId,
          type: 'email_subscriber',
          ...(filters?.status && {
            content: { contains: `"status":"${filters.status}"` },
          }),
          ...(filters?.tag && {
            tags: { contains: `"${filters.tag}"` },
          }),
        },
        orderBy: { updatedAt: 'desc' },
        take: 500,
      }),
    []);

    let subs = memories.map(parseRecord);
    if (filters?.listId) {
      subs = subs.filter((s) => {
        const listIds = (s.listIds as string[]) || [];
        return listIds.includes(filters.listId!);
      });
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      subs = subs.filter((s) =>
        String(s.email || '').toLowerCase().includes(q) ||
        String(s.firstName || '').toLowerCase().includes(q) ||
        String(s.lastName || '').toLowerCase().includes(q));
    }
    return subs;
  },

  /**
   * Import subscribers in bulk.
   */
  async importSubscribers(input: {
    workspaceId: string;
    organizationId: string;
    createdBy: string;
    subscribers: SubscriberData[];
  }): Promise<{ imported: number; duplicates: number }> {
    let imported = 0, duplicates = 0;
    for (const sub of input.subscribers) {
      // Check for existing
      const existing = await this.getSubscriberByEmail(input.workspaceId, sub.email);
      if (existing) {
        duplicates += 1;
        continue;
      }
      await this.addSubscriber({
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
        createdBy: input.createdBy,
        data: sub,
      });
      imported += 1;
    }
    return { imported, duplicates };
  },

  /**
   * Export subscribers as CSV string.
   */
  async exportSubscribers(workspaceId: string, filters?: {
    listId?: string;
    status?: string;
  }): Promise<string> {
    const subs = await this.listSubscribers(workspaceId, filters);
    const headers = ['id', 'email', 'firstName', 'lastName', 'status', 'tags', 'subscribedAt'];
    const rows = subs.map((s) => [
      s.id,
      String(s.email || ''),
      String(s.firstName || ''),
      String(s.lastName || ''),
      String(s.status || ''),
      ((s.tags as string[]) || []).join(';'),
      String(s.subscribedAt || ''),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    return csv;
  },

  /**
   * Create a subscriber list (stored as Memory type='email_list').
   */
  async createList(input: {
    workspaceId: string;
    organizationId: string;
    createdBy: string;
    data: ListData;
  }) {
    const content = JSON.stringify({
      name: input.data.name,
      description: input.data.description || '',
      tags: input.data.tags || [],
      isPublic: input.data.isPublic || false,
      subscriberCount: 0,
    });
    return prisma.memory.create({
      data: {
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
        type: 'email_list',
        content: content.slice(0, 10000),
        source: 'user',
        sourceId: input.createdBy,
        confidence: 0.9,
        owner: input.createdBy,
        lifecycle: 'long',
        tags: JSON.stringify(['email_list', ...(input.data.tags || [])]),
        createdBy: input.createdBy,
      },
    });
  },

  /**
   * Get a single list by ID.
   */
  async getList(id: string) {
    const mem = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
    null);
    if (!mem || mem.type !== 'email_list') return null;
    return parseRecord(mem);
  },

  /**
   * List all subscriber lists for a workspace.
   */
  async listLists(workspaceId: string) {
    const memories = await safePrisma(() =>
      prisma.memory.findMany({
        where: { workspaceId, type: 'email_list' },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      }),
    []);
    return memories.map(parseRecord);
  },

  /**
   * Update a list's data.
   */
  async updateList(id: string, data: Partial<ListData>) {
    const existing = await this.getList(id);
    if (!existing) throw new Error('List not found');

    const merged: ListData = {
      name: String(existing.name || ''),
      description: existing.description as string | undefined,
      tags: existing.tags as string[] | undefined,
      isPublic: existing.isPublic as boolean | undefined,
    };

    if (data.name !== undefined) merged.name = data.name;
    if (data.description !== undefined) merged.description = data.description;
    if (data.tags !== undefined) merged.tags = data.tags;
    if (data.isPublic !== undefined) merged.isPublic = data.isPublic;

    const content = JSON.stringify({
      name: merged.name,
      description: merged.description || '',
      tags: merged.tags || [],
      isPublic: merged.isPublic || false,
      subscriberCount: (existing.subscriberCount as number) || 0,
    });

    return prisma.memory.update({
      where: { id },
      data: {
        content: content.slice(0, 10000),
        tags: JSON.stringify(['email_list', ...(merged.tags || [])]),
      },
    });
  },

  /**
   * Delete a list.
   */
  async deleteList(id: string) {
    return prisma.memory.delete({ where: { id } });
  },

  /**
   * Add a subscriber to a list.
   */
  async addToList(listId: string, subscriberId: string) {
    const sub = await this.getSubscriber(subscriberId);
    if (!sub) throw new Error('Subscriber not found');
    const listIds = (sub.listIds as string[]) || [];
    if (!listIds.includes(listId)) {
      listIds.push(listId);
      await this.updateSubscriber(subscriberId, { listIds });
    }
    return sub;
  },

  /**
   * Remove a subscriber from a list.
   */
  async removeFromList(listId: string, subscriberId: string) {
    const sub = await this.getSubscriber(subscriberId);
    if (!sub) throw new Error('Subscriber not found');
    const listIds = ((sub.listIds as string[]) || []).filter((id) => id !== listId);
    await this.updateSubscriber(subscriberId, { listIds });
    return sub;
  },

  /**
   * Get stats for a specific list (subscriber count by status).
   */
  async getListStats(listId: string) {
    const list = await this.getList(listId);
    if (!list) return { total: 0, byStatus: {} as Record<string, number> };
    const subs = await this.listSubscribers(String(list.workspaceId), { listId });
    const byStatus: Record<string, number> = {};
    for (const s of subs) {
      const st = String(s.status || 'pending');
      byStatus[st] = (byStatus[st] || 0) + 1;
    }
    return { total: subs.length, byStatus };
  },

  /**
   * Create a segment (stored as Memory type='email_segment').
   */
  async createSegment(input: {
    workspaceId: string;
    organizationId: string;
    createdBy: string;
    data: SegmentData;
  }) {
    const content = JSON.stringify({
      name: input.data.name,
      description: input.data.description || '',
      rules: input.data.rules || [],
      listId: input.data.listId || null,
    });
    return prisma.memory.create({
      data: {
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
        type: 'email_segment',
        content: content.slice(0, 10000),
        source: 'user',
        sourceId: input.createdBy,
        confidence: 0.9,
        owner: input.createdBy,
        lifecycle: 'long',
        tags: JSON.stringify(['email_segment']),
        createdBy: input.createdBy,
      },
    });
  },

  /**
   * Evaluate a segment's rules against subscribers and return matching IDs.
   */
  async evaluateSegment(segmentId: string): Promise<string[]> {
    const mem = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id: segmentId } }),
    null);
    if (!mem || mem.type !== 'email_segment') return [];

    let segData: { rules?: SegmentRule[]; listId?: string | null } = {};
    try { segData = JSON.parse(mem.content); } catch { segData = {}; }
    const rules = segData.rules || [];

    const subs = await this.listSubscribers(mem.workspaceId, {
      ...(segData.listId ? { listId: segData.listId } : {}),
    });

    const matched: string[] = [];
    for (const sub of subs) {
      let ok = true;
      for (const rule of rules) {
        const val = String(sub[rule.field] ?? '');
        switch (rule.operator) {
          case 'equals': ok = ok && val === rule.value; break;
          case 'contains': ok = ok && val.includes(rule.value); break;
          case 'not_equals': ok = ok && val !== rule.value; break;
          case 'gt': ok = ok && Number(val) > Number(rule.value); break;
          case 'lt': ok = ok && Number(val) < Number(rule.value); break;
        }
        if (!ok) break;
      }
      if (ok) matched.push(sub.id);
    }
    return matched;
  },

  /**
   * Get aggregate subscriber stats for a workspace.
   */
  async getStats(workspaceId: string): Promise<SubscriberStats> {
    const subs = await this.listSubscribers(workspaceId);
    const lists = await this.listLists(workspaceId);
    const segments = await safePrisma(() =>
      prisma.memory.findMany({
        where: { workspaceId, type: 'email_segment' },
        take: 200,
      }),
    []);

    const byStatus: Record<string, number> = {};
    for (const s of subs) {
      const st = String(s.status || 'pending');
      byStatus[st] = (byStatus[st] || 0) + 1;
    }

    return {
      total: subs.length,
      byStatus,
      totalLists: lists.length,
      totalSegments: segments.length,
    };
  },
};
