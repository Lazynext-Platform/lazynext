import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for the idempotencyKey behavior in deductCredits().
 *
 * deductCredits() uses a compensation strategy (Cloudflare D1 has no
 * interactive transactions): it decrements the user balance first, then
 * writes a ledger entry. If the ledger write fails with a unique-constraint
 * violation (P2002) on (userId, idempotencyKey), the charge already happened
 * in a previous request — the duplicate deduction is reversed and the call
 * returns successfully (idempotent retry).
 *
 * Because deductCredits imports `prisma` from '@/lib/prisma', we mock that
 * module with the Node test runner's `mock.module()` (requires the
 * --experimental-test-module-mocks flag, already enabled in `npm test`).
 * The mock is backed by a mutable implementation object so each test can
 * configure the database behavior it needs.
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

type UpdateManyArgs = {
  where: { id: string; credits?: { gte?: number } };
  data: { credits: { decrement: number } };
};

type UserUpdateArgs = {
  where: { id: string };
  data: { credits: { increment: number } };
};

interface CallRecord {
  method: string;
  args?: unknown;
  data?: unknown;
}

/** Recorded call sequence so tests can assert ordering. */
const calls: CallRecord[] = [];

/** Swappable implementations — each test configures these as needed. */
let updateManyImpl: (args: UpdateManyArgs) => Promise<{ count: number }> =
  async () => ({ count: 1 });
let ledgerCreateImpl: (data: LedgerCreateData) => Promise<unknown> =
  async () => ({ id: 'led-1' });
let userUpdateImpl: (args: UserUpdateArgs) => Promise<unknown> =
  async () => ({ id: 'u1', credits: 0 });

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

// Mock the prisma module before any test imports credits.ts. The namedExports
// form is required by the Node test runner's module mock API.
mock.module('@/lib/prisma', {
  namedExports: { prisma: prismaMock },
});

/** Reset the call log and restore default (success) implementations. */
function resetMock(): void {
  calls.length = 0;
  updateManyImpl = async () => ({ count: 1 });
  ledgerCreateImpl = async () => ({ id: 'led-1' });
  userUpdateImpl = async () => ({ id: 'u1', credits: 0 });
}

/** Build a Prisma P2002 unique-constraint error. */
function p2002Error(message = 'Unique constraint failed on the fields: (userId, idempotencyKey)'): Error & { code: string } {
  const e = new Error(message) as Error & { code: string };
  e.code = 'P2002';
  return e;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('deductCredits — idempotencyKey behavior', () => {

  test('successful call creates a ledger entry with the idempotencyKey', async () => {
    resetMock();
    const { deductCredits } = await import('@/lib/credits');

    await deductCredits('user-1', 10, 'pipeline:brief', 'run-42', 'idem-key-1');

    // 1) balance decremented, 2) ledger created — in that order
    assert.equal(calls.length, 2, 'should make exactly two DB calls');
    assert.equal(calls[0].method, 'user.updateMany');
    assert.equal(calls[1].method, 'creditLedger.create');

    // The ledger entry carries the negative delta and the idempotencyKey
    const ledgerData = calls[1].data as LedgerCreateData;
    assert.equal(ledgerData.userId, 'user-1');
    assert.equal(ledgerData.delta, -10);
    assert.equal(ledgerData.reason, 'pipeline:brief');
    assert.equal(ledgerData.ref, 'run-42');
    assert.equal(ledgerData.idempotencyKey, 'idem-key-1');

    // The deduction used a conditional updateMany with gte guard
    const updateArgs = calls[0].args as UpdateManyArgs;
    assert.equal(updateArgs.where.id, 'user-1');
    assert.equal(updateArgs.data.credits.decrement, 10);
    assert.equal(updateArgs.where.credits?.gte, 10);
  });

  test('duplicate call with same idempotencyKey decrements first, then reverses on P2002, and returns successfully', async () => {
    resetMock();
    const { deductCredits } = await import('@/lib/credits');

    // Simulate the ledger already existing: the create throws P2002.
    ledgerCreateImpl = async () => {
      throw p2002Error();
    };

    // Must NOT throw — idempotent retry returns successfully.
    await assert.doesNotReject(
      () => deductCredits('user-1', 10, 'pipeline:brief', 'run-42', 'idem-key-1'),
    );

    // The balance was decremented first (compensation model)...
    assert.equal(calls.length, 3, 'decrement + failed ledger + reversal');
    assert.equal(calls[0].method, 'user.updateMany');
    assert.equal(calls[1].method, 'creditLedger.create');
    assert.equal(calls[2].method, 'user.update');

    // ...then the deduction was reversed (credits incremented back).
    const reversalArgs = calls[2].args as UserUpdateArgs;
    assert.equal(reversalArgs.where.id, 'user-1');
    assert.equal(reversalArgs.data.credits.increment, 10);
  });

  test('duplicate call with P2002 does not emit a refund event (only a reversal)', async () => {
    resetMock();
    const { deductCredits } = await import('@/lib/credits');
    const { onWorkflowEvent } = await import('@/lib/observability/events');

    const events: string[] = [];
    const off = onWorkflowEvent((e) => events.push(e.type));

    ledgerCreateImpl = async () => {
      throw p2002Error();
    };

    await deductCredits('user-2', 7, 'pipeline:script', 'run-7', 'idem-key-2');
    off();

    // credits.charged IS emitted (the deduction happened), but credits.refunded
    // is NOT — the idempotent reversal path returns early before refund event.
    assert.ok(events.includes('credits.charged'), 'charged event should be emitted');
    assert.ok(!events.includes('credits.refunded'), 'no refund event on idempotent reversal');
  });

  test('non-P2002 ledger failure still reverses AND rethrows (not idempotent)', async () => {
    resetMock();
    const { deductCredits } = await import('@/lib/credits');

    // A generic DB error (not a unique-constraint violation) must propagate.
    ledgerCreateImpl = async () => {
      throw new Error('D1 is down');
    };

    await assert.rejects(
      () => deductCredits('user-1', 10, 'pipeline:brief', 'run-42', 'idem-key-1'),
      /D1 is down/,
    );

    // decrement + failed ledger + compensatory reversal
    assert.equal(calls.length, 3);
    assert.equal(calls[0].method, 'user.updateMany');
    assert.equal(calls[1].method, 'creditLedger.create');
    assert.equal(calls[2].method, 'user.update');
    const reversalArgs = calls[2].args as UserUpdateArgs;
    assert.equal(reversalArgs.data.credits.increment, 10);
  });

  test('P2002 without an idempotencyKey is treated as a generic failure (rethrows)', async () => {
    resetMock();
    const { deductCredits } = await import('@/lib/credits');

    // No idempotencyKey supplied — the unique-violation branch is NOT taken
    // (it requires `idempotencyKey` to be set), so the error rethrows.
    ledgerCreateImpl = async () => {
      throw p2002Error();
    };

    await assert.rejects(
      // intentionally omit the idempotencyKey argument
      () => deductCredits('user-1', 10, 'pipeline:brief', 'run-42'),
      /Unique constraint failed/,
    );

    // decrement + failed ledger + compensatory reversal (no early return)
    assert.equal(calls.length, 3);
    assert.equal(calls[2].method, 'user.update');
  });

  test('insufficient balance throws INSUFFICIENT_CREDITS and writes no ledger', async () => {
    resetMock();
    const { deductCredits } = await import('@/lib/credits');

    // updateMany affects 0 rows → balance too low
    updateManyImpl = async () => ({ count: 0 });

    await assert.rejects(
      () => deductCredits('user-1', 100, 'pipeline:brief', 'run-42', 'idem-key-1'),
      /INSUFFICIENT_CREDITS/,
    );

    // Only the conditional decrement was attempted; no ledger, no reversal.
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'user.updateMany');
  });
});

describe('deductCredits — without idempotencyKey (backwards compatible)', () => {

  test('works as before: decrements and creates a ledger entry with null key', async () => {
    resetMock();
    const { deductCredits } = await import('@/lib/credits');

    await deductCredits('user-1', 5, 'adhoc', 'ref-9');

    assert.equal(calls.length, 2);
    assert.equal(calls[0].method, 'user.updateMany');
    assert.equal(calls[1].method, 'creditLedger.create');

    const ledgerData = calls[1].data as LedgerCreateData;
    assert.equal(ledgerData.delta, -5);
    assert.equal(ledgerData.idempotencyKey, undefined);
  });

  test('non-positive amount is a no-op (no DB calls)', async () => {
    resetMock();
    const { deductCredits } = await import('@/lib/credits');

    await deductCredits('user-1', 0, 'noop');
    await deductCredits('user-1', -5, 'noop-negative');

    assert.equal(calls.length, 0, 'zero/negative amounts must not touch the DB');
  });
});
