import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type MemoryFindManyArgs = {
  where: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};
type MemoryFindFirstArgs = {
  where: Record<string, unknown>;
};
type MemoryCreateArgs = { data: Record<string, unknown> };

type PlanFindUniqueArgs = { where: { id: string } };
type PlanFindManyArgs = {
  where: Record<string, unknown>;
  take?: number;
};
type PlanUpdateArgs = { where: { id: string }; data: Record<string, unknown> };

type TaskFindManyArgs = {
  where: Record<string, unknown>;
  take?: number;
  orderBy?: Record<string, unknown>;
};
type TaskFindFirstArgs = { where: Record<string, unknown> };
type TaskCreateArgs = { data: Record<string, unknown> };
type TaskUpdateArgs = { where: { id: string }; data: Record<string, unknown> };

type GoalFindUniqueArgs = { where: { id: string }; include?: Record<string, unknown> };
type GoalFindManyArgs = { where: Record<string, unknown>; take?: number };

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

// Mutable implementation functions
let memoryFindManyImpl: (args: MemoryFindManyArgs) => Promise<unknown[]> = async () => [];
let memoryFindFirstImpl: (args: MemoryFindFirstArgs) => Promise<unknown> = async () => null;
let memoryCreateImpl: (args: MemoryCreateArgs) => Promise<unknown> = async () => ({ id: 'mem-1' });

let planFindUniqueImpl: (args: PlanFindUniqueArgs) => Promise<unknown> = async () => null;
let planFindManyImpl: (args: PlanFindManyArgs) => Promise<unknown[]> = async () => [];
let planUpdateImpl: (args: PlanUpdateArgs) => Promise<unknown> = async () => ({});

let taskFindManyImpl: (args: TaskFindManyArgs) => Promise<unknown[]> = async () => [];
let taskFindFirstImpl: (args: TaskFindFirstArgs) => Promise<unknown> = async () => null;
let taskCreateImpl: (args: TaskCreateArgs) => Promise<unknown> = async () => ({ id: 'task-new' });
let taskUpdateImpl: (args: TaskUpdateArgs) => Promise<unknown> = async () => ({});

let goalFindUniqueImpl: (args: GoalFindUniqueArgs) => Promise<unknown> = async () => null;
let goalFindManyImpl: (args: GoalFindManyArgs) => Promise<unknown[]> = async () => [];

let memoryCreateCapture: ((input: Record<string, unknown>) => void) | null = null;
let eventEmitCapture: ((input: Record<string, unknown>) => void) | null = null;

const prismaMock = {
  memory: {
    findMany: (args: MemoryFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
    },
    findFirst: (args: MemoryFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'memory.findFirst', args });
      return memoryFindFirstImpl(args);
    },
    create: (args: MemoryCreateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
  },
  plan: {
    findUnique: (args: PlanFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'plan.findUnique', args });
      return planFindUniqueImpl(args);
    },
    findMany: (args: PlanFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'plan.findMany', args });
      return planFindManyImpl(args);
    },
    update: (args: PlanUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'plan.update', args });
      return planUpdateImpl(args);
    },
  },
  task: {
    findMany: (args: TaskFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'task.findMany', args });
      return taskFindManyImpl(args);
    },
    findFirst: (args: TaskFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'task.findFirst', args });
      return taskFindFirstImpl(args);
    },
    create: (args: TaskCreateArgs): Promise<unknown> => {
      calls.push({ method: 'task.create', args });
      return taskCreateImpl(args);
    },
    update: (args: TaskUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'task.update', args });
      return taskUpdateImpl(args);
    },
  },
  goal: {
    findUnique: (args: GoalFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'goal.findUnique', args });
      return goalFindUniqueImpl(args);
    },
    findMany: (args: GoalFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'goal.findMany', args });
      return goalFindManyImpl(args);
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

mock.module('@/lib/services/memory', {
  namedExports: {
    MemoryService: {
      create: async (input: Record<string, unknown>) => {
        calls.push({ method: 'MemoryService.create', args: input });
        if (memoryCreateCapture) memoryCreateCapture(input);
        return memoryCreateImpl({ data: input });
      },
      assembleContext: async () => ({ memories: [], summary: '0 memories' }),
    },
  },
});

mock.module('@/lib/services/event', {
  namedExports: {
    EventService: {
      emit: async (input: Record<string, unknown>) => {
        calls.push({ method: 'EventService.emit', args: input });
        if (eventEmitCapture) eventEmitCapture(input);
        return { id: 'evt-1' };
      },
    },
  },
});

const { LearningLoopService } = await import('@/lib/services/learning-loop');

function resetMock(): void {
  calls.length = 0;
  memoryFindManyImpl = async () => [];
  memoryFindFirstImpl = async () => null;
  memoryCreateImpl = async () => ({ id: 'mem-1' });
  planFindUniqueImpl = async () => null;
  planFindManyImpl = async () => [];
  planUpdateImpl = async () => ({});
  taskFindManyImpl = async () => [];
  taskFindFirstImpl = async () => null;
  taskCreateImpl = async () => ({ id: 'task-new' });
  taskUpdateImpl = async () => ({});
  goalFindUniqueImpl = async () => null;
  goalFindManyImpl = async () => [];
  memoryCreateCapture = null;
  eventEmitCapture = null;
}

// Helper to make memory records with tags
function makeMemory(id: string, tags: string[], content: string, sourceId?: string) {
  return {
    id,
    type: 'outcome',
    content,
    source: 'agent',
    sourceId: sourceId || null,
    confidence: 0.8,
    tags: JSON.stringify(tags),
    createdAt: new Date(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('LearningLoopService', () => {
  beforeEach(() => { resetMock(); });

  // ── evaluateOutcome ──
  describe('evaluateOutcome', () => {
    it('creates an outcome memory with correct type', async () => {
      let capturedInput: Record<string, unknown> | null = null;
      memoryCreateCapture = (input) => { capturedInput = input; };

      await LearningLoopService.evaluateOutcome('ws-1', 'org-1', {
        resourceType: 'task',
        resourceId: 'task-1',
        outcome: 'success',
      });

      assert.ok(capturedInput);
      const ci = capturedInput as Record<string, unknown>;
      assert.equal(ci.type, 'outcome');
      assert.equal(ci.source, 'agent');
      assert.equal(ci.sourceId, 'task-1');
    });

    it('emits a learning.outcome_evaluated event', async () => {
      let capturedEvent: Record<string, unknown> | null = null;
      eventEmitCapture = (input) => { capturedEvent = input; };

      await LearningLoopService.evaluateOutcome('ws-1', 'org-1', {
        resourceType: 'agent_run',
        resourceId: 'run-1',
        outcome: 'failure',
      });

      assert.ok(capturedEvent);
      const ce = capturedEvent as Record<string, unknown>;
      assert.equal(ce.type, 'learning.outcome_evaluated');
      assert.equal(ce.resourceType, 'agent_run');
      assert.equal(ce.resourceId, 'run-1');
    });

    it('includes metrics and notes in the content', async () => {
      let capturedInput: Record<string, unknown> | null = null;
      memoryCreateCapture = (input) => { capturedInput = input; };

      await LearningLoopService.evaluateOutcome('ws-1', 'org-1', {
        resourceType: 'plan',
        resourceId: 'plan-1',
        outcome: 'partial',
        metrics: { completion: 0.5 },
        notes: 'Half done',
      });

      assert.ok(capturedInput);
      const content = (capturedInput as Record<string, unknown>).content as string;
      assert.ok(content.includes('partial'));
      assert.ok(content.includes('plan-1'));
      assert.ok(content.includes('Half done'));
      assert.ok(content.includes('completion'));
    });

    it('sets higher confidence for success than failure', async () => {
      let successConf: number | null = null;
      let failureConf: number | null = null;

      memoryCreateCapture = (input) => {
        if ((input.tags as string[]).includes('success')) successConf = input.confidence as number;
        if ((input.tags as string[]).includes('failure')) failureConf = input.confidence as number;
      };

      await LearningLoopService.evaluateOutcome('ws-1', 'org-1', {
        resourceType: 'task', resourceId: 't1', outcome: 'success',
      });
      await LearningLoopService.evaluateOutcome('ws-1', 'org-1', {
        resourceType: 'task', resourceId: 't2', outcome: 'failure',
      });

      assert.ok(successConf !== null);
      assert.ok(failureConf !== null);
      assert.ok(successConf! > failureConf!);
    });

    it('returns the created memory record', async () => {
      memoryCreateImpl = async () => ({ id: 'mem-123', type: 'outcome' });

      const result = await LearningLoopService.evaluateOutcome('ws-1', 'org-1', {
        resourceType: 'task', resourceId: 't1', outcome: 'success',
      });

      assert.ok(result);
      assert.equal((result as { id: string }).id, 'mem-123');
    });
  });

  // ── extractInsights ──
  describe('extractInsights', () => {
    it('returns empty array when no outcomes exist', async () => {
      memoryFindManyImpl = async () => [];

      const insights = await LearningLoopService.extractInsights('ws-1', 'org-1');

      assert.deepEqual(insights, []);
    });

    it('groups outcomes by resource type and outcome', async () => {
      memoryFindManyImpl = async () => [
        makeMemory('m1', ['task', 'success'], 'success for task t1', 't1'),
        makeMemory('m2', ['task', 'success'], 'success for task t2', 't2'),
        makeMemory('m3', ['task', 'failure'], 'failure for task t3', 't3'),
        makeMemory('m4', ['task', 'failure'], 'failure for task t4', 't4'),
        makeMemory('m5', ['task', 'failure'], 'failure for task t5', 't5'),
      ];

      const insights = await LearningLoopService.extractInsights('ws-1', 'org-1');

      assert.ok(insights.length > 0);
      const failureInsight = insights.find((i) => i.insight.includes('failure'));
      assert.ok(failureInsight, 'should find a failure pattern insight');
      assert.ok(failureInsight!.confidence > 0.5);
    });

    it('identifies success patterns with high confidence', async () => {
      memoryFindManyImpl = async () => [
        makeMemory('m1', ['task', 'success'], 'success', 't1'),
        makeMemory('m2', ['task', 'success'], 'success', 't2'),
        makeMemory('m3', ['task', 'success'], 'success', 't3'),
        makeMemory('m4', ['task', 'success'], 'success', 't4'),
        makeMemory('m5', ['task', 'failure'], 'failure', 't5'),
      ];

      const insights = await LearningLoopService.extractInsights('ws-1', 'org-1');

      const successInsight = insights.find((i) => i.insight.includes('success'));
      assert.ok(successInsight);
      assert.ok(successInsight!.confidence >= 0.7);
    });

    it('skips patterns with fewer than 3 samples', async () => {
      memoryFindManyImpl = async () => [
        makeMemory('m1', ['task', 'failure'], 'failure', 't1'),
        makeMemory('m2', ['task', 'failure'], 'failure', 't2'),
      ];

      const insights = await LearningLoopService.extractInsights('ws-1', 'org-1');

      assert.equal(insights.length, 0);
    });

    it('includes evidence and recommendation in insights', async () => {
      memoryFindManyImpl = async () => [
        makeMemory('m1', ['task', 'failure'], 'failure for task t1', 't1'),
        makeMemory('m2', ['task', 'failure'], 'failure for task t2', 't2'),
        makeMemory('m3', ['task', 'failure'], 'failure for task t3', 't3'),
        makeMemory('m4', ['task', 'failure'], 'failure for task t4', 't4'),
      ];

      const insights = await LearningLoopService.extractInsights('ws-1', 'org-1');

      assert.ok(insights.length > 0);
      assert.ok(insights[0].evidence.length > 0);
      assert.ok(insights[0].recommendation.length > 0);
    });
  });

  // ── updatePlanFromLearning ──
  describe('updatePlanFromLearning', () => {
    it('returns null when plan not found', async () => {
      planFindUniqueImpl = async () => null;

      const result = await LearningLoopService.updatePlanFromLearning('ws-1', 'nope');

      assert.equal(result, null);
    });

    it('marks plan as completed when all tasks succeeded', async () => {
      planFindUniqueImpl = async () => ({
        id: 'plan-1', title: 'Test Plan', status: 'active',
        organizationId: 'org-1', objective: 'Test',
      });
      taskFindManyImpl = async () => [
        { id: 't1', projectId: 'p1', title: 'Task 1' },
        { id: 't2', projectId: 'p1', title: 'Task 2' },
      ];
      memoryFindManyImpl = async () => [
        makeMemory('m1', ['task', 'success'], 'success for t1', 't1'),
        makeMemory('m2', ['task', 'success'], 'success for t2', 't2'),
      ];

      let updatedStatus: string | null = null;
      planUpdateImpl = async (args) => {
        updatedStatus = args.data.status as string;
        return { id: 'plan-1', status: args.data.status };
      };

      const result = await LearningLoopService.updatePlanFromLearning('ws-1', 'plan-1');

      assert.ok(result);
      assert.equal((result as { status: string }).status, 'completed');
      assert.equal(updatedStatus, 'completed');
    });

    it('marks plan as at_risk when success rate is below 50%', async () => {
      planFindUniqueImpl = async () => ({
        id: 'plan-1', title: 'Test Plan', status: 'active',
        organizationId: 'org-1', objective: 'Test',
      });
      taskFindManyImpl = async () => [
        { id: 't1', projectId: 'p1', title: 'Task 1' },
        { id: 't2', projectId: 'p1', title: 'Task 2' },
        { id: 't3', projectId: 'p1', title: 'Task 3' },
        { id: 't4', projectId: 'p1', title: 'Task 4' },
      ];
      memoryFindManyImpl = async () => [
        makeMemory('m1', ['task', 'success'], 'success for t1', 't1'),
        makeMemory('m2', ['task', 'failure'], 'failure for t2', 't2'),
        makeMemory('m3', ['task', 'failure'], 'failure for t3', 't3'),
        makeMemory('m4', ['task', 'failure'], 'failure for t4', 't4'),
      ];

      let updatedStatus: string | null = null;
      planUpdateImpl = async (args) => {
        updatedStatus = args.data.status as string;
        return { id: 'plan-1', status: args.data.status };
      };

      const result = await LearningLoopService.updatePlanFromLearning('ws-1', 'plan-1');

      assert.ok(result);
      assert.equal((result as { status: string }).status, 'at_risk');
      assert.equal(updatedStatus, 'at_risk');
    });

    it('creates adjustment tasks for failed tasks when at risk', async () => {
      planFindUniqueImpl = async () => ({
        id: 'plan-1', title: 'Test Plan', status: 'active',
        organizationId: 'org-1', objective: 'Test',
      });
      taskFindManyImpl = async () => [
        { id: 't1', projectId: 'p1', title: 'Task 1' },
        { id: 't2', projectId: 'p1', title: 'Task 2' },
        { id: 't3', projectId: 'p1', title: 'Task 3' },
      ];
      memoryFindManyImpl = async () => [
        makeMemory('m1', ['task', 'failure'], 'failure for t1', 't1'),
        makeMemory('m2', ['task', 'failure'], 'failure for t2', 't2'),
        makeMemory('m3', ['task', 'failure'], 'failure for t3', 't3'),
      ];

      let tasksCreated = 0;
      taskCreateImpl = async () => { tasksCreated++; return { id: `adj-${tasksCreated}` }; };
      taskFindFirstImpl = async () => null; // no existing adjustment tasks

      const result = await LearningLoopService.updatePlanFromLearning('ws-1', 'plan-1');

      assert.ok(result);
      assert.equal((result as { adjustmentTasksCreated: number }).adjustmentTasksCreated, 3);
      assert.equal(tasksCreated, 3);
    });

    it('does not create duplicate adjustment tasks', async () => {
      planFindUniqueImpl = async () => ({
        id: 'plan-1', title: 'Test Plan', status: 'active',
        organizationId: 'org-1', objective: 'Test',
      });
      taskFindManyImpl = async () => [
        { id: 't1', projectId: 'p1', title: 'Task 1' },
        { id: 't2', projectId: 'p1', title: 'Task 2' },
        { id: 't3', projectId: 'p1', title: 'Task 3' },
      ];
      memoryFindManyImpl = async () => [
        makeMemory('m1', ['task', 'failure'], 'failure for t1', 't1'),
        makeMemory('m2', ['task', 'failure'], 'failure for t2', 't2'),
        makeMemory('m3', ['task', 'failure'], 'failure for t3', 't3'),
      ];

      let tasksCreated = 0;
      taskCreateImpl = async () => { tasksCreated++; return { id: `adj-${tasksCreated}` }; };
      // Simulate existing adjustment task for t1
      taskFindFirstImpl = async (args) => {
        const titleFilter = (args.where.title as { contains?: string })?.contains;
        if (titleFilter && args.where.parentTaskId === 't1') return { id: 'existing-adj' };
        return null;
      };

      const result = await LearningLoopService.updatePlanFromLearning('ws-1', 'plan-1');

      assert.ok(result);
      // Only 2 new tasks should be created (t2 and t3, since t1 already has one)
      assert.equal((result as { adjustmentTasksCreated: number }).adjustmentTasksCreated, 2);
    });
  });

  // ── reprioritizeTasks ──
  describe('reprioritizeTasks', () => {
    it('returns empty summary when no tasks to reprioritize', async () => {
      taskFindManyImpl = async () => [];

      const result = await LearningLoopService.reprioritizeTasks('ws-1');

      assert.equal(result.total, 0);
      assert.equal(result.boosted.length, 0);
      assert.equal(result.lowered.length, 0);
    });

    it('boosts priority of tasks matching success patterns', async () => {
      taskFindManyImpl = async () => [
        { id: 't1', title: 'marketing campaign', description: 'create content', priority: 'medium', status: 'todo' },
      ];
      memoryFindManyImpl = async () => [
        makeMemory('m1', ['task', 'success'], 'marketing campaign success', 't-old-1'),
        makeMemory('m2', ['task', 'success'], 'marketing campaign success', 't-old-2'),
        makeMemory('m3', ['task', 'success'], 'marketing campaign success', 't-old-3'),
      ];

      let updatedPriority: string | null = null;
      taskUpdateImpl = async (args) => {
        updatedPriority = args.data.priority as string;
        return { id: 't1', priority: args.data.priority };
      };

      const result = await LearningLoopService.reprioritizeTasks('ws-1');

      assert.ok(result.boosted.length > 0);
      assert.equal(result.boosted[0].newPriority, 'high');
      assert.equal(updatedPriority, 'high');
    });

    it('lowers priority of tasks matching failure patterns', async () => {
      taskFindManyImpl = async () => [
        { id: 't1', title: 'research investigation', description: 'deep dive', priority: 'high', status: 'todo' },
      ];
      memoryFindManyImpl = async () => [
        makeMemory('m1', ['task', 'failure'], 'research investigation failure', 't-old-1'),
        makeMemory('m2', ['task', 'failure'], 'research investigation failure', 't-old-2'),
        makeMemory('m3', ['task', 'failure'], 'research investigation failure', 't-old-3'),
      ];

      let updatedPriority: string | null = null;
      taskUpdateImpl = async (args) => {
        updatedPriority = args.data.priority as string;
        return { id: 't1', priority: args.data.priority };
      };

      const result = await LearningLoopService.reprioritizeTasks('ws-1');

      assert.ok(result.lowered.length > 0);
      assert.equal(result.lowered[0].newPriority, 'medium');
      assert.equal(updatedPriority, 'medium');
    });
  });

  // ── adjustGoalTargets ──
  describe('adjustGoalTargets', () => {
    it('returns null when goal not found', async () => {
      goalFindUniqueImpl = async () => null;

      const result = await LearningLoopService.adjustGoalTargets('ws-1', 'org-1', 'nope');

      assert.equal(result, null);
    });

    it('returns no_change when no KPIs defined', async () => {
      goalFindUniqueImpl = async () => ({
        id: 'g1', title: 'Goal', status: 'active', workspaceId: null, kpis: [],
      });

      const result = await LearningLoopService.adjustGoalTargets('ws-1', 'org-1', 'g1');

      assert.ok(result);
      assert.equal(result!.action, 'no_change');
    });

    it('suggests raising target when significantly ahead', async () => {
      goalFindUniqueImpl = async () => ({
        id: 'g1', title: 'Goal', status: 'active', workspaceId: null,
        kpis: [{ name: 'Revenue', target: 100, current: 150, direction: 'up' }],
      });

      const result = await LearningLoopService.adjustGoalTargets('ws-1', 'org-1', 'g1');

      assert.ok(result);
      assert.equal(result!.action, 'raise_target');
      assert.ok(result!.suggestedTarget);
      assert.ok(result!.suggestedTarget! > 100);
    });

    it('suggests lowering target when significantly behind', async () => {
      goalFindUniqueImpl = async () => ({
        id: 'g1', title: 'Goal', status: 'active', workspaceId: null,
        kpis: [{ name: 'Revenue', target: 100, current: 35, direction: 'up' }],
      });

      const result = await LearningLoopService.adjustGoalTargets('ws-1', 'org-1', 'g1');

      assert.ok(result);
      assert.equal(result!.action, 'lower_target');
    });

    it('suggests breaking down when very far behind', async () => {
      goalFindUniqueImpl = async () => ({
        id: 'g1', title: 'Goal', status: 'active', workspaceId: null,
        kpis: [{ name: 'Revenue', target: 100, current: 10, direction: 'up' }],
      });

      const result = await LearningLoopService.adjustGoalTargets('ws-1', 'org-1', 'g1');

      assert.ok(result);
      assert.equal(result!.action, 'break_down');
    });

    it('records a lesson memory with the suggestion', async () => {
      let capturedInput: Record<string, unknown> | null = null;
      memoryCreateCapture = (input) => { capturedInput = input; };

      goalFindUniqueImpl = async () => ({
        id: 'g1', title: 'Goal', status: 'active', workspaceId: null,
        kpis: [{ name: 'Revenue', target: 100, current: 150, direction: 'up' }],
      });

      await LearningLoopService.adjustGoalTargets('ws-1', 'org-1', 'g1');

      assert.ok(capturedInput);
      const ci = capturedInput as Record<string, unknown>;
      assert.equal(ci.type, 'lesson');
      assert.ok((ci.content as string).includes('raise_target'));
    });
  });

  // ── runLearningCycle ──
  describe('runLearningCycle', () => {
    it('evaluates unevaluated completed tasks', async () => {
      taskFindManyImpl = async () => [
        { id: 't1', status: 'done', title: 'Task 1' },
        { id: 't2', status: 'failed', title: 'Task 2' },
      ];
      memoryFindFirstImpl = async () => null; // no existing outcome
      planFindManyImpl = async () => [];
      goalFindManyImpl = async () => [];

      const summary = await LearningLoopService.runLearningCycle('ws-1', 'org-1');

      assert.equal(summary.evaluated, 2);
    });

    it('skips already-evaluated tasks', async () => {
      taskFindManyImpl = async () => [
        { id: 't1', status: 'done', title: 'Task 1' },
      ];
      memoryFindFirstImpl = async () => ({ id: 'existing-mem' }); // already evaluated
      planFindManyImpl = async () => [];
      goalFindManyImpl = async () => [];

      const summary = await LearningLoopService.runLearningCycle('ws-1', 'org-1');

      assert.equal(summary.evaluated, 0);
    });

    it('emits a learning.cycle_completed event', async () => {
      let emittedType: string | null = null;
      eventEmitCapture = (input) => { emittedType = input.type as string; };

      taskFindManyImpl = async () => [];
      planFindManyImpl = async () => [];
      goalFindManyImpl = async () => [];

      await LearningLoopService.runLearningCycle('ws-1', 'org-1');

      assert.equal(emittedType, 'learning.cycle_completed');
    });

    it('records a summary memory of the cycle', async () => {
      let summaryMemory: Record<string, unknown> | null = null;
      memoryCreateImpl = async (args) => {
        const content = (args.data as { content?: string })?.content || '';
        if (content.includes('Learning cycle completed')) {
          summaryMemory = args.data;
        }
        return { id: 'mem-cycle' };
      };

      taskFindManyImpl = async () => [];
      planFindManyImpl = async () => [];
      goalFindManyImpl = async () => [];

      await LearningLoopService.runLearningCycle('ws-1', 'org-1');

      assert.ok(summaryMemory);
      assert.equal((summaryMemory as { type: string }).type, 'lesson');
    });

    it('returns a complete cycle summary', async () => {
      taskFindManyImpl = async () => [];
      planFindManyImpl = async () => [];
      goalFindManyImpl = async () => [];

      const summary = await LearningLoopService.runLearningCycle('ws-1', 'org-1');

      assert.ok(typeof summary.evaluated === 'number');
      assert.ok(Array.isArray(summary.insights));
      assert.ok(typeof summary.plansUpdated === 'number');
      assert.ok(typeof summary.tasksReprioritized === 'number');
      assert.ok(typeof summary.goalsAdjusted === 'number');
    });
  });

  // ── getLearningDashboard ──
  describe('getLearningDashboard', () => {
    it('returns dashboard data with all sections', async () => {
      memoryFindManyImpl = async (args) => {
        const type = (args.where as { type?: string }).type;
        if (type === 'outcome') {
          return [makeMemory('m1', ['task', 'success'], 'success', 't1')];
        }
        // lesson with cycle_summary tag
        return [{
          id: 'h1', type: 'lesson', content: 'Cycle done',
          tags: JSON.stringify(['cycle_summary']), createdAt: new Date(),
        }];
      };
      planFindManyImpl = async () => [];

      const dashboard = await LearningLoopService.getLearningDashboard('ws-1', 'org-1');

      assert.ok(dashboard.recentOutcomes);
      assert.ok(dashboard.topInsights);
      assert.ok(dashboard.atRiskPlans);
      assert.ok(dashboard.cycleHistory);
      assert.ok(dashboard.recommendations);
      assert.ok(dashboard.stats);
    });

    it('computes success rate from recent outcomes', async () => {
      memoryFindManyImpl = async (args) => {
        if ((args.where as { type?: string }).type === 'outcome') {
          return [
            makeMemory('m1', ['task', 'success'], 'success', 't1'),
            makeMemory('m2', ['task', 'success'], 'success', 't2'),
            makeMemory('m3', ['task', 'failure'], 'failure', 't3'),
          ];
        }
        return [];
      };
      planFindManyImpl = async () => [];

      const dashboard = await LearningLoopService.getLearningDashboard('ws-1', 'org-1');

      assert.equal(dashboard.stats.totalOutcomes, 3);
      assert.ok(dashboard.stats.successRate > 0.6);
      assert.ok(dashboard.stats.successRate < 0.7);
    });
  });

  // ── getLearningHistory ──
  describe('getLearningHistory', () => {
    it('returns cycle history memories', async () => {
      memoryFindManyImpl = async () => [
        { id: 'h1', content: 'Cycle 1', createdAt: new Date(), tags: JSON.stringify(['cycle_summary']) },
        { id: 'h2', content: 'Cycle 2', createdAt: new Date(), tags: JSON.stringify(['cycle_summary']) },
      ];

      const history = await LearningLoopService.getLearningHistory('ws-1', 10);

      assert.equal(history.length, 2);
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('DB down'); };

      const history = await LearningLoopService.getLearningHistory('ws-1');

      assert.deepEqual(history, []);
    });
  });

  // ── getRecommendations ──
  describe('getRecommendations', () => {
    it('returns recommendations derived from insights', async () => {
      memoryFindManyImpl = async () => [
        makeMemory('m1', ['task', 'failure'], 'failure', 't1'),
        makeMemory('m2', ['task', 'failure'], 'failure', 't2'),
        makeMemory('m3', ['task', 'failure'], 'failure', 't3'),
        makeMemory('m4', ['task', 'failure'], 'failure', 't4'),
      ];

      const recs = await LearningLoopService.getRecommendations('ws-1', 'org-1');

      assert.ok(recs.length > 0);
      assert.ok(recs[0].recommendation.length > 0);
      assert.ok(recs[0].insight.length > 0);
    });

    it('returns empty array when no insights available', async () => {
      memoryFindManyImpl = async () => [];

      const recs = await LearningLoopService.getRecommendations('ws-1', 'org-1');

      assert.deepEqual(recs, []);
    });
  });
});
