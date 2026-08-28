import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for the Google Ads + GA4 analytics integration layer.
 *
 * Verifies:
 *  - GA4 data structure validation (all five metric shapes)
 *  - Google Ads report structure validation (search terms, keywords, ad groups, device)
 *  - Dry-run vs real mode behavior (pending_credentials / pending_approval)
 *  - Budget validation (positive numbers, spend-cap safety margin)
 *
 * These tests import the real provider/client modules via the @/ alias loader.
 * The dry-run code paths have no database or external API dependencies, so
 * they can be exercised directly.
 */

import { googleAds, checkGoogleSpendCap, GOOGLE_BUDGET_SAFETY_MARGIN } from '@/lib/ad-platforms/google';
import { GA4Client, isPendingCredentials } from '@/lib/analytics/ga4';
import type { AdCampaignInput } from '@/lib/ad-platforms/types';

const baseGoogleInput: AdCampaignInput = {
  platform: 'google',
  name: 'Google Test Campaign',
  creativeIds: ['creation_1', 'creation_2'],
  budgetDaily: 20,
  currency: 'USD',
};

const dateRange = { startDate: '2024-01-01', endDate: '2024-01-31' };

// ── Google Ads report structure ──

describe('Google Ads report structure', () => {
  test('dry-run getReport returns a fully structured report with Google-specific breakdowns', async () => {
    const report = await googleAds.getReport!('camp_1', { dryRun: true });
    assert.equal(report.platform, 'google');
    assert.equal(report.campaignId, 'camp_1');
    assert.ok(Array.isArray(report.demographics));
    assert.ok(Array.isArray(report.placements));
    assert.ok(Array.isArray(report.creativeBreakdown));
    assert.ok(Array.isArray(report.timeSeries));
    assert.ok(Array.isArray(report.recommendations));
    // Google-specific breakdowns
    assert.ok(Array.isArray(report.searchTerms));
    assert.ok(Array.isArray(report.keywords));
    assert.ok(Array.isArray(report.adGroups));
    assert.ok(Array.isArray(report.deviceBreakdown));
    assert.ok((report.searchTerms?.length ?? 0) > 0);
    assert.ok((report.keywords?.length ?? 0) > 0);
    assert.ok((report.adGroups?.length ?? 0) > 0);
    assert.ok((report.deviceBreakdown?.length ?? 0) > 0);
  });

  test('dry-run report never reports real spend', async () => {
    const report = await googleAds.getReport!('camp_1', { dryRun: true });
    assert.equal(report.summary.spend, 0);
    for (const p of report.placements) assert.equal(p.spend, 0);
    for (const s of report.searchTerms ?? []) assert.equal(s.spend, 0);
    for (const k of report.keywords ?? []) assert.equal(k.spend, 0);
    for (const g of report.adGroups ?? []) assert.equal(g.spend, 0);
    for (const d of report.deviceBreakdown ?? []) assert.equal(d.spend, 0);
  });

  test('search term rows contain searchTerm, keyword, matchType, and metrics', async () => {
    const report = await googleAds.getReport!('camp_1', { dryRun: true });
    const row = report.searchTerms![0];
    assert.equal(typeof row.searchTerm, 'string');
    assert.ok(row.searchTerm.length > 0);
    assert.equal(typeof row.keyword, 'string');
    assert.equal(typeof row.matchType, 'string');
    assert.ok(['exact', 'phrase', 'broad'].includes(row.matchType));
    assert.ok(row.impressions >= 0);
    assert.ok(row.clicks >= 0);
    assert.ok(row.conversions >= 0);
  });

  test('keyword rows contain ctr and avgCpc numeric fields', async () => {
    const report = await googleAds.getReport!('camp_1', { dryRun: true });
    const row = report.keywords![0];
    assert.equal(typeof row.ctr, 'number');
    assert.equal(typeof row.avgCpc, 'number');
    assert.ok(row.ctr >= 0);
  });

  test('ad group rows contain adGroupId, adGroupName, and status', async () => {
    const report = await googleAds.getReport!('camp_1', { dryRun: true });
    const row = report.adGroups![0];
    assert.equal(typeof row.adGroupId, 'string');
    assert.equal(typeof row.adGroupName, 'string');
    assert.equal(typeof row.status, 'string');
    assert.ok(['active', 'paused', 'draft', 'pending_approval'].includes(row.status));
  });

  test('device breakdown covers mobile, desktop, tablet', async () => {
    const report = await googleAds.getReport!('camp_1', { dryRun: true });
    const devices = (report.deviceBreakdown ?? []).map((d) => d.device);
    assert.ok(devices.includes('mobile'));
    assert.ok(devices.includes('desktop'));
    assert.ok(devices.includes('tablet'));
  });

  test('real mode report stub returns zeroed metrics with credential recommendations', async () => {
    const report = await googleAds.getReport!('camp_1', { dryRun: false });
    assert.equal(report.summary.impressions, 0);
    assert.equal(report.summary.clicks, 0);
    assert.equal(report.summary.spend, 0);
    assert.equal(report.searchTerms?.length, 0);
    assert.equal(report.keywords?.length, 0);
    assert.equal(report.adGroups?.length, 0);
    assert.equal(report.deviceBreakdown?.length, 0);
    assert.ok(report.recommendations.some((r) => r.includes('GOOGLE_ADS_ACCESS_TOKEN')));
  });
});

// ── Google Ads budget validation ──

describe('Google Ads budget validation', () => {
  test('updateBudget throws on non-positive budget', async () => {
    await assert.rejects(() => googleAds.updateBudget!('camp_1', 0, { dryRun: true }), /budget_daily_must_be_positive/);
    await assert.rejects(() => googleAds.updateBudget!('camp_1', -5, { dryRun: true }), /budget_daily_must_be_positive/);
  });

  test('updateBudget throws on NaN budget', async () => {
    await assert.rejects(() => googleAds.updateBudget!('camp_1', NaN, { dryRun: true }), /budget_daily_must_be_positive/);
  });

  test('updateBudget throws when budget exceeds spend cap with margin', async () => {
    await assert.rejects(
      () => googleAds.updateBudget!('camp_1', 120, { dryRun: true, spendCap: 100 }),
      /budget_exceeds_spend_cap/,
    );
  });

  test('updateBudget succeeds when budget within spend cap', async () => {
    const result = await googleAds.updateBudget!('camp_1', 50, { dryRun: true, spendCap: 100 });
    assert.equal(result.budgetDaily, 50);
    assert.equal(result.platform, 'google');
  });

  test('dry-run updateBudget returns draft status with simulated metrics', async () => {
    const result = await googleAds.updateBudget!('camp_1', 30, { dryRun: true });
    assert.equal(result.status, 'draft');
    assert.ok(result.metrics);
    assert.ok((result.metrics.impressions ?? 0) > 0);
    assert.equal(result.metrics.spend, 0);
  });

  test('real mode updateBudget returns pending_approval status', async () => {
    const result = await googleAds.updateBudget!('camp_1', 30, { dryRun: false });
    assert.equal(result.status, 'pending_approval');
    assert.equal(result.budgetDaily, 30);
  });

  test('getSpend dry-run always returns zero spend', async () => {
    const { spend, currency } = await googleAds.getSpend!('camp_1', { dryRun: true });
    assert.equal(spend, 0);
    assert.equal(typeof currency, 'string');
  });

  test('getSpend real mode stub returns zero spend without credentials', async () => {
    const { spend } = await googleAds.getSpend!('camp_1', { dryRun: false });
    assert.equal(spend, 0);
  });
});

// ── checkGoogleSpendCap ──

describe('checkGoogleSpendCap', () => {
  test('returns ok when spend within cap', () => {
    assert.equal(checkGoogleSpendCap(50, 100).ok, true);
  });

  test('returns ok when spend equals cap', () => {
    assert.equal(checkGoogleSpendCap(100, 100).ok, true);
  });

  test('returns not ok when spend exceeds cap with margin', () => {
    const result = checkGoogleSpendCap(120, 100);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.cap, 100);
      assert.equal(result.value, 120);
      assert.equal(result.margin, GOOGLE_BUDGET_SAFETY_MARGIN);
    }
  });

  test('applies 10% safety margin — 110 is exactly at the boundary', () => {
    assert.equal(checkGoogleSpendCap(110, 100).ok, true);
  });

  test('fails just above the margin boundary', () => {
    assert.equal(checkGoogleSpendCap(111, 100).ok, false);
  });

  test('returns ok for zero or negative cap', () => {
    assert.equal(checkGoogleSpendCap(50, 0).ok, true);
    assert.equal(checkGoogleSpendCap(50, -10).ok, true);
  });
});

// ── GA4 data structure validation ──

describe('GA4 data structure validation', () => {
  test('getOverview returns the expected metric shape (dry-run)', async () => {
    const client = new GA4Client({ dryRun: true });
    const data = await client.getOverview('properties/123', dateRange);
    assert.equal(isPendingCredentials(data), false);
    if (!isPendingCredentials(data)) {
      assert.equal(data.propertyId, 'properties/123');
      assert.equal(data.dateRange.startDate, dateRange.startDate);
      assert.equal(data.dateRange.endDate, dateRange.endDate);
      assert.equal(typeof data.sessions, 'number');
      assert.equal(typeof data.users, 'number');
      assert.equal(typeof data.pageviews, 'number');
      assert.equal(typeof data.bounceRate, 'number');
      assert.equal(typeof data.avgSessionDurationSeconds, 'number');
      assert.equal(typeof data.newUsers, 'number');
      assert.equal(typeof data.screenPageViewsPerSession, 'number');
      assert.ok(data.sessions > 0);
      assert.ok(data.users > 0);
      assert.ok(data.bounceRate >= 0 && data.bounceRate <= 100);
    }
  });

  test('getTrafficSources returns a sources array with source/medium breakdown', async () => {
    const client = new GA4Client({ dryRun: true });
    const data = await client.getTrafficSources('properties/123', dateRange);
    if (!isPendingCredentials(data)) {
      assert.ok(Array.isArray(data.sources));
      assert.ok(data.sources.length > 0);
      const row = data.sources[0];
      assert.equal(typeof row.source, 'string');
      assert.equal(typeof row.medium, 'string');
      assert.equal(typeof row.sessions, 'number');
      assert.equal(typeof row.users, 'number');
      assert.equal(typeof row.conversions, 'number');
      assert.equal(typeof row.bounceRate, 'number');
      assert.equal(typeof row.revenue, 'number');
    }
  });

  test('getConversions returns totals and per-event rows', async () => {
    const client = new GA4Client({ dryRun: true });
    const data = await client.getConversions('properties/123', dateRange);
    if (!isPendingCredentials(data)) {
      assert.equal(typeof data.totalConversions, 'number');
      assert.equal(typeof data.totalRevenue, 'number');
      assert.equal(typeof data.overallConversionRate, 'number');
      assert.ok(Array.isArray(data.conversions));
      assert.ok(data.conversions.length > 0);
      const row = data.conversions[0];
      assert.equal(typeof row.eventName, 'string');
      assert.equal(typeof row.conversions, 'number');
      assert.equal(typeof row.conversionRate, 'number');
      assert.equal(typeof row.revenue, 'number');
      assert.ok(row.conversionRate >= 0 && row.conversionRate <= 100);
      // totalConversions should equal the sum of per-event conversions
      const sum = data.conversions.reduce((s, c) => s + c.conversions, 0);
      assert.equal(data.totalConversions, sum);
    }
  });

  test('getAudienceOverview returns demographics, interests, and geo arrays', async () => {
    const client = new GA4Client({ dryRun: true });
    const data = await client.getAudienceOverview('properties/123', dateRange);
    if (!isPendingCredentials(data)) {
      assert.ok(Array.isArray(data.demographics));
      assert.ok(Array.isArray(data.interests));
      assert.ok(Array.isArray(data.geo));
      assert.ok(data.demographics.length > 0);
      assert.ok(data.interests.length > 0);
      assert.ok(data.geo.length > 0);
      const row = data.demographics[0];
      assert.equal(typeof row.dimension, 'string');
      assert.equal(typeof row.value, 'string');
      assert.equal(typeof row.users, 'number');
      assert.equal(typeof row.sessions, 'number');
      assert.equal(typeof row.revenue, 'number');
    }
  });

  test('getRealtime returns activeUsers, events, and a timestamp', async () => {
    const client = new GA4Client({ dryRun: true });
    const data = await client.getRealtime('properties/123');
    if (!isPendingCredentials(data)) {
      assert.equal(typeof data.activeUsers, 'number');
      assert.equal(typeof data.timestamp, 'string');
      assert.ok(Array.isArray(data.events));
      assert.equal(typeof data.screenPageViews, 'number');
      assert.ok(data.activeUsers >= 0);
    }
  });
});

// ── GA4 dry-run vs real mode behavior ──

describe('GA4 dry-run vs real mode behavior', () => {
  test('dry-run overview returns simulated (non-zero) data', async () => {
    const client = new GA4Client({ dryRun: true });
    const data = await client.getOverview('properties/123', dateRange);
    if (!isPendingCredentials(data)) {
      assert.ok(data.sessions > 0, 'dry-run should return simulated sessions');
    }
  });

  test('real mode without credentials returns pending_credentials', async () => {
    // Ensure no GA4 env vars are set during the test.
    const oldProp = process.env.GA4_PROPERTY_ID;
    const oldCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GA4_PROPERTY_ID;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    try {
      const client = new GA4Client({ dryRun: false });
      const data = await client.getOverview('properties/123', dateRange);
      assert.equal(isPendingCredentials(data), true);
      if (isPendingCredentials(data)) {
        assert.equal(data.status, 'pending_credentials');
        assert.equal(data.propertyId, 'properties/123');
        assert.equal(data.metric, 'overview');
        assert.ok(data.message.length > 0);
      }
    } finally {
      if (oldProp !== undefined) process.env.GA4_PROPERTY_ID = oldProp;
      if (oldCreds !== undefined) process.env.GOOGLE_APPLICATION_CREDENTIALS = oldCreds;
    }
  });

  test('real mode without credentials returns pending_credentials for each metric', async () => {
    const oldProp = process.env.GA4_PROPERTY_ID;
    const oldCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GA4_PROPERTY_ID;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    try {
      const client = new GA4Client({ dryRun: false });
      const metrics = ['overview', 'traffic', 'conversions', 'audience', 'realtime'] as const;
      for (const m of metrics) {
        let data: unknown;
        if (m === 'overview') data = await client.getOverview('p', dateRange);
        else if (m === 'traffic') data = await client.getTrafficSources('p', dateRange);
        else if (m === 'conversions') data = await client.getConversions('p', dateRange);
        else if (m === 'audience') data = await client.getAudienceOverview('p', dateRange);
        else data = await client.getRealtime('p');
        assert.equal(isPendingCredentials(data), true, `${m} should be pending_credentials`);
        if (isPendingCredentials(data)) assert.equal(data.metric, m);
      }
    } finally {
      if (oldProp !== undefined) process.env.GA4_PROPERTY_ID = oldProp;
      if (oldCreds !== undefined) process.env.GOOGLE_APPLICATION_CREDENTIALS = oldCreds;
    }
  });

  test('isPendingCredentials returns false for plain objects', () => {
    assert.equal(isPendingCredentials({ sessions: 1 }), false);
    assert.equal(isPendingCredentials(null), false);
    assert.equal(isPendingCredentials(undefined), false);
    assert.equal(isPendingCredentials('pending_credentials'), false);
  });
});

// ── Google Ads createCampaign dry-run vs real ──

describe('Google Ads createCampaign dry-run vs real mode', () => {
  test('dry-run createCampaign returns draft status with simulated metrics', async () => {
    const result = await googleAds.createCampaign(baseGoogleInput, { dryRun: true });
    assert.equal(result.platform, 'google');
    assert.equal(result.status, 'draft');
    assert.ok(result.metrics);
    assert.ok((result.metrics.impressions ?? 0) > 0);
    assert.equal(result.metrics.spend, 0);
  });

  test('real createCampaign with requireApproval returns pending_approval', async () => {
    const result = await googleAds.createCampaign(baseGoogleInput, { dryRun: false, requireApproval: true });
    assert.equal(result.status, 'pending_approval');
    assert.equal(result.platform, 'google');
  });

  test('real createCampaign without requireApproval returns draft', async () => {
    const result = await googleAds.createCampaign(baseGoogleInput, { dryRun: false, requireApproval: false });
    assert.equal(result.status, 'draft');
  });
});
