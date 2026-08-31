import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad CTA Optimizer engine (AI-powered ad call-to-action
 * generation and optimization for maximum conversion).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CTA_OPTIMIZER_CREDIT_COST,
  validateAdCTAOptimizerInput,
  optimizeCTAs,
  VALID_PLATFORMS,
  VALID_URGENCY_LEVELS,
  MAX_PRODUCT_LENGTH,
  MAX_GOAL_LENGTH,
  MAX_CURRENT_CTA_LENGTH,
  MIN_COUNT,
  MAX_COUNT,
  DEFAULT_COUNT,
  type AdCTAOptimizerInput,
} from '@/lib/creative/ad-cta-optimizer';

// ── Credit cost ──

test('AD_CTA_OPTIMIZER_CREDIT_COST is 3', () => {
  assert.equal(AD_CTA_OPTIMIZER_CREDIT_COST, 3);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_URGENCY_LEVELS contains the four levels', () => {
  assert.ok(VALID_URGENCY_LEVELS.includes('low'));
  assert.ok(VALID_URGENCY_LEVELS.includes('medium'));
  assert.ok(VALID_URGENCY_LEVELS.includes('high'));
  assert.ok(VALID_URGENCY_LEVELS.includes('critical'));
  assert.equal(VALID_URGENCY_LEVELS.length, 4);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('count bounds are 1-8 with default 5', () => {
  assert.equal(MIN_COUNT, 1);
  assert.equal(MAX_COUNT, 8);
  assert.equal(DEFAULT_COUNT, 5);
});

// ── Input validation tests ──

const validInput: AdCTAOptimizerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  platform: 'tiktok',
  goal: 'purchases',
  currentCTA: 'Shop now',
  count: 5,
};

test('validateAdCTAOptimizerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCTAOptimizerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCTAOptimizerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCTAOptimizerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCTAOptimizerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCTAOptimizerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCTAOptimizerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCTAOptimizerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCTAOptimizerInput rejects missing platform', () => {
  const { valid, errors } = validateAdCTAOptimizerInput({
    ...validInput,
    platform: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_required'));
});

test('validateAdCTAOptimizerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCTAOptimizerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCTAOptimizerInput rejects goal over 200 chars', () => {
  const { valid, errors } = validateAdCTAOptimizerInput({
    ...validInput,
    goal: 'x'.repeat(MAX_GOAL_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('goal_too_long'));
});

test('validateAdCTAOptimizerInput rejects invalid goal type', () => {
  const { valid, errors } = validateAdCTAOptimizerInput({
    ...validInput,
    goal: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('goal_invalid'));
});

test('validateAdCTAOptimizerInput rejects currentCTA over 200 chars', () => {
  const { valid, errors } = validateAdCTAOptimizerInput({
    ...validInput,
    currentCTA: 'x'.repeat(MAX_CURRENT_CTA_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('current_cta_too_long'));
});

test('validateAdCTAOptimizerInput rejects count below 1', () => {
  const { valid, errors } = validateAdCTAOptimizerInput({
    ...validInput,
    count: 0,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_out_of_range'));
});

test('validateAdCTAOptimizerInput rejects count above 8', () => {
  const { valid, errors } = validateAdCTAOptimizerInput({
    ...validInput,
    count: 9,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_out_of_range'));
});

test('validateAdCTAOptimizerInput rejects invalid count type', () => {
  const { valid, errors } = validateAdCTAOptimizerInput({
    ...validInput,
    count: 'five' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_invalid'));
});

test('validateAdCTAOptimizerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCTAOptimizerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCTAOptimizerInput accepts input with only productOrBrand and platform', () => {
  const { valid, errors } = validateAdCTAOptimizerInput({
    productOrBrand: 'A new fitness app',
    platform: 'instagram',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run optimizeCTAs with dryRun: true so no real LLM calls are
// made — deterministic heuristic CTAs are returned instead.

test('dry-run returns an AdCTAOptimizerResult with ctas', async () => {
  const result = await optimizeCTAs({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(Array.isArray(result.ctas));
  assert.ok(result.ctas.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns ctas with correct structure', async () => {
  const result = await optimizeCTAs({ ...validInput, dryRun: true });
  for (const cta of result.ctas) {
    assert.ok(typeof cta.text === 'string' && cta.text.length > 0);
    assert.ok(VALID_URGENCY_LEVELS.includes(cta.urgencyLevel));
    assert.ok(typeof cta.actionVerb === 'string' && cta.actionVerb.length > 0);
    assert.ok(typeof cta.psychologicalTrigger === 'string' && cta.psychologicalTrigger.length > 0);
    assert.ok(typeof cta.predictedConversionLift === 'string' && cta.predictedConversionLift.length > 0);
    assert.ok(typeof cta.bestForPlatform === 'string' && cta.bestForPlatform.length > 0);
  }
});

test('dry-run returns the requested count of ctas', async () => {
  const result = await optimizeCTAs({ ...validInput, count: 8, dryRun: true });
  assert.equal(result.ctas.length, 8);
});

test('dry-run defaults to 5 ctas when count not provided', async () => {
  const result = await optimizeCTAs({
    productOrBrand: 'A coffee subscription',
    platform: 'instagram',
    dryRun: true,
  });
  assert.equal(result.ctas.length, DEFAULT_COUNT);
});

test('dry-run ctas bestForPlatform matches requested platform', async () => {
  const result = await optimizeCTAs({ ...validInput, platform: 'youtube', dryRun: true });
  for (const cta of result.ctas) {
    assert.equal(cta.bestForPlatform, 'youtube');
  }
});

test('optimizeCTAs rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => optimizeCTAs({ ...validInput, productOrBrand: '' } as AdCTAOptimizerInput),
    /invalid_ad_cta_optimizer_input/,
  );
});

test('optimizeCTAs rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => optimizeCTAs({ ...validInput, platform: 'snapchat' as never, dryRun: true } as AdCTAOptimizerInput),
    /invalid_ad_cta_optimizer_input/,
  );
});

test('optimizeCTAs rejects invalid count in dry-run mode', async () => {
  await assert.rejects(
    () => optimizeCTAs({ ...validInput, count: 20, dryRun: true } as AdCTAOptimizerInput),
    /invalid_ad_cta_optimizer_input/,
  );
});
