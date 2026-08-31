import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Hashtag Generator engine (AI-powered platform-optimized
 * hashtag generation for ad content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_HASHTAG_GENERATOR_CREDIT_COST,
  validateAdHashtagGeneratorInput,
  generateHashtags,
  VALID_PLATFORMS,
  VALID_HASHTAG_TYPES,
  VALID_COMPETITION_LEVELS,
  MAX_PRODUCT_LENGTH,
  MAX_NICHE_LENGTH,
  MIN_COUNT,
  MAX_COUNT,
  DEFAULT_COUNT,
  type AdHashtagGeneratorInput,
} from '@/lib/creative/ad-hashtag-generator';

// ── Credit cost ──

test('AD_HASHTAG_GENERATOR_CREDIT_COST is 2', () => {
  assert.equal(AD_HASHTAG_GENERATOR_CREDIT_COST, 2);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_HASHTAG_TYPES contains the five types', () => {
  assert.ok(VALID_HASHTAG_TYPES.includes('branded'));
  assert.ok(VALID_HASHTAG_TYPES.includes('trending'));
  assert.ok(VALID_HASHTAG_TYPES.includes('niche'));
  assert.ok(VALID_HASHTAG_TYPES.includes('community'));
  assert.ok(VALID_HASHTAG_TYPES.includes('campaign'));
  assert.equal(VALID_HASHTAG_TYPES.length, 5);
});

test('VALID_COMPETITION_LEVELS contains the three levels', () => {
  assert.ok(VALID_COMPETITION_LEVELS.includes('low'));
  assert.ok(VALID_COMPETITION_LEVELS.includes('medium'));
  assert.ok(VALID_COMPETITION_LEVELS.includes('high'));
  assert.equal(VALID_COMPETITION_LEVELS.length, 3);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_NICHE_LENGTH is 500', () => {
  assert.equal(MAX_NICHE_LENGTH, 500);
});

test('count bounds are 5-30 with default 15', () => {
  assert.equal(MIN_COUNT, 5);
  assert.equal(MAX_COUNT, 30);
  assert.equal(DEFAULT_COUNT, 15);
});

// ── Input validation tests ──

const validInput: AdHashtagGeneratorInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  platform: 'tiktok',
  niche: 'skincare',
  count: 15,
};

test('validateAdHashtagGeneratorInput accepts a valid input', () => {
  const { valid, errors } = validateAdHashtagGeneratorInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdHashtagGeneratorInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdHashtagGeneratorInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdHashtagGeneratorInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdHashtagGeneratorInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdHashtagGeneratorInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdHashtagGeneratorInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdHashtagGeneratorInput rejects missing platform', () => {
  const { valid, errors } = validateAdHashtagGeneratorInput({
    ...validInput,
    platform: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_required'));
});

test('validateAdHashtagGeneratorInput rejects invalid platform', () => {
  const { valid, errors } = validateAdHashtagGeneratorInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdHashtagGeneratorInput rejects niche over 500 chars', () => {
  const { valid, errors } = validateAdHashtagGeneratorInput({
    ...validInput,
    niche: 'x'.repeat(MAX_NICHE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('niche_too_long'));
});

test('validateAdHashtagGeneratorInput rejects count below 5', () => {
  const { valid, errors } = validateAdHashtagGeneratorInput({
    ...validInput,
    count: 4,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_out_of_range'));
});

test('validateAdHashtagGeneratorInput rejects count above 30', () => {
  const { valid, errors } = validateAdHashtagGeneratorInput({
    ...validInput,
    count: 31,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_out_of_range'));
});

test('validateAdHashtagGeneratorInput rejects invalid count type', () => {
  const { valid, errors } = validateAdHashtagGeneratorInput({
    ...validInput,
    count: 'fifteen' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_invalid'));
});

test('validateAdHashtagGeneratorInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdHashtagGeneratorInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdHashtagGeneratorInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdHashtagGeneratorInput({
    productOrBrand: 'A new fitness app',
    platform: 'instagram',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateHashtags with dryRun: true so no real LLM calls
// are made — deterministic heuristic hashtags are returned instead.

test('dry-run returns an AdHashtagGeneratorResult with hashtags', async () => {
  const result = await generateHashtags({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(Array.isArray(result.hashtags));
  assert.ok(result.hashtags.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns hashtags with correct structure', async () => {
  const result = await generateHashtags({ ...validInput, dryRun: true });
  for (const tag of result.hashtags) {
    assert.ok(typeof tag.tag === 'string' && tag.tag.length > 0);
    assert.ok(VALID_HASHTAG_TYPES.includes(tag.type));
    assert.ok(typeof tag.estimatedReach === 'string' && tag.estimatedReach.length > 0);
    assert.ok(VALID_COMPETITION_LEVELS.includes(tag.competition));
    assert.ok(typeof tag.recommended === 'boolean');
  }
});

test('dry-run returns the requested count of hashtags', async () => {
  const result = await generateHashtags({ ...validInput, count: 30, dryRun: true });
  assert.equal(result.hashtags.length, 30);
});

test('dry-run defaults to 15 hashtags when count not provided', async () => {
  const result = await generateHashtags({
    productOrBrand: 'A coffee subscription',
    platform: 'instagram',
    dryRun: true,
  });
  assert.equal(result.hashtags.length, DEFAULT_COUNT);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateHashtags({
      productOrBrand: 'A fitness app',
      platform,
      dryRun: true,
    });
    assert.ok(result.hashtags.length > 0, `${platform} should produce hashtags`);
  }
});

test('generateHashtags rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateHashtags({ ...validInput, productOrBrand: '' } as AdHashtagGeneratorInput),
    /invalid_ad_hashtag_generator_input/,
  );
});

test('generateHashtags rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => generateHashtags({ ...validInput, platform: 'snapchat' as never, dryRun: true } as AdHashtagGeneratorInput),
    /invalid_ad_hashtag_generator_input/,
  );
});

test('generateHashtags rejects invalid count in dry-run mode', async () => {
  await assert.rejects(
    () => generateHashtags({ ...validInput, count: 100, dryRun: true } as AdHashtagGeneratorInput),
    /invalid_ad_hashtag_generator_input/,
  );
});
