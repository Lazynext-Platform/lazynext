import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup — follows the exact pattern from test/services/crm.test.ts
// ─────────────────────────────────────────────────────────────────────────────

type CreationFindUniqueArgs = {
  where: { id: string };
  select?: Record<string, unknown>;
};

type CreationUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
  select?: Record<string, unknown>;
};

type CreationFindManyArgs = {
  where: { userId: string; status?: Record<string, unknown> };
  select?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type AdCampaignFindUniqueArgs = {
  where: { id: string };
  select?: Record<string, unknown>;
};

type AdCampaignUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
  select?: Record<string, unknown>;
};

type AdCampaignFindManyArgs = {
  where: { userId: string; status?: Record<string, unknown> };
  select?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type CreativePerformanceFindManyArgs = {
  where: { userId: string; platform?: string };
  select?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type PlanCreateArgs = {
  data: {
    workspaceId: string;
    organizationId: string;
    title: string;
    objective: string;
    status: string;
    priority: string;
    riskLevel: string;
  };
};

type ProjectFindFirstArgs = {
  where: { workspaceId: string; status: string };
  select?: Record<string, unknown>;
};

type TaskCreateArgs = {
  data: {
    projectId: string;
    planId: string;
    title: string;
    description: string;
    priority: string;
    status: string;
  };
  select?: Record<string, unknown>;
};

type TaskFindManyArgs = {
  where: { project: { workspaceId: string }; planId: Record<string, unknown> };
  select?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type PlanFindManyArgs = {
  where: { workspaceId: string; status: Record<string, unknown> };
  select?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type MemoryCreateArgs = {
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  source: string;
  sourceId: string | null;
  confidence: number;
  owner: string | null;
  lifecycle: string;
  tags: string;
  createdBy: string;
};

type EventCreateArgs = {
  workspaceId: string | null;
  organizationId: string | null;
  type: string;
  actor: string | null;
  actorType: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: string;
  correlationId: string | null;
  source: string;
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

// ── Mutable implementation functions ──

let creationFindUniqueImpl: (args: CreationFindUniqueArgs) => Promise<unknown> =
  async () => null;
let creationUpdateImpl: (args: CreationUpdateArgs) => Promise<unknown> =
  async () => ({});
let creationFindManyImpl: (args: CreationFindManyArgs) => Promise<unknown[]> =
  async () => [];

let adCampaignFindUniqueImpl: (args: AdCampaignFindUniqueArgs) => Promise<unknown> =
  async () => null;
let adCampaignUpdateImpl: (args: AdCampaignUpdateArgs) => Promise<unknown> =
  async () => ({});
let adCampaignFindManyImpl: (args: AdCampaignFindManyArgs) => Promise<unknown[]> =
  async () => [];

let creativePerformanceFindManyImpl: (args: CreativePerformanceFindManyArgs) => Promise<unknown[]> =
  async () => [];

let planCreateImpl: (args: PlanCreateArgs) => Promise<unknown> =
  async () => ({ id: 'plan-1' });
let planFindManyImpl: (args: PlanFindManyArgs) => Promise<unknown[]> =
  async () => [];

let projectFindFirstImpl: (args: ProjectFindFirstArgs) => Promise<unknown> =
  async () => ({ id: 'proj-1' });

let taskCreateImpl: (args: TaskCreateArgs) => Promise<unknown> =
  async () => ({ id: 'task-1', title: 'Task' });
let taskFindManyImpl: (args: TaskFindManyArgs) => Promise<unknown[]> =
  async () => [];

let memoryCreateImpl: (args: MemoryCreateArgs) => Promise<unknown> =
  async () => ({ id: 'mem-1' });

let eventCreateImpl: (args: EventCreateArgs) => Promise<unknown> =
  async () => ({ id: 'evt-1' });

const prismaMock = {
  creation: {
    findUnique: (args: CreationFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'creation.findUnique', args });
      return creationFindUniqueImpl(args);
    },
    update: (args: CreationUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'creation.update', args });
      return creationUpdateImpl(args);
    },
    findMany: (args: CreationFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'creation.findMany', args });
      return creationFindManyImpl(args);
    },
  },
  adCampaign: {
    findUnique: (args: AdCampaignFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'adCampaign.findUnique', args });
      return adCampaignFindUniqueImpl(args);
    },
    update: (args: AdCampaignUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'adCampaign.update', args });
      return adCampaignUpdateImpl(args);
    },
    findMany: (args: AdCampaignFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'adCampaign.findMany', args });
      return adCampaignFindManyImpl(args);
    },
  },
  creativePerformance: {
    findMany: (args: CreativePerformanceFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'creativePerformance.findMany', args });
      return creativePerformanceFindManyImpl(args);
    },
  },
  plan: {
    create: (args: PlanCreateArgs): Promise<unknown> => {
      calls.push({ method: 'plan.create', args });
      return planCreateImpl(args);
    },
    findMany: (args: PlanFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'plan.findMany', args });
      return planFindManyImpl(args);
    },
  },
  project: {
    findFirst: (args: ProjectFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'project.findFirst', args });
      return projectFindFirstImpl(args);
    },
  },
  task: {
    create: (args: TaskCreateArgs): Promise<unknown> => {
      calls.push({ method: 'task.create', args });
      return taskCreateImpl(args);
    },
    findMany: (args: TaskFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'task.findMany', args });
      return taskFindManyImpl(args);
    },
  },
  memory: {
    create: (args: MemoryCreateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
  },
  event: {
    create: (args: EventCreateArgs): Promise<unknown> => {
      calls.push({ method: 'event.create', args });
      return eventCreateImpl(args);
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

// MemoryService mock
const memoryCreateMock = (args: MemoryCreateArgs): Promise<unknown> => {
  calls.push({ method: 'MemoryService.create', args });
  return memoryCreateImpl(args);
};

mock.module('@/lib/services/memory', {
  namedExports: {
    MemoryService: {
      create: memoryCreateMock,
    },
  },
});

// EventService mock
const eventEmitMock = (args: Record<string, unknown>): Promise<unknown> => {
  calls.push({ method: 'EventService.emit', args });
  return eventCreateImpl(args as unknown as EventCreateArgs);
};

mock.module('@/lib/services/event', {
  namedExports: {
    EventService: {
      emit: eventEmitMock,
    },
  },
});

// atlas mock (not used directly by the service, but imported transitively)
mock.module('@/lib/atlas', {
  namedExports: {
    atlasChat: async () => 'mock-response',
    submitGen: async () => ({ id: 'mock-id', getUrl: 'mock-url' }),
    pollOnce: async () => ({ status: 'completed', outputs: [], raw: {} }),
  },
});

function resetMock(): void {
  calls.length = 0;
  creationFindUniqueImpl = async () => null;
  creationUpdateImpl = async () => ({});
  creationFindManyImpl = async () => [];
  adCampaignFindUniqueImpl = async () => null;
  adCampaignUpdateImpl = async () => ({});
  adCampaignFindManyImpl = async () => [];
  creativePerformanceFindManyImpl = async () => [];
  planCreateImpl = async () => ({ id: 'plan-1' });
  planFindManyImpl = async () => [];
  projectFindFirstImpl = async () => ({ id: 'proj-1' });
  taskCreateImpl = async () => ({ id: 'task-1', title: 'Task' });
  taskFindManyImpl = async () => [];
  memoryCreateImpl = async () => ({ id: 'mem-1' });
  eventCreateImpl = async () => ({ id: 'evt-1' });
}

const { CreativeIntegrationService } = await import('@/lib/services/creative-integration');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('CreativeIntegrationService', () => {
  beforeEach(() => { resetMock(); });

  describe('linkCreationToTask', () => {
    it('stores the task ID in Creation assets metadata', async () => {
      creationFindUniqueImpl = async () => ({
        id: 'c1',
        assets: { sceneImage: 'url' },
      });
      creationUpdateImpl = async (args: CreationUpdateArgs) => {
        const assets = args.data.assets as Record<string, unknown>;
        assert.ok(assets._osLinks);
        assert.equal((assets._osLinks as Record<string, unknown>).taskId, 'task-1');
        return { id: 'c1', assets };
      };

      const result = await CreativeIntegrationService.linkCreationToTask('c1', 'task-1');

      assert.ok(result);
      assert.equal(result.id, 'c1');
      assert.equal(calls[0].method, 'creation.findUnique');
      assert.equal(calls[1].method, 'creation.update');
    });

    it('returns null when creation not found', async () => {
      creationFindUniqueImpl = async () => null;

      const result = await CreativeIntegrationService.linkCreationToTask('nope', 'task-1');
      assert.equal(result, null);
    });

    it('handles null assets by creating a new _osLinks object', async () => {
      creationFindUniqueImpl = async () => ({ id: 'c1', assets: null });
      creationUpdateImpl = async (args: CreationUpdateArgs) => {
        const assets = args.data.assets as Record<string, unknown>;
        assert.ok(assets._osLinks);
        assert.equal((assets._osLinks as Record<string, unknown>).taskId, 'task-2');
        return { id: 'c1', assets };
      };

      const result = await CreativeIntegrationService.linkCreationToTask('c1', 'task-2');
      assert.ok(result);
    });
  });

  describe('linkCampaignToPlan', () => {
    it('stores the plan ID in AdCampaign targeting metadata', async () => {
      adCampaignFindUniqueImpl = async () => ({
        id: 'camp-1',
        targeting: { audience: 'us' },
      });
      adCampaignUpdateImpl = async (args: AdCampaignUpdateArgs) => {
        const targeting = args.data.targeting as Record<string, unknown>;
        assert.ok(targeting._osLinks);
        assert.equal((targeting._osLinks as Record<string, unknown>).planId, 'plan-1');
        return { id: 'camp-1', targeting };
      };

      const result = await CreativeIntegrationService.linkCampaignToPlan('camp-1', 'plan-1');

      assert.ok(result);
      assert.equal(result.id, 'camp-1');
      assert.equal(calls[0].method, 'adCampaign.findUnique');
      assert.equal(calls[1].method, 'adCampaign.update');
    });

    it('returns null when campaign not found', async () => {
      adCampaignFindUniqueImpl = async () => null;

      const result = await CreativeIntegrationService.linkCampaignToPlan('nope', 'plan-1');
      assert.equal(result, null);
    });
  });

  describe('recordCreativeMemory', () => {
    it('creates a memory record with type outcome and source agent', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.type, 'outcome');
        assert.equal(args.source, 'agent');
        assert.equal(args.content, 'Test creative outcome');
        return { id: 'mem-1', type: 'outcome' };
      };

      const result = await CreativeIntegrationService.recordCreativeMemory('ws-1', 'org-1', {
        content: 'Test creative outcome',
        createdBy: 'user-1',
      });

      assert.ok(result);
      assert.equal(result.id, 'mem-1');
      assert.equal(calls[0].method, 'MemoryService.create');
    });
  });

  describe('emitCreativeEvent', () => {
    it('emits an event with actorType agent and source creative', async () => {
      eventCreateImpl = async (args: EventCreateArgs) => {
        assert.equal(args.actorType, 'agent');
        assert.equal(args.source, 'creative');
        assert.equal(args.type, 'creative.milestone');
        return { id: 'evt-1' };
      };

      const result = await CreativeIntegrationService.emitCreativeEvent('ws-1', 'org-1', {
        type: 'creative.milestone',
      });

      assert.ok(result);
      assert.equal(calls[0].method, 'EventService.emit');
    });
  });

  describe('getCreativeSummary', () => {
    it('aggregates creations, campaigns, and performance stats', async () => {
      creationFindManyImpl = async () => ([
        { id: 'c1', prompt: 'Ad 1', status: 'completed', createdAt: new Date() },
        { id: 'c2', prompt: 'Ad 2', status: 'pending', createdAt: new Date() },
      ]);
      adCampaignFindManyImpl = async () => ([
        { id: 'camp-1', status: 'active', metrics: {} },
        { id: 'camp-2', status: 'draft', metrics: {} },
      ]);
      creativePerformanceFindManyImpl = async () => ([
        { creationId: 'c1', spend: 100, revenue: 300, roas: 3 },
        { creationId: 'c1', spend: 50, revenue: 150, roas: 3 },
      ]);

      const summary = await CreativeIntegrationService.getCreativeSummary('user-1');

      assert.equal(summary.totalCreations, 2);
      assert.equal(summary.byStatus.completed, 1);
      assert.equal(summary.byStatus.pending, 1);
      assert.equal(summary.totalCampaigns, 2);
      assert.equal(summary.activeCampaigns, 1);
      assert.equal(summary.totalSpend, 150);
      assert.equal(summary.totalRevenue, 450);
      assert.equal(summary.avgRoas, 3);
      assert.equal(summary.topCreatives.length, 1);
      assert.equal(summary.topCreatives[0].id, 'c1');
    });

    it('returns zero stats when no data', async () => {
      const summary = await CreativeIntegrationService.getCreativeSummary('user-1');

      assert.equal(summary.totalCreations, 0);
      assert.equal(summary.totalCampaigns, 0);
      assert.equal(summary.totalSpend, 0);
      assert.equal(summary.avgRoas, 0);
    });
  });

  describe('getPerformanceInsights', () => {
    it('aggregates top hooks, angles, and platforms', async () => {
      creativePerformanceFindManyImpl = async () => ([
        { id: 'p1', hookType: 'curiosity', angleName: 'pain_point', platform: 'tiktok', spend: 100, revenue: 300, roas: 3, ctr: 0.05, cvr: 0.02, recordedAt: new Date('2024-01-01') },
        { id: 'p2', hookType: 'curiosity', angleName: 'aspiration', platform: 'tiktok', spend: 200, revenue: 800, roas: 4, ctr: 0.06, cvr: 0.03, recordedAt: new Date('2024-01-02') },
        { id: 'p3', hookType: 'fear', angleName: 'pain_point', platform: 'instagram', spend: 50, revenue: 100, roas: 2, ctr: 0.03, cvr: 0.01, recordedAt: new Date('2024-01-03') },
      ]);

      const insights = await CreativeIntegrationService.getPerformanceInsights('user-1');

      assert.equal(insights.totalRecords, 3);
      assert.equal(insights.totalSpend, 350);
      assert.equal(insights.totalRevenue, 1200);
      assert.equal(insights.topHooks.length, 2);
      assert.equal(insights.topHooks[0].hookType, 'curiosity');
      assert.equal(insights.topAngles.length, 2);
      assert.equal(insights.topPlatforms.length, 2);
    });

    it('returns empty insights when no data', async () => {
      const insights = await CreativeIntegrationService.getPerformanceInsights('user-1');

      assert.equal(insights.totalRecords, 0);
      assert.equal(insights.topHooks.length, 0);
      assert.equal(insights.avgRoas, 0);
    });
  });

  describe('syncPerformanceToMemory', () => {
    it('creates a memory record and emits an event with insights', async () => {
      creativePerformanceFindManyImpl = async () => ([
        { id: 'p1', hookType: 'curiosity', angleName: 'pain_point', platform: 'tiktok', spend: 100, revenue: 300, roas: 3, ctr: 0.05, cvr: 0.02, recordedAt: new Date('2024-01-01') },
      ]);

      const result = await CreativeIntegrationService.syncPerformanceToMemory('ws-1', 'org-1', 'user-1');

      assert.ok(result.memory);
      assert.ok(result.event);
      assert.ok(result.insights);
      assert.equal(result.insights.totalRecords, 1);

      // Should have called MemoryService.create and EventService.emit
      const memoryCall = calls.find((c) => c.method === 'MemoryService.create');
      const eventCall = calls.find((c) => c.method === 'EventService.emit');
      assert.ok(memoryCall);
      assert.ok(eventCall);
    });

    it('works with no performance data (low confidence)', async () => {
      const result = await CreativeIntegrationService.syncPerformanceToMemory('ws-1', 'org-1', 'user-1');

      assert.ok(result.memory);
      assert.ok(result.event);
      assert.equal(result.insights.totalRecords, 0);
    });
  });

  describe('createCampaignPlan', () => {
    it('creates a plan, tasks, and links the campaign', async () => {
      planCreateImpl = async (args: PlanCreateArgs) => {
        assert.equal(args.data.title, 'Q1 Campaign');
        assert.equal(args.data.status, 'active');
        return { id: 'plan-1', title: 'Q1 Campaign' };
      };
      taskCreateImpl = async (args: TaskCreateArgs) => {
        assert.equal(args.data.planId, 'plan-1');
        assert.equal(args.data.status, 'todo');
        return { id: 'task-1', title: args.data.title };
      };
      adCampaignFindUniqueImpl = async () => ({ id: 'camp-1', targeting: null });
      adCampaignUpdateImpl = async () => ({ id: 'camp-1' });

      const result = await CreativeIntegrationService.createCampaignPlan('ws-1', 'org-1', {
        campaignId: 'camp-1',
        title: 'Q1 Campaign',
        objective: 'Launch Q1 ad campaign',
        tasks: [
          { title: 'Generate hooks', priority: 'high' },
          { title: 'Create script' },
        ],
      });

      assert.ok(result.plan);
      assert.equal(result.plan.id, 'plan-1');
      assert.equal(result.tasks.length, 2);

      // Should have created plan, tasks, linked campaign, and emitted event
      const planCall = calls.find((c) => c.method === 'plan.create');
      const taskCalls = calls.filter((c) => c.method === 'task.create');
      const campaignUpdateCall = calls.find((c) => c.method === 'adCampaign.update');
      const eventCall = calls.find((c) => c.method === 'EventService.emit');
      assert.ok(planCall);
      assert.equal(taskCalls.length, 2);
      assert.ok(campaignUpdateCall);
      assert.ok(eventCall);
    });

    it('creates plan with no tasks when project not found', async () => {
      projectFindFirstImpl = async () => null;
      adCampaignFindUniqueImpl = async () => ({ id: 'camp-1', targeting: null });
      adCampaignUpdateImpl = async () => ({ id: 'camp-1' });

      const result = await CreativeIntegrationService.createCampaignPlan('ws-1', 'org-1', {
        campaignId: 'camp-1',
        title: 'Campaign',
        objective: 'Test',
        tasks: [{ title: 'Task 1' }],
      });

      assert.ok(result.plan);
      assert.equal(result.tasks.length, 0);
    });
  });

  describe('getGrowthDashboard', () => {
    it('combines summary, insights, campaigns, creations, plans, and tasks', async () => {
      creationFindManyImpl = async () => ([
        { id: 'c1', prompt: 'Ad 1', status: 'completed', model: 'doubao', createdAt: new Date('2024-01-01') },
      ]);
      adCampaignFindManyImpl = async () => ([
        { id: 'camp-1', name: 'Q1 Campaign', platform: 'tiktok', status: 'active', budgetDaily: 50, budgetTotal: 1000 },
      ]);
      creativePerformanceFindManyImpl = async () => ([
        { id: 'p1', hookType: 'curiosity', angleName: 'pain', platform: 'tiktok', spend: 100, revenue: 300, roas: 3, ctr: 0.05, cvr: 0.02, recordedAt: new Date('2024-01-01') },
      ]);
      planFindManyImpl = async () => ([
        { id: 'plan-1', title: 'Q1 Plan', status: 'active' },
      ]);
      taskFindManyImpl = async () => ([
        { id: 'task-1', title: 'Generate hooks', status: 'todo', priority: 'high' },
      ]);

      const dashboard = await CreativeIntegrationService.getGrowthDashboard('ws-1', 'org-1', 'user-1');

      assert.ok(dashboard.summary);
      assert.ok(dashboard.insights);
      assert.equal(dashboard.summary.totalCreations, 1);
      assert.equal(dashboard.activeCampaigns.length, 1);
      assert.equal(dashboard.activeCampaigns[0].name, 'Q1 Campaign');
      assert.equal(dashboard.recentCreations.length, 1);
      assert.equal(dashboard.linkedPlans.length, 1);
      assert.equal(dashboard.linkedTasks.length, 1);
    });

    it('returns empty dashboard when no data', async () => {
      const dashboard = await CreativeIntegrationService.getGrowthDashboard('ws-1', 'org-1', 'user-1');

      assert.equal(dashboard.summary.totalCreations, 0);
      assert.equal(dashboard.activeCampaigns.length, 0);
      assert.equal(dashboard.recentCreations.length, 0);
      assert.equal(dashboard.linkedPlans.length, 0);
      assert.equal(dashboard.linkedTasks.length, 0);
    });
  });
});
