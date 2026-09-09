import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

// Memory
let memoryCreateImpl: (args: { data: Record<string, unknown> }) => Promise<unknown> = async () => ({});
let memoryFindUniqueImpl: (args: { where: { id: string } }) => Promise<unknown> = async () => null;
let memoryFindManyImpl: (args: Record<string, unknown>) => Promise<unknown[]> = async () => [];
let memoryUpdateImpl: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown> = async () => ({});
let memoryDeleteImpl: (args: { where: { id: string } }) => Promise<unknown> = async () => ({});

// Task
let taskFindManyImpl: (args: Record<string, unknown>) => Promise<unknown[]> = async () => [];
let taskCountImpl: (args: Record<string, unknown>) => Promise<number> = async () => 0;

// Goal
let goalFindManyImpl: (args: Record<string, unknown>) => Promise<unknown[]> = async () => [];

// Project
let projectFindManyImpl: (args: Record<string, unknown>) => Promise<unknown[]> = async () => [];
let projectCountImpl: (args: Record<string, unknown>) => Promise<number> = async () => 0;

// Event
let eventFindManyImpl: (args: Record<string, unknown>) => Promise<unknown[]> = async () => [];

// AgentDef
let agentDefFindManyImpl: (args: Record<string, unknown>) => Promise<unknown[]> = async () => [];

// AgentRun
let agentRunCountImpl: (args: Record<string, unknown>) => Promise<number> = async () => 0;
let agentRunFindManyImpl: (args: Record<string, unknown>) => Promise<unknown[]> = async () => [];

// Transaction
let transactionFindManyImpl: (args: Record<string, unknown>) => Promise<unknown[]> = async () => [];

// Deal
let dealFindManyImpl: (args: Record<string, unknown>) => Promise<unknown[]> = async () => [];

// Ticket
let ticketFindManyImpl: (args: Record<string, unknown>) => Promise<unknown[]> = async () => [];
let ticketCountImpl: (args: Record<string, unknown>) => Promise<number> = async () => 0;

// Workspace
let workspaceFindFirstImpl: (args: Record<string, unknown>) => Promise<unknown> = async () => null;

const prismaMock = {
  memory: {
    create: (args: { data: Record<string, unknown> }): Promise<unknown> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
    findUnique: (args: { where: { id: string } }): Promise<unknown> => {
      calls.push({ method: 'memory.findUnique', args });
      return memoryFindUniqueImpl(args);
    },
    findMany: (args: Record<string, unknown>): Promise<unknown[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
    },
    update: (args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown> => {
      calls.push({ method: 'memory.update', args });
      return memoryUpdateImpl(args);
    },
    delete: (args: { where: { id: string } }): Promise<unknown> => {
      calls.push({ method: 'memory.delete', args });
      return memoryDeleteImpl(args);
    },
  },
  task: {
    findMany: (args: Record<string, unknown>): Promise<unknown[]> => {
      calls.push({ method: 'task.findMany', args });
      return taskFindManyImpl(args);
    },
    count: (args: Record<string, unknown>): Promise<number> => {
      calls.push({ method: 'task.count', args });
      return taskCountImpl(args);
    },
  },
  goal: {
    findMany: (args: Record<string, unknown>): Promise<unknown[]> => {
      calls.push({ method: 'goal.findMany', args });
      return goalFindManyImpl(args);
    },
  },
  project: {
    findMany: (args: Record<string, unknown>): Promise<unknown[]> => {
      calls.push({ method: 'project.findMany', args });
      return projectFindManyImpl(args);
    },
    count: (args: Record<string, unknown>): Promise<number> => {
      calls.push({ method: 'project.count', args });
      return projectCountImpl(args);
    },
  },
  event: {
    findMany: (args: Record<string, unknown>): Promise<unknown[]> => {
      calls.push({ method: 'event.findMany', args });
      return eventFindManyImpl(args);
    },
  },
  agentDef: {
    findMany: (args: Record<string, unknown>): Promise<unknown[]> => {
      calls.push({ method: 'agentDef.findMany', args });
      return agentDefFindManyImpl(args);
    },
  },
  agentRun: {
    count: (args: Record<string, unknown>): Promise<number> => {
      calls.push({ method: 'agentRun.count', args });
      return agentRunCountImpl(args);
    },
    findMany: (args: Record<string, unknown>): Promise<unknown[]> => {
      calls.push({ method: 'agentRun.findMany', args });
      return agentRunFindManyImpl(args);
    },
  },
  transaction: {
    findMany: (args: Record<string, unknown>): Promise<unknown[]> => {
      calls.push({ method: 'transaction.findMany', args });
      return transactionFindManyImpl(args);
    },
  },
  deal: {
    findMany: (args: Record<string, unknown>): Promise<unknown[]> => {
      calls.push({ method: 'deal.findMany', args });
      return dealFindManyImpl(args);
    },
  },
  ticket: {
    findMany: (args: Record<string, unknown>): Promise<unknown[]> => {
      calls.push({ method: 'ticket.findMany', args });
      return ticketFindManyImpl(args);
    },
    count: (args: Record<string, unknown>): Promise<number> => {
      calls.push({ method: 'ticket.count', args });
      return ticketCountImpl(args);
    },
  },
  workspace: {
    findFirst: (args: Record<string, unknown>): Promise<unknown> => {
      calls.push({ method: 'workspace.findFirst', args });
      return workspaceFindFirstImpl(args);
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

function makeMemRecord(overrides: Record<string, unknown> = {}): {
  id: string; organizationId: string; workspaceId: string; content: string;
  createdBy: string; createdAt: Date; updatedAt: Date; type: string;
} {
  return {
    id: 'mem-1',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    content: '{}',
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-02T00:00:00Z'),
    type: 'analytics_dashboard',
    ...overrides,
  };
}

function resetMock(): void {
  calls.length = 0;
  memoryCreateImpl = async () => ({});
  memoryFindUniqueImpl = async () => null;
  memoryFindManyImpl = async () => [];
  memoryUpdateImpl = async () => ({});
  memoryDeleteImpl = async () => ({});
  taskFindManyImpl = async () => [];
  taskCountImpl = async () => 0;
  goalFindManyImpl = async () => [];
  projectFindManyImpl = async () => [];
  projectCountImpl = async () => 0;
  eventFindManyImpl = async () => [];
  agentDefFindManyImpl = async () => [];
  agentRunCountImpl = async () => 0;
  agentRunFindManyImpl = async () => [];
  transactionFindManyImpl = async () => [];
  dealFindManyImpl = async () => [];
  ticketFindManyImpl = async () => [];
  ticketCountImpl = async () => 0;
  workspaceFindFirstImpl = async () => ({ id: 'ws-1' });
}

const { AnalyticsService } = await import('@/lib/services/analytics-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('AnalyticsService', () => {
  beforeEach(() => { resetMock(); });

  // ── Dashboards ──

  describe('createDashboard', () => {
    it('creates a dashboard and returns parsed data', async () => {
      memoryCreateImpl = async (args) => makeMemRecord({
        id: 'd1',
        content: args.data.content as string,
        type: 'analytics_dashboard',
      });

      const result = await AnalyticsService.createDashboard('org-1', {
        name: 'My Dashboard',
        widgets: [],
        createdBy: 'user-1',
      });

      assert.equal(result.id, 'd1');
      assert.equal(result.name, 'My Dashboard');
      const createCall = calls.find((c) => c.method === 'memory.create');
      assert.ok(createCall, 'expected memory.create to be called');
    });

    it('uses default workspace when workspaceId not provided', async () => {
      memoryCreateImpl = async (args) => makeMemRecord({
        content: args.data.content as string,
        workspaceId: 'ws-1',
      });

      const result = await AnalyticsService.createDashboard('org-1', {
        name: 'Dash',
        widgets: [],
        createdBy: 'user-1',
      });

      assert.equal(result.workspaceId, 'ws-1');
    });
  });

  describe('getDashboard', () => {
    it('returns a dashboard by id', async () => {
      memoryFindUniqueImpl = async () => makeMemRecord({
        id: 'd1',
        content: JSON.stringify({ name: 'Dash', description: 'desc', widgets: [] }),
      });

      const result = await AnalyticsService.getDashboard('d1');
      assert.ok(result);
      assert.equal(result!.id, 'd1');
      assert.equal(result!.name, 'Dash');
    });

    it('returns null when not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const result = await AnalyticsService.getDashboard('nope');
      assert.equal(result, null);
    });

    it('returns null when type is not analytics_dashboard', async () => {
      memoryFindUniqueImpl = async () => makeMemRecord({ type: 'other' });
      const result = await AnalyticsService.getDashboard('d1');
      assert.equal(result, null);
    });
  });

  describe('listDashboards', () => {
    it('returns dashboards for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeMemRecord({ id: 'd1', content: JSON.stringify({ name: 'A', widgets: [] }) }),
        makeMemRecord({ id: 'd2', content: JSON.stringify({ name: 'B', widgets: [] }) }),
      ];

      const result = await AnalyticsService.listDashboards('org-1');
      assert.equal(result.length, 2);
      assert.equal(result[0].id, 'd1');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('DB down'); };
      const result = await AnalyticsService.listDashboards('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('updateDashboard', () => {
    it('updates a dashboard name', async () => {
      memoryFindUniqueImpl = async () => makeMemRecord({
        id: 'd1',
        content: JSON.stringify({ name: 'Old', description: 'desc', widgets: [] }),
      });
      memoryUpdateImpl = async (args) => makeMemRecord({
        id: 'd1',
        content: args.data.content as string,
      });

      const result = await AnalyticsService.updateDashboard('d1', { name: 'New' });
      assert.ok(result);
      assert.equal(result!.name, 'New');
      assert.equal(result!.description, 'desc');
    });

    it('returns null when dashboard not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const result = await AnalyticsService.updateDashboard('nope', { name: 'New' });
      assert.equal(result, null);
    });
  });

  describe('deleteDashboard', () => {
    it('deletes a dashboard and returns true', async () => {
      memoryDeleteImpl = async () => ({ id: 'd1' });
      const result = await AnalyticsService.deleteDashboard('d1');
      assert.equal(result, true);
    });

    it('returns false on error', async () => {
      memoryDeleteImpl = async () => { throw new Error('fail'); };
      const result = await AnalyticsService.deleteDashboard('d1');
      assert.equal(result, false);
    });
  });

  // ── Reports ──

  describe('createReport', () => {
    it('creates a report and returns parsed data', async () => {
      memoryCreateImpl = async (args) => makeMemRecord({
        id: 'r1',
        content: args.data.content as string,
        type: 'analytics_report',
      });

      const result = await AnalyticsService.createReport('org-1', {
        name: 'My Report',
        sections: [],
        createdBy: 'user-1',
      });

      assert.equal(result.id, 'r1');
      assert.equal(result.name, 'My Report');
    });
  });

  describe('getReport', () => {
    it('returns a report by id', async () => {
      memoryFindUniqueImpl = async () => makeMemRecord({
        id: 'r1',
        type: 'analytics_report',
        content: JSON.stringify({ name: 'Report', sections: [], description: '' }),
      });

      const result = await AnalyticsService.getReport('r1');
      assert.ok(result);
      assert.equal(result!.id, 'r1');
      assert.equal(result!.name, 'Report');
    });

    it('returns null when not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const result = await AnalyticsService.getReport('nope');
      assert.equal(result, null);
    });
  });

  describe('listReports', () => {
    it('returns reports for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeMemRecord({ id: 'r1', type: 'analytics_report', content: JSON.stringify({ name: 'A', sections: [] }) }),
      ];

      const result = await AnalyticsService.listReports('org-1');
      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'r1');
    });
  });

  describe('runReport', () => {
    it('runs report sections and returns results', async () => {
      memoryFindUniqueImpl = async () => makeMemRecord({
        id: 'r1',
        type: 'analytics_report',
        content: JSON.stringify({
          name: 'Report',
          sections: [{
            id: 's1',
            title: 'Tasks',
            query: { dataSource: 'tasks' },
            chartType: 'table',
          }],
        }),
      });
      taskFindManyImpl = async () => [{ id: 't1', title: 'Task 1', status: 'done', priority: 'high', projectId: 'p1', projectName: 'Proj', dueDate: null, createdAt: new Date(), updatedAt: new Date(), assigneeId: null, assignedAgentId: null }];

      const result = await AnalyticsService.runReport('org-1', 'r1');
      assert.ok(result.report);
      assert.equal(result.sections.length, 1);
      assert.equal(result.sections[0].section.title, 'Tasks');
      assert.ok(result.sections[0].result.rows.length >= 1);
    });

    it('returns empty sections when report not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const result = await AnalyticsService.runReport('org-1', 'nope');
      assert.equal(result.sections.length, 0);
    });
  });

  describe('getQueryResults', () => {
    it('runs a query with filters and returns rows', async () => {
      taskFindManyImpl = async () => [
        { id: 't1', title: 'A', status: 'done', priority: 'high', projectId: 'p1', projectName: 'P', dueDate: null, createdAt: new Date(), updatedAt: new Date(), assigneeId: null, assignedAgentId: null },
        { id: 't2', title: 'B', status: 'todo', priority: 'low', projectId: 'p2', projectName: 'P2', dueDate: null, createdAt: new Date(), updatedAt: new Date(), assigneeId: null, assignedAgentId: null },
      ];

      const result = await AnalyticsService.getQueryResults('org-1', {
        dataSource: 'tasks',
        filters: [{ field: 'status', operator: 'eq', value: 'done' }],
      });

      assert.equal(result.rows.length, 1);
      assert.equal(result.rows[0].status, 'done');
      assert.equal(result.summary.count, 1);
      assert.equal(result.metadata.dataSource, 'tasks');
    });

    it('applies groupBy and aggregations', async () => {
      taskFindManyImpl = async () => [
        { id: 't1', title: 'A', status: 'done', priority: 'high', projectId: 'p1', projectName: 'P', dueDate: null, createdAt: new Date(), updatedAt: new Date(), assigneeId: null, assignedAgentId: null },
        { id: 't2', title: 'B', status: 'done', priority: 'low', projectId: 'p2', projectName: 'P2', dueDate: null, createdAt: new Date(), updatedAt: new Date(), assigneeId: null, assignedAgentId: null },
        { id: 't3', title: 'C', status: 'todo', priority: 'low', projectId: 'p3', projectName: 'P3', dueDate: null, createdAt: new Date(), updatedAt: new Date(), assigneeId: null, assignedAgentId: null },
      ];

      const result = await AnalyticsService.getQueryResults('org-1', {
        dataSource: 'tasks',
        groupBy: 'status',
        aggregations: [{ field: 'id', type: 'count', alias: 'count' }],
      });

      assert.equal(result.rows.length, 2);
      const doneRow = result.rows.find((r) => r.status === 'done');
      assert.ok(doneRow);
      assert.equal(doneRow!.count, 2);
    });

    it('applies sortBy and limit', async () => {
      taskFindManyImpl = async () => [
        { id: 't1', title: 'C', status: 'done', priority: 'high', projectId: 'p1', projectName: 'P', dueDate: null, createdAt: new Date(), updatedAt: new Date(), assigneeId: null, assignedAgentId: null },
        { id: 't2', title: 'A', status: 'done', priority: 'low', projectId: 'p2', projectName: 'P2', dueDate: null, createdAt: new Date(), updatedAt: new Date(), assigneeId: null, assignedAgentId: null },
        { id: 't3', title: 'B', status: 'todo', priority: 'low', projectId: 'p3', projectName: 'P3', dueDate: null, createdAt: new Date(), updatedAt: new Date(), assigneeId: null, assignedAgentId: null },
      ];

      const result = await AnalyticsService.getQueryResults('org-1', {
        dataSource: 'tasks',
        sortBy: { field: 'title', direction: 'asc' },
        limit: 2,
      });

      assert.equal(result.rows.length, 2);
      assert.equal(result.rows[0].title, 'A');
    });
  });

  describe('getKPIs', () => {
    it('returns KPI array with expected names', async () => {
      taskCountImpl = async () => 10;
      goalFindManyImpl = async () => [{ progress: 50 }, { progress: 70 }];
      agentRunCountImpl = async () => 5;
      projectCountImpl = async () => 3;
      ticketCountImpl = async () => 2;

      const kpis = await AnalyticsService.getKPIs('org-1');

      assert.ok(kpis.length >= 4);
      const names = kpis.map((k) => k.name);
      assert.ok(names.includes('Task Completion Rate'));
      assert.ok(names.includes('Goal Progress'));
      assert.ok(names.includes('Agent Executions'));
    });
  });

  describe('getTrend', () => {
    it('returns trend points for tasks_completed', async () => {
      const date1 = new Date('2024-01-01T10:00:00Z');
      const date2 = new Date('2024-01-02T10:00:00Z');
      taskFindManyImpl = async () => [
        { updatedAt: date1 },
        { updatedAt: date2 },
      ];

      const points = await AnalyticsService.getTrend('org-1', 'tasks_completed', {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-03'),
        granularity: 'day',
      });

      assert.ok(points.length >= 1);
      assert.ok(points.every((p) => typeof p.date === 'string'));
      assert.ok(points.every((p) => typeof p.value === 'number'));
    });

    it('returns empty array for unknown metric path', async () => {
      const points = await AnalyticsService.getTrend('org-1', 'revenue', {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02'),
      });
      assert.deepEqual(points, []);
    });
  });

  describe('exportDashboard', () => {
    it('exports dashboard as JSON', async () => {
      memoryFindUniqueImpl = async () => makeMemRecord({
        id: 'd1',
        content: JSON.stringify({ name: 'Dash', description: 'desc', widgets: [] }),
      });

      const exported = await AnalyticsService.exportDashboard('d1', 'json');
      const parsed = JSON.parse(exported);
      assert.equal(parsed.name, 'Dash');
    });

    it('exports dashboard as CSV', async () => {
      memoryFindUniqueImpl = async () => makeMemRecord({
        id: 'd1',
        content: JSON.stringify({
          name: 'Dash',
          widgets: [{
            id: 'w1', type: 'line', title: 'W1', dataSource: 'tasks',
            position: { x: 0, y: 0, w: 6, h: 4 },
          }],
        }),
      });

      const exported = await AnalyticsService.exportDashboard('d1', 'csv');
      assert.ok(exported.includes('title'));
      assert.ok(exported.includes('W1'));
    });

    it('returns empty string when dashboard not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const exported = await AnalyticsService.exportDashboard('nope', 'json');
      assert.equal(exported, '');
    });
  });

  describe('exportReport', () => {
    it('exports report as JSON', async () => {
      memoryFindUniqueImpl = async () => makeMemRecord({
        id: 'r1',
        type: 'analytics_report',
        content: JSON.stringify({
          name: 'Report',
          sections: [{
            id: 's1', title: 'Tasks', query: { dataSource: 'tasks' }, chartType: 'table',
          }],
        }),
      });
      taskFindManyImpl = async () => [];

      const exported = await AnalyticsService.exportReport('r1', 'json');
      const parsed = JSON.parse(exported);
      assert.equal(parsed.report.name, 'Report');
      assert.ok(Array.isArray(parsed.sections));
    });

    it('exports report as markdown', async () => {
      memoryFindUniqueImpl = async () => makeMemRecord({
        id: 'r1',
        type: 'analytics_report',
        content: JSON.stringify({
          name: 'Report',
          description: 'A report',
          sections: [{
            id: 's1', title: 'Tasks', query: { dataSource: 'tasks' }, chartType: 'table',
          }],
        }),
      });
      taskFindManyImpl = async () => [];

      const exported = await AnalyticsService.exportReport('r1', 'markdown');
      assert.ok(exported.includes('# Report'));
      assert.ok(exported.includes('## Tasks'));
    });
  });

  describe('getPredictiveForecast', () => {
    it('returns forecast with historical and forecast points', async () => {
      const dates: Date[] = [];
      for (let i = 0; i < 10; i++) {
        dates.push(new Date(2024, 0, i + 1));
      }
      taskFindManyImpl = async () => dates.map((d) => ({ updatedAt: d }));

      const forecast = await AnalyticsService.getPredictiveForecast('org-1', 'tasks_completed', {
        periods: 5,
        granularity: 'day',
      });

      assert.ok(forecast.historical.length > 0);
      assert.equal(forecast.forecast.length, 5);
      assert.equal(forecast.method, 'linear_regression');
      assert.ok(forecast.confidence.lower.length === 5);
    });
  });

  describe('getDashboardStats', () => {
    it('returns aggregated stats', async () => {
      memoryFindManyImpl = async (args) => {
        const where = (args as { where: { type?: string } }).where;
        if (where.type === 'analytics_dashboard') {
          return [
            makeMemRecord({ id: 'd1', content: JSON.stringify({ name: 'A', widgets: [{ id: 'w1' }, { id: 'w2' }] }) }),
            makeMemRecord({ id: 'd2', content: JSON.stringify({ name: 'B', widgets: [{ id: 'w3' }] }) }),
          ];
        }
        if (where.type === 'analytics_report') {
          return [makeMemRecord({ id: 'r1', type: 'analytics_report', content: JSON.stringify({ name: 'R', sections: [] }) })];
        }
        return [];
      };

      const stats = await AnalyticsService.getDashboardStats('org-1');
      assert.equal(stats.totalDashboards, 2);
      assert.equal(stats.totalReports, 1);
      assert.equal(stats.totalWidgets, 3);
      assert.equal(stats.dataSources, 8);
    });
  });
});
