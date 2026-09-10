import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type ChannelType = 'public' | 'private' | 'direct';

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

/** Parsed content payload for a channel Memory. */
interface ChannelContent {
  name: string;
  description: string;
  type: ChannelType;
  members: string[];
  pinnedMessages: string[];
  topic: string;
}

/** A structured channel returned to callers. */
export interface Channel {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  description: string;
  type: ChannelType;
  members: string[];
  pinnedMessages: string[];
  topic: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateChannelInput {
  name: string;
  description?: string;
  type?: ChannelType;
  workspaceId?: string;
  members?: string[];
  createdBy: string;
}

export interface ListChannelOpts {
  workspaceId?: string;
  type?: ChannelType;
  memberId?: string;
  search?: string;
}

export interface UpdateChannelInput {
  name?: string;
  description?: string;
  topic?: string;
}

export interface ChannelStats {
  totalChannels: number;
  byType: Record<ChannelType, number>;
  totalMembers: number;
  activeChannels: number;
}

// ── Helpers ──

const fallbackContent: ChannelContent = {
  name: '',
  description: '',
  type: 'public',
  members: [],
  pinnedMessages: [],
  topic: '',
};

function parseChannelContent(raw: string): ChannelContent {
  if (!raw) return fallbackContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      name: parsed.name ?? '',
      description: parsed.description ?? '',
      type: (parsed.type as ChannelType) ?? 'public',
      members: Array.isArray(parsed.members) ? parsed.members : [],
      pinnedMessages: Array.isArray(parsed.pinnedMessages) ? parsed.pinnedMessages : [],
      topic: parsed.topic ?? '',
    };
  } catch {
    return fallbackContent;
  }
}

function toChannel(row: MemoryRow): Channel {
  const content = parseChannelContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    name: content.name,
    description: content.description,
    type: content.type,
    members: content.members,
    pinnedMessages: content.pinnedMessages,
    topic: content.topic,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Channel Service ──

export const ChannelService = {
  /**
   * Create a channel. Stored as a Memory with type='team_channel'.
   */
  async create(organizationId: string, input: CreateChannelInput): Promise<Channel> {
    const name = input.name.trim();
    const type: ChannelType = input.type ?? 'public';
    const members = input.members ?? [];
    const content: ChannelContent = {
      name,
      description: input.description ?? '',
      type,
      members,
      pinnedMessages: [],
      topic: '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'team_channel',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['team_channel', type]),
        createdBy: input.createdBy,
      },
    });

    return toChannel(row as MemoryRow);
  },

  /**
   * Get a single channel by ID.
   */
  async get(id: string): Promise<Channel | null> {
    const row = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
    null,
    );
    if (!row) return null;
    return toChannel(row as MemoryRow);
  },

  /**
   * List channels for an organization with optional filters.
   */
  async list(organizationId: string, opts: ListChannelOpts = {}): Promise<Channel[]> {
    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'team_channel',
          organizationId,
          ...(opts.workspaceId ? { workspaceId: opts.workspaceId } : {}),
        },
        orderBy: { createdAt: 'asc' },
        take: 500,
      }),
    [],
    );

    let channels = rows.map((r) => toChannel(r as MemoryRow));

    if (opts.type) {
      channels = channels.filter((c) => c.type === opts.type);
    }
    if (opts.memberId) {
      channels = channels.filter((c) => c.members.includes(opts.memberId!));
    }
    if (opts.search) {
      const q = opts.search.toLowerCase();
      channels = channels.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.topic.toLowerCase().includes(q),
      );
    }

    return channels;
  },

  /**
   * Update a channel (name, description, topic).
   */
  async update(id: string, input: UpdateChannelInput): Promise<Channel | null> {
    const existing = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
    null,
    );
    if (!existing) return null;

    const content = parseChannelContent(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.description !== undefined) content.description = input.description;
    if (input.topic !== undefined) content.topic = input.topic;

    const row = await safePrisma(() =>
      prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 10000),
        },
      }),
    null,
    );
    if (!row) return null;
    return toChannel(row as MemoryRow);
  },

  /**
   * Delete a channel.
   */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Add a member to a channel.
   */
  async addMember(channelId: string, userId: string): Promise<Channel | null> {
    const existing = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id: channelId } }),
    null,
    );
    if (!existing) return null;

    const content = parseChannelContent(existing.content);
    if (!content.members.includes(userId)) {
      content.members.push(userId);
    }

    const row = await safePrisma(() =>
      prisma.memory.update({
        where: { id: channelId },
        data: {
          content: JSON.stringify(content).slice(0, 10000),
        },
      }),
    null,
    );
    if (!row) return null;
    return toChannel(row as MemoryRow);
  },

  /**
   * Remove a member from a channel.
   */
  async removeMember(channelId: string, userId: string): Promise<Channel | null> {
    const existing = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id: channelId } }),
    null,
    );
    if (!existing) return null;

    const content = parseChannelContent(existing.content);
    content.members = content.members.filter((m) => m !== userId);

    const row = await safePrisma(() =>
      prisma.memory.update({
        where: { id: channelId },
        data: {
          content: JSON.stringify(content).slice(0, 10000),
        },
      }),
    null,
    );
    if (!row) return null;
    return toChannel(row as MemoryRow);
  },

  /**
   * Get the member list for a channel.
   */
  async getMembers(channelId: string): Promise<string[]> {
    const row = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id: channelId } }),
    null,
    );
    if (!row) return [];
    return parseChannelContent((row as MemoryRow).content).members;
  },

  /**
   * Find or create a direct message channel between two users.
   */
  async getDirectChannel(
    organizationId: string,
    userId1: string,
    userId2: string,
  ): Promise<Channel> {
    const channels = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'team_channel',
          organizationId,
        },
        take: 1000,
      }),
    [],
    );

    const dmKey = [userId1, userId2].sort().join('|');
    for (const r of channels) {
      const content = parseChannelContent((r as MemoryRow).content);
      if (content.type !== 'direct') continue;
      const memberKey = [...content.members].sort().join('|');
      if (memberKey === dmKey) {
        return toChannel(r as MemoryRow);
      }
    }

    // Create a new DM channel
    return ChannelService.create(organizationId, {
      name: `DM:${dmKey}`,
      type: 'direct',
      members: [userId1, userId2],
      createdBy: userId1,
    });
  },

  /**
   * Pin a message in a channel.
   */
  async pinMessage(channelId: string, messageId: string): Promise<Channel | null> {
    const existing = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id: channelId } }),
    null,
    );
    if (!existing) return null;

    const content = parseChannelContent(existing.content);
    if (!content.pinnedMessages.includes(messageId)) {
      content.pinnedMessages.push(messageId);
    }

    const row = await safePrisma(() =>
      prisma.memory.update({
        where: { id: channelId },
        data: {
          content: JSON.stringify(content).slice(0, 10000),
        },
      }),
    null,
    );
    if (!row) return null;
    return toChannel(row as MemoryRow);
  },

  /**
   * Unpin a message from a channel.
   */
  async unpinMessage(channelId: string, messageId: string): Promise<Channel | null> {
    const existing = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id: channelId } }),
    null,
    );
    if (!existing) return null;

    const content = parseChannelContent(existing.content);
    content.pinnedMessages = content.pinnedMessages.filter((m) => m !== messageId);

    const row = await safePrisma(() =>
      prisma.memory.update({
        where: { id: channelId },
        data: {
          content: JSON.stringify(content).slice(0, 10000),
        },
      }),
    null,
    );
    if (!row) return null;
    return toChannel(row as MemoryRow);
  },

  /**
   * Get pinned message IDs for a channel.
   */
  async getPinnedMessages(channelId: string): Promise<string[]> {
    const row = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id: channelId } }),
    null,
    );
    if (!row) return [];
    return parseChannelContent((row as MemoryRow).content).pinnedMessages;
  },

  /**
   * Get channel stats for an organization.
   */
  async getStats(organizationId: string): Promise<ChannelStats> {
    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'team_channel',
          organizationId,
        },
        take: 1000,
      }),
    [],
    );

    const channels = rows.map((r) => toChannel(r as MemoryRow));
    const byType: Record<ChannelType, number> = {
      public: 0,
      private: 0,
      direct: 0,
    };

    let totalMembers = 0;
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    let activeChannels = 0;

    for (const c of channels) {
      byType[c.type] = (byType[c.type] || 0) + 1;
      totalMembers += c.members.length;
      if (now - c.updatedAt.getTime() < oneDayMs) {
        activeChannels += 1;
      }
    }

    return {
      totalChannels: channels.length,
      byType,
      totalMembers,
      activeChannels,
    };
  },
};
