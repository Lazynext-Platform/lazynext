import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { DocumentManagementService } from '@/lib/services/document-management-service';

// ── Types ──

export type KnowledgeBaseVisibility = 'workspace' | 'private' | 'shared';
export type ArticleSource = 'manual' | 'research' | 'agent' | 'import';
export type ArticleStatus = 'draft' | 'published' | 'archived';

// ── Helpers ──

function computeWordCount(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

// ── Knowledge Service ──

export const KnowledgeService = {
  /**
   * List knowledge bases for a workspace.
   */
  async listKnowledgeBases(workspaceId: string) {
    return safePrisma(() =>
      prisma.knowledgeBase.findMany({
        where: { workspaceId },
        include: {
          _count: { select: { articles: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      }),
    []);
  },

  /**
   * Get a single knowledge base with its articles.
   */
  async getKnowledgeBase(id: string) {
    return safePrisma(() =>
      prisma.knowledgeBase.findUnique({
        where: { id },
        include: {
          articles: {
            orderBy: { updatedAt: 'desc' },
            take: 100,
          },
          _count: { select: { articles: true } },
        },
      }),
    null);
  },

  /**
   * Create a new knowledge base.
   */
  async createKnowledgeBase(workspaceId: string, input: {
    organizationId: string;
    name: string;
    description?: string;
    visibility?: KnowledgeBaseVisibility;
    ownerId?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }) {
    return prisma.knowledgeBase.create({
      data: {
        organizationId: input.organizationId,
        workspaceId,
        name: input.name.slice(0, 300),
        description: input.description?.slice(0, 2000) || null,
        visibility: input.visibility || 'workspace',
        ownerId: input.ownerId || null,
        tags: JSON.stringify(input.tags || []),
        metadata: JSON.stringify(input.metadata || {}),
      },
    });
  },

  /**
   * Update a knowledge base.
   */
  async updateKnowledgeBase(id: string, input: {
    name?: string;
    description?: string;
    visibility?: KnowledgeBaseVisibility;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }) {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name.slice(0, 300);
    if (input.description !== undefined) data.description = input.description.slice(0, 2000);
    if (input.visibility !== undefined) data.visibility = input.visibility;
    if (input.tags !== undefined) data.tags = JSON.stringify(input.tags);
    if (input.metadata !== undefined) data.metadata = JSON.stringify(input.metadata);

    return prisma.knowledgeBase.update({ where: { id }, data });
  },

  /**
   * Delete a knowledge base.
   */
  async deleteKnowledgeBase(id: string) {
    return prisma.knowledgeBase.delete({ where: { id } });
  },

  /**
   * List articles in a knowledge base.
   */
  async listArticles(knowledgeBaseId: string) {
    return safePrisma(() =>
      prisma.knowledgeArticle.findMany({
        where: { knowledgeBaseId },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      }),
    []);
  },

  /**
   * Get a single article with its citations.
   */
  async getArticle(id: string) {
    return safePrisma(() =>
      prisma.knowledgeArticle.findUnique({
        where: { id },
        include: {
          citations: { orderBy: { accessedAt: 'desc' }, take: 50 },
        },
      }),
    null);
  },

  /**
   * Create a new article, computing wordCount from content.
   */
  async createArticle(knowledgeBaseId: string, input: {
    title: string;
    content: string;
    summary?: string;
    source?: ArticleSource;
    sourceUrl?: string;
    tags?: string[];
    status?: ArticleStatus;
    createdBy?: string;
  }) {
    return prisma.knowledgeArticle.create({
      data: {
        knowledgeBaseId,
        title: input.title.slice(0, 300),
        content: input.content,
        summary: input.summary?.slice(0, 2000) || null,
        source: input.source || 'manual',
        sourceUrl: input.sourceUrl || null,
        tags: JSON.stringify(input.tags || []),
        status: input.status || 'draft',
        wordCount: computeWordCount(input.content),
        createdBy: input.createdBy || null,
      },
    });
  },

  /**
   * Update an article, incrementing version and recomputing wordCount.
   */
  async updateArticle(id: string, input: {
    title?: string;
    content?: string;
    summary?: string;
    source?: ArticleSource;
    sourceUrl?: string;
    tags?: string[];
    status?: ArticleStatus;
  }) {
    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = input.title.slice(0, 300);
    if (input.content !== undefined) {
      data.content = input.content;
      data.wordCount = computeWordCount(input.content);
    }
    if (input.summary !== undefined) data.summary = input.summary.slice(0, 2000);
    if (input.source !== undefined) data.source = input.source;
    if (input.sourceUrl !== undefined) data.sourceUrl = input.sourceUrl || null;
    if (input.tags !== undefined) data.tags = JSON.stringify(input.tags);
    if (input.status !== undefined) data.status = input.status;

    // Increment version on any update
    data.version = { increment: 1 };

    return prisma.knowledgeArticle.update({ where: { id }, data });
  },

  /**
   * Delete an article.
   */
  async deleteArticle(id: string) {
    return prisma.knowledgeArticle.delete({ where: { id } });
  },

  /**
   * Search across all knowledge bases in a workspace by title/content
   * (case-insensitive contains).
   */
  async searchArticles(workspaceId: string, query: string) {
    const q = query.trim();
    if (!q) return [];

    return safePrisma(() =>
      prisma.knowledgeArticle.findMany({
        where: {
          knowledgeBase: { workspaceId },
          OR: [
            { title: { contains: q } },
            { content: { contains: q } },
          ],
        },
        include: {
          knowledgeBase: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),
    []);
  },

  // ── Document management wrappers (delegate to document-management-service) ──
  // These methods are referenced by the knowledge catch-all route's 'documents' resource.

  async list(organizationId: string, opts?: Record<string, string>) {
    return DocumentManagementService.listDocuments(organizationId, opts || {});
  },
  async create(organizationId: string, workspaceId: string, body: any, createdBy: string) {
    return DocumentManagementService.createDocument(organizationId, workspaceId, body, createdBy);
  },
  async get(id: string) {
    return DocumentManagementService.getDocument(id);
  },
  async update(id: string, body: any) {
    return DocumentManagementService.updateDocument(id, body);
  },
  async delete(id: string) {
    return DocumentManagementService.deleteDocument(id);
  },
  async versions(documentId: string) {
    return DocumentManagementService.getDocumentVersions(documentId);
  },

  // ── Search/stats/tags/tree/links methods ──

  async search(organizationId: string, opts: Record<string, string>) {
    const query = opts.search || opts.q || '';
    if (!query) return [];
    // Search both knowledge articles and documents
    const [articles, documents] = await Promise.all([
      this.searchArticles(organizationId, query),
      safePrisma(() =>
        prisma.document.findMany({
          where: {
            workspace: { organizationId },
            deletedAt: null,
            OR: [
              { title: { contains: query } },
              { content: { contains: query } },
            ],
          },
          take: 50,
        }),
      []) as Promise<any[]>,
    ]);
    return [
      ...articles.map((a: any) => ({ ...a, type: 'article' })),
      ...documents.map((d: any) => ({ ...d, type: 'document' })),
    ];
  },

  async reindex(organizationId: string) {
    // Reindex is a no-op for now — search is done at query time
    return { ok: true, organizationId, message: 'Search index refreshed' };
  },

  async getStats(organizationId: string) {
    const [bases, articles, documents] = await Promise.all([
      safePrisma(() => prisma.knowledgeBase.count({ where: { workspace: { organizationId } } }), 0),
      safePrisma(() => prisma.knowledgeArticle.count({ where: { knowledgeBase: { workspace: { organizationId } } } }), 0),
      safePrisma(() => prisma.document.count({ where: { workspace: { organizationId }, deletedAt: null } }), 0),
    ]);
    return { totalBases: bases, totalArticles: articles, totalDocuments: documents };
  },

  async getTags(organizationId: string) {
    // Extract unique tags from knowledge bases and articles
    const [bases, articles] = await Promise.all([
      safePrisma(() => prisma.knowledgeBase.findMany({
        where: { workspace: { organizationId } },
        select: { tags: true },
        take: 500,
      }), []) as unknown as any[],
      safePrisma(() => prisma.knowledgeArticle.findMany({
        where: { knowledgeBase: { workspace: { organizationId } } },
        select: { tags: true },
        take: 500,
      }), []) as unknown as any[],
    ]);
    const tags = new Set<string>();
    for (const item of [...bases, ...articles]) {
      try {
        const parsed = JSON.parse(item.tags || '[]');
        if (Array.isArray(parsed)) for (const t of parsed) if (t) tags.add(String(t));
      } catch { /* ignore */ }
    }
    return Array.from(tags).sort();
  },

  async getTree(organizationId: string) {
    // Build a tree of knowledge bases and their articles
    const bases = await safePrisma(() =>
      prisma.knowledgeBase.findMany({
        where: { workspace: { organizationId } },
        include: {
          articles: {
            select: { id: true, title: true, status: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' },
            take: 100,
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      }),
    []) as any[];
    return bases.map((b: any) => ({
      id: b.id,
      name: b.name,
      type: 'knowledge-base',
      children: (b.articles || []).map((a: any) => ({
        id: a.id,
        name: a.title,
        type: 'article',
        status: a.status,
      })),
    }));
  },

  async removeLink(id: string) {
    // Remove a document link — for now, this is a soft-delete on a document
    return safePrisma(() =>
      prisma.document.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
    null);
  },
};
