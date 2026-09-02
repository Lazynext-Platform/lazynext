import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for src/lib/plan-tier.ts — getUserPlanTier().
 *
 * getUserPlanTier infers a user's plan tier (free/starter/pro/elite) from the
 * largest single credit purchase recorded in the CreditLedger:
 *   starter = largest purchase >= 100
 *   pro     = largest purchase >= 600
 *   elite   = largest purchase >= 2000
 *   free    = no purchases (or largest < 100)
 *
 * Because plan-tier.ts imports `prisma` from '@/lib/prisma', we mock that
 * module with the Node test runner's `mock.module()` (requires
 * --experimental-test-module-mocks, already enabled in `npm test`).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type FindManyArgs = {
  where: { userId: string; reason: string; delta: { gt: number } };
  select: { delta: true };
  orderBy: { delta: 'desc' };
  take: number;
};

/** Swappable implementation — each test configures the returned rows. */
let findManyImpl: (args: FindManyArgs) => Promise<Array<{ delta: number }>> =
  async () => [];

/** Records the last args so tests can assert the query shape. */
let lastArgs: FindManyArgs | null = null;

const prismaMock = {
  creditLedger: {
    findMany: (args: FindManyArgs): Promise<Array<{ delta: number }>> => {
      lastArgs = args;
      return findManyImpl(args);
    },
  },
};

mock.module('@/lib/prisma', {
  namedExports: { prisma: prismaMock },
});

function resetMock(): void {
  lastArgs = null;
  findManyImpl = async () => [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('getUserPlanTier — tier inference from credit purchases', () => {

  test('returns "free" when the user has no purchases', async () => {
    resetMock();
    const { getUserPlanTier } = await import('@/lib/plan-tier');

    findManyImpl = async () => [];

    const tier = await getUserPlanTier('user-none');
    assert.equal(tier, 'free');
  });

  test('returns "free" when the largest purchase is below the starter threshold (100)', async () => {
    resetMock();
    const { getUserPlanTier } = await import('@/lib/plan-tier');

    findManyImpl = async () => [{ delta: 50 }];

    assert.equal(await getUserPlanTier('user-small'), 'free');
  });

  test('returns "starter" when the largest purchase is exactly 100', async () => {
    resetMock();
    const { getUserPlanTier } = await import('@/lib/plan-tier');

    findManyImpl = async () => [{ delta: 100 }];

    assert.equal(await getUserPlanTier('user-starter'), 'starter');
  });

  test('returns "starter" for a purchase between 100 and 599', async () => {
    resetMock();
    const { getUserPlanTier } = await import('@/lib/plan-tier');

    findManyImpl = async () => [{ delta: 250 }];

    assert.equal(await getUserPlanTier('user-starter-mid'), 'starter');
  });

  test('returns "pro" when the largest purchase is exactly 600', async () => {
    resetMock();
    const { getUserPlanTier } = await import('@/lib/plan-tier');

    findManyImpl = async () => [{ delta: 600 }];

    assert.equal(await getUserPlanTier('user-pro'), 'pro');
  });

  test('returns "pro" for a purchase between 600 and 1999', async () => {
    resetMock();
    const { getUserPlanTier } = await import('@/lib/plan-tier');

    findManyImpl = async () => [{ delta: 1200 }];

    assert.equal(await getUserPlanTier('user-pro-mid'), 'pro');
  });

  test('returns "elite" when the largest purchase is exactly 2000', async () => {
    resetMock();
    const { getUserPlanTier } = await import('@/lib/plan-tier');

    findManyImpl = async () => [{ delta: 2000 }];

    assert.equal(await getUserPlanTier('user-elite'), 'elite');
  });

  test('returns "elite" for a purchase well above 2000', async () => {
    resetMock();
    const { getUserPlanTier } = await import('@/lib/plan-tier');

    findManyImpl = async () => [{ delta: 5000 }];

    assert.equal(await getUserPlanTier('user-elite-big'), 'elite');
  });

  test('uses the LARGEST purchase even when smaller purchases exist (pro wins over starter)', async () => {
    resetMock();
    const { getUserPlanTier } = await import('@/lib/plan-tier');

    // The query orders by delta desc and takes 1, so only the largest is returned.
    findManyImpl = async () => [{ delta: 600 }];

    assert.equal(await getUserPlanTier('user-mixed'), 'pro');
  });

  test('falls back to "free" when the ledger returns an empty delta (delta 0)', async () => {
    resetMock();
    const { getUserPlanTier } = await import('@/lib/plan-tier');

    // A purchase row with delta 0 (shouldn't normally happen with gt:0 filter,
    // but verify the fallback uses `?? 0` correctly).
    findManyImpl = async () => [{ delta: 0 }];

    assert.equal(await getUserPlanTier('user-zero'), 'free');
  });
});

describe('getUserPlanTier — query shape', () => {

  test('filters by userId, reason=purchase, delta>0 and takes 1 ordered by delta desc', async () => {
    resetMock();
    const { getUserPlanTier } = await import('@/lib/plan-tier');

    findManyImpl = async () => [{ delta: 600 }];
    await getUserPlanTier('user-query-check');

    assert.ok(lastArgs, 'findMany should have been called');
    assert.equal(lastArgs!.where.userId, 'user-query-check');
    assert.equal(lastArgs!.where.reason, 'purchase');
    assert.deepEqual(lastArgs!.where.delta, { gt: 0 });
    assert.equal(lastArgs!.take, 1);
    assert.deepEqual(lastArgs!.orderBy, { delta: 'desc' });
    assert.deepEqual(lastArgs!.select, { delta: true });
  });
});
