import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type ABTestStatus = 'running' | 'completed' | 'cancelled';

export interface ABVariant {
  id: string;
  name: string;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  sendPercentage: number;
  stats: {
    sent: number;
    opens: number;
    clicks: number;
  };
}

export interface ABTestData {
  name: string;
  campaignId: string;
  variants: ABVariant[];
  metric: 'open_rate' | 'click_rate';
  status?: ABTestStatus;
  winnerVariantId?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface ABTestStats {
  total: number;
  byStatus: Record<string, number>;
  completed: number;
  running: number;
}

// ── Helpers ──

function parseABTest(mem: {
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

function emptyVariantStats() {
  return { sent: 0, opens: 0, clicks: 0 };
}

// ── Email AB Test Service ──

export const EmailABTestService = {
  /**
   * Create a new A/B test stored as a Memory record.
   */
  async create(input: {
    workspaceId: string;
    organizationId: string;
    createdBy: string;
    data: ABTestData;
  }) {
    const content = JSON.stringify({
      name: input.data.name,
      campaignId: input.data.campaignId,
      variants: input.data.variants || [],
      metric: input.data.metric || 'open_rate',
      status: input.data.status || 'running',
      winnerVariantId: input.data.winnerVariantId || null,
      startedAt: input.data.startedAt || new Date().toISOString(),
      completedAt: input.data.completedAt || null,
    });
    return prisma.memory.create({
      data: {
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
        type: 'email_ab_test',
        content: content.slice(0, 10000),
        source: 'user',
        sourceId: input.createdBy,
        confidence: 0.9,
        owner: input.createdBy,
        lifecycle: 'long',
        tags: JSON.stringify(['email_ab_test']),
        createdBy: input.createdBy,
      },
    });
  },

  /**
   * Get a single A/B test by ID.
   */
  async get(id: string) {
    const mem = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
    null);
    if (!mem || mem.type !== 'email_ab_test') return null;
    return parseABTest(mem);
  },

  /**
   * Get an A/B test by its associated campaign ID.
   */
  async getByCampaign(campaignId: string) {
    const memories = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'email_ab_test',
          content: { contains: `"campaignId":"${campaignId}"` },
        },
        take: 1,
      }),
    []);
    if (memories.length === 0) return null;
    return parseABTest(memories[0]);
  },

  /**
   * Update an A/B test's data.
   */
  async update(id: string, data: Partial<ABTestData>) {
    const existing = await this.get(id);
    if (!existing) throw new Error('A/B test not found');

    const merged: ABTestData = {
      name: String(existing.name || ''),
      campaignId: String(existing.campaignId || ''),
      variants: (existing.variants as ABVariant[]) || [],
      metric: (existing.metric as 'open_rate' | 'click_rate') || 'open_rate',
      status: (existing.status as ABTestStatus) || 'running',
      winnerVariantId: (existing.winnerVariantId as string | null) ?? null,
      startedAt: (existing.startedAt as string | null) ?? null,
      completedAt: (existing.completedAt as string | null) ?? null,
    };

    if (data.name !== undefined) merged.name = data.name;
    if (data.campaignId !== undefined) merged.campaignId = data.campaignId;
    if (data.variants !== undefined) merged.variants = data.variants;
    if (data.metric !== undefined) merged.metric = data.metric;
    if (data.status !== undefined) merged.status = data.status;
    if (data.winnerVariantId !== undefined) merged.winnerVariantId = data.winnerVariantId;
    if (data.startedAt !== undefined) merged.startedAt = data.startedAt;
    if (data.completedAt !== undefined) merged.completedAt = data.completedAt;

    const content = JSON.stringify({
      name: merged.name,
      campaignId: merged.campaignId,
      variants: merged.variants,
      metric: merged.metric,
      status: merged.status,
      winnerVariantId: merged.winnerVariantId,
      startedAt: merged.startedAt,
      completedAt: merged.completedAt,
    });

    return prisma.memory.update({
      where: { id },
      data: {
        content: content.slice(0, 10000),
        tags: JSON.stringify(['email_ab_test']),
      },
    });
  },

  /**
   * Delete an A/B test.
   */
  async delete(id: string) {
    return prisma.memory.delete({ where: { id } });
  },

  /**
   * Get results for an A/B test: per-variant stats and the winner.
   */
  async getResults(id: string): Promise<{
    variants: ABVariant[];
    winner: ABVariant | null;
    metric: string;
  }> {
    const test = await this.get(id);
    if (!test) return { variants: [], winner: null, metric: 'open_rate' };

    const variants = (test.variants as ABVariant[]) || [];
    const metric = String(test.metric || 'open_rate');

    // Compute rates
    const withRates = variants.map((v) => {
      const sent = v.stats?.sent || 0;
      const opens = v.stats?.opens || 0;
      const clicks = v.stats?.clicks || 0;
      const rate = metric === 'open_rate'
        ? (sent > 0 ? opens / sent : 0)
        : (sent > 0 ? clicks / sent : 0);
      return { ...v, rate };
    });

    // Determine winner
    let winner: ABVariant | null = null;
    if (test.winnerVariantId) {
      winner = variants.find((v) => v.id === test.winnerVariantId) || null;
    } else {
      let bestRate = -1;
      for (const v of withRates) {
        if (v.rate > bestRate) {
          bestRate = v.rate;
          winner = v;
        }
      }
    }

    return { variants: withRates, winner, metric };
  },

  /**
   * Declare a winner for an A/B test manually.
   */
  async declareWinner(id: string, variantId: string) {
    const test = await this.get(id);
    if (!test) throw new Error('A/B test not found');
    const variants = (test.variants as ABVariant[]) || [];
    const variant = variants.find((v) => v.id === variantId);
    if (!variant) throw new Error('Variant not found');

    return this.update(id, {
      status: 'completed',
      winnerVariantId: variantId,
      completedAt: new Date().toISOString(),
    });
  },

  /**
   * Get aggregate A/B test stats for a workspace.
   */
  async getStats(workspaceId: string): Promise<ABTestStats> {
    const memories = await safePrisma(() =>
      prisma.memory.findMany({
        where: { workspaceId, type: 'email_ab_test' },
        take: 200,
      }),
    []);

    const tests = memories.map(parseABTest);
    const byStatus: Record<string, number> = {};
    let completed = 0, running = 0;
    for (const t of tests) {
      const st = String(t.status || 'running');
      byStatus[st] = (byStatus[st] || 0) + 1;
      if (st === 'completed') completed += 1;
      if (st === 'running') running += 1;
    }

    return { total: tests.length, byStatus, completed, running };
  },
};
