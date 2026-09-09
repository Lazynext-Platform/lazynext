import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Feature Ideas ──

export const FeatureIdeaService = {
  async list(organizationId: string, filters?: {
    status?: string;
    priority?: string;
    category?: string;
    search?: string;
  }) {
    const where: Record<string, unknown> = { organizationId };
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.category) where.category = filters.category;
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }
    return safePrisma(() =>
      prisma.featureIdea.findMany({
        where,
        orderBy: [{ votes: 'desc' }, { updatedAt: 'desc' }],
        take: 200,
      }),
    []);
  },

  async get(id: string) {
    return safePrisma(() =>
      prisma.featureIdea.findUnique({ where: { id } }),
    null);
  },

  async create(input: {
    organizationId: string;
    workspaceId?: string;
    title: string;
    description?: string;
    category?: string;
    status?: string;
    priority?: string;
    impact?: number;
    effort?: number;
    tags?: string[];
    assignedToId?: string;
    releaseId?: string;
    submittedById: string;
    estimatedValue?: number;
  }) {
    return prisma.featureIdea.create({
      data: {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId || null,
        title: input.title.slice(0, 300),
        description: input.description?.slice(0, 5000) || '',
        category: input.category || 'feature',
        status: input.status || 'idea',
        priority: input.priority || 'medium',
        impact: clamp(input.impact ?? 3, 1, 5),
        effort: clamp(input.effort ?? 3, 1, 5),
        tags: JSON.stringify(input.tags || []),
        assignedToId: input.assignedToId || null,
        releaseId: input.releaseId || null,
        submittedById: input.submittedById,
        estimatedValue: input.estimatedValue ?? null,
      },
    });
  },

  async update(id: string, data: {
    title?: string;
    description?: string;
    category?: string;
    status?: string;
    priority?: string;
    impact?: number;
    effort?: number;
    tags?: string[];
    assignedToId?: string;
    releaseId?: string;
    estimatedValue?: number;
  }) {
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title.slice(0, 300);
    if (data.description !== undefined) updateData.description = data.description.slice(0, 5000);
    if (data.category !== undefined) updateData.category = data.category;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.impact !== undefined) updateData.impact = clamp(data.impact, 1, 5);
    if (data.effort !== undefined) updateData.effort = clamp(data.effort, 1, 5);
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId || null;
    if (data.releaseId !== undefined) updateData.releaseId = data.releaseId || null;
    if (data.estimatedValue !== undefined) updateData.estimatedValue = data.estimatedValue;
    return prisma.featureIdea.update({ where: { id }, data: updateData });
  },

  async delete(id: string) {
    return prisma.featureIdea.delete({ where: { id } });
  },

  /** Toggle a vote for a user. Returns the updated idea. */
  async vote(id: string, userId: string) {
    const idea = await prisma.featureIdea.findUnique({ where: { id } });
    if (!idea) throw new Error('idea_not_found');
    const voters: string[] = parseJsonArray(idea.voters);
    const idx = voters.indexOf(userId);
    let voted: boolean;
    if (idx >= 0) {
      voters.splice(idx, 1);
      voted = false;
    } else {
      voters.push(userId);
      voted = true;
    }
    return prisma.featureIdea.update({
      where: { id },
      data: { votes: voters.length, voters: JSON.stringify(voters) },
    }).then((r) => ({ ...r, voted }));
  },

  async getVotes(id: string) {
    const idea = await safePrisma(() =>
      prisma.featureIdea.findUnique({ where: { id }, select: { votes: true, voters: true } }),
    null);
    if (!idea) return { votes: 0, voters: [] as string[] };
    return { votes: idea.votes, voters: parseJsonArray(idea.voters) };
  },

  async getTopIdeas(organizationId: string, limit = 10) {
    return safePrisma(() =>
      prisma.featureIdea.findMany({
        where: { organizationId },
        orderBy: { votes: 'desc' },
        take: clamp(limit, 1, 100),
      }),
    []);
  },
};

// ── Releases ──

export const ReleaseService = {
  async list(organizationId: string, filters?: { status?: string }) {
    const where: Record<string, unknown> = { organizationId };
    if (filters?.status) where.status = filters.status;
    return safePrisma(() =>
      prisma.release.findMany({
        where,
        orderBy: [{ releaseDate: 'desc' }, { updatedAt: 'desc' }],
        take: 100,
      }),
    []);
  },

  async get(id: string) {
    return safePrisma(() =>
      prisma.release.findUnique({ where: { id } }),
    null);
  },

  async create(input: {
    organizationId: string;
    name: string;
    version?: string;
    description?: string;
    status?: string;
    releaseDate?: Date;
    releaseNotes?: string;
    createdBy: string;
  }) {
    return prisma.release.create({
      data: {
        organizationId: input.organizationId,
        name: input.name.slice(0, 300),
        version: input.version?.slice(0, 100) || '',
        description: input.description?.slice(0, 5000) || '',
        status: input.status || 'planned',
        releaseDate: input.releaseDate || null,
        releaseNotes: input.releaseNotes?.slice(0, 10000) || '',
        createdBy: input.createdBy,
      },
    });
  },

  async update(id: string, data: {
    name?: string;
    version?: string;
    description?: string;
    status?: string;
    releaseDate?: Date;
    releaseNotes?: string;
  }) {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name.slice(0, 300);
    if (data.version !== undefined) updateData.version = data.version.slice(0, 100);
    if (data.description !== undefined) updateData.description = data.description.slice(0, 5000);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.releaseDate !== undefined) updateData.releaseDate = data.releaseDate;
    if (data.releaseNotes !== undefined) updateData.releaseNotes = data.releaseNotes.slice(0, 10000);
    return prisma.release.update({ where: { id }, data: updateData });
  },

  async delete(id: string) {
    return prisma.release.delete({ where: { id } });
  },

  async addFeature(releaseId: string, featureId: string) {
    const release = await prisma.release.findUnique({ where: { id: releaseId } });
    if (!release) throw new Error('release_not_found');
    const features: string[] = parseJsonArray(release.features);
    if (!features.includes(featureId)) features.push(featureId);
    const updated = await prisma.release.update({
      where: { id: releaseId },
      data: { features: JSON.stringify(features) },
    });
    // Also link the feature to the release
    await prisma.featureIdea.update({
      where: { id: featureId },
      data: { releaseId, status: 'planned' },
    }).catch(() => null);
    return updated;
  },

  async removeFeature(releaseId: string, featureId: string) {
    const release = await prisma.release.findUnique({ where: { id: releaseId } });
    if (!release) throw new Error('release_not_found');
    const features: string[] = parseJsonArray(release.features).filter((f) => f !== featureId);
    const updated = await prisma.release.update({
      where: { id: releaseId },
      data: { features: JSON.stringify(features) },
    });
    await prisma.featureIdea.update({
      where: { id: featureId },
      data: { releaseId: null },
    }).catch(() => null);
    return updated;
  },

  /** Generate a changelog from the features included in this release. */
  async generateChangelog(releaseId: string) {
    const release = await prisma.release.findUnique({ where: { id: releaseId } });
    if (!release) throw new Error('release_not_found');
    const featureIds = parseJsonArray(release.features);
    const ideas = await safePrisma(() =>
      prisma.featureIdea.findMany({
        where: { id: { in: featureIds } },
      }),
    []);

    const sections: Record<string, string[]> = {
      feature: [],
      improvement: [],
      bug: [],
      research: [],
    };
    for (const idea of ideas as Array<{ title: string; category: string }>) {
      const cat = sections[idea.category] ? idea.category : 'feature';
      sections[cat].push(`- ${idea.title}`);
    }
    const lines: string[] = [`# ${release.name}${release.version ? ` v${release.version}` : ''}`, ''];
    const labels: Record<string, string> = {
      feature: 'New Features',
      improvement: 'Improvements',
      bug: 'Bug Fixes',
      research: 'Research',
    };
    for (const cat of Object.keys(sections)) {
      if (sections[cat].length > 0) {
        lines.push(`## ${labels[cat]}`, '');
        lines.push(...sections[cat], '');
      }
    }
    const changelog = lines.join('\n');
    return prisma.release.update({
      where: { id: releaseId },
      data: { changelog },
    });
  },

  async getStats(organizationId: string) {
    const [total, byStatus] = await Promise.all([
      safePrisma(() => prisma.release.count({ where: { organizationId } }), 0),
      safePrisma(() =>
        prisma.release.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: true,
        }),
      []),
    ]);
    const statusCounts: Record<string, number> = {};
    for (const row of byStatus as Array<{ status: string; _count: number }>) {
      statusCounts[row.status] = row._count;
    }
    return { total, byStatus: statusCounts };
  },
};

// ── Roadmap ──

export const RoadmapService = {
  async list(organizationId: string, filters?: { quarter?: string; status?: string }) {
    const where: Record<string, unknown> = { organizationId };
    if (filters?.quarter) where.quarter = filters.quarter;
    if (filters?.status) where.status = filters.status;
    return safePrisma(() =>
      prisma.roadmapItem.findMany({
        where,
        orderBy: [{ position: 'asc' }, { startDate: 'asc' }],
        take: 200,
      }),
    []);
  },

  async get(id: string) {
    return safePrisma(() =>
      prisma.roadmapItem.findUnique({ where: { id } }),
    null);
  },

  async create(input: {
    organizationId: string;
    featureId?: string;
    title: string;
    description?: string;
    quarter?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    dependencies?: string[];
    color?: string;
    position?: number;
    createdBy: string;
  }) {
    return prisma.roadmapItem.create({
      data: {
        organizationId: input.organizationId,
        featureId: input.featureId || null,
        title: input.title.slice(0, 300),
        description: input.description?.slice(0, 5000) || '',
        quarter: input.quarter?.slice(0, 50) || '',
        status: input.status || 'planned',
        startDate: input.startDate || null,
        endDate: input.endDate || null,
        dependencies: JSON.stringify(input.dependencies || []),
        color: input.color?.slice(0, 20) || '',
        position: input.position ?? 0,
        createdBy: input.createdBy,
      },
    });
  },

  async update(id: string, data: {
    title?: string;
    description?: string;
    quarter?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    dependencies?: string[];
    color?: string;
    position?: number;
    featureId?: string;
  }) {
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title.slice(0, 300);
    if (data.description !== undefined) updateData.description = data.description.slice(0, 5000);
    if (data.quarter !== undefined) updateData.quarter = data.quarter.slice(0, 50);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.dependencies !== undefined) updateData.dependencies = JSON.stringify(data.dependencies);
    if (data.color !== undefined) updateData.color = data.color.slice(0, 20);
    if (data.position !== undefined) updateData.position = data.position;
    if (data.featureId !== undefined) updateData.featureId = data.featureId || null;
    return prisma.roadmapItem.update({ where: { id }, data: updateData });
  },

  async delete(id: string) {
    return prisma.roadmapItem.delete({ where: { id } });
  },

  async getRoadmapByQuarter(organizationId: string, quarter: string) {
    return safePrisma(() =>
      prisma.roadmapItem.findMany({
        where: { organizationId, quarter },
        orderBy: [{ position: 'asc' }, { startDate: 'asc' }],
      }),
    []);
  },

  async getStats(organizationId: string) {
    const [total, byStatus] = await Promise.all([
      safePrisma(() => prisma.roadmapItem.count({ where: { organizationId } }), 0),
      safePrisma(() =>
        prisma.roadmapItem.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: true,
        }),
      []),
    ]);
    const statusCounts: Record<string, number> = {};
    for (const row of byStatus as Array<{ status: string; _count: number }>) {
      statusCounts[row.status] = row._count;
    }
    return { total, byStatus: statusCounts };
  },
};

// ── Overall Product Management Stats ──

export const ProductManagementService = {
  FeatureIdea: FeatureIdeaService,
  Release: ReleaseService,
  Roadmap: RoadmapService,

  async getStats(organizationId: string) {
    const [totalIdeas, ideasByStatus, releaseStats, roadmapStats] = await Promise.all([
      safePrisma(() => prisma.featureIdea.count({ where: { organizationId } }), 0),
      safePrisma(() =>
        prisma.featureIdea.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: true,
        }),
      []),
      ReleaseService.getStats(organizationId),
      RoadmapService.getStats(organizationId),
    ]);
    const ideaStatusCounts: Record<string, number> = {};
    for (const row of ideasByStatus as Array<{ status: string; _count: number }>) {
      ideaStatusCounts[row.status] = row._count;
    }
    return {
      totalIdeas,
      ideasByStatus: ideaStatusCounts,
      releases: releaseStats,
      roadmap: roadmapStats,
    };
  },
};

// ── Helpers ──

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function parseJsonArray(raw: string): string[] {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
