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

function makeMemoryRecord(id: string, type: string, content: object, orgId: string = 'org-1'): {
  id: string; type: string; content: string; tags: string; createdAt: Date; updatedAt: Date;
  workspaceId: string; organizationId: string; createdBy: string;
} {
  return {
    id,
    type,
    content: JSON.stringify(content),
    tags: JSON.stringify(['testimonial']),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    workspaceId: 'ws-1',
    organizationId: orgId,
    createdBy: 'user-1',
  };
}

const { TestimonialService } = await import('@/lib/services/testimonial-service');

// ─────────────────────────────────────────────────────────────────────────────
// TestimonialService Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('TestimonialService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates a testimonial with defaults (not approved)', async () => {
      memoryCreateImpl = async (args: any) => {
        assert.equal(args.data.type, 'testimonial');
        const content = JSON.parse(args.data.content);
        assert.equal(content.customerName, 'John Doe');
        assert.equal(content.content, 'Great product!');
        assert.equal(content.approved, false);
        return makeMemoryRecord('t1', 'testimonial', content);
      };

      const result = await TestimonialService.create('org-1', {
        customerName: 'John Doe',
        content: 'Great product!',
      });

      assert.ok(result);
      assert.equal(calls[0].method, 'memory.create');
    });

    it('creates an approved testimonial when specified', async () => {
      memoryCreateImpl = async (args: any) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.approved, true);
        return makeMemoryRecord('t1', 'testimonial', content);
      };

      await TestimonialService.create('org-1', {
        customerName: 'Jane',
        content: 'Amazing!',
        approved: true,
      });
    });
  });

  describe('get', () => {
    it('returns a testimonial by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRecord('t1', 'testimonial', { customerName: 'John', content: 'Great!', approved: true });

      const result = await TestimonialService.get('t1');

      assert.ok(result);
      assert.equal(result.id, 't1');
      assert.equal(result.customerName, 'John');
    });

    it('returns null when not found', async () => {
      memoryFindUniqueImpl = async () => null;

      const result = await TestimonialService.get('nope');
      assert.equal(result, null);
    });
  });

  describe('list', () => {
    it('returns testimonials for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRecord('t1', 'testimonial', { customerName: 'A', content: 'X', approved: true }),
        makeMemoryRecord('t2', 'testimonial', { customerName: 'B', content: 'Y', approved: false }),
      ];

      const result = await TestimonialService.list('org-1');

      assert.equal(result.length, 2);
    });

    it('filters by approved status', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRecord('t1', 'testimonial', { customerName: 'A', content: 'X', approved: true }),
        makeMemoryRecord('t2', 'testimonial', { customerName: 'B', content: 'Y', approved: false }),
      ];

      const result = await TestimonialService.list('org-1', { approved: true });

      assert.equal(result.length, 1);
      assert.equal(result[0].approved, true);
    });

    it('filters by search', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRecord('t1', 'testimonial', { customerName: 'John', content: 'Great', approved: true }),
        makeMemoryRecord('t2', 'testimonial', { customerName: 'Jane', content: 'Awesome', approved: true }),
      ];

      const result = await TestimonialService.list('org-1', { search: 'john' });

      assert.equal(result.length, 1);
      assert.equal(result[0].customerName, 'John');
    });
  });

  describe('update', () => {
    it('updates testimonial content', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRecord('t1', 'testimonial', { customerName: 'John', content: 'Old', approved: true });
      memoryUpdateImpl = async (args: any) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.content, 'New content');
        return makeMemoryRecord('t1', 'testimonial', content);
      };

      const result = await TestimonialService.update('t1', { content: 'New content' });
      assert.ok(result);
    });

    it('throws when testimonial not found', async () => {
      memoryFindUniqueImpl = async () => null;

      await assert.rejects(() => TestimonialService.update('nope', { content: 'X' }));
    });
  });

  describe('delete', () => {
    it('deletes a testimonial', async () => {
      memoryDeleteImpl = async () => ({ id: 't1' });

      const result = await TestimonialService.delete('t1');
      assert.ok(result);
      assert.equal(calls[0].method, 'memory.delete');
    });
  });

  describe('approve', () => {
    it('approves a testimonial', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRecord('t1', 'testimonial', { customerName: 'John', content: 'Great', approved: false, rejectedReason: '' });
      memoryUpdateImpl = async (args: any) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.approved, true);
        assert.equal(content.rejectedReason, undefined);
        return makeMemoryRecord('t1', 'testimonial', content);
      };

      const result = await TestimonialService.approve('t1');
      assert.ok(result);
    });

    it('throws when not found', async () => {
      memoryFindUniqueImpl = async () => null;

      await assert.rejects(() => TestimonialService.approve('nope'));
    });
  });

  describe('reject', () => {
    it('rejects a testimonial with reason', async () => {
      memoryFindUniqueImpl = async () =>
        makeMemoryRecord('t1', 'testimonial', { customerName: 'John', content: 'Great', approved: false, rejectedReason: null });
      memoryUpdateImpl = async (args: any) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.approved, false);
        assert.equal(content.rejectedReason, 'Inappropriate');
        return makeMemoryRecord('t1', 'testimonial', content);
      };

      const result = await TestimonialService.reject('t1', 'Inappropriate');
      assert.ok(result);
    });
  });

  describe('getApproved', () => {
    it('returns only approved testimonials', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRecord('t1', 'testimonial', { customerName: 'A', content: 'X', approved: true }),
        makeMemoryRecord('t2', 'testimonial', { customerName: 'B', content: 'Y', approved: true }),
        makeMemoryRecord('t3', 'testimonial', { customerName: 'C', content: 'Z', approved: false }),
      ];

      const result = await TestimonialService.getApproved('org-1');

      assert.equal(result.length, 2);
      assert.ok(result.every((t) => t.approved));
    });

    it('respects limit option', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRecord('t1', 'testimonial', { customerName: 'A', content: 'X', approved: true }),
        makeMemoryRecord('t2', 'testimonial', { customerName: 'B', content: 'Y', approved: true }),
        makeMemoryRecord('t3', 'testimonial', { customerName: 'C', content: 'Z', approved: true }),
      ];

      const result = await TestimonialService.getApproved('org-1', { limit: 2 });

      assert.equal(result.length, 2);
    });
  });

  describe('requestTestimonial', () => {
    it('generates an email template', async () => {
      const result = await TestimonialService.requestTestimonial('org-1', {
        customerName: 'John',
        customerEmail: 'john@test.com',
        productName: 'Lazynext',
      });

      assert.ok(result.subject);
      assert.ok(result.body);
      assert.ok(result.body.includes('John'));
      assert.ok(result.body.includes('Lazynext'));
    });

    it('uses default product name when not provided', async () => {
      const result = await TestimonialService.requestTestimonial('org-1', {
        customerName: 'Jane',
        customerEmail: 'jane@test.com',
      });

      assert.ok(result.body.includes('our product'));
    });
  });

  describe('getStats', () => {
    it('returns testimonial stats', async () => {
      memoryFindManyImpl = async () => [
        makeMemoryRecord('t1', 'testimonial', { customerName: 'A', content: 'X', approved: true, rating: 5 }),
        makeMemoryRecord('t2', 'testimonial', { customerName: 'B', content: 'Y', approved: false, rejectedReason: '', rating: 4 }),
        makeMemoryRecord('t3', 'testimonial', { customerName: 'C', content: 'Z', approved: false, rejectedReason: 'No', rating: 2 }),
      ];

      const stats = await TestimonialService.getStats('org-1');

      assert.equal(stats.total, 3);
      assert.equal(stats.approved, 1);
      assert.equal(stats.pending, 1);
      assert.equal(stats.rejected, 1);
      assert.equal(stats.avgRating, 3.7); // (5+4+2)/3 ≈ 3.7
    });
  });
});
