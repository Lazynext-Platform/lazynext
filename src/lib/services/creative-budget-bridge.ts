/**
 * Creative Budget Bridge
 *
 * Connects creative credit spending to OS budgets. When a creative operation
 * consumes credits, `recordCreativeSpend` creates a BudgetEntry and updates the
 * budget's spent amounts. This gives the OS visibility into creative spending
 * and allows budget controls to gate creative operations.
 */
import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { EventService } from '@/lib/services/event';

// ── Types ──

export interface CreativeSpendInput {
  /** User ID whose credits were spent. */
  userId: string;
  /** Amount of credits spent. */
  amount: number;
  /** Description of the creative operation. */
  description: string;
  /** Type of creative operation (brief, hooks, script, storyboard, etc.). */
  creativeType: string;
  /** Optional source ID (e.g. creationId, workflowRunId). */
  sourceId?: string;
}

export interface CreativeBudgetSummary {
  /** Total credits spent on creative operations. */
  totalSpent: number;
  /** Spending broken down by creative type. */
  byCreativeType: Record<string, number>;
  /** Total spent this month. */
  spentThisMonth: number;
  /** Spending trend (last 10 entries). */
  trend: Array<{ createdAt: string; amount: number; creativeType: string }>;
  /** Total number of spend entries. */
  entryCount: number;
}

export interface CreativeBudgetCheckResult {
  /** Whether the requested spend is allowed. */
  allowed: boolean;
  /** Remaining credits in the creative budget. */
  remaining: number;
  /** The budget limit (0 = unlimited). */
  limit: number;
  /** Reason if not allowed. */
  reason?: string;
}

// ── Constants ──

/** The budget scope used for creative spending. */
const CREATIVE_BUDGET_SCOPE = 'integration';

/** The scope ID for creative budgets. */
const CREATIVE_BUDGET_SCOPE_ID = 'creative';

/** The BudgetEntry category for creative spending. */
const CREATIVE_ENTRY_CATEGORY = 'creative';

// ── Creative Budget Bridge Service ──

export const CreativeBudgetBridge = {
  /**
   * Find or create a creative budget for a workspace.
   * Returns the budget record.
   */
  async ensureCreativeBudget(
    workspaceId: string,
    organizationId: string,
  ): Promise<{ id: string; limitCredits: number; spentCredits: number }> {
    // Look for an existing creative budget
    const existing = await safePrisma(() =>
      prisma.budget.findFirst({
        where: {
          workspaceId,
          scope: CREATIVE_BUDGET_SCOPE,
          scopeId: CREATIVE_BUDGET_SCOPE_ID,
          status: 'active',
        },
        select: { id: true, limitCredits: true, spentCredits: true },
      }),
    null);

    if (existing) return existing;

    // Create a new creative budget with no limit (unlimited by default)
    const budget = await prisma.budget.create({
      data: {
        workspaceId,
        organizationId,
        scope: CREATIVE_BUDGET_SCOPE,
        scopeId: CREATIVE_BUDGET_SCOPE_ID,
        period: 'monthly',
        limitCredits: 0,
        spentCredits: 0,
        limitUsd: 0,
        spentUsd: 0,
        currency: 'USD',
        status: 'active',
      },
      select: { id: true, limitCredits: true, spentCredits: true },
    });

    return budget;
  },

  /**
   * Record a creative credit spend as a budget entry.
   * Creates a BudgetEntry with category 'creative', updates the budget's
   * spent amounts, and emits an event.
   */
  async recordCreativeSpend(
    workspaceId: string,
    organizationId: string,
    input: CreativeSpendInput,
  ) {
    const budget = await this.ensureCreativeBudget(workspaceId, organizationId);

    // Create the budget entry
    const entry = await prisma.budgetEntry.create({
      data: {
        budgetId: budget.id,
        amountCredits: input.amount,
        amountUsd: 0,
        category: CREATIVE_ENTRY_CATEGORY,
        description: `${input.creativeType}: ${input.description}`.slice(0, 500),
      },
      select: {
        id: true,
        budgetId: true,
        amountCredits: true,
        category: true,
        description: true,
        createdAt: true,
      },
    });

    // Update budget spent amounts
    await prisma.budget.update({
      where: { id: budget.id },
      data: {
        spentCredits: { increment: input.amount },
      },
    }).catch(() => {});

    // Emit an event
    await EventService.emit({
      workspaceId,
      organizationId,
      type: 'creative.budget.spend',
      actor: input.userId,
      actorType: 'user',
      resourceType: 'budgetEntry',
      resourceId: entry.id,
      metadata: {
        amount: input.amount,
        creativeType: input.creativeType,
        description: input.description.slice(0, 200),
        sourceId: input.sourceId,
        budgetId: budget.id,
      },
      source: 'creative',
    }).catch(() => {});

    return entry;
  },

  /**
   * Summarize creative spending for a workspace.
   * Returns total spent, by creative type, this month, and trend.
   */
  async getCreativeBudgetSummary(
    workspaceId: string,
    organizationId: string,
  ): Promise<CreativeBudgetSummary> {
    const budget = await safePrisma(() =>
      prisma.budget.findFirst({
        where: {
          workspaceId,
          scope: CREATIVE_BUDGET_SCOPE,
          scopeId: CREATIVE_BUDGET_SCOPE_ID,
        },
        select: { id: true },
      }),
    null);

    if (!budget) {
      return {
        totalSpent: 0,
        byCreativeType: {},
        spentThisMonth: 0,
        trend: [],
        entryCount: 0,
      };
    }

    // Fetch all creative budget entries
    const entries = await safePrisma(() =>
      prisma.budgetEntry.findMany({
        where: {
          budgetId: budget.id,
          category: CREATIVE_ENTRY_CATEGORY,
        },
        select: {
          id: true,
          amountCredits: true,
          description: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    []);

    const totalSpent = entries.reduce((sum, e) => sum + e.amountCredits, 0);

    // Break down by creative type (parsed from description prefix "type: ...")
    const byCreativeType: Record<string, number> = {};
    for (const e of entries) {
      const desc = e.description || '';
      const colonIdx = desc.indexOf(':');
      const type = colonIdx > 0 ? desc.slice(0, colonIdx).trim() : 'other';
      byCreativeType[type] = (byCreativeType[type] || 0) + e.amountCredits;
    }

    // This month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const spentThisMonth = entries
      .filter((e) => e.createdAt >= monthStart)
      .reduce((sum, e) => sum + e.amountCredits, 0);

    // Trend (last 10 entries, chronological)
    const trend = [...entries]
      .slice(0, 10)
      .reverse()
      .map((e) => {
        const desc = e.description || '';
        const colonIdx = desc.indexOf(':');
        const type = colonIdx > 0 ? desc.slice(0, colonIdx).trim() : 'other';
        return {
          createdAt: e.createdAt.toISOString(),
          amount: e.amountCredits,
          creativeType: type,
        };
      });

    return {
      totalSpent,
      byCreativeType,
      spentThisMonth,
      trend,
      entryCount: entries.length,
    };
  },

  /**
   * Check if there's enough creative budget for a requested spend.
   * Returns { allowed, remaining, limit }.
   */
  async checkCreativeBudget(
    workspaceId: string,
    organizationId: string,
    requestedAmount: number,
  ): Promise<CreativeBudgetCheckResult> {
    const budget = await safePrisma(() =>
      prisma.budget.findFirst({
        where: {
          workspaceId,
          scope: CREATIVE_BUDGET_SCOPE,
          scopeId: CREATIVE_BUDGET_SCOPE_ID,
          status: 'active',
        },
        select: { id: true, limitCredits: true, spentCredits: true },
      }),
    null);

    // No budget = unlimited
    if (!budget) {
      return { allowed: true, remaining: Infinity, limit: 0 };
    }

    const remaining = budget.limitCredits - budget.spentCredits;

    // limit of 0 = unlimited
    if (budget.limitCredits === 0) {
      return { allowed: true, remaining: Infinity, limit: 0 };
    }

    if (remaining < requestedAmount) {
      return {
        allowed: false,
        remaining,
        limit: budget.limitCredits,
        reason: `Creative budget exceeded: ${budget.spentCredits}/${budget.limitCredits} credits used, ${requestedAmount} requested`,
      };
    }

    return {
      allowed: true,
      remaining,
      limit: budget.limitCredits,
    };
  },
};
