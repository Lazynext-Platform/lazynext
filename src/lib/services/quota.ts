/**
 * Quota Service — per-workspace resource quotas and usage tracking.
 *
 * Provides:
 * - getQuota / updateQuota for managing WorkspaceQuota records
 * - checkXxxQuota methods that count current usage against limits
 * - getUsageSummary for a full dashboard view
 *
 * All counts are workspace-scoped to prevent cross-tenant leakage.
 */

import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

export interface QuotaCheckResult {
  allowed: boolean;
  current: number;
  max: number;
}

export interface QuotaInput {
  maxAgents?: number;
  maxTasks?: number;
  maxDocuments?: number;
  maxAutomations?: number;
  maxTickets?: number;
  maxStorageMb?: number;
  maxAgentRunsPerDay?: number;
  maxSandboxRunsPerDay?: number;
}

export interface UsageSummary {
  quota: {
    id: string;
    organizationId: string;
    workspaceId: string;
    maxAgents: number;
    maxTasks: number;
    maxDocuments: number;
    maxAutomations: number;
    maxTickets: number;
    maxStorageMb: number;
    maxAgentRunsPerDay: number;
    maxSandboxRunsPerDay: number;
  };
  usage: {
    agents: QuotaCheckResult;
    tasks: QuotaCheckResult;
    documents: QuotaCheckResult;
    automations: QuotaCheckResult;
    tickets: QuotaCheckResult;
    agentRuns: QuotaCheckResult;
    sandboxRuns: QuotaCheckResult;
  };
}

const DEFAULT_QUOTA = {
  maxAgents: 10,
  maxTasks: 1000,
  maxDocuments: 500,
  maxAutomations: 50,
  maxTickets: 500,
  maxStorageMb: 5000,
  maxAgentRunsPerDay: 100,
  maxSandboxRunsPerDay: 50,
};

export const QuotaService = {
  /**
   * Get the quota for a workspace, creating a default record if none exists.
   */
  async getQuota(workspaceId: string): Promise<unknown> {
    const existing = await safePrisma(() =>
      prisma.workspaceQuota.findUnique({
        where: { workspaceId },
      }),
    null);

    if (existing) return existing;

    // Look up the workspace to get the organizationId
    const workspace = await safePrisma(() =>
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true, organizationId: true },
      }),
    null);

    if (!workspace) return null;

    return prisma.workspaceQuota.create({
      data: {
        organizationId: workspace.organizationId,
        workspaceId,
        ...DEFAULT_QUOTA,
      },
    });
  },

  /**
   * Update quota limits for a workspace (admin only — enforce at route layer).
   */
  async updateQuota(workspaceId: string, input: QuotaInput): Promise<unknown> {
    // Ensure a quota record exists first
    await this.getQuota(workspaceId);

    const data: Record<string, number> = {};
    if (input.maxAgents !== undefined) data.maxAgents = input.maxAgents;
    if (input.maxTasks !== undefined) data.maxTasks = input.maxTasks;
    if (input.maxDocuments !== undefined) data.maxDocuments = input.maxDocuments;
    if (input.maxAutomations !== undefined) data.maxAutomations = input.maxAutomations;
    if (input.maxTickets !== undefined) data.maxTickets = input.maxTickets;
    if (input.maxStorageMb !== undefined) data.maxStorageMb = input.maxStorageMb;
    if (input.maxAgentRunsPerDay !== undefined) data.maxAgentRunsPerDay = input.maxAgentRunsPerDay;
    if (input.maxSandboxRunsPerDay !== undefined) data.maxSandboxRunsPerDay = input.maxSandboxRunsPerDay;

    return prisma.workspaceQuota.update({
      where: { workspaceId },
      data,
    });
  },

  /**
   * Check agent quota — count AgentDef records in the workspace.
   */
  async checkAgentQuota(workspaceId: string): Promise<QuotaCheckResult> {
    const quota = await this.getQuota(workspaceId) as { maxAgents: number } | null;
    const max = quota?.maxAgents ?? DEFAULT_QUOTA.maxAgents;

    const current = await safePrisma(() =>
      prisma.agentDef.count({
        where: { workspaceId },
      }),
    0);

    return { allowed: current < max, current, max };
  },

  /**
   * Check task quota — count non-deleted tasks belonging to workspace projects.
   */
  async checkTaskQuota(workspaceId: string): Promise<QuotaCheckResult> {
    const quota = await this.getQuota(workspaceId) as { maxTasks: number } | null;
    const max = quota?.maxTasks ?? DEFAULT_QUOTA.maxTasks;

    const projectIds = await safePrisma(() =>
      prisma.project.findMany({
        where: { workspaceId, status: 'active' },
        select: { id: true },
      }),
    []);

    let current = 0;
    if (projectIds.length > 0) {
      current = await safePrisma(() =>
        prisma.task.count({
          where: {
            projectId: { in: projectIds.map((p: { id: string }) => p.id) },
            deletedAt: null,
          },
        }),
      0);
    }

    return { allowed: current < max, current, max };
  },

  /**
   * Check document quota — count non-deleted documents in the workspace.
   */
  async checkDocumentQuota(workspaceId: string): Promise<QuotaCheckResult> {
    const quota = await this.getQuota(workspaceId) as { maxDocuments: number } | null;
    const max = quota?.maxDocuments ?? DEFAULT_QUOTA.maxDocuments;

    const current = await safePrisma(() =>
      prisma.document.count({
        where: { workspaceId, deletedAt: null },
      }),
    0);

    return { allowed: current < max, current, max };
  },

  /**
   * Check automation quota — count Automation records in the workspace.
   */
  async checkAutomationQuota(workspaceId: string): Promise<QuotaCheckResult> {
    const quota = await this.getQuota(workspaceId) as { maxAutomations: number } | null;
    const max = quota?.maxAutomations ?? DEFAULT_QUOTA.maxAutomations;

    const current = await safePrisma(() =>
      prisma.automation.count({
        where: { workspaceId },
      }),
    0);

    return { allowed: current < max, current, max };
  },

  /**
   * Check ticket quota — count Ticket records in the workspace.
   */
  async checkTicketQuota(workspaceId: string): Promise<QuotaCheckResult> {
    const quota = await this.getQuota(workspaceId) as { maxTickets: number } | null;
    const max = quota?.maxTickets ?? DEFAULT_QUOTA.maxTickets;

    const current = await safePrisma(() =>
      prisma.ticket.count({
        where: { workspaceId },
      }),
    0);

    return { allowed: current < max, current, max };
  },

  /**
   * Check agent run quota — count AgentRun records started in the last 24h
   * for agents belonging to this workspace.
   */
  async checkAgentRunQuota(workspaceId: string): Promise<QuotaCheckResult> {
    const quota = await this.getQuota(workspaceId) as { maxAgentRunsPerDay: number } | null;
    const max = quota?.maxAgentRunsPerDay ?? DEFAULT_QUOTA.maxAgentRunsPerDay;

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const current = await safePrisma(() =>
      prisma.agentRun.count({
        where: {
          agent: { workspaceId },
          startedAt: { gte: twentyFourHoursAgo },
        },
      }),
    0);

    return { allowed: current < max, current, max };
  },

  /**
   * Check sandbox run quota — count SandboxRun records in the last 24h.
   */
  async checkSandboxRunQuota(workspaceId: string): Promise<QuotaCheckResult> {
    const quota = await this.getQuota(workspaceId) as { maxSandboxRunsPerDay: number } | null;
    const max = quota?.maxSandboxRunsPerDay ?? DEFAULT_QUOTA.maxSandboxRunsPerDay;

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const current = await safePrisma(() =>
      prisma.sandboxRun.count({
        where: {
          workspaceId,
          createdAt: { gte: twentyFourHoursAgo },
        },
      }),
    0);

    return { allowed: current < max, current, max };
  },

  /**
   * Get a full usage summary — all quotas with current usage counts.
   */
  async getUsageSummary(workspaceId: string): Promise<UsageSummary | null> {
    const quota = await this.getQuota(workspaceId) as {
      id: string;
      organizationId: string;
      workspaceId: string;
      maxAgents: number;
      maxTasks: number;
      maxDocuments: number;
      maxAutomations: number;
      maxTickets: number;
      maxStorageMb: number;
      maxAgentRunsPerDay: number;
      maxSandboxRunsPerDay: number;
    } | null;

    if (!quota) return null;

    const [
      agents,
      tasks,
      documents,
      automations,
      tickets,
      agentRuns,
      sandboxRuns,
    ] = await Promise.all([
      this.checkAgentQuota(workspaceId),
      this.checkTaskQuota(workspaceId),
      this.checkDocumentQuota(workspaceId),
      this.checkAutomationQuota(workspaceId),
      this.checkTicketQuota(workspaceId),
      this.checkAgentRunQuota(workspaceId),
      this.checkSandboxRunQuota(workspaceId),
    ]);

    return {
      quota: {
        id: quota.id,
        organizationId: quota.organizationId,
        workspaceId: quota.workspaceId,
        maxAgents: quota.maxAgents,
        maxTasks: quota.maxTasks,
        maxDocuments: quota.maxDocuments,
        maxAutomations: quota.maxAutomations,
        maxTickets: quota.maxTickets,
        maxStorageMb: quota.maxStorageMb,
        maxAgentRunsPerDay: quota.maxAgentRunsPerDay,
        maxSandboxRunsPerDay: quota.maxSandboxRunsPerDay,
      },
      usage: {
        agents,
        tasks,
        documents,
        automations,
        tickets,
        agentRuns,
        sandboxRuns,
      },
    };
  },
};
