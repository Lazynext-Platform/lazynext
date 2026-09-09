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

function resetMock(): void {
  calls.length = 0;
  memoryFindManyImpl = async () => [];
  memoryFindUniqueImpl = async () => null;
  memoryCreateImpl = async () => ({});
  memoryUpdateImpl = async () => ({});
  memoryDeleteImpl = async () => ({});
}

function makeRow(id: string, content: Record<string, unknown>, overrides: Partial<Record<string, unknown>> = {}): unknown {
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

const { IssueService } = await import('@/lib/services/issue-service');

// ─────────────────────────────────────────────────────────────────────────────
// IssueService
// ─────────────────────────────────────────────────────────────────────────────

describe('IssueService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates an issue with defaults (open status)', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'issue');
        const content = JSON.parse(args.data.content);
        assert.equal(content.status, 'open');
        assert.equal(content.type, 'bug');
        assert.equal(content.priority, 'high');
        assert.equal(content.title, 'Login fails');
        assert.deepEqual(content.labels, []);
        return makeRow('iss-1', content);
      };

      const issue = await IssueService.create('org-1', {
        title: 'Login fails',
        type: 'bug',
        priority: 'high',
        createdBy: 'user-1',
      });

      assert.ok(issue);
      assert.equal(issue.id, 'iss-1');
      assert.equal(issue.title, 'Login fails');
      assert.equal(issue.status, 'open');
      assert.equal(issue.type, 'bug');
      assert.equal(calls[0].method, 'memory.create');
    });

    it('creates an issue with labels and estimated hours', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.deepEqual(content.labels, ['frontend', 'urgent']);
        assert.equal(content.estimatedHours, 8);
        return makeRow('iss-2', content);
      };

      const issue = await IssueService.create('org-1', {
        title: 'Fix nav',
        type: 'task',
        priority: 'medium',
        labels: ['frontend', 'urgent'],
        estimatedHours: 8,
        createdBy: 'user-1',
      });

      assert.deepEqual(issue.labels, ['frontend', 'urgent']);
      assert.equal(issue.estimatedHours, 8);
    });

    it('sets resolvedAt when created with closed status', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.ok(content.resolvedAt);
        return makeRow('iss-3', content);
      };

      const issue = await IssueService.create('org-1', {
        title: 'Done task',
        type: 'task',
        priority: 'low',
        status: 'done',
        createdBy: 'user-1',
      });

      assert.ok(issue.resolvedAt);
    });
  });

  describe('get', () => {
    it('returns an issue by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('iss-1', {
          title: 'Bug 1', description: '', type: 'bug', priority: 'high',
          severity: null, status: 'open', assigneeId: null, reporterId: null,
          projectId: null, sprintId: null, labels: [], estimatedHours: null,
          dueDate: null, resolvedAt: null,
        });

      const issue = await IssueService.get('iss-1');

      assert.ok(issue);
      assert.equal(issue.id, 'iss-1');
      assert.equal(issue.title, 'Bug 1');
      assert.equal(calls[0].method, 'memory.findUnique');
    });

    it('returns null when issue not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const issue = await IssueService.get('nope');
      assert.equal(issue, null);
    });
  });

  describe('list', () => {
    it('returns issues for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeRow('iss-1', { title: 'A', description: '', type: 'bug', priority: 'high', severity: null, status: 'open', assigneeId: null, reporterId: null, projectId: null, sprintId: null, labels: [], estimatedHours: null, dueDate: null, resolvedAt: null }),
        makeRow('iss-2', { title: 'B', description: '', type: 'feature', priority: 'low', severity: null, status: 'open', assigneeId: null, reporterId: null, projectId: null, sprintId: null, labels: [], estimatedHours: null, dueDate: null, resolvedAt: null }),
      ];

      const issues = await IssueService.list('org-1');

      assert.equal(issues.length, 2);
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by type', async () => {
      memoryFindManyImpl = async () => [
        makeRow('iss-1', { title: 'A', description: '', type: 'bug', priority: 'high', severity: null, status: 'open', assigneeId: null, reporterId: null, projectId: null, sprintId: null, labels: [], estimatedHours: null, dueDate: null, resolvedAt: null }),
        makeRow('iss-2', { title: 'B', description: '', type: 'feature', priority: 'low', severity: null, status: 'open', assigneeId: null, reporterId: null, projectId: null, sprintId: null, labels: [], estimatedHours: null, dueDate: null, resolvedAt: null }),
      ];

      const issues = await IssueService.list('org-1', { type: 'bug' });
      assert.equal(issues.length, 1);
      assert.equal(issues[0].type, 'bug');
    });

    it('filters by priority and status', async () => {
      memoryFindManyImpl = async () => [
        makeRow('iss-1', { title: 'A', description: '', type: 'bug', priority: 'high', severity: null, status: 'open', assigneeId: null, reporterId: null, projectId: null, sprintId: null, labels: [], estimatedHours: null, dueDate: null, resolvedAt: null }),
        makeRow('iss-2', { title: 'B', description: '', type: 'feature', priority: 'low', severity: null, status: 'done', assigneeId: null, reporterId: null, projectId: null, sprintId: null, labels: [], estimatedHours: null, dueDate: null, resolvedAt: null }),
      ];

      const issues = await IssueService.list('org-1', { priority: 'low', status: 'done' });
      assert.equal(issues.length, 1);
      assert.equal(issues[0].priority, 'low');
      assert.equal(issues[0].status, 'done');
    });

    it('filters by search query', async () => {
      memoryFindManyImpl = async () => [
        makeRow('iss-1', { title: 'Login bug', description: '', type: 'bug', priority: 'high', severity: null, status: 'open', assigneeId: null, reporterId: null, projectId: null, sprintId: null, labels: [], estimatedHours: null, dueDate: null, resolvedAt: null }),
        makeRow('iss-2', { title: 'Feature request', description: '', type: 'feature', priority: 'low', severity: null, status: 'open', assigneeId: null, reporterId: null, projectId: null, sprintId: null, labels: [], estimatedHours: null, dueDate: null, resolvedAt: null }),
      ];

      const issues = await IssueService.list('org-1', { search: 'login' });
      assert.equal(issues.length, 1);
      assert.equal(issues[0].title, 'Login bug');
    });

    it('filters by labels', async () => {
      memoryFindManyImpl = async () => [
        makeRow('iss-1', { title: 'A', description: '', type: 'bug', priority: 'high', severity: null, status: 'open', assigneeId: null, reporterId: null, projectId: null, sprintId: null, labels: ['frontend'], estimatedHours: null, dueDate: null, resolvedAt: null }),
        makeRow('iss-2', { title: 'B', description: '', type: 'feature', priority: 'low', severity: null, status: 'open', assigneeId: null, reporterId: null, projectId: null, sprintId: null, labels: ['backend'], estimatedHours: null, dueDate: null, resolvedAt: null }),
      ];

      const issues = await IssueService.list('org-1', { labels: ['frontend'] });
      assert.equal(issues.length, 1);
      assert.ok(issues[0].labels.includes('frontend'));
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memoryFindManyImpl = async () => { throw new Error('DB down'); };

      const issues = await IssueService.list('org-1');
      assert.deepEqual(issues, []);
    });
  });

  describe('update', () => {
    it('updates issue title and description', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('iss-1', { title: 'old', description: 'old', type: 'bug', priority: 'high', severity: null, status: 'open', assigneeId: null, reporterId: null, projectId: null, sprintId: null, labels: [], estimatedHours: null, dueDate: null, resolvedAt: null });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.title, 'new');
        assert.equal(content.description, 'new desc');
        return makeRow('iss-1', content);
      };

      const issue = await IssueService.update('iss-1', { title: 'new', description: 'new desc' });

      assert.ok(issue);
      assert.equal(issue.title, 'new');
    });

    it('sets resolvedAt when status changes to done', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('iss-1', { title: 'x', description: '', type: 'bug', priority: 'high', severity: null, status: 'open', assigneeId: null, reporterId: null, projectId: null, sprintId: null, labels: [], estimatedHours: null, dueDate: null, resolvedAt: null });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'done');
        assert.ok(content.resolvedAt);
        return makeRow('iss-1', content);
      };

      const issue = await IssueService.update('iss-1', { status: 'done' });
      assert.ok(issue);
      assert.ok(issue.resolvedAt);
    });

    it('returns null when issue not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const issue = await IssueService.update('nope', { title: 'x' });
      assert.equal(issue, null);
    });
  });

  describe('delete', () => {
    it('deletes an issue', async () => {
      memoryDeleteImpl = async () => ({ id: 'iss-1' });

      const result = await IssueService.delete('iss-1');
      assert.equal(result, true);
      assert.equal(calls[0].method, 'memory.delete');
    });

    it('returns false on error', async () => {
      memoryDeleteImpl = async () => { throw new Error('fail'); };

      const result = await IssueService.delete('iss-1');
      assert.equal(result, false);
    });
  });

  describe('assign', () => {
    it('assigns an issue to a user', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('iss-1', { title: 'x', description: '', type: 'bug', priority: 'high', severity: null, status: 'open', assigneeId: null, reporterId: null, projectId: null, sprintId: null, labels: [], estimatedHours: null, dueDate: null, resolvedAt: null });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.assigneeId, 'u2');
        return makeRow('iss-1', content);
      };

      const issue = await IssueService.assign('iss-1', 'u2');
      assert.ok(issue);
      assert.equal(issue.assigneeId, 'u2');
    });
  });

  describe('changeStatus', () => {
    it('changes the status of an issue', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('iss-1', { title: 'x', description: '', type: 'bug', priority: 'high', severity: null, status: 'open', assigneeId: null, reporterId: null, projectId: null, sprintId: null, labels: [], estimatedHours: null, dueDate: null, resolvedAt: null });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'in_progress');
        return makeRow('iss-1', content);
      };

      const issue = await IssueService.changeStatus('iss-1', 'in_progress');
      assert.ok(issue);
      assert.equal(issue.status, 'in_progress');
    });
  });

  describe('changePriority', () => {
    it('changes the priority of an issue', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('iss-1', { title: 'x', description: '', type: 'bug', priority: 'low', severity: null, status: 'open', assigneeId: null, reporterId: null, projectId: null, sprintId: null, labels: [], estimatedHours: null, dueDate: null, resolvedAt: null });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.priority, 'critical');
        return makeRow('iss-1', content);
      };

      const issue = await IssueService.changePriority('iss-1', 'critical');
      assert.ok(issue);
      assert.equal(issue.priority, 'critical');
    });
  });

  describe('addLabel', () => {
    it('adds a label to an issue', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('iss-1', { title: 'x', description: '', type: 'bug', priority: 'high', severity: null, status: 'open', assigneeId: null, reporterId: null, projectId: null, sprintId: null, labels: ['existing'], estimatedHours: null, dueDate: null, resolvedAt: null });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.ok(content.labels.includes('new-label'));
        return makeRow('iss-1', content);
      };

      const issue = await IssueService.addLabel('iss-1', 'new-label');
      assert.ok(issue);
      assert.ok(issue.labels.includes('new-label'));
    });

    it('does not add duplicate labels', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('iss-1', { title: 'x', description: '', type: 'bug', priority: 'high', severity: null, status: 'open', assigneeId: null, reporterId: null, projectId: null, sprintId: null, labels: ['dup'], estimatedHours: null, dueDate: null, resolvedAt: null });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.labels.filter((l: string) => l === 'dup').length, 1);
        return makeRow('iss-1', content);
      };

      const issue = await IssueService.addLabel('iss-1', 'dup');
      assert.ok(issue);
      assert.equal(issue.labels.filter((l) => l === 'dup').length, 1);
    });
  });

  describe('removeLabel', () => {
    it('removes a label from an issue', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('iss-1', { title: 'x', description: '', type: 'bug', priority: 'high', severity: null, status: 'open', assigneeId: null, reporterId: null, projectId: null, sprintId: null, labels: ['a', 'b'], estimatedHours: null, dueDate: null, resolvedAt: null });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.ok(!content.labels.includes('a'));
        return makeRow('iss-1', content);
      };

      const issue = await IssueService.removeLabel('iss-1', 'a');
      assert.ok(issue);
      assert.ok(!issue.labels.includes('a'));
    });
  });

  describe('getByProject', () => {
    it('returns issues for a project', async () => {
      memoryFindManyImpl = async () => [
        makeRow('iss-1', { title: 'A', description: '', type: 'bug', priority: 'high', severity: null, status: 'open', assigneeId: null, reporterId: null, projectId: 'proj-1', sprintId: null, labels: [], estimatedHours: null, dueDate: null, resolvedAt: null }, { sourceId: 'proj-1' }),
        makeRow('iss-2', { title: 'B', description: '', type: 'feature', priority: 'low', severity: null, status: 'open', assigneeId: null, reporterId: null, projectId: 'proj-1', sprintId: null, labels: [], estimatedHours: null, dueDate: null, resolvedAt: null }, { sourceId: 'proj-1' }),
      ];

      const issues = await IssueService.getByProject('proj-1');
      assert.equal(issues.length, 2);
    });
  });

  describe('getBySprint', () => {
    it('returns issues in a sprint', async () => {
      memoryFindManyImpl = async () => [
        makeRow('iss-1', { title: 'A', description: '', type: 'bug', priority: 'high', severity: null, status: 'open', assigneeId: null, reporterId: null, projectId: null, sprintId: 'sprint-1', labels: [], estimatedHours: null, dueDate: null, resolvedAt: null }),
        makeRow('iss-2', { title: 'B', description: '', type: 'feature', priority: 'low', severity: null, status: 'open', assigneeId: null, reporterId: null, projectId: null, sprintId: 'sprint-2', labels: [], estimatedHours: null, dueDate: null, resolvedAt: null }),
      ];

      const issues = await IssueService.getBySprint('sprint-1');
      assert.equal(issues.length, 1);
      assert.equal(issues[0].sprintId, 'sprint-1');
    });
  });

  describe('getBacklog', () => {
    it('returns issues not in a sprint', async () => {
      memoryFindManyImpl = async () => [
        makeRow('iss-1', { title: 'A', description: '', type: 'bug', priority: 'high', severity: null, status: 'open', assigneeId: null, reporterId: null, projectId: null, sprintId: null, labels: [], estimatedHours: null, dueDate: null, resolvedAt: null }),
        makeRow('iss-2', { title: 'B', description: '', type: 'feature', priority: 'low', severity: null, status: 'open', assigneeId: null, reporterId: null, projectId: null, sprintId: 'sprint-1', labels: [], estimatedHours: null, dueDate: null, resolvedAt: null }),
      ];

      const issues = await IssueService.getBacklog('org-1');
      assert.equal(issues.length, 1);
      assert.ok(!issues[0].sprintId);
    });
  });

  describe('getByStatus', () => {
    it('groups issues by status', async () => {
      memoryFindManyImpl = async () => [
        makeRow('iss-1', { title: 'A', description: '', type: 'bug', priority: 'high', severity: null, status: 'open', assigneeId: null, reporterId: null, projectId: null, sprintId: null, labels: [], estimatedHours: null, dueDate: null, resolvedAt: null }),
        makeRow('iss-2', { title: 'B', description: '', type: 'feature', priority: 'low', severity: null, status: 'in_progress', assigneeId: null, reporterId: null, projectId: null, sprintId: null, labels: [], estimatedHours: null, dueDate: null, resolvedAt: null }),
        makeRow('iss-3', { title: 'C', description: '', type: 'task', priority: 'medium', severity: null, status: 'open', assigneeId: null, reporterId: null, projectId: null, sprintId: null, labels: [], estimatedHours: null, dueDate: null, resolvedAt: null }),
      ];

      const grouped = await IssueService.getByStatus('org-1');
      assert.equal(grouped.open.length, 2);
      assert.equal(grouped.in_progress.length, 1);
      assert.equal(grouped.done.length, 0);
    });
  });

  describe('getStats', () => {
    it('aggregates issue stats', async () => {
      memoryFindManyImpl = async () => [
        makeRow('iss-1', { title: 'A', description: '', type: 'bug', priority: 'high', severity: null, status: 'open', assigneeId: null, reporterId: null, projectId: null, sprintId: null, labels: [], estimatedHours: null, dueDate: null, resolvedAt: null }),
        makeRow('iss-2', { title: 'B', description: '', type: 'feature', priority: 'low', severity: null, status: 'done', assigneeId: null, reporterId: null, projectId: null, sprintId: null, labels: [], estimatedHours: null, dueDate: null, resolvedAt: '2025-01-02T00:00:00.000Z' }),
        makeRow('iss-3', { title: 'C', description: '', type: 'task', priority: 'medium', severity: null, status: 'closed', assigneeId: null, reporterId: null, projectId: null, sprintId: null, labels: [], estimatedHours: null, dueDate: null, resolvedAt: '2025-01-03T00:00:00.000Z' }),
      ];

      const stats = await IssueService.getStats('org-1');

      assert.equal(stats.total, 3);
      assert.equal(stats.byType.bug, 1);
      assert.equal(stats.byType.feature, 1);
      assert.equal(stats.byType.task, 1);
      assert.equal(stats.openCount, 1);
      assert.equal(stats.closedCount, 2);
      assert.ok(stats.avgResolutionMs > 0);
    });

    it('returns zero stats when no issues', async () => {
      memoryFindManyImpl = async () => [];

      const stats = await IssueService.getStats('org-1');
      assert.equal(stats.total, 0);
      assert.equal(stats.openCount, 0);
      assert.equal(stats.avgResolutionMs, 0);
    });
  });
});
