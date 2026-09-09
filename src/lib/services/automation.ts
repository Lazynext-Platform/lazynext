import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Automation Service ──

export interface AutomationInput {
  name?: string;
  trigger?: string;
  enabled?: boolean;
  definition?: string;
}

/**
 * AutomationService — CRUD for automations plus the event dispatcher that
 * connects emitted events to matching automations by trigger name.
 *
 * When an event is dispatched, the service finds all enabled automations
 * whose `trigger` matches the event `type` (within the event's workspace)
 * and creates a pending AutomationRun for each. The DurableExecutionEngine
 * or a cron worker later picks up those runs and executes the definition.
 */
export const AutomationService = {
  /**
   * List automations for a workspace, with run counts.
   */
  async list(workspaceId: string) {
    return safePrisma(() =>
      prisma.automation.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          _count: { select: { runs: true } },
        },
      }),
    []);
  },

  /**
   * Get a single automation with its recent runs.
   */
  async get(id: string) {
    return safePrisma(() =>
      prisma.automation.findUnique({
        where: { id },
        include: {
          runs: {
            orderBy: { startedAt: 'desc' },
            take: 20,
          },
          _count: { select: { runs: true } },
        },
      }),
    null);
  },

  /**
   * Create a new automation.
   */
  async create(workspaceId: string, input: AutomationInput) {
    const name = input.name?.trim();
    const trigger = input.trigger?.trim();
    if (!name || !trigger) {
      throw new Error('name_and_trigger_required');
    }

    return prisma.automation.create({
      data: {
        workspaceId,
        name: name.slice(0, 200),
        trigger: trigger.slice(0, 100),
        definition: (input.definition || '{}').slice(0, 10_000),
        enabled: input.enabled ?? true,
      },
    });
  },

  /**
   * Update an automation. Only provided fields are updated.
   */
  async update(id: string, input: AutomationInput) {
    const data: Record<string, unknown> = {};
    if (input.name?.trim()) data.name = input.name.trim().slice(0, 200);
    if (input.trigger?.trim()) data.trigger = input.trigger.trim().slice(0, 100);
    if (typeof input.enabled === 'boolean') data.enabled = input.enabled;
    if (input.definition !== undefined) data.definition = String(input.definition).slice(0, 10_000);

    return prisma.automation.update({ where: { id }, data });
  },

  /**
   * Delete an automation.
   */
  async delete(id: string) {
    await prisma.automation.delete({ where: { id } });
    return { ok: true };
  },

  /**
   * List runs for an automation (most recent first).
   */
  async listRuns(automationId: string, limit: number = 50) {
    return safePrisma(() =>
      prisma.automationRun.findMany({
        where: { automationId },
        orderBy: { startedAt: 'desc' },
        take: Math.min(limit, 500),
      }),
    []);
  },

  /**
   * Get a single run by id.
   */
  async getRun(id: string) {
    return safePrisma(() =>
      prisma.automationRun.findUnique({
        where: { id },
        include: { automation: true },
      }),
    null);
  },

  /**
   * Dispatch an event to matching automations.
   *
   * Finds all enabled automations whose `trigger` equals the event `type`
   * (scoped to the event's workspace) and creates a pending AutomationRun
   * for each. This is the bridge between the event bus and the automation
   * engine — it does not execute the automation definition itself; that is
   * left to a worker/cron that processes pending runs.
   *
   * Returns the created runs.
   */
  async dispatchEvent(event: {
    id: string;
    workspaceId?: string | null;
    type: string;
    actor?: string | null;
    metadata?: string;
    correlationId?: string | null;
  }) {
    // Only events tied to a workspace can trigger automations.
    if (!event.workspaceId) return [];

    const automations = await safePrisma(() =>
      prisma.automation.findMany({
        where: {
          workspaceId: event.workspaceId as string,
          enabled: true,
          trigger: event.type,
        },
        select: { id: true },
      }),
    []);

    if (automations.length === 0) return [];

    const now = new Date();
    const runs = await Promise.all(
      automations.map((a) =>
        prisma.automationRun.create({
          data: {
            automationId: a.id,
            status: 'pending',
            startedAt: now,
          },
        }).catch(() => null),
      ),
    );

    return runs.filter((r): r is NonNullable<typeof r> => r !== null);
  },

  /**
   * Get automation stats for a workspace:
   * total automations, enabled count, runs in the last 24h, and success rate.
   */
  async getStats(workspaceId: string): Promise<{
    total: number;
    enabled: number;
    runs24h: number;
    successRate: number;
  }> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [total, enabled, recentRuns, completedRuns] = await Promise.all([
      safePrisma(() => prisma.automation.count({ where: { workspaceId } }), 0),
      safePrisma(() => prisma.automation.count({ where: { workspaceId, enabled: true } }), 0),
      safePrisma(() =>
        prisma.automationRun.count({
          where: {
            automation: { workspaceId },
            startedAt: { gte: since },
          },
        }),
      0),
      safePrisma(() =>
        prisma.automationRun.count({
          where: {
            automation: { workspaceId },
            startedAt: { gte: since },
            status: 'completed',
          },
        }),
      0),
    ]);

    const successRate = recentRuns > 0 ? Math.round((completedRuns / recentRuns) * 100) : 0;

    return { total, enabled, runs24h: recentRuns, successRate };
  },
};
