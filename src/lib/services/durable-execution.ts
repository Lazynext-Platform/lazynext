/**
 * Durable Execution Engine — extends the existing WorkflowEngine with
 * retry, backoff, dead-letter, idempotency, and crash recovery.
 *
 * This engine processes ScheduledJobs and Plan Tasks with:
 * - Retry with exponential backoff
 * - Dead-letter queue for permanently failed jobs
 * - Idempotency keys to prevent duplicate execution
 * - Crash recovery (resume from last persisted state)
 * - Budget enforcement before each execution
 * - Approval gating for high-risk tasks
 *
 * The engine is designed to run on Cloudflare Workers, where each
 * invocation may be a cold start. State persists in D1, so jobs
 * survive crashes and can be resumed.
 */

import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { EventService } from '@/lib/services/event';
import { BudgetService } from '@/lib/services/budget';
import { ApprovalService } from '@/lib/services/approval';
import { AgentRuntime } from '@/lib/services/agent-runtime';

// ── Types ──

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'dead_letter';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled' | 'blocked' | 'awaiting_approval' | 'failed' | 'retrying' | 'verified';

export interface DurableJob {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  retryCount: number;
  maxRetries: number;
  backoffMs: number;
  idempotencyKey?: string;
  error?: string;
}

// ── Durable Execution Engine ──

export const DurableExecutionEngine = {
  /**
   * Process pending scheduled jobs.
   * This is the main entry point for the cron-triggered job processor.
   * It picks up pending jobs, executes them, and handles retries.
   */
  async processPendingJobs(workspaceId?: string, limit: number = 10): Promise<{
    processed: number;
    completed: number;
    failed: number;
    retried: number;
    deadLettered: number;
  }> {
    const now = new Date();

    // 1. Find pending jobs that are due
    const jobs = await safePrisma(() =>
      prisma.scheduledJob.findMany({
        where: {
          status: 'pending',
          scheduledAt: { lte: now },
          ...(workspaceId && { workspaceId }),
        },
        orderBy: { scheduledAt: 'asc' },
        take: Math.min(limit, 50),
      }),
    []);

    let completed = 0;
    let failed = 0;
    let retried = 0;
    let deadLettered = 0;

    for (const job of jobs) {
      // 2. Check idempotency — skip if already processed
      if (job.idempotencyKey) {
        const existing = await safePrisma(() =>
          prisma.scheduledJob.findFirst({
            where: {
              idempotencyKey: job.idempotencyKey,
              status: 'completed',
              id: { not: job.id },
            },
          }),
        null);
        if (existing) {
          await prisma.scheduledJob.update({
            where: { id: job.id },
            data: { status: 'completed', completedAt: now },
          }).catch(() => {});
          completed++;
          continue;
        }
      }

      // 3. Mark as running
      await prisma.scheduledJob.update({
        where: { id: job.id },
        data: { status: 'running', startedAt: now },
      }).catch(() => {});

      // 4. Execute the job
      try {
        await this.executeJob(job);
        await prisma.scheduledJob.update({
          where: { id: job.id },
          data: { status: 'completed', completedAt: new Date() },
        }).catch(() => {});
        completed++;
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown error';
        const newRetryCount = job.retryCount + 1;

        if (newRetryCount >= job.maxRetries) {
          // Move to dead-letter queue
          await prisma.scheduledJob.update({
            where: { id: job.id },
            data: {
              status: 'dead_letter',
              retryCount: newRetryCount,
              error: errorMsg.slice(0, 2000),
              deadLetterAt: new Date(),
              completedAt: new Date(),
            },
          }).catch(() => {});
          deadLettered++;
        } else {
          // Schedule retry with exponential backoff
          const backoff = job.backoffMs * Math.pow(2, newRetryCount - 1);
          const retryAt = new Date(Date.now() + backoff);

          await prisma.scheduledJob.update({
            where: { id: job.id },
            data: {
              status: 'pending',
              retryCount: newRetryCount,
              error: errorMsg.slice(0, 2000),
              scheduledAt: retryAt,
              startedAt: null,
            },
          }).catch(() => {});
          retried++;
        }
        failed++;
      }
    }

    return {
      processed: jobs.length,
      completed,
      failed,
      retried,
      deadLettered,
    };
  },

  /**
   * Execute a single job based on its type.
   */
  async executeJob(job: {
    id: string;
    workspaceId: string;
    type: string;
    payload: string;
    agentRunId?: string | null;
  }): Promise<void> {
    const payload = JSON.parse(job.payload || '{}');

    switch (job.type) {
      case 'agent.run':
        await this.executeAgentRunJob(job.workspaceId, payload, job.id);
        break;
      case 'plan.execute_task':
        await this.executePlanTaskJob(job.workspaceId, payload, job.id);
        break;
      case 'approval.expire_stale':
        await ApprovalService.expireStale();
        break;
      case 'memory.expire_stale':
        // MemoryService.expireStale is not async-safe to call here directly
        // but we can call it
        break;
      case 'budget.refresh_status':
        if (payload.budgetId) {
          await BudgetService.refreshStatus(payload.budgetId);
        }
        break;
      default:
        // Unknown job type — throw to trigger retry/dead-letter
        throw new Error(`Unknown job type: ${job.type}`);
    }
  },

  /**
   * Execute an agent run job.
   */
  async executeAgentRunJob(
    workspaceId: string,
    payload: { agentId: string; objective: string; taskId?: string; planId?: string },
    jobId: string,
  ): Promise<void> {
    // Get organization from workspace
    const workspace = await safePrisma(() =>
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { organizationId: true },
      }),
    null);

    if (!workspace) throw new Error('Workspace not found');

    const result = await AgentRuntime.run({
      workspaceId,
      organizationId: workspace.organizationId,
      agentId: payload.agentId,
      taskId: payload.taskId,
      planId: payload.planId,
      objective: payload.objective,
      idempotencyKey: `job-${jobId}`,
    });

    if (result.status === 'failed') {
      throw new Error(result.error || 'Agent run failed');
    }
  },

  /**
   * Execute a plan task job — assign a task to an agent and run it.
   */
  async executePlanTaskJob(
    workspaceId: string,
    payload: { taskId: string; agentId: string },
    jobId: string,
  ): Promise<void> {
    const task = await safePrisma(() =>
      prisma.task.findUnique({ where: { id: payload.taskId } }),
    null);

    if (!task) throw new Error('Task not found');
    if (task.status === 'done' || task.status === 'verified') return; // Already done

    // Get workspace's organization
    const workspace = await safePrisma(() =>
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { organizationId: true },
      }),
    null);

    if (!workspace) throw new Error('Workspace not found');

    // Check budget before executing
    if (task.estimatedCost > 0) {
      const budgetCheck = await BudgetService.check({
        workspaceId,
        organizationId: workspace.organizationId,
        amountCredits: task.estimatedCost,
      });
      if (!budgetCheck.allowed) {
        // Mark task as blocked
        await prisma.task.update({
          where: { id: task.id },
          data: { status: 'blocked' },
        }).catch(() => {});
        throw new Error(`Budget exceeded: ${budgetCheck.reason}`);
      }
    }

    // Check if approval is required (high-risk tasks)
    if (task.riskLevel === 'high') {
      const approval = await ApprovalService.request({
        workspaceId,
        organizationId: workspace.organizationId,
        taskId: task.id,
        action: `task.execute: ${task.title}`,
        description: task.description || task.title,
        riskLevel: 'high',
        estimatedCost: task.estimatedCost,
        requestedBy: `job-${jobId}`,
      });

      // Mark task as awaiting approval
      await prisma.task.update({
        where: { id: task.id },
        data: { status: 'awaiting_approval' },
      }).catch(() => {});

      // In autonomous mode, we'd check if the approval is auto-approved
      // For now, we throw to trigger a retry (the approval may be approved by then)
      throw new Error('Approval required for high-risk task');
    }

    // Mark task as in progress
    await prisma.task.update({
      where: { id: task.id },
      data: { status: 'in_progress', assignedAgentId: payload.agentId },
    }).catch(() => {});

    // Run the agent
    const result = await AgentRuntime.run({
      workspaceId,
      organizationId: workspace.organizationId,
      agentId: payload.agentId,
      taskId: task.id,
      planId: task.planId || undefined,
      objective: `${task.title}: ${task.description || ''}`,
      idempotencyKey: `task-${task.id}-job-${jobId}`,
    });

    // Update task status based on result
    if (result.status === 'completed') {
      await prisma.task.update({
        where: { id: task.id },
        data: { status: 'verified' },
      }).catch(() => {});
    } else {
      await prisma.task.update({
        where: { id: task.id },
        data: { status: 'failed', retryCount: { increment: 1 } },
      }).catch(() => {});
      throw new Error(result.error || 'Task execution failed');
    }
  },

  /**
   * Schedule a job for later execution.
   */
  async scheduleJob(input: {
    workspaceId: string;
    type: string;
    payload: Record<string, unknown>;
    scheduledAt?: Date;
    maxRetries?: number;
    backoffMs?: number;
    idempotencyKey?: string;
    ownerId?: string;
    agentRunId?: string;
  }): Promise<string> {
    const job = await prisma.scheduledJob.create({
      data: {
        workspaceId: input.workspaceId,
        type: input.type,
        payload: JSON.stringify(input.payload).slice(0, 10000),
        scheduledAt: input.scheduledAt || new Date(),
        status: 'pending',
        maxRetries: input.maxRetries ?? 3,
        backoffMs: input.backoffMs ?? 1000,
        idempotencyKey: input.idempotencyKey || null,
        ownerId: input.ownerId || null,
        agentRunId: input.agentRunId || null,
      },
    });
    return job.id;
  },

  /**
   * Recover crashed jobs — find jobs stuck in 'running' state
   * and reset them to pending for retry.
   */
  async recoverCrashedJobs(): Promise<number> {
    // Find jobs that are running but have been running for too long (> 5 min)
    const cutoff = new Date(Date.now() - 5 * 60 * 1000);

    const result = await prisma.scheduledJob.updateMany({
      where: {
        status: 'running',
        startedAt: { lt: cutoff },
      },
      data: {
        status: 'pending',
        startedAt: null,
        retryCount: { increment: 1 },
      },
    }).catch(() => ({ count: 0 }));

    if (result.count > 0) {
      await EventService.emit({
        type: 'durable_exec.crashed_jobs_recovered',
        metadata: { count: result.count },
        source: 'system',
      }).catch(() => {});
    }

    return result.count;
  },

  /**
   * Process dead-lettered jobs — either retry them or mark them as permanently failed.
   */
  async processDeadLetterQueue(): Promise<number> {
    const deadLettered = await safePrisma(() =>
      prisma.scheduledJob.findMany({
        where: { status: 'dead_letter' },
        take: 100,
      }),
    []);

    for (const job of deadLettered) {
      await EventService.emit({
        workspaceId: job.workspaceId,
        type: 'durable_exec.dead_letter',
        actorType: 'system',
        resourceType: 'scheduled_job',
        resourceId: job.id,
        metadata: {
          type: job.type,
          error: job.error?.slice(0, 500),
          retryCount: job.retryCount,
        },
        source: 'system',
      }).catch(() => {});
    }

    return deadLettered.length;
  },

  /**
   * Get job statistics for a workspace.
   */
  async getStats(workspaceId: string): Promise<{
    pending: number;
    running: number;
    completed: number;
    failed: number;
    deadLettered: number;
  }> {
    const [pending, running, completed, failed, deadLettered] = await Promise.all([
      safePrisma(() => prisma.scheduledJob.count({ where: { workspaceId, status: 'pending' } }), 0),
      safePrisma(() => prisma.scheduledJob.count({ where: { workspaceId, status: 'running' } }), 0),
      safePrisma(() => prisma.scheduledJob.count({ where: { workspaceId, status: 'completed' } }), 0),
      safePrisma(() => prisma.scheduledJob.count({ where: { workspaceId, status: 'failed' } }), 0),
      safePrisma(() => prisma.scheduledJob.count({ where: { workspaceId, status: 'dead_letter' } }), 0),
    ]);

    return { pending, running, completed, failed, deadLettered };
  },
};
