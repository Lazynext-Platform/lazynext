import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Knowledge Base (ITSM Articles) ──
// Uses the ITSMArticle model which has organizationId, category, views, votes.

export const KnowledgeBaseService = {
  async list(organizationId: string, filters?: {
    status?: string;
    category?: string;
    type?: string;
    search?: string;
  }) {
    const where: Record<string, unknown> = { organizationId };
    if (filters?.status) where.status = filters.status;
    if (filters?.category) where.category = filters.category;
    if (filters?.type) where.type = filters.type;
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { content: { contains: filters.search } },
      ];
    }
    return safePrisma(() =>
      prisma.iTSMArticle.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        take: 200,
      }),
    []);
  },

  async get(id: string) {
    return safePrisma(() =>
      prisma.iTSMArticle.findUnique({ where: { id } }),
    null);
  },

  async create(input: {
    organizationId: string;
    workspaceId?: string;
    title: string;
    content?: string;
    category?: string;
    type?: string;
    status?: string;
    tags?: string[];
    authorId: string;
  }) {
    return prisma.iTSMArticle.create({
      data: {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId || null,
        title: input.title.slice(0, 300),
        content: input.content?.slice(0, 50000) || '',
        category: input.category || 'general',
        type: input.type || 'article',
        status: input.status || 'draft',
        tags: JSON.stringify(input.tags || []),
        authorId: input.authorId,
      },
    });
  },

  async update(id: string, data: {
    title?: string;
    content?: string;
    category?: string;
    type?: string;
    status?: string;
    tags?: string[];
  }) {
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title.slice(0, 300);
    if (data.content !== undefined) updateData.content = data.content.slice(0, 50000);
    if (data.category !== undefined) updateData.category = data.category;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    return prisma.iTSMArticle.update({ where: { id }, data: updateData });
  },

  async delete(id: string) {
    return prisma.iTSMArticle.delete({ where: { id } });
  },

  async publishArticle(id: string) {
    return prisma.iTSMArticle.update({
      where: { id },
      data: { status: 'published', publishedAt: new Date() },
    });
  },

  async archiveArticle(id: string) {
    return prisma.iTSMArticle.update({
      where: { id },
      data: { status: 'archived' },
    });
  },

  async incrementViews(id: string) {
    const article = await prisma.iTSMArticle.findUnique({ where: { id } });
    if (!article) throw new Error('article_not_found');
    return prisma.iTSMArticle.update({
      where: { id },
      data: { views: article.views + 1 },
    });
  },

  async voteArticle(id: string, helpful: boolean) {
    const article = await prisma.iTSMArticle.findUnique({ where: { id } });
    if (!article) throw new Error('article_not_found');
    const data: Record<string, unknown> = {};
    if (helpful) data.helpfulVotes = article.helpfulVotes + 1;
    else data.unhelpfulVotes = article.unhelpfulVotes + 1;
    return prisma.iTSMArticle.update({ where: { id }, data });
  },

  async searchArticles(organizationId: string, query: string) {
    return safePrisma(() =>
      prisma.iTSMArticle.findMany({
        where: {
          organizationId,
          status: 'published',
          OR: [
            { title: { contains: query } },
            { content: { contains: query } },
          ],
        },
        orderBy: [{ views: 'desc' }, { updatedAt: 'desc' }],
        take: 50,
      }),
    []);
  },

  async getByCategory(organizationId: string, category: string) {
    return safePrisma(() =>
      prisma.iTSMArticle.findMany({
        where: { organizationId, category },
        orderBy: [{ updatedAt: 'desc' }],
        take: 200,
      }),
    []);
  },

  async getPopular(organizationId: string, limit = 10) {
    return safePrisma(() =>
      prisma.iTSMArticle.findMany({
        where: { organizationId, status: 'published' },
        orderBy: [{ views: 'desc' }, { helpfulVotes: 'desc' }],
        take: clamp(limit, 1, 100),
      }),
    []);
  },

  async getStats(organizationId: string) {
    const [total, byStatus, byCategory, totalViews] = await Promise.all([
      safePrisma(() => prisma.iTSMArticle.count({ where: { organizationId } }), 0),
      safePrisma(() =>
        prisma.iTSMArticle.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: true,
        }),
      []),
      safePrisma(() =>
        prisma.iTSMArticle.groupBy({
          by: ['category'],
          where: { organizationId },
          _count: true,
        }),
      []),
      safePrisma(() =>
        prisma.iTSMArticle.aggregate({
          where: { organizationId },
          _sum: { views: true },
        }),
      { _sum: { views: 0 } }),
    ]);
    const statusCounts: Record<string, number> = {};
    for (const row of byStatus as Array<{ status: string; _count: number }>) {
      statusCounts[row.status] = row._count;
    }
    const categoryCounts: Record<string, number> = {};
    for (const row of byCategory as Array<{ category: string; _count: number }>) {
      categoryCounts[row.category] = row._count;
    }
    return {
      total,
      byStatus: statusCounts,
      byCategory: categoryCounts,
      totalViews: (totalViews as { _sum: { views: number | null } })._sum.views ?? 0,
    };
  },
};

// ── Helpers ──

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}
