import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';

export interface CampaignData {
  name: string;
  subject: string;
  preheader?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  templateId?: string;
  listId?: string;
  segmentId?: string;
  bodyHtml?: string;
  bodyText?: string;
  status?: CampaignStatus;
  scheduledAt?: string | null;
  sentAt?: string | null;
  abTestId?: string | null;
  stats?: CampaignStats;
  tags?: string[];
}

export interface CampaignStats {
  sent: number;
  delivered: number;
  opens: number;
  clicks: number;
  bounces: number;
  unsubscribes: number;
}

export interface CampaignTracking {
  opens: Array<{ at: string; subscriberId: string }>;
  clicks: Array<{ at: string; subscriberId: string; url: string }>;
}

export interface CampaignOverview {
  total: number;
  byStatus: Record<string, number>;
  totalSent: number;
  totalDelivered: number;
  totalOpens: number;
  totalClicks: number;
  totalBounces: number;
  totalUnsubscribes: number;
  avgOpenRate: number;
  avgClickRate: number;
}

// ── Helpers ──

function parseCampaign(mem: {
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

function emptyStats(): CampaignStats {
  return { sent: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0, unsubscribes: 0 };
}

// ── Email Campaign Service ──

export const EmailCampaignService = {
  /**
   * Create a new email campaign stored as a Memory record.
   */
  async create(input: {
    workspaceId: string;
    organizationId: string;
    createdBy: string;
    data: CampaignData;
  }) {
    const content = JSON.stringify({
      name: input.data.name,
      subject: input.data.subject,
      preheader: input.data.preheader || '',
      fromName: input.data.fromName || '',
      fromEmail: input.data.fromEmail || '',
      replyTo: input.data.replyTo || '',
      templateId: input.data.templateId || null,
      listId: input.data.listId || null,
      segmentId: input.data.segmentId || null,
      bodyHtml: input.data.bodyHtml || '',
      bodyText: input.data.bodyText || '',
      status: input.data.status || 'draft',
      scheduledAt: input.data.scheduledAt || null,
      sentAt: input.data.sentAt || null,
      abTestId: input.data.abTestId || null,
      stats: input.data.stats || emptyStats(),
    });
    return prisma.memory.create({
      data: {
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
        type: 'email_campaign',
        content: content.slice(0, 10000),
        source: 'user',
        sourceId: input.createdBy,
        confidence: 0.9,
        owner: input.createdBy,
        lifecycle: 'long',
        tags: JSON.stringify(['email_campaign', ...(input.data.tags || [])]),
        createdBy: input.createdBy,
      },
    });
  },

  /**
   * Get a single campaign by ID.
   */
  async get(id: string) {
    const mem = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
    null);
    if (!mem || mem.type !== 'email_campaign') return null;
    return parseCampaign(mem);
  },

  /**
   * List campaigns with optional filters.
   */
  async list(workspaceId: string, filters?: {
    status?: string;
    search?: string;
  }) {
    const memories = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          workspaceId,
          type: 'email_campaign',
          ...(filters?.status && {
            content: { contains: `"status":"${filters.status}"` },
          }),
        },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      }),
    []);

    let campaigns = memories.map(parseCampaign);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      campaigns = campaigns.filter((c) =>
        String(c.name || '').toLowerCase().includes(q) ||
        String(c.subject || '').toLowerCase().includes(q));
    }
    return campaigns;
  },

  /**
   * Update a campaign's data fields.
   */
  async update(id: string, data: Partial<CampaignData>) {
    const existing = await this.get(id);
    if (!existing) throw new Error('Campaign not found');

    const merged: CampaignData = {
      name: String(existing.name || ''),
      subject: String(existing.subject || ''),
      preheader: existing.preheader as string | undefined,
      fromName: existing.fromName as string | undefined,
      fromEmail: existing.fromEmail as string | undefined,
      replyTo: existing.replyTo as string | undefined,
      templateId: existing.templateId as string | undefined,
      listId: existing.listId as string | undefined,
      segmentId: existing.segmentId as string | undefined,
      bodyHtml: existing.bodyHtml as string | undefined,
      bodyText: existing.bodyText as string | undefined,
      status: existing.status as CampaignStatus | undefined,
      scheduledAt: (existing.scheduledAt as string | null) ?? null,
      sentAt: (existing.sentAt as string | null) ?? null,
      abTestId: (existing.abTestId as string | null) ?? null,
      stats: (existing.stats as CampaignStats) || emptyStats(),
      tags: existing.tags as string[] | undefined,
    };

    if (data.name !== undefined) merged.name = data.name;
    if (data.subject !== undefined) merged.subject = data.subject;
    if (data.preheader !== undefined) merged.preheader = data.preheader;
    if (data.fromName !== undefined) merged.fromName = data.fromName;
    if (data.fromEmail !== undefined) merged.fromEmail = data.fromEmail;
    if (data.replyTo !== undefined) merged.replyTo = data.replyTo;
    if (data.templateId !== undefined) merged.templateId = data.templateId;
    if (data.listId !== undefined) merged.listId = data.listId;
    if (data.segmentId !== undefined) merged.segmentId = data.segmentId;
    if (data.bodyHtml !== undefined) merged.bodyHtml = data.bodyHtml;
    if (data.bodyText !== undefined) merged.bodyText = data.bodyText;
    if (data.status !== undefined) merged.status = data.status;
    if (data.scheduledAt !== undefined) merged.scheduledAt = data.scheduledAt;
    if (data.sentAt !== undefined) merged.sentAt = data.sentAt;
    if (data.abTestId !== undefined) merged.abTestId = data.abTestId;
    if (data.stats !== undefined) merged.stats = data.stats;
    if (data.tags !== undefined) merged.tags = data.tags;

    const content = JSON.stringify({
      name: merged.name,
      subject: merged.subject,
      preheader: merged.preheader || '',
      fromName: merged.fromName || '',
      fromEmail: merged.fromEmail || '',
      replyTo: merged.replyTo || '',
      templateId: merged.templateId || null,
      listId: merged.listId || null,
      segmentId: merged.segmentId || null,
      bodyHtml: merged.bodyHtml || '',
      bodyText: merged.bodyText || '',
      status: merged.status || 'draft',
      scheduledAt: merged.scheduledAt || null,
      sentAt: merged.sentAt || null,
      abTestId: merged.abTestId || null,
      stats: merged.stats || emptyStats(),
    });

    return prisma.memory.update({
      where: { id },
      data: {
        content: content.slice(0, 10000),
        tags: JSON.stringify(['email_campaign', ...(merged.tags || [])]),
      },
    });
  },

  /**
   * Delete a campaign.
   */
  async delete(id: string) {
    return prisma.memory.delete({ where: { id } });
  },

  /**
   * Send a campaign — records send events and updates status to 'sent'.
   */
  async send(id: string, subscriberIds: string[], actorId: string) {
    const campaign = await this.get(id);
    if (!campaign) throw new Error('Campaign not found');

    // Record a send event per subscriber
    const events: unknown[] = [];
    for (const sid of subscriberIds) {
      const evt = await safePrisma(() =>
        prisma.event.create({
          data: {
            workspaceId: String(campaign.workspaceId),
            organizationId: String(campaign.organizationId),
            type: 'email.sent',
            actor: actorId,
            actorType: 'system',
            resourceType: 'email_campaign',
            resourceId: id,
            metadata: JSON.stringify({ campaignId: id, subscriberId: sid }),
            source: 'email_campaign',
          },
        }),
      null);
      events.push(evt);
    }

    // Update campaign stats and status
    const prevStats = (campaign.stats as CampaignStats) || emptyStats();
    const newStats: CampaignStats = {
      sent: prevStats.sent + subscriberIds.length,
      delivered: prevStats.delivered + subscriberIds.length,
      opens: prevStats.opens,
      clicks: prevStats.clicks,
      bounces: prevStats.bounces,
      unsubscribes: prevStats.unsubscribes,
    };

    await this.update(id, {
      status: 'sent',
      sentAt: new Date().toISOString(),
      stats: newStats,
    });

    return { sent: subscriberIds.length, events };
  },

  /**
   * Schedule a campaign for future sending.
   */
  async schedule(id: string, scheduledAt: string) {
    return this.update(id, { status: 'scheduled', scheduledAt });
  },

  /**
   * Cancel a scheduled campaign.
   */
  async cancelSchedule(id: string) {
    return this.update(id, { status: 'draft', scheduledAt: null });
  },

  /**
   * Duplicate a campaign (creates a new draft copy).
   */
  async duplicate(id: string, createdBy: string) {
    const campaign = await this.get(id);
    if (!campaign) throw new Error('Campaign not found');

    return this.create({
      workspaceId: String(campaign.workspaceId),
      organizationId: String(campaign.organizationId),
      createdBy,
      data: {
        name: `${String(campaign.name || 'Campaign')} (Copy)`,
        subject: String(campaign.subject || ''),
        preheader: campaign.preheader as string | undefined,
        fromName: campaign.fromName as string | undefined,
        fromEmail: campaign.fromEmail as string | undefined,
        replyTo: campaign.replyTo as string | undefined,
        templateId: campaign.templateId as string | undefined,
        listId: campaign.listId as string | undefined,
        segmentId: campaign.segmentId as string | undefined,
        bodyHtml: campaign.bodyHtml as string | undefined,
        bodyText: campaign.bodyText as string | undefined,
        status: 'draft',
        scheduledAt: null,
        sentAt: null,
        stats: emptyStats(),
        tags: campaign.tags as string[] | undefined,
      },
    });
  },

  /**
   * Get aggregate stats for a campaign.
   */
  async getStats(id: string): Promise<CampaignStats> {
    const campaign = await this.get(id);
    if (!campaign) return emptyStats();
    return (campaign.stats as CampaignStats) || emptyStats();
  },

  /**
   * Get tracking events (opens/clicks) for a campaign.
   */
  async getTracking(id: string): Promise<CampaignTracking> {
    const events = await safePrisma(() =>
      prisma.event.findMany({
        where: {
          resourceId: id,
          type: { in: ['email.opened', 'email.clicked'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    []);

    const opens: Array<{ at: string; subscriberId: string }> = [];
    const clicks: Array<{ at: string; subscriberId: string; url: string }> = [];

    for (const e of events) {
      let meta: Record<string, unknown> = {};
      try { meta = JSON.parse(e.metadata); } catch { meta = {}; }
      if (e.type === 'email.opened') {
        opens.push({ at: e.createdAt.toISOString(), subscriberId: String(meta.subscriberId || '') });
      } else if (e.type === 'email.clicked') {
        clicks.push({
          at: e.createdAt.toISOString(),
          subscriberId: String(meta.subscriberId || ''),
          url: String(meta.url || ''),
        });
      }
    }
    return { opens, clicks };
  },

  /**
   * Get an overview of all campaigns for a workspace.
   */
  async getOverview(workspaceId: string): Promise<CampaignOverview> {
    const campaigns = await this.list(workspaceId);
    const byStatus: Record<string, number> = {};
    let totalSent = 0, totalDelivered = 0, totalOpens = 0, totalClicks = 0;
    let totalBounces = 0, totalUnsubscribes = 0;

    for (const c of campaigns) {
      const st = String(c.status || 'draft');
      byStatus[st] = (byStatus[st] || 0) + 1;
      const s = (c.stats as CampaignStats) || emptyStats();
      totalSent += s.sent;
      totalDelivered += s.delivered;
      totalOpens += s.opens;
      totalClicks += s.clicks;
      totalBounces += s.bounces;
      totalUnsubscribes += s.unsubscribes;
    }

    return {
      total: campaigns.length,
      byStatus,
      totalSent,
      totalDelivered,
      totalOpens,
      totalClicks,
      totalBounces,
      totalUnsubscribes,
      avgOpenRate: totalDelivered > 0 ? totalOpens / totalDelivered : 0,
      avgClickRate: totalDelivered > 0 ? totalClicks / totalDelivered : 0,
    };
  },

  /**
   * Get stats grouped by date for a campaign (based on events).
   */
  async getStatsByDate(id: string) {
    const events = await safePrisma(() =>
      prisma.event.findMany({
        where: {
          resourceId: id,
          type: { in: ['email.sent', 'email.opened', 'email.clicked', 'email.bounced', 'email.unsubscribed'] },
        },
        orderBy: { createdAt: 'asc' },
        take: 1000,
      }),
    []);

    const byDate: Record<string, { sent: number; opens: number; clicks: number; bounces: number; unsubscribes: number }> = {};
    for (const e of events) {
      const date = e.createdAt.toISOString().slice(0, 10);
      if (!byDate[date]) byDate[date] = { sent: 0, opens: 0, clicks: 0, bounces: 0, unsubscribes: 0 };
      if (e.type === 'email.sent') byDate[date].sent += 1;
      else if (e.type === 'email.opened') byDate[date].opens += 1;
      else if (e.type === 'email.clicked') byDate[date].clicks += 1;
      else if (e.type === 'email.bounced') byDate[date].bounces += 1;
      else if (e.type === 'email.unsubscribed') byDate[date].unsubscribes += 1;
    }
    return Object.entries(byDate).map(([date, stats]) => ({ date, ...stats }));
  },
};
