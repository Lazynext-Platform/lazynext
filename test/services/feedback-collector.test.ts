import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type TaskFindUniqueArgs = { where: { id: string } };
type TaskFindManyArgs = { where: Record<string, unknown>; orderBy?: Record<string, unknown>; take?: number };

type AgentRunFindUniqueArgs = { where: { id: string } };

type KpiFindManyArgs = { where: Record<string, unknown> };

type CreativePerfFindManyArgs = {
  where: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let taskFindUniqueImpl: (args: TaskFindUniqueArgs) => Promise<unknown> = async () => null;
let taskFindManyImpl: (args: TaskFindManyArgs) => Promise<unknown[]> = async () => [];

let agentRunFindUniqueImpl: (args: AgentRunFindUniqueArgs) => Promise<unknown> = async () => null;

let kpiFindManyImpl: (args: KpiFindManyArgs) => Promise<unknown[]> = async () => [];

let creativePerfFindManyImpl: (args: CreativePerfFindManyArgs) => Promise<unknown[]> = async () => [];

const prismaMock = {
  task: {
    findUnique: (args: TaskFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'task.findUnique', args });
      return taskFindUniqueImpl(args);
    },
    findMany: (args: TaskFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'task.findMany', args });
      return taskFindManyImpl(args);
    },
  },
  agentRun: {
    findUnique: (args: AgentRunFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'agentRun.findUnique', args });
      return agentRunFindUniqueImpl(args);
    },
  },
  kpi: {
    findMany: (args: KpiFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'kpi.findMany', args });
      return kpiFindManyImpl(args);
    },
  },
  creativePerformance: {
    findMany: (args: CreativePerfFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'creativePerformance.findMany', args });
      return creativePerfFindManyImpl(args);
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

const { FeedbackCollector } = await import('@/lib/services/feedback-collector');

function resetMock(): void {
  calls.length = 0;
  taskFindUniqueImpl = async () => null;
  taskFindManyImpl = async () => [];
  agentRunFindUniqueImpl = async () => null;
  kpiFindManyImpl = async () => [];
  creativePerfFindManyImpl = async () => [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('FeedbackCollector', () => {
  beforeEach(() => { resetMock(); });

  // ── collectFromTaskCompletion ──
  describe('collectFromTaskCompletion', () => {
    it('returns null when task not found', async () => {
      taskFindUniqueImpl = async () => null;

      const result = await FeedbackCollector.collectFromTaskCompletion('ws-1', 'nope');

      assert.equal(result, null);
    });

    it('returns null for tasks still in progress', async () => {
      taskFindUniqueImpl = async () => ({
        id: 't1', status: 'in_progress', title: 'Task 1',
        retryCount: 0, riskLevel: 'low', estimatedCost: 0, verification: null,
      });

      const result = await FeedbackCollector.collectFromTaskCompletion('ws-1', 't1');

      assert.equal(result, null);
    });

    it('returns positive feedback for completed tasks', async () => {
      taskFindUniqueImpl = async () => ({
        id: 't1', status: 'done', title: 'Task 1',
        retryCount: 0, riskLevel: 'low', estimatedCost: 10, verification: null,
      });

      const result = await FeedbackCollector.collectFromTaskCompletion('ws-1', 't1');

      assert.ok(result);
      assert.equal(result!.source, 'task');
      assert.equal(result!.sourceId, 't1');
      assert.equal(result!.rating, 'positive');
      assert.ok(result!.score >= 0.7);
    });

    it('returns negative feedback for failed tasks', async () => {
      taskFindUniqueImpl = async () => ({
        id: 't1', status: 'failed', title: 'Task 1',
        retryCount: 2, riskLevel: 'high', estimatedCost: 10, verification: null,
      });

      const result = await FeedbackCollector.collectFromTaskCompletion('ws-1', 't1');

      assert.ok(result);
      assert.equal(result!.rating, 'negative');
      assert.ok(result!.score < 0.4);
    });

    it('penalizes score for retries', async () => {
      taskFindUniqueImpl = async () => ({
        id: 't1', status: 'done', title: 'Task 1',
        retryCount: 3, riskLevel: 'low', estimatedCost: 10, verification: null,
      });

      const result = await FeedbackCollector.collectFromTaskCompletion('ws-1', 't1');

      assert.ok(result);
      // 0.8 base - 0.3 (3 retries) = 0.5
      assert.ok(result!.score <= 0.5);
      assert.ok(result!.notes.includes('retries'));
    });

    it('rewards passed verification', async () => {
      taskFindUniqueImpl = async () => ({
        id: 't1', status: 'done', title: 'Task 1',
        retryCount: 0, riskLevel: 'low', estimatedCost: 10,
        verification: JSON.stringify({ passed: true }),
      });

      const result = await FeedbackCollector.collectFromTaskCompletion('ws-1', 't1');

      assert.ok(result);
      assert.ok(result!.score >= 0.9);
      assert.ok(result!.notes.includes('Verification passed'));
    });
  });

  // ── collectFromAgentRun ──
  describe('collectFromAgentRun', () => {
    it('returns null when agent run not found', async () => {
      agentRunFindUniqueImpl = async () => null;

      const result = await FeedbackCollector.collectFromAgentRun('ws-1', 'nope');

      assert.equal(result, null);
    });

    it('returns null for running agent runs', async () => {
      agentRunFindUniqueImpl = async () => ({
        id: 'r1', status: 'running', tokensUsed: 0, costCredits: 0,
        retryCount: 0, toolCalls: '[]', verification: null,
        startedAt: new Date(), completedAt: null,
      });

      const result = await FeedbackCollector.collectFromAgentRun('ws-1', 'r1');

      assert.equal(result, null);
    });

    it('returns positive feedback for completed runs', async () => {
      const start = new Date(Date.now() - 5000);
      agentRunFindUniqueImpl = async () => ({
        id: 'r1', status: 'completed', tokensUsed: 100, costCredits: 1,
        retryCount: 0, toolCalls: JSON.stringify([{ status: 'completed' }]),
        verification: JSON.stringify({ passed: true }),
        startedAt: start, completedAt: new Date(),
      });

      const result = await FeedbackCollector.collectFromAgentRun('ws-1', 'r1');

      assert.ok(result);
      assert.equal(result!.source, 'agent_run');
      assert.equal(result!.rating, 'positive');
      assert.ok(result!.score >= 0.8);
    });

    it('penalizes for failed tool calls', async () => {
      agentRunFindUniqueImpl = async () => ({
        id: 'r1', status: 'completed', tokensUsed: 100, costCredits: 1,
        retryCount: 0,
        toolCalls: JSON.stringify([
          { status: 'completed' },
          { status: 'failed' },
          { status: 'failed' },
        ]),
        verification: null,
        startedAt: new Date(), completedAt: new Date(),
      });

      const result = await FeedbackCollector.collectFromAgentRun('ws-1', 'r1');

      assert.ok(result);
      assert.equal(result!.metrics.failedTools, 2);
      assert.ok(result!.score < 0.8);
    });
  });

  // ── collectFromKpiProgress ──
  describe('collectFromKpiProgress', () => {
    it('returns null when no KPIs found', async () => {
      kpiFindManyImpl = async () => [];

      const result = await FeedbackCollector.collectFromKpiProgress('org-1', 'g1');

      assert.equal(result, null);
    });

    it('returns positive feedback when KPIs exceed target', async () => {
      kpiFindManyImpl = async () => [
        { name: 'Revenue', target: 100, current: 120, direction: 'up' },
      ];

      const result = await FeedbackCollector.collectFromKpiProgress('org-1', 'g1');

      assert.ok(result);
      assert.equal(result!.source, 'kpi');
      assert.equal(result!.rating, 'positive');
      assert.ok(result!.score >= 0.9);
    });

    it('returns negative feedback when KPIs are far behind', async () => {
      kpiFindManyImpl = async () => [
        { name: 'Revenue', target: 100, current: 20, direction: 'up' },
      ];

      const result = await FeedbackCollector.collectFromKpiProgress('org-1', 'g1');

      assert.ok(result);
      assert.equal(result!.rating, 'negative');
      assert.ok(result!.score < 0.4);
    });

    it('computes average progress across multiple KPIs', async () => {
      kpiFindManyImpl = async () => [
        { name: 'Revenue', target: 100, current: 80, direction: 'up' },
        { name: 'Signups', target: 50, current: 40, direction: 'up' },
      ];

      const result = await FeedbackCollector.collectFromKpiProgress('org-1', 'g1');

      assert.ok(result);
      assert.equal(result!.metrics.kpiCount, 2);
      // avg progress = (0.8 + 0.8) / 2 = 0.8
      assert.ok(result!.metrics.avgProgress > 0.7);
    });
  });

  // ── collectFromCreativePerformance ──
  describe('collectFromCreativePerformance', () => {
    it('returns null when no performance records', async () => {
      creativePerfFindManyImpl = async () => [];

      const result = await FeedbackCollector.collectFromCreativePerformance('ws-1', 'user-1');

      assert.equal(result, null);
    });

    it('returns positive feedback for high ROAS', async () => {
      creativePerfFindManyImpl = async () => [
        { hookType: 'curiosity', angleName: 'aspiration', platform: 'meta',
          impressions: 10000, clicks: 500, conversions: 50, spend: 100, revenue: 400,
          ctr: 0.05, cvr: 0.1, roas: 4.0 },
      ];

      const result = await FeedbackCollector.collectFromCreativePerformance('ws-1', 'user-1');

      assert.ok(result);
      assert.equal(result!.source, 'creative_performance');
      assert.equal(result!.rating, 'positive');
      assert.ok(result!.score >= 0.9);
    });

    it('identifies best performing hook type', async () => {
      creativePerfFindManyImpl = async () => [
        { hookType: 'curiosity', angleName: null, platform: 'meta',
          impressions: 1000, clicks: 50, conversions: 5, spend: 50, revenue: 200,
          ctr: 0.05, cvr: 0.1, roas: 4.0 },
        { hookType: 'fear', angleName: null, platform: 'meta',
          impressions: 1000, clicks: 30, conversions: 2, spend: 50, revenue: 50,
          ctr: 0.03, cvr: 0.06, roas: 1.0 },
      ];

      const result = await FeedbackCollector.collectFromCreativePerformance('ws-1', 'user-1');

      assert.ok(result);
      assert.ok(result!.notes.includes('curiosity'));
    });
  });

  // ── aggregateFeedback ──
  describe('aggregateFeedback', () => {
    it('returns empty summary when no feedback collected', async () => {
      taskFindManyImpl = async () => [];

      const result = await FeedbackCollector.aggregateFeedback('ws-1');

      assert.equal(result.total, 0);
      assert.equal(result.positive, 0);
      assert.equal(result.negative, 0);
    });

    it('aggregates feedback from multiple task completions', async () => {
      taskFindManyImpl = async () => [
        { id: 't1', status: 'done', title: 'T1', retryCount: 0, riskLevel: 'low', estimatedCost: 0, verification: null },
        { id: 't2', status: 'failed', title: 'T2', retryCount: 0, riskLevel: 'low', estimatedCost: 0, verification: null },
      ];
      taskFindUniqueImpl = async (args) => {
        const tasks: Record<string, unknown> = {
          t1: { id: 't1', status: 'done', title: 'T1', retryCount: 0, riskLevel: 'low', estimatedCost: 0, verification: null },
          t2: { id: 't2', status: 'failed', title: 'T2', retryCount: 0, riskLevel: 'low', estimatedCost: 0, verification: null },
        };
        return tasks[args.where.id] || null;
      };

      const result = await FeedbackCollector.aggregateFeedback('ws-1', { taskId: 't1' });

      // With specific taskId, only collects that one
      assert.ok(result.total >= 1);
    });

    it('computes bySource breakdown', async () => {
      taskFindUniqueImpl = async () => ({
        id: 't1', status: 'done', title: 'T1', retryCount: 0, riskLevel: 'low',
        estimatedCost: 0, verification: null,
      });

      const result = await FeedbackCollector.aggregateFeedback('ws-1', { taskId: 't1' });

      assert.ok(result.total > 0);
      assert.ok(result.bySource['task']);
      assert.equal(result.bySource['task'].count, 1);
    });

    it('collects top issues and successes', async () => {
      taskFindUniqueImpl = async () => ({
        id: 't1', status: 'done', title: 'T1', retryCount: 0, riskLevel: 'low',
        estimatedCost: 0, verification: JSON.stringify({ passed: true }),
      });

      const result = await FeedbackCollector.aggregateFeedback('ws-1', { taskId: 't1' });

      assert.ok(result.total > 0);
      assert.ok(result.topSuccesses.length > 0);
    });
  });
});
