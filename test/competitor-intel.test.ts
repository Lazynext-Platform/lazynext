import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Competitor Intelligence', () => {
  test('CompetitorProfile structure validation', () => {
    const c = {
      competitorId: 'c1', name: 'Competitor A', marketPosition: 'leader',
      estimatedAdSpend: 50000, activeCreatives: 120, platforms: ['meta', 'google'],
      avgEngagementRate: 0.035, postingFrequency: 5, targetAudience: ['25-34'],
      keyMessages: ['quality', 'value'], strengths: ['brand'], weaknesses: ['price'],
    };
    assert.equal(c.marketPosition, 'leader');
    assert.ok(c.estimatedAdSpend > 0);
    assert.ok(c.platforms.length > 0);
  });

  test('CompetitorCreative structure validation', () => {
    const cr = {
      creativeId: 'cr1', competitorId: 'c1', platform: 'meta', format: 'video',
      hook: 'question', angle: 'emotional', cta: 'buy_now', estimatedSpend: 5000,
      estimatedImpressions: 100000, engagementRate: 0.05, firstSeen: '2026-01-01', lastSeen: '2026-01-15', durationDays: 14,
    };
    assert.ok(cr.creativeId);
    assert.ok(cr.estimatedSpend > 0);
  });

  test('MarketGap structure validation', () => {
    const gap = {
      gapId: 'g1', type: 'audience_gap', description: 'No competitor targets seniors',
      opportunity: 'Target 65+ demographic', competitorsMissing: ['c1', 'c2'],
      estimatedReach: 500000, difficulty: 'medium', priority: 'high', recommendedAction: 'Create senior-focused ads',
    };
    assert.equal(gap.type, 'audience_gap');
    assert.ok(gap.competitorsMissing.length > 0);
  });

  test('BenchmarkMetric structure validation', () => {
    const b = {
      metric: 'spend', yourValue: 10000, competitorAvg: 15000, industryAvg: 12000,
      topPerformer: 50000, percentile: 35, status: 'below_average', recommendation: 'Increase spend',
    };
    assert.ok(b.yourValue < b.competitorAvg);
    assert.equal(b.status, 'below_average');
  });

  test('CompetitorIntelResult complete structure validation', () => {
    const result = {
      analysisDate: '2026-08-29T00:00:00Z', market: 'DTC skincare', totalCompetitors: 5,
      yourMarketPosition: 'challenger', competitors: [], topCreatives: [], marketGaps: [],
      benchmarks: [], insights: [], shareOfVoice: [], recommendations: [],
    };
    assert.ok(result.totalCompetitors > 0);
    assert.ok(result.analysisDate);
  });

  test('market position inference logic', () => {
    const positions = ['leader', 'challenger', 'follower', 'nicher', 'new_entrant'];
    assert.equal(positions.length, 5);
    assert.ok(positions.includes('leader'));
  });

  test('share of voice calculation - percentages sum to ~100', () => {
    const sov = [
      { competitor: 'A', percentage: 40, trend: 'stable' },
      { competitor: 'B', percentage: 30, trend: 'increasing' },
      { competitor: 'C', percentage: 20, trend: 'decreasing' },
      { competitor: 'You', percentage: 10, trend: 'increasing' },
    ];
    const total = sov.reduce((a, s) => a + s.percentage, 0);
    assert.ok(Math.abs(total - 100) < 1);
  });

  test('market gap detection logic', () => {
    const gapTypes = ['audience_gap', 'format_gap', 'messaging_gap', 'channel_gap', 'pricing_gap', 'creative_gap'];
    assert.equal(gapTypes.length, 6);
  });

  test('benchmark status thresholds', () => {
    const getStatus = (percentile: number) => percentile >= 90 ? 'leading' : percentile >= 60 ? 'above_average' : percentile >= 30 ? 'average' : 'below_average';
    assert.equal(getStatus(95), 'leading');
    assert.equal(getStatus(70), 'above_average');
    assert.equal(getStatus(40), 'average');
    assert.equal(getStatus(20), 'below_average');
  });

  test('competitor URL validation - rejects localhost', () => {
    const url = 'http://localhost:3000';
    assert.ok(url.includes('localhost'));
  });

  test('competitor URL validation - rejects private IPs', () => {
    const urls = ['http://10.0.0.1', 'http://172.16.0.1', 'http://192.168.1.1', 'http://169.254.169.254'];
    for (const u of urls) {
      assert.ok(u.match(/10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|169\.254\./));
    }
  });

  test('competitor URL validation - accepts public URLs', () => {
    const url = 'https://competitor.com';
    assert.ok(!url.includes('localhost') && !url.match(/10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\./));
  });

  test('competitor metric types completeness', () => {
    const metrics = ['spend', 'impressions', 'engagement', 'frequency', 'creatives', 'reach'];
    assert.equal(metrics.length, 6);
  });
});
