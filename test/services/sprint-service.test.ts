import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type MemoryFindManyArgs = {
  where: {
    type?: string;
    organizationId?: string;
    workspaceId?: string;
    sourceId?: string;
    createdBy?: string;
    createdAt?: Record<string, unknown>;
  };
  orderBy?: Record<string, unknown>;
  take?: number;
  skip?: number;
};

type MemoryFindUniqueArgs = {
  where: { id: string };
};

type MemoryCreateArgs = {
  data: {
    workspaceId: string;
    organizationId: string;
    type: string;
    content: string;
    source: string;
    sourceId: string | null;
    confidence: number;
    lifecycle: string;
    tags: string;
    createdBy: string;
  };
};

type MemoryUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type MemoryDeleteArgs = {
  where: { id: string };
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let memoryFindManyImpl: (args: MemoryFindManyArgs) => Promise<unknown[]> =
  async () => [];
let memoryFindUniqueImpl: (args: MemoryFindUniqueArgs) => Promise<unknown> =
  async () => null;
let memoryCreateImpl: (args: MemoryCreateArgs) => Promise<unknown> =
  async () => ({});
let memoryUpdateImpl: (args: MemoryUpdateArgs) => Promise<unknown> =
  async () => ({});
let memoryDeleteImpl: (args: MemoryDeleteArgs) => Promise<unknown> =
  async () => ({});

const prismaMock = {
  memory: {
    findMany: (args: MemoryFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
    },
    findUnique: (args: MemoryFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'memory.findUnique', args });
      return memoryFindUniqueImpl(args);
    },
    create: (args: MemoryCreateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
    update: (args: MemoryUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.update', args });
      return memoryUpdateImpl(args);
    },
    delete: (args: MemoryDeleteArgs): Promise<unknown> => {
      calls.push({ method: 'memory.delete', args });
      return memoryDeleteImpl(args);
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

// Mock IssueService to avoid loading the real issue-service module
let issueGetImpl: (id: string) => Promise<unknown> = async () => null;
let issueUpdateImpl: (id: string, input: Record<string, unknown>) => Promise<unknown> = async () => ({});
let issueGetBySprintImpl: (sprintId: string) => Promise<unknown[]> = async () => [];

mock.module('@/lib/services/issue-service', {
  namedExports: {
    IssueService: {
      get: (id: string) => issueGetImpl(id),
      update: (id: string, input: Record<string, unknown>) => issueUpdateImpl(id, input),
      getBySprint: (sprintId: string) => issueGetBySprintImpl(sprintId),
    },
    Issue: {} as unknown,
    IssueStatus: {} as unknown,
  },
});

function resetMock(): void {
  calls.length = 0;
  memoryFindManyImpl = async () => [];
  memoryFindUniqueImpl = async () => null;
  memoryCreateImpl = async () => ({});
  memoryUpdateImpl = async () => ({});
  memoryDeleteImpl = async () => ({});
  issueGetImpl = async () => null;
  issueUpdateImpl = async () => ({});
  issueGetBySprintImpl = async () => [];
}

function makeSprintRow(id: string, content: Record<string, unknown>, overrides: Partial<Record<string, unknown>> = {}): unknown {
  return {
    id,
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'sprint',
    content: JSON.stringify(content),
    sourceId: null,
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

function makeIssueRow(id: string, content: Record<string, unknown>, overrides: Partial<Record<string, unknown>> = {}): unknown {
  return {
    id,
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'issue',
    content: JSON.stringify(content),
    sourceId: null,
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const { SprintService } = await import('@/lib/services/sprint-service');

// ─────────────────────────────────────────────────────────────────────────────
// SprintService
// ─────────────────────────────────────────────────────────────────────────────

describe('SprintService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a sprint with planning status', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'sprint');
        const content = JSON.parse(args.data.content);
        assert.equal(content.status, 'planning');
        assert.equal(content.name, 'Sprint 1');
        return makeSprintRow('sprint-1', content);
      };

      const sprint = await SprintService.create('org-1', {
        name: 'Sprint 1',
        startDate: '2025-01-01',
        endDate: '2025-01-14',
        createdBy: 'user-1',
      });

      assert.ok(sprint);
      assert.equal(sprint.id, 'sprint-1');
      assert.equal(sprint.name, 'Sprint 1');
      assert.equal(sprint.status, 'planning');
      assert.equal(calls[0].method, 'memory.create');
    });

    it('creates a sprint with goal and projectId', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.goal, 'Ship MVP');
        assert.equal(content.projectId, 'proj-1');
        return makeSprintRow('sprint-2', content);
      };

      const sprint = await SprintService.create('org-1', {
        name: 'Sprint 2',
        goal: 'Ship MVP',
        startDate: '2025-02-01',
        endDate: '2025-02-14',
        projectId: 'proj-1',
        createdBy: 'user-1',
      });

      assert.equal(sprint.goal, 'Ship MVP');
      assert.equal(sprint.projectId, 'proj-1');
    });
  });

  describe('get', () => {
    it('returns a sprint by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeSprintRow('sprint-1', { name: 'Sprint 1', goal: '', status: 'planning', startDate: '2025-01-01', endDate: '2025-01-14', projectId: null, completedAt: null });

      const sprint = await SprintService.get('sprint-1');

      assert.ok(sprint);
      assert.equal(sprint.id, 'sprint-1');
      assert.equal(sprint.name, 'Sprint 1');
      assert.equal(calls[0].method, 'memory.findUnique');
    });

    it('returns null when sprint not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const sprint = await SprintService.get('nope');
      assert.equal(sprint, null);
    });
  });

  describe('list', () => {
    it('returns sprints for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeSprintRow('sprint-1', { name: 'A', goal: '', status: 'planning', startDate: '2025-01-01', endDate: '2025-01-14', projectId: null, completedAt: null }),
        makeSprintRow('sprint-2', { name: 'B', goal: '', status: 'active', startDate: '2025-02-01', endDate: '2025-02-14', projectId: null, completedAt: null }),
      ];

      const sprints = await SprintService.list('org-1');

      assert.equal(sprints.length, 2);
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by status', async () => {
      memoryFindManyImpl = async () => [
        makeSprintRow('sprint-1', { name: 'A', goal: '', status: 'planning', startDate: '2025-01-01', endDate: '2025-01-14', projectId: null, completedAt: null }),
        makeSprintRow('sprint-2', { name: 'B', goal: '', status: 'active', startDate: '2025-02-01', endDate: '2025-02-14', projectId: null, completedAt: null }),
      ];

      const sprints = await SprintService.list('org-1', { status: 'active' });
      assert.equal(sprints.length, 1);
      assert.equal(sprints[0].status, 'active');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('DB down'); };

      const sprints = await SprintService.list('org-1');
      assert.deepEqual(sprints, []);
    });
  });

  describe('update', () => {
    it('updates sprint name and goal', async () => {
      memoryFindUniqueImpl = async () =>
        makeSprintRow('sprint-1', { name: 'old', goal: 'old', status: 'planning', startDate: '2025-01-01', endDate: '2025-01-14', projectId: null, completedAt: null });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.name, 'new');
        assert.equal(content.goal, 'new goal');
        return makeSprintRow('sprint-1', content);
      };

      const sprint = await SprintService.update('sprint-1', { name: 'new', goal: 'new goal' });

      assert.ok(sprint);
      assert.equal(sprint.name, 'new');
    });

    it('returns null when sprint not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const sprint = await SprintService.update('nope', { name: 'x' });
      assert.equal(sprint, null);
    });
  });

  describe('delete', () => {
    it('deletes a sprint', async () => {
      memoryDeleteImpl = async () => ({ id: 'sprint-1' });

      const result = await SprintService.delete('sprint-1');
      assert.equal(result, true);
      assert.equal(calls[0].method, 'memory.delete');
    });

    it('returns false on error', async () => {
      memoryDeleteImpl = async () => { throw new Error('fail'); };

      const result = await SprintService.delete('sprint-1');
      assert.equal(result, false);
    });
  });

  describe('start', () => {
    it('starts a sprint (status → active)', async () => {
      memoryFindUniqueImpl = async () =>
        makeSprintRow('sprint-1', { name: 'S1', goal: '', status: 'planning', startDate: '2025-01-01', endDate: '2025-01-14', projectId: null, completedAt: null });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'active');
        return makeSprintRow('sprint-1', content);
      };

      const sprint = await SprintService.start('sprint-1');
      assert.ok(sprint);
      assert.equal(sprint.status, 'active');
    });
  });

  describe('complete', () => {
    it('completes a sprint (status → completed) and sets completedAt', async () => {
      memoryFindUniqueImpl = async () =>
        makeSprintRow('sprint-1', { name: 'S1', goal: '', status: 'active', startDate: '2025-01-01', endDate: '2025-01-14', projectId: null, completedAt: null });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'completed');
        assert.ok(content.completedAt);
        return makeSprintRow('sprint-1', content);
      };

      const sprint = await SprintService.complete('sprint-1');
      assert.ok(sprint);
      assert.equal(sprint.status, 'completed');
      assert.ok(sprint.completedAt);
    });
  });

  describe('addIssue', () => {
    it('adds an issue to a sprint (updates issue sprintId)', async () => {
      issueUpdateImpl = async (_id, input) => {
        assert.equal(input.sprintId, 'sprint-1');
        return { id: 'iss-1', title: 'A', status: 'open', estimatedHours: null, sprintId: 'sprint-1' };
      };

      const issue = await SprintService.addIssue('sprint-1', 'iss-1');
      assert.ok(issue);
      assert.equal(issue.sprintId, 'sprint-1');
    });
  });

  describe('removeIssue', () => {
    it('removes an issue from a sprint', async () => {
      issueGetImpl = async () => ({ id: 'iss-1', title: 'A', status: 'open', estimatedHours: null, sprintId: 'sprint-1' });
      issueUpdateImpl = async (_id, input) => {
        assert.equal(input.sprintId, null);
        return { id: 'iss-1', title: 'A', status: 'open', estimatedHours: null, sprintId: null };
      };

      const issue = await SprintService.removeIssue('sprint-1', 'iss-1');
      assert.ok(issue);
      assert.equal(issue.sprintId, null);
    });

    it('returns null when issue is not in the sprint', async () => {
      issueGetImpl = async () => ({ id: 'iss-1', title: 'A', status: 'open', estimatedHours: null, sprintId: 'other-sprint' });

      const issue = await SprintService.removeIssue('sprint-1', 'iss-1');
      assert.equal(issue, null);
    });
  });

  describe('getIssues', () => {
    it('returns all issues in a sprint', async () => {
      issueGetBySprintImpl = async () => [
        { id: 'iss-1', title: 'A', status: 'open', estimatedHours: null, sprintId: 'sprint-1' },
      ];

      const issues = await SprintService.getIssues('sprint-1');
      assert.equal(issues.length, 1);
      assert.equal(issues[0].sprintId, 'sprint-1');
    });
  });

  describe('getVelocity', () => {
    it('calculates velocity across completed sprints', async () => {
      // Sprint list returns completed sprints
      memoryFindManyImpl = async (args: MemoryFindManyArgs) => {
        if (args.where.type === 'sprint') {
          return [
            makeSprintRow('sprint-1', { name: 'S1', goal: '', status: 'completed', startDate: '2025-01-01', endDate: '2025-01-14', projectId: null, completedAt: '2025-01-14' }),
          ];
        }
        return [];
      };
      issueGetBySprintImpl = async () => [
        { id: 'iss-1', title: 'A', status: 'done', estimatedHours: 5, sprintId: 'sprint-1' },
        { id: 'iss-2', title: 'B', status: 'open', estimatedHours: 3, sprintId: 'sprint-1' },
      ];

      const velocity = await SprintService.getVelocity('org-1');

      assert.equal(velocity.length, 1);
      assert.equal(velocity[0].sprintId, 'sprint-1');
      assert.equal(velocity[0].points, 5); // only done issue counts
      assert.equal(velocity[0].issueCount, 1);
    });
  });

  describe('getBurndown', () => {
    it('calculates burndown data for a sprint', async () => {
      memoryFindUniqueImpl = async () =>
        makeSprintRow('sprint-1', { name: 'S1', goal: '', status: 'active', startDate: '2025-01-01', endDate: '2025-01-05', projectId: null, completedAt: null });
      issueGetBySprintImpl = async () => [
        { id: 'iss-1', title: 'A', status: 'done', estimatedHours: 8, sprintId: 'sprint-1', resolvedAt: '2025-01-02' },
        { id: 'iss-2', title: 'B', status: 'open', estimatedHours: 4, sprintId: 'sprint-1', resolvedAt: null },
      ];

      const burndown = await SprintService.getBurndown('sprint-1');

      assert.equal(burndown.totalPoints, 12);
      assert.ok(burndown.ideal.length > 0);
      assert.ok(burndown.actual.length > 0);
      // Ideal starts at total and ends at 0
      assert.equal(burndown.ideal[0].remaining, 12);
      assert.equal(burndown.ideal[burndown.ideal.length - 1].remaining, 0);
    });

    it('returns empty burndown when sprint not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const burndown = await SprintService.getBurndown('nope');
      assert.deepEqual(burndown.ideal, []);
      assert.deepEqual(burndown.actual, []);
      assert.equal(burndown.totalPoints, 0);
    });
  });

  describe('getActive', () => {
    it('returns active sprints', async () => {
      memoryFindManyImpl = async () => [
        makeSprintRow('sprint-1', { name: 'A', goal: '', status: 'active', startDate: '2025-01-01', endDate: '2025-01-14', projectId: null, completedAt: null }),
      ];

      const sprints = await SprintService.getActive('org-1');
      assert.equal(sprints.length, 1);
      assert.equal(sprints[0].status, 'active');
    });
  });

  describe('getUpcoming', () => {
    it('returns planning sprints', async () => {
      memoryFindManyImpl = async () => [
        makeSprintRow('sprint-1', { name: 'A', goal: '', status: 'planning', startDate: '2025-02-01', endDate: '2025-02-14', projectId: null, completedAt: null }),
      ];

      const sprints = await SprintService.getUpcoming('org-1');
      assert.equal(sprints.length, 1);
      assert.equal(sprints[0].status, 'planning');
    });
  });

  describe('getStats', () => {
    it('aggregates sprint stats', async () => {
      memoryFindManyImpl = async (args: MemoryFindManyArgs) => {
        if (args.where.type === 'sprint') {
          return [
            makeSprintRow('sprint-1', { name: 'A', goal: '', status: 'completed', startDate: '2025-01-01', endDate: '2025-01-14', projectId: null, completedAt: '2025-01-14' }),
            makeSprintRow('sprint-2', { name: 'B', goal: '', status: 'active', startDate: '2025-02-01', endDate: '2025-02-14', projectId: null, completedAt: null }),
          ];
        }
        return [];
      };
      issueGetBySprintImpl = async () => [
        { id: 'iss-1', title: 'A', status: 'done', estimatedHours: 5, sprintId: 'sprint-1' },
      ];

      const stats = await SprintService.getStats('org-1');

      assert.equal(stats.total, 2);
      assert.equal(stats.byStatus.completed, 1);
      assert.equal(stats.byStatus.active, 1);
      assert.equal(stats.totalIssuesCompleted, 1);
      assert.equal(stats.avgVelocity, 5);
    });

    it('returns zero stats when no sprints', async () => {
      memoryFindManyImpl = async () => [];

      const stats = await SprintService.getStats('org-1');
      assert.equal(stats.total, 0);
      assert.equal(stats.avgVelocity, 0);
    });
  });
});
