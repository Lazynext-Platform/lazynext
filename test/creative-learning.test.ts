import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the performance learning loop (src/lib/creative/learning.ts).
 *
 * The production functions query Prisma, whose Cloudflare-backed client cannot
 * be instantiated in the Node test runner. Following the same convention as
 * test/credits-refund.test.ts and test/pricing.test.ts, we replicate the pure
 * aggregation logic here to verify grouping/averaging and the empty-data
 * behavior hermetically — no database required.
 */

interface PerformanceInsight {
  metric: string;
  dimension: string;
  value: string;
  avgScore: number;
  sampleSize: number;
  recommendation: string;
}

interface PerformanceSummary {
  totalCampaigns: number;
  totalSpend: number;
  totalRevenue: number;
  overallRoas: number;
  topHooks: PerformanceInsight[];
  topAngles: PerformanceInsight[];
  topPlatforms: PerformanceInsight[];
  recommendations: string[];
}

interface PerfRecord {
  campaignId: string | null;
  hookType: string | null;
  angleName: string | null;
  platform: string;
  ctr: number;
  cvr: number;
  roas: number;
  spend: number;
  revenue: number;
}

// Replicate aggregateBy from learning.ts
function aggregateBy(
  records: PerfRecord[],
  field: 'hookType' | 'angleName' | 'platform',
  metric: 'ctr' | 'cvr' | 'roas',
): PerformanceInsight[] {
  const groups = new Map<string, { sum: number; count: number }>();
  for (const r of records) {
    const key = (r[field] as string | null) || 'unknown';
    const val = r[metric] || 0;
    const g = groups.get(key) || { sum: 0, count: 0 };
    g.sum += val;
    g.count += 1;
    groups.set(key, g);
  }
  return Array.from(groups.entries())
    .map(([value, g]) => ({
      metric,
      dimension: field,
      value,
      avgScore: g.sum / g.count,
      sampleSize: g.count,
      recommendation: `${value}: avg ${metric} ${(g.sum / g.count).toFixed(2)} across ${g.count} data points`,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);
}

// Replicate getPerformanceSummary from learning.ts (records injected for testability)
function getPerformanceSummary(records: PerfRecord[]): PerformanceSummary {
  if (records.length === 0) {
    return {
      totalCampaigns: 0,
      totalSpend: 0,
      totalRevenue: 0,
      overallRoas: 0,
      topHooks: [],
      topAngles: [],
      topPlatforms: [],
      recommendations: ['No performance data yet. Run campaigns to start collecting insights.'],
    };
  }

  const totalSpend = records.reduce((s, r) => s + r.spend, 0);
  const totalRevenue = records.reduce((s, r) => s + r.revenue, 0);
  const overallRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const byHook = aggregateBy(records, 'hookType', 'ctr');
  const byAngle = aggregateBy(records, 'angleName', 'roas');
  const byPlatform = aggregateBy(records, 'platform', 'ctr');

  const recommendations: string[] = [];
  if (byHook.length > 0 && byHook[0].avgScore > 3) {
    recommendations.push(`Hooks of type "${byHook[0].value}" perform best (CTR ${byHook[0].avgScore.toFixed(1)}%). Prioritize this hook style.`);
  }
  if (byAngle.length > 0 && byAngle[0].avgScore > 2) {
    recommendations.push(`Angle "${byAngle[0].value}" has the highest ROAS (${byAngle[0].avgScore.toFixed(2)}x). Reuse this angle for similar products.`);
  }
  if (overallRoas < 1 && totalSpend > 0) {
    recommendations.push('Overall ROAS is below 1.0 — consider testing new creative angles or audiences.');
  }

  return {
    totalCampaigns: new Set(records.map((r) => r.campaignId).filter(Boolean)).size,
    totalSpend,
    totalRevenue,
    overallRoas,
    topHooks: byHook.slice(0, 3),
    topAngles: byAngle.slice(0, 3),
    topPlatforms: byPlatform.slice(0, 3),
    recommendations,
  };
}

// Replicate getLearningsContext from learning.ts
function getLearningsContext(records: PerfRecord[]): string {
  const summary = getPerformanceSummary(records);
  if (summary.totalCampaigns === 0) return '';

  const parts: string[] = [`Past campaign performance (${summary.totalCampaigns} campaigns, ROAS ${summary.overallRoas.toFixed(2)}x):`];
  for (const rec of summary.recommendations) {
    parts.push(`- ${rec}`);
  }
  if (summary.topHooks.length > 0) {
    parts.push(`Top hook types: ${summary.topHooks.map((h) => `${h.value} (${h.avgScore.toFixed(1)}% CTR)`).join(', ')}`);
  }
  if (summary.topAngles.length > 0) {
    parts.push(`Top angles: ${summary.topAngles.map((a) => `${a.value} (${a.avgScore.toFixed(2)}x ROAS)`).join(', ')}`);
  }
  return parts.join('\n');
}

// ── Empty-data behavior ──

test('getPerformanceSummary returns an empty summary when no data', () => {
  const summary = getPerformanceSummary([]);

  assert.equal(summary.totalCampaigns, 0);
  assert.equal(summary.totalSpend, 0);
  assert.equal(summary.totalRevenue, 0);
  assert.equal(summary.overallRoas, 0);
  assert.deepEqual(summary.topHooks, []);
  assert.deepEqual(summary.topAngles, []);
  assert.deepEqual(summary.topPlatforms, []);
  assert.ok(Array.isArray(summary.recommendations));
  assert.ok(summary.recommendations.length > 0, 'should include a no-data recommendation');
  assert.ok(
    /no performance data/i.test(summary.recommendations[0]),
    'first recommendation should mention the lack of data',
  );
});

test('getLearningsContext returns an empty string when no data', () => {
  assert.equal(getLearningsContext([]), '');
});

test('getPerformanceSummary returns a structurally valid PerformanceSummary', () => {
  const summary = getPerformanceSummary([]);
  const keys: (keyof PerformanceSummary)[] = [
    'totalCampaigns', 'totalSpend', 'totalRevenue', 'overallRoas',
    'topHooks', 'topAngles', 'topPlatforms', 'recommendations',
  ];
  for (const k of keys) {
    assert.ok(k in summary, `summary should include ${k}`);
  }
  assert.equal(typeof summary.totalCampaigns, 'number');
  assert.equal(typeof summary.totalSpend, 'number');
  assert.equal(typeof summary.totalRevenue, 'number');
  assert.equal(typeof summary.overallRoas, 'number');
  assert.ok(Array.isArray(summary.topHooks));
  assert.ok(Array.isArray(summary.topAngles));
  assert.ok(Array.isArray(summary.topPlatforms));
  assert.ok(Array.isArray(summary.recommendations));
});

// ── aggregateBy: grouping & averaging ──

test('aggregateBy groups records by hook type and averages the metric', () => {
  const records: PerfRecord[] = [
    { campaignId: 'c1', hookType: 'conflict', angleName: null, platform: 'tiktok', ctr: 4, cvr: 1, roas: 2, spend: 10, revenue: 20 },
    { campaignId: 'c1', hookType: 'conflict', angleName: null, platform: 'tiktok', ctr: 6, cvr: 1, roas: 2, spend: 10, revenue: 20 },
    { campaignId: 'c2', hookType: 'number', angleName: null, platform: 'tiktok', ctr: 2, cvr: 1, roas: 2, spend: 10, revenue: 20 },
  ];
  const byHook = aggregateBy(records, 'hookType', 'ctr');
  assert.equal(byHook.length, 2);
  assert.equal(byHook[0].value, 'conflict');
  assert.equal(byHook[0].avgScore, 5);
  assert.equal(byHook[0].sampleSize, 2);
  assert.equal(byHook[1].value, 'number');
  assert.equal(byHook[1].avgScore, 2);
  assert.equal(byHook[1].sampleSize, 1);
});

test('aggregateBy sorts results by descending average score', () => {
  const records: PerfRecord[] = [
    { campaignId: 'c1', hookType: 'a', angleName: null, platform: 'p', ctr: 1, cvr: 0, roas: 0, spend: 0, revenue: 0 },
    { campaignId: 'c1', hookType: 'b', angleName: null, platform: 'p', ctr: 9, cvr: 0, roas: 0, spend: 0, revenue: 0 },
    { campaignId: 'c1', hookType: 'c', angleName: null, platform: 'p', ctr: 5, cvr: 0, roas: 0, spend: 0, revenue: 0 },
  ];
  const out = aggregateBy(records, 'hookType', 'ctr');
  assert.deepEqual(out.map((o) => o.value), ['b', 'c', 'a']);
  assert.deepEqual(out.map((o) => o.avgScore), [9, 5, 1]);
});

test('aggregateBy treats null field values as "unknown"', () => {
  const records: PerfRecord[] = [
    { campaignId: 'c1', hookType: null, angleName: null, platform: 'tiktok', ctr: 3, cvr: 0, roas: 0, spend: 0, revenue: 0 },
    { campaignId: 'c1', hookType: null, angleName: null, platform: 'tiktok', ctr: 5, cvr: 0, roas: 0, spend: 0, revenue: 0 },
  ];
  const out = aggregateBy(records, 'hookType', 'ctr');
  assert.equal(out.length, 1);
  assert.equal(out[0].value, 'unknown');
  assert.equal(out[0].avgScore, 4);
  assert.equal(out[0].sampleSize, 2);
});

test('aggregateBy groups by platform dimension', () => {
  const records: PerfRecord[] = [
    { campaignId: 'c1', hookType: null, angleName: null, platform: 'tiktok', ctr: 4, cvr: 0, roas: 0, spend: 0, revenue: 0 },
    { campaignId: 'c1', hookType: null, angleName: null, platform: 'instagram', ctr: 7, cvr: 0, roas: 0, spend: 0, revenue: 0 },
    { campaignId: 'c1', hookType: null, angleName: null, platform: 'tiktok', ctr: 2, cvr: 0, roas: 0, spend: 0, revenue: 0 },
  ];
  const out = aggregateBy(records, 'platform', 'ctr');
  assert.equal(out.length, 2);
  assert.equal(out[0].value, 'instagram');
  assert.equal(out[0].avgScore, 7);
  assert.equal(out[1].value, 'tiktok');
  assert.equal(out[1].avgScore, 3);
});

test('aggregateBy returns an empty array for empty input', () => {
  assert.deepEqual(aggregateBy([], 'hookType', 'ctr'), []);
});

test('aggregateBy sets the dimension and metric fields on each insight', () => {
  const records: PerfRecord[] = [
    { campaignId: 'c1', hookType: 'conflict', angleName: 'social-proof', platform: 'tiktok', ctr: 3, cvr: 0.5, roas: 1.2, spend: 0, revenue: 0 },
  ];
  const out = aggregateBy(records, 'angleName', 'roas');
  assert.equal(out[0].dimension, 'angleName');
  assert.equal(out[0].metric, 'roas');
  assert.equal(out[0].value, 'social-proof');
  assert.equal(out[0].avgScore, 1.2);
});

test('aggregateBy averages roas across multiple records in the same group', () => {
  const records: PerfRecord[] = [
    { campaignId: 'c1', hookType: null, angleName: 'urgency', platform: 'p', ctr: 0, cvr: 0, roas: 2, spend: 0, revenue: 0 },
    { campaignId: 'c1', hookType: null, angleName: 'urgency', platform: 'p', ctr: 0, cvr: 0, roas: 4, spend: 0, revenue: 0 },
    { campaignId: 'c1', hookType: null, angleName: 'urgency', platform: 'p', ctr: 0, cvr: 0, roas: 6, spend: 0, revenue: 0 },
  ];
  const out = aggregateBy(records, 'angleName', 'roas');
  assert.equal(out[0].avgScore, 4); // (2+4+6)/3
  assert.equal(out[0].sampleSize, 3);
});

// ── getPerformanceSummary with data ──

test('getPerformanceSummary computes totals, ROAS, and campaign count from records', () => {
  const records: PerfRecord[] = [
    { campaignId: 'c1', hookType: 'conflict', angleName: 'urgency', platform: 'tiktok', ctr: 5, cvr: 1, roas: 3, spend: 100, revenue: 300 },
    { campaignId: 'c1', hookType: 'conflict', angleName: 'urgency', platform: 'tiktok', ctr: 4, cvr: 1, roas: 2, spend: 50, revenue: 100 },
    { campaignId: 'c2', hookType: 'number', angleName: 'social-proof', platform: 'instagram', ctr: 2, cvr: 1, roas: 1, spend: 50, revenue: 50 },
  ];
  const summary = getPerformanceSummary(records);
  assert.equal(summary.totalCampaigns, 2); // c1, c2
  assert.equal(summary.totalSpend, 200);
  assert.equal(summary.totalRevenue, 450);
  assert.equal(summary.overallRoas, 2.25); // 450/200
});

test('getPerformanceSummary reports a low-ROAS recommendation when ROAS < 1', () => {
  const records: PerfRecord[] = [
    { campaignId: 'c1', hookType: 'number', angleName: 'x', platform: 'tiktok', ctr: 1, cvr: 0, roas: 0.5, spend: 100, revenue: 50 },
  ];
  const summary = getPerformanceSummary(records);
  assert.ok(summary.overallRoas < 1);
  assert.ok(
    summary.recommendations.some((r) => /roas is below 1/i.test(r)),
    'should recommend testing new angles when ROAS < 1',
  );
});

test('getPerformanceSummary recommends the top hook when its CTR > 3', () => {
  const records: PerfRecord[] = [
    { campaignId: 'c1', hookType: 'conflict', angleName: 'x', platform: 'tiktok', ctr: 5, cvr: 0, roas: 1, spend: 10, revenue: 10 },
  ];
  const summary = getPerformanceSummary(records);
  assert.ok(summary.topHooks[0].value === 'conflict');
  assert.ok(
    summary.recommendations.some((r) => /conflict/i.test(r)),
    'should recommend the top hook type',
  );
});

test('getPerformanceSummary caps topHooks/topAngles/topPlatforms at 3 entries', () => {
  const records: PerfRecord[] = ['a', 'b', 'c', 'd'].map((h, i) => ({
    campaignId: `c${i}`, hookType: h, angleName: h, platform: h, ctr: i, cvr: 0, roas: i, spend: 1, revenue: 1,
  }));
  const summary = getPerformanceSummary(records);
  assert.ok(summary.topHooks.length <= 3);
  assert.ok(summary.topAngles.length <= 3);
  assert.ok(summary.topPlatforms.length <= 3);
});

// ── getLearningsContext with data ──

test('getLearningsContext returns a non-empty context string when data exists', () => {
  const records: PerfRecord[] = [
    { campaignId: 'c1', hookType: 'conflict', angleName: 'urgency', platform: 'tiktok', ctr: 5, cvr: 1, roas: 3, spend: 100, revenue: 300 },
  ];
  const ctx = getLearningsContext(records);
  assert.ok(ctx.length > 0);
  assert.ok(/past campaign performance/i.test(ctx), 'should start with the performance header');
  assert.ok(/conflict/i.test(ctx), 'should mention the top hook type');
});

test('getLearningsContext includes the campaign count and ROAS in the header', () => {
  const records: PerfRecord[] = [
    { campaignId: 'c1', hookType: 'conflict', angleName: 'urgency', platform: 'tiktok', ctr: 5, cvr: 1, roas: 3, spend: 100, revenue: 300 },
    { campaignId: 'c2', hookType: 'number', angleName: 'x', platform: 'tiktok', ctr: 2, cvr: 1, roas: 1, spend: 100, revenue: 100 },
  ];
  const ctx = getLearningsContext(records);
  assert.ok(/2 campaigns/i.test(ctx));
  assert.ok(/roas 2\.00x/i.test(ctx));
});

// ── Overall ROAS computation ──

test('overallRoas is revenue/spend, and 0 when spend is 0', () => {
  function roas(spend: number, revenue: number) {
    return spend > 0 ? revenue / spend : 0;
  }
  assert.equal(roas(0, 100), 0);
  assert.equal(roas(100, 300), 3);
  assert.equal(roas(50, 25), 0.5);
});
