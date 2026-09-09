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
    type: 'risk_mitigation',
    content: JSON.stringify(content),
    sourceId: content.riskId ?? null,
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

function mitigationContent(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    riskId: 'r-1',
    action: 'Implement controls',
    type: 'preventive',
    owner: null,
    dueDate: null,
    status: 'planned',
    cost: null,
    effectiveness: null,
    ...overrides,
  };
}

const { RiskMitigationService } = await import('@/lib/services/risk-mitigation-service');

// ─────────────────────────────────────────────────────────────────────────────
// RiskMitigationService
// ─────────────────────────────────────────────────────────────────────────────

describe('RiskMitigationService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a mitigation action', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'risk_mitigation');
        assert.equal(args.data.sourceId, 'r-1');
        const content = JSON.parse(args.data.content);
        assert.equal(content.action, 'Implement controls');
        assert.equal(content.type, 'preventive');
        assert.equal(content.status, 'planned');
        return makeRow('m-1', content);
      };

      const mitigation = await RiskMitigationService.create('org-1', {
        riskId: 'r-1',
        action: 'Implement controls',
        type: 'preventive',
        createdBy: 'user-1',
      });

      assert.ok(mitigation);
      assert.equal(mitigation.id, 'm-1');
      assert.equal(mitigation.action, 'Implement controls');
      assert.equal(mitigation.type, 'preventive');
      assert.equal(calls[0].method, 'memory.create');
    });

    it('creates a mitigation with due date and effectiveness', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.ok(content.dueDate);
        assert.equal(content.effectiveness, 4);
        return makeRow('m-2', content);
      };

      const mitigation = await RiskMitigationService.create('org-1', {
        riskId: 'r-1',
        action: 'Monitor systems',
        type: 'detective',
        dueDate: '2025-12-31',
        effectiveness: 4,
        createdBy: 'user-1',
      });

      assert.ok(mitigation.dueDate);
      assert.equal(mitigation.effectiveness, 4);
    });
  });

  describe('get', () => {
    it('returns a mitigation by id', async () => {
      memoryFindUniqueImpl = async () => makeRow('m-1', mitigationContent());

      const mitigation = await RiskMitigationService.get('m-1');

      assert.ok(mitigation);
      assert.equal(mitigation.id, 'm-1');
      assert.equal(mitigation.action, 'Implement controls');
      assert.equal(calls[0].method, 'memory.findUnique');
    });

    it('returns null when mitigation not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const mitigation = await RiskMitigationService.get('nope');
      assert.equal(mitigation, null);
    });
  });

  describe('list', () => {
    it('returns mitigations for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeRow('m-1', mitigationContent({ action: 'A' })),
        makeRow('m-2', mitigationContent({ action: 'B' })),
      ];

      const mitigations = await RiskMitigationService.list('org-1');

      assert.equal(mitigations.length, 2);
      assert.equal(mitigations[0].id, 'm-1');
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by riskId via sourceId', async () => {
      memoryFindManyImpl = async (args: MemoryFindManyArgs) => {
        assert.equal(args.where.sourceId, 'r-1');
        return [makeRow('m-1', mitigationContent({ riskId: 'r-1' }))];
      };

      const mitigations = await RiskMitigationService.list('org-1', { riskId: 'r-1' });

      assert.equal(mitigations.length, 1);
    });

    it('filters by status', async () => {
      memoryFindManyImpl = async () => [
        makeRow('m-1', mitigationContent({ status: 'planned' })),
        makeRow('m-2', mitigationContent({ status: 'completed' })),
      ];

      const mitigations = await RiskMitigationService.list('org-1', { status: 'completed' });

      assert.equal(mitigations.length, 1);
      assert.equal(mitigations[0].status, 'completed');
    });
  });

  describe('update', () => {
    it('updates a mitigation action', async () => {
      memoryFindUniqueImpl = async () => makeRow('m-1', mitigationContent());
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.action, 'Updated action');
        assert.equal(content.effectiveness, 5);
        return makeRow('m-1', content);
      };

      const mitigation = await RiskMitigationService.update('m-1', {
        action: 'Updated action',
        effectiveness: 5,
      });

      assert.ok(mitigation);
      assert.equal(mitigation.action, 'Updated action');
      assert.equal(mitigation.effectiveness, 5);
    });

    it('returns null when mitigation not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const mitigation = await RiskMitigationService.update('nope', { action: 'x' });
      assert.equal(mitigation, null);
    });
  });

  describe('delete', () => {
    it('deletes a mitigation', async () => {
      memoryDeleteImpl = async () => ({ id: 'm-1' });

      const result = await RiskMitigationService.delete('m-1');
      assert.equal(result, true);
      assert.equal(calls[0].method, 'memory.delete');
    });

    it('returns false on error', async () => {
      memoryDeleteImpl = async () => { throw new Error('fail'); };

      const result = await RiskMitigationService.delete('m-1');
      assert.equal(result, false);
    });
  });

  describe('changeStatus', () => {
    it('changes the mitigation status', async () => {
      memoryFindUniqueImpl = async () => makeRow('m-1', mitigationContent({ status: 'planned' }));
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'completed');
        return makeRow('m-1', content);
      };

      const mitigation = await RiskMitigationService.changeStatus('m-1', 'completed');

      assert.ok(mitigation);
      assert.equal(mitigation.status, 'completed');
    });
  });

  describe('getByRisk', () => {
    it('returns all mitigations for a risk', async () => {
      memoryFindManyImpl = async (args: MemoryFindManyArgs) => {
        assert.equal(args.where.sourceId, 'r-1');
        return [
          makeRow('m-1', mitigationContent({ riskId: 'r-1' })),
          makeRow('m-2', mitigationContent({ riskId: 'r-1', action: 'Second' })),
        ];
      };

      const mitigations = await RiskMitigationService.getByRisk('r-1');

      assert.equal(mitigations.length, 2);
    });
  });

  describe('getOverdue', () => {
    it('returns mitigations past due date and not completed', async () => {
      const pastDate = new Date('2020-01-01').toISOString();
      const futureDate = new Date('2030-01-01').toISOString();
      memoryFindManyImpl = async () => [
        makeRow('m-1', mitigationContent({ dueDate: pastDate, status: 'planned' })),
        makeRow('m-2', mitigationContent({ dueDate: pastDate, status: 'completed' })),
        makeRow('m-3', mitigationContent({ dueDate: futureDate, status: 'planned' })),
      ];

      const overdue = await RiskMitigationService.getOverdue('org-1');

      assert.equal(overdue.length, 1);
      assert.equal(overdue[0].id, 'm-1');
    });
  });

  describe('getStats', () => {
    it('aggregates mitigation stats', async () => {
      const pastDate = new Date('2020-01-01').toISOString();
      memoryFindManyImpl = async () => [
        makeRow('m-1', mitigationContent({ status: 'planned', type: 'preventive', dueDate: pastDate, effectiveness: 3 })),
        makeRow('m-2', mitigationContent({ status: 'completed', type: 'corrective', effectiveness: 4 })),
      ];

      const stats = await RiskMitigationService.getStats('org-1');

      assert.equal(stats.totalMitigations, 2);
      assert.equal(stats.byStatus.planned, 1);
      assert.equal(stats.byStatus.completed, 1);
      assert.equal(stats.byType.preventive, 1);
      assert.equal(stats.byType.corrective, 1);
      assert.equal(stats.overdueCount, 1);
      assert.equal(stats.avgEffectiveness, 3.5);
    });

    it('returns zero stats when no mitigations', async () => {
      memoryFindManyImpl = async () => [];

      const stats = await RiskMitigationService.getStats('org-1');

      assert.equal(stats.totalMitigations, 0);
      assert.equal(stats.overdueCount, 0);
      assert.equal(stats.avgEffectiveness, 0);
    });
  });
});
