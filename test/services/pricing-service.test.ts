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

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number };
type FindUniqueArgs = { where: Record<string, unknown>; select?: unknown; include?: unknown };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };
type CountArgs = { where: Record<string, unknown> };

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let memCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'memory.count', args }); return memCountImpl(args); },
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

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'mem-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'pricing_model',
    content: JSON.stringify({ name: 'Test', type: 'subscription', description: '', currency: 'USD', status: 'active', effectiveDate: null, version: '1.0' }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['pricing_model', 'subscription', 'active']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function resetMock(): void {
  calls.length = 0;
  memFindManyImpl = async () => [];
  memFindUniqueImpl = async () => null;
  memCreateImpl = async () => ({});
  memUpdateImpl = async () => ({});
  memDeleteImpl = async () => ({});
  memCountImpl = async () => 0;
}

const { PricingService } = await import('@/lib/services/pricing-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('PricingService', () => {
  beforeEach(() => { resetMock(); });

  // ── Pricing Models ──

  describe('createModel', () => {
    it('creates a pricing model with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'pricing_model', content: args.data.content as string });
      const model = await PricingService.createModel('org-1', 'ws-1', { name: 'SaaS Subscription', type: 'subscription' }, 'user-1');
      assert.equal(model.name, 'SaaS Subscription');
      assert.equal(model.type, 'subscription');
      assert.equal(model.currency, 'USD');
      assert.equal(model.status, 'active');
      assert.equal(model.version, '1.0');
      assert.equal(model.organizationId, 'org-1');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'pricing_model', content: args.data.content as string });
      const model = await PricingService.createModel('org-1', 'ws-1', {
        name: 'Per Seat', type: 'per_seat', description: 'desc', currency: 'EUR', status: 'draft',
        effectiveDate: '2024-06-01', version: '2.0',
      }, 'user-1');
      assert.equal(model.type, 'per_seat');
      assert.equal(model.currency, 'EUR');
      assert.equal(model.status, 'draft');
      assert.equal(model.version, '2.0');
      assert.equal(model.description, 'desc');
    });
  });

  describe('getModel', () => {
    it('returns a model when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pricing_model' });
      const model = await PricingService.getModel('mem-1');
      assert.ok(model);
      assert.equal(model!.id, 'mem-1');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const model = await PricingService.getModel('nope');
      assert.equal(model, null);
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pricing_tier' });
      const model = await PricingService.getModel('mem-1');
      assert.equal(model, null);
    });
  });

  describe('listModels', () => {
    it('lists models', async () => {
      memFindManyImpl = async () => [makeRow({ id: 'm1' }), makeRow({ id: 'm2' })];
      const list = await PricingService.listModels('org-1');
      assert.equal(list.length, 2);
    });

    it('filters by type and status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'm1', content: JSON.stringify({ name: 'A', type: 'subscription', description: '', currency: 'USD', status: 'active', effectiveDate: null, version: '1.0' }) }),
        makeRow({ id: 'm2', content: JSON.stringify({ name: 'B', type: 'per_seat', description: '', currency: 'USD', status: 'draft', effectiveDate: null, version: '1.0' }) }),
      ];
      const list = await PricingService.listModels('org-1', { type: 'subscription', status: 'active' });
      assert.equal(list.length, 1);
      assert.equal(list[0].type, 'subscription');
    });
  });

  describe('updateModel', () => {
    it('updates model fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pricing_model' });
      memUpdateImpl = async (args) => makeRow({ type: 'pricing_model', content: args.data.content as string });
      const model = await PricingService.updateModel('mem-1', { name: 'Updated', status: 'archived' });
      assert.ok(model);
      assert.equal(model!.name, 'Updated');
      assert.equal(model!.status, 'archived');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const model = await PricingService.updateModel('nope', { name: 'X' });
      assert.equal(model, null);
    });
  });

  describe('deleteModel', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await PricingService.deleteModel('mem-1');
      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await PricingService.deleteModel('mem-1');
      assert.equal(ok, false);
    });
  });

  // ── Pricing Tiers ──

  describe('createTier', () => {
    it('creates a tier with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'pricing_tier', content: args.data.content as string });
      const tier = await PricingService.createTier('org-1', 'ws-1', { modelId: 'm1', name: 'Pro', price: 99, billingPeriod: 'monthly', features: ['a', 'b'] }, 'user-1');
      assert.equal(tier.name, 'Pro');
      assert.equal(tier.price, 99);
      assert.equal(tier.billingPeriod, 'monthly');
      assert.equal(tier.features.length, 2);
      assert.equal(tier.status, 'active');
      assert.equal(tier.sortOrder, 0);
      assert.equal(tier.modelId, 'm1');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'pricing_tier', content: args.data.content as string });
      const tier = await PricingService.createTier('org-1', 'ws-1', {
        modelId: 'm1', name: 'Enterprise', price: 499, billingPeriod: 'annual',
        features: ['x'], limits: [{ name: 'users', value: '100', unit: 'seats' }],
        targetSegment: 'enterprise', status: 'inactive', sortOrder: 5,
      }, 'user-1');
      assert.equal(tier.limits.length, 1);
      assert.equal(tier.targetSegment, 'enterprise');
      assert.equal(tier.status, 'inactive');
      assert.equal(tier.sortOrder, 5);
    });
  });

  describe('getTier', () => {
    it('returns a tier when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pricing_tier', content: JSON.stringify({ modelId: 'm1', name: 'T', price: 50, billingPeriod: 'monthly', features: [], limits: [], targetSegment: '', status: 'active', sortOrder: 0 }) });
      const tier = await PricingService.getTier('mem-1');
      assert.ok(tier);
      assert.equal(tier!.name, 'T');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pricing_model' });
      const tier = await PricingService.getTier('mem-1');
      assert.equal(tier, null);
    });
  });

  describe('listTiers', () => {
    it('lists tiers and filters by modelId and status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 't1', type: 'pricing_tier', content: JSON.stringify({ modelId: 'm1', name: 'A', price: 10, billingPeriod: 'monthly', features: [], limits: [], targetSegment: '', status: 'active', sortOrder: 0 }) }),
        makeRow({ id: 't2', type: 'pricing_tier', content: JSON.stringify({ modelId: 'm2', name: 'B', price: 20, billingPeriod: 'monthly', features: [], limits: [], targetSegment: '', status: 'inactive', sortOrder: 1 }) }),
      ];
      const list = await PricingService.listTiers('org-1', { modelId: 'm1', status: 'active' });
      assert.equal(list.length, 1);
      assert.equal(list[0].modelId, 'm1');
    });
  });

  describe('updateTier', () => {
    it('updates tier fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pricing_tier', content: JSON.stringify({ modelId: 'm1', name: 'Old', price: 10, billingPeriod: 'monthly', features: [], limits: [], targetSegment: '', status: 'active', sortOrder: 0 }) });
      memUpdateImpl = async (args) => makeRow({ type: 'pricing_tier', content: args.data.content as string });
      const tier = await PricingService.updateTier('mem-1', { name: 'New', price: 25 });
      assert.ok(tier);
      assert.equal(tier!.name, 'New');
      assert.equal(tier!.price, 25);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const tier = await PricingService.updateTier('nope', { name: 'X' });
      assert.equal(tier, null);
    });
  });

  describe('deleteTier', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await PricingService.deleteTier('mem-1');
      assert.equal(ok, true);
    });
  });

  // ── Price Experiments ──

  describe('createExperiment', () => {
    it('creates an experiment with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'price_experiment', content: args.data.content as string });
      const exp = await PricingService.createExperiment('org-1', 'ws-1', {
        name: 'Price Test', startDate: '2024-06-01',
        variants: [{ name: 'A', price: 10 }, { name: 'B', price: 15 }],
      }, 'user-1');
      assert.equal(exp.name, 'Price Test');
      assert.equal(exp.status, 'planned');
      assert.equal(exp.variants.length, 2);
      assert.equal(exp.variants[0].weight, 1);
      assert.equal(exp.results, '');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'price_experiment', content: args.data.content as string });
      const exp = await PricingService.createExperiment('org-1', 'ws-1', {
        name: 'AB Test', startDate: '2024-06-01', description: 'desc', modelId: 'm1',
        variants: [{ name: 'A', price: 10, description: 'low', weight: 3 }],
        endDate: '2024-07-01', status: 'running', targetSegment: 'smb', successMetric: 'conversion',
      }, 'user-1');
      assert.equal(exp.description, 'desc');
      assert.equal(exp.modelId, 'm1');
      assert.equal(exp.status, 'running');
      assert.equal(exp.targetSegment, 'smb');
      assert.equal(exp.successMetric, 'conversion');
      assert.equal(exp.variants[0].weight, 3);
    });
  });

  describe('getExperiment', () => {
    it('returns an experiment when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'price_experiment', content: JSON.stringify({ name: 'E', description: '', modelId: null, variants: [], startDate: '2024-06-01', endDate: null, status: 'planned', targetSegment: '', successMetric: '', results: '', startedBy: '', startedAt: null, endedBy: '', endedAt: null }) });
      const exp = await PricingService.getExperiment('mem-1');
      assert.ok(exp);
      assert.equal(exp!.name, 'E');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pricing_model' });
      const exp = await PricingService.getExperiment('mem-1');
      assert.equal(exp, null);
    });
  });

  describe('listExperiments', () => {
    it('lists experiments and filters by status and modelId', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'e1', type: 'price_experiment', content: JSON.stringify({ name: 'A', description: '', modelId: 'm1', variants: [], startDate: '2024-06-01', endDate: null, status: 'running', targetSegment: '', successMetric: '', results: '', startedBy: '', startedAt: null, endedBy: '', endedAt: null }) }),
        makeRow({ id: 'e2', type: 'price_experiment', content: JSON.stringify({ name: 'B', description: '', modelId: 'm2', variants: [], startDate: '2024-06-01', endDate: null, status: 'planned', targetSegment: '', successMetric: '', results: '', startedBy: '', startedAt: null, endedBy: '', endedAt: null }) }),
      ];
      const list = await PricingService.listExperiments('org-1', { status: 'running', modelId: 'm1' });
      assert.equal(list.length, 1);
      assert.equal(list[0].status, 'running');
    });
  });

  describe('updateExperiment', () => {
    it('updates experiment fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'price_experiment', content: JSON.stringify({ name: 'Old', description: '', modelId: null, variants: [], startDate: '2024-06-01', endDate: null, status: 'planned', targetSegment: '', successMetric: '', results: '', startedBy: '', startedAt: null, endedBy: '', endedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'price_experiment', content: args.data.content as string });
      const exp = await PricingService.updateExperiment('mem-1', { name: 'New', status: 'paused' });
      assert.ok(exp);
      assert.equal(exp!.name, 'New');
      assert.equal(exp!.status, 'paused');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const exp = await PricingService.updateExperiment('nope', { name: 'X' });
      assert.equal(exp, null);
    });
  });

  describe('startExperiment', () => {
    it('starts an experiment', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'price_experiment', content: JSON.stringify({ name: 'E', description: '', modelId: null, variants: [], startDate: '2024-06-01', endDate: null, status: 'planned', targetSegment: '', successMetric: '', results: '', startedBy: '', startedAt: null, endedBy: '', endedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'price_experiment', content: args.data.content as string });
      const exp = await PricingService.startExperiment('mem-1', 'alice');
      assert.ok(exp);
      assert.equal(exp!.status, 'running');
      assert.equal(exp!.startedBy, 'alice');
      assert.ok(exp!.startedAt);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const exp = await PricingService.startExperiment('nope', 'u');
      assert.equal(exp, null);
    });
  });

  describe('endExperiment', () => {
    it('ends an experiment with results', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'price_experiment', content: JSON.stringify({ name: 'E', description: '', modelId: null, variants: [], startDate: '2024-06-01', endDate: null, status: 'running', targetSegment: '', successMetric: '', results: '', startedBy: 'a', startedAt: '2024-06-01', endedBy: '', endedAt: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'price_experiment', content: args.data.content as string });
      const exp = await PricingService.endExperiment('mem-1', 'Variant B won', 'bob');
      assert.ok(exp);
      assert.equal(exp!.status, 'completed');
      assert.equal(exp!.results, 'Variant B won');
      assert.equal(exp!.endedBy, 'bob');
      assert.ok(exp!.endedAt);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const exp = await PricingService.endExperiment('nope', 'r', 'u');
      assert.equal(exp, null);
    });
  });

  // ── Discount Rules ──

  describe('createDiscountRule', () => {
    it('creates a discount rule with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'discount_rule', content: args.data.content as string });
      const discount = await PricingService.createDiscountRule('org-1', 'ws-1', { name: 'Summer Sale', type: 'percentage', value: 20 }, 'user-1');
      assert.equal(discount.name, 'Summer Sale');
      assert.equal(discount.type, 'percentage');
      assert.equal(discount.value, 20);
      assert.equal(discount.status, 'active');
      assert.equal(discount.stackable, false);
      assert.equal(discount.usageCount, 0);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'discount_rule', content: args.data.content as string });
      const discount = await PricingService.createDiscountRule('org-1', 'ws-1', {
        name: 'Bulk', type: 'volume', value: 50, conditions: 'min 100 units',
        minQuantity: 100, maxQuantity: 1000, validFrom: '2024-06-01', validTo: '2024-12-01',
        appliesTo: 'enterprise', stackable: true, status: 'inactive', usageLimit: 500, usageCount: 10,
      }, 'user-1');
      assert.equal(discount.conditions, 'min 100 units');
      assert.equal(discount.minQuantity, 100);
      assert.equal(discount.maxQuantity, 1000);
      assert.equal(discount.stackable, true);
      assert.equal(discount.status, 'inactive');
      assert.equal(discount.usageLimit, 500);
      assert.equal(discount.usageCount, 10);
    });
  });

  describe('getDiscountRule', () => {
    it('returns a discount rule when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'discount_rule', content: JSON.stringify({ name: 'D', type: 'fixed', value: 10, conditions: '', minQuantity: null, maxQuantity: null, validFrom: null, validTo: null, appliesTo: '', stackable: false, status: 'active', usageLimit: null, usageCount: 0 }) });
      const discount = await PricingService.getDiscountRule('mem-1');
      assert.ok(discount);
      assert.equal(discount!.name, 'D');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pricing_model' });
      const discount = await PricingService.getDiscountRule('mem-1');
      assert.equal(discount, null);
    });
  });

  describe('listDiscountRules', () => {
    it('lists discount rules and filters by type and status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'd1', type: 'discount_rule', content: JSON.stringify({ name: 'A', type: 'percentage', value: 10, conditions: '', minQuantity: null, maxQuantity: null, validFrom: null, validTo: null, appliesTo: '', stackable: false, status: 'active', usageLimit: null, usageCount: 0 }) }),
        makeRow({ id: 'd2', type: 'discount_rule', content: JSON.stringify({ name: 'B', type: 'fixed', value: 5, conditions: '', minQuantity: null, maxQuantity: null, validFrom: null, validTo: null, appliesTo: '', stackable: false, status: 'expired', usageLimit: null, usageCount: 0 }) }),
      ];
      const list = await PricingService.listDiscountRules('org-1', { type: 'percentage', status: 'active' });
      assert.equal(list.length, 1);
      assert.equal(list[0].type, 'percentage');
    });
  });

  describe('updateDiscountRule', () => {
    it('updates discount rule fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'discount_rule', content: JSON.stringify({ name: 'Old', type: 'percentage', value: 10, conditions: '', minQuantity: null, maxQuantity: null, validFrom: null, validTo: null, appliesTo: '', stackable: false, status: 'active', usageLimit: null, usageCount: 0 }) });
      memUpdateImpl = async (args) => makeRow({ type: 'discount_rule', content: args.data.content as string });
      const discount = await PricingService.updateDiscountRule('mem-1', { name: 'New', value: 25, status: 'expired' });
      assert.ok(discount);
      assert.equal(discount!.name, 'New');
      assert.equal(discount!.value, 25);
      assert.equal(discount!.status, 'expired');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const discount = await PricingService.updateDiscountRule('nope', { name: 'X' });
      assert.equal(discount, null);
    });
  });

  describe('deleteDiscountRule', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await PricingService.deleteDiscountRule('mem-1');
      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await PricingService.deleteDiscountRule('mem-1');
      assert.equal(ok, false);
    });
  });

  // ── Revenue Streams ──

  describe('createRevenueStream', () => {
    it('creates a revenue stream with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'revenue_stream', content: args.data.content as string });
      const stream = await PricingService.createRevenueStream('org-1', 'ws-1', { name: 'Subscriptions', type: 'recurring' }, 'user-1');
      assert.equal(stream.name, 'Subscriptions');
      assert.equal(stream.type, 'recurring');
      assert.equal(stream.currentMrr, 0);
      assert.equal(stream.projectedMrr, 0);
      assert.equal(stream.growthRate, 0);
      assert.equal(stream.status, 'active');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'revenue_stream', content: args.data.content as string });
      const stream = await PricingService.createRevenueStream('org-1', 'ws-1', {
        name: 'Pro', type: 'recurring', description: 'desc', pricingModelId: 'm1',
        currentMrr: 50000, projectedMrr: 75000, growthRate: 15, status: 'paused', startDate: '2024-01-01',
      }, 'user-1');
      assert.equal(stream.description, 'desc');
      assert.equal(stream.pricingModelId, 'm1');
      assert.equal(stream.currentMrr, 50000);
      assert.equal(stream.projectedMrr, 75000);
      assert.equal(stream.growthRate, 15);
      assert.equal(stream.status, 'paused');
    });
  });

  describe('getRevenueStream', () => {
    it('returns a revenue stream when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'revenue_stream', content: JSON.stringify({ name: 'S', type: 'recurring', description: '', pricingModelId: null, currentMrr: 1000, projectedMrr: 2000, growthRate: 10, status: 'active', startDate: null }) });
      const stream = await PricingService.getRevenueStream('mem-1');
      assert.ok(stream);
      assert.equal(stream!.name, 'S');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'pricing_model' });
      const stream = await PricingService.getRevenueStream('mem-1');
      assert.equal(stream, null);
    });
  });

  describe('listRevenueStreams', () => {
    it('lists revenue streams and filters by type and status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 's1', type: 'revenue_stream', content: JSON.stringify({ name: 'A', type: 'recurring', description: '', pricingModelId: null, currentMrr: 1000, projectedMrr: 2000, growthRate: 10, status: 'active', startDate: null }) }),
        makeRow({ id: 's2', type: 'revenue_stream', content: JSON.stringify({ name: 'B', type: 'one_time', description: '', pricingModelId: null, currentMrr: 0, projectedMrr: 0, growthRate: 0, status: 'discontinued', startDate: null }) }),
      ];
      const list = await PricingService.listRevenueStreams('org-1', { type: 'recurring', status: 'active' });
      assert.equal(list.length, 1);
      assert.equal(list[0].type, 'recurring');
    });
  });

  describe('updateRevenueStream', () => {
    it('updates revenue stream fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'revenue_stream', content: JSON.stringify({ name: 'Old', type: 'recurring', description: '', pricingModelId: null, currentMrr: 1000, projectedMrr: 2000, growthRate: 10, status: 'active', startDate: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'revenue_stream', content: args.data.content as string });
      const stream = await PricingService.updateRevenueStream('mem-1', { name: 'New', currentMrr: 5000, status: 'paused' });
      assert.ok(stream);
      assert.equal(stream!.name, 'New');
      assert.equal(stream!.currentMrr, 5000);
      assert.equal(stream!.status, 'paused');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const stream = await PricingService.updateRevenueStream('nope', { name: 'X' });
      assert.equal(stream, null);
    });
  });

  describe('deleteRevenueStream', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await PricingService.deleteRevenueStream('mem-1');
      assert.equal(ok, true);
    });
  });

  // ── Metrics ──

  describe('getPricingMetrics', () => {
    it('computes metrics correctly', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as { type: string };
        if (where.type === 'revenue_stream') return [
          makeRow({ id: 's1', type: 'revenue_stream', content: JSON.stringify({ name: 'Subs', type: 'recurring', description: '', pricingModelId: null, currentMrr: 50000, projectedMrr: 75000, growthRate: 10, status: 'active', startDate: null }) }),
          makeRow({ id: 's2', type: 'revenue_stream', content: JSON.stringify({ name: 'Old', type: 'recurring', description: '', pricingModelId: null, currentMrr: 10000, projectedMrr: 5000, growthRate: 0, status: 'discontinued', startDate: null }) }),
        ];
        if (where.type === 'price_experiment') return [
          makeRow({ id: 'e1', type: 'price_experiment', content: JSON.stringify({ name: 'A', description: '', modelId: null, variants: [], startDate: '2024-06-01', endDate: null, status: 'running', targetSegment: '', successMetric: '', results: '', startedBy: '', startedAt: null, endedBy: '', endedAt: null }) }),
        ];
        if (where.type === 'discount_rule') return [
          makeRow({ id: 'd1', type: 'discount_rule', content: JSON.stringify({ name: 'D', type: 'percentage', value: 10, conditions: '', minQuantity: null, maxQuantity: null, validFrom: null, validTo: null, appliesTo: '', stackable: false, status: 'active', usageLimit: 100, usageCount: 50 }) }),
        ];
        if (where.type === 'pricing_model') return [
          makeRow({ id: 'm1', type: 'pricing_model', content: JSON.stringify({ name: 'M', type: 'subscription', description: '', currency: 'USD', status: 'active', effectiveDate: null, version: '1.0' }) }),
        ];
        if (where.type === 'pricing_tier') return [
          makeRow({ id: 't1', type: 'pricing_tier', content: JSON.stringify({ modelId: 'm1', name: 'T', price: 10, billingPeriod: 'monthly', features: [], limits: [], targetSegment: '', status: 'active', sortOrder: 0 }) }),
        ];
        return [];
      };
      const metrics = await PricingService.getPricingMetrics('org-1');
      assert.equal(metrics.totalMrr, 50000);
      assert.equal(metrics.projectedMrr, 75000);
      assert.equal(metrics.activeExperiments, 1);
      assert.equal(metrics.discountUtilization, 50);
      assert.equal(metrics.pricingModelCoverage, 100);
      assert.equal(metrics.revenueByStream.length, 1);
    });

    it('returns zero metrics when no data', async () => {
      memFindManyImpl = async () => [];
      const metrics = await PricingService.getPricingMetrics('org-1');
      assert.equal(metrics.totalMrr, 0);
      assert.equal(metrics.projectedMrr, 0);
      assert.equal(metrics.activeExperiments, 0);
      assert.equal(metrics.discountUtilization, 0);
      assert.equal(metrics.pricingModelCoverage, 0);
    });
  });

  // ── Stats ──

  describe('getStats', () => {
    it('aggregates stats correctly', async () => {
      memFindManyImpl = async (args) => {
        const where = args.where as { type: string };
        if (where.type === 'pricing_model') return [makeRow({ type: 'pricing_model', content: JSON.stringify({ name: 'M', type: 'subscription', description: '', currency: 'USD', status: 'active', effectiveDate: null, version: '1.0' }) })];
        if (where.type === 'pricing_tier') return [makeRow({ type: 'pricing_tier', content: JSON.stringify({ modelId: 'm1', name: 'T', price: 10, billingPeriod: 'monthly', features: [], limits: [], targetSegment: '', status: 'active', sortOrder: 0 }) })];
        if (where.type === 'price_experiment') return [makeRow({ type: 'price_experiment', content: JSON.stringify({ name: 'E', description: '', modelId: null, variants: [], startDate: '2024-06-01', endDate: null, status: 'running', targetSegment: '', successMetric: '', results: '', startedBy: '', startedAt: null, endedBy: '', endedAt: null }) })];
        if (where.type === 'discount_rule') return [makeRow({ type: 'discount_rule', content: JSON.stringify({ name: 'D', type: 'percentage', value: 10, conditions: '', minQuantity: null, maxQuantity: null, validFrom: null, validTo: null, appliesTo: '', stackable: false, status: 'active', usageLimit: null, usageCount: 0 }) })];
        if (where.type === 'revenue_stream') return [makeRow({ type: 'revenue_stream', content: JSON.stringify({ name: 'S', type: 'recurring', description: '', pricingModelId: null, currentMrr: 10000, projectedMrr: 15000, growthRate: 10, status: 'active', startDate: null }) })];
        return [];
      };
      const stats = await PricingService.getStats('org-1');
      assert.equal(stats.modelCount, 1);
      assert.equal(stats.activeModelCount, 1);
      assert.equal(stats.tierCount, 1);
      assert.equal(stats.experimentCount, 1);
      assert.equal(stats.runningExperimentCount, 1);
      assert.equal(stats.discountCount, 1);
      assert.equal(stats.activeDiscountCount, 1);
      assert.equal(stats.revenueStreamCount, 1);
      assert.equal(stats.totalMrr, 10000);
      assert.equal(stats.projectedMrr, 15000);
      assert.equal(stats.byModelType['subscription'], 1);
      assert.equal(stats.byDiscountType['percentage'], 1);
      assert.equal(stats.byRevenueStreamType['recurring'], 1);
    });
  });
});
