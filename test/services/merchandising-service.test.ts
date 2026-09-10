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

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
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

function makeAssortmentRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'mem-a1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'merch_assortment',
    content: JSON.stringify({
      name: 'Spring Collection',
      type: 'seasonal',
      status: 'planned',
      category: 'Apparel',
      description: 'Spring apparel line',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['merch_assortment', 'seasonal', 'planned']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makePlanogramRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'mem-p1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'merch_planogram',
    content: JSON.stringify({
      name: 'Shelf Display A',
      type: 'shelf',
      status: 'draft',
      location: 'Aisle 1',
      description: 'Main shelf display',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['merch_planogram', 'shelf', 'draft']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makePricingRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'mem-pr1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'merch_pricing',
    content: JSON.stringify({
      productId: null,
      productName: 'T-Shirt',
      type: 'regular',
      status: 'active',
      price: 29.99,
      originalPrice: 0,
      currency: 'USD',
      startDate: null,
      endDate: null,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['merch_pricing', 'regular', 'active']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makePromotionRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'mem-prom1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'merch_promotion',
    content: JSON.stringify({
      name: 'Summer Sale',
      type: 'discount',
      status: 'draft',
      description: 'Summer discount event',
      discount: 20,
      startDate: null,
      endDate: null,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['merch_promotion', 'discount', 'draft']),
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
}

const { MerchandisingService } = await import('@/lib/services/merchandising-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Assortments
// ─────────────────────────────────────────────────────────────────────────────

describe('MerchandisingService — Assortments', () => {
  beforeEach(() => resetMock());

  it('creates an assortment with defaults', async () => {
    memCreateImpl = async (args) => makeAssortmentRow({ content: args.data.content as string });
    const a = await MerchandisingService.createAssortment('org-1', 'ws-1', {
      name: 'Core Line', type: 'core',
    }, 'user-1');
    assert.equal(a.name, 'Core Line');
    assert.equal(a.status, 'planned');
    assert.equal(a.category, '');
    assert.equal(a.description, '');
  });

  it('creates an assortment with full input', async () => {
    memCreateImpl = async (args) => makeAssortmentRow({ content: args.data.content as string });
    const a = await MerchandisingService.createAssortment('org-1', 'ws-1', {
      name: 'Holiday Set', type: 'seasonal', status: 'active',
      category: 'Gifts', description: 'Holiday gift sets', notes: 'Limited edition',
    }, 'user-1');
    assert.equal(a.name, 'Holiday Set');
    assert.equal(a.type, 'seasonal');
    assert.equal(a.status, 'active');
    assert.equal(a.category, 'Gifts');
    assert.equal(a.notes, 'Limited edition');
  });

  it('gets an assortment by id', async () => {
    memFindUniqueImpl = async () => makeAssortmentRow();
    const a = await MerchandisingService.getAssortment('mem-a1');
    assert.ok(a);
    assert.equal(a!.id, 'mem-a1');
    assert.equal(a!.name, 'Spring Collection');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeAssortmentRow({ type: 'merch_planogram' });
    const a = await MerchandisingService.getAssortment('mem-a1');
    assert.equal(a, null);
  });

  it('returns null when assortment not found', async () => {
    memFindUniqueImpl = async () => null;
    const a = await MerchandisingService.getAssortment('nope');
    assert.equal(a, null);
  });

  it('lists assortments by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'merch_assortment') return [makeAssortmentRow()];
      return [];
    };
    const list = await MerchandisingService.listAssortments('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Spring Collection');
  });

  it('updates an assortment', async () => {
    memFindUniqueImpl = async () => makeAssortmentRow();
    memUpdateImpl = async (args) => makeAssortmentRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await MerchandisingService.updateAssortment('mem-a1', { status: 'active' });
    assert.ok(a);
    assert.equal(a!.status, 'active');
  });

  it('deletes an assortment', async () => {
    memDeleteImpl = async () => ({ id: 'mem-a1' });
    const ok = await MerchandisingService.deleteAssortment('mem-a1');
    assert.equal(ok, true);
  });

  it('activateAssortment sets status to active', async () => {
    memFindUniqueImpl = async () => makeAssortmentRow();
    memUpdateImpl = async (args) => makeAssortmentRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await MerchandisingService.activateAssortment('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'active');
  });

  it('discontinueAssortment sets status to discontinued', async () => {
    memFindUniqueImpl = async () => makeAssortmentRow();
    memUpdateImpl = async (args) => makeAssortmentRow({ id: 'mem-a1', content: args.data.content as string });
    const a = await MerchandisingService.discontinueAssortment('mem-a1', 'user-1');
    assert.ok(a);
    assert.equal(a!.status, 'discontinued');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Planograms
// ─────────────────────────────────────────────────────────────────────────────

describe('MerchandisingService — Planograms', () => {
  beforeEach(() => resetMock());

  it('creates a planogram with defaults', async () => {
    memCreateImpl = async (args) => makePlanogramRow({ content: args.data.content as string });
    const p = await MerchandisingService.createPlanogram('org-1', 'ws-1', {
      name: 'Endcap B', type: 'endcap',
    }, 'user-1');
    assert.equal(p.name, 'Endcap B');
    assert.equal(p.status, 'draft');
    assert.equal(p.location, '');
  });

  it('creates a planogram with full input', async () => {
    memCreateImpl = async (args) => makePlanogramRow({ content: args.data.content as string });
    const p = await MerchandisingService.createPlanogram('org-1', 'ws-1', {
      name: 'Window Display', type: 'window', status: 'published',
      location: 'Storefront', description: 'Front window', notes: 'High visibility',
    }, 'user-1');
    assert.equal(p.name, 'Window Display');
    assert.equal(p.type, 'window');
    assert.equal(p.status, 'published');
    assert.equal(p.location, 'Storefront');
  });

  it('gets a planogram by id', async () => {
    memFindUniqueImpl = async () => makePlanogramRow();
    const p = await MerchandisingService.getPlanogram('mem-p1');
    assert.ok(p);
    assert.equal(p!.id, 'mem-p1');
    assert.equal(p!.name, 'Shelf Display A');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makePlanogramRow({ type: 'merch_assortment' });
    const p = await MerchandisingService.getPlanogram('mem-p1');
    assert.equal(p, null);
  });

  it('lists planograms by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'merch_planogram') return [makePlanogramRow()];
      return [];
    };
    const list = await MerchandisingService.listPlanograms('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a planogram', async () => {
    memFindUniqueImpl = async () => makePlanogramRow();
    memUpdateImpl = async (args) => makePlanogramRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await MerchandisingService.updatePlanogram('mem-p1', { status: 'published' });
    assert.ok(p);
    assert.equal(p!.status, 'published');
  });

  it('deletes a planogram', async () => {
    memDeleteImpl = async () => ({ id: 'mem-p1' });
    const ok = await MerchandisingService.deletePlanogram('mem-p1');
    assert.equal(ok, true);
  });

  it('publishPlanogram sets status to published', async () => {
    memFindUniqueImpl = async () => makePlanogramRow();
    memUpdateImpl = async (args) => makePlanogramRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await MerchandisingService.publishPlanogram('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'published');
  });

  it('archivePlanogram sets status to archived', async () => {
    memFindUniqueImpl = async () => makePlanogramRow();
    memUpdateImpl = async (args) => makePlanogramRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await MerchandisingService.archivePlanogram('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'archived');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Pricing
// ─────────────────────────────────────────────────────────────────────────────

describe('MerchandisingService — Pricing', () => {
  beforeEach(() => resetMock());

  it('creates a pricing with defaults', async () => {
    memCreateImpl = async (args) => makePricingRow({ content: args.data.content as string });
    const p = await MerchandisingService.createPricing('org-1', 'ws-1', {
      productName: 'Mug', type: 'regular', price: 12.5,
    }, 'user-1');
    assert.equal(p.productName, 'Mug');
    assert.equal(p.status, 'active');
    assert.equal(p.price, 12.5);
    assert.equal(p.currency, 'USD');
    assert.equal(p.originalPrice, 0);
  });

  it('creates a pricing with full input', async () => {
    memCreateImpl = async (args) => makePricingRow({ content: args.data.content as string });
    const p = await MerchandisingService.createPricing('org-1', 'ws-1', {
      productName: 'Bundle Pack', type: 'bundle', price: 49.99, originalPrice: 79.99,
      currency: 'EUR', status: 'scheduled', productId: 'prod-1',
      startDate: '2028-01-01', endDate: '2028-06-30', notes: 'Q1 promo',
    }, 'user-1');
    assert.equal(p.productName, 'Bundle Pack');
    assert.equal(p.type, 'bundle');
    assert.equal(p.status, 'scheduled');
    assert.equal(p.originalPrice, 79.99);
    assert.equal(p.currency, 'EUR');
    assert.equal(p.productId, 'prod-1');
  });

  it('gets a pricing by id', async () => {
    memFindUniqueImpl = async () => makePricingRow();
    const p = await MerchandisingService.getPricing('mem-pr1');
    assert.ok(p);
    assert.equal(p!.id, 'mem-pr1');
    assert.equal(p!.productName, 'T-Shirt');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makePricingRow({ type: 'merch_assortment' });
    const p = await MerchandisingService.getPricing('mem-pr1');
    assert.equal(p, null);
  });

  it('lists pricings by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'merch_pricing') return [makePricingRow()];
      return [];
    };
    const list = await MerchandisingService.listPricings('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a pricing', async () => {
    memFindUniqueImpl = async () => makePricingRow();
    memUpdateImpl = async (args) => makePricingRow({ id: 'mem-pr1', content: args.data.content as string });
    const p = await MerchandisingService.updatePricing('mem-pr1', { price: 39.99 });
    assert.ok(p);
    assert.equal(p!.price, 39.99);
  });

  it('deletes a pricing', async () => {
    memDeleteImpl = async () => ({ id: 'mem-pr1' });
    const ok = await MerchandisingService.deletePricing('mem-pr1');
    assert.equal(ok, true);
  });

  it('expirePricing sets status to expired', async () => {
    memFindUniqueImpl = async () => makePricingRow();
    memUpdateImpl = async (args) => makePricingRow({ id: 'mem-pr1', content: args.data.content as string });
    const p = await MerchandisingService.expirePricing('mem-pr1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'expired');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Promotions
// ─────────────────────────────────────────────────────────────────────────────

describe('MerchandisingService — Promotions', () => {
  beforeEach(() => resetMock());

  it('creates a promotion with defaults', async () => {
    memCreateImpl = async (args) => makePromotionRow({ content: args.data.content as string });
    const p = await MerchandisingService.createPromotion('org-1', 'ws-1', {
      name: 'Flash Deal', type: 'flash_sale',
    }, 'user-1');
    assert.equal(p.name, 'Flash Deal');
    assert.equal(p.status, 'draft');
    assert.equal(p.discount, 0);
  });

  it('creates a promotion with full input', async () => {
    memCreateImpl = async (args) => makePromotionRow({ content: args.data.content as string });
    const p = await MerchandisingService.createPromotion('org-1', 'ws-1', {
      name: 'BOGO Weekend', type: 'bogo', status: 'scheduled',
      description: 'Buy one get one', discount: 50,
      startDate: '2028-01-01', endDate: '2028-01-07', notes: 'Weekend only',
    }, 'user-1');
    assert.equal(p.name, 'BOGO Weekend');
    assert.equal(p.type, 'bogo');
    assert.equal(p.status, 'scheduled');
    assert.equal(p.discount, 50);
  });

  it('gets a promotion by id', async () => {
    memFindUniqueImpl = async () => makePromotionRow();
    const p = await MerchandisingService.getPromotion('mem-prom1');
    assert.ok(p);
    assert.equal(p!.id, 'mem-prom1');
    assert.equal(p!.name, 'Summer Sale');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makePromotionRow({ type: 'merch_pricing' });
    const p = await MerchandisingService.getPromotion('mem-prom1');
    assert.equal(p, null);
  });

  it('lists promotions by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'merch_promotion') return [makePromotionRow()];
      return [];
    };
    const list = await MerchandisingService.listPromotions('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a promotion', async () => {
    memFindUniqueImpl = async () => makePromotionRow();
    memUpdateImpl = async (args) => makePromotionRow({ id: 'mem-prom1', content: args.data.content as string });
    const p = await MerchandisingService.updatePromotion('mem-prom1', { discount: 30 });
    assert.ok(p);
    assert.equal(p!.discount, 30);
  });

  it('deletes a promotion', async () => {
    memDeleteImpl = async () => ({ id: 'mem-prom1' });
    const ok = await MerchandisingService.deletePromotion('mem-prom1');
    assert.equal(ok, true);
  });

  it('schedulePromotion sets status to scheduled', async () => {
    memFindUniqueImpl = async () => makePromotionRow();
    memUpdateImpl = async (args) => makePromotionRow({ id: 'mem-prom1', content: args.data.content as string });
    const p = await MerchandisingService.schedulePromotion('mem-prom1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'scheduled');
  });

  it('activatePromotion sets status to active', async () => {
    memFindUniqueImpl = async () => makePromotionRow();
    memUpdateImpl = async (args) => makePromotionRow({ id: 'mem-prom1', content: args.data.content as string });
    const p = await MerchandisingService.activatePromotion('mem-prom1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'active');
  });

  it('completePromotion sets status to completed', async () => {
    memFindUniqueImpl = async () => makePromotionRow();
    memUpdateImpl = async (args) => makePromotionRow({ id: 'mem-prom1', content: args.data.content as string });
    const p = await MerchandisingService.completePromotion('mem-prom1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'completed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('MerchandisingService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getMerchandisingMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'merch_assortment') return [
        makeAssortmentRow({ content: JSON.stringify({ name: 'A1', type: 'core', status: 'active', category: '', description: '', notes: '' }) }),
        makeAssortmentRow({ id: 'a2', content: JSON.stringify({ name: 'A2', type: 'core', status: 'planned', category: '', description: '', notes: '' }) }),
      ];
      if (t === 'merch_planogram') return [
        makePlanogramRow({ content: JSON.stringify({ name: 'P1', type: 'shelf', status: 'published', location: '', description: '', notes: '' }) }),
        makePlanogramRow({ id: 'p2', content: JSON.stringify({ name: 'P2', type: 'shelf', status: 'draft', location: '', description: '', notes: '' }) }),
      ];
      if (t === 'merch_pricing') return [
        makePricingRow({ content: JSON.stringify({ productId: null, productName: 'X', type: 'regular', status: 'active', price: 10, originalPrice: 0, currency: 'USD', startDate: null, endDate: null, notes: '' }) }),
      ];
      if (t === 'merch_promotion') return [
        makePromotionRow({ content: JSON.stringify({ name: 'Prom', type: 'discount', status: 'active', description: '', discount: 10, startDate: null, endDate: null, notes: '' }) }),
        makePromotionRow({ id: 'prom2', content: JSON.stringify({ name: 'Prom2', type: 'discount', status: 'draft', description: '', discount: 10, startDate: null, endDate: null, notes: '' }) }),
      ];
      return [];
    };
    const m = await MerchandisingService.getMerchandisingMetrics('org-1');
    assert.equal(m.activeAssortments, 1);
    assert.equal(m.publishedPlanograms, 1);
    assert.equal(m.activePricings, 1);
    assert.equal(m.activePromotions, 1);
  });

  it('getMerchandisingStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'merch_assortment') return [makeAssortmentRow()];
      if (t === 'merch_planogram') return [makePlanogramRow()];
      if (t === 'merch_pricing') return [makePricingRow()];
      if (t === 'merch_promotion') return [makePromotionRow()];
      return [];
    };
    const s = await MerchandisingService.getMerchandisingStats('org-1');
    assert.equal(s.assortmentCount, 1);
    assert.equal(s.planogramCount, 1);
    assert.equal(s.pricingCount, 1);
    assert.equal(s.promotionCount, 1);
    assert.equal(s.byAssortmentType['seasonal'], 1);
    assert.equal(s.byAssortmentStatus['planned'], 1);
    assert.equal(s.byPlanogramType['shelf'], 1);
    assert.equal(s.byPlanogramStatus['draft'], 1);
    assert.equal(s.byPricingType['regular'], 1);
    assert.equal(s.byPricingStatus['active'], 1);
    assert.equal(s.byPromotionType['discount'], 1);
    assert.equal(s.byPromotionStatus['draft'], 1);
  });
});
