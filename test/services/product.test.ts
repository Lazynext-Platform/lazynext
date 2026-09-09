import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type ProductFindManyArgs = {
  where: { workspaceId: string };
  include?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

type ProductFindUniqueArgs = {
  where: { id: string };
  include?: Record<string, unknown>;
};

type ProductCreateArgs = {
  data: {
    organizationId: string;
    workspaceId: string | null;
    name: string;
    description?: string | null;
    type: string;
    status: string;
    price: number;
    currency: string;
    unit?: string | null;
    sku?: string | null;
    category?: string | null;
  };
};

type ProductUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let productFindManyImpl: (args: ProductFindManyArgs) => Promise<unknown[]> =
  async () => [];
let productFindUniqueImpl: (args: ProductFindUniqueArgs) => Promise<unknown> =
  async () => null;
let productCreateImpl: (args: ProductCreateArgs) => Promise<unknown> =
  async () => ({});
let productUpdateImpl: (args: ProductUpdateArgs) => Promise<unknown> =
  async () => ({});

const prismaMock = {
  product: {
    findMany: (args: ProductFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'product.findMany', args });
      return productFindManyImpl(args);
    },
    findUnique: (args: ProductFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'product.findUnique', args });
      return productFindUniqueImpl(args);
    },
    create: (args: ProductCreateArgs): Promise<unknown> => {
      calls.push({ method: 'product.create', args });
      return productCreateImpl(args);
    },
    update: (args: ProductUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'product.update', args });
      return productUpdateImpl(args);
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
  productFindManyImpl = async () => [];
  productFindUniqueImpl = async () => null;
  productCreateImpl = async () => ({});
  productUpdateImpl = async () => ({});
}

const { ProductService } = await import('@/lib/services/product');

describe('ProductService', () => {
  beforeEach(() => { resetMock(); });

  describe('list', () => {
    it('returns products for a workspace', async () => {
      productFindManyImpl = async () =>
        ([{ id: 'p1', name: 'Widget', _count: { deals: 3 } }]);

      const result = await ProductService.list('ws-1');

      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'p1');
      assert.equal(calls[0].method, 'product.findMany');
      const args = calls[0].args as ProductFindManyArgs;
      assert.equal(args.where.workspaceId, 'ws-1');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      productFindManyImpl = async () => { throw new Error('DB down'); };

      const result = await ProductService.list('ws-1');
      assert.deepEqual(result, []);
    });
  });

  describe('get', () => {
    it('returns a product by id with deals', async () => {
      productFindUniqueImpl = async () =>
        ({ id: 'p1', name: 'Widget', deals: [{ id: 'd1' }] });

      const result = await ProductService.get('p1');

      assert.ok(result);
      assert.equal(result.id, 'p1');
      assert.equal(calls[0].method, 'product.findUnique');
    });

    it('returns null when product not found', async () => {
      productFindUniqueImpl = async () => null;

      const result = await ProductService.get('nope');
      assert.equal(result, null);
    });

    it('returns null on error (safePrisma fallback)', async () => {
      productFindUniqueImpl = async () => { throw new Error('fail'); };

      const result = await ProductService.get('p1');
      assert.equal(result, null);
    });
  });

  describe('create', () => {
    it('creates a product with defaults', async () => {
      productCreateImpl = async (args: ProductCreateArgs) => {
        assert.equal(args.data.type, 'product');
        assert.equal(args.data.status, 'active');
        assert.equal(args.data.currency, 'USD');
        assert.equal(args.data.price, 0);
        return { id: 'p1', ...args.data };
      };

      const result = await ProductService.create({
        organizationId: 'org-1',
        name: 'Widget',
      });

      assert.ok(result);
      assert.equal(result.id, 'p1');
      assert.equal(calls[0].method, 'product.create');
    });

    it('truncates long names to 300 characters', async () => {
      productCreateImpl = async (args: ProductCreateArgs) => {
        assert.ok(args.data.name.length <= 300);
        return { id: 'p1', name: args.data.name };
      };

      await ProductService.create({
        organizationId: 'org-1',
        name: 'A'.repeat(500),
      });
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      productUpdateImpl = async (args: ProductUpdateArgs) => {
        assert.equal(args.data.name, 'New Widget');
        assert.equal(args.data.price, undefined);
        return { id: 'p1', ...args.data };
      };

      const result = await ProductService.update('p1', { name: 'New Widget' });
      assert.ok(result);
      assert.equal(calls[0].method, 'product.update');
    });

    it('sets optional fields to null when empty string provided', async () => {
      productUpdateImpl = async (args: ProductUpdateArgs) => {
        assert.equal(args.data.sku, null);
        return { id: 'p1', sku: null };
      };

      await ProductService.update('p1', { sku: '' });
    });
  });
});
