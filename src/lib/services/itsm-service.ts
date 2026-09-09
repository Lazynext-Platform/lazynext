import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── ITSM Incidents ──

export const ITSMService = {
  async list(organizationId: string, filters?: {
    status?: string;
    priority?: string;
    category?: string;
    type?: string;
    search?: string;
  }) {
    const where: Record<string, unknown> = { organizationId };
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.category) where.category = filters.category;
    if (filters?.type) where.type = filters.type;
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }
    return safePrisma(() =>
      prisma.iTSMIncident.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        take: 200,
      }),
    []);
  },

  async get(id: string) {
    return safePrisma(() =>
      prisma.iTSMIncident.findUnique({ where: { id } }),
    null);
  },

  async create(input: {
    organizationId: string;
    workspaceId?: string;
    title: string;
    description?: string;
    type?: string;
    priority?: string;
    status?: string;
    severity?: string;
    category?: string;
    assignedToId?: string;
    reportedById?: string;
    affectedService?: string;
    slaDueAt?: Date;
    tags?: string[];
  }) {
    return prisma.iTSMIncident.create({
      data: {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId || null,
        title: input.title.slice(0, 300),
        description: input.description?.slice(0, 5000) || '',
        type: input.type || 'incident',
        priority: input.priority || 'medium',
        status: input.status || 'open',
        severity: input.severity || 'minor',
        category: input.category || 'general',
        assignedToId: input.assignedToId || null,
        reportedById: input.reportedById || null,
        affectedService: input.affectedService?.slice(0, 200) || null,
        slaDueAt: input.slaDueAt || null,
        tags: JSON.stringify(input.tags || []),
      },
    });
  },

  async update(id: string, data: {
    title?: string;
    description?: string;
    type?: string;
    priority?: string;
    status?: string;
    severity?: string;
    category?: string;
    assignedToId?: string;
    reportedById?: string;
    affectedService?: string;
    resolution?: string;
    slaDueAt?: Date;
    tags?: string[];
  }) {
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title.slice(0, 300);
    if (data.description !== undefined) updateData.description = data.description.slice(0, 5000);
    if (data.type !== undefined) updateData.type = data.type;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.severity !== undefined) updateData.severity = data.severity;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId || null;
    if (data.reportedById !== undefined) updateData.reportedById = data.reportedById || null;
    if (data.affectedService !== undefined) updateData.affectedService = data.affectedService?.slice(0, 200) || null;
    if (data.resolution !== undefined) updateData.resolution = data.resolution.slice(0, 5000);
    if (data.slaDueAt !== undefined) updateData.slaDueAt = data.slaDueAt;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    return prisma.iTSMIncident.update({ where: { id }, data: updateData });
  },

  async delete(id: string) {
    return prisma.iTSMIncident.delete({ where: { id } });
  },

  async assignIncident(id: string, assignedToId: string) {
    return prisma.iTSMIncident.update({
      where: { id },
      data: { assignedToId },
    });
  },

  async changeIncidentStatus(id: string, status: string) {
    const now = new Date();
    const data: Record<string, unknown> = { status };
    if (status === 'resolved') data.resolvedAt = now;
    if (status === 'closed') {
      data.closedAt = now;
      // ensure resolvedAt is set when closing
      data.resolvedAt = now;
    }
    return prisma.iTSMIncident.update({ where: { id }, data });
  },

  async escalateIncident(id: string) {
    const incident = await prisma.iTSMIncident.findUnique({ where: { id } });
    if (!incident) throw new Error('incident_not_found');
    const order = ['low', 'medium', 'high', 'urgent'];
    const idx = order.indexOf(incident.priority);
    const newPriority = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : incident.priority;
    return prisma.iTSMIncident.update({
      where: { id },
      data: { priority: newPriority },
    });
  },

  async resolveIncident(id: string, resolution?: string) {
    const data: Record<string, unknown> = {
      status: 'resolved',
      resolvedAt: new Date(),
    };
    if (resolution !== undefined) data.resolution = resolution.slice(0, 5000);
    return prisma.iTSMIncident.update({ where: { id }, data });
  },

  async closeIncident(id: string) {
    const now = new Date();
    return prisma.iTSMIncident.update({
      where: { id },
      data: { status: 'closed', closedAt: now, resolvedAt: now },
    });
  },

  async getSLABreaches(organizationId: string) {
    const now = new Date();
    return safePrisma(() =>
      prisma.iTSMIncident.findMany({
        where: {
          organizationId,
          slaDueAt: { lt: now },
          status: { notIn: ['resolved', 'closed', 'cancelled'] },
        },
        orderBy: { slaDueAt: 'asc' },
      }),
    []);
  },

  async getByStatus(organizationId: string, status: string) {
    return safePrisma(() =>
      prisma.iTSMIncident.findMany({
        where: { organizationId, status },
        orderBy: [{ createdAt: 'desc' }],
        take: 200,
      }),
    []);
  },

  async getByPriority(organizationId: string, priority: string) {
    return safePrisma(() =>
      prisma.iTSMIncident.findMany({
        where: { organizationId, priority },
        orderBy: [{ createdAt: 'desc' }],
        take: 200,
      }),
    []);
  },

  async getByCategory(organizationId: string, category: string) {
    return safePrisma(() =>
      prisma.iTSMIncident.findMany({
        where: { organizationId, category },
        orderBy: [{ createdAt: 'desc' }],
        take: 200,
      }),
    []);
  },

  async getStats(organizationId: string) {
    const [total, byStatus, byPriority, slaBreaches] = await Promise.all([
      safePrisma(() => prisma.iTSMIncident.count({ where: { organizationId } }), 0),
      safePrisma(() =>
        prisma.iTSMIncident.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: true,
        }),
      []),
      safePrisma(() =>
        prisma.iTSMIncident.groupBy({
          by: ['priority'],
          where: { organizationId },
          _count: true,
        }),
      []),
      this.getSLABreaches(organizationId),
    ]);
    const statusCounts: Record<string, number> = {};
    for (const row of byStatus as Array<{ status: string; _count: number }>) {
      statusCounts[row.status] = row._count;
    }
    const priorityCounts: Record<string, number> = {};
    for (const row of byPriority as Array<{ priority: string; _count: number }>) {
      priorityCounts[row.priority] = row._count;
    }
    return {
      total,
      byStatus: statusCounts,
      byPriority: priorityCounts,
      slaBreaches: slaBreaches.length,
    };
  },
};
