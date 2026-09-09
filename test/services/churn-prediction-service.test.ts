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

let memoryFindManyImpl: (args: unknown) => Promise<unknown[]> = async () => [];
let memoryFindUniqueImpl: (args: unknown) => Promise<unknown> = async () => null;
let memoryCreateImpl: (args: unknown) => Promise<unknown> = async () => ({});
let memoryUpdateImpl: (args: unknown) => Promise<unknown> = async () => ({});
let memoryDeleteImpl: (args: unknown) => Promise<unknown> = async () => ({});

let customerFindManyImpl: (args: unknown) => Promise<unknown[]> = async () => [];
let customerFindUniqueImpl: (args: unknown) => Promise<unknown> = async () => null;

let ticketFindManyImpl: (args: unknown) => Promise<unknown[]> = async () => [];

const prismaMock = {
  memory: {
    findMany: (args: unknown): Promise<unknown[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
    },
    findUnique: (args: unknown): Promise<unknown> => {
      calls.push({ method: 'memory.findUnique', args });
      return memoryFindUniqueImpl(args);
    },
    create: (args: unknown): Promise<unknown> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
    update: (args: unknown): Promise<unknown> => {
      calls.push({ method: 'memory.update', args });
      return memoryUpdateImpl(args);
    },
    delete: (args: unknown): Promise<unknown> => {
      calls.push({ method: 'memory.delete', args });
      return memoryDeleteImpl(args);
    },
  },
  customer: {
    findMany: (args: unknown): Promise<unknown[]> => {
      calls.push({ method: 'customer.findMany', args });
      return customerFindManyImpl(args);
    },
    findUnique: (args: unknown): Promise<unknown> => {
      calls.push({ method: 'customer.findUnique', args });
      return customerFindUniqueImpl(args);
    },
  },
  ticket: {
    findMany: (args: unknown): Promise<unknown[]> => {
      calls.push({ method: 'ticket.findMany', args });
      return ticketFindManyImpl(args);
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
  customerFindManyImpl = async () => [];
  customerFindUniqueImpl = async () => null;
  ticketFindManyImpl = async () => [];
}

function makeCustomer(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    organizationId: 'org-1',
    name: `Customer ${id}`,
    email: 'test@test.com',
    type: 'customer',
    status: 'won',
    lastContactedAt: new Date(),
    ...overrides,
  };
}

function makeTicket(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    customerId: 'c1',
    status: 'open',
    createdAt: new Date(),
    ...overrides,
  };
}

const { ChurnPredictionService } = await import('@/lib/services/churn-prediction-service');

// ─────────────────────────────────────────────────────────────────────────────
// ChurnPredictionService Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ChurnPredictionService', () => {
  beforeEach(() => { resetMock(); });

  describe('predict', () => {
    it('returns low risk for healthy customer', async () => {
      customerFindUniqueImpl = async () => makeCustomer('c1', {
        lastContactedAt: new Date(), // recently contacted
        status: 'won',
        type: 'customer',
      });
      ticketFindManyImpl = async () => [];
      memoryFindManyImpl = async () => [];

      const result = await ChurnPredictionService.predict('c1');

      assert.ok(result);
      assert.equal(result.customerId, 'c1');
      assert.equal(result.riskLevel, 'low');
      assert.ok(result.riskScore < 30);
    });

    it('returns high risk for customer with no contact and many tickets', async () => {
      customerFindUniqueImpl = async () => makeCustomer('c1', {
        lastContactedAt: new Date('2020-01-01'), // very old
        status: 'won',
        type: 'customer',
      });
      ticketFindManyImpl = async () => {
        const tickets = [];
        for (let i = 0; i < 6; i++) {
          tickets.push(makeTicket(`t${i}`, { status: 'open', createdAt: new Date() }));
        }
        return tickets;
      };
      memoryFindManyImpl = async () => [];

      const result = await ChurnPredictionService.predict('c1');

      assert.ok(result);
      assert.ok(result.riskScore >= 50);
      assert.ok(result.factors.length > 0);
      assert.ok(result.recommendations.length > 0);
    });

    it('returns null when customer not found', async () => {
      customerFindUniqueImpl = async () => null;

      const result = await ChurnPredictionService.predict('nope');
      assert.equal(result, null);
    });

    it('includes churned type as high risk factor', async () => {
      customerFindUniqueImpl = async () => makeCustomer('c1', {
        type: 'churned',
        status: 'lost',
        lastContactedAt: new Date(),
      });
      ticketFindManyImpl = async () => [];
      memoryFindManyImpl = async () => [];

      const result = await ChurnPredictionService.predict('c1');

      assert.ok(result);
      assert.ok(result.riskScore >= 60);
      assert.ok(result.factors.some((f: string) => f.includes('churned')));
    });
  });

  describe('predictAll', () => {
    it('predicts for all customers', async () => {
      const customers = [
        makeCustomer('c1', { lastContactedAt: new Date() }),
        makeCustomer('c2', { lastContactedAt: new Date() }),
      ];
      customerFindManyImpl = async () => customers;
      customerFindUniqueImpl = async (args: any) =>
        customers.find((c) => c.id === args.where.id) || null;
      ticketFindManyImpl = async () => [];
      memoryFindManyImpl = async () => [];

      const predictions = await ChurnPredictionService.predictAll('org-1');

      assert.equal(predictions.length, 2);
      assert.equal(predictions[0].customerId, 'c1');
      assert.equal(predictions[1].customerId, 'c2');
    });

    it('returns empty array on error', async () => {
      customerFindManyImpl = async () => { throw new Error('fail'); };

      const predictions = await ChurnPredictionService.predictAll('org-1');
      assert.deepEqual(predictions, []);
    });
  });

  describe('getAtRiskCustomers', () => {
    it('returns only customers above threshold', async () => {
      const customers = [
        makeCustomer('c1', { lastContactedAt: new Date() }), // low risk
        makeCustomer('c2', { lastContactedAt: new Date('2020-01-01'), type: 'churned' }), // high risk
      ];
      customerFindManyImpl = async () => customers;
      customerFindUniqueImpl = async (args: any) =>
        customers.find((c) => c.id === args.where.id) || null;
      ticketFindManyImpl = async () => [];
      memoryFindManyImpl = async () => [];

      const result = await ChurnPredictionService.getAtRiskCustomers('org-1', 30);

      assert.ok(result.length >= 1);
      assert.ok(result.every((p) => p.riskScore >= 30));
      // Sorted by risk score descending
      assert.ok(result[0].riskScore >= result[result.length - 1].riskScore);
    });
  });

  describe('getChurnFactors', () => {
    it('summarizes common churn factors', async () => {
      const customers = [
        makeCustomer('c1', { lastContactedAt: new Date('2020-01-01') }),
        makeCustomer('c2', { lastContactedAt: new Date('2020-01-01') }),
      ];
      customerFindManyImpl = async () => customers;
      customerFindUniqueImpl = async (args: any) =>
        customers.find((c) => c.id === args.where.id) || null;
      ticketFindManyImpl = async () => [];
      memoryFindManyImpl = async () => [];

      const factors = await ChurnPredictionService.getChurnFactors('org-1');

      assert.ok(factors.length > 0);
      // Both customers have no contact in over 90 days
      const noContactFactor = factors.find((f: any) => f.factor.includes('90 days'));
      assert.ok(noContactFactor);
      assert.equal(noContactFactor.count, 2);
    });
  });

  describe('getStats', () => {
    it('returns churn stats', async () => {
      const customers = [
        makeCustomer('c1', { lastContactedAt: new Date() }), // low risk
        makeCustomer('c2', { lastContactedAt: new Date('2020-01-01'), type: 'churned' }), // high risk
      ];
      customerFindManyImpl = async () => customers;
      customerFindUniqueImpl = async (args: any) =>
        customers.find((c) => c.id === args.where.id) || null;
      ticketFindManyImpl = async () => [];
      memoryFindManyImpl = async () => [];

      const stats = await ChurnPredictionService.getStats('org-1');

      assert.equal(stats.totalCustomers, 2);
      assert.ok(stats.atRisk >= 1);
      assert.ok(stats.byRiskLevel.high >= 1);
      assert.ok(stats.byRiskLevel.low >= 1);
    });
  });
});
