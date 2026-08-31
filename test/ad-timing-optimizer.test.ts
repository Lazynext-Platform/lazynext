import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Timing Optimizer engine (AI-powered optimal ad scheduling
 * based on platform, audience, and timezone).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_TIMING_OPTIMIZER_CREDIT_COST,
  validateAdTimingOptimizerInput,
  optimizeTiming,
  VALID_PLATFORMS,
  MAX_AUDIENCE_LENGTH,
  MAX_TIMEZONE_LENGTH,
  MAX_CATEGORY_LENGTH,
  DEFAULT_TIMEZONE,
  type AdTimingOptimizerInput,
} from '@/lib/creative/ad-timing-optimizer';

// ── Credit cost ──

test('AD_TIMING_OPTIMIZER_CREDIT_COST is 3', () => {
  assert.equal(AD_TIMING_OPTIMIZER_CREDIT_COST, 3);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('length constants are correct', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 2000);
  assert.equal(MAX_TIMEZONE_LENGTH, 100);
  assert.equal(MAX_CATEGORY_LENGTH, 200);
  assert.equal(DEFAULT_TIMEZONE, 'UTC');
});

// ── Input validation tests ──

const validInput: AdTimingOptimizerInput = {
  platform: 'tiktok',
  audienceDescription: 'Gen Z college students in the US who follow fitness influencers',
  timezone: 'America/New_York',
  productCategory: 'fitness apparel',
};

test('validateAdTimingOptimizerInput accepts a valid input', () => {
  const { valid, errors } = validateAdTimingOptimizerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdTimingOptimizerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdTimingOptimizerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdTimingOptimizerInput rejects missing platform', () => {
  const { valid, errors } = validateAdTimingOptimizerInput({
    ...validInput,
    platform: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_required'));
});

test('validateAdTimingOptimizerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdTimingOptimizerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdTimingOptimizerInput rejects missing audienceDescription', () => {
  const { valid, errors } = validateAdTimingOptimizerInput({
    ...validInput,
    audienceDescription: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('audience_description_required'));
});

test('validateAdTimingOptimizerInput rejects audienceDescription over MAX_AUDIENCE_LENGTH', () => {
  const { valid, errors } = validateAdTimingOptimizerInput({
    ...validInput,
    audienceDescription: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('audience_description_too_long'));
});

test('validateAdTimingOptimizerInput rejects invalid timezone type', () => {
  const { valid, errors } = validateAdTimingOptimizerInput({
    ...validInput,
    timezone: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('timezone_invalid'));
});

test('validateAdTimingOptimizerInput rejects timezone over MAX_TIMEZONE_LENGTH', () => {
  const { valid, errors } = validateAdTimingOptimizerInput({
    ...validInput,
    timezone: 'x'.repeat(MAX_TIMEZONE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('timezone_too_long'));
});

test('validateAdTimingOptimizerInput rejects invalid productCategory type', () => {
  const { valid, errors } = validateAdTimingOptimizerInput({
    ...validInput,
    productCategory: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_category_invalid'));
});

test('validateAdTimingOptimizerInput rejects productCategory over MAX_CATEGORY_LENGTH', () => {
  const { valid, errors } = validateAdTimingOptimizerInput({
    ...validInput,
    productCategory: 'x'.repeat(MAX_CATEGORY_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_category_too_long'));
});

test('validateAdTimingOptimizerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdTimingOptimizerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdTimingOptimizerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdTimingOptimizerInput({
    platform: 'instagram',
    audienceDescription: 'Millennial foodies in Europe',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run optimizeTiming with dryRun: true so no real LLM calls are
// made — deterministic heuristic slots are returned instead.

test('dry-run returns an AdTimingOptimizerResult with optimalSlots', async () => {
  const result = await optimizeTiming({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(Array.isArray(result.optimalSlots));
  assert.ok(result.optimalSlots.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns slots with correct structure', async () => {
  const result = await optimizeTiming({ ...validInput, dryRun: true });
  for (const s of result.optimalSlots) {
    assert.ok(typeof s.dayOfWeek === 'string' && s.dayOfWeek.length > 0);
    assert.ok(typeof s.timeRange === 'string' && s.timeRange.length > 0);
    assert.ok(typeof s.confidenceScore === 'number');
    assert.ok(s.confidenceScore >= 0 && s.confidenceScore <= 100);
    assert.ok(typeof s.expectedReach === 'string' && s.expectedReach.length > 0);
    assert.ok(typeof s.reason === 'string' && s.reason.length > 0);
    assert.ok(['low', 'medium', 'high'].includes(s.audienceActivity));
  }
});

test('dry-run returns a non-empty summary', async () => {
  const result = await optimizeTiming({ ...validInput, dryRun: true });
  assert.ok(typeof result.summary === 'string' && result.summary.length > 0);
});

test('dry-run defaults timezone to UTC when omitted', async () => {
  const result = await optimizeTiming({
    platform: 'instagram',
    audienceDescription: 'Millennial foodies in Europe',
    dryRun: true,
  });
  assert.equal(result.timezone, DEFAULT_TIMEZONE);
});

test('dry-run respects provided timezone', async () => {
  const result = await optimizeTiming({
    ...validInput,
    timezone: 'America/Los_Angeles',
    dryRun: true,
  });
  assert.equal(result.timezone, 'America/Los_Angeles');
});

test('optimizeTiming rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => optimizeTiming({ ...validInput, audienceDescription: '' } as AdTimingOptimizerInput),
    /invalid_ad_timing_optimizer_input/,
  );
});

test('optimizeTiming rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => optimizeTiming({ ...validInput, platform: 'snapchat' as never, dryRun: true } as AdTimingOptimizerInput),
    /invalid_ad_timing_optimizer_input/,
  );
});
