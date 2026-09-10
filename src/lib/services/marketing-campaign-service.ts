import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type CampaignType =
  | 'email'
  | 'social'
  | 'paid_ads'
  | 'content'
  | 'event'
  | 'referral'
  | 'seo';

export type CampaignStatus =
  | 'planned'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';

/** Raw Memory row as stored in the database. */
interface MemoryRow {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  sourceId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignMetric {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  leads: number;
  revenue: number;
  spend: number;
}

/** Parsed content payload for a marketing campaign Memory. */
interface CampaignContent {
  name: string;
  description: string;
  type: CampaignType;
  startDate: string;
  endDate: string | null;
  budget: number;
  status: CampaignStatus;
  channels: string[];
  goals: string;
  targetAudience: string;
  metrics: CampaignMetric[];
}

/** A structured marketing campaign returned to callers. */
export interface MarketingCampaign {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  description: string;
  type: CampaignType;
  startDate: string;
  endDate: string | null;
  budget: number;
  status: CampaignStatus;
  channels: string[];
  goals: string;
  targetAudience: string;
  metrics: CampaignMetric[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCampaignInput {
  name: string;
  description?: string;
  type: CampaignType;
  startDate: string;
  endDate?: string;
  budget?: number;
  status?: CampaignStatus;
  channels?: string[];
  goals?: string;
  targetAudience?: string;
  workspaceId?: string;
  createdBy: string;
}

export interface UpdateCampaignInput {
  name?: string;
  description?: string;
  type?: CampaignType;
  startDate?: string;
  endDate?: string;
  budget?: number;
  channels?: string[];
  goals?: string;
  targetAudience?: string;
}

export interface RecordMetricsInput {
  impressions?: number;
  clicks?: number;
  conversions?: number;
  leads?: number;
  revenue?: number;
  spend?: number;
  date: string;
}

export interface ListCampaignOpts {
  type?: CampaignType;
  status?: CampaignStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface CampaignStats {
  totalCampaigns: number;
  byType: Record<string, number>;
  byStatus: Record<CampaignStatus, number>;
  totalBudget: number;
  totalSpend: number;
  totalRevenue: number;
  avgROI: number;
}

// ── Helpers ──

const fallbackContent: CampaignContent = {
  name: '',
  description: '',
  type: 'content',
  startDate: '',
  endDate: null,
  budget: 0,
  status: 'planned',
  channels: [],
  goals: '',
  targetAudience: '',
  metrics: [],
};

function parseCampaignContent(raw: string): CampaignContent {
  if (!raw) return fallbackContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      name: parsed.name ?? '',
      description: parsed.description ?? '',
      type: (parsed.type as CampaignType) ?? 'content',
      startDate: parsed.startDate ?? '',
      endDate: parsed.endDate ?? null,
      budget: Number(parsed.budget) || 0,
      status: (parsed.status as CampaignStatus) ?? 'planned',
      channels: Array.isArray(parsed.channels) ? parsed.channels : [],
      goals: parsed.goals ?? '',
      targetAudience: parsed.targetAudience ?? '',
      metrics: Array.isArray(parsed.metrics) ? parsed.metrics : [],
    };
  } catch {
    return fallbackContent;
  }
}

function toCampaign(row: MemoryRow): MarketingCampaign {
  const content = parseCampaignContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    name: content.name,
    description: content.description,
    type: content.type,
    startDate: content.startDate,
    endDate: content.endDate,
    budget: content.budget,
    status: content.status,
    channels: content.channels,
    goals: content.goals,
    targetAudience: content.targetAudience,
    metrics: content.metrics,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Marketing Campaign Service ──

export const MarketingCampaignService = {
  /**
   * Create a campaign. Stored as a Memory with type='marketing_campaign'.
   */
  async create(
    organizationId: string,
    input: CreateCampaignInput,
  ): Promise<MarketingCampaign> {
    const content: CampaignContent = {
      name: input.name,
      description: input.description ?? '',
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      budget: input.budget ?? 0,
      status: input.status ?? 'planned',
      channels: input.channels ?? [],
      goals: input.goals ?? '',
      targetAudience: input.targetAudience ?? '',
      metrics: [],
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'marketing_campaign',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['marketing_campaign', content.type, content.status]),
        createdBy: input.createdBy,
      },
    });

    return toCampaign(row as MemoryRow);
  },

  /**
   * Get a single campaign by ID.
   */
  async get(id: string): Promise<MarketingCampaign | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toCampaign(row as MemoryRow);
  },

  /**
   * List campaigns for an organization with optional filters.
   */
  async list(
    organizationId: string,
    opts: ListCampaignOpts = {},
  ): Promise<MarketingCampaign[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'marketing_campaign',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let campaigns = rows.map((r) => toCampaign(r as MemoryRow));

    if (opts.type) {
      campaigns = campaigns.filter((c) => c.type === opts.type);
    }
    if (opts.status) {
      campaigns = campaigns.filter((c) => c.status === opts.status);
    }
    if (opts.startDate) {
      campaigns = campaigns.filter((c) => c.startDate >= opts.startDate!);
    }
    if (opts.endDate) {
      campaigns = campaigns.filter((c) => c.startDate <= opts.endDate!);
    }
    if (opts.search) {
      const q = opts.search.toLowerCase();
      campaigns = campaigns.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.goals.toLowerCase().includes(q) ||
          c.targetAudience.toLowerCase().includes(q),
      );
    }

    return campaigns;
  },

  /**
   * Update a campaign.
   */
  async update(
    id: string,
    input: UpdateCampaignInput,
  ): Promise<MarketingCampaign | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseCampaignContent(existing.content);
    if (input.name !== undefined) content.name = input.name;
    if (input.description !== undefined) content.description = input.description;
    if (input.type !== undefined) content.type = input.type;
    if (input.startDate !== undefined) content.startDate = input.startDate;
    if (input.endDate !== undefined) content.endDate = input.endDate;
    if (input.budget !== undefined) content.budget = input.budget;
    if (input.channels !== undefined) content.channels = input.channels;
    if (input.goals !== undefined) content.goals = input.goals;
    if (input.targetAudience !== undefined) content.targetAudience = input.targetAudience;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['marketing_campaign', content.type, content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toCampaign(row as MemoryRow);
  },

  /**
   * Delete a campaign.
   */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  /** Change the status of a campaign. */
  async changeStatus(
    id: string,
    status: CampaignStatus,
  ): Promise<MarketingCampaign | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseCampaignContent(existing.content);
    content.status = status;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['marketing_campaign', content.type, content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toCampaign(row as MemoryRow);
  },

  /**
   * Record campaign metrics. Stored within the campaign content JSON as a metrics array.
   */
  async recordMetrics(
    id: string,
    input: RecordMetricsInput,
  ): Promise<MarketingCampaign | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseCampaignContent(existing.content);
    const metric: CampaignMetric = {
      date: input.date,
      impressions: input.impressions ?? 0,
      clicks: input.clicks ?? 0,
      conversions: input.conversions ?? 0,
      leads: input.leads ?? 0,
      revenue: input.revenue ?? 0,
      spend: input.spend ?? 0,
    };
    content.metrics.push(metric);

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
          },
        }),
      null,
    );
    if (!row) return null;
    return toCampaign(row as MemoryRow);
  },

  /** Get all recorded metrics for a campaign. */
  async getMetrics(id: string): Promise<CampaignMetric[]> {
    const campaign = await MarketingCampaignService.get(id);
    if (!campaign) return [];
    return campaign.metrics;
  },

  /** Calculate ROI = (revenue - spend) / spend * 100. */
  async getROI(id: string): Promise<number> {
    const metrics = await MarketingCampaignService.getMetrics(id);
    const revenue = metrics.reduce((sum, m) => sum + m.revenue, 0);
    const spend = metrics.reduce((sum, m) => sum + m.spend, 0);
    if (spend === 0) return 0;
    return Math.round(((revenue - spend) / spend) * 100 * 100) / 100;
  },

  /** Aggregate performance metrics for a campaign. */
  async getCampaignPerformance(
    id: string,
  ): Promise<{
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    totalLeads: number;
    totalRevenue: number;
    totalSpend: number;
    ctr: number;
    conversionRate: number;
    roi: number;
  }> {
    const metrics = await MarketingCampaignService.getMetrics(id);
    const totalImpressions = metrics.reduce((s, m) => s + m.impressions, 0);
    const totalClicks = metrics.reduce((s, m) => s + m.clicks, 0);
    const totalConversions = metrics.reduce((s, m) => s + m.conversions, 0);
    const totalLeads = metrics.reduce((s, m) => s + m.leads, 0);
    const totalRevenue = metrics.reduce((s, m) => s + m.revenue, 0);
    const totalSpend = metrics.reduce((s, m) => s + m.spend, 0);
    const ctr =
      totalImpressions > 0
        ? Math.round((totalClicks / totalImpressions) * 100 * 100) / 100
        : 0;
    const conversionRate =
      totalClicks > 0
        ? Math.round((totalConversions / totalClicks) * 100 * 100) / 100
        : 0;
    const roi =
      totalSpend > 0
        ? Math.round(((totalRevenue - totalSpend) / totalSpend) * 100 * 100) / 100
        : 0;
    return {
      totalImpressions,
      totalClicks,
      totalConversions,
      totalLeads,
      totalRevenue,
      totalSpend,
      ctr,
      conversionRate,
      roi,
    };
  },

  /** Active campaigns. */
  async getActiveCampaigns(organizationId: string): Promise<MarketingCampaign[]> {
    return MarketingCampaignService.list(organizationId, { status: 'active' });
  },

  /** Campaigns grouped by type. */
  async getByType(
    organizationId: string,
  ): Promise<Record<string, MarketingCampaign[]>> {
    const campaigns = await MarketingCampaignService.list(organizationId);
    const grouped: Record<string, MarketingCampaign[]> = {};
    for (const c of campaigns) {
      if (!grouped[c.type]) grouped[c.type] = [];
      grouped[c.type].push(c);
    }
    return grouped;
  },

  /** Campaigns grouped by status. */
  async getByStatus(
    organizationId: string,
  ): Promise<Record<CampaignStatus, MarketingCampaign[]>> {
    const campaigns = await MarketingCampaignService.list(organizationId);
    const grouped: Record<CampaignStatus, MarketingCampaign[]> = {
      planned: [],
      active: [],
      paused: [],
      completed: [],
      cancelled: [],
    };
    for (const c of campaigns) {
      grouped[c.status].push(c);
    }
    return grouped;
  },

  /** Budget vs spend across campaigns. */
  async getBudgetUtilization(
    organizationId: string,
  ): Promise<
    Array<{
      id: string;
      name: string;
      budget: number;
      spend: number;
      utilization: number;
    }>
  > {
    const campaigns = await MarketingCampaignService.list(organizationId);
    return campaigns.map((c) => {
      const spend = c.metrics.reduce((s, m) => s + m.spend, 0);
      const utilization =
        c.budget > 0 ? Math.round((spend / c.budget) * 100 * 100) / 100 : 0;
      return {
        id: c.id,
        name: c.name,
        budget: c.budget,
        spend,
        utilization,
      };
    });
  },

  /** Total campaign revenue with optional date range. */
  async getTotalRevenue(
    organizationId: string,
    opts: { startDate?: string; endDate?: string } = {},
  ): Promise<number> {
    const campaigns = await MarketingCampaignService.list(organizationId, opts);
    let total = 0;
    for (const c of campaigns) {
      total += c.metrics.reduce((s, m) => s + m.revenue, 0);
    }
    return Math.round(total * 100) / 100;
  },

  /** Get stats for an organization. */
  async getStats(organizationId: string): Promise<CampaignStats> {
    const campaigns = await MarketingCampaignService.list(organizationId);
    const byType: Record<string, number> = {};
    const byStatus: Record<CampaignStatus, number> = {
      planned: 0,
      active: 0,
      paused: 0,
      completed: 0,
      cancelled: 0,
    };
    let totalBudget = 0;
    let totalSpend = 0;
    let totalRevenue = 0;
    const rois: number[] = [];

    for (const c of campaigns) {
      byType[c.type] = (byType[c.type] || 0) + 1;
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      totalBudget += c.budget;
      const spend = c.metrics.reduce((s, m) => s + m.spend, 0);
      const revenue = c.metrics.reduce((s, m) => s + m.revenue, 0);
      totalSpend += spend;
      totalRevenue += revenue;
      if (spend > 0) {
        rois.push(Math.round(((revenue - spend) / spend) * 100 * 100) / 100);
      }
    }

    const avgROI =
      rois.length > 0
        ? Math.round((rois.reduce((s, r) => s + r, 0) / rois.length) * 100) / 100
        : 0;

    return {
      totalCampaigns: campaigns.length,
      byType,
      byStatus,
      totalBudget: Math.round(totalBudget * 100) / 100,
      totalSpend: Math.round(totalSpend * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgROI,
    };
  },
};
