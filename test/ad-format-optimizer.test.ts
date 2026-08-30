import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Format Optimizer engine (AI-powered ad format
 * recommendations based on product, audience, platform, and budget).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_FORMAT_OPTIMIZER_CREDIT_COST,
  validateAdFormatOptimizerInput,
  optimizeFormat,
  VALID_AD_FORMATS,
  VALID_PLATFORMS,
  VALID_BUDGETS,
  VALID_GOALS,
  type AdFormatOptimizerInput,
} from '@/lib/creative/ad-format-optimizer';

// ── Credit cost ──

test('AD_FORMAT_OPTIMIZER_CREDIT_COST is 4', () => {
  assert.equal(AD_FORMAT_OPTIMIZER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_AD_FORMATS contains the six supported formats', () => {
  assert.ok(VALID_AD_FORMATS.includes('single_image'));
  assert.ok(VALID_AD_FORMATS.includes('carousel'));
  assert.ok(VALID_AD_FORMATS.includes('video'));
  assert.ok(VALID_AD_FORMATS.includes('story'));
  assert.ok(VALID_AD_FORMATS.includes('reel'));
  assert.ok(VALID_AD_FORMATS.includes('collection'));
  assert.equal(VALID_AD_FORMATS.length, 6);
});

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_BUDGETS contains low, medium, high', () => {
  assert.deepEqual(VALID_BUDGETS, ['low', 'medium', 'high']);
});

test('VALID_GOALS contains the four campaign goals', () => {
  assert.ok(VALID_GOALS.includes('awareness'));
  assert.ok(VALID_GOALS.includes('consideration'));
  assert.ok(VALID_GOALS.includes('conversion'));
  assert.ok(VALID_GOALS.includes('retention'));
});

// ── Input validation tests ──

const validInput: AdFormatOptimizerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  targetAudience: 'women 25-40 interested in clean beauty',
  platforms: ['tiktok', 'instagram'],
  budget: 'medium',
  goals: ['awareness', 'conversion'],
};

test('validateAdFormatOptimizerInput accepts a valid input', () => {
  const { valid, errors } = validateAdFormatOptimizerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdFormatOptimizerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdFormatOptimizerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdFormatOptimizerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdFormatOptimizerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdFormatOptimizerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdFormatOptimizerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(2001),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdFormatOptimizerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdFormatOptimizerInput({
    ...validInput,
    platforms: ['snapchat' as never],
  });
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('platform_') && e.includes('invalid')));
});

test('validateAdFormatOptimizerInput rejects non-array platforms', () => {
  const { valid, errors } = validateAdFormatOptimizerInput({
    ...validInput,
    platforms: 'tiktok' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platforms_invalid'));
});

test('validateAdFormatOptimizerInput rejects invalid budget', () => {
  const { valid, errors } = validateAdFormatOptimizerInput({
    ...validInput,
    budget: 'huge' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('budget_invalid'));
});

test('validateAdFormatOptimizerInput rejects invalid goal', () => {
  const { valid, errors } = validateAdFormatOptimizerInput({
    ...validInput,
    goals: ['engagement' as never],
  });
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('goal_') && e.includes('invalid')));
});

test('validateAdFormatOptimizerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdFormatOptimizerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdFormatOptimizerInput accepts input with only productOrBrand', () => {
  const { valid, errors } = validateAdFormatOptimizerInput({
    productOrBrand: 'A new fitness app',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdFormatOptimizerInput rejects invalid targetAudience type', () => {
  const { valid, errors } = validateAdFormatOptimizerInput({
    ...validInput,
    targetAudience: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_invalid'));
});

// ── Dry-run mode tests ──
//
// These tests run optimizeFormat with dryRun: true so no real LLM calls are
// made — deterministic heuristic recommendations are returned instead.

test('dry-run returns an AdFormatOptimizerResult with recommendations', async () => {
  const result = await optimizeFormat({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(Array.isArray(result.recommendations));
  assert.ok(result.recommendations.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns recommendations with correct structure', async () => {
  const result = await optimizeFormat({ ...validInput, dryRun: true });
  for (const rec of result.recommendations) {
    assert.ok(VALID_AD_FORMATS.includes(rec.format), `${rec.format} should be a valid format`);
    assert.ok(typeof rec.score === 'number');
    assert.ok(rec.score >= 0 && rec.score <= 100);
    assert.ok(typeof rec.rationale === 'string' && rec.rationale.length > 0);
    assert.ok(Array.isArray(rec.bestFor));
    assert.ok(['low', 'medium', 'high'].includes(rec.productionComplexity));
    assert.ok(typeof rec.estimatedCostRange === 'string' && rec.estimatedCostRange.length > 0);
    assert.ok(Array.isArray(rec.platformFit));
    for (const pf of rec.platformFit) {
      assert.ok(typeof pf.platform === 'string');
      assert.ok(typeof pf.fitScore === 'number');
      assert.ok(pf.fitScore >= 0 && pf.fitScore <= 100);
    }
  }
});

test('dry-run has a bestPick that is one of the recommendations', async () => {
  const result = await optimizeFormat({ ...validInput, dryRun: true });
  assert.ok(VALID_AD_FORMATS.includes(result.bestPick));
  assert.ok(result.recommendations.some((r) => r.format === result.bestPick));
});

test('dry-run has a non-empty reasoning string', async () => {
  const result = await optimizeFormat({ ...validInput, dryRun: true });
  assert.ok(typeof result.reasoning === 'string' && result.reasoning.length > 0);
});

test('dry-run ranks recommendations by score descending', async () => {
  const result = await optimizeFormat({ ...validInput, dryRun: true });
  for (let i = 1; i < result.recommendations.length; i++) {
    assert.ok(
      result.recommendations[i - 1].score >= result.recommendations[i].score,
      'recommendations should be sorted by score descending',
    );
  }
});

test('dry-run bestPick is the highest-scored recommendation', async () => {
  const result = await optimizeFormat({ ...validInput, dryRun: true });
  assert.equal(result.bestPick, result.recommendations[0].format);
});

test('dry-run low budget + tiktok favors reel over video', async () => {
  const result = await optimizeFormat({
    ...validInput,
    platforms: ['tiktok'],
    budget: 'low',
    dryRun: true,
  });
  const reel = result.recommendations.find((r) => r.format === 'reel');
  const video = result.recommendations.find((r) => r.format === 'video');
  assert.ok(reel && video);
  assert.ok(reel.score >= video.score, 'reel should score >= video for low budget + tiktok');
});

test('dry-run high budget + youtube favors video', async () => {
  const result = await optimizeFormat({
    ...validInput,
    platforms: ['youtube'],
    budget: 'high',
    dryRun: true,
  });
  const video = result.recommendations.find((r) => r.format === 'video');
  assert.ok(video);
  assert.equal(result.recommendations[0].format, 'video');
});

test('dry-run platformFit covers all requested platforms', async () => {
  const result = await optimizeFormat({
    ...validInput,
    platforms: ['tiktok', 'instagram', 'youtube', 'facebook'],
    dryRun: true,
  });
  for (const rec of result.recommendations) {
    const platforms = rec.platformFit.map((pf) => pf.platform);
    assert.ok(platforms.includes('tiktok'));
    assert.ok(platforms.includes('instagram'));
    assert.ok(platforms.includes('youtube'));
    assert.ok(platforms.includes('facebook'));
  }
});

test('dry-run defaults platforms to all four when none provided', async () => {
  const result = await optimizeFormat({
    productOrBrand: 'A coffee subscription',
    dryRun: true,
  });
  const rec = result.recommendations[0];
  assert.ok(rec.platformFit.length >= 4);
});

test('optimizeFormat rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => optimizeFormat({ ...validInput, productOrBrand: '' } as AdFormatOptimizerInput),
    /invalid_ad_format_optimizer_input/,
  );
});

test('optimizeFormat rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => optimizeFormat({ ...validInput, platforms: ['snapchat' as never], dryRun: true } as AdFormatOptimizerInput),
    /invalid_ad_format_optimizer_input/,
  );
});

test('optimizeFormat rejects invalid budget in dry-run mode', async () => {
  await assert.rejects(
    () => optimizeFormat({ ...validInput, budget: 'huge' as never, dryRun: true } as AdFormatOptimizerInput),
    /invalid_ad_format_optimizer_input/,
  );
});
