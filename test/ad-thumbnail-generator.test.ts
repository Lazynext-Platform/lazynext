import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Thumbnail Generator engine (AI-powered thumbnail/cover
 * image concept generation for video ads).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_THUMBNAIL_GENERATOR_CREDIT_COST,
  validateAdThumbnailGeneratorInput,
  generateThumbnails,
  VALID_PLATFORMS,
  VALID_STYLES,
  VALID_TEXT_POSITIONS,
  MAX_PRODUCT_LENGTH,
  MAX_VIDEO_TITLE_LENGTH,
  MAX_VIDEO_TOPIC_LENGTH,
  MIN_COUNT,
  MAX_COUNT,
  DEFAULT_COUNT,
  type AdThumbnailGeneratorInput,
} from '@/lib/creative/ad-thumbnail-generator';

// ── Credit cost ──

test('AD_THUMBNAIL_GENERATOR_CREDIT_COST is 4', () => {
  assert.equal(AD_THUMBNAIL_GENERATOR_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_STYLES contains the five styles', () => {
  assert.ok(VALID_STYLES.includes('bold'));
  assert.ok(VALID_STYLES.includes('minimal'));
  assert.ok(VALID_STYLES.includes('playful'));
  assert.ok(VALID_STYLES.includes('dramatic'));
  assert.ok(VALID_STYLES.includes('lifestyle'));
  assert.equal(VALID_STYLES.length, 5);
});

test('VALID_TEXT_POSITIONS contains the three positions', () => {
  assert.ok(VALID_TEXT_POSITIONS.includes('top'));
  assert.ok(VALID_TEXT_POSITIONS.includes('center'));
  assert.ok(VALID_TEXT_POSITIONS.includes('bottom'));
  assert.equal(VALID_TEXT_POSITIONS.length, 3);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_VIDEO_TITLE_LENGTH is 500', () => {
  assert.equal(MAX_VIDEO_TITLE_LENGTH, 500);
});

test('MAX_VIDEO_TOPIC_LENGTH is 500', () => {
  assert.equal(MAX_VIDEO_TOPIC_LENGTH, 500);
});

test('count bounds are 1-6 with default 3', () => {
  assert.equal(MIN_COUNT, 1);
  assert.equal(MAX_COUNT, 6);
  assert.equal(DEFAULT_COUNT, 3);
});

// ── Input validation tests ──

const validInput: AdThumbnailGeneratorInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  platform: 'tiktok',
  videoTitle: '5 skincare mistakes you are making',
  style: 'bold',
  count: 3,
};

test('validateAdThumbnailGeneratorInput accepts a valid input', () => {
  const { valid, errors } = validateAdThumbnailGeneratorInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdThumbnailGeneratorInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdThumbnailGeneratorInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdThumbnailGeneratorInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdThumbnailGeneratorInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdThumbnailGeneratorInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdThumbnailGeneratorInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdThumbnailGeneratorInput rejects missing platform', () => {
  const { valid, errors } = validateAdThumbnailGeneratorInput({
    ...validInput,
    platform: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_required'));
});

test('validateAdThumbnailGeneratorInput rejects invalid platform', () => {
  const { valid, errors } = validateAdThumbnailGeneratorInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdThumbnailGeneratorInput rejects missing videoTitle and videoTopic', () => {
  const { valid, errors } = validateAdThumbnailGeneratorInput({
    ...validInput,
    videoTitle: '',
    videoTopic: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('video_title_or_topic_required'));
});

test('validateAdThumbnailGeneratorInput accepts videoTopic when videoTitle missing', () => {
  const { valid, errors } = validateAdThumbnailGeneratorInput({
    productOrBrand: 'A fitness app',
    platform: 'youtube',
    videoTopic: 'home workout tips',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdThumbnailGeneratorInput rejects videoTitle over 500 chars', () => {
  const { valid, errors } = validateAdThumbnailGeneratorInput({
    ...validInput,
    videoTitle: 'x'.repeat(MAX_VIDEO_TITLE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('video_title_too_long'));
});

test('validateAdThumbnailGeneratorInput rejects videoTopic over 500 chars', () => {
  const { valid, errors } = validateAdThumbnailGeneratorInput({
    ...validInput,
    videoTopic: 'x'.repeat(MAX_VIDEO_TOPIC_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('video_topic_too_long'));
});

test('validateAdThumbnailGeneratorInput rejects invalid style', () => {
  const { valid, errors } = validateAdThumbnailGeneratorInput({
    ...validInput,
    style: 'retro' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('style_invalid'));
});

test('validateAdThumbnailGeneratorInput rejects count below 1', () => {
  const { valid, errors } = validateAdThumbnailGeneratorInput({
    ...validInput,
    count: 0,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_out_of_range'));
});

test('validateAdThumbnailGeneratorInput rejects count above 6', () => {
  const { valid, errors } = validateAdThumbnailGeneratorInput({
    ...validInput,
    count: 7,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_out_of_range'));
});

test('validateAdThumbnailGeneratorInput rejects invalid count type', () => {
  const { valid, errors } = validateAdThumbnailGeneratorInput({
    ...validInput,
    count: 'three' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_invalid'));
});

test('validateAdThumbnailGeneratorInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdThumbnailGeneratorInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdThumbnailGeneratorInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdThumbnailGeneratorInput({
    productOrBrand: 'A new fitness app',
    platform: 'instagram',
    videoTitle: 'Get fit at home',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateThumbnails with dryRun: true so no real LLM calls
// are made — deterministic heuristic thumbnails are returned instead.

test('dry-run returns an AdThumbnailGeneratorResult with thumbnails', async () => {
  const result = await generateThumbnails({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(Array.isArray(result.thumbnails));
  assert.ok(result.thumbnails.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns thumbnails with correct structure', async () => {
  const result = await generateThumbnails({ ...validInput, dryRun: true });
  for (const thumb of result.thumbnails) {
    assert.ok(typeof thumb.title === 'string' && thumb.title.length > 0);
    assert.ok(typeof thumb.visualDescription === 'string' && thumb.visualDescription.length > 0);
    assert.ok(typeof thumb.textOverlay === 'string' && thumb.textOverlay.length > 0);
    assert.ok(VALID_TEXT_POSITIONS.includes(thumb.textPosition));
    assert.ok(typeof thumb.fontStyle === 'string' && thumb.fontStyle.length > 0);
    assert.ok(typeof thumb.colorScheme.primary === 'string');
    assert.ok(typeof thumb.colorScheme.secondary === 'string');
    assert.ok(typeof thumb.colorScheme.background === 'string');
    assert.ok(typeof thumb.emotion === 'string' && thumb.emotion.length > 0);
    assert.ok(typeof thumb.predictedCTR === 'number');
    assert.ok(thumb.predictedCTR >= 0 && thumb.predictedCTR <= 100);
  }
});

test('dry-run returns the requested count of thumbnails', async () => {
  const result = await generateThumbnails({ ...validInput, count: 6, dryRun: true });
  assert.equal(result.thumbnails.length, 6);
});

test('dry-run defaults to 3 thumbnails when count not provided', async () => {
  const result = await generateThumbnails({
    productOrBrand: 'A coffee subscription',
    platform: 'instagram',
    videoTitle: 'Best coffee ever',
    dryRun: true,
  });
  assert.equal(result.thumbnails.length, DEFAULT_COUNT);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateThumbnails({
      productOrBrand: 'A fitness app',
      platform,
      videoTitle: 'Get fit fast',
      dryRun: true,
    });
    assert.ok(result.thumbnails.length > 0, `${platform} should produce thumbnails`);
  }
});

test('generateThumbnails rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateThumbnails({ ...validInput, productOrBrand: '' } as AdThumbnailGeneratorInput),
    /invalid_ad_thumbnail_generator_input/,
  );
});

test('generateThumbnails rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => generateThumbnails({ ...validInput, platform: 'snapchat' as never, dryRun: true } as AdThumbnailGeneratorInput),
    /invalid_ad_thumbnail_generator_input/,
  );
});

test('generateThumbnails rejects invalid count in dry-run mode', async () => {
  await assert.rejects(
    () => generateThumbnails({ ...validInput, count: 10, dryRun: true } as AdThumbnailGeneratorInput),
    /invalid_ad_thumbnail_generator_input/,
  );
});
