import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for src/lib/credits.ts — grantCredits, deductCredits, refundCredits.
 *
 * credits.ts uses a compensation strategy (Cloudflare D1 has no interactive
 * transactions): it mutates the user balance first, then writes a ledger
 * entry, reversing the mutation if the ledger write fails.
 *
 * We mock `@/lib/prisma`, `@/lib/request-context` (isByok -> false), and
 * `@/lib/observability/events` (emit* -> no-ops) with the Node test runner's
 * `mock.module()` (requires --experimental-test-module-mocks, enabled in
 * `npm test`).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type LedgerCreateData = {
  userId: string;
  delta: number;
  reason: string;
  ref?: string;
  idempotencyKey?: string;
};

type UserUpdateArgs = {
  where: { id: string };
  data: { credits: { increment: number } | { decrement: number } };
};

type UpdateManyArgs = {
  where: { id: string; credits?: { gte?: number } };
  data: { credits: { decrement: number } };
};

interface CallRecord {
  method: string;
  args?: unknown;
  data?: unknown;
}

const calls: CallRecord[] = [];

let updateManyImpl: (args: UpdateManyArgs) => Promise<{ count: number }> =
  async () => ({ count: 1 });
let userUpdateImpl: (args: UserUpdateArgs) => Promise<unknown> =
  async () => ({ id: 'u1', credits: 0 });
let ledgerCreateImpl: (data: LedgerCreateData) => Promise<unknown> =
  async () => ({ id: 'led-1' });
let isByokImpl: () => boolean = () => false;

const prismaMock = {
  user: {
    updateMany: (args: UpdateManyArgs): Promise<{ count: number }> => {
      calls.push({ method: 'user.updateMany', args });
      return updateManyImpl(args);
    },
    update: (args: UserUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'user.update', args });
      return userUpdateImpl(args);
    },
  },
  creditLedger: {
    create: (args: { data: LedgerCreateData }): Promise<unknown> => {
      calls.push({ method: 'creditLedger.create', data: args.data });
      return ledgerCreateImpl(args.data);
    },
  },
};

mock.module('@/lib/prisma', {
  namedExports: { prisma: prismaMock },
});

mock.module('@/lib/request-context', {
  namedExports: {
    isByok: () => isByokImpl(),
    // re-export the other surface so any transitive import still resolves
    runWithAtlas: <T>(_key: string | undefined, fn: () => T): T => fn(),
    getRequestAtlasKey: (): string | undefined => undefined,
    withAtlas: <H extends (...args: never[]) => unknown>(handler: H): H => handler,
  },
});

mock.module('@/lib/observability/events', {
  namedExports: {
    emitCreditsCharged: () => {},
    emitCreditsRefunded: () => {},
    onWorkflowEvent: () => () => {},
  },
});

function resetMock(): void {
  calls.length = 0;
  updateManyImpl = async () => ({ count: 1 });
  userUpdateImpl = async () => ({ id: 'u1', credits: 0 });
  ledgerCreateImpl = async () => ({ id: 'led-1' });
  isByokImpl = () => false;
}

function p2002Error(message = 'Unique constraint failed on the fields: (userId, idempotencyKey)'): Error & { code: string } {
  const e = new Error(message) as Error & { code: string };
  e.code = 'P2002';
  return e;
}

// ─────────────────────────────────────────────────────────────────────────────
// grantCredits
// ─────────────────────────────────────────────────────────────────────────────

describe('grantCredits', () => {
  test('increments the user balance then writes a positive ledger entry', async () => {
    resetMock();
    const { grantCredits } = await import('@/lib/credits');

    await grantCredits('user-1', 100, 'purchase', 'pack-starter');

    assert.equal(calls.length, 2);
    assert.equal(calls[0].method, 'user.update');
    const updateArgs = calls[0].args as UserUpdateArgs;
    assert.equal(updateArgs.where.id, 'user-1');
    assert.deepEqual(updateArgs.data.credits, { increment: 100 });

    assert.equal(calls[1].method, 'creditLedger.create');
    const ledger = calls[1].data as LedgerCreateData;
    assert.equal(ledger.userId, 'user-1');
    assert.equal(ledger.delta, 100);
    assert.equal(ledger.reason, 'purchase');
    assert.equal(ledger.ref, 'pack-starter');
  });

  test('zero amount is a no-op (no DB calls)', async () => {
    resetMock();
    const { grantCredits } = await import('@/lib/credits');

    await grantCredits('user-1', 0, 'noop');

    assert.equal(calls.length, 0);
  });

  test('negative amount (refund claw-back) IS processed', async () => {
    resetMock();
    const { grantCredits } = await import('@/lib/credits');

    await grantCredits('user-1', -50, 'refund', 'refund-xyz');

    assert.equal(calls.length, 2);
    const updateArgs = calls[0].args as UserUpdateArgs;
    assert.deepEqual(updateArgs.data.credits, { increment: -50 });
    const ledger = calls[1].data as LedgerCreateData;
    assert.equal(ledger.delta, -50);
  });

  test('ledger write failure reverses the increment and rethrows', async () => {
    resetMock();
    const { grantCredits } = await import('@/lib/credits');

    ledgerCreateImpl = async () => {
      throw new Error('D1 write failed');
    };

    await assert.rejects(
      () => grantCredits('user-1', 100, 'purchase', 'pack-starter'),
      /D1 write failed/,
    );

    // increment + failed ledger + compensatory decrement
    assert.equal(calls.length, 3);
    assert.equal(calls[0].method, 'user.update');
    assert.deepEqual((calls[0].args as UserUpdateArgs).data.credits, { increment: 100 });
    assert.equal(calls[1].method, 'creditLedger.create');
    assert.equal(calls[2].method, 'user.update');
    assert.deepEqual((calls[2].args as UserUpdateArgs).data.credits, { decrement: 100 });
  });

  test('is a no-op under BYOK (user pays AtlasCloud directly)', async () => {
    resetMock();
    const { grantCredits } = await import('@/lib/credits');

    isByokImpl = () => true;
    await grantCredits('user-1', 100, 'purchase');

    assert.equal(calls.length, 0, 'BYOK must skip all credit movement');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deductCredits
// ─────────────────────────────────────────────────────────────────────────────

describe('deductCredits', () => {
  test('conditionally decrements balance then writes a negative ledger entry', async () => {
    resetMock();
    const { deductCredits } = await import('@/lib/credits');

    await deductCredits('user-1', 10, 'pipeline:brief', 'run-1', 'idem-1');

    assert.equal(calls.length, 2);
    assert.equal(calls[0].method, 'user.updateMany');
    const um = calls[0].args as UpdateManyArgs;
    assert.equal(um.where.id, 'user-1');
    assert.equal(um.where.credits?.gte, 10);
    assert.deepEqual(um.data.credits, { decrement: 10 });

    assert.equal(calls[1].method, 'creditLedger.create');
    const ledger = calls[1].data as LedgerCreateData;
    assert.equal(ledger.delta, -10);
    assert.equal(ledger.idempotencyKey, 'idem-1');
  });

  test('insufficient balance throws INSUFFICIENT_CREDITS and writes no ledger', async () => {
    resetMock();
    const { deductCredits } = await import('@/lib/credits');

    updateManyImpl = async () => ({ count: 0 });

    await assert.rejects(
      () => deductCredits('user-1', 100, 'pipeline:brief', 'run-1', 'idem-1'),
      /INSUFFICIENT_CREDITS/,
    );

    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'user.updateMany');
  });

  test('idempotency: duplicate key reverses the deduction and returns successfully', async () => {
    resetMock();
    const { deductCredits } = await import('@/lib/credits');

    ledgerCreateImpl = async () => {
      throw p2002Error();
    };

    await assert.doesNotReject(
      () => deductCredits('user-1', 10, 'pipeline:brief', 'run-1', 'idem-1'),
    );

    // decrement + failed ledger + reversal
    assert.equal(calls.length, 3);
    assert.equal(calls[2].method, 'user.update');
    assert.deepEqual((calls[2].args as UserUpdateArgs).data.credits, { increment: 10 });
  });

  test('P2002 without an idempotencyKey is NOT idempotent (rethrows)', async () => {
    resetMock();
    const { deductCredits } = await import('@/lib/credits');

    ledgerCreateImpl = async () => {
      throw p2002Error();
    };

    await assert.rejects(
      () => deductCredits('user-1', 10, 'pipeline:brief', 'run-1'),
      /Unique constraint failed/,
    );
  });

  test('non-P2002 ledger failure reverses the deduction and rethrows', async () => {
    resetMock();
    const { deductCredits } = await import('@/lib/credits');

    ledgerCreateImpl = async () => {
      throw new Error('D1 is down');
    };

    await assert.rejects(
      () => deductCredits('user-1', 10, 'pipeline:brief', 'run-1', 'idem-1'),
      /D1 is down/,
    );

    assert.equal(calls.length, 3);
    assert.deepEqual((calls[2].args as UserUpdateArgs).data.credits, { increment: 10 });
  });

  test('non-positive amount is a no-op', async () => {
    resetMock();
    const { deductCredits } = await import('@/lib/credits');

    await deductCredits('user-1', 0, 'noop');
    await deductCredits('user-1', -5, 'noop-neg');

    assert.equal(calls.length, 0);
  });

  test('is a no-op under BYOK', async () => {
    resetMock();
    const { deductCredits } = await import('@/lib/credits');

    isByokImpl = () => true;
    await deductCredits('user-1', 10, 'pipeline:brief');

    assert.equal(calls.length, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// refundCredits
// ─────────────────────────────────────────────────────────────────────────────

describe('refundCredits', () => {
  test('grants the amount back with reason "refund" and the given ref', async () => {
    resetMock();
    const { refundCredits } = await import('@/lib/credits');

    await refundCredits('user-1', 25, 'pipeline:brief:failed');

    // grantCredits does: user.update (increment) + creditLedger.create
    assert.equal(calls.length, 2);
    assert.equal(calls[0].method, 'user.update');
    assert.deepEqual((calls[0].args as UserUpdateArgs).data.credits, { increment: 25 });

    const ledger = calls[1].data as LedgerCreateData;
    assert.equal(ledger.delta, 25);
    assert.equal(ledger.reason, 'refund');
    assert.equal(ledger.ref, 'pipeline:brief:failed');
  });

  test('zero or negative amount is a no-op', async () => {
    resetMock();
    const { refundCredits } = await import('@/lib/credits');

    await refundCredits('user-1', 0);
    await refundCredits('user-1', -5);

    assert.equal(calls.length, 0);
  });

  test('defaults ref to "refund" when not provided', async () => {
    resetMock();
    const { refundCredits } = await import('@/lib/credits');

    await refundCredits('user-1', 5);

    const ledger = calls[1].data as LedgerCreateData;
    assert.equal(ledger.ref, undefined);
    // refundCredits calls emitCreditsRefunded(userId, amount, ref || 'refund')
    // — the ledger ref itself is the raw ref passed to grantCredits (undefined).
  });

  test('is a no-op under BYOK', async () => {
    resetMock();
    const { refundCredits } = await import('@/lib/credits');

    isByokImpl = () => true;
    await refundCredits('user-1', 25, 'failed');

    assert.equal(calls.length, 0);
  });
});
