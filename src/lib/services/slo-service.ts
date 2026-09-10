import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { TelemetryService } from '@/lib/services/telemetry';

// ── Types ──

export interface SLOInput {
  name: string;
  description?: string;
  metricName: string;
  target: number;
  targetPercentile?: number;
  windowDays?: number;
  errorBudget?: number;
}

export interface SLOSummary {
  total: number;
  met: number;
  breached: number;
  active: number;
  paused: number;
  avgErrorBudgetUsed: number;
}

// ── Helpers ──

/**
 * Compute a percentile value from a sorted array of numbers.
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const rank = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sorted[lower];
  const weight = rank - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

// ── SLO Service ──

export const SLOService = {
  /**
   * Create a new SLO.
   */
  async createSLO(organizationId: string, input: SLOInput) {
    return prisma.sLO.create({
      data: {
        organizationId,
        name: input.name.slice(0, 200),
        description: input.description || '',
        metricName: input.metricName.slice(0, 200),
        target: input.target,
        targetPercentile: input.targetPercentile ?? 99.0,
        windowDays: input.windowDays ?? 30,
        status: 'active',
        errorBudget: input.errorBudget ?? 1.0,
        errorBudgetUsed: 0.0,
      },
    });
  },

  /**
   * List all SLOs for an organization.
   */
  async listSLOs(organizationId: string) {
    return safePrisma(() =>
      prisma.sLO.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    []);
  },

  /**
   * Get a single SLO by ID.
   */
  async getSLO(id: string) {
    return safePrisma(() =>
      prisma.sLO.findUnique({
        where: { id },
      }),
    null);
  },

  /**
   * Update an SLO.
   */
  async updateSLO(id: string, input: Partial<SLOInput>) {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name.slice(0, 200);
    if (input.description !== undefined) data.description = input.description;
    if (input.metricName !== undefined) data.metricName = input.metricName.slice(0, 200);
    if (input.target !== undefined) data.target = input.target;
    if (input.targetPercentile !== undefined) data.targetPercentile = input.targetPercentile;
    if (input.windowDays !== undefined) data.windowDays = input.windowDays;
    if (input.errorBudget !== undefined) data.errorBudget = input.errorBudget;

    return prisma.sLO.update({
      where: { id },
      data: data as never,
    });
  },

  /**
   * Delete an SLO.
   */
  async deleteSLO(id: string) {
    return prisma.sLO.delete({
      where: { id },
    });
  },

  /**
   * Evaluate an SLO against telemetry.
   * Queries telemetry for the metric over the window, calculates the percentile
   * value, compares to target, updates status (met/breached) and error budget usage.
   */
  async evaluateSLO(id: string) {
    const slo = await this.getSLO(id);
    if (!slo) return null;

    const startTime = new Date(Date.now() - slo.windowDays * 24 * 60 * 60 * 1000);
    const endTime = new Date();

    const points = await safePrisma(() =>
      prisma.telemetryPoint.findMany({
        where: {
          organizationId: slo.organizationId,
          metricName: slo.metricName,
          timestamp: { gte: startTime, lte: endTime },
        },
        orderBy: { timestamp: 'asc' },
        take: 20000,
        select: { value: true, timestamp: true },
      }),
    []);

    if (points.length === 0) {
      return prisma.sLO.update({
        where: { id },
        data: {
          status: 'active',
          errorBudgetUsed: 0.0,
          lastEvaluatedAt: new Date(),
        },
      });
    }

    const values = points.map((p) => p.value).sort((a, b) => a - b);
    const percentileValue = percentile(values, slo.targetPercentile);

    // For latency-type SLOs (lower is better): breached if percentile > target
    const isBreached = percentileValue > slo.target;

    // Error budget: fraction of requests that exceed the target.
    // errorBudget is the allowed fraction (0-1). errorBudgetUsed is the
    // fraction of values that exceed the target relative to the allowed budget.
    const exceedCount = values.filter((v) => v > slo.target).length;
    const exceedFraction = exceedCount / values.length;
    const errorBudgetUsed =
      slo.errorBudget > 0 ? Math.min(1.0, exceedFraction / slo.errorBudget) : 1.0;

    return prisma.sLO.update({
      where: { id },
      data: {
        status: isBreached ? 'breached' : 'met',
        errorBudgetUsed,
        lastEvaluatedAt: new Date(),
      },
    });
  },

  /**
   * Evaluate all active SLOs for an organization.
   */
  async evaluateAllSLOs(organizationId: string) {
    const slos = await this.listSLOs(organizationId);
    const active = slos.filter((s) => s.status === 'active' || s.status === 'breached' || s.status === 'met');
    const results: { id: string; status: string }[] = [];
    for (const slo of active) {
      const updated = await this.evaluateSLO(slo.id);
      if (updated) {
        results.push({ id: updated.id, status: updated.status });
      }
    }
    return results;
  },

  /**
   * Get a summary of SLOs: total, met, breached, active, error budget usage.
   */
  async getSLOSummary(organizationId: string): Promise<SLOSummary> {
    const slos = await this.listSLOs(organizationId);

    let met = 0;
    let breached = 0;
    let active = 0;
    let paused = 0;
    let totalBudgetUsed = 0;

    for (const s of slos) {
      if (s.status === 'met') met++;
      else if (s.status === 'breached') breached++;
      else if (s.status === 'active') active++;
      else if (s.status === 'paused') paused++;
      totalBudgetUsed += s.errorBudgetUsed;
    }

    return {
      total: slos.length,
      met,
      breached,
      active,
      paused,
      avgErrorBudgetUsed: slos.length > 0 ? totalBudgetUsed / slos.length : 0,
    };
  },
};
