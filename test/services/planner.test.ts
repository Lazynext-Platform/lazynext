import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ── Mock types ──
type GoalFindUniqueArgs = { where: { id: string }; select: Record<string, unknown> };
type ProjectFindFirstArgs = { where: Record<string, unknown>; select: Record<string, unknown> };
type ProjectCreateArgs = { data: Record<string, unknown> };
type TaskCreateArgs = { data: Record<string, unknown> };
type MembershipFindFirstArgs = { where: Record<string, unknown>; select: Record<string, unknown> };

let goalFindUniqueImpl: (args: GoalFindUniqueArgs) => Promise<unknown> = async () => null;
let projectFindFirstImpl: (args: ProjectFindFirstArgs) => Promise<unknown> = async () => ({ id: 'proj-1' });
let projectCreateImpl: (args: ProjectCreateArgs) => Promise<unknown> = async () => ({ id: 'proj-1' });
let taskCreateImpl: (args: TaskCreateArgs) => Promise<unknown> = async () => ({ id: 'task-1' });
let membershipFindFirstImpl: (args: MembershipFindFirstArgs) => Promise<unknown> = async () => ({ userId: 'user-1' });
let atlasChatImpl: (messages: unknown[], model?: string, maxTokens?: number, timeoutMs?: number) => Promise<string> =
  async () => '{"title":"Test Plan","reasoning":"Because","priority":"medium","riskLevel":"low","estimatedCost":10,"tasks":[{"title":"Task 1","description":"Do thing 1","priority":"high","estimatedCost":5,"riskLevel":"low","agentRole":"engineering"}]}';

const calls: { method: string; args?: unknown }[] = [];

const prismaMock = {
  goal: {
    findUnique: (args: GoalFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'goal.findUnique', args });
      return goalFindUniqueImpl(args);
    },
  },
  project: {
    findFirst: (args: ProjectFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'project.findFirst', args });
      return projectFindFirstImpl(args);
    },
    create: (args: ProjectCreateArgs): Promise<unknown> => {
      calls.push({ method: 'project.create', args });
      return projectCreateImpl(args);
    },
  },
  task: {
    create: (args: TaskCreateArgs): Promise<unknown> => {
      calls.push({ method: 'task.create', args });
      return taskCreateImpl(args);
    },
  },
  membership: {
    findFirst: (args: MembershipFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'membership.findFirst', args });
      return membershipFindFirstImpl(args);
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

mock.module('@/lib/atlas', {
  namedExports: {
    atlasChat: (messages: unknown[], model?: string, maxTokens?: number, timeoutMs?: number): Promise<string> => {
      calls.push({ method: 'atlasChat' });
      return atlasChatImpl(messages, model, maxTokens, timeoutMs);
    },
    DEFAULT_CHAT_MODEL: 'test-model',
  },
});

mock.module('@/lib/services/plan', {
  namedExports: {
    PlanService: {
      create: async (input: Record<string, unknown>) => {
        calls.push({ method: 'PlanService.create', args: input });
        return { id: 'plan-1', ...input };
      },
    },
  },
});

mock.module('@/lib/services/memory', {
  namedExports: {
    MemoryService: {
      assembleContext: async () => ({ memories: [], summary: '0 memories' }),
      create: async () => ({ id: 'mem-1' }),
    },
  },
});

mock.module('@/lib/services/event', {
  namedExports: {
    EventService: {
      emit: async () => ({ id: 'evt-1' }),
    },
  },
});

const { Planner } = await import('@/lib/services/planner');

function resetMock(): void {
  calls.length = 0;
  goalFindUniqueImpl = async () => null;
  projectFindFirstImpl = async () => ({ id: 'proj-1' });
  projectCreateImpl = async () => ({ id: 'proj-1' });
  taskCreateImpl = async () => ({ id: 'task-1' });
  membershipFindFirstImpl = async () => ({ userId: 'user-1' });
  atlasChatImpl = async () => '{"title":"Test Plan","reasoning":"Because","priority":"medium","riskLevel":"low","estimatedCost":10,"tasks":[{"title":"Task 1","description":"Do thing 1","priority":"high","estimatedCost":5,"riskLevel":"low","agentRole":"engineering"}]}';
}

describe('Planner', () => {
  beforeEach(() => {
    resetMock();
  });

  describe('plan', () => {
    it('creates a plan with tasks from LLM response', async () => {
      const result = await Planner.plan({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        objective: 'Launch a new product',
        createdById: 'user-1',
      });

      assert.equal(result.planId, 'plan-1');
      assert.equal(result.title, 'Test Plan');
      assert.equal(result.reasoning, 'Because');
      assert.equal(result.estimatedCost, 10);
      assert.equal(result.tasks.length, 1);
      assert.equal(result.tasks[0].title, 'Task 1');
      assert.equal(result.tasks[0].agentRole, 'engineering');

      // Verify PlanService.create was called
      const planCreateCalls = calls.filter((c) => c.method === 'PlanService.create');
      assert.equal(planCreateCalls.length, 1);

      // Verify task.create was called for each task
      const taskCreateCalls = calls.filter((c) => c.method === 'task.create');
      assert.equal(taskCreateCalls.length, 1);
    });

    it('loads goal when goalId is provided', async () => {
      goalFindUniqueImpl = async () => ({ title: 'Goal Title', description: 'Goal description' });

      await Planner.plan({
        workspaceId: 'ws-1',
        organizationId: 'org-1',
        goalId: 'goal-1',
        objective: 'Achieve the goal',
      });

      const goalCalls = calls.filter((c) => c.method === 'goal.findUnique');
      assert.equal(goalCalls.length, 1);
    });
  });

  describe('parsePlan', () => {
    it('parses valid JSON plan', () => {
      const response = `{"title":"My Plan","reasoning":"Because","priority":"high","riskLevel":"medium","estimatedCost":50,"tasks":[{"title":"Task A","description":"Do A","priority":"high","estimatedCost":10,"riskLevel":"low"}]}`;
      const parsed = Planner.parsePlan(response);

      assert.equal(parsed.title, 'My Plan');
      assert.equal(parsed.priority, 'high');
      assert.equal(parsed.riskLevel, 'medium');
      assert.equal(parsed.estimatedCost, 50);
      assert.equal(parsed.tasks.length, 1);
      assert.equal(parsed.tasks[0].title, 'Task A');
    });

    it('falls back to heuristic parsing for non-JSON response', () => {
      const response = 'Just do the thing and then do the other thing.';
      const parsed = Planner.parsePlan(response);

      assert.ok(parsed.title);
      assert.equal(parsed.tasks.length, 1);
      assert.ok(parsed.tasks[0].description);
    });

    it('handles malformed JSON gracefully', () => {
      const response = '{invalid json}';
      const parsed = Planner.parsePlan(response);

      assert.ok(parsed.title);
      assert.equal(parsed.tasks.length, 1);
    });

    it('handles empty tasks array', () => {
      const response = '{"title":"Empty Plan","reasoning":"No tasks","tasks":[]}';
      const parsed = Planner.parsePlan(response);

      assert.equal(parsed.title, 'Empty Plan');
      assert.equal(parsed.tasks.length, 0);
    });
  });
});
