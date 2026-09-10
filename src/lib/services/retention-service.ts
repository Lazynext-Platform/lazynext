import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { TelemetryService } from '@/lib/services/telemetry';
import { TraceService } from '@/lib/services/trace-service';

// ── Types ──

export interface RetentionPolicyInput {
  name: string;
  dataType: string; // telemetry | traces | spans | metrics | logs | audit_events
  retentionDays?: number;
  action?: string; // delete | archive | aggregate
  enabled?: boolean;
}

export interface RetentionRunResult {
  policiesRun: number;
  deleted: Record<string, number>; // dataType → count deleted
}

export interface RetentionSummary {
  total: number;
  enabled: number;
  byDataType: Record<string, number>;
  lastRunAt: Date | null;
}

// ── Retention Service ──

export const RetentionService = {
  /**
   * Create a retention policy.
   */
  async createPolicy(organizationId: string, input: RetentionPolicyInput) {
    return prisma.retentionPolicy.create({
      data: {
        organizationId,
        name: input.name.slice(0, 200),
        dataType: input.dataType,
        retentionDays: input.retentionDays ?? 30,
        action: input.action || 'delete',
        enabled: input.enabled ?? true,
      },
    });
  },

  /**
   * List all retention policies for an organization.
   */
  async listPolicies(organizationId: string) {
    return safePrisma(() =>
      prisma.retentionPolicy.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    []);
  },

  /**
   * Get a single retention policy by ID.
   */
  async getPolicy(id: string) {
    return safePrisma(() =>
      prisma.retentionPolicy.findUnique({
        where: { id },
      }),
    null);
  },

  /**
   * Update a retention policy.
   */
  async updatePolicy(id: string, input: Partial<RetentionPolicyInput>) {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name.slice(0, 200);
    if (input.dataType !== undefined) data.dataType = input.dataType;
    if (input.retentionDays !== undefined) data.retentionDays = input.retentionDays;
    if (input.action !== undefined) data.action = input.action;
    if (input.enabled !== undefined) data.enabled = input.enabled;

    return prisma.retentionPolicy.update({
      where: { id },
      data: data as never,
    });
  },

  /**
   * Delete a retention policy.
   */
  async deletePolicy(id: string) {
    return prisma.retentionPolicy.delete({
      where: { id },
    });
  },

  /**
   * Execute all enabled retention policies for an organization.
   * Deletes old data based on retentionDays and dataType.
   * Returns a summary of what was cleaned up.
   */
  async runRetention(organizationId: string): Promise<RetentionRunResult> {
    const policies = await this.listPolicies(organizationId);
    const enabled = policies.filter((p) => p.enabled);

    const deleted: Record<string, number> = {};
    let policiesRun = 0;

    for (const policy of enabled) {
      const beforeDate = new Date(Date.now() - policy.retentionDays * 24 * 60 * 60 * 1000);
      let count = 0;

      switch (policy.dataType) {
        case 'telemetry': {
          const result = await TelemetryService.deleteOldPoints(organizationId, beforeDate);
          count = result.count;
          break;
        }
        case 'traces': {
          const result = await TraceService.deleteOldTraces(organizationId, beforeDate);
          count = result.count;
          break;
        }
        case 'spans': {
          const result = await safePrisma(() =>
            prisma.span.deleteMany({
              where: {
                organizationId,
                startTime: { lt: beforeDate },
              },
            }),
          { count: 0 });
          count = result.count;
          break;
        }
        case 'metrics': {
          const result = await safePrisma(() =>
            prisma.metric.deleteMany({
              where: {
                organizationId,
                timestamp: { lt: beforeDate },
              },
            }),
          { count: 0 });
          count = result.count;
          break;
        }
        case 'audit_events': {
          const result = await safePrisma(() =>
            prisma.auditEvent.deleteMany({
              where: {
                workspace: { organizationId },
                createdAt: { lt: beforeDate },
              },
            }),
          { count: 0 });
          count = result.count;
          break;
        }
        case 'logs': {
          // Logs may map to events; clean old events
          const result = await safePrisma(() =>
            prisma.event.deleteMany({
              where: {
                organizationId,
                createdAt: { lt: beforeDate },
              },
            }),
          { count: 0 });
          count = result.count;
          break;
        }
        default:
          count = 0;
      }

      deleted[policy.dataType] = (deleted[policy.dataType] || 0) + count;
      policiesRun++;

      // Update lastRunAt
      await safePrisma(() =>
        prisma.retentionPolicy.update({
          where: { id: policy.id },
          data: { lastRunAt: new Date() },
        }),
      null);
    }

    return { policiesRun, deleted };
  },

  /**
   * Get a summary of retention policies and last run.
   */
  async getRetentionSummary(organizationId: string): Promise<RetentionSummary> {
    const policies = await this.listPolicies(organizationId);
    const byDataType: Record<string, number> = {};
    let enabled = 0;
    let lastRunAt: Date | null = null;

    for (const p of policies) {
      byDataType[p.dataType] = (byDataType[p.dataType] || 0) + 1;
      if (p.enabled) enabled++;
      if (p.lastRunAt) {
        if (!lastRunAt || p.lastRunAt > lastRunAt) {
          lastRunAt = p.lastRunAt;
        }
      }
    }

    return {
      total: policies.length,
      enabled,
      byDataType,
      lastRunAt,
    };
  },
};
