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

/** Parsed content payload for an issue comment Memory. */
interface IssueCommentContent {
  issueId: string;
  authorId: string;
  content: string;
  edited: boolean;
}

/** A structured issue comment returned to callers. */
export interface IssueComment {
  id: string;
  organizationId: string;
  workspaceId: string;
  issueId: string;
  authorId: string;
  content: string;
  edited: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIssueCommentInput {
  issueId: string;
  authorId: string;
  content: string;
  workspaceId?: string;
}

// ── Helpers ──

const fallbackContent: IssueCommentContent = {
  issueId: '',
  authorId: '',
  content: '',
  edited: false,
};

function parseCommentContent(raw: string): IssueCommentContent {
  if (!raw) return fallbackContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      issueId: parsed.issueId ?? '',
      authorId: parsed.authorId ?? '',
      content: parsed.content ?? '',
      edited: parsed.edited ?? false,
    };
  } catch {
    return fallbackContent;
  }
}

function toComment(row: MemoryRow): IssueComment {
  const content = parseCommentContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    issueId: content.issueId,
    authorId: content.authorId,
    content: content.content,
    edited: content.edited,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Issue Comment Service ──

export const IssueCommentService = {
  /**
   * Create a comment. Stored as a Memory with type='issue_comment'.
   */
  async create(organizationId: string, input: CreateIssueCommentInput): Promise<IssueComment> {
    const content: IssueCommentContent = {
      issueId: input.issueId,
      authorId: input.authorId,
      content: input.content.trim(),
      edited: false,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId: input.workspaceId || organizationId,
        organizationId,
        type: 'issue_comment',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.issueId,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['issue_comment', input.issueId]),
        createdBy: input.authorId,
      },
    });

    return toComment(row as MemoryRow);
  },

  /**
   * Get a single comment by ID.
   */
  async get(id: string): Promise<IssueComment | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toComment(row as MemoryRow);
  },

  /**
   * List comments for an issue (ordered oldest first).
   */
  async list(issueId: string): Promise<IssueComment[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: { type: 'issue_comment', sourceId: issueId },
          orderBy: { createdAt: 'asc' },
          take: 500,
        }),
      [],
    );
    return rows.map((r) => toComment(r as MemoryRow));
  },

  /**
   * Update a comment's content.
   */
  async update(id: string, content: string): Promise<IssueComment | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const parsed = parseCommentContent(existing.content);
    parsed.content = content.trim();
    parsed.edited = true;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: { content: JSON.stringify(parsed).slice(0, 10000) },
        }),
      null,
    );
    if (!row) return null;
    return toComment(row as MemoryRow);
  },

  /**
   * Delete a comment.
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
   * Get all comments for an issue (alias for list).
   */
  async getByIssue(issueId: string): Promise<IssueComment[]> {
    return IssueCommentService.list(issueId);
  },
};
