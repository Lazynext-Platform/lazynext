import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Trend Spotter engine (AI-powered trending topic and hashtag
 * identification based on niche and platform).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  TREND_SPOTTER_CREDIT_COST,
  validateTrendSpotterInput,
  spotTrends,
  VALID_PLATFORMS,
  MAX_NICHE_LENGTH,
  type TrendSpotterInput,
  type TrendMomentum,
} from '@/lib/creative/trend-spotter';

// ── Credit cost ──

test('TREND_SPOTTER_CREDIT_COST is 5', () => {
  assert.equal(TREND_SPOTTER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('MAX_NICHE_LENGTH is 500', () => {
  assert.equal(MAX_NICHE_LENGTH, 500);
});

// ── Input validation tests ──

const validInput: TrendSpotterInput = {
  niche: 'clean skincare',
  platform: 'tiktok',
  region: 'US',
};

test('validateTrendSpotterInput accepts a valid input', () => {
  const { valid, errors } = validateTrendSpotterInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateTrendSpotterInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateTrendSpotterInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateTrendSpotterInput rejects missing niche', () => {
  const { valid, errors } = validateTrendSpotterInput({
    ...validInput,
    niche: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('niche_required'));
});

test('validateTrendSpotterInput rejects niche over MAX_NICHE_LENGTH chars', () => {
  const { valid, errors } = validateTrendSpotterInput({
    ...validInput,
    niche: 'x'.repeat(MAX_NICHE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('niche_too_long'));
});

test('validateTrendSpotterInput rejects missing platform', () => {
  const { valid, errors } = validateTrendSpotterInput({
    ...validInput,
    platform: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_required'));
});

test('validateTrendSpotterInput rejects invalid platform', () => {
  const { valid, errors } = validateTrendSpotterInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateTrendSpotterInput rejects invalid region type', () => {
  const { valid, errors } = validateTrendSpotterInput({
    ...validInput,
    region: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('region_invalid'));
});

test('validateTrendSpotterInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateTrendSpotterInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateTrendSpotterInput accepts input with only required fields', () => {
  const { valid, errors } = validateTrendSpotterInput({
    niche: 'home fitness',
    platform: 'instagram',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run spotTrends with dryRun: true so no real LLM calls are made —
// deterministic templated trends are returned instead.

test('dry-run returns a TrendSpotterResult with trends', async () => {
  const result = await spotTrends({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(Array.isArray(result.trends));
  assert.ok(result.trends.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns trends with correct structure', async () => {
  const result = await spotTrends({ ...validInput, dryRun: true });
  for (const tr of result.trends) {
    assert.ok(typeof tr.topic === 'string' && tr.topic.length > 0);
    assert.ok(typeof tr.hashtag === 'string' && tr.hashtag.length > 0);
    assert.ok(['rising', 'stable', 'declining'].includes(tr.momentum));
    assert.ok(typeof tr.volume === 'string' && tr.volume.length > 0);
    assert.ok(typeof tr.platform === 'string' && tr.platform.length > 0);
    assert.ok(typeof tr.suggestedAngle === 'string' && tr.suggestedAngle.length > 0);
    assert.ok(typeof tr.timeToAct === 'string' && tr.timeToAct.length > 0);
  }
});

test('dry-run has a non-empty summary string', async () => {
  const result = await spotTrends({ ...validInput, dryRun: true });
  assert.ok(typeof result.summary === 'string' && result.summary.length > 0);
});

test('dry-run echoes niche and platform', async () => {
  const result = await spotTrends({ ...validInput, dryRun: true });
  assert.equal(result.niche, validInput.niche);
  assert.equal(result.platform, validInput.platform);
});

test('dry-run sorts trends by momentum (rising first)', async () => {
  const result = await spotTrends({ ...validInput, dryRun: true });
  const order: Record<TrendMomentum, number> = { rising: 0, stable: 1, declining: 2 };
  for (let i = 1; i < result.trends.length; i++) {
    assert.ok(
      order[result.trends[i - 1].momentum] <= order[result.trends[i].momentum],
      'trends should be sorted by momentum (rising > stable > declining)',
    );
  }
});

test('dry-run includes at least one rising trend', async () => {
  const result = await spotTrends({ ...validInput, dryRun: true });
  assert.ok(result.trends.some((tr) => tr.momentum === 'rising'));
});

test('dry-run trends use the requested platform', async () => {
  const result = await spotTrends({ ...validInput, platform: 'youtube', dryRun: true });
  for (const tr of result.trends) {
    assert.equal(tr.platform, 'youtube');
  }
});

test('spotTrends rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => spotTrends({ ...validInput, niche: '' } as TrendSpotterInput),
    /invalid_trend_spotter_input/,
  );
});

test('spotTrends rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => spotTrends({ ...validInput, platform: 'snapchat' as never, dryRun: true } as TrendSpotterInput),
    /invalid_trend_spotter_input/,
  );
});
