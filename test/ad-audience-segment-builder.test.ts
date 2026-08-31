import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Audience Segment Builder engine (AI-powered audience
 * segment generation for ad targeting).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_AUDIENCE_SEGMENT_BUILDER_CREDIT_COST,
  validateAdAudienceSegmentBuilderInput,
  generateAudienceSegments,
  VALID_PLATFORMS,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  MIN_SEGMENT_COUNT,
  MAX_SEGMENT_COUNT,
  DEFAULT_SEGMENT_COUNT,
  type AdAudienceSegmentBuilderInput,
} from '@/lib/creative/ad-audience-segment-builder';

// ── Credit cost ──

test('AD_AUDIENCE_SEGMENT_BUILDER_CREDIT_COST is 4', () => {
  assert.equal(AD_AUDIENCE_SEGMENT_BUILDER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_AUDIENCE_LENGTH is 1000', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 1000);
});

test('segment count bounds are 2-6 with default 3', () => {
  assert.equal(MIN_SEGMENT_COUNT, 2);
  assert.equal(MAX_SEGMENT_COUNT, 6);
  assert.equal(DEFAULT_SEGMENT_COUNT, 3);
});

// ── Input validation tests ──

const validInput: AdAudienceSegmentBuilderInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  primaryAudience: 'Health-conscious women aged 25-40 interested in clean beauty',
  platform: 'tiktok',
  segmentCount: 3,
};

test('validateAdAudienceSegmentBuilderInput accepts a valid input', () => {
  const { valid, errors } = validateAdAudienceSegmentBuilderInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdAudienceSegmentBuilderInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdAudienceSegmentBuilderInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdAudienceSegmentBuilderInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdAudienceSegmentBuilderInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdAudienceSegmentBuilderInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdAudienceSegmentBuilderInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdAudienceSegmentBuilderInput rejects missing primaryAudience', () => {
  const { valid, errors } = validateAdAudienceSegmentBuilderInput({
    ...validInput,
    primaryAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('primary_audience_required'));
});

test('validateAdAudienceSegmentBuilderInput rejects primaryAudience over 1000 chars', () => {
  const { valid, errors } = validateAdAudienceSegmentBuilderInput({
    ...validInput,
    primaryAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('primary_audience_too_long'));
});

test('validateAdAudienceSegmentBuilderInput rejects invalid platform', () => {
  const { valid, errors } = validateAdAudienceSegmentBuilderInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdAudienceSegmentBuilderInput rejects segmentCount below 2', () => {
  const { valid, errors } = validateAdAudienceSegmentBuilderInput({
    ...validInput,
    segmentCount: 1,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('segment_count_out_of_range'));
});

test('validateAdAudienceSegmentBuilderInput rejects segmentCount above 6', () => {
  const { valid, errors } = validateAdAudienceSegmentBuilderInput({
    ...validInput,
    segmentCount: 7,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('segment_count_out_of_range'));
});

test('validateAdAudienceSegmentBuilderInput rejects invalid segmentCount type', () => {
  const { valid, errors } = validateAdAudienceSegmentBuilderInput({
    ...validInput,
    segmentCount: 'three' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('segment_count_invalid'));
});

test('validateAdAudienceSegmentBuilderInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdAudienceSegmentBuilderInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdAudienceSegmentBuilderInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdAudienceSegmentBuilderInput({
    productOrBrand: 'A new fitness app',
    primaryAudience: 'Fitness enthusiasts aged 18-35',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateAudienceSegments with dryRun: true so no real LLM
// calls are made — deterministic heuristic segments are returned instead.

test('dry-run returns an AudienceSegmentResult with segments', async () => {
  const result = await generateAudienceSegments({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(Array.isArray(result.segments));
  assert.ok(result.segments.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns segments with correct structure', async () => {
  const result = await generateAudienceSegments({ ...validInput, dryRun: true });
  for (const seg of result.segments) {
    assert.ok(typeof seg.segmentName === 'string' && seg.segmentName.length > 0);
    assert.ok(typeof seg.demographics.ageRange === 'string' && seg.demographics.ageRange.length > 0);
    assert.ok(typeof seg.demographics.gender === 'string' && seg.demographics.gender.length > 0);
    assert.ok(typeof seg.demographics.location === 'string' && seg.demographics.location.length > 0);
    assert.ok(typeof seg.demographics.income === 'string' && seg.demographics.income.length > 0);
    assert.ok(Array.isArray(seg.interests) && seg.interests.length > 0);
    assert.ok(Array.isArray(seg.behaviors) && seg.behaviors.length > 0);
    assert.ok(Array.isArray(seg.platformTargeting) && seg.platformTargeting.length > 0);
    assert.ok(typeof seg.estimatedReach === 'string' && seg.estimatedReach.length > 0);
    assert.ok(typeof seg.recommendedAdFormat === 'string' && seg.recommendedAdFormat.length > 0);
    assert.ok(typeof seg.priority === 'string' && seg.priority.length > 0);
  }
});

test('dry-run returns the requested count of segments', async () => {
  const result = await generateAudienceSegments({ ...validInput, segmentCount: 6, dryRun: true });
  assert.equal(result.segments.length, 6);
});

test('dry-run defaults to 3 segments when segmentCount not provided', async () => {
  const result = await generateAudienceSegments({
    productOrBrand: 'A coffee subscription',
    primaryAudience: 'Coffee lovers aged 25-45',
    dryRun: true,
  });
  assert.equal(result.segments.length, DEFAULT_SEGMENT_COUNT);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateAudienceSegments({
      productOrBrand: 'A fitness app',
      primaryAudience: 'Fitness enthusiasts',
      platform,
      dryRun: true,
    });
    assert.ok(result.segments.length > 0, `${platform} should produce segments`);
  }
});

test('generateAudienceSegments rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateAudienceSegments({ ...validInput, productOrBrand: '' } as AdAudienceSegmentBuilderInput),
    /invalid_ad_audience_segment_builder_input/,
  );
});

test('generateAudienceSegments rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => generateAudienceSegments({ ...validInput, platform: 'snapchat' as never, dryRun: true } as AdAudienceSegmentBuilderInput),
    /invalid_ad_audience_segment_builder_input/,
  );
});

test('generateAudienceSegments rejects invalid segmentCount in dry-run mode', async () => {
  await assert.rejects(
    () => generateAudienceSegments({ ...validInput, segmentCount: 100, dryRun: true } as AdAudienceSegmentBuilderInput),
    /invalid_ad_audience_segment_builder_input/,
  );
});
