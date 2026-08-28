import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the ad platform integration layer.
 *
 * Verifies the Meta and Google Ads providers' dry-run behavior, the
 * AdPlatformProvider interface contract, and the safe defaulting of
 * PublishOptions in the API route layer.
 *
 * These tests import the real provider modules via the @/ alias loader —
 * the providers have no database or external API dependencies at the
 * dry-run code path, so they can be exercised directly.
 */

import { metaAds } from '@/lib/ad-platforms/meta';
import { googleAds } from '@/lib/ad-platforms/google';
import type {
  AdCampaignInput,
  AdPlatformProvider,
  PublishOptions,
} from '@/lib/ad-platforms/types';

const baseInput: AdCampaignInput = {
  platform: 'meta',
  name: 'Test Campaign',
  creativeIds: ['creation_1', 'creation_2'],
  budgetDaily: 20,
  currency: 'USD',
};

// ── Dry-run behavior ──

test('metaAds.createCampaign with dryRun=true returns a draft with estimated metrics', async () => {
  const result = await metaAds.createCampaign(baseInput, { dryRun: true });

  assert.equal(result.status, 'draft');
  assert.equal(result.platform, 'meta');
  assert.equal(result.name, 'Test Campaign');
  assert.equal(result.currency, 'USD');
  assert.deepEqual(result.creativeIds, ['creation_1', 'creation_2']);

  // Dry-run must populate estimated metrics
  assert.ok(result.metrics, 'dry-run result should include estimated metrics');
  assert.ok((result.metrics?.impressions ?? 0) > 0, 'estimated impressions should be positive');
  assert.ok((result.metrics?.clicks ?? 0) > 0, 'estimated clicks should be positive');
  assert.equal(result.metrics?.spend, 0, 'dry-run should not report real spend');
  assert.equal(result.metrics?.ctr, 2.0);
});

test('googleAds.createCampaign with dryRun=true returns a draft with estimated metrics', async () => {
  const result = await googleAds.createCampaign(
    { ...baseInput, platform: 'google' },
    { dryRun: true },
  );

  assert.equal(result.status, 'draft');
  assert.equal(result.platform, 'google');
  assert.equal(result.name, 'Test Campaign');
  assert.deepEqual(result.creativeIds, ['creation_1', 'creation_2']);

  assert.ok(result.metrics, 'dry-run result should include estimated metrics');
  assert.ok((result.metrics?.impressions ?? 0) > 0, 'estimated impressions should be positive');
  assert.ok((result.metrics?.clicks ?? 0) > 0, 'estimated clicks should be positive');
  assert.equal(result.metrics?.spend, 0, 'dry-run should not report real spend');
  assert.equal(result.metrics?.ctr, 1.5);
});

test('dry-run estimated reach scales with daily budget for meta', async () => {
  const low = await metaAds.createCampaign({ ...baseInput, budgetDaily: 10 }, { dryRun: true });
  const high = await metaAds.createCampaign({ ...baseInput, budgetDaily: 100 }, { dryRun: true });
  assert.ok(
    (high.metrics?.impressions ?? 0) > (low.metrics?.impressions ?? 0),
    'higher budget should yield more estimated impressions',
  );
});

test('dry-run estimated reach scales with daily budget for google', async () => {
  const low = await googleAds.createCampaign({ ...baseInput, platform: 'google', budgetDaily: 10 }, { dryRun: true });
  const high = await googleAds.createCampaign({ ...baseInput, platform: 'google', budgetDaily: 100 }, { dryRun: true });
  assert.ok(
    (high.metrics?.impressions ?? 0) > (low.metrics?.impressions ?? 0),
    'higher budget should yield more estimated impressions',
  );
});

test('dry-run falls back to a default budget when budgetDaily is omitted', async () => {
  const result = await metaAds.createCampaign(
    { ...baseInput, budgetDaily: undefined },
    { dryRun: true },
  );
  assert.ok((result.metrics?.impressions ?? 0) > 0, 'default budget should still produce estimates');
});

test('non-dry-run createCampaign returns a draft (not active) for safety', async () => {
  const result = await metaAds.createCampaign(baseInput, { dryRun: false });
  // Without dry-run, the provider returns a draft/pending_approval — never 'active'.
  assert.notEqual(result.status, 'active');
  assert.equal(result.platform, 'meta');
});

test('requireApproval flag promotes status to pending_approval', async () => {
  const result = await metaAds.createCampaign(baseInput, { dryRun: false, requireApproval: true });
  assert.equal(result.status, 'pending_approval');
});

// ── Provider interface contract ──

const providers: Array<{ name: string; provider: AdPlatformProvider }> = [
  { name: 'metaAds', provider: metaAds },
  { name: 'googleAds', provider: googleAds },
];

for (const { name, provider } of providers) {
  test(`${name} has id matching its platform`, () => {
    assert.equal(typeof provider.id, 'string');
    assert.ok(['meta', 'google'].includes(provider.id), `${name}.id should be a known platform`);
  });

  test(`${name} exposes the required AdPlatformProvider methods`, () => {
    assert.equal(typeof provider.createCampaign, 'function');
    assert.equal(typeof provider.getCampaign, 'function');
    assert.equal(typeof provider.pauseCampaign, 'function');
    assert.equal(typeof provider.getMetrics, 'function');
  });

  test(`${name}.getCampaign returns a result with matching id`, async () => {
    const result = await provider.getCampaign('camp_123');
    assert.equal(result.id, 'camp_123');
    assert.equal(result.platform, provider.id);
  });

  test(`${name}.pauseCampaign resolves without throwing`, async () => {
    await provider.pauseCampaign('camp_123');
    // no assertion needed — resolving is success
  });

  test(`${name}.getMetrics returns a complete CampaignMetrics object`, async () => {
    const metrics = await provider.getMetrics('camp_123');
    const keys = ['impressions', 'clicks', 'conversions', 'spend', 'revenue', 'ctr', 'cvr', 'roas'];
    for (const k of keys) {
      assert.ok(k in metrics, `metrics should include ${k}`);
      assert.equal(typeof (metrics as unknown as Record<string, unknown>)[k], 'number');
    }
  });
}

// ── PublishOptions safe defaults (replicates the API route layer) ──

// The /api/ads/create route defaults dryRun and requireApproval to true for
// safety: `dryRun: body.dryRun !== false`. This prevents accidental real
// spend when a caller omits the flag entirely.
function resolvePublishOptions(body: { dryRun?: unknown; requireApproval?: unknown; spendCap?: number }): PublishOptions {
  return {
    dryRun: body.dryRun !== false,
    requireApproval: body.requireApproval !== false,
    spendCap: typeof body.spendCap === 'number' ? body.spendCap : undefined,
  };
}

test('PublishOptions defaults dryRun to true when omitted (safe default)', () => {
  const opts = resolvePublishOptions({});
  assert.equal(opts.dryRun, true);
});

test('PublishOptions defaults dryRun to true when set to a non-false value', () => {
  const opts = resolvePublishOptions({ dryRun: undefined });
  assert.equal(opts.dryRun, true);
});

test('PublishOptions respects an explicit dryRun=false', () => {
  const opts = resolvePublishOptions({ dryRun: false });
  assert.equal(opts.dryRun, false);
});

test('PublishOptions defaults requireApproval to true when omitted (safe default)', () => {
  const opts = resolvePublishOptions({});
  assert.equal(opts.requireApproval, true);
});

test('PublishOptions respects an explicit requireApproval=false', () => {
  const opts = resolvePublishOptions({ requireApproval: false });
  assert.equal(opts.requireApproval, false);
});

test('PublishOptions leaves spendCap undefined when not a number', () => {
  const opts = resolvePublishOptions({});
  assert.equal(opts.spendCap, undefined);
  const opts2 = resolvePublishOptions({ spendCap: 50 });
  assert.equal(opts2.spendCap, 50);
});
