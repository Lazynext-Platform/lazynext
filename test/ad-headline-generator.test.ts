import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Headline Generator engine (AI-powered attention-grabbing ad
 * headlines optimized for specific platforms).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_HEADLINE_GENERATOR_CREDIT_COST,
  validateAdHeadlineGeneratorInput,
  generateAdHeadlines,
  VALID_PLATFORMS,
  VALID_HOOK_TYPES,
  VALID_IMPACTS,
  MAX_PRODUCT_LENGTH,
  MAX_TONE_LENGTH,
  MAX_AUDIENCE_LENGTH,
  MIN_COUNT,
  MAX_COUNT,
  DEFAULT_COUNT,
  type AdHeadlineGeneratorInput,
} from '@/lib/creative/ad-headline-generator';

// ── Credit cost ──

test('AD_HEADLINE_GENERATOR_CREDIT_COST is 3', () => {
  assert.equal(AD_HEADLINE_GENERATOR_CREDIT_COST, 3);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_HOOK_TYPES contains the five hook types', () => {
  assert.ok(VALID_HOOK_TYPES.includes('curiosity'));
  assert.ok(VALID_HOOK_TYPES.includes('urgency'));
  assert.ok(VALID_HOOK_TYPES.includes('social_proof'));
  assert.ok(VALID_HOOK_TYPES.includes('benefit'));
  assert.ok(VALID_HOOK_TYPES.includes('question'));
  assert.equal(VALID_HOOK_TYPES.length, 5);
});

test('VALID_IMPACTS contains low, medium, high', () => {
  assert.deepEqual(VALID_IMPACTS, ['low', 'medium', 'high']);
});

test('count constants are correct', () => {
  assert.equal(MIN_COUNT, 1);
  assert.equal(MAX_COUNT, 10);
  assert.equal(DEFAULT_COUNT, 5);
});

test('length constants are correct', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
  assert.equal(MAX_TONE_LENGTH, 100);
  assert.equal(MAX_AUDIENCE_LENGTH, 1000);
});

// ── Input validation tests ──

const validInput: AdHeadlineGeneratorInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  platform: 'tiktok',
  targetAudience: 'women 25-40 interested in clean beauty',
  tone: 'playful',
  count: 5,
};

test('validateAdHeadlineGeneratorInput accepts a valid input', () => {
  const { valid, errors } = validateAdHeadlineGeneratorInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdHeadlineGeneratorInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdHeadlineGeneratorInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdHeadlineGeneratorInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdHeadlineGeneratorInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdHeadlineGeneratorInput rejects productOrBrand over MAX_PRODUCT_LENGTH', () => {
  const { valid, errors } = validateAdHeadlineGeneratorInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdHeadlineGeneratorInput rejects missing platform', () => {
  const { valid, errors } = validateAdHeadlineGeneratorInput({
    ...validInput,
    platform: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_required'));
});

test('validateAdHeadlineGeneratorInput rejects invalid platform', () => {
  const { valid, errors } = validateAdHeadlineGeneratorInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdHeadlineGeneratorInput rejects invalid targetAudience type', () => {
  const { valid, errors } = validateAdHeadlineGeneratorInput({
    ...validInput,
    targetAudience: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_invalid'));
});

test('validateAdHeadlineGeneratorInput rejects targetAudience over MAX_AUDIENCE_LENGTH', () => {
  const { valid, errors } = validateAdHeadlineGeneratorInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdHeadlineGeneratorInput rejects invalid tone type', () => {
  const { valid, errors } = validateAdHeadlineGeneratorInput({
    ...validInput,
    tone: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('tone_invalid'));
});

test('validateAdHeadlineGeneratorInput rejects tone over MAX_TONE_LENGTH', () => {
  const { valid, errors } = validateAdHeadlineGeneratorInput({
    ...validInput,
    tone: 'x'.repeat(MAX_TONE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('tone_too_long'));
});

test('validateAdHeadlineGeneratorInput rejects count below MIN_COUNT', () => {
  const { valid, errors } = validateAdHeadlineGeneratorInput({
    ...validInput,
    count: 0,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_out_of_range'));
});

test('validateAdHeadlineGeneratorInput rejects count above MAX_COUNT', () => {
  const { valid, errors } = validateAdHeadlineGeneratorInput({
    ...validInput,
    count: 11,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_out_of_range'));
});

test('validateAdHeadlineGeneratorInput rejects invalid count type', () => {
  const { valid, errors } = validateAdHeadlineGeneratorInput({
    ...validInput,
    count: 'five' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_invalid'));
});

test('validateAdHeadlineGeneratorInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdHeadlineGeneratorInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdHeadlineGeneratorInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdHeadlineGeneratorInput({
    productOrBrand: 'A new fitness app',
    platform: 'instagram',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateAdHeadlines with dryRun: true so no real LLM calls
// are made — deterministic templated headlines are returned instead.

test('dry-run returns an AdHeadlineGeneratorResult with headlines', async () => {
  const result = await generateAdHeadlines({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(Array.isArray(result.headlines));
  assert.ok(result.headlines.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns headlines with correct structure', async () => {
  const result = await generateAdHeadlines({ ...validInput, dryRun: true });
  for (const h of result.headlines) {
    assert.ok(typeof h.text === 'string' && h.text.length > 0);
    assert.ok(typeof h.platformFit === 'string' && h.platformFit.length > 0);
    assert.ok(typeof h.characterCount === 'number');
    assert.ok(VALID_IMPACTS.includes(h.predictedImpact));
    assert.ok(VALID_HOOK_TYPES.includes(h.hookType));
  }
});

test('dry-run returns the requested number of headlines', async () => {
  const result = await generateAdHeadlines({ ...validInput, count: 8, dryRun: true });
  assert.equal(result.headlines.length, 8);
});

test('dry-run defaults to DEFAULT_COUNT headlines when count omitted', async () => {
  const result = await generateAdHeadlines({
    productOrBrand: 'A coffee subscription',
    platform: 'instagram',
    dryRun: true,
  });
  assert.equal(result.headlines.length, DEFAULT_COUNT);
});

test('dry-run headlines have characterCount matching text length', async () => {
  const result = await generateAdHeadlines({ ...validInput, dryRun: true });
  for (const h of result.headlines) {
    assert.equal(h.characterCount, h.text.length);
  }
});

test('dry-run headlines have varied hook types', async () => {
  const result = await generateAdHeadlines({ ...validInput, count: 5, dryRun: true });
  const hookTypes = new Set(result.headlines.map((h) => h.hookType));
  assert.ok(hookTypes.size > 1, 'should have more than one hook type');
});

test('dry-run respects count of 1', async () => {
  const result = await generateAdHeadlines({ ...validInput, count: 1, dryRun: true });
  assert.equal(result.headlines.length, 1);
});

test('generateAdHeadlines rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateAdHeadlines({ ...validInput, productOrBrand: '' } as AdHeadlineGeneratorInput),
    /invalid_ad_headline_generator_input/,
  );
});

test('generateAdHeadlines rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => generateAdHeadlines({ ...validInput, platform: 'snapchat' as never, dryRun: true } as AdHeadlineGeneratorInput),
    /invalid_ad_headline_generator_input/,
  );
});

test('generateAdHeadlines rejects out-of-range count in dry-run mode', async () => {
  await assert.rejects(
    () => generateAdHeadlines({ ...validInput, count: 20, dryRun: true } as AdHeadlineGeneratorInput),
    /invalid_ad_headline_generator_input/,
  );
});
