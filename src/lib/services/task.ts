/**
 * Task Service — unified task management with dependencies, subtasks,
 * blocking, time tracking, and plan integration.
 *
 * This service extends the existing Task model with:
 * - Dependency management (blocks/finish-to-start)
 * - Subtask hierarchy (parentTaskId)
 * - Time tracking (TimeEntry)
 * - Status transitions with dependency checking
 * - Bulk operations
 */

import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

export const TaskService = {
  /**
   * List tasks for a workspace, with optional filters.
   */
  async list(workspaceId: string, filters?: {
    status?: string;
    priority?: string;
    assigneeId?: string;
    planId?: string;
    projectId?: string;
    parentTaskId?: string | null;
  }): Promise<unknown[]> {
    const projectIds = await safePrisma(() =>
      prisma.project.findMany({
        where: { workspaceId, status: 'active' },
        select: { id: true },
      }),
    []);

    if (projectIds.length === 0) return [];

    return safePrisma(() =>
      prisma.task.findMany({
        where: {
          projectId: { in: projectIds.map((p: { id: string }) => p.id) },
          deletedAt: null,
          ...filters,
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: 100,
      }),
    []);
  },

  /**
   * Get a task by ID with dependencies and subtasks.
   */
  async get(id: string): Promise<unknown> {
    return safePrisma(() =>
      prisma.task.findUnique({
        where: { id },
        include: {
          dependencies: { include: { dependsOn: true } },
          dependents: { include: { task: true } },
          timeEntries: { orderBy: { startedAt: 'desc' }, take: 20 },
        },
      }),
    null);
  },

  /**
   * Create a new task.
   */
  async create(input: {
    projectId: string;
    title: string;
    description?: string;
    priority?: string;
    status?: string;
    dueDate?: Date;
    assigneeId?: string;
    parentTaskId?: string;
    planId?: string;
    estimatedCost?: number;
    riskLevel?: string;
  }): Promise<{ id: string }> {
    return prisma.task.create({
      data: {
        projectId: input.projectId,
        title: input.title.slice(0, 300),
        description: (input.description || '').slice(0, 5000),
        priority: input.priority || 'medium',
        status: input.status || 'todo',
        dueDate: input.dueDate || null,
        assigneeId: input.assigneeId || null,
        parentTaskId: input.parentTaskId || null,
        planId: input.planId || null,
        estimatedCost: input.estimatedCost || 0,
        riskLevel: input.riskLevel || 'low',
      },
    });
  },

  /**
   * Update a task.
   */
  async update(id: string, data: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: Date | null;
    assigneeId?: string | null;
    assignedAgentId?: string | null;
  }): Promise<unknown> {
    return prisma.task.update({ where: { id }, data });
  },

  /**
   * Update task status with dependency checking.
   * If the task has uncompleted dependencies, it cannot be started.
   */
  async updateStatus(id: string, status: string): Promise<{ ok: boolean; error?: string }> {
    // Check dependencies if trying to start the task
    if (status === 'in_progress') {
      const deps = await safePrisma(() =>
        prisma.taskDependency.findMany({
          where: { taskId: id },
          include: { dependsOn: { select: { id: true, status: true } } },
        }),
      []);

      const uncompleted = deps.filter(
        (d: { dependsOn: { status: string } }) => d.dependsOn.status !== 'done' && d.dependsOn.status !== 'verified',
      );

      if (uncompleted.length > 0) {
        return {
          ok: false,
          error: `Cannot start: ${uncompleted.length} dependency(s) not completed`,
        };
      }
    }

    await prisma.task.update({ where: { id }, data: { status } });
    return { ok: true };
  },

  /**
   * Add a dependency to a task.
   */
  async addDependency(taskId: string, dependsOnId: string): Promise<{ ok: boolean; error?: string }> {
    if (taskId === dependsOnId) {
      return { ok: false, error: 'Cannot depend on itself' };
    }

    // Check for circular dependency
    const wouldCreateCycle = await this.wouldCreateCycle(taskId, dependsOnId);
    if (wouldCreateCycle) {
      return { ok: false, error: 'Circular dependency detected' };
    }

    try {
      await prisma.taskDependency.create({
        data: { taskId, dependsOnId },
      });
      return { ok: true };
    } catch {
      return { ok: false, error: 'Dependency already exists or creation failed' };
    }
  },

  /**
   * Remove a dependency.
   */
  async removeDependency(taskId: string, dependsOnId: string): Promise<void> {
    await prisma.taskDependency.deleteMany({
      where: { taskId, dependsOnId },
    }).catch(() => {});
  },

  /**
   * Check if adding a dependency would create a circular dependency.
   * Uses DFS to check if dependsOnId eventually depends on taskId.
   */
  async wouldCreateCycle(taskId: string, dependsOnId: string): Promise<boolean> {
    const visited = new Set<string>();
    const queue = [dependsOnId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === taskId) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      const deps = await safePrisma(() =>
        prisma.taskDependency.findMany({
          where: { taskId: current },
          select: { dependsOnId: true },
        }),
      []);

      for (const dep of deps) {
        queue.push(dep.dependsOnId);
      }
    }

    return false;
  },

  /**
   * Get subtasks for a task.
   */
  async getSubtasks(parentTaskId: string): Promise<unknown[]> {
    return safePrisma(() =>
      prisma.task.findMany({
        where: { parentTaskId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      }),
    []);
  },

  /**
   * Start a time entry for a task.
   */
  async startTimeEntry(taskId: string, userId?: string, agentRunId?: string): Promise<{ id: string }> {
    return prisma.timeEntry.create({
      data: {
        taskId,
        userId: userId || null,
        agentRunId: agentRunId || null,
        startedAt: new Date(),
      },
    });
  },

  /**
   * Stop a time entry.
   */
  async stopTimeEntry(entryId: string): Promise<void> {
    const entry = await safePrisma(() =>
      prisma.timeEntry.findUnique({ where: { id: entryId } }),
    null);

    if (!entry || entry.endedAt) return;

    const endedAt = new Date();
    const durationSec = Math.floor((endedAt.getTime() - new Date(entry.startedAt).getTime()) / 1000);

    await prisma.timeEntry.update({
      where: { id: entryId },
      data: { endedAt, durationSec },
    }).catch(() => {});
  },

  /**
   * Get time entries for a task.
   */
  async getTimeEntries(taskId: string): Promise<unknown[]> {
    return safePrisma(() =>
      prisma.timeEntry.findMany({
        where: { taskId },
        orderBy: { startedAt: 'desc' },
      }),
    []);
  },

  /**
   * Get total time spent on a task (in seconds).
   */
  async getTotalTime(taskId: string): Promise<number> {
    const entries = await safePrisma(() =>
      prisma.timeEntry.findMany({
        where: { taskId, endedAt: { not: null } },
        select: { durationSec: true },
      }),
    []);

    return entries.reduce((sum: number, e: { durationSec: number }) => sum + e.durationSec, 0);
  },

  /**
   * Get tasks that are blocked by uncompleted dependencies.
   */
  async getBlockedTasks(workspaceId: string): Promise<unknown[]> {
    const tasks = await this.list(workspaceId, { status: 'blocked' });
    return tasks;
  },

  /**
   * Delete a task (soft delete).
   */
  async delete(id: string): Promise<void> {
    await prisma.task.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'cancelled' },
    }).catch(() => {});
  },
};
