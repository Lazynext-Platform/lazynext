import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { TelemetryService } from '@/lib/services/telemetry';

// ── Types ──

export interface AlertInput {
  workspaceId?: string;
  name: string;
  description?: string;
  severity?: string; // info | warning | error | critical
  source?: string; // system | metric | trace | log | manual
  metricName?: string;
  condition?: Record<string, unknown>; // { operator, threshold, window }
  threshold?: number;
  metadata?: Record<string, unknown>;
}

export interface ListAlertsOptions {
  status?: string;
  severity?: string;
  metricName?: string;
  limit?: number;
}

export interface AlertSummary {
  total: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  recentTriggers: number;
  activeCount: number;
  criticalCount: number;
  warningCount: number;
  resolvedCount: number;
}

// ── Helpers ──

interface AlertCondition {
  operator?: string; // gt | gte | lt | lte | eq | ne
  threshold?: number;
  window?: number; // window in minutes for evaluation
}

function parseCondition(condition: string): AlertCondition {
  try {
    return JSON.parse(condition) as AlertCondition;
  } catch {
    return {};
  }
}

function compareOperator(operator: string, value: number, threshold: number): boolean {
  switch (operator) {
    case 'gt':
      return value > threshold;
    case 'gte':
      return value >= threshold;
    case 'lt':
      return value < threshold;
    case 'lte':
      return value <= threshold;
    case 'eq':
      return value === threshold;
    case 'ne':
      return value !== threshold;
    default:
      return value > threshold;
  }
}

// ── Alert Service ──

export const AlertService = {
  /**
   * Create an alert definition.
   */
  async createAlert(organizationId: string, input: AlertInput) {
    return prisma.alert.create({
      data: {
        organizationId,
        workspaceId: input.workspaceId || null,
        name: input.name.slice(0, 200),
        description: input.description || '',
        severity: input.severity || 'warning',
        status: 'active',
        source: input.source || 'system',
        metricName: input.metricName || null,
        condition: JSON.stringify(input.condition || {}),
        threshold: input.threshold ?? null,
        metadata: JSON.stringify(input.metadata || {}),
      },
    });
  },

  /**
   * List alerts for an organization, optionally filtered by status/severity.
   */
  async listAlerts(organizationId: string, opts?: ListAlertsOptions) {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.status) where.status = opts.status;
    if (opts?.severity) where.severity = opts.severity;
    if (opts?.metricName) where.metricName = opts.metricName;

    return safePrisma(() =>
      prisma.alert.findMany({
        where: where as never,
        orderBy: { createdAt: 'desc' },
        take: opts?.limit ?? 100,
      }),
    []);
  },

  /**
   * Get a single alert by ID.
   */
  async getAlert(id: string) {
    return safePrisma(() =>
      prisma.alert.findUnique({
        where: { id },
      }),
    null);
  },

  /**
   * Update an alert definition.
   */
  async updateAlert(id: string, input: Partial<AlertInput>) {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name.slice(0, 200);
    if (input.description !== undefined) data.description = input.description;
    if (input.severity !== undefined) data.severity = input.severity;
    if (input.source !== undefined) data.source = input.source;
    if (input.metricName !== undefined) data.metricName = input.metricName;
    if (input.condition !== undefined) data.condition = JSON.stringify(input.condition);
    if (input.threshold !== undefined) data.threshold = input.threshold;
    if (input.metadata !== undefined) data.metadata = JSON.stringify(input.metadata);
    if (input.workspaceId !== undefined) data.workspaceId = input.workspaceId;

    return prisma.alert.update({
      where: { id },
      data: data as never,
    });
  },

  /**
   * Evaluate an alert against current telemetry.
   * If condition is met, set status to 'active', increment triggerCount, set lastTriggeredAt.
   * If not met and was active, set status to 'resolved', set resolvedAt.
   */
  async evaluateAlert(id: string) {
    const alert = await this.getAlert(id);
    if (!alert) return null;

    const condition = parseCondition(alert.condition);
    const metricName = alert.metricName;
    if (!metricName) return alert;

    const windowMinutes = condition.window ?? 5;
    const startTime = new Date(Date.now() - windowMinutes * 60 * 1000);
    const endTime = new Date();

    const agg = await TelemetryService.aggregatePoints(alert.organizationId, metricName, {
      startTime,
      endTime,
    });

    const operator = condition.operator ?? 'gt';
    const threshold = condition.threshold ?? alert.threshold ?? 0;
    const currentValue = agg.lastValue;
    const conditionMet = agg.count > 0 && compareOperator(operator, currentValue, threshold);

    if (conditionMet) {
      return prisma.alert.update({
        where: { id },
        data: {
          status: 'active',
          currentValue,
          triggerCount: { increment: 1 },
          lastTriggeredAt: new Date(),
          resolvedAt: null,
        },
      });
    }

    // Condition not met
    if (alert.status === 'active') {
      return prisma.alert.update({
        where: { id },
        data: {
          status: 'resolved',
          currentValue,
          resolvedAt: new Date(),
        },
      });
    }

    // Just update current value without changing status
    return prisma.alert.update({
      where: { id },
      data: { currentValue },
    });
  },

  /**
   * Evaluate all active alerts for an organization.
   */
  async evaluateAllAlerts(organizationId: string) {
    const alerts = await this.listAlerts(organizationId, { status: 'active' });
    const results: { id: string; status: string }[] = [];
    for (const alert of alerts) {
      const updated = await this.evaluateAlert(alert.id);
      if (updated) {
        results.push({ id: updated.id, status: updated.status });
      }
    }
    return results;
  },

  /**
   * Mark an alert as acknowledged by a user.
   */
  async acknowledgeAlert(id: string, userId: string) {
    return prisma.alert.update({
      where: { id },
      data: { acknowledgedBy: userId },
    });
  },

  /**
   * Manually resolve an alert.
   */
  async resolveAlert(id: string) {
    return prisma.alert.update({
      where: { id },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
      },
    });
  },

  /**
   * Suppress an alert for a given duration (ms).
   * Sets status to 'suppressed' and schedules no automatic re-activation.
   */
  async suppressAlert(id: string, durationMs: number) {
    const alert = await prisma.alert.update({
      where: { id },
      data: {
        status: 'suppressed',
        metadata: JSON.stringify({ suppressedUntil: Date.now() + durationMs }),
      },
    });
    return alert;
  },

  /**
   * Get a summary of alerts: counts by status, by severity, recent triggers.
   */
  async getAlertSummary(organizationId: string): Promise<AlertSummary> {
    const alerts = await safePrisma(() =>
      prisma.alert.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 500,
        select: {
          id: true,
          status: true,
          severity: true,
          lastTriggeredAt: true,
        },
      }),
    []);

    const byStatus: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    let recentTriggers = 0;

    for (const a of alerts) {
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
      bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
      if (a.lastTriggeredAt && a.lastTriggeredAt.getTime() > oneDayAgo) {
        recentTriggers++;
      }
    }

    return {
      total: alerts.length,
      byStatus,
      bySeverity,
      recentTriggers,
      activeCount: byStatus.active || 0,
      criticalCount: bySeverity.critical || 0,
      warningCount: bySeverity.warning || 0,
      resolvedCount: byStatus.resolved || 0,
    };
  },
};
