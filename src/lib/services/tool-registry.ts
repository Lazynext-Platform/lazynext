import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type RiskCategory = 'low' | 'medium' | 'high';
export type BudgetCategory = 'none' | 'credits' | 'api_cost' | 'compute_cost' | 'ad_spend';
export type ToolCallStatus = 'pending' | 'running' | 'completed' | 'failed' | 'timeout';

// ── Tool Registry Service ──

export const ToolRegistryService = {
  /**
   * List all registered tools for a workspace.
   */
  async list(workspaceId: string, filters?: { enabled?: boolean; riskCategory?: string }) {
    return safePrisma(() =>
      prisma.toolDef.findMany({
        where: {
          workspaceId,
          ...(filters?.enabled !== undefined && { enabled: filters.enabled }),
          ...(filters?.riskCategory && { riskCategory: filters.riskCategory }),
        },
        orderBy: { name: 'asc' },
        take: 200,
      }),
    []);
  },

  /**
   * Get a single tool by ID.
   */
  async get(toolId: string) {
    return safePrisma(() => prisma.toolDef.findUnique({ where: { id: toolId } }), null);
  },

  /**
   * Get a tool by name within a workspace.
   */
  async getByName(workspaceId: string, name: string) {
    return safePrisma(() =>
      prisma.toolDef.findFirst({
        where: { workspaceId, name, enabled: true },
      }),
    null);
  },

  /**
   * Register a new tool.
   */
  async register(input: {
    workspaceId?: string;
    name: string;
    version?: string;
    description: string;
    inputSchema?: string;
    outputSchema?: string;
    authRequirements?: string;
    permissions?: string[];
    riskCategory?: RiskCategory;
    budgetCategory?: BudgetCategory;
    timeoutSec?: number;
    retryPolicy?: string;
    auditRequired?: boolean;
    allowedAgents?: string[];
    allowedCompanies?: string[];
  }) {
    return prisma.toolDef.create({
      data: {
        workspaceId: input.workspaceId || null,
        name: input.name.slice(0, 100),
        version: input.version || '1.0.0',
        description: input.description.slice(0, 2000),
        inputSchema: input.inputSchema || '{}',
        outputSchema: input.outputSchema || '{}',
        authRequirements: input.authRequirements || '{}',
        permissions: JSON.stringify(input.permissions || []),
        riskCategory: input.riskCategory || 'low',
        budgetCategory: input.budgetCategory || 'none',
        timeoutSec: input.timeoutSec || 30,
        retryPolicy: input.retryPolicy || '{}',
        auditRequired: input.auditRequired !== false,
        allowedAgents: JSON.stringify(input.allowedAgents || []),
        allowedCompanies: JSON.stringify(input.allowedCompanies || []),
      },
    });
  },

  /**
   * Update a tool definition.
   */
  async update(toolId: string, input: {
    description?: string;
    riskCategory?: RiskCategory;
    budgetCategory?: BudgetCategory;
    timeoutSec?: number;
    enabled?: boolean;
    allowedAgents?: string[];
  }) {
    const data: Record<string, unknown> = {};
    if (input.description !== undefined) data.description = input.description.slice(0, 2000);
    if (input.riskCategory !== undefined) data.riskCategory = input.riskCategory;
    if (input.budgetCategory !== undefined) data.budgetCategory = input.budgetCategory;
    if (input.timeoutSec !== undefined) data.timeoutSec = input.timeoutSec;
    if (input.enabled !== undefined) data.enabled = input.enabled;
    if (input.allowedAgents !== undefined) data.allowedAgents = JSON.stringify(input.allowedAgents);

    return prisma.toolDef.update({ where: { id: toolId }, data });
  },

  /**
   * Check if an agent is allowed to use a tool.
   */
  async checkAgentAllowed(toolId: string, agentRole: string): Promise<boolean> {
    const tool = await this.get(toolId);
    if (!tool || !tool.enabled) return false;
    const allowed = JSON.parse(tool.allowedAgents || '[]') as string[];
    // Empty allowedAgents means all agents can use it
    if (allowed.length === 0) return true;
    return allowed.includes(agentRole);
  },
};

// ── Tool Call Service (audit trail) ──

export const ToolCallService = {
  /**
   * Record a tool call start.
   */
  async start(input: {
    workspaceId: string;
    agentRunId?: string;
    toolDefId: string;
    input: Record<string, unknown>;
  }) {
    return prisma.toolCall.create({
      data: {
        workspaceId: input.workspaceId,
        agentRunId: input.agentRunId || null,
        toolDefId: input.toolDefId,
        input: JSON.stringify(input.input).slice(0, 10000),
        status: 'running',
        startedAt: new Date(),
      },
    });
  },

  /**
   * Complete a tool call.
   */
  async complete(toolCallId: string, output: Record<string, unknown>, costCredits: number = 0) {
    return prisma.toolCall.update({
      where: { id: toolCallId },
      data: {
        status: 'completed',
        output: JSON.stringify(output).slice(0, 10000),
        costCredits,
        completedAt: new Date(),
      },
    });
  },

  /**
   * Fail a tool call.
   */
  async fail(toolCallId: string, error: string) {
    return prisma.toolCall.update({
      where: { id: toolCallId },
      data: {
        status: 'failed',
        error: error.slice(0, 2000),
        completedAt: new Date(),
      },
    });
  },

  /**
   * Mark a tool call as timed out.
   */
  async timeout(toolCallId: string) {
    return prisma.toolCall.update({
      where: { id: toolCallId },
      data: {
        status: 'timeout',
        completedAt: new Date(),
      },
    });
  },

  /**
   * List tool calls for a workspace (audit trail).
   */
  async list(workspaceId: string, filters?: { agentRunId?: string; status?: string }, take: number = 100) {
    return safePrisma(() =>
      prisma.toolCall.findMany({
        where: {
          workspaceId,
          ...(filters?.agentRunId && { agentRunId: filters.agentRunId }),
          ...(filters?.status && { status: filters.status }),
        },
        include: { toolDef: { select: { name: true, riskCategory: true } } },
        orderBy: { startedAt: 'desc' },
        take: Math.min(take, 500),
      }),
    []);
  },
};
