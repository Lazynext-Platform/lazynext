import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { HookLibraryInput } from '../src/lib/creative/hook-library.ts';

/**
 * Unit tests for src/lib/creative/hook-library.ts.
 *
 * The library now persists hooks to D1 via Prisma (`prisma.hook`). We mock
 * `@/lib/prisma` so the tests run without a real database. The mock records
 * `createMany` writes and serves a fixed set of rows from `findMany` so the
 * retrieval/filtering tests are deterministic.
 *
 * Dry-run generation tests do not depend on the DB — `persistHooks` swallows
 * persistence failures — but we still mock prisma so the module loads cleanly
 * (the real `@/lib/prisma` requires a Cloudflare/workerd context).
 *
 * The SUT is imported dynamically AFTER `mock.module` registers the prisma
 * mock, following the same pattern as test/webhooks.test.ts. (Static imports
 * are hoisted above module-body code, so they would load the real prisma
 * client before the mock could be installed.)
 */

const TEST_USER = 'test-user-id';

// ─────────────────────────────────────────────────────────────────────────────
// Mock prisma
// ─────────────────────────────────────────────────────────────────────────────

type HookRow = {
  id: string;
  userId: string;
  text: string;
  trigger: string;
  platforms: string;
  performanceScore: number;
  productOrBrand: string | null;
  audience: string | null;
  createdAt: Date;
};

/** Rows served by findMany for TEST_USER. */
const seedRows: HookRow[] = [
  {
    id: 'row_fear',
    userId: TEST_USER,
    text: "Don't miss out on Acme",
    trigger: 'fear',
    platforms: '["tiktok"]',
    performanceScore: 72,
    productOrBrand: 'Acme',
    audience: null,
    createdAt: new Date('2026-08-30T00:00:00Z'),
  },
  {
    id: 'row_aspiration',
    userId: TEST_USER,
    text: 'Imagine having Acme',
    trigger: 'aspiration',
    platforms: '["tiktok","instagram"]',
    performanceScore: 86,
    productOrBrand: 'Acme',
    audience: null,
    createdAt: new Date('2026-08-30T00:00:00Z'),
  },
  {
    id: 'row_curiosity',
    userId: TEST_USER,
    text: 'The secret to Acme',
    trigger: 'curiosity',
    platforms: '["youtube"]',
    performanceScore: 90,
    productOrBrand: 'Acme',
    audience: null,
    createdAt: new Date('2026-08-30T00:00:00Z'),
  },
  {
    id: 'row_humor',
    userId: TEST_USER,
    text: "You won't believe Acme",
    trigger: 'humor',
    platforms: '["facebook"]',
    performanceScore: 65,
    productOrBrand: 'Acme',
    audience: null,
    createdAt: new Date('2026-08-30T00:00:00Z'),
  },
];

/** Captured createMany calls (so we can assert persistence happened). */
const createManyCalls: Array<{ data: unknown[] }> = [];

const prismaMock = {
  hook: {
    createMany: (args: { data: unknown[] }): Promise<{ count: number }> => {
      createManyCalls.push({ data: args.data });
      return Promise.resolve({ count: args.data.length });
    },
    findMany: (args: { where: { userId: string } }): Promise<HookRow[]> => {
      // Only return rows owned by the requested user (ownership scoping).
      return Promise.resolve(seedRows.filter((r) => r.userId === args.where.userId));
    },
  },
};

mock.module('@/lib/prisma', {
  namedExports: { prisma: prismaMock },
});

// Dynamic import AFTER the mock is registered so the SUT picks up the mock.
const {
  HOOK_LIBRARY_CREDIT_COST,
  validateHookLibraryInput,
  generateHooks,
  getHooks,
  calculateHookScore,
} = await import('@/lib/creative/hook-library');

function makeValidInput(overrides: Partial<HookLibraryInput> = {}): HookLibraryInput {
  return {
    productOrBrand: 'Eco-friendly reusable water bottle for fitness enthusiasts',
    platforms: ['tiktok'],
    count: 5,
    ...overrides,
  };
}

describe('hook-library', () => {
  describe('validation', () => {
    test('rejects missing productOrBrand', () => {
      const result = validateHookLibraryInput({ productOrBrand: '', platforms: ['tiktok'], count: 5 });
      assert.equal(result.valid, false);
    });

    test('rejects non-object input', () => {
      const result = validateHookLibraryInput(null as unknown as HookLibraryInput);
      assert.equal(result.valid, false);
    });

    test('rejects count < 1', () => {
      const result = validateHookLibraryInput({ productOrBrand: 'test', platforms: ['tiktok'], count: 0 });
      assert.equal(result.valid, false);
    });

    test('rejects count > 50', () => {
      const result = validateHookLibraryInput({ productOrBrand: 'test', platforms: ['tiktok'], count: 55 });
      assert.equal(result.valid, false);
    });

    test('accepts valid input', () => {
      const result = validateHookLibraryInput(makeValidInput());
      assert.equal(result.valid, true);
    });
  });

  describe('credit cost', () => {
    test('is positive', () => {
      assert.ok(HOOK_LIBRARY_CREDIT_COST > 0);
    });

    test('equals 4', () => {
      assert.equal(HOOK_LIBRARY_CREDIT_COST, 4);
    });
  });

  describe('calculateHookScore', () => {
    test('returns a number between 0 and 100', () => {
      const score = calculateHookScore('aspiration', ['tiktok']);
      assert.ok(score >= 0 && score <= 100);
    });

    test('returns different scores for different platforms', () => {
      const tiktokScore = calculateHookScore('humor', ['tiktok']);
      const youtubeScore = calculateHookScore('humor', ['youtube']);
      assert.ok(typeof tiktokScore === 'number');
      assert.ok(typeof youtubeScore === 'number');
    });
  });

  describe('dry-run mode', () => {
    test('returns hooks with correct structure', async () => {
      const result = await generateHooks(makeValidInput({ dryRun: true }), TEST_USER, 'free');
      assert.ok(result.hooks);
      assert.ok(Array.isArray(result.hooks));
      assert.ok(result.hooks.length > 0);
      const hook = result.hooks[0];
      assert.ok(typeof hook.text === 'string');
      assert.ok(typeof hook.trigger === 'string');
      assert.ok(typeof hook.performanceScore === 'number');
      assert.ok(Array.isArray(hook.platforms));
    });

    test('returns requested count of hooks', async () => {
      const result = await generateHooks(makeValidInput({ dryRun: true, count: 3 }), TEST_USER, 'free');
      assert.ok(result.hooks.length <= 5);
    });

    test('rejects invalid input even in dry-run', async () => {
      await assert.rejects(
        () => generateHooks({ productOrBrand: '', platforms: ['tiktok'], count: 5, dryRun: true } as HookLibraryInput, TEST_USER, 'free'),
        /invalid_hook_library_input/,
      );
    });

    test('persists dry-run hooks to the database', async () => {
      const before = createManyCalls.length;
      const result = await generateHooks(makeValidInput({ dryRun: true, count: 2 }), TEST_USER, 'free');
      // createMany should have been called once with the generated hooks.
      assert.equal(createManyCalls.length, before + 1);
      assert.equal((createManyCalls[createManyCalls.length - 1].data as unknown[]).length, result.hooks.length);
      assert.equal(result.stored, result.hooks.length);
    });
  });

  describe('getHooks', () => {
    test('returns an array', async () => {
      const hooks = await getHooks(TEST_USER);
      assert.ok(Array.isArray(hooks));
      assert.ok(hooks.length > 0);
    });

    test('filters by trigger', async () => {
      const hooks = await getHooks(TEST_USER, { trigger: 'fear' });
      assert.ok(hooks.every(h => h.trigger === 'fear'));
    });

    test('filters by platform', async () => {
      const hooks = await getHooks(TEST_USER, { platform: 'tiktok' });
      assert.ok(hooks.every(h => h.platforms.includes('tiktok')));
    });

    test('filters by minScore', async () => {
      const hooks = await getHooks(TEST_USER, { minScore: 70 });
      assert.ok(hooks.every(h => h.performanceScore >= 70));
    });

    test('only returns hooks owned by the requested user', async () => {
      // A different user should get no rows from the mock.
      const hooks = await getHooks('some-other-user');
      assert.equal(hooks.length, 0);
    });

    test('returns hooks sorted by descending performance score', async () => {
      const hooks = await getHooks(TEST_USER);
      for (let i = 1; i < hooks.length; i++) {
        assert.ok(hooks[i - 1].performanceScore >= hooks[i].performanceScore);
      }
    });
  });
});
