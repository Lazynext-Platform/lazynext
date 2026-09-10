import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Budget Service ──

export type BudgetScope = 'company' | 'workspace' | 'agent' | 'task' | 'integration' | 'campaign' | 'period';

export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  budgetId?: string;
  remainingCredits: number;
  remainingUsd: number;
}

export const BudgetService = {
  /**
   * List budgets for a workspace.
   */
  async list(workspaceId: string, filters?: { scope?: BudgetScope; status?: string }) {
    return safePrisma(() =>
      prisma.budget.findMany({
        where: {
          workspaceId,
          ...(filters?.scope && { scope: filters.scope }),
          ...(filters?.status && { status: filters.status }),
        },
        include: { _count: { select: { entries: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    []);
  },

  /**
   * Create a new budget.
   */
  async create(input: {
    workspaceId: string;
    organizationId: string;
    scope: BudgetScope;
    scopeId?: string;
    period?: string;
    limitCredits?: number;
    limitUsd?: number;
    currency?: string;
    endDate?: Date;
  }) {
    return prisma.budget.create({
      data: {
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
        scope: input.scope,
        scopeId: input.scopeId || null,
        period: input.period || 'monthly',
        limitCredits: input.limitCredits || 0,
        limitUsd: input.limitUsd || 0,
        currency: input.currency || 'USD',
        endDate: input.endDate || null,
      },
    });
  },

  /**
   * Check if a spending action is within budget.
   * Checks all applicable budgets (company, workspace, agent, task).
   */
  async check(input: {
    workspaceId: string;
    organizationId: string;
    scope?: BudgetScope;
    scopeId?: string;
    amountCredits: number;
    amountUsd?: number;
  }): Promise<BudgetCheckResult> {
    // Find applicable budgets
    const budgets = await safePrisma(() =>
      prisma.budget.findMany({
        where: {
          workspaceId: input.workspaceId,
          status: 'active',
          OR: [
            { scope: 'workspace' },
            { scope: 'company', scopeId: input.organizationId },
            ...(input.scope && input.scopeId ? [{ scope: input.scope, scopeId: input.scopeId }] : []),
          ],
        },
      }),
    []);

    if (budgets.length === 0) {
      return { allowed: true, remainingCredits: Infinity, remainingUsd: Infinity };
    }

    for (const budget of budgets) {
      const remainingCredits = budget.limitCredits - budget.spentCredits;
      const remainingUsd = budget.limitUsd - budget.spentUsd;
      if (budget.limitCredits > 0 && remainingCredits < input.amountCredits) {
        return {
          allowed: false,
          reason: `Budget exceeded (${budget.scope}): ${budget.spentCredits}/${budget.limitCredits} credits used`,
          budgetId: budget.id,
          remainingCredits,
          remainingUsd,
        };
      }
      if (budget.limitUsd > 0 && input.amountUsd && remainingUsd < input.amountUsd) {
        return {
          allowed: false,
          reason: `Budget exceeded (${budget.scope}): $${budget.spentUsd}/$${budget.limitUsd} used`,
          budgetId: budget.id,
          remainingCredits,
          remainingUsd,
        };
      }
    }

    const minRemainingCredits = Math.min(...budgets.map((b) => b.limitCredits - b.spentCredits));
    const minRemainingUsd = Math.min(...budgets.map((b) => b.limitUsd - b.spentUsd));
    return {
      allowed: true,
      remainingCredits: minRemainingCredits,
      remainingUsd: minRemainingUsd,
    };
  },

  /**
   * Record a spending entry and update budget spent amounts.
   */
  async recordSpend(input: {
    budgetId: string;
    toolCallId?: string;
    agentRunId?: string;
    amountCredits: number;
    amountUsd?: number;
    category?: string;
    description?: string;
  }) {
    const entry = await prisma.budgetEntry.create({
      data: {
        budgetId: input.budgetId,
        toolCallId: input.toolCallId || null,
        agentRunId: input.agentRunId || null,
        amountCredits: input.amountCredits,
        amountUsd: input.amountUsd || 0,
        category: input.category || 'other',
        description: input.description?.slice(0, 500) || null,
      },
    });

    // Update budget spent amounts
    await prisma.budget.update({
      where: { id: input.budgetId },
      data: {
        spentCredits: { increment: input.amountCredits },
        spentUsd: { increment: input.amountUsd || 0 },
      },
    });

    return entry;
  },

  /**
   * Check and update budget status (mark as exceeded if over limit).
   */
  async refreshStatus(budgetId: string) {
    const budget = await prisma.budget.findUnique({ where: { id: budgetId } });
    if (!budget) return null;

    const exceeded = (budget.limitCredits > 0 && budget.spentCredits >= budget.limitCredits) ||
                     (budget.limitUsd > 0 && budget.spentUsd >= budget.limitUsd);

    if (exceeded && budget.status === 'active') {
      return prisma.budget.update({
        where: { id: budgetId },
        data: { status: 'exceeded' },
      });
    }
    return budget;
  },
};
