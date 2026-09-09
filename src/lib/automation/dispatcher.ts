import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { EventService } from '@/lib/services/event';
import { WebhookDispatcher } from './webhook-dispatcher';
import {
  DEFAULT_RETRY_CONFIG,
  withRetryAsync,
  isRetryableError,
  formatRetrySummary,
  type RetryConfig,
} from './retry';

// ── Automation Dispatcher ──
//
// Production automation dispatcher that validates, executes, and records
// automation runs. Bridges the event bus to concrete action execution.

export type AutomationActionType =
  | 'webhook'
  | 'api_call'
  | 'create_task'
  | 'send_notification'
  | 'update_record';

export interface AutomationAction {
  type: AutomationActionType;
  config: Record<string, unknown>;
}

export interface AutomationDefinition {
  trigger?: string;
  actions?: AutomationAction[];
}

export interface ActionContext {
  workspaceId: string;
  organizationId?: string;
  automationId: string;
  runId: string;
  trigger: string;
  payload: Record<string, unknown>;
}

export interface ActionResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface DispatchStats {
  total: number;
  completed: number;
  failed: number;
  running: number;
  pending: number;
  successRate: number;
}

export interface RecentDispatch {
  id: string;
  automationId: string;
  automationName: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
}

export interface FailedDispatch extends RecentDispatch {}

function parseDefinition(definition: string): AutomationDefinition {
  try {
    const parsed = JSON.parse(definition) as AutomationDefinition;
    return {
      trigger: parsed.trigger,
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    };
  } catch {
    return { trigger: undefined, actions: [] };
  }
}

export const AutomationDispatcher = {
  /**
   * Dispatch an automation: validate, create a run, execute actions
   * with retry, update the run record, and emit events.
   */
  async dispatch(
    automationId: string,
    trigger: string,
    payload: Record<string, unknown>,
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG,
  ) {
    // 1. Validate the automation exists and is enabled.
    const automation = await safePrisma(() =>
      prisma.automation.findUnique({
        where: { id: automationId },
      }),
    null);

    if (!automation) {
      throw new Error('automation_not_found');
    }
    if (!automation.enabled) {
      throw new Error('automation_disabled');
    }

    // 2. Check trigger matches (when the definition declares one).
    const def = parseDefinition(automation.definition);
    if (def.trigger && def.trigger !== trigger) {
      throw new Error('trigger_mismatch');
    }

    // 3. Create a pending AutomationRun.
    const run = await prisma.automationRun.create({
      data: {
        automationId,
        status: 'running',
        startedAt: new Date(),
      },
    });

    const workspaceId = automation.workspaceId;
    let orgId: string | undefined;

    try {
      const ws = await safePrisma(() =>
        prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: { organizationId: true },
        }),
        null);
      orgId = ws?.organizationId;
    } catch {
      // non-fatal
    }

    const ctx: ActionContext = {
      workspaceId,
      organizationId: orgId,
      automationId,
      runId: run.id,
      trigger,
      payload,
    };

    // 4. Execute the automation actions with retry.
    const errors: string[] = [];
    const results: ActionResult[] = [];

    for (const action of def.actions ?? []) {
      try {
        const { result } = await withRetryAsync(
          () => this.executeAction(action, ctx),
          retryConfig,
        );
        results.push(result);
        if (!result.ok && result.error) errors.push(result.error);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        errors.push(err.message);
        results.push({ ok: false, error: err.message });
        // Non-retryable / exhausted — continue to next action.
      }
    }

    // 5. Update the run record with results.
    const success = errors.length === 0;
    const updated = await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        status: success ? 'completed' : 'failed',
        completedAt: new Date(),
      },
    });

    // 6. Emit events.
    try {
      await EventService.emit({
        workspaceId,
        organizationId: orgId,
        type: success ? 'automation.dispatch.completed' : 'automation.dispatch.failed',
        actor: 'system',
        actorType: 'system',
        resourceType: 'automation',
        resourceId: automationId,
        metadata: {
          runId: run.id,
          trigger,
          actions: (def.actions ?? []).length,
          errors,
          summary: formatRetrySummary(results.length, errors.map((m) => new Error(m))),
        },
        source: 'automation-dispatcher',
      });
    } catch {
      // event emission is non-fatal
    }

    return updated;
  },

  /**
   * Execute a single automation action.
   */
  async executeAction(action: AutomationAction, ctx: ActionContext): Promise<ActionResult> {
    switch (action.type) {
      case 'webhook': {
        const url = String(action.config.url ?? '');
        const event = String(action.config.event ?? ctx.trigger);
        const secret = action.config.secret
          ? String(action.config.secret)
          : undefined;
        if (!url) return { ok: false, error: 'webhook_url_required' };
        const res = await WebhookDispatcher.dispatch(url, ctx.payload, {
          event,
          secret,
        });
        return res.success
          ? { ok: true, data: res }
          : { ok: false, error: res.error ?? `webhook failed (${res.statusCode})` };
      }

      case 'api_call': {
        const url = String(action.config.url ?? '');
        const method = String(action.config.method ?? 'POST').toUpperCase();
        if (!url) return { ok: false, error: 'api_url_required' };
        try {
          const res = await fetch(url, {
            method,
            headers: {
              'Content-Type': 'application/json',
              ...(action.config.headers as Record<string, string> | undefined),
            },
            body: method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(ctx.payload),
          });
          if (!res.ok) {
            return { ok: false, error: `api_call failed (${res.status})` };
          }
          return { ok: true, data: { status: res.status } };
        } catch (e) {
          const err = e instanceof Error ? e : new Error(String(e));
          return { ok: false, error: err.message };
        }
      }

      case 'create_task': {
        const title = String(action.config.title ?? '').slice(0, 200);
        const projectId = String(action.config.projectId ?? '');
        if (!title) return { ok: false, error: 'task_title_required' };
        if (!projectId) return { ok: false, error: 'task_projectId_required' };
        try {
          const task = await prisma.task.create({
            data: {
              projectId,
              title,
              description: action.config.description
                ? String(action.config.description)
                : null,
              status: 'todo',
              priority: String(action.config.priority ?? 'medium'),
              assigneeId: action.config.assigneeId
                ? String(action.config.assigneeId)
                : null,
            },
          });
          return { ok: true, data: { taskId: task.id } };
        } catch (e) {
          const err = e instanceof Error ? e : new Error(String(e));
          return { ok: false, error: err.message };
        }
      }

      case 'send_notification': {
        const userId = String(action.config.userId ?? '');
        const title = String(action.config.title ?? '').slice(0, 200);
        if (!userId) return { ok: false, error: 'notification_userId_required' };
        if (!title) return { ok: false, error: 'notification_title_required' };
        try {
          const notif = await prisma.notification.create({
            data: {
              userId,
              workspaceId: ctx.workspaceId,
              type: String(action.config.type ?? 'automation'),
              title,
              body: action.config.body ? String(action.config.body) : null,
            },
          });
          return { ok: true, data: { notificationId: notif.id } };
        } catch (e) {
          const err = e instanceof Error ? e : new Error(String(e));
          return { ok: false, error: err.message };
        }
      }

      case 'update_record': {
        const model = String(action.config.model ?? '');
        const recordId = String(action.config.recordId ?? '');
        if (!model || !recordId) {
          return { ok: false, error: 'model_and_recordId_required' };
        }
        // Generic record update via the prisma delegate.
        try {
          const delegate = (prisma as unknown as Record<string, { update: (a: unknown) => Promise<unknown> }>)[model];
          if (!delegate?.update) {
            return { ok: false, error: `unknown_model:${model}` };
          }
          await delegate.update({
            where: { id: recordId },
            data: (action.config.data as Record<string, unknown>) ?? {},
          });
          return { ok: true, data: { model, recordId } };
        } catch (e) {
          const err = e instanceof Error ? e : new Error(String(e));
          return { ok: false, error: err.message };
        }
      }

      default:
        return { ok: false, error: `unknown_action_type:${action.type}` };
    }
  },

  /**
   * Validate an automation definition.
   * Returns { valid, errors }.
   */
  validateAutomation(automation: {
    enabled?: boolean;
    trigger?: string;
    definition?: string;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!automation.trigger || !automation.trigger.trim()) {
      errors.push('trigger_required');
    }

    if (typeof automation.enabled !== 'boolean') {
      // enabled is optional but if provided must be boolean
    }

    const def = automation.definition ? parseDefinition(automation.definition) : null;
    if (def) {
      if (def.trigger && def.trigger !== automation.trigger) {
        errors.push('definition_trigger_mismatch');
      }
      if (def.actions) {
        for (const [i, a] of def.actions.entries()) {
          if (!a.type) errors.push(`action[${i}].type_required`);
          if (!a.config || typeof a.config !== 'object') {
            errors.push(`action[${i}].config_required`);
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * Get execution stats for a single automation.
   */
  async getDispatchStats(automationId: string): Promise<DispatchStats> {
    const [total, completed, failed, running, pending] = await Promise.all([
      safePrisma(() => prisma.automationRun.count({ where: { automationId } }), 0),
      safePrisma(() => prisma.automationRun.count({ where: { automationId, status: 'completed' } }), 0),
      safePrisma(() => prisma.automationRun.count({ where: { automationId, status: 'failed' } }), 0),
      safePrisma(() => prisma.automationRun.count({ where: { automationId, status: 'running' } }), 0),
      safePrisma(() => prisma.automationRun.count({ where: { automationId, status: 'pending' } }), 0),
    ]);

    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, failed, running, pending, successRate };
  },

  /**
   * Recent automation runs across an organization.
   */
  async getRecentDispatches(organizationId: string, limit: number = 20): Promise<RecentDispatch[]> {
    const runs = await safePrisma(() =>
      prisma.automationRun.findMany({
        where: { automation: { workspace: { organizationId } } },
        orderBy: { startedAt: 'desc' },
        take: Math.min(limit, 100),
        include: { automation: { select: { id: true, name: true } } },
      }),
    []);

    return runs.map((r) => ({
      id: r.id,
      automationId: r.automationId,
      automationName: r.automation.name,
      status: r.status,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
    }));
  },

  /**
   * Failed runs for retry/review.
   */
  async getFailedDispatches(organizationId: string, limit: number = 20): Promise<FailedDispatch[]> {
    const runs = await safePrisma(() =>
      prisma.automationRun.findMany({
        where: { status: 'failed', automation: { workspace: { organizationId } } },
        orderBy: { startedAt: 'desc' },
        take: Math.min(limit, 100),
        include: { automation: { select: { id: true, name: true } } },
      }),
    []);

    return runs.map((r) => ({
      id: r.id,
      automationId: r.automationId,
      automationName: r.automation.name,
      status: r.status,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
    }));
  },
};

export { isRetryableError };
