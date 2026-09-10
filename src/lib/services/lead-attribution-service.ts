import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type AttributionSource =
  | 'organic'
  | 'paid'
  | 'social'
  | 'email'
  | 'referral'
  | 'direct'
  | 'event';

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

/** Parsed content payload for a lead attribution Memory. */
interface AttributionContent {
  leadId: string;
  campaignId: string | null;
  source: AttributionSource;
  channel: string;
  touchpoint: string;
  conversionValue: number;
  convertedAt: string | null;
}

/** A structured lead attribution returned to callers. */
export interface LeadAttribution {
  id: string;
  organizationId: string;
  workspaceId: string;
  leadId: string;
  campaignId: string | null;
  source: AttributionSource;
  channel: string;
  touchpoint: string;
  conversionValue: number;
  convertedAt: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAttributionInput {
  leadId: string;
  campaignId?: string;
  source: AttributionSource;
  channel?: string;
  touchpoint?: string;
  conversionValue?: number;
  convertedAt?: string;
  workspaceId?: string;
  createdBy: string;
}

export interface ListAttributionOpts {
  leadId?: string;
  campaignId?: string;
  source?: AttributionSource;
  startDate?: string;
  endDate?: string;
}

export interface AttributionStats {
  totalAttributions: number;
  bySource: Record<string, number>;
  conversionRate: number;
  totalRevenue: number;
  avgConversionValue: number;
}

// ── Helpers ──

const fallbackContent: AttributionContent = {
  leadId: '',
  campaignId: null,
  source: 'direct',
  channel: '',
  touchpoint: '',
  conversionValue: 0,
  convertedAt: null,
};

function parseAttributionContent(raw: string): AttributionContent {
  if (!raw) return fallbackContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      leadId: parsed.leadId ?? '',
      campaignId: parsed.campaignId ?? null,
      source: (parsed.source as AttributionSource) ?? 'direct',
      channel: parsed.channel ?? '',
      touchpoint: parsed.touchpoint ?? '',
      conversionValue: Number(parsed.conversionValue) || 0,
      convertedAt: parsed.convertedAt ?? null,
    };
  } catch {
    return fallbackContent;
  }
}

function toAttribution(row: MemoryRow): LeadAttribution {
  const content = parseAttributionContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    leadId: content.leadId,
    campaignId: content.campaignId,
    source: content.source,
    channel: content.channel,
    touchpoint: content.touchpoint,
    conversionValue: content.conversionValue,
    convertedAt: content.convertedAt,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Lead Attribution Service ──

export const LeadAttributionService = {
  /**
   * Create a lead attribution record. Stored as a Memory with type='lead_attribution'.
   */
  async create(
    organizationId: string,
    input: CreateAttributionInput,
  ): Promise<LeadAttribution> {
    const content: AttributionContent = {
      leadId: input.leadId,
      campaignId: input.campaignId ?? null,
      source: input.source,
      channel: input.channel ?? '',
      touchpoint: input.touchpoint ?? '',
      conversionValue: input.conversionValue ?? 0,
      convertedAt: input.convertedAt ?? null,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'lead_attribution',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['lead_attribution', content.source]),
        createdBy: input.createdBy,
      },
    });

    return toAttribution(row as MemoryRow);
  },

  /**
   * Get a single attribution by ID.
   */
  async get(id: string): Promise<LeadAttribution | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toAttribution(row as MemoryRow);
  },

  /**
   * List attributions for an organization with optional filters.
   */
  async list(
    organizationId: string,
    opts: ListAttributionOpts = {},
  ): Promise<LeadAttribution[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'lead_attribution',
            organizationId,
            ...(opts.startDate || opts.endDate
              ? {
                  createdAt: {
                    ...(opts.startDate ? { gte: new Date(opts.startDate) } : {}),
                    ...(opts.endDate ? { lte: new Date(opts.endDate) } : {}),
                  },
                }
              : {}),
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let attributions = rows.map((r) => toAttribution(r as MemoryRow));

    if (opts.leadId) {
      attributions = attributions.filter((a) => a.leadId === opts.leadId);
    }
    if (opts.campaignId) {
      attributions = attributions.filter((a) => a.campaignId === opts.campaignId);
    }
    if (opts.source) {
      attributions = attributions.filter((a) => a.source === opts.source);
    }

    return attributions;
  },

  /**
   * Delete an attribution record.
   */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  /** Attributions grouped by source. */
  async getBySource(
    organizationId: string,
  ): Promise<Record<string, LeadAttribution[]>> {
    const attributions = await LeadAttributionService.list(organizationId);
    const grouped: Record<string, LeadAttribution[]> = {};
    for (const a of attributions) {
      if (!grouped[a.source]) grouped[a.source] = [];
      grouped[a.source].push(a);
    }
    return grouped;
  },

  /** Attributions grouped by campaign. */
  async getByCampaign(
    organizationId: string,
  ): Promise<Record<string, LeadAttribution[]>> {
    const attributions = await LeadAttributionService.list(organizationId);
    const grouped: Record<string, LeadAttribution[]> = {};
    for (const a of attributions) {
      const key = a.campaignId ?? 'none';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(a);
    }
    return grouped;
  },

  /**
   * First-touch vs last-touch attribution summary.
   * For each lead, the earliest attribution is first-touch and the latest is last-touch.
   */
  async getAttributionModel(
    organizationId: string,
  ): Promise<{
    firstTouch: Record<string, number>;
    lastTouch: Record<string, number>;
  }> {
    const attributions = await LeadAttributionService.list(organizationId);
    const byLead: Record<string, LeadAttribution[]> = {};
    for (const a of attributions) {
      if (!byLead[a.leadId]) byLead[a.leadId] = [];
      byLead[a.leadId].push(a);
    }

    const firstTouch: Record<string, number> = {};
    const lastTouch: Record<string, number> = {};

    for (const leadId of Object.keys(byLead)) {
      const list = byLead[leadId].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );
      const first = list[0];
      const last = list[list.length - 1];
      firstTouch[first.source] = (firstTouch[first.source] || 0) + 1;
      lastTouch[last.source] = (lastTouch[last.source] || 0) + 1;
    }

    return { firstTouch, lastTouch };
  },

  /** Conversion rate by source (converted / total per source). */
  async getConversionBySource(
    organizationId: string,
  ): Promise<Record<string, number>> {
    const grouped = await LeadAttributionService.getBySource(organizationId);
    const result: Record<string, number> = {};
    for (const source of Object.keys(grouped)) {
      const list = grouped[source];
      const converted = list.filter((a) => a.convertedAt !== null).length;
      result[source] =
        list.length > 0
          ? Math.round((converted / list.length) * 100 * 100) / 100
          : 0;
    }
    return result;
  },

  /** Sources with most conversions. */
  async getTopPerformingSources(
    organizationId: string,
    limit = 5,
  ): Promise<Array<{ source: string; conversions: number; revenue: number }>> {
    const grouped = await LeadAttributionService.getBySource(organizationId);
    const result: Array<{ source: string; conversions: number; revenue: number }> = [];
    for (const source of Object.keys(grouped)) {
      const list = grouped[source];
      const conversions = list.filter((a) => a.convertedAt !== null).length;
      const revenue = list.reduce((s, a) => s + a.conversionValue, 0);
      result.push({ source, conversions, revenue });
    }
    return result.sort((a, b) => b.conversions - a.conversions).slice(0, limit);
  },

  /** Revenue attributed by source. */
  async getRevenueBySource(
    organizationId: string,
  ): Promise<Record<string, number>> {
    const grouped = await LeadAttributionService.getBySource(organizationId);
    const result: Record<string, number> = {};
    for (const source of Object.keys(grouped)) {
      result[source] = grouped[source].reduce((s, a) => s + a.conversionValue, 0);
    }
    return result;
  },

  /** Get stats for an organization. */
  async getStats(organizationId: string): Promise<AttributionStats> {
    const attributions = await LeadAttributionService.list(organizationId);
    const bySource: Record<string, number> = {};
    let converted = 0;
    let totalRevenue = 0;
    let conversionValueSum = 0;
    let convertedCount = 0;

    for (const a of attributions) {
      bySource[a.source] = (bySource[a.source] || 0) + 1;
      totalRevenue += a.conversionValue;
      if (a.convertedAt !== null) {
        converted += 1;
        conversionValueSum += a.conversionValue;
        convertedCount += 1;
      }
    }

    const conversionRate =
      attributions.length > 0
        ? Math.round((converted / attributions.length) * 100 * 100) / 100
        : 0;
    const avgConversionValue =
      convertedCount > 0
        ? Math.round((conversionValueSum / convertedCount) * 100) / 100
        : 0;

    return {
      totalAttributions: attributions.length,
      bySource,
      conversionRate,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgConversionValue,
    };
  },
};
