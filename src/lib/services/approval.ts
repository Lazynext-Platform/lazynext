import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Approval Service ──

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';
export type RiskLevel = 'low' | 'medium' | 'high';

export const ApprovalService = {
  /**
   * List pending approvals for a workspace.
   */
  async listPending(workspaceId: string) {
    return safePrisma(() =>
      prisma.approval.findMany({
        where: {
          workspaceId,
          status: 'pending',
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    []);
  },

  /**
   * List all approvals for a workspace.
   */
  async list(workspaceId: string, filters?: { status?: ApprovalStatus }) {
    return safePrisma(() =>
      prisma.approval.findMany({
        where: {
          workspaceId,
          ...(filters?.status && { status: filters.status }),
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    []);
  },

  /**
   * Get a single approval by ID.
   */
  async get(approvalId: string) {
    return safePrisma(() => prisma.approval.findUnique({ where: { id: approvalId } }), null);
  },

  /**
   * Create a new approval request.
   */
  async request(input: {
    workspaceId: string;
    organizationId: string;
    agentRunId?: string;
    toolCallId?: string;
    taskId?: string;
    action: string;
    description: string;
    riskLevel?: RiskLevel;
    estimatedCost?: number;
    affectedResources?: string[];
    requestedBy: string;
    expiresAt?: Date;
  }) {
    const expiresAt = input.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h default
    return prisma.approval.create({
      data: {
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
        agentRunId: input.agentRunId || null,
        toolCallId: input.toolCallId || null,
        taskId: input.taskId || null,
        action: input.action.slice(0, 200),
        description: input.description.slice(0, 5000),
        riskLevel: input.riskLevel || 'medium',
        estimatedCost: input.estimatedCost || 0,
        affectedResources: JSON.stringify(input.affectedResources || []),
        requestedBy: input.requestedBy,
        expiresAt,
      },
    });
  },

  /**
   * Approve a request.
   */
  async approve(approvalId: string, approverId: string, note?: string) {
    const approval = await prisma.approval.findUnique({ where: { id: approvalId } });
    if (!approval || approval.status !== 'pending') return null;
    if (approval.expiresAt && approval.expiresAt < new Date()) {
      return prisma.approval.update({
        where: { id: approvalId },
        data: { status: 'expired' },
      });
    }
    return prisma.approval.update({
      where: { id: approvalId },
      data: {
        status: 'approved',
        approverId,
        decision: 'approved',
        note: note?.slice(0, 2000) || null,
        decidedAt: new Date(),
      },
    });
  },

  /**
   * Reject a request.
   */
  async reject(approvalId: string, approverId: string, note?: string) {
    const approval = await prisma.approval.findUnique({ where: { id: approvalId } });
    if (!approval || approval.status !== 'pending') return null;
    return prisma.approval.update({
      where: { id: approvalId },
      data: {
        status: 'rejected',
        approverId,
        decision: 'rejected',
        note: note?.slice(0, 2000) || null,
        decidedAt: new Date(),
      },
    });
  },

  /**
   * Cancel a request (by the requester or system).
   */
  async cancel(approvalId: string) {
    const approval = await prisma.approval.findUnique({ where: { id: approvalId } });
    if (!approval || approval.status !== 'pending') return null;
    return prisma.approval.update({
      where: { id: approvalId },
      data: { status: 'cancelled', decidedAt: new Date() },
    });
  },

  /**
   * Expire stale approvals.
   */
  async expireStale() {
    const result = await prisma.approval.updateMany({
      where: {
        status: 'pending',
        expiresAt: { lt: new Date() },
      },
      data: { status: 'expired' },
    });
    return result.count;
  },
};
