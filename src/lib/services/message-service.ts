import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

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

/** Parsed content payload for a message Memory. */
interface MessageContent {
  body: string;
  userId: string;
  attachments: Attachment[];
  replyTo: string | null;
  mentions: string[];
  edited: boolean;
}

/** A file attachment. */
export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
}

/** A structured message returned to callers. */
export interface Message {
  id: string;
  channelId: string;
  organizationId: string;
  workspaceId: string;
  body: string;
  userId: string;
  attachments: Attachment[];
  replyTo: string | null;
  mentions: string[];
  edited: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A grouped reaction (emoji → users). */
export interface ReactionGroup {
  emoji: string;
  count: number;
  userIds: string[];
}

/** A single reaction record. */
interface ReactionContent {
  emoji: string;
  userId: string;
  messageId: string;
}

export interface CreateMessageInput {
  channelId: string;
  userId: string;
  body: string;
  attachments?: Attachment[];
  replyTo?: string;
  mentions?: string[];
  edited?: boolean;
}

export interface ListMessageOpts {
  limit?: number;
  offset?: number;
  before?: Date;
  after?: Date;
}

export interface SearchOpts {
  channelId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface RecentOpts {
  workspaceId?: string;
  userId?: string;
  limit?: number;
}

export interface MessageStats {
  totalMessages: number;
  byChannel: Record<string, number>;
  attachmentsCount: number;
  avgPerChannel: number;
}

// ── Helpers ──

const fallbackContent: MessageContent = {
  body: '',
  userId: '',
  attachments: [],
  replyTo: null,
  mentions: [],
  edited: false,
};

function parseMessageContent(raw: string): MessageContent {
  if (!raw) return fallbackContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      body: parsed.body ?? '',
      userId: parsed.userId ?? '',
      attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [],
      replyTo: parsed.replyTo ?? null,
      mentions: Array.isArray(parsed.mentions) ? parsed.mentions : [],
      edited: parsed.edited ?? false,
    };
  } catch {
    return fallbackContent;
  }
}

function toMessage(row: MemoryRow): Message {
  const content = parseMessageContent(row.content);
  return {
    id: row.id,
    channelId: row.sourceId ?? '',
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    body: content.body,
    userId: content.userId,
    attachments: content.attachments,
    replyTo: content.replyTo,
    mentions: content.mentions,
    edited: content.edited,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseReactionContent(raw: string): ReactionContent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      emoji: parsed.emoji ?? '',
      userId: parsed.userId ?? '',
      messageId: parsed.messageId ?? '',
    };
  } catch {
    return null;
  }
}

// ── Message Service ──

export const MessageService = {
  /**
   * Create a message. Stored as a Memory with type='team_message'.
   */
  async create(organizationId: string, input: CreateMessageInput): Promise<Message> {
    const content: MessageContent = {
      body: input.body,
      userId: input.userId,
      attachments: input.attachments ?? [],
      replyTo: input.replyTo ?? null,
      mentions: input.mentions ?? [],
      edited: false,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId: organizationId,
        organizationId,
        type: 'team_message',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.channelId,
        confidence: 1.0,
        lifecycle: 'medium',
        tags: JSON.stringify(['team_message']),
        createdBy: input.userId,
      },
    });

    return toMessage(row as MemoryRow);
  },

  /**
   * Get a single message by ID.
   */
  async get(id: string): Promise<Message | null> {
    const row = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
    null,
    );
    if (!row) return null;
    return toMessage(row as MemoryRow);
  },

  /**
   * List messages in a channel with pagination.
   */
  async list(channelId: string, opts: ListMessageOpts = {}): Promise<Message[]> {
    const limit = Math.min(opts.limit ?? 50, 500);
    const offset = Math.max(opts.offset ?? 0, 0);

    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'team_message',
          sourceId: channelId,
          ...(opts.before ? { createdAt: { lt: opts.before } } : {}),
          ...(opts.after ? { createdAt: { gt: opts.after } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
    [],
    );

    return rows.map((r) => toMessage(r as MemoryRow));
  },

  /**
   * Edit a message body and mark it as edited.
   */
  async update(id: string, body: string): Promise<Message | null> {
    const existing = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
    null,
    );
    if (!existing) return null;

    const content = parseMessageContent(existing.content);
    content.body = body;
    content.edited = true;

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
    return toMessage(row as MemoryRow);
  },

  /**
   * Delete a message.
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
   * Get threaded replies for a parent message.
   */
  async getThread(channelId: string, parentId: string): Promise<Message[]> {
    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'team_message',
          sourceId: channelId,
        },
        orderBy: { createdAt: 'asc' },
        take: 500,
      }),
    [],
    );

    return rows
      .map((r) => toMessage(r as MemoryRow))
      .filter((m) => m.replyTo === parentId);
  },

  /**
   * Search messages across an organization.
   */
  async search(organizationId: string, query: string, opts: SearchOpts = {}): Promise<Message[]> {
    const limit = Math.min(opts.limit ?? 50, 500);
    const q = query.toLowerCase();

    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'team_message',
          organizationId,
          ...(opts.channelId ? { sourceId: opts.channelId } : {}),
          ...(opts.userId ? { createdBy: opts.userId } : {}),
          ...(opts.startDate || opts.endDate
            ? {
                createdAt: {
                  ...(opts.startDate ? { gte: opts.startDate } : {}),
                  ...(opts.endDate ? { lte: opts.endDate } : {}),
                },
              }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
    [],
    );

    const messages = rows
      .map((r) => toMessage(r as MemoryRow))
      .filter((m) => m.body.toLowerCase().includes(q));

    return messages.slice(0, limit);
  },

  /**
   * Get reactions for a message, grouped by emoji.
   */
  async getReactions(messageId: string): Promise<ReactionGroup[]> {
    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: { type: 'message_reaction', sourceId: `message:${messageId}` },
        take: 500,
      }),
    [],
    );

    const groups = new Map<string, string[]>();
    for (const r of rows) {
      const rc = parseReactionContent((r as MemoryRow).content);
      if (!rc || !rc.emoji || !rc.userId) continue;
      if (!groups.has(rc.emoji)) groups.set(rc.emoji, []);
      groups.get(rc.emoji)!.push(rc.userId);
    }

    return Array.from(groups.entries()).map(([emoji, userIds]) => ({
      emoji,
      count: userIds.length,
      userIds,
    }));
  },

  /**
   * Add a reaction to a message. Idempotent — one reaction per user per emoji.
   */
  async addReaction(messageId: string, userId: string, emoji: string): Promise<boolean> {
    const existing = await safePrisma(() =>
      prisma.memory.findMany({
        where: { type: 'message_reaction', sourceId: `message:${messageId}` },
        take: 500,
      }),
    [],
    );

    const alreadyExists = existing.some((r) => {
      const rc = parseReactionContent((r as MemoryRow).content);
      return rc?.userId === userId && rc?.emoji === emoji;
    });
    if (alreadyExists) return false;

    const content: ReactionContent = { emoji, userId, messageId };
    await prisma.memory.create({
      data: {
        workspaceId: (existing[0] as MemoryRow | undefined)?.workspaceId || 'unknown',
        organizationId: (existing[0] as MemoryRow | undefined)?.organizationId || 'unknown',
        type: 'message_reaction',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: `message:${messageId}`,
        confidence: 1.0,
        lifecycle: 'short',
        tags: JSON.stringify(['message_reaction', emoji]),
        createdBy: userId,
      },
    });
    return true;
  },

  /**
   * Remove a reaction from a message.
   */
  async removeReaction(messageId: string, userId: string, emoji: string): Promise<boolean> {
    const reactions = await safePrisma(() =>
      prisma.memory.findMany({
        where: { type: 'message_reaction', sourceId: `message:${messageId}` },
        take: 500,
      }),
    [],
    );

    const target = reactions.find((r) => {
      const rc = parseReactionContent((r as MemoryRow).content);
      return rc?.userId === userId && rc?.emoji === emoji;
    });

    if (!target) return false;

    try {
      await prisma.memory.delete({ where: { id: target.id } });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get all attachments in a channel.
   */
  async getAttachments(channelId: string, opts: { limit?: number } = {}): Promise<Attachment[]> {
    const limit = Math.min(opts.limit ?? 100, 500);
    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'team_message',
          sourceId: channelId,
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
    [],
    );

    const attachments: Attachment[] = [];
    for (const r of rows) {
      const content = parseMessageContent((r as MemoryRow).content);
      for (const a of content.attachments) {
        attachments.push(a);
        if (attachments.length >= limit) return attachments;
      }
    }
    return attachments;
  },

  /**
   * Get recent messages across all channels in an organization.
   */
  async getRecent(organizationId: string, opts: RecentOpts = {}): Promise<Message[]> {
    const limit = Math.min(opts.limit ?? 50, 500);
    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'team_message',
          organizationId,
          ...(opts.workspaceId ? { workspaceId: opts.workspaceId } : {}),
          ...(opts.userId ? { createdBy: opts.userId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    [],
    );

    return rows.map((r) => toMessage(r as MemoryRow));
  },

  /**
   * Get message stats for an organization.
   */
  async getStats(organizationId: string): Promise<MessageStats> {
    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'team_message',
          organizationId,
        },
        take: 5000,
      }),
    [],
    );

    const messages = rows.map((r) => toMessage(r as MemoryRow));
    const byChannel: Record<string, number> = {};
    let attachmentsCount = 0;

    for (const m of messages) {
      byChannel[m.channelId] = (byChannel[m.channelId] || 0) + 1;
      attachmentsCount += m.attachments.length;
    }

    const channelCount = Object.keys(byChannel).length;

    return {
      totalMessages: messages.length,
      byChannel,
      attachmentsCount,
      avgPerChannel: channelCount > 0 ? Math.round(messages.length / channelCount) : 0,
    };
  },
};
