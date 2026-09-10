import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Capacity Planning (Resource Allocations) ──

export const CapacityService = {
  async list(organizationId: string, filters?: {
    status?: string;
    userId?: string;
    projectId?: string;
  }) {
    const where: Record<string, unknown> = { organizationId };
    if (filters?.status) where.status = filters.status;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.projectId) where.projectId = filters.projectId;
    return safePrisma(() =>
      prisma.resourceAllocation.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        take: 500,
      }),
    []);
  },

  async get(id: string) {
    return safePrisma(() =>
      prisma.resourceAllocation.findUnique({ where: { id } }),
    null);
  },

  async create(input: {
    organizationId: string;
    workspaceId?: string;
    userId: string;
    projectId?: string;
    role?: string;
    allocatedHours?: number;
    maxHours?: number;
    startDate: Date;
    endDate?: Date;
    status?: string;
    notes?: string;
  }) {
    return prisma.resourceAllocation.create({
      data: {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId || null,
        userId: input.userId,
        projectId: input.projectId || null,
        role: input.role || 'member',
        allocatedHours: input.allocatedHours ?? 0,
        maxHours: input.maxHours ?? 40,
        startDate: input.startDate,
        endDate: input.endDate || null,
        status: input.status || 'active',
        notes: input.notes?.slice(0, 5000) || '',
      },
    });
  },

  async update(id: string, data: {
    role?: string;
    allocatedHours?: number;
    maxHours?: number;
    startDate?: Date;
    endDate?: Date;
    status?: string;
    notes?: string;
    projectId?: string;
  }) {
    const updateData: Record<string, unknown> = {};
    if (data.role !== undefined) updateData.role = data.role;
    if (data.allocatedHours !== undefined) updateData.allocatedHours = data.allocatedHours;
    if (data.maxHours !== undefined) updateData.maxHours = data.maxHours;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes.slice(0, 5000);
    if (data.projectId !== undefined) updateData.projectId = data.projectId || null;
    return prisma.resourceAllocation.update({ where: { id }, data: updateData });
  },

  async delete(id: string) {
    return prisma.resourceAllocation.delete({ where: { id } });
  },

  async changeAllocationStatus(id: string, status: string) {
    return prisma.resourceAllocation.update({
      where: { id },
      data: { status },
    });
  },

  async getUserAllocations(organizationId: string, userId: string) {
    return safePrisma(() =>
      prisma.resourceAllocation.findMany({
        where: { organizationId, userId, status: 'active' },
        orderBy: [{ startDate: 'asc' }],
      }),
    []);
  },

  async getProjectAllocations(organizationId: string, projectId: string) {
    return safePrisma(() =>
      prisma.resourceAllocation.findMany({
        where: { organizationId, projectId, status: 'active' },
        orderBy: [{ startDate: 'asc' }],
      }),
    []);
  },

  async getUserUtilization(organizationId: string, userId: string) {
    const allocations = await this.getUserAllocations(organizationId, userId);
    const allocatedHours = allocations.reduce((sum, a) => sum + a.allocatedHours, 0);
    const maxHours = allocations.length > 0
      ? allocations.reduce((sum, a) => sum + a.maxHours, 0)
      : 40;
    const utilization = maxHours > 0 ? (allocatedHours / maxHours) * 100 : 0;
    return {
      userId,
      allocatedHours,
      maxHours,
      utilization: Math.round(utilization * 100) / 100,
      allocationCount: allocations.length,
    };
  },

  async getTeamUtilization(organizationId: string) {
    const allocations = await safePrisma(() =>
      prisma.resourceAllocation.findMany({
        where: { organizationId, status: 'active' },
      }),
    []);
    const byUser: Record<string, { allocatedHours: number; maxHours: number; allocationCount: number }> = {};
    for (const a of allocations as Array<{ userId: string; allocatedHours: number; maxHours: number }>) {
      if (!byUser[a.userId]) {
        byUser[a.userId] = { allocatedHours: 0, maxHours: 0, allocationCount: 0 };
      }
      byUser[a.userId].allocatedHours += a.allocatedHours;
      byUser[a.userId].maxHours += a.maxHours;
      byUser[a.userId].allocationCount += 1;
    }
    const users = Object.entries(byUser).map(([userId, info]) => ({
      userId,
      allocatedHours: info.allocatedHours,
      maxHours: info.maxHours,
      utilization: info.maxHours > 0 ? Math.round((info.allocatedHours / info.maxHours) * 10000) / 100 : 0,
      allocationCount: info.allocationCount,
    }));
    const totalAllocated = users.reduce((s, u) => s + u.allocatedHours, 0);
    const totalMax = users.reduce((s, u) => s + u.maxHours, 0);
    return {
      users,
      averageUtilization: totalMax > 0 ? Math.round((totalAllocated / totalMax) * 10000) / 100 : 0,
      totalAllocated,
      totalMax,
    };
  },

  async getOverallocatedUsers(organizationId: string) {
    const team = await this.getTeamUtilization(organizationId);
    return team.users.filter((u) => u.utilization > 100);
  },

  async getUnderutilizedUsers(organizationId: string) {
    const team = await this.getTeamUtilization(organizationId);
    return team.users.filter((u) => u.utilization < 60);
  },

  async getProjectCapacity(organizationId: string, projectId: string) {
    const allocations = await this.getProjectAllocations(organizationId, projectId);
    const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedHours, 0);
    const totalMax = allocations.reduce((sum, a) => sum + a.maxHours, 0);
    return {
      projectId,
      allocationCount: allocations.length,
      totalAllocated,
      totalMax,
      utilization: totalMax > 0 ? Math.round((totalAllocated / totalMax) * 10000) / 100 : 0,
    };
  },

  async getWorkloadByProject(organizationId: string) {
    const allocations = await safePrisma(() =>
      prisma.resourceAllocation.findMany({
        where: { organizationId, status: 'active' },
      }),
    []);
    const byProject: Record<string, { allocatedHours: number; userCount: number }> = {};
    for (const a of allocations as Array<{ projectId: string | null; allocatedHours: number; userId: string }>) {
      const key = a.projectId || 'unassigned';
      if (!byProject[key]) byProject[key] = { allocatedHours: 0, userCount: 0 };
      byProject[key].allocatedHours += a.allocatedHours;
      byProject[key].userCount += 1;
    }
    return Object.entries(byProject).map(([projectId, info]) => ({
      projectId,
      allocatedHours: info.allocatedHours,
      userCount: info.userCount,
    }));
  },

  async getWorkloadByUser(organizationId: string) {
    return this.getTeamUtilization(organizationId).then((t) => t.users);
  },

  async getBottlenecks(organizationId: string) {
    const [overallocated, allocations] = await Promise.all([
      this.getOverallocatedUsers(organizationId),
      safePrisma(() =>
        prisma.resourceAllocation.findMany({
          where: { organizationId, status: 'active' },
        }),
      []),
    ]);
    const overUserIds = new Set(overallocated.map((u) => u.userId));
    // bottlenecks: overallocated users with multiple projects
    const projectCounts: Record<string, Set<string>> = {};
    for (const a of allocations as Array<{ userId: string; projectId: string | null }>) {
      if (!overUserIds.has(a.userId)) continue;
      if (!projectCounts[a.userId]) projectCounts[a.userId] = new Set();
      if (a.projectId) projectCounts[a.userId].add(a.projectId);
    }
    return overallocated
      .filter((u) => (projectCounts[u.userId]?.size ?? 0) >= 2)
      .map((u) => ({
        ...u,
        projectCount: projectCounts[u.userId]?.size ?? 0,
      }));
  },

  async getForecast(organizationId: string, weeks = 4) {
    const allocations = await safePrisma(() =>
      prisma.resourceAllocation.findMany({
        where: { organizationId, status: 'active' },
      }),
    []);
    const now = new Date();
    const forecast: Array<{ week: number; date: Date; allocatedHours: number; utilization: number }> = [];
    const totalMax = allocations.reduce((sum, a) => sum + a.maxHours, 0);
    for (let w = 0; w < weeks; w++) {
      const weekDate = new Date(now);
      weekDate.setDate(weekDate.getDate() + w * 7);
      // sum allocations active during this week
      let activeHours = 0;
      for (const a of allocations as Array<{ allocatedHours: number; startDate: Date; endDate: Date | null }>) {
        const start = new Date(a.startDate);
        const end = a.endDate ? new Date(a.endDate) : null;
        if (start <= weekDate && (!end || end >= weekDate)) {
          activeHours += a.allocatedHours;
        }
      }
      forecast.push({
        week: w + 1,
        date: weekDate,
        allocatedHours: activeHours,
        utilization: totalMax > 0 ? Math.round((activeHours / totalMax) * 10000) / 100 : 0,
      });
    }
    return forecast;
  },

  async getStats(organizationId: string) {
    const [total, byStatus, overallocated, underutilized] = await Promise.all([
      safePrisma(() => prisma.resourceAllocation.count({ where: { organizationId } }), 0),
      safePrisma(() =>
        prisma.resourceAllocation.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: true,
        }),
      []),
      this.getOverallocatedUsers(organizationId),
      this.getUnderutilizedUsers(organizationId),
    ]);
    const statusCounts: Record<string, number> = {};
    for (const row of byStatus as Array<{ status: string; _count: number }>) {
      statusCounts[row.status] = row._count;
    }
    return {
      total,
      byStatus: statusCounts,
      overallocatedCount: overallocated.length,
      underutilizedCount: underutilized.length,
    };
  },
};
