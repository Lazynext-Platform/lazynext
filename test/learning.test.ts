import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  PerformanceInsight,
  PerformanceSummary,
} from '@/lib/creative/learning';

// ── Type shape instantiation (compile-time + runtime smoke) ──

test('PerformanceInsight accepts valid shape', () => {
  const insight: PerformanceInsight = {
    metric: 'ctr',
    dimension: 'hookType',
    value: 'pattern-interrupt',
    avgScore: 4.5,
    sampleSize: 120,
    recommendation: 'Use more pattern-interrupt hooks',
  };
  assert.equal(insight.metric, 'ctr');
  assert.equal(insight.dimension, 'hookType');
  assert.equal(insight.avgScore, 4.5);
  assert.equal(insight.sampleSize, 120);
});

test('PerformanceSummary accepts empty shape', () => {
  const summary: PerformanceSummary = {
    totalCampaigns: 0,
    totalSpend: 0,
    totalRevenue: 0,
    overallRoas: 0,
    topHooks: [],
    topAngles: [],
    topPlatforms: [],
    recommendations: [],
  };
  assert.equal(summary.totalCampaigns, 0);
  assert.equal(summary.overallRoas, 0);
  assert.ok(Array.isArray(summary.topHooks));
  assert.ok(Array.isArray(summary.recommendations));
});

test('PerformanceSummary accepts populated shape', () => {
  const insight: PerformanceInsight = {
    metric: 'roas',
    dimension: 'platform',
    value: 'tiktok',
    avgScore: 3.2,
    sampleSize: 50,
    recommendation: 'Prioritize TikTok for this audience',
  };
  const summary: PerformanceSummary = {
    totalCampaigns: 10,
    totalSpend: 5000,
    totalRevenue: 18000,
    overallRoas: 3.6,
    topHooks: [insight],
    topAngles: [],
    topPlatforms: [insight],
    recommendations: ['Focus on TikTok', 'Test more UGC hooks'],
  };
  assert.equal(summary.totalCampaigns, 10);
  assert.equal(summary.overallRoas, 3.6);
  assert.equal(summary.topHooks.length, 1);
  assert.equal(summary.recommendations.length, 2);
});
