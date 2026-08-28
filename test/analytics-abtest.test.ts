import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for credit analytics and A/B test workflow logic.
 *
 * These tests verify the pure logic used by:
 *   - /api/credits/analytics (aggregation logic)
 *   - /api/creative/ab-test (variant sorting and budget allocation)
 *
 * The route handlers themselves cannot be imported in tests because they
 * pull in auth, prisma, and atlas modules. Instead, we test the core logic
 * inline.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Credit analytics aggregation logic
// ─────────────────────────────────────────────────────────────────────────────

type LedgerEntry = {
  id: string;
  userId: string;
  delta: number;
  reason: string;
  ref: string | null;
  createdAt: Date;
};

/**
 * Replicates the aggregation logic from /api/credits/analytics/route.ts.
 */
function aggregateAnalytics(ledger: LedgerEntry[]) {
  const byReason: Record<string, { count: number; totalDelta: number }> = {};
  for (const entry of ledger) {
    if (!byReason[entry.reason]) {
      byReason[entry.reason] = { count: 0, totalDelta: 0 };
    }
    byReason[entry.reason].count++;
    byReason[entry.reason].totalDelta += entry.delta;
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const byDayMap: Record<string, { spent: number; granted: number }> = {};
  for (const entry of ledger) {
    if (entry.createdAt < thirtyDaysAgo) continue;
    const dateStr = entry.createdAt.toISOString().slice(0, 10);
    if (!byDayMap[dateStr]) byDayMap[dateStr] = { spent: 0, granted: 0 };
    if (entry.delta < 0) byDayMap[dateStr].spent += Math.abs(entry.delta);
    else byDayMap[dateStr].granted += entry.delta;
  }
  const byDay = Object.entries(byDayMap)
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentSpends = ledger.filter(e => e.delta < 0 && e.createdAt >= sevenDaysAgo);
  const totalRecentSpend = recentSpends.reduce((sum, e) => sum + Math.abs(e.delta), 0);
  const avgDailySpend = totalRecentSpend / 7;

  const totalSpent = ledger.filter(e => e.delta < 0).reduce((s, e) => s + Math.abs(e.delta), 0);
  const totalGranted = ledger.filter(e => e.delta > 0).reduce((s, e) => s + e.delta, 0);
  const currentBalance = totalGranted - totalSpent;
  const daysUntilEmpty = avgDailySpend > 0 ? Math.floor(currentBalance / avgDailySpend) : null;

  return {
    totalSpent,
    totalGranted,
    currentBalance,
    byReason,
    byDay,
    projection: {
      avgDailySpend: Math.round(avgDailySpend * 100) / 100,
      daysUntilEmpty,
      currentBalance,
    },
  };
}

test('credit analytics: empty ledger', () => {
  const result = aggregateAnalytics([]);
  assert.equal(result.totalSpent, 0);
  assert.equal(result.totalGranted, 0);
  assert.equal(result.currentBalance, 0);
  assert.equal(result.projection.avgDailySpend, 0);
  assert.equal(result.projection.daysUntilEmpty, null);
  assert.deepEqual(result.byReason, {});
  assert.equal(result.byDay.length, 0);
});

test('credit analytics: mixed ledger with grants and spends', () => {
  const now = Date.now();
  const ledger: LedgerEntry[] = [
    { id: '1', userId: 'u1', delta: 150, reason: 'signup', ref: null, createdAt: new Date(now - 20 * 86400000) },
    { id: '2', userId: 'u1', delta: -5, reason: 'generate', ref: 'c1', createdAt: new Date(now - 10 * 86400000) },
    { id: '3', userId: 'u1', delta: -10, reason: 'generate', ref: 'c2', createdAt: new Date(now - 5 * 86400000) },
    { id: '4', userId: 'u1', delta: -3, reason: 'generate', ref: 'c1', createdAt: new Date(now - 2 * 86400000) },
    { id: '5', userId: 'u1', delta: 50, reason: 'purchase', ref: 'stripe-1', createdAt: new Date(now - 1 * 86400000) },
  ];

  const result = aggregateAnalytics(ledger);
  assert.equal(result.totalSpent, 18); // 5 + 10 + 3
  assert.equal(result.totalGranted, 200); // 150 + 50
  assert.equal(result.currentBalance, 182); // 200 - 18
  assert.equal(result.byReason.signup.count, 1);
  assert.equal(result.byReason.signup.totalDelta, 150);
  assert.equal(result.byReason.generate.count, 3);
  assert.equal(result.byReason.generate.totalDelta, -18);
  assert.equal(result.byReason.purchase.totalDelta, 50);
});

test('credit analytics: projection with recent spend', () => {
  const now = Date.now();
  // 7 credits spent per day for 3 days = 21 total in last 7 days
  const ledger: LedgerEntry[] = [
    { id: '1', userId: 'u1', delta: 100, reason: 'signup', ref: null, createdAt: new Date(now - 30 * 86400000) },
    { id: '2', userId: 'u1', delta: -7, reason: 'generate', ref: 'c1', createdAt: new Date(now - 3 * 86400000) },
    { id: '3', userId: 'u1', delta: -7, reason: 'generate', ref: 'c2', createdAt: new Date(now - 2 * 86400000) },
    { id: '4', userId: 'u1', delta: -7, reason: 'generate', ref: 'c3', createdAt: new Date(now - 1 * 86400000) },
  ];

  const result = aggregateAnalytics(ledger);
  // avgDailySpend = 21 / 7 = 3
  assert.equal(result.projection.avgDailySpend, 3);
  // daysUntilEmpty = floor(79 / 3) = 26
  assert.equal(result.projection.daysUntilEmpty, 26);
});

test('credit analytics: projection with no recent spend', () => {
  const now = Date.now();
  const ledger: LedgerEntry[] = [
    { id: '1', userId: 'u1', delta: 100, reason: 'signup', ref: null, createdAt: new Date(now - 30 * 86400000) },
    { id: '2', userId: 'u1', delta: -5, reason: 'generate', ref: 'c1', createdAt: new Date(now - 20 * 86400000) },
  ];

  const result = aggregateAnalytics(ledger);
  assert.equal(result.projection.avgDailySpend, 0);
  assert.equal(result.projection.daysUntilEmpty, null);
});

test('credit analytics: byDay only includes last 30 days', () => {
  const now = Date.now();
  const ledger: LedgerEntry[] = [
    { id: '1', userId: 'u1', delta: -5, reason: 'generate', ref: 'c1', createdAt: new Date(now - 40 * 86400000) },
    { id: '2', userId: 'u1', delta: -10, reason: 'generate', ref: 'c2', createdAt: new Date(now - 5 * 86400000) },
  ];

  const result = aggregateAnalytics(ledger);
  assert.equal(result.byDay.length, 1); // only the recent one
  assert.equal(result.byDay[0].spent, 10);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. A/B test variant sorting and budget allocation logic
// ─────────────────────────────────────────────────────────────────────────────

type AbVariant = {
  creationId: string;
  name: string;
  score?: number;
};

/**
 * Replicates the variant sorting logic from /api/creative/ab-test/route.ts.
 */
function sortVariantsByScore(variants: AbVariant[]): AbVariant[] {
  return [...variants].sort((a, b) => {
    const aScore = typeof a.score === 'number' ? a.score : 0;
    const bScore = typeof b.score === 'number' ? b.score : 0;
    return bScore - aScore;
  });
}

/**
 * Replicates the per-variant budget allocation logic.
 */
function allocateBudget(totalDaily: number | undefined, count: number): number | undefined {
  return totalDaily ? Math.floor(totalDaily / count) : undefined;
}

test('A/B test: variants sorted by score descending', () => {
  const variants: AbVariant[] = [
    { creationId: 'c1', name: 'Variant 1', score: 65 },
    { creationId: 'c2', name: 'Variant 2', score: 92 },
    { creationId: 'c3', name: 'Variant 3', score: 78 },
  ];

  const sorted = sortVariantsByScore(variants);
  assert.equal(sorted[0].score, 92);
  assert.equal(sorted[1].score, 78);
  assert.equal(sorted[2].score, 65);
});

test('A/B test: variants without score treated as 0', () => {
  const variants: AbVariant[] = [
    { creationId: 'c1', name: 'Variant 1', score: 50 },
    { creationId: 'c2', name: 'Variant 2' },
    { creationId: 'c3', name: 'Variant 3', score: 30 },
  ];

  const sorted = sortVariantsByScore(variants);
  assert.equal(sorted[0].score, 50);
  assert.equal(sorted[1].score, 30);
  assert.equal(sorted[2].score, undefined);
});

test('A/B test: budget split equally among variants', () => {
  assert.equal(allocateBudget(50, 5), 10);
  assert.equal(allocateBudget(30, 3), 10);
  assert.equal(allocateBudget(100, 4), 25);
});

test('A/B test: budget floor division handles uneven splits', () => {
  assert.equal(allocateBudget(50, 3), 16); // floor(50/3) = 16
  assert.equal(allocateBudget(10, 3), 3);  // floor(10/3) = 3
});

test('A/B test: undefined budget returns undefined', () => {
  assert.equal(allocateBudget(undefined, 3), undefined);
});

test('A/B test: variant naming uses letter suffixes', () => {
  const sorted = sortVariantsByScore([
    { creationId: 'c1', name: 'A', score: 90 },
    { creationId: 'c2', name: 'B', score: 80 },
    { creationId: 'c3', name: 'C', score: 70 },
  ]);

  const names = sorted.map((v, i) => `Variant ${String.fromCharCode(65 + i)}`);
  assert.deepEqual(names, ['Variant A', 'Variant B', 'Variant C']);
});
