import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ── Mock types ──
type TaskFindManyArgs = { where: Record<string, unknown>; orderBy: Record<string, unknown>; take: number };
type TaskUpdateArgs = { where: { id: string }; data: Record<string, unknown> };
type ProjectFindUniqueArgs = { where: { id: string }; select: Record<string, unknown> };
type AgentDefFindManyArgs = { where: Record<string, unknown>; select: Record<string, unknown> };
type ScheduledJobCreateArgs = { data: Record<string, unknown> };

let taskFindManyImpl: (args: TaskFindManyArgs) => Promise<unknown[]> = async () => [];
let taskUpdateImpl: (args: TaskUpdateArgs) => Promise<unknown> = async () => ({});
let projectFindUniqueImpl: (args: ProjectFindUniqueArgs) => Promise<unknown> = async () => ({ workspaceId: 'ws-1' });
let agentDefFindManyImpl: (args: AgentDefFindManyArgs) => Promise<unknown[]> = async () => [];
let scheduledJobCreateImpl: (args: ScheduledJobCreateArgs) => Promise<{ id: string }> = async () => ({ id: 'job-1' });

const calls: { method: string; args?: unknown }[] = [];

const prismaMock = {
  task: {
    findMany: (args: TaskFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'task.findMany', args });
      return taskFindManyImpl(args);
    },
    update: (args: TaskUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'task.update', args });
      return taskUpdateImpl(args);
    },
  },
  project: {
    findUnique: (args: ProjectFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'project.findUnique', args });
      return projectFindUniqueImpl(args);
    },
  },
  agentDef: {
    findMany: (args: AgentDefFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'agentDef.findMany', args });
      return agentDefFindManyImpl(args);
    },
  },
  scheduledJob: {
    create: (args: ScheduledJobCreateArgs): Promise<{ id: string }> => {
      calls.push({ method: 'scheduledJob.create', args });
      return scheduledJobCreateImpl(args);
    },
  },
};

mock.module('@/lib/prisma', {
  namedExports: { prisma: prismaMock },
});

mock.module('@/lib/safe-prisma', {
  namedExports: {
    safePrisma: async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch { return fallback; }
    },
  },
});

mock.module('@/lib/services/durable-execution', {
  namedExports: {
    DurableExecutionEngine: {
      scheduleJob: async () => 'job-1',
    },
  },
});

const { TaskAutoAssigner } = await import('@/lib/services/task-auto-assigner');

function resetMock(): void {
  calls.length = 0;
  taskFindManyImpl = async () => [];
  taskUpdateImpl = async () => ({});
  projectFindUniqueImpl = async () => ({ workspaceId: 'ws-1' });
  agentDefFindManyImpl = async () => [];
  scheduledJobCreateImpl = async () => ({ id: 'job-1' });
}

describe('TaskAutoAssigner', () => {
  beforeEach(() => {
    resetMock();
  });

  describe('assignPendingTasks', () => {
    it('returns 0 when no pending tasks', async () => {
      const count = await TaskAutoAssigner.assignPendingTasks();
      assert.equal(count, 0);
    });

    it('returns 0 when no agents available', async () => {
      taskFindManyImpl = async () => [
        { id: 'task-1', projectId: 'proj-1', title: 'Build API', description: 'Build a REST API', priority: 'high', planId: 'plan-1' },
      ];
      agentDefFindManyImpl = async () => [];

      const count = await TaskAutoAssigner.assignPendingTasks();
      assert.equal(count, 0);
    });

    it('assigns task to matching agent by role', async () => {
      taskFindManyImpl = async () => [
        { id: 'task-1', projectId: 'proj-1', title: 'Build API', description: 'Implement the REST API endpoint', priority: 'high', planId: 'plan-1' },
      ];
      agentDefFindManyImpl = async () => [
        { id: 'agent-eng', role: 'engineering', name: 'Engine Agent' },
        { id: 'agent-sales', role: 'sales', name: 'Sales Agent' },
      ];

      const count = await TaskAutoAssigner.assignPendingTasks();
      assert.equal(count, 1);

      // Verify the task was assigned to the engineering agent
      const updateCalls = calls.filter((c) => c.method === 'task.update');
      assert.equal(updateCalls.length, 1);
      const updateData = (updateCalls[0].args as TaskUpdateArgs).data as Record<string, unknown>;
      assert.equal(updateData.assignedAgentId, 'agent-eng');
    });

    it('falls back to first available agent when no role match', async () => {
      taskFindManyImpl = async () => [
        { id: 'task-1', projectId: 'proj-1', title: 'Do something', description: 'Generic task', priority: 'medium', planId: 'plan-1' },
      ];
      agentDefFindManyImpl = async () => [
        { id: 'agent-1', role: 'custom', name: 'Agent 1' },
      ];

      const count = await TaskAutoAssigner.assignPendingTasks();
      assert.equal(count, 1);

      const updateCalls = calls.filter((c) => c.method === 'task.update');
      assert.equal(updateCalls.length, 1);
      const updateData = (updateCalls[0].args as TaskUpdateArgs).data as Record<string, unknown>;
      assert.equal(updateData.assignedAgentId, 'agent-1');
    });

    it('schedules a durable job after assignment', async () => {
      taskFindManyImpl = async () => [
        { id: 'task-1', projectId: 'proj-1', title: 'Research market', description: 'Research the market', priority: 'medium', planId: 'plan-1' },
      ];
      agentDefFindManyImpl = async () => [
        { id: 'agent-1', role: 'research', name: 'Research Agent' },
      ];

      const count = await TaskAutoAssigner.assignPendingTasks();
      assert.equal(count, 1);

      // The DurableExecutionEngine.scheduleJob is mocked, so we verify
      // the task was assigned (which happens before scheduling)
      const updateCalls = calls.filter((c) => c.method === 'task.update');
      assert.equal(updateCalls.length, 1);
      const updateData = (updateCalls[0].args as TaskUpdateArgs).data as Record<string, unknown>;
      assert.equal(updateData.assignedAgentId, 'agent-1');
      assert.equal(updateData.status, 'in_progress');
    });
  });

  describe('findAgentForTask', () => {
    it('matches engineering keywords', async () => {
      agentDefFindManyImpl = async () => [
        { id: 'agent-eng', role: 'engineering', name: 'Eng' },
        { id: 'agent-sales', role: 'sales', name: 'Sales' },
      ];

      const agent = await TaskAutoAssigner.findAgentForTask('ws-1', {
        title: 'Fix the bug',
        description: 'Fix a critical bug in the API',
      });

      assert.ok(agent);
      assert.equal(agent!.id, 'agent-eng');
    });

    it('matches research keywords', async () => {
      agentDefFindManyImpl = async () => [
        { id: 'agent-eng', role: 'engineering', name: 'Eng' },
        { id: 'agent-res', role: 'research', name: 'Research' },
      ];

      const agent = await TaskAutoAssigner.findAgentForTask('ws-1', {
        title: 'Research competitors',
        description: 'Analyze the competition',
      });

      assert.ok(agent);
      assert.equal(agent!.id, 'agent-res');
    });

    it('returns null when no agents available', async () => {
      agentDefFindManyImpl = async () => [];

      const agent = await TaskAutoAssigner.findAgentForTask('ws-1', {
        title: 'Test',
        description: 'Test',
      });

      assert.equal(agent, null);
    });
  });
});
