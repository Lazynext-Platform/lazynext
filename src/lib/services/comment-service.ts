import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { NotificationService } from '@/lib/services/notification-service';

// ── Types ──

export type CommentResourceType =
  | 'task'
  | 'goal'
  | 'project'
  | 'document'
  | 'knowledge'
  | 'approval'
  | 'agent';

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

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

/** Parsed content payload for a comment Memory. */
interface CommentContent {
  body: string;
  parentId: string | null;
  mentions: string[];
  edited: boolean;
}

/** A structured comment returned to callers. */
export interface Comment {
  id: string;
  resourceType: string;
  resourceId: string;
  workspaceId: string;
  organizationId: string;
  body: string;
  parentId: string | null;
  mentions: string[];
  edited: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  replies?: Comment[];
  reactions?: ReactionGroup[];
  resolved?: boolean;
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
  commentId: string;
}

/** Thread resolution payload. */
interface ResolutionContent {
  commentId: string;
  resolvedBy: string;
  resolvedAt: string;
}

export interface CreateCommentInput {
  resourceType: CommentResourceType;
  resourceId: string;
  workspaceId?: string;
  parentId?: string;
  body: string;
  mentions?: string[];
  createdBy: string;
}

export interface ListCommentOpts {
  sort?: 'asc' | 'desc';
  includeReplies?: boolean;
}

export interface RecentCommentOpts {
  workspaceId?: string;
  userId?: string;
  limit?: number;
}

export interface GetMentionsOpts {
  workspaceId?: string;
  limit?: number;
}

// ── Helpers ──

function buildKey(resourceType: string, resourceId: string): string {
  return `${resourceType}:${resourceId}`;
}

function parseKey(key: string | null): { resourceType: string; resourceId: string } {
  if (!key) return { resourceType: '', resourceId: '' };
  const idx = key.indexOf(':');
  if (idx === -1) return { resourceType: key, resourceId: '' };
  return { resourceType: key.slice(0, idx), resourceId: key.slice(idx + 1) };
}

function parseCommentContent(raw: string): CommentContent {
  const fallback: CommentContent = { body: '', parentId: null, mentions: [], edited: false };
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return {
      body: parsed.body ?? '',
      parentId: parsed.parentId ?? null,
      mentions: Array.isArray(parsed.mentions) ? parsed.mentions : [],
      edited: parsed.edited ?? false,
    };
  } catch {
    return fallback;
  }
}

function toComment(row: MemoryRow): Comment {
  const content = parseCommentContent(row.content);
  const { resourceType, resourceId } = parseKey(row.sourceId);
  return {
    id: row.id,
    resourceType,
    resourceId,
    workspaceId: row.workspaceId,
    organizationId: row.organizationId,
    body: content.body,
    parentId: content.parentId,
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
      commentId: parsed.commentId ?? '',
    };
  } catch {
    return null;
  }
}

// ── Comment Service ──

export const CommentService = {
  /**
   * Create a comment. Stored as a Memory with type='comment'.
   * If mentions are provided, a notification is created for each mentioned user.
   */
  async create(organizationId: string, input: CreateCommentInput): Promise<Comment> {
    const key = buildKey(input.resourceType, input.resourceId);
    const mentions = input.mentions || [];
    const content: CommentContent = {
      body: input.body,
      parentId: input.parentId ?? null,
      mentions,
      edited: false,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'comment',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: key,
        confidence: 1.0,
        lifecycle: 'medium',
        tags: JSON.stringify(['comment', input.resourceType]),
        createdBy: input.createdBy,
      },
    });

    // Create mention notifications.
    if (mentions.length > 0) {
      await Promise.allSettled(
        mentions.map((mentionedUserId) =>
          NotificationService.create({
            userId: mentionedUserId,
            workspaceId: input.workspaceId,
            organizationId,
            type: 'mention',
            title: 'You were mentioned in a comment',
            body: input.body.slice(0, 200),
            category: 'social',
            priority: 'high',
            actionUrl: `/${input.resourceType}/${input.resourceId}`,
            metadata: {
              resourceType: input.resourceType,
              resourceId: input.resourceId,
              commentId: row.id,
              authorId: input.createdBy,
            },
            createdBy: input.createdBy,
          }),
        ),
      );
    }

    return toComment(row as MemoryRow);
  },

  /**
   * List comments for a resource.
   */
  async list(
    resourceType: string,
    resourceId: string,
    opts: ListCommentOpts = {},
  ): Promise<Comment[]> {
    const key = buildKey(resourceType, resourceId);
    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: { type: 'comment', sourceId: key },
        orderBy: { createdAt: opts.sort === 'asc' ? 'asc' : 'desc' },
        take: 500,
      }),
    [],
    );

    let comments = rows.map((r) => toComment(r as MemoryRow));

    // When replies are not requested, filter out child comments.
    if (!opts.includeReplies) {
      comments = comments.filter((c) => c.parentId === null);
    }

    return comments;
  },

  /**
   * Get a single comment by ID.
   */
  async get(id: string): Promise<Comment | null> {
    const row = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
    null,
    );
    if (!row) return null;
    return toComment(row as MemoryRow);
  },

  /**
   * Update a comment body and mark it as edited.
   */
  async update(id: string, body: string, editorId: string): Promise<Comment | null> {
    const existing = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id } }),
    null,
    );
    if (!existing) return null;

    const content = parseCommentContent(existing.content);
    content.body = body;
    content.edited = true;

    const row = await safePrisma(() =>
      prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 10000),
          createdBy: editorId,
        },
      }),
    null,
    );
    if (!row) return null;
    return toComment(row as MemoryRow);
  },

  /**
   * Delete a comment and all of its replies.
   */
  async delete(id: string): Promise<{ deleted: boolean; repliesDeleted: number }> {
    // Find all replies (comments whose parentId === id).
    const replies = await safePrisma(() =>
      prisma.memory.findMany({
        where: { type: 'comment' },
        take: 500,
      }),
    [],
    );

    const replyIds: string[] = [];
    for (const r of replies) {
      const c = parseCommentContent((r as MemoryRow).content);
      if (c.parentId === id) replyIds.push((r as MemoryRow).id);
    }

    let repliesDeleted = 0;
    if (replyIds.length > 0) {
      // Recursively delete replies.
      for (const replyId of replyIds) {
        const sub = await CommentService.delete(replyId);
        repliesDeleted += 1 + sub.repliesDeleted;
      }
    }

    // Delete reactions attached to this comment.
    await safePrisma(() =>
      prisma.memory.deleteMany({
        where: { type: 'reaction', sourceId: `comment:${id}` },
      }),
    { count: 0 },
    );

    // Delete thread resolution if present.
    await safePrisma(() =>
      prisma.memory.deleteMany({
        where: { type: 'thread_resolution', sourceId: `comment:${id}` },
      }),
    { count: 0 },
    );

    try {
      await prisma.memory.delete({ where: { id } });
      return { deleted: true, repliesDeleted };
    } catch {
      return { deleted: false, repliesDeleted };
    }
  },

  /**
   * Get threaded comments for a resource (builds a tree from the flat list).
   */
  async getThread(resourceType: string, resourceId: string): Promise<Comment[]> {
    const flat = await CommentService.list(resourceType, resourceId, {
      sort: 'asc',
      includeReplies: true,
    });

    const byId = new Map<string, Comment>();
    for (const c of flat) byId.set(c.id, { ...c, replies: [] });

    const roots: Comment[] = [];
    for (const c of flat) {
      const node = byId.get(c.id)!;
      if (c.parentId && byId.has(c.parentId)) {
        byId.get(c.parentId)!.replies!.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  },

  /**
   * Get direct replies for a comment.
   */
  async getReplies(parentId: string): Promise<Comment[]> {
    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: { type: 'comment' },
        orderBy: { createdAt: 'asc' },
        take: 500,
      }),
    [],
    );

    return rows
      .map((r) => toComment(r as MemoryRow))
      .filter((c) => c.parentId === parentId);
  },

  /**
   * Add a reaction to a comment. Idempotent — one reaction per user per emoji
   * per comment.
   */
  async addReaction(commentId: string, userId: string, emoji: string): Promise<boolean> {
    // Check for an existing identical reaction.
    const existing = await safePrisma(() =>
      prisma.memory.findMany({
        where: { type: 'reaction', sourceId: `comment:${commentId}` },
        take: 500,
      }),
    [],
    );

    const alreadyExists = existing.some((r) => {
      const rc = parseReactionContent((r as MemoryRow).content);
      return rc?.userId === userId && rc?.emoji === emoji;
    });
    if (alreadyExists) return false;

    const content: ReactionContent = { emoji, userId, commentId };
    await prisma.memory.create({
      data: {
        workspaceId: (existing[0] as MemoryRow | undefined)?.workspaceId || 'unknown',
        organizationId: (existing[0] as MemoryRow | undefined)?.organizationId || 'unknown',
        type: 'reaction',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: `comment:${commentId}`,
        confidence: 1.0,
        lifecycle: 'short',
        tags: JSON.stringify(['reaction', emoji]),
        createdBy: userId,
      },
    });
    return true;
  },

  /**
   * Remove a reaction from a comment.
   */
  async removeReaction(commentId: string, userId: string, emoji: string): Promise<boolean> {
    const reactions = await safePrisma(() =>
      prisma.memory.findMany({
        where: { type: 'reaction', sourceId: `comment:${commentId}` },
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
   * Get all reactions for a comment, grouped by emoji.
   */
  async getReactions(commentId: string): Promise<ReactionGroup[]> {
    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: { type: 'reaction', sourceId: `comment:${commentId}` },
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
   * Count comments for a resource.
   */
  async getCommentCount(resourceType: string, resourceId: string): Promise<number> {
    const key = buildKey(resourceType, resourceId);
    return safePrisma(() =>
      prisma.memory.count({
        where: { type: 'comment', sourceId: key },
      }),
    0,
    );
  },

  /**
   * Get recent comments across an organization.
   */
  async getRecentComments(organizationId: string, opts: RecentCommentOpts = {}): Promise<Comment[]> {
    const limit = Math.min(opts.limit ?? 50, 500);
    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'comment',
          organizationId,
          ...(opts.workspaceId ? { workspaceId: opts.workspaceId } : {}),
          ...(opts.userId ? { createdBy: opts.userId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    [],
    );

    return rows.map((r) => toComment(r as MemoryRow));
  },

  /**
   * Mark a thread as resolved.
   */
  async resolveThread(commentId: string, resolvedBy: string): Promise<boolean> {
    // Check for an existing resolution.
    const existing = await safePrisma(() =>
      prisma.memory.findFirst({
        where: { type: 'thread_resolution', sourceId: `comment:${commentId}` },
      }),
    null,
    );
    if (existing) return false;

    const comment = await safePrisma(() =>
      prisma.memory.findUnique({ where: { id: commentId } }),
    null,
    );
    if (!comment) return false;

    const content: ResolutionContent = {
      commentId,
      resolvedBy,
      resolvedAt: new Date().toISOString(),
    };

    await prisma.memory.create({
      data: {
        workspaceId: (comment as MemoryRow).workspaceId,
        organizationId: (comment as MemoryRow).organizationId,
        type: 'thread_resolution',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: `comment:${commentId}`,
        confidence: 1.0,
        lifecycle: 'medium',
        tags: JSON.stringify(['thread_resolution']),
        createdBy: resolvedBy,
      },
    });
    return true;
  },

  /**
   * Unmark a thread as resolved.
   */
  async unresolveThread(commentId: string): Promise<boolean> {
    try {
      await prisma.memory.deleteMany({
        where: { type: 'thread_resolution', sourceId: `comment:${commentId}` },
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get all comments that mention a specific user.
   */
  async getMentions(userId: string, opts: GetMentionsOpts = {}): Promise<Comment[]> {
    const limit = Math.min(opts.limit ?? 50, 500);
    const rows = await safePrisma(() =>
      prisma.memory.findMany({
        where: {
          type: 'comment',
          ...(opts.workspaceId ? { workspaceId: opts.workspaceId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
    [],
    );

    return rows
      .map((r) => toComment(r as MemoryRow))
      .filter((c) => c.mentions.includes(userId))
      .slice(0, limit);
  },
};
