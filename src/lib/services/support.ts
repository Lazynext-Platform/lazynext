import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Support Service ──

export const SupportService = {
  /**
   * List tickets for a workspace with optional filters.
   */
  async listTickets(
    workspaceId: string,
    filters?: { status?: string; priority?: string; assigneeId?: string; customerId?: string },
  ) {
    return safePrisma(() =>
      prisma.ticket.findMany({
        where: {
          workspaceId,
          ...(filters?.status && { status: filters.status }),
          ...(filters?.priority && { priority: filters.priority }),
          ...(filters?.assigneeId && { assigneeId: filters.assigneeId }),
          ...(filters?.customerId && { customerId: filters.customerId }),
        },
        include: {
          _count: { select: { comments: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      }),
    []);
  },

  /**
   * Get a single ticket by ID with comments.
   */
  async getTicket(id: string) {
    return safePrisma(() =>
      prisma.ticket.findUnique({
        where: { id },
        include: {
          comments: { orderBy: { createdAt: 'asc' }, take: 200 },
        },
      }),
    null);
  },

  /**
   * Create a new ticket.
   */
  async createTicket(
    workspaceId: string,
    input: {
      organizationId: string;
      customerId?: string;
      subject: string;
      description: string;
      priority?: string;
      category?: string;
      channel?: string;
      assigneeId?: string;
      reporterId?: string;
      slaHours?: number;
      tags?: string[];
    },
  ) {
    const slaDueAt = input.slaHours
      ? new Date(Date.now() + input.slaHours * 60 * 60 * 1000)
      : null;

    return prisma.ticket.create({
      data: {
        organizationId: input.organizationId,
        workspaceId,
        customerId: input.customerId || null,
        subject: input.subject.slice(0, 300),
        description: input.description.slice(0, 5000),
        priority: input.priority || 'medium',
        category: input.category || 'general',
        channel: input.channel || 'internal',
        assigneeId: input.assigneeId || null,
        reporterId: input.reporterId || null,
        slaDueAt,
        tags: JSON.stringify(input.tags || []),
      },
    });
  },

  /**
   * Update a ticket.
   */
  async updateTicket(
    id: string,
    data: {
      subject?: string;
      description?: string;
      priority?: string;
      category?: string;
      channel?: string;
      assigneeId?: string;
      reporterId?: string;
      customerId?: string;
      tags?: string[];
    },
  ) {
    const updateData: Record<string, unknown> = {};
    if (data.subject !== undefined) updateData.subject = data.subject.slice(0, 300);
    if (data.description !== undefined) updateData.description = data.description.slice(0, 5000);
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.channel !== undefined) updateData.channel = data.channel;
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId || null;
    if (data.reporterId !== undefined) updateData.reporterId = data.reporterId || null;
    if (data.customerId !== undefined) updateData.customerId = data.customerId || null;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);

    return prisma.ticket.update({ where: { id }, data: updateData });
  },

  /**
   * Add a comment to a ticket.
   */
  async addComment(
    ticketId: string,
    input: { authorId?: string; authorType: string; body: string; isInternal?: boolean },
  ) {
    return prisma.ticketComment.create({
      data: {
        ticketId,
        authorId: input.authorId || null,
        authorType: input.authorType,
        body: input.body.slice(0, 5000),
        isInternal: input.isInternal ?? false,
      },
    });
  },

  /**
   * List comments for a ticket.
   */
  async listComments(ticketId: string) {
    return safePrisma(() =>
      prisma.ticketComment.findMany({
        where: { ticketId },
        orderBy: { createdAt: 'asc' },
        take: 200,
      }),
    []);
  },

  /**
   * Assign a ticket to a user.
   */
  async assignTicket(id: string, assigneeId: string) {
    return prisma.ticket.update({
      where: { id },
      data: { assigneeId },
    });
  },

  /**
   * Change a ticket's status.
   * - 'resolved' sets resolvedAt
   * - 'closed' sets closedAt
   * - 'in_progress' sets firstResponseAt if not already set
   */
  async changeStatus(id: string, status: string) {
    const updateData: Record<string, unknown> = { status };

    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
    }
    if (status === 'closed') {
      updateData.closedAt = new Date();
    }
    if (status === 'in_progress') {
      // Only set firstResponseAt if it's not already set
      const existing = await prisma.ticket.findUnique({
        where: { id },
        select: { firstResponseAt: true },
      });
      if (existing && !existing.firstResponseAt) {
        updateData.firstResponseAt = new Date();
      }
    }

    return prisma.ticket.update({ where: { id }, data: updateData });
  },

  /**
   * Escalate a ticket — set priority to 'urgent' and status to 'escalated'.
   */
  async escalate(id: string) {
    return prisma.ticket.update({
      where: { id },
      data: { priority: 'urgent', status: 'escalated' },
    });
  },

  /**
   * Soft delete a ticket — set status to 'closed'.
   */
  async deleteTicket(id: string) {
    return prisma.ticket.update({
      where: { id },
      data: { status: 'closed', closedAt: new Date() },
    });
  },

  /**
   * Get ticket stats for a workspace.
   */
  async getStats(workspaceId: string) {
    const tickets = await safePrisma(() =>
      prisma.ticket.findMany({
        where: { workspaceId },
        select: {
          status: true,
          priority: true,
          category: true,
          slaDueAt: true,
          resolvedAt: true,
          createdAt: true,
        },
      }),
    []);

    const statuses = ['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed', 'escalated'] as const;
    const priorities = ['low', 'medium', 'high', 'urgent'] as const;
    const categories = ['general', 'billing', 'technical', 'bug', 'feature_request', 'account', 'other'] as const;

    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    for (const s of statuses) byStatus[s] = 0;
    for (const p of priorities) byPriority[p] = 0;
    for (const c of categories) byCategory[c] = 0;

    let openCount = 0;
    let resolvedCount = 0;
    let slaCompliant = 0;
    let totalResolutionMs = 0;

    for (const t of tickets) {
      if (byStatus[t.status] !== undefined) byStatus[t.status] += 1;
      else byStatus[t.status] = (byStatus[t.status] || 0) + 1;

      if (byPriority[t.priority] !== undefined) byPriority[t.priority] += 1;
      else byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;

      if (byCategory[t.category] !== undefined) byCategory[t.category] += 1;
      else byCategory[t.category] = (byCategory[t.category] || 0) + 1;

      if (t.status === 'open' || t.status === 'in_progress' || t.status === 'waiting_on_customer' || t.status === 'escalated') {
        openCount += 1;
      }

      if (t.status === 'resolved' || t.status === 'closed') {
        resolvedCount += 1;
        if (t.resolvedAt) {
          totalResolutionMs += t.resolvedAt.getTime() - t.createdAt.getTime();
          if (t.slaDueAt && t.resolvedAt <= t.slaDueAt) {
            slaCompliant += 1;
          }
        }
      }
    }

    const avgResolutionMs = resolvedCount > 0 ? totalResolutionMs / resolvedCount : 0;
    const slaComplianceRate = resolvedCount > 0 ? slaCompliant / resolvedCount : 0;

    return {
      total: tickets.length,
      byStatus,
      byPriority,
      byCategory,
      open: openCount,
      resolved: resolvedCount,
      avgResolutionMs,
      slaComplianceRate,
    };
  },

  /**
   * Get tickets that are SLA-breaching or at risk.
   * slaDueAt < now and status not in ['resolved', 'closed']
   */
  async getSlaStatus(workspaceId: string) {
    const now = new Date();
    return safePrisma(() =>
      prisma.ticket.findMany({
        where: {
          workspaceId,
          slaDueAt: { lt: now },
          status: { notIn: ['resolved', 'closed'] },
        },
        orderBy: { slaDueAt: 'asc' },
        take: 100,
      }),
    []);
  },
};
