import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Caption Generator engine (AI-powered platform-specific ad
 * captions with emojis, hashtags, and CTAs).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CAPTION_GENERATOR_CREDIT_COST,
  validateAdCaptionGeneratorInput,
  generateAdCaptions,
  VALID_PLATFORMS,
  MAX_PRODUCT_LENGTH,
  MAX_TONE_LENGTH,
  MIN_COUNT,
  MAX_COUNT,
  DEFAULT_COUNT,
  type AdCaptionGeneratorInput,
} from '@/lib/creative/ad-caption-generator';

// ── Credit cost ──

test('AD_CAPTION_GENERATOR_CREDIT_COST is 3', () => {
  assert.equal(AD_CAPTION_GENERATOR_CREDIT_COST, 3);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('count constants are correct', () => {
  assert.equal(MIN_COUNT, 1);
  assert.equal(MAX_COUNT, 5);
  assert.equal(DEFAULT_COUNT, 3);
});

test('MAX_PRODUCT_LENGTH is 2000 and MAX_TONE_LENGTH is 100', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
  assert.equal(MAX_TONE_LENGTH, 100);
});

// ── Input validation tests ──

const validInput: AdCaptionGeneratorInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  platform: 'tiktok',
  tone: 'playful',
  count: 3,
};

test('validateAdCaptionGeneratorInput accepts a valid input', () => {
  const { valid, errors } = validateAdCaptionGeneratorInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCaptionGeneratorInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCaptionGeneratorInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCaptionGeneratorInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCaptionGeneratorInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCaptionGeneratorInput rejects productOrBrand over MAX_PRODUCT_LENGTH', () => {
  const { valid, errors } = validateAdCaptionGeneratorInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCaptionGeneratorInput rejects missing platform', () => {
  const { valid, errors } = validateAdCaptionGeneratorInput({
    ...validInput,
    platform: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_required'));
});

test('validateAdCaptionGeneratorInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCaptionGeneratorInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCaptionGeneratorInput rejects invalid tone type', () => {
  const { valid, errors } = validateAdCaptionGeneratorInput({
    ...validInput,
    tone: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('tone_invalid'));
});

test('validateAdCaptionGeneratorInput rejects tone over MAX_TONE_LENGTH', () => {
  const { valid, errors } = validateAdCaptionGeneratorInput({
    ...validInput,
    tone: 'x'.repeat(MAX_TONE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('tone_too_long'));
});

test('validateAdCaptionGeneratorInput rejects count below MIN_COUNT', () => {
  const { valid, errors } = validateAdCaptionGeneratorInput({
    ...validInput,
    count: 0,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_out_of_range'));
});

test('validateAdCaptionGeneratorInput rejects count above MAX_COUNT', () => {
  const { valid, errors } = validateAdCaptionGeneratorInput({
    ...validInput,
    count: 6,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_out_of_range'));
});

test('validateAdCaptionGeneratorInput rejects invalid count type', () => {
  const { valid, errors } = validateAdCaptionGeneratorInput({
    ...validInput,
    count: 'three' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_invalid'));
});

test('validateAdCaptionGeneratorInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCaptionGeneratorInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCaptionGeneratorInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCaptionGeneratorInput({
    productOrBrand: 'A new fitness app',
    platform: 'instagram',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateAdCaptions with dryRun: true so no real LLM calls
// are made — deterministic templated captions are returned instead.

test('dry-run returns an AdCaptionGeneratorResult with captions', async () => {
  const result = await generateAdCaptions({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(Array.isArray(result.captions));
  assert.ok(result.captions.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns captions with correct structure', async () => {
  const result = await generateAdCaptions({ ...validInput, dryRun: true });
  for (const cap of result.captions) {
    assert.ok(typeof cap.text === 'string' && cap.text.length > 0);
    assert.ok(Array.isArray(cap.hashtags));
    assert.ok(Array.isArray(cap.emojis));
    assert.ok(typeof cap.cta === 'string' && cap.cta.length > 0);
    assert.ok(typeof cap.characterCount === 'number');
    assert.ok(typeof cap.platformFit === 'string' && cap.platformFit.length > 0);
  }
});

test('dry-run returns the requested number of captions', async () => {
  const result = await generateAdCaptions({ ...validInput, count: 5, dryRun: true });
  assert.equal(result.captions.length, 5);
});

test('dry-run defaults to DEFAULT_COUNT captions when count omitted', async () => {
  const result = await generateAdCaptions({
    productOrBrand: 'A coffee subscription',
    platform: 'instagram',
    dryRun: true,
  });
  assert.equal(result.captions.length, DEFAULT_COUNT);
});

test('dry-run captions have characterCount matching text length', async () => {
  const result = await generateAdCaptions({ ...validInput, dryRun: true });
  for (const cap of result.captions) {
    assert.equal(cap.characterCount, cap.text.length);
  }
});

test('dry-run captions include hashtags and emojis', async () => {
  const result = await generateAdCaptions({ ...validInput, dryRun: true });
  for (const cap of result.captions) {
    assert.ok(cap.hashtags.length > 0, 'should have at least one hashtag');
    assert.ok(cap.emojis.length > 0, 'should have at least one emoji');
  }
});

test('dry-run respects count of 1', async () => {
  const result = await generateAdCaptions({ ...validInput, count: 1, dryRun: true });
  assert.equal(result.captions.length, 1);
});

test('generateAdCaptions rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateAdCaptions({ ...validInput, productOrBrand: '' } as AdCaptionGeneratorInput),
    /invalid_ad_caption_generator_input/,
  );
});

test('generateAdCaptions rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => generateAdCaptions({ ...validInput, platform: 'snapchat' as never, dryRun: true } as AdCaptionGeneratorInput),
    /invalid_ad_caption_generator_input/,
  );
});

test('generateAdCaptions rejects out-of-range count in dry-run mode', async () => {
  await assert.rejects(
    () => generateAdCaptions({ ...validInput, count: 10, dryRun: true } as AdCaptionGeneratorInput),
    /invalid_ad_caption_generator_input/,
  );
});
