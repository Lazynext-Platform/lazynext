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
    type: 'legal_obligation',
    content: JSON.stringify(content),
    sourceId: content.contractId ?? null,
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

function obligationContent(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    contractId: 'c-1',
    matterId: null,
    title: 'Test Obligation',
    description: 'A test obligation',
    type: 'payment',
    dueDate: null,
    status: 'pending',
    responsibleParty: 'Finance Team',
    notes: '',
    ...overrides,
  };
}

const { LegalObligationService } = await import('@/lib/services/legal-obligation-service');

// ─────────────────────────────────────────────────────────────────────────────
// LegalObligationService
// ─────────────────────────────────────────────────────────────────────────────

describe('LegalObligationService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates an obligation with defaults', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'legal_obligation');
        const content = JSON.parse(args.data.content);
        assert.equal(content.title, 'Quarterly Payment');
        assert.equal(content.type, 'payment');
        assert.equal(content.status, 'pending');
        assert.equal(content.contractId, 'c-1');
        return makeRow('o-1', content);
      };

      const obligation = await LegalObligationService.create('org-1', {
        contractId: 'c-1',
        title: 'Quarterly Payment',
        type: 'payment',
        createdBy: 'user-1',
      });

      assert.ok(obligation);
      assert.equal(obligation.id, 'o-1');
      assert.equal(obligation.title, 'Quarterly Payment');
      assert.equal(obligation.status, 'pending');
      assert.equal(obligation.contractId, 'c-1');
      assert.equal(calls[0].method, 'memory.create');
    });

    it('creates an obligation with due date and responsible party', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.ok(content.dueDate);
        assert.equal(content.responsibleParty, 'Legal Team');
        return makeRow('o-2', content);
      };

      const obligation = await LegalObligationService.create('org-1', {
        title: 'Compliance Report',
        type: 'reporting',
        dueDate: '2025-12-31',
        responsibleParty: 'Legal Team',
        createdBy: 'user-1',
      });

      assert.ok(obligation.dueDate);
      assert.equal(obligation.responsibleParty, 'Legal Team');
    });
  });

  describe('get', () => {
    it('returns an obligation by id', async () => {
      memoryFindUniqueImpl = async () => makeRow('o-1', obligationContent());

      const obligation = await LegalObligationService.get('o-1');

      assert.ok(obligation);
      assert.equal(obligation.id, 'o-1');
      assert.equal(obligation.title, 'Test Obligation');
      assert.equal(calls[0].method, 'memory.findUnique');
    });

    it('returns null when obligation not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const obligation = await LegalObligationService.get('nope');
      assert.equal(obligation, null);
    });
  });

  describe('list', () => {
    it('returns obligations for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeRow('o-1', obligationContent({ title: 'A' })),
        makeRow('o-2', obligationContent({ title: 'B' })),
      ];

      const obligations = await LegalObligationService.list('org-1');

      assert.equal(obligations.length, 2);
      assert.equal(obligations[0].id, 'o-1');
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by contractId via sourceId', async () => {
      memoryFindManyImpl = async (args: MemoryFindManyArgs) => {
        assert.equal(args.where.sourceId, 'c-1');
        return [makeRow('o-1', obligationContent({ contractId: 'c-1' }))];
      };

      const obligations = await LegalObligationService.list('org-1', { contractId: 'c-1' });

      assert.equal(obligations.length, 1);
    });

    it('filters by status', async () => {
      memoryFindManyImpl = async () => [
        makeRow('o-1', obligationContent({ status: 'pending' })),
        makeRow('o-2', obligationContent({ status: 'fulfilled' })),
      ];

      const obligations = await LegalObligationService.list('org-1', { status: 'fulfilled' });

      assert.equal(obligations.length, 1);
      assert.equal(obligations[0].status, 'fulfilled');
    });
  });

  describe('update', () => {
    it('updates an obligation title and notes', async () => {
      memoryFindUniqueImpl = async () => makeRow('o-1', obligationContent());
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.title, 'Updated Obligation');
        assert.equal(content.notes, 'Important note');
        return makeRow('o-1', content);
      };

      const obligation = await LegalObligationService.update('o-1', {
        title: 'Updated Obligation',
        notes: 'Important note',
      });

      assert.ok(obligation);
      assert.equal(obligation.title, 'Updated Obligation');
      assert.equal(obligation.notes, 'Important note');
    });

    it('returns null when obligation not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const obligation = await LegalObligationService.update('nope', { title: 'x' });
      assert.equal(obligation, null);
    });
  });

  describe('delete', () => {
    it('deletes an obligation', async () => {
      memoryDeleteImpl = async () => ({ id: 'o-1' });

      const result = await LegalObligationService.delete('o-1');
      assert.equal(result, true);
      assert.equal(calls[0].method, 'memory.delete');
    });

    it('returns false on error', async () => {
      memoryDeleteImpl = async () => { throw new Error('fail'); };

      const result = await LegalObligationService.delete('o-1');
      assert.equal(result, false);
    });
  });

  describe('changeStatus', () => {
    it('changes the obligation status', async () => {
      memoryFindUniqueImpl = async () => makeRow('o-1', obligationContent({ status: 'pending' }));
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'fulfilled');
        return makeRow('o-1', content);
      };

      const obligation = await LegalObligationService.changeStatus('o-1', 'fulfilled');

      assert.ok(obligation);
      assert.equal(obligation.status, 'fulfilled');
    });
  });

  describe('getByContract', () => {
    it('returns obligations for a contract', async () => {
      memoryFindManyImpl = async (args: MemoryFindManyArgs) => {
        assert.equal(args.where.sourceId, 'c-1');
        return [
          makeRow('o-1', obligationContent({ contractId: 'c-1' })),
          makeRow('o-2', obligationContent({ contractId: 'c-1', title: 'Second' })),
        ];
      };

      const obligations = await LegalObligationService.getByContract('c-1');

      assert.equal(obligations.length, 2);
    });
  });

  describe('getByMatter', () => {
    it('returns obligations for a matter', async () => {
      memoryFindManyImpl = async () => [
        makeRow('o-1', obligationContent({ matterId: 'm-1', contractId: null })),
        makeRow('o-2', obligationContent({ matterId: 'm-2', contractId: null })),
        makeRow('o-3', obligationContent({ matterId: null, contractId: 'c-1' })),
      ];

      const obligations = await LegalObligationService.getByMatter('m-1');

      assert.equal(obligations.length, 1);
      assert.equal(obligations[0].matterId, 'm-1');
    });
  });

  describe('getUpcoming', () => {
    it('returns pending obligations due within N days', async () => {
      const nearFuture = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
      const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      memoryFindManyImpl = async () => [
        makeRow('o-1', obligationContent({ status: 'pending', dueDate: nearFuture })),
        makeRow('o-2', obligationContent({ status: 'pending', dueDate: farFuture })),
        makeRow('o-3', obligationContent({ status: 'fulfilled', dueDate: nearFuture })),
      ];

      const upcoming = await LegalObligationService.getUpcoming('org-1', 30);

      assert.equal(upcoming.length, 1);
      assert.equal(upcoming[0].id, 'o-1');
    });
  });

  describe('getOverdue', () => {
    it('returns obligations past due date and not fulfilled', async () => {
      const pastDate = new Date('2020-01-01').toISOString();
      const futureDate = new Date('2030-01-01').toISOString();
      memoryFindManyImpl = async () => [
        makeRow('o-1', obligationContent({ dueDate: pastDate, status: 'pending' })),
        makeRow('o-2', obligationContent({ dueDate: pastDate, status: 'fulfilled' })),
        makeRow('o-3', obligationContent({ dueDate: futureDate, status: 'pending' })),
        makeRow('o-4', obligationContent({ dueDate: pastDate, status: 'waived' })),
      ];

      const overdue = await LegalObligationService.getOverdue('org-1');

      assert.equal(overdue.length, 1);
      assert.equal(overdue[0].id, 'o-1');
    });
  });

  describe('getBreached', () => {
    it('returns breached obligations', async () => {
      memoryFindManyImpl = async () => [
        makeRow('o-1', obligationContent({ status: 'pending' })),
        makeRow('o-2', obligationContent({ status: 'breached' })),
        makeRow('o-3', obligationContent({ status: 'fulfilled' })),
      ];

      const breached = await LegalObligationService.getBreached('org-1');

      assert.equal(breached.length, 1);
      assert.equal(breached[0].status, 'breached');
    });
  });

  describe('getStats', () => {
    it('aggregates obligation stats', async () => {
      const nearFuture = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
      const pastDate = new Date('2020-01-01').toISOString();
      memoryFindManyImpl = async () => [
        makeRow('o-1', obligationContent({ type: 'payment', status: 'pending', dueDate: nearFuture })),
        makeRow('o-2', obligationContent({ type: 'compliance', status: 'breached', dueDate: pastDate })),
      ];

      const stats = await LegalObligationService.getStats('org-1');

      assert.equal(stats.totalObligations, 2);
      assert.equal(stats.byType.payment, 1);
      assert.equal(stats.byType.compliance, 1);
      assert.equal(stats.byStatus.pending, 1);
      assert.equal(stats.byStatus.breached, 1);
      assert.equal(stats.overdueCount, 1);
      assert.equal(stats.upcomingCount, 1);
    });

    it('returns zero stats when no obligations', async () => {
      memoryFindManyImpl = async () => [];

      const stats = await LegalObligationService.getStats('org-1');

      assert.equal(stats.totalObligations, 0);
      assert.equal(stats.overdueCount, 0);
      assert.equal(stats.upcomingCount, 0);
    });
  });
});
