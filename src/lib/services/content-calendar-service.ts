import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type ContentItemType =
  | 'blog'
  | 'social_post'
  | 'email'
  | 'video'
  | 'podcast'
  | 'webinar'
  | 'press_release'
  | 'ad_campaign';

export type ContentPlatform =
  | 'facebook'
  | 'instagram'
  | 'twitter'
  | 'linkedin'
  | 'youtube'
  | 'tiktok'
  | 'email'
  | 'website';

export type ContentStatus =
  | 'planned'
  | 'scheduled'
  | 'published'
  | 'draft'
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

/** Parsed content payload for a content calendar item Memory. */
interface CalendarItemContent {
  title: string;
  description: string;
  type: ContentItemType;
  platform: ContentPlatform | null;
  scheduledDate: string;
  status: ContentStatus;
  owner: string;
  tags: string[];
  content: string;
}

/** A structured content calendar item returned to callers. */
export interface ContentCalendarItem {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  description: string;
  type: ContentItemType;
  platform: ContentPlatform | null;
  scheduledDate: string;
  status: ContentStatus;
  owner: string;
  tags: string[];
  content: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCalendarItemInput {
  title: string;
  description?: string;
  type: ContentItemType;
  platform?: ContentPlatform;
  scheduledDate: string;
  status?: ContentStatus;
  owner?: string;
  tags?: string[];
  content?: string;
  workspaceId?: string;
  createdBy: string;
}

export interface UpdateCalendarItemInput {
  title?: string;
  description?: string;
  type?: ContentItemType;
  platform?: ContentPlatform;
  scheduledDate?: string;
  owner?: string;
  tags?: string[];
  content?: string;
}

export interface ListCalendarOpts {
  type?: ContentItemType;
  platform?: ContentPlatform;
  status?: ContentStatus;
  owner?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface CalendarStats {
  totalItems: number;
  byType: Record<string, number>;
  byPlatform: Record<string, number>;
  byStatus: Record<ContentStatus, number>;
  publishedCount: number;
  overdueCount: number;
}

// ── Helpers ──

const fallbackContent: CalendarItemContent = {
  title: '',
  description: '',
  type: 'blog',
  platform: null,
  scheduledDate: '',
  status: 'planned',
  owner: '',
  tags: [],
  content: '',
};

function parseCalendarContent(raw: string): CalendarItemContent {
  if (!raw) return fallbackContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      title: parsed.title ?? '',
      description: parsed.description ?? '',
      type: (parsed.type as ContentItemType) ?? 'blog',
      platform: (parsed.platform as ContentPlatform) ?? null,
      scheduledDate: parsed.scheduledDate ?? '',
      status: (parsed.status as ContentStatus) ?? 'planned',
      owner: parsed.owner ?? '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      content: parsed.content ?? '',
    };
  } catch {
    return fallbackContent;
  }
}

function toCalendarItem(row: MemoryRow): ContentCalendarItem {
  const content = parseCalendarContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    title: content.title,
    description: content.description,
    type: content.type,
    platform: content.platform,
    scheduledDate: content.scheduledDate,
    status: content.status,
    owner: content.owner,
    tags: content.tags,
    content: content.content,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Content Calendar Service ──

export const ContentCalendarService = {
  /**
   * Create a content calendar item. Stored as a Memory with type='content_calendar_item'.
   */
  async create(
    organizationId: string,
    input: CreateCalendarItemInput,
  ): Promise<ContentCalendarItem> {
    const content: CalendarItemContent = {
      title: input.title,
      description: input.description ?? '',
      type: input.type,
      platform: input.platform ?? null,
      scheduledDate: input.scheduledDate,
      status: input.status ?? 'planned',
      owner: input.owner ?? '',
      tags: input.tags ?? [],
      content: input.content ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'content_calendar_item',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['content_calendar_item', content.type, content.status]),
        createdBy: input.createdBy,
      },
    });

    return toCalendarItem(row as MemoryRow);
  },

  /**
   * Get a single calendar item by ID.
   */
  async get(id: string): Promise<ContentCalendarItem | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toCalendarItem(row as MemoryRow);
  },

  /**
   * List calendar items for an organization with optional filters.
   */
  async list(
    organizationId: string,
    opts: ListCalendarOpts = {},
  ): Promise<ContentCalendarItem[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'content_calendar_item',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let items = rows.map((r) => toCalendarItem(r as MemoryRow));

    if (opts.type) {
      items = items.filter((i) => i.type === opts.type);
    }
    if (opts.platform) {
      items = items.filter((i) => i.platform === opts.platform);
    }
    if (opts.status) {
      items = items.filter((i) => i.status === opts.status);
    }
    if (opts.owner) {
      items = items.filter((i) => i.owner === opts.owner);
    }
    if (opts.startDate) {
      items = items.filter((i) => i.scheduledDate >= opts.startDate!);
    }
    if (opts.endDate) {
      items = items.filter((i) => i.scheduledDate <= opts.endDate!);
    }
    if (opts.search) {
      const q = opts.search.toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.content.toLowerCase().includes(q),
      );
    }

    return items;
  },

  /**
   * Update a calendar item.
   */
  async update(
    id: string,
    input: UpdateCalendarItemInput,
  ): Promise<ContentCalendarItem | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseCalendarContent(existing.content);
    if (input.title !== undefined) content.title = input.title;
    if (input.description !== undefined) content.description = input.description;
    if (input.type !== undefined) content.type = input.type;
    if (input.platform !== undefined) content.platform = input.platform;
    if (input.scheduledDate !== undefined) content.scheduledDate = input.scheduledDate;
    if (input.owner !== undefined) content.owner = input.owner;
    if (input.tags !== undefined) content.tags = input.tags;
    if (input.content !== undefined) content.content = input.content;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['content_calendar_item', content.type, content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toCalendarItem(row as MemoryRow);
  },

  /**
   * Delete a calendar item.
   */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  /** Change the status of a calendar item. */
  async changeStatus(
    id: string,
    status: ContentStatus,
  ): Promise<ContentCalendarItem | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseCalendarContent(existing.content);
    content.status = status;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['content_calendar_item', content.type, content.status]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toCalendarItem(row as MemoryRow);
  },

  /** Items in a date range. */
  async getByDateRange(
    organizationId: string,
    start: string,
    end: string,
  ): Promise<ContentCalendarItem[]> {
    return ContentCalendarService.list(organizationId, {
      startDate: start,
      endDate: end,
    });
  },

  /** Items grouped by platform. */
  async getByPlatform(
    organizationId: string,
  ): Promise<Record<string, ContentCalendarItem[]>> {
    const items = await ContentCalendarService.list(organizationId);
    const grouped: Record<string, ContentCalendarItem[]> = {};
    for (const i of items) {
      const key = i.platform ?? 'none';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(i);
    }
    return grouped;
  },

  /** Items grouped by type. */
  async getByType(
    organizationId: string,
  ): Promise<Record<string, ContentCalendarItem[]>> {
    const items = await ContentCalendarService.list(organizationId);
    const grouped: Record<string, ContentCalendarItem[]> = {};
    for (const i of items) {
      if (!grouped[i.type]) grouped[i.type] = [];
      grouped[i.type].push(i);
    }
    return grouped;
  },

  /** Items grouped by status. */
  async getByStatus(
    organizationId: string,
  ): Promise<Record<ContentStatus, ContentCalendarItem[]>> {
    const items = await ContentCalendarService.list(organizationId);
    const grouped: Record<ContentStatus, ContentCalendarItem[]> = {
      planned: [],
      scheduled: [],
      published: [],
      draft: [],
      cancelled: [],
    };
    for (const i of items) {
      grouped[i.status].push(i);
    }
    return grouped;
  },

  /** Upcoming scheduled items (within N days from now). */
  async getUpcoming(
    organizationId: string,
    days = 7,
  ): Promise<ContentCalendarItem[]> {
    const items = await ContentCalendarService.list(organizationId);
    const now = new Date();
    const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return items
      .filter((i) => {
        if (!i.scheduledDate) return false;
        const d = new Date(i.scheduledDate);
        return d >= now && d <= horizon && i.status !== 'cancelled';
      })
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  },

  /** Overdue items — past scheduled date and not published. */
  async getOverdue(organizationId: string): Promise<ContentCalendarItem[]> {
    const items = await ContentCalendarService.list(organizationId);
    const now = new Date();
    return items
      .filter((i) => {
        if (!i.scheduledDate) return false;
        const d = new Date(i.scheduledDate);
        return d < now && i.status !== 'published' && i.status !== 'cancelled';
      })
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  },

  /** Get stats for an organization. */
  async getStats(organizationId: string): Promise<CalendarStats> {
    const items = await ContentCalendarService.list(organizationId);
    const byType: Record<string, number> = {};
    const byPlatform: Record<string, number> = {};
    const byStatus: Record<ContentStatus, number> = {
      planned: 0,
      scheduled: 0,
      published: 0,
      draft: 0,
      cancelled: 0,
    };
    let publishedCount = 0;
    const now = new Date();
    let overdueCount = 0;

    for (const i of items) {
      byType[i.type] = (byType[i.type] || 0) + 1;
      const platKey = i.platform ?? 'none';
      byPlatform[platKey] = (byPlatform[platKey] || 0) + 1;
      byStatus[i.status] = (byStatus[i.status] || 0) + 1;
      if (i.status === 'published') publishedCount += 1;
      if (
        i.scheduledDate &&
        new Date(i.scheduledDate) < now &&
        i.status !== 'published' &&
        i.status !== 'cancelled'
      ) {
        overdueCount += 1;
      }
    }

    return {
      totalItems: items.length,
      byType,
      byPlatform,
      byStatus,
      publishedCount,
      overdueCount,
    };
  },
};
