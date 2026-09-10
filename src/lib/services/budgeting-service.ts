import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type BudgetScope = 'company' | 'workspace' | 'agent' | 'task' | 'integration' | 'campaign' | 'period';
export type BudgetPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'one_time';
export type BudgetStatus = 'active' | 'exceeded' | 'paused' | 'expired';
export type ScenarioType = 'optimistic' | 'realistic' | 'pessimistic';

/** Raw Budget row as stored in the database. */
interface BudgetRow {
  id: string;
  workspaceId: string;
  organizationId: string;
  scope: string;
  scopeId: string | null;
  period: string;
  limitCredits: number;
  spentCredits: number;
  limitUsd: number;
  spentUsd: number;
  currency: string;
  status: string;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  entries?: BudgetEntryRow[];
}

interface BudgetEntryRow {
  id: string;
  budgetId: string;
  toolCallId: string | null;
  agentRunId: string | null;
  amountCredits: number;
  amountUsd: number;
  category: string;
  description: string | null;
  createdAt: Date;
}

/** Raw Memory row as stored in the database. */
interface MemoryRow {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  sourceId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Budget {
  id: string;
  workspaceId: string;
  organizationId: string;
  scope: BudgetScope;
  scopeId: string | null;
  period: BudgetPeriod;
  limitCredits: number;
  spentCredits: number;
  limitUsd: number;
  spentUsd: number;
  currency: string;
  status: BudgetStatus;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  entries?: BudgetEntry[];
  department?: string;
  category?: string;
}

export interface BudgetEntry {
  id: string;
  budgetId: string;
  toolCallId: string | null;
  agentRunId: string | null;
  amountCredits: number;
  amountUsd: number;
  category: string;
  description: string | null;
  createdAt: Date;
}

export interface Forecast {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  period: string;
  scenarios: Array<{
    name: string;
    type: ScenarioType;
    revenue: number;
    expenses: number;
    notes?: string;
  }>;
  assumptions?: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Scenario {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: ScenarioType;
  period: string;
  revenue: number;
  expenses: number;
  growthRate?: number;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetVsActual {
  budgetId: string;
  scope: BudgetScope;
  period: BudgetPeriod;
  limitUsd: number;
  spentUsd: number;
  remainingUsd: number;
  utilizationPct: number;
  limitCredits: number;
  spentCredits: number;
  remainingCredits: number;
  status: BudgetStatus;
}

export interface VarianceAnalysis {
  budgetId: string;
  scope: BudgetScope;
  period: BudgetPeriod;
  budgetUsd: number;
  actualUsd: number;
  variance: number;
  variancePct: number;
  budgetCredits: number;
  actualCredits: number;
}

export interface RollingForecastPoint {
  period: string;
  projectedSpend: number;
  basedOnMonths: number;
}

export interface BudgetingStats {
  budgetCount: number;
  forecastCount: number;
  scenarioCount: number;
  totalBudgeted: number;
  totalSpent: number;
}

// ── Helpers ──

function toBudget(row: BudgetRow): Budget {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    organizationId: row.organizationId,
    scope: row.scope as BudgetScope,
    scopeId: row.scopeId,
    period: row.period as BudgetPeriod,
    limitCredits: row.limitCredits,
    spentCredits: row.spentCredits,
    limitUsd: row.limitUsd,
    spentUsd: row.spentUsd,
    currency: row.currency,
    status: row.status as BudgetStatus,
    startDate: row.startDate,
    endDate: row.endDate,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    entries: row.entries ? row.entries.map(toBudgetEntry) : undefined,
  };
}

function toBudgetEntry(row: BudgetEntryRow): BudgetEntry {
  return {
    id: row.id,
    budgetId: row.budgetId,
    toolCallId: row.toolCallId,
    agentRunId: row.agentRunId,
    amountCredits: row.amountCredits,
    amountUsd: row.amountUsd,
    category: row.category,
    description: row.description,
    createdAt: row.createdAt,
  };
}

function parseContent<T>(content: string, fallback: T): T {
  try {
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

interface BudgetMetadataContent {
  budgetId: string;
  department?: string;
  category?: string;
}

interface BudgetApprovalContent {
  budgetId: string;
  approvedBy: string;
  approvedAt: string;
}

interface ForecastContent {
  name: string;
  period: string;
  scenarios: Array<{
    name: string;
    type: ScenarioType;
    revenue: number;
    expenses: number;
    notes?: string;
  }>;
  assumptions?: string;
  notes?: string;
}

interface ScenarioContent {
  name: string;
  type: ScenarioType;
  period: string;
  revenue: number;
  expenses: number;
  growthRate?: number;
  notes?: string;
}

function toForecast(row: MemoryRow): Forecast {
  const c = parseContent<ForecastContent>(row.content, {
    name: '',
    period: '',
    scenarios: [],
  });
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    name: c.name,
    period: c.period,
    scenarios: c.scenarios,
    assumptions: c.assumptions,
    notes: c.notes,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toScenario(row: MemoryRow): Scenario {
  const c = parseContent<ScenarioContent>(row.content, {
    name: '',
    type: 'realistic',
    period: '',
    revenue: 0,
    expenses: 0,
  });
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    name: c.name,
    type: c.type,
    period: c.period,
    revenue: c.revenue,
    expenses: c.expenses,
    growthRate: c.growthRate,
    notes: c.notes,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Budgeting Service ──

export const BudgetingService = {
  /**
   * Create a budget. Store department/category metadata in Memory if provided.
   */
  async createBudget(
    organizationId: string,
    workspaceId: string,
    input: {
      scope: BudgetScope;
      scopeId?: string;
      period: BudgetPeriod;
      limitUsd?: number;
      limitCredits?: number;
      currency?: string;
      startDate: Date;
      endDate?: Date;
      department?: string;
      category?: string;
    },
  ): Promise<Budget> {
    const row = await prisma.budget.create({
      data: {
        workspaceId,
        organizationId,
        scope: input.scope,
        scopeId: input.scopeId || null,
        period: input.period,
        limitCredits: input.limitCredits || 0,
        spentCredits: 0,
        limitUsd: input.limitUsd || 0,
        spentUsd: 0,
        currency: input.currency || 'USD',
        status: 'active',
        startDate: input.startDate,
        endDate: input.endDate || null,
      },
    });
    const budget = toBudget(row as BudgetRow);

    // Store department/category metadata in Memory if provided
    if (input.department || input.category) {
      const content: BudgetMetadataContent = {
        budgetId: budget.id,
        department: input.department,
        category: input.category,
      };
      await prisma.memory.create({
        data: {
          workspaceId,
          organizationId,
          type: 'budget_metadata',
          content: JSON.stringify(content).slice(0, 10000),
          source: 'user',
          sourceId: budget.id,
          confidence: 1.0,
          lifecycle: 'permanent',
          tags: JSON.stringify(['budget_metadata', input.department || '', input.category || '']),
          createdBy: 'system',
        },
      }).catch(() => null);
    }

    return budget;
  },

  /**
   * Get a single budget by ID with entries.
   */
  async getBudget(id: string): Promise<Budget | null> {
    const row = await safePrisma(
      () => prisma.budget.findUnique({ where: { id }, include: { entries: true } }),
      null,
    );
    if (!row) return null;
    const budget = toBudget(row as BudgetRow);
    // Fetch metadata
    const meta = await safePrisma(
      () =>
        prisma.memory.findFirst({
          where: { type: 'budget_metadata', sourceId: id },
        }),
      null,
    );
    if (meta) {
      const c = parseContent<BudgetMetadataContent>((meta as MemoryRow).content, { budgetId: id });
      budget.department = c.department;
      budget.category = c.category;
    }
    return budget;
  },

  /**
   * List budgets for an organization with optional filters.
   */
  async listBudgets(
    organizationId: string,
    opts: { scope?: BudgetScope; status?: BudgetStatus; period?: BudgetPeriod; department?: string } = {},
  ): Promise<Budget[]> {
    const rows = await safePrisma(
      () =>
        prisma.budget.findMany({
          where: {
            organizationId,
            ...(opts.scope && { scope: opts.scope }),
            ...(opts.status && { status: opts.status }),
            ...(opts.period && { period: opts.period }),
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );
    let budgets = (rows as BudgetRow[]).map(toBudget);

    // Department filter requires Memory lookup
    if (opts.department) {
      const metaRows = await safePrisma(
        () =>
          prisma.memory.findMany({
            where: { type: 'budget_metadata', organizationId },
            take: 5000,
          }),
        [],
      );
      const deptBudgetIds = new Set<string>();
      for (const m of metaRows as MemoryRow[]) {
        const c = parseContent<BudgetMetadataContent>(m.content, { budgetId: '' });
        if (c.department === opts.department) deptBudgetIds.add(c.budgetId);
      }
      budgets = budgets.filter((b) => deptBudgetIds.has(b.id));
      // Attach metadata to matching budgets
      for (const b of budgets) {
        const m = (metaRows as MemoryRow[]).find((mr) => {
          const c = parseContent<BudgetMetadataContent>(mr.content, { budgetId: '' });
          return c.budgetId === b.id;
        });
        if (m) {
          const c = parseContent<BudgetMetadataContent>(m.content, { budgetId: b.id });
          b.department = c.department;
          b.category = c.category;
        }
      }
    }

    return budgets;
  },

  /**
   * Update a budget.
   */
  async updateBudget(
    id: string,
    input: Partial<{
      scope: BudgetScope;
      scopeId: string;
      period: BudgetPeriod;
      limitUsd: number;
      limitCredits: number;
      currency: string;
      status: BudgetStatus;
      endDate: Date;
    }>,
  ): Promise<Budget | null> {
    const data: Record<string, unknown> = {};
    if (input.scope !== undefined) data.scope = input.scope;
    if (input.scopeId !== undefined) data.scopeId = input.scopeId;
    if (input.period !== undefined) data.period = input.period;
    if (input.limitUsd !== undefined) data.limitUsd = input.limitUsd;
    if (input.limitCredits !== undefined) data.limitCredits = input.limitCredits;
    if (input.currency !== undefined) data.currency = input.currency;
    if (input.status !== undefined) data.status = input.status;
    if (input.endDate !== undefined) data.endDate = input.endDate;

    const row = await safePrisma(
      () => prisma.budget.update({ where: { id }, data }),
      null,
    );
    if (!row) return null;
    return toBudget(row as BudgetRow);
  },

  /**
   * Delete a budget.
   */
  async deleteBudget(id: string): Promise<boolean> {
    try {
      await prisma.budget.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Approve a budget — set status to active, store approval in Memory.
   */
  async approveBudget(id: string, approvedBy: string): Promise<Budget | null> {
    const row = await safePrisma(
      () =>
        prisma.budget.update({
          where: { id },
          data: { status: 'active' },
        }),
      null,
    );
    if (!row) return null;
    const budget = toBudget(row as BudgetRow);

    const content: BudgetApprovalContent = {
      budgetId: id,
      approvedBy,
      approvedAt: new Date().toISOString(),
    };
    await prisma.memory.create({
      data: {
        workspaceId: budget.workspaceId,
        organizationId: budget.organizationId,
        type: 'budget_approval',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: id,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['budget_approval']),
        createdBy: approvedBy,
      },
    }).catch(() => null);

    return budget;
  },

  /**
   * Record spending against a budget — create BudgetEntry and update spent totals.
   */
  async recordSpending(
    id: string,
    input: {
      amountUsd?: number;
      amountCredits?: number;
      category?: string;
      description?: string;
      toolCallId?: string;
      agentRunId?: string;
    },
  ): Promise<BudgetEntry> {
    const amountUsd = input.amountUsd || 0;
    const amountCredits = input.amountCredits || 0;

    const entry = await prisma.budgetEntry.create({
      data: {
        budgetId: id,
        toolCallId: input.toolCallId || null,
        agentRunId: input.agentRunId || null,
        amountCredits,
        amountUsd,
        category: input.category || 'other',
        description: input.description || null,
      },
    });

    // Update spent totals on budget
    await prisma.budget.update({
      where: { id },
      data: {
        spentUsd: { increment: amountUsd },
        spentCredits: { increment: amountCredits },
      },
    }).catch(() => null);

    return toBudgetEntry(entry as BudgetEntryRow);
  },

  /**
   * Compare budget limits to actual spending.
   */
  async getBudgetVsActual(
    organizationId: string,
    opts: { period?: BudgetPeriod; scope?: BudgetScope } = {},
  ): Promise<BudgetVsActual[]> {
    const rows = await safePrisma(
      () =>
        prisma.budget.findMany({
          where: {
            organizationId,
            ...(opts.period && { period: opts.period }),
            ...(opts.scope && { scope: opts.scope }),
          },
          take: 5000,
        }),
      [],
    );

    return (rows as BudgetRow[]).map((r) => {
      const remainingUsd = Math.round((r.limitUsd - r.spentUsd) * 100) / 100;
      const remainingCredits = r.limitCredits - r.spentCredits;
      const utilizationPct = r.limitUsd > 0 ? Math.round((r.spentUsd / r.limitUsd) * 10000) / 100 : 0;
      return {
        budgetId: r.id,
        scope: r.scope as BudgetScope,
        period: r.period as BudgetPeriod,
        limitUsd: r.limitUsd,
        spentUsd: r.spentUsd,
        remainingUsd,
        utilizationPct,
        limitCredits: r.limitCredits,
        spentCredits: r.spentCredits,
        remainingCredits,
        status: r.status as BudgetStatus,
      };
    });
  },

  /**
   * Create a forecast — stored in Memory.
   */
  async createForecast(
    organizationId: string,
    workspaceId: string,
    input: {
      name: string;
      period: string;
      scenarios: Array<{ name: string; type: ScenarioType; revenue: number; expenses: number; notes?: string }>;
      assumptions?: string;
      notes?: string;
    },
    createdBy: string,
  ): Promise<Forecast> {
    const content: ForecastContent = {
      name: input.name,
      period: input.period,
      scenarios: input.scenarios,
      assumptions: input.assumptions,
      notes: input.notes,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'budget_forecast',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['budget_forecast']),
        createdBy,
      },
    });

    return toForecast(row as MemoryRow);
  },

  /**
   * Get a single forecast by ID.
   */
  async getForecast(id: string): Promise<Forecast | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toForecast(row as MemoryRow);
  },

  /**
   * List forecasts for an organization.
   */
  async listForecasts(
    organizationId: string,
    opts: { period?: string } = {},
  ): Promise<Forecast[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'budget_forecast',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );
    let forecasts = (rows as MemoryRow[]).map(toForecast);
    if (opts.period) {
      forecasts = forecasts.filter((f) => f.period === opts.period);
    }
    return forecasts;
  },

  /**
   * Delete a forecast.
   */
  async deleteForecast(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Create a scenario — stored in Memory.
   */
  async createScenario(
    organizationId: string,
    workspaceId: string,
    input: {
      name: string;
      type: ScenarioType;
      period: string;
      revenue: number;
      expenses: number;
      growthRate?: number;
      notes?: string;
    },
    createdBy: string,
  ): Promise<Scenario> {
    const content: ScenarioContent = {
      name: input.name,
      type: input.type,
      period: input.period,
      revenue: input.revenue,
      expenses: input.expenses,
      growthRate: input.growthRate,
      notes: input.notes,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'budget_scenario',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['budget_scenario', input.type]),
        createdBy,
      },
    });

    return toScenario(row as MemoryRow);
  },

  /**
   * Get scenarios for an organization.
   */
  async getScenarios(
    organizationId: string,
    opts: { period?: string; type?: ScenarioType } = {},
  ): Promise<Scenario[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'budget_scenario',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );
    let scenarios = (rows as MemoryRow[]).map(toScenario);
    if (opts.period) {
      scenarios = scenarios.filter((s) => s.period === opts.period);
    }
    if (opts.type) {
      scenarios = scenarios.filter((s) => s.type === opts.type);
    }
    return scenarios;
  },

  /**
   * Delete a scenario.
   */
  async deleteScenario(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Calculate variance = actual - budget, with percentage.
   */
  async getVarianceAnalysis(
    organizationId: string,
    opts: { period?: BudgetPeriod; budgetId?: string } = {},
  ): Promise<VarianceAnalysis[]> {
    const where: Record<string, unknown> = { organizationId };
    if (opts.period) where.period = opts.period;
    if (opts.budgetId) where.id = opts.budgetId;

    const rows = await safePrisma(
      () => prisma.budget.findMany({ where, take: 5000 }),
      [],
    );

    return (rows as BudgetRow[]).map((r) => {
      const variance = Math.round((r.spentUsd - r.limitUsd) * 100) / 100;
      const variancePct = r.limitUsd > 0 ? Math.round((variance / r.limitUsd) * 10000) / 100 : 0;
      return {
        budgetId: r.id,
        scope: r.scope as BudgetScope,
        period: r.period as BudgetPeriod,
        budgetUsd: r.limitUsd,
        actualUsd: r.spentUsd,
        variance,
        variancePct,
        budgetCredits: r.limitCredits,
        actualCredits: r.spentCredits,
      };
    });
  },

  /**
   * Generate a rolling forecast based on historical spending.
   */
  async getRollingForecast(
    organizationId: string,
    opts: { months?: number } = {},
  ): Promise<RollingForecastPoint[]> {
    const months = opts.months ?? 6;
    const rows = await safePrisma(
      () =>
        prisma.budget.findMany({
          where: { organizationId },
          select: { spentUsd: true, startDate: true, period: true },
          take: 5000,
        }),
      [],
    );

    // Group historical spending by month
    const monthlySpend = new Map<string, number>();
    for (const r of rows as Array<{ spentUsd: number; startDate: Date; period: string }>) {
      const d = r.startDate;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlySpend.set(key, (monthlySpend.get(key) || 0) + r.spentUsd);
    }

    const sortedKeys = Array.from(monthlySpend.keys()).sort();
    const recentKeys = sortedKeys.slice(-Math.min(months, sortedKeys.length));
    const avgSpend =
      recentKeys.length > 0
        ? recentKeys.reduce((sum, k) => sum + (monthlySpend.get(k) || 0), 0) / recentKeys.length
        : 0;

    const now = new Date();
    const forecast: RollingForecastPoint[] = [];
    for (let i = 1; i <= months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      forecast.push({
        period: key,
        projectedSpend: Math.round(avgSpend * 100) / 100,
        basedOnMonths: recentKeys.length,
      });
    }

    return forecast;
  },

  /**
   * Get budgeting stats.
   */
  async getStats(organizationId: string): Promise<BudgetingStats> {
    const [budgetRows, budgetCount, forecastRows, scenarioRows] = await Promise.all([
      safePrisma(
        () =>
          prisma.budget.findMany({
            where: { organizationId },
            select: { limitUsd: true, spentUsd: true },
            take: 5000,
          }),
        [],
      ),
      safePrisma(
        () => prisma.budget.count({ where: { organizationId } }),
        0,
      ),
      safePrisma(
        () => prisma.memory.count({ where: { type: 'budget_forecast', organizationId } }),
        0,
      ),
      safePrisma(
        () => prisma.memory.count({ where: { type: 'budget_scenario', organizationId } }),
        0,
      ),
    ]);

    let totalBudgeted = 0;
    let totalSpent = 0;
    for (const r of budgetRows as Array<{ limitUsd: number; spentUsd: number }>) {
      totalBudgeted += r.limitUsd;
      totalSpent += r.spentUsd;
    }

    return {
      budgetCount: budgetCount as number,
      forecastCount: forecastRows as number,
      scenarioCount: scenarioRows as number,
      totalBudgeted: Math.round(totalBudgeted * 100) / 100,
      totalSpent: Math.round(totalSpent * 100) / 100,
    };
  },
};
