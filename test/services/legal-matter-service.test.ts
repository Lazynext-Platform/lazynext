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
  };
  orderBy?: Record<string, unknown>;
  take?: number;
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
    type: 'legal_matter',
    content: JSON.stringify(content),
    sourceId: null,
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

function matterContent(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    title: 'Test Matter',
    description: 'A test matter',
    type: 'litigation',
    status: 'open',
    priority: 'medium',
    assignedTo: null,
    opposingParty: 'Opponent LLC',
    caseNumber: 'CV-2025-001',
    court: 'Superior Court',
    filedDate: '2025-01-01T00:00:00.000Z',
    closedDate: null,
    estimatedCost: 25000,
    actualCost: null,
    tags: [],
    ...overrides,
  };
}

const { LegalMatterService } = await import('@/lib/services/legal-matter-service');

// ─────────────────────────────────────────────────────────────────────────────
// LegalMatterService
// ─────────────────────────────────────────────────────────────────────────────

describe('LegalMatterService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a matter with defaults', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'legal_matter');
        const content = JSON.parse(args.data.content);
        assert.equal(content.title, 'IP Dispute');
        assert.equal(content.type, 'ip');
        assert.equal(content.priority, 'high');
        assert.equal(content.status, 'open');
        return makeRow('m-1', content);
      };

      const matter = await LegalMatterService.create('org-1', {
        title: 'IP Dispute',
        type: 'ip',
        priority: 'high',
        createdBy: 'user-1',
      });

      assert.ok(matter);
      assert.equal(matter.id, 'm-1');
      assert.equal(matter.title, 'IP Dispute');
      assert.equal(matter.priority, 'high');
      assert.equal(matter.status, 'open');
      assert.equal(calls[0].method, 'memory.create');
    });

    it('creates a matter with full details', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.opposingParty, 'Competitor Inc');
        assert.equal(content.caseNumber, 'CV-2025-999');
        assert.equal(content.estimatedCost, 50000);
        return makeRow('m-2', content);
      };

      const matter = await LegalMatterService.create('org-1', {
        title: 'Patent Case',
        type: 'litigation',
        priority: 'urgent',
        opposingParty: 'Competitor Inc',
        caseNumber: 'CV-2025-999',
        court: 'Federal Court',
        estimatedCost: 50000,
        createdBy: 'user-1',
      });

      assert.equal(matter.opposingParty, 'Competitor Inc');
      assert.equal(matter.caseNumber, 'CV-2025-999');
      assert.equal(matter.estimatedCost, 50000);
    });
  });

  describe('get', () => {
    it('returns a matter by id', async () => {
      memoryFindUniqueImpl = async () => makeRow('m-1', matterContent());

      const matter = await LegalMatterService.get('m-1');

      assert.ok(matter);
      assert.equal(matter.id, 'm-1');
      assert.equal(matter.title, 'Test Matter');
      assert.equal(calls[0].method, 'memory.findUnique');
    });

    it('returns null when matter not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const matter = await LegalMatterService.get('nope');
      assert.equal(matter, null);
    });
  });

  describe('list', () => {
    it('returns matters for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeRow('m-1', matterContent({ title: 'A' })),
        makeRow('m-2', matterContent({ title: 'B' })),
      ];

      const matters = await LegalMatterService.list('org-1');

      assert.equal(matters.length, 2);
      assert.equal(matters[0].id, 'm-1');
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by priority', async () => {
      memoryFindManyImpl = async () => [
        makeRow('m-1', matterContent({ priority: 'low' })),
        makeRow('m-2', matterContent({ priority: 'urgent' })),
      ];

      const matters = await LegalMatterService.list('org-1', { priority: 'urgent' });

      assert.equal(matters.length, 1);
      assert.equal(matters[0].priority, 'urgent');
    });

    it('filters by search query', async () => {
      memoryFindManyImpl = async () => [
        makeRow('m-1', matterContent({ title: 'Patent dispute', caseNumber: 'CV-001' })),
        makeRow('m-2', matterContent({ title: 'Employment issue', caseNumber: 'CV-002' })),
      ];

      const matters = await LegalMatterService.list('org-1', { search: 'patent' });

      assert.equal(matters.length, 1);
      assert.equal(matters[0].title, 'Patent dispute');
    });
  });

  describe('update', () => {
    it('updates a matter title and estimated cost', async () => {
      memoryFindUniqueImpl = async () => makeRow('m-1', matterContent());
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.title, 'Updated Matter');
        assert.equal(content.estimatedCost, 75000);
        return makeRow('m-1', content);
      };

      const matter = await LegalMatterService.update('m-1', {
        title: 'Updated Matter',
        estimatedCost: 75000,
      });

      assert.ok(matter);
      assert.equal(matter.title, 'Updated Matter');
      assert.equal(matter.estimatedCost, 75000);
    });

    it('returns null when matter not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const matter = await LegalMatterService.update('nope', { title: 'x' });
      assert.equal(matter, null);
    });
  });

  describe('delete', () => {
    it('deletes a matter', async () => {
      memoryDeleteImpl = async () => ({ id: 'm-1' });

      const result = await LegalMatterService.delete('m-1');
      assert.equal(result, true);
      assert.equal(calls[0].method, 'memory.delete');
    });

    it('returns false on error', async () => {
      memoryDeleteImpl = async () => { throw new Error('fail'); };

      const result = await LegalMatterService.delete('m-1');
      assert.equal(result, false);
    });
  });

  describe('changeStatus', () => {
    it('changes the matter status', async () => {
      memoryFindUniqueImpl = async () => makeRow('m-1', matterContent({ status: 'open' }));
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'in_progress');
        return makeRow('m-1', content);
      };

      const matter = await LegalMatterService.changeStatus('m-1', 'in_progress');

      assert.ok(matter);
      assert.equal(matter.status, 'in_progress');
    });
  });

  describe('assign', () => {
    it('assigns a matter to someone', async () => {
      memoryFindUniqueImpl = async () => makeRow('m-1', matterContent({ assignedTo: null }));
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.assignedTo, 'lawyer-1');
        return makeRow('m-1', content);
      };

      const matter = await LegalMatterService.assign('m-1', 'lawyer-1');

      assert.ok(matter);
      assert.equal(matter.assignedTo, 'lawyer-1');
    });
  });

  describe('getOpen', () => {
    it('returns open and in_progress matters', async () => {
      memoryFindManyImpl = async () => [
        makeRow('m-1', matterContent({ status: 'open' })),
        makeRow('m-2', matterContent({ status: 'in_progress' })),
        makeRow('m-3', matterContent({ status: 'closed' })),
      ];

      const matters = await LegalMatterService.getOpen('org-1');

      assert.equal(matters.length, 2);
      assert.equal(matters[0].status, 'open');
      assert.equal(matters[1].status, 'in_progress');
    });
  });

  describe('getByType', () => {
    it('groups matters by type', async () => {
      memoryFindManyImpl = async () => [
        makeRow('m-1', matterContent({ type: 'litigation' })),
        makeRow('m-2', matterContent({ type: 'compliance' })),
      ];

      const grouped = await LegalMatterService.getByType('org-1');

      assert.equal(Object.keys(grouped).length, 2);
      assert.equal(grouped.litigation.length, 1);
      assert.equal(grouped.compliance.length, 1);
    });
  });

  describe('getByStatus', () => {
    it('groups matters by status', async () => {
      memoryFindManyImpl = async () => [
        makeRow('m-1', matterContent({ status: 'open' })),
        makeRow('m-2', matterContent({ status: 'open' })),
        makeRow('m-3', matterContent({ status: 'closed' })),
      ];

      const grouped = await LegalMatterService.getByStatus('org-1');

      assert.equal(grouped.open.length, 2);
      assert.equal(grouped.closed.length, 1);
    });
  });

  describe('getStats', () => {
    it('aggregates matter stats', async () => {
      memoryFindManyImpl = async () => [
        makeRow('m-1', matterContent({ type: 'litigation', status: 'open', priority: 'high', estimatedCost: 25000, actualCost: 10000 })),
        makeRow('m-2', matterContent({ type: 'compliance', status: 'closed', priority: 'low', estimatedCost: 5000, actualCost: 3000 })),
      ];

      const stats = await LegalMatterService.getStats('org-1');

      assert.equal(stats.totalMatters, 2);
      assert.equal(stats.byType.litigation, 1);
      assert.equal(stats.byType.compliance, 1);
      assert.equal(stats.byStatus.open, 1);
      assert.equal(stats.byStatus.closed, 1);
      assert.equal(stats.byPriority.high, 1);
      assert.equal(stats.byPriority.low, 1);
      assert.equal(stats.openCount, 1);
      assert.equal(stats.totalEstimatedCost, 30000);
      assert.equal(stats.totalActualCost, 13000);
    });

    it('returns zero stats when no matters', async () => {
      memoryFindManyImpl = async () => [];

      const stats = await LegalMatterService.getStats('org-1');

      assert.equal(stats.totalMatters, 0);
      assert.equal(stats.openCount, 0);
      assert.equal(stats.totalEstimatedCost, 0);
    });
  });
});
