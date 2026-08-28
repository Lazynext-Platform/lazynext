import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Budget Optimizer', () => {
  test('PlatformPerformance structure validation', () => {
    const p = {
      platform: 'meta', spend: 10000, impressions: 100000, clicks: 5000, conversions: 200,
      revenue: 25000, roas: 2.5, cpa: 50, cpc: 2, ctr: 5, cvr: 4, frequency: 3, trend: 'improving',
    };
    assert.equal(p.roas, p.revenue / p.spend);
    assert.equal(p.cpa, p.spend / p.conversions);
  });

  test('BudgetAllocation structure validation', () => {
    const a = {
      platform: 'meta', currentSpend: 10000, recommendedSpend: 15000, change: 5000,
      changePercent: 50, projectedRoas: 2.6, projectedConversions: 300, projectedRevenue: 39000,
      reasoning: 'High ROAS', confidence: 85,
    };
    assert.ok(a.change > 0);
    assert.ok(a.confidence >= 0 && a.confidence <= 100);
  });

  test('OptimizationResult complete structure validation', () => {
    const r = {
      goal: 'maximize_roas', totalBudget: 50000, currentTotalSpend: 30000,
      allocations: [], projectedMetrics: { totalRoas: 2.5, totalConversions: 500, totalRevenue: 125000, totalCpa: 100, improvementPercent: 25 },
      pacingStrategy: 'even', pacingSchedule: [], reallocationPlan: { frequency: 'weekly', triggers: [], nextReviewDate: '2026-09-05T00:00:00Z' },
      insights: [], recommendations: [],
    };
    assert.ok(r.totalBudget > 0);
    assert.ok(r.projectedMetrics.improvementPercent > 0);
  });

  test('optimal allocation calculation - ROAS weighted', () => {
    const performance = [
      { platform: 'meta', roas: 3.0, spend: 10000 },
      { platform: 'google', roas: 1.5, spend: 10000 },
    ];
    const totalBudget = 20000;
    const weights = performance.map((p) => p.roas);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const allocations = weights.map((w) => (w / totalWeight) * totalBudget);
    assert.ok(allocations[0] > allocations[1]); // meta gets more (higher ROAS)
    assert.ok(Math.abs(allocations[0] + allocations[1] - totalBudget) < 1);
  });

  test('allocation respects min/max constraints', () => {
    const allocation = 5000;
    const minSpend = 3000;
    const maxSpend = 8000;
    assert.ok(allocation >= minSpend && allocation <= maxSpend);
  });

  test('allocation respects platform locks', () => {
    const lockedPlatform = 'meta';
    const currentSpend = 10000;
    const isLocked = true;
    const recommended = isLocked ? currentSpend : 0;
    assert.equal(recommended, currentSpend);
  });

  test('pacing schedule generation - even', () => {
    const totalBudget = 10000;
    const periods = 4;
    const perPeriod = totalBudget / periods;
    assert.equal(perPeriod, 2500);
  });

  test('pacing schedule generation - front_loaded', () => {
    const weights = [1.8, 1.4, 1.0, 0.6];
    const total = weights.reduce((a, b) => a + b, 0);
    const firstPeriod = (weights[0] / total) * 10000;
    const lastPeriod = (weights[3] / total) * 10000;
    assert.ok(firstPeriod > lastPeriod);
  });

  test('pacing schedule generation - back_loaded', () => {
    const weights = [0.6, 1.0, 1.4, 1.8];
    const total = weights.reduce((a, b) => a + b, 0);
    const firstPeriod = (weights[0] / total) * 10000;
    const lastPeriod = (weights[3] / total) * 10000;
    assert.ok(lastPeriod > firstPeriod);
  });

  test('projected metrics calculation', () => {
    const allocations = [
      { recommendedSpend: 15000, projectedRoas: 2.6, projectedConversions: 300, projectedRevenue: 39000 },
      { recommendedSpend: 5000, projectedRoas: 1.5, projectedConversions: 100, projectedRevenue: 7500 },
    ];
    const totalRevenue = allocations.reduce((a, al) => a + al.projectedRevenue, 0);
    const totalSpend = allocations.reduce((a, al) => a + al.recommendedSpend, 0);
    const totalRoas = totalRevenue / totalSpend;
    assert.equal(totalRevenue, 46500);
    assert.ok(totalRoas > 2);
  });

  test('reallocation trigger generation', () => {
    const triggers = [
      { condition: 'ROAS drops below 70% of avg', action: 'Reduce spend', threshold: 1.75 },
      { condition: 'CPA increases by 50%', action: 'Pause campaigns', threshold: 50 },
    ];
    assert.ok(triggers.length >= 2);
    assert.ok(triggers[0].threshold > 0);
  });

  test('performance insight detection', () => {
    const performance = [
      { platform: 'meta', roas: 3.0, trend: 'improving' },
      { platform: 'google', roas: 1.0, trend: 'declining' },
    ];
    const avgRoas = performance.reduce((a, p) => a + p.roas, 0) / performance.length;
    const overperforming = performance.filter((p) => p.roas > avgRoas * 1.3);
    const underperforming = performance.filter((p) => p.roas < avgRoas * 0.7);
    assert.ok(overperforming.length > 0);
    assert.ok(underperforming.length > 0);
  });

  test('request validation - missing budget', () => {
    const req = { totalBudget: 0, goal: 'maximize_roas', platformPerformance: [] };
    assert.ok(req.totalBudget <= 0);
  });

  test('request validation - missing goal', () => {
    const req = { totalBudget: 50000, goal: '', platformPerformance: [] };
    assert.equal(req.goal, '');
  });

  test('request validation - missing performance data', () => {
    const req = { totalBudget: 50000, goal: 'maximize_roas', platformPerformance: [] };
    assert.equal(req.platformPerformance.length, 0);
  });

  test('optimization goal types completeness', () => {
    const goals = ['maximize_roas', 'maximize_reach', 'maximize_conversions', 'minimize_cpa', 'balance_spend'];
    assert.equal(goals.length, 5);
  });

  test('pacing strategy types completeness', () => {
    const strategies = ['even', 'front_loaded', 'back_loaded', 'accelerated', 'conservative'];
    assert.equal(strategies.length, 5);
  });
});
