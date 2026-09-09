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
    type: 'risk',
    content: JSON.stringify(content),
    sourceId: null,
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

function riskContent(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    title: 'Test Risk',
    description: 'A test risk',
    category: 'operational',
    likelihood: 3,
    impact: 3,
    riskScore: 9,
    riskLevel: 'medium',
    owner: null,
    status: 'identified',
    mitigationPlan: '',
    tags: [],
    ...overrides,
  };
}

const { RiskService } = await import('@/lib/services/risk-service');

// ─────────────────────────────────────────────────────────────────────────────
// RiskService
// ─────────────────────────────────────────────────────────────────────────────

describe('RiskService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a risk with correct score calculation (low)', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'risk');
        const content = JSON.parse(args.data.content);
        assert.equal(content.title, 'Low Risk');
        assert.equal(content.likelihood, 2);
        assert.equal(content.impact, 2);
        assert.equal(content.riskScore, 4);
        assert.equal(content.riskLevel, 'low');
        return makeRow('r-1', content);
      };

      const risk = await RiskService.create('org-1', {
        title: 'Low Risk',
        category: 'operational',
        likelihood: 2,
        impact: 2,
        createdBy: 'user-1',
      });

      assert.ok(risk);
      assert.equal(risk.id, 'r-1');
      assert.equal(risk.riskScore, 4);
      assert.equal(risk.riskLevel, 'low');
      assert.equal(calls[0].method, 'memory.create');
    });

    it('creates a risk with critical level (5x5=25)', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.riskScore, 25);
        assert.equal(content.riskLevel, 'critical');
        return makeRow('r-2', content);
      };

      const risk = await RiskService.create('org-1', {
        title: 'Critical Risk',
        category: 'security',
        likelihood: 5,
        impact: 5,
        createdBy: 'user-1',
      });

      assert.equal(risk.riskScore, 25);
      assert.equal(risk.riskLevel, 'critical');
    });

    it('creates a risk with high level (4x4=16)', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.riskScore, 16);
        assert.equal(content.riskLevel, 'high');
        return makeRow('r-3', content);
      };

      const risk = await RiskService.create('org-1', {
        title: 'High Risk',
        category: 'financial',
        likelihood: 4,
        impact: 4,
        createdBy: 'user-1',
      });

      assert.equal(risk.riskScore, 16);
      assert.equal(risk.riskLevel, 'high');
    });
  });

  describe('get', () => {
    it('returns a risk by id', async () => {
      memoryFindUniqueImpl = async () => makeRow('r-1', riskContent());

      const risk = await RiskService.get('r-1');

      assert.ok(risk);
      assert.equal(risk.id, 'r-1');
      assert.equal(risk.title, 'Test Risk');
      assert.equal(calls[0].method, 'memory.findUnique');
    });

    it('returns null when risk not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const risk = await RiskService.get('nope');
      assert.equal(risk, null);
    });
  });

  describe('list', () => {
    it('returns risks for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeRow('r-1', riskContent({ title: 'Risk A' })),
        makeRow('r-2', riskContent({ title: 'Risk B' })),
      ];

      const risks = await RiskService.list('org-1');

      assert.equal(risks.length, 2);
      assert.equal(risks[0].id, 'r-1');
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by category', async () => {
      memoryFindManyImpl = async () => [
        makeRow('r-1', riskContent({ category: 'operational' })),
        makeRow('r-2', riskContent({ category: 'financial' })),
      ];

      const risks = await RiskService.list('org-1', { category: 'financial' });

      assert.equal(risks.length, 1);
      assert.equal(risks[0].category, 'financial');
    });

    it('filters by risk level', async () => {
      memoryFindManyImpl = async () => [
        makeRow('r-1', riskContent({ riskLevel: 'low', riskScore: 4, likelihood: 2, impact: 2 })),
        makeRow('r-2', riskContent({ riskLevel: 'critical', riskScore: 25, likelihood: 5, impact: 5 })),
      ];

      const risks = await RiskService.list('org-1', { riskLevel: 'critical' });

      assert.equal(risks.length, 1);
      assert.equal(risks[0].riskLevel, 'critical');
    });

    it('filters by search query', async () => {
      memoryFindManyImpl = async () => [
        makeRow('r-1', riskContent({ title: 'Data breach risk' })),
        makeRow('r-2', riskContent({ title: 'Budget overrun' })),
      ];

      const risks = await RiskService.list('org-1', { search: 'breach' });

      assert.equal(risks.length, 1);
      assert.equal(risks[0].title, 'Data breach risk');
    });
  });

  describe('update', () => {
    it('updates a risk and recalculates score on likelihood/impact change', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('r-1', riskContent({ likelihood: 3, impact: 3, riskScore: 9, riskLevel: 'medium' }));
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.likelihood, 5);
        assert.equal(content.impact, 5);
        assert.equal(content.riskScore, 25);
        assert.equal(content.riskLevel, 'critical');
        return makeRow('r-1', content);
      };

      const risk = await RiskService.update('r-1', { likelihood: 5, impact: 5 });

      assert.ok(risk);
      assert.equal(risk.riskScore, 25);
      assert.equal(risk.riskLevel, 'critical');
    });

    it('returns null when risk not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const risk = await RiskService.update('nope', { title: 'x' });
      assert.equal(risk, null);
    });
  });

  describe('delete', () => {
    it('deletes a risk', async () => {
      memoryDeleteImpl = async () => ({ id: 'r-1' });

      const result = await RiskService.delete('r-1');
      assert.equal(result, true);
      assert.equal(calls[0].method, 'memory.delete');
    });

    it('returns false on error', async () => {
      memoryDeleteImpl = async () => { throw new Error('fail'); };

      const result = await RiskService.delete('r-1');
      assert.equal(result, false);
    });
  });

  describe('assess', () => {
    it('assesses a risk and recalculates score', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('r-1', riskContent({ likelihood: 2, impact: 2, riskScore: 4, riskLevel: 'low' }));
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.likelihood, 4);
        assert.equal(content.impact, 4);
        assert.equal(content.riskScore, 16);
        assert.equal(content.riskLevel, 'high');
        return makeRow('r-1', content);
      };

      const risk = await RiskService.assess('r-1', 4, 4);

      assert.ok(risk);
      assert.equal(risk.riskScore, 16);
      assert.equal(risk.riskLevel, 'high');
    });
  });

  describe('setMitigationPlan', () => {
    it('sets the mitigation plan', async () => {
      memoryFindUniqueImpl = async () => makeRow('r-1', riskContent());
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.mitigationPlan, 'Implement controls');
        return makeRow('r-1', content);
      };

      const risk = await RiskService.setMitigationPlan('r-1', 'Implement controls');

      assert.ok(risk);
      assert.equal(risk.mitigationPlan, 'Implement controls');
    });
  });

  describe('changeStatus', () => {
    it('changes the risk status', async () => {
      memoryFindUniqueImpl = async () => makeRow('r-1', riskContent({ status: 'identified' }));
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'mitigating');
        return makeRow('r-1', content);
      };

      const risk = await RiskService.changeStatus('r-1', 'mitigating');

      assert.ok(risk);
      assert.equal(risk.status, 'mitigating');
    });
  });

  describe('assignOwner', () => {
    it('assigns an owner to a risk', async () => {
      memoryFindUniqueImpl = async () => makeRow('r-1', riskContent({ owner: null }));
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.owner, 'user-2');
        return makeRow('r-1', content);
      };

      const risk = await RiskService.assignOwner('r-1', 'user-2');

      assert.ok(risk);
      assert.equal(risk.owner, 'user-2');
    });
  });

  describe('getByCategory', () => {
    it('groups risks by category', async () => {
      memoryFindManyImpl = async () => [
        makeRow('r-1', riskContent({ category: 'operational' })),
        makeRow('r-2', riskContent({ category: 'operational' })),
        makeRow('r-3', riskContent({ category: 'financial' })),
      ];

      const grouped = await RiskService.getByCategory('org-1');

      assert.equal(Object.keys(grouped).length, 2);
      assert.equal(grouped.operational.length, 2);
      assert.equal(grouped.financial.length, 1);
    });
  });

  describe('getByLevel', () => {
    it('groups risks by risk level', async () => {
      memoryFindManyImpl = async () => [
        makeRow('r-1', riskContent({ riskLevel: 'low', riskScore: 4, likelihood: 2, impact: 2 })),
        makeRow('r-2', riskContent({ riskLevel: 'high', riskScore: 16, likelihood: 4, impact: 4 })),
      ];

      const grouped = await RiskService.getByLevel('org-1');

      assert.equal(grouped.low.length, 1);
      assert.equal(grouped.high.length, 1);
      assert.equal(grouped.medium.length, 0);
      assert.equal(grouped.critical.length, 0);
    });
  });

  describe('getHighRisks', () => {
    it('returns only high and critical risks', async () => {
      memoryFindManyImpl = async () => [
        makeRow('r-1', riskContent({ riskLevel: 'low', riskScore: 4, likelihood: 2, impact: 2 })),
        makeRow('r-2', riskContent({ riskLevel: 'high', riskScore: 16, likelihood: 4, impact: 4 })),
        makeRow('r-3', riskContent({ riskLevel: 'critical', riskScore: 25, likelihood: 5, impact: 5 })),
      ];

      const risks = await RiskService.getHighRisks('org-1');

      assert.equal(risks.length, 2);
      assert.equal(risks[0].riskLevel, 'high');
      assert.equal(risks[1].riskLevel, 'critical');
    });
  });

  describe('getRiskMatrix', () => {
    it('builds a 5x5 matrix with counts', async () => {
      memoryFindManyImpl = async () => [
        makeRow('r-1', riskContent({ likelihood: 1, impact: 1, riskScore: 1 })),
        makeRow('r-2', riskContent({ likelihood: 5, impact: 5, riskScore: 25 })),
        makeRow('r-3', riskContent({ likelihood: 3, impact: 3, riskScore: 9 })),
      ];

      const matrix = await RiskService.getRiskMatrix('org-1');

      assert.equal(matrix.total, 3);
      assert.equal(matrix.matrix[0][0], 1); // L=1, I=1
      assert.equal(matrix.matrix[4][4], 1); // L=5, I=5
      assert.equal(matrix.matrix[2][2], 1); // L=3, I=3
    });
  });

  describe('getStats', () => {
    it('aggregates risk stats', async () => {
      memoryFindManyImpl = async () => [
        makeRow('r-1', riskContent({ category: 'operational', riskLevel: 'low', riskScore: 4, status: 'identified', likelihood: 2, impact: 2 })),
        makeRow('r-2', riskContent({ category: 'financial', riskLevel: 'critical', riskScore: 25, status: 'mitigating', likelihood: 5, impact: 5 })),
      ];

      const stats = await RiskService.getStats('org-1');

      assert.equal(stats.totalRisks, 2);
      assert.equal(stats.byCategory.operational, 1);
      assert.equal(stats.byCategory.financial, 1);
      assert.equal(stats.byLevel.low, 1);
      assert.equal(stats.byLevel.critical, 1);
      assert.equal(stats.byStatus.identified, 1);
      assert.equal(stats.byStatus.mitigating, 1);
      assert.equal(stats.highCriticalCount, 1);
      assert.equal(stats.avgRiskScore, 14.5);
    });

    it('returns zero stats when no risks', async () => {
      memoryFindManyImpl = async () => [];

      const stats = await RiskService.getStats('org-1');

      assert.equal(stats.totalRisks, 0);
      assert.equal(stats.highCriticalCount, 0);
      assert.equal(stats.avgRiskScore, 0);
    });
  });
});
