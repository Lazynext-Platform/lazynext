/**
 * Task Auto-Assigner — matches unassigned tasks to available agents.
 *
 * For each task with status 'todo' and no assignedAgentId:
 * 1. Find agents in the same workspace with a matching role
 * 2. If no role match, find any enabled agent
 * 3. Schedule a durable job to execute the task
 *
 * This runs as part of the cron-triggered durable execution loop.
 */

import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { DurableExecutionEngine } from '@/lib/services/durable-execution';

export const TaskAutoAssigner = {
  /**
   * Find unassigned tasks and assign them to available agents.
   * Returns the number of tasks assigned.
   */
  async assignPendingTasks(): Promise<number> {
    // 1. Find tasks that need assignment
    const tasks = await safePrisma(() =>
      prisma.task.findMany({
        where: {
          status: 'todo',
          assignedAgentId: null,
          planId: { not: null },
        },
        take: 20,
        orderBy: { priority: 'desc' },
      }),
    []);

    if (tasks.length === 0) return 0;

    let assigned = 0;

    for (const task of tasks) {
      // 2. Get the workspace for this task
      const project = await safePrisma(() =>
        prisma.project.findUnique({
          where: { id: task.projectId },
          select: { workspaceId: true },
        }),
      null);

      if (!project) continue;

      // 3. Find an agent for this task
      const agent = await this.findAgentForTask(project.workspaceId, task);

      if (!agent) continue;

      // 4. Assign the agent to the task
      await prisma.task.update({
        where: { id: task.id },
        data: { assignedAgentId: agent.id, status: 'in_progress' },
      }).catch(() => {});

      // 5. Schedule a durable job to execute the task
      await DurableExecutionEngine.scheduleJob({
        workspaceId: project.workspaceId,
        type: 'plan.execute_task',
        payload: {
          taskId: task.id,
          agentId: agent.id,
        },
        maxRetries: 3,
        backoffMs: 2000,
        idempotencyKey: `task-${task.id}-auto`,
      }).catch(() => {});

      assigned++;
    }

    return assigned;
  },

  /**
   * Find the best agent for a task.
   * Tries to match by role first, then falls back to any enabled agent.
   */
  async findAgentForTask(
    workspaceId: string,
    task: { title: string; description: string | null },
  ): Promise<{ id: string } | null> {
    // Try to find an enabled agent in this workspace
    const agents = await safePrisma(() =>
      prisma.agentDef.findMany({
        where: {
          workspaceId,
          enabled: true,
        },
        select: { id: true, role: true, name: true },
      }),
    []);

    if (agents.length === 0) return null;

    // Try role-based matching (parse the task description for role hints)
    const taskText = `${task.title} ${task.description || ''}`.toLowerCase();
    const roleKeywords: Record<string, string[]> = {
      engineering: ['code', 'build', 'implement', 'fix', 'deploy', 'api', 'database', 'bug'],
      research: ['research', 'analyze', 'investigate', 'study', 'find'],
      growth: ['marketing', 'campaign', 'ad', 'social', 'content', 'seo'],
      sales: ['sales', 'lead', 'customer', 'outreach', 'crm'],
      product: ['product', 'feature', 'roadmap', 'spec', 'design'],
      finance: ['finance', 'budget', 'invoice', 'payment', 'cost'],
      operations: ['operations', 'process', 'workflow', 'automate'],
    };

    for (const [role, keywords] of Object.entries(roleKeywords)) {
      if (keywords.some((kw) => taskText.includes(kw))) {
        const match = agents.find((a) => a.role === role);
        if (match) return { id: match.id };
      }
    }

    // Fall back to the first available agent
    return { id: agents[0].id };
  },
};
