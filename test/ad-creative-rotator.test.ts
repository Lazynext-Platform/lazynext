import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Rotator engine (AI-powered creative variation
 * generation for ad rotation to combat fatigue).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_ROTATOR_CREDIT_COST,
  validateAdCreativeRotatorInput,
  rotateCreatives,
  VALID_PLATFORMS,
  VALID_VARIATION_TYPES,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  MIN_VARIATION_COUNT,
  MAX_VARIATION_COUNT,
  DEFAULT_VARIATION_COUNT,
  type AdCreativeRotatorInput,
} from '@/lib/creative/ad-creative-rotator';

// ── Credit cost ──

test('AD_CREATIVE_ROTATOR_CREDIT_COST is 4', () => {
  assert.equal(AD_CREATIVE_ROTATOR_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_VARIATION_TYPES contains the six variation types', () => {
  assert.ok(VALID_VARIATION_TYPES.includes('hook'));
  assert.ok(VALID_VARIATION_TYPES.includes('angle'));
  assert.ok(VALID_VARIATION_TYPES.includes('tone'));
  assert.ok(VALID_VARIATION_TYPES.includes('format'));
  assert.ok(VALID_VARIATION_TYPES.includes('visual'));
  assert.ok(VALID_VARIATION_TYPES.includes('cta'));
  assert.equal(VALID_VARIATION_TYPES.length, 6);
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('variationCount bounds are 3-10 with default 5', () => {
  assert.equal(MIN_VARIATION_COUNT, 3);
  assert.equal(MAX_VARIATION_COUNT, 10);
  assert.equal(DEFAULT_VARIATION_COUNT, 5);
});

// ── Input validation tests ──

const validInput: AdCreativeRotatorInput = {
  baseContent: 'Get 50% off our best-selling vitamin C serum this week only.',
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  variationCount: 5,
};

test('validateAdCreativeRotatorInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeRotatorInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeRotatorInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeRotatorInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeRotatorInput rejects missing baseContent', () => {
  const { valid, errors } = validateAdCreativeRotatorInput({
    ...validInput,
    baseContent: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('base_content_required'));
});

test('validateAdCreativeRotatorInput rejects baseContent over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeRotatorInput({
    ...validInput,
    baseContent: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('base_content_too_long'));
});

test('validateAdCreativeRotatorInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeRotatorInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeRotatorInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeRotatorInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeRotatorInput rejects variationCount below 3', () => {
  const { valid, errors } = validateAdCreativeRotatorInput({
    ...validInput,
    variationCount: 2,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('variation_count_out_of_range'));
});

test('validateAdCreativeRotatorInput rejects variationCount above 10', () => {
  const { valid, errors } = validateAdCreativeRotatorInput({
    ...validInput,
    variationCount: 11,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('variation_count_out_of_range'));
});

test('validateAdCreativeRotatorInput rejects invalid variationCount type', () => {
  const { valid, errors } = validateAdCreativeRotatorInput({
    ...validInput,
    variationCount: 'five' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('variation_count_invalid'));
});

test('validateAdCreativeRotatorInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeRotatorInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeRotatorInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeRotatorInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeRotatorInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeRotatorInput({
    baseContent: 'Shop our new collection today.',
    productOrBrand: 'A fashion brand',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run rotateCreatives with dryRun: true so no real LLM calls
// are made — deterministic heuristic variations are returned instead.

test('dry-run returns a CreativeRotatorResult with rotation', async () => {
  const result = await rotateCreatives({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.rotation);
  assert.equal(result.dryRun, true);
});

test('dry-run returns variations with correct structure', async () => {
  const result = await rotateCreatives({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.rotation.variations));
  assert.ok(result.rotation.variations.length > 0);
  for (const variation of result.rotation.variations) {
    assert.ok(typeof variation.id === 'string' && variation.id.length > 0);
    assert.ok(typeof variation.content === 'string' && variation.content.length > 0);
    assert.ok(VALID_VARIATION_TYPES.includes(variation.variationType));
    assert.ok(typeof variation.fatigueResistanceScore === 'number');
    assert.ok(variation.fatigueResistanceScore >= 0 && variation.fatigueResistanceScore <= 100);
    assert.ok(typeof variation.bestForAudience === 'string' && variation.bestForAudience.length > 0);
    assert.ok(typeof variation.estimatedLifespanDays === 'number');
    assert.ok(variation.estimatedLifespanDays > 0);
  }
});

test('dry-run returns the requested count of variations', async () => {
  const result = await rotateCreatives({ ...validInput, variationCount: 10, dryRun: true });
  assert.equal(result.rotation.variations.length, 10);
});

test('dry-run defaults to 5 variations when variationCount not provided', async () => {
  const result = await rotateCreatives({
    baseContent: 'Shop our new collection.',
    productOrBrand: 'A fashion brand',
    dryRun: true,
  });
  assert.equal(result.rotation.variations.length, DEFAULT_VARIATION_COUNT);
});

test('dry-run returns rotationSchedule with correct structure', async () => {
  const result = await rotateCreatives({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.rotation.rotationSchedule));
  assert.ok(result.rotation.rotationSchedule.length > 0);
  for (const sched of result.rotation.rotationSchedule) {
    assert.ok(typeof sched.week === 'number');
    assert.ok(Array.isArray(sched.variationIds));
    assert.ok(sched.variationIds.length > 0);
    assert.ok(typeof sched.strategy === 'string' && sched.strategy.length > 0);
  }
});

test('dry-run returns fatigueAnalysis and diversificationScore', async () => {
  const result = await rotateCreatives({ ...validInput, dryRun: true });
  assert.ok(typeof result.rotation.fatigueAnalysis === 'string');
  assert.ok(result.rotation.fatigueAnalysis.length > 0);
  assert.ok(typeof result.rotation.diversificationScore === 'number');
  assert.ok(result.rotation.diversificationScore >= 0 && result.rotation.diversificationScore <= 100);
});

test('dry-run returns recommendations', async () => {
  const result = await rotateCreatives({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.rotation.recommendations));
  assert.ok(result.rotation.recommendations.length > 0);
});

test('dry-run works with optional platform', async () => {
  const result = await rotateCreatives({
    ...validInput,
    platform: 'instagram',
    dryRun: true,
  });
  assert.ok(result.rotation.variations.length > 0);
});

test('rotateCreatives rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => rotateCreatives({ ...validInput, baseContent: '' } as AdCreativeRotatorInput),
    /invalid_ad_creative_rotator_input/,
  );
});

test('rotateCreatives rejects invalid variationCount in dry-run mode', async () => {
  await assert.rejects(
    () => rotateCreatives({ ...validInput, variationCount: 100, dryRun: true } as AdCreativeRotatorInput),
    /invalid_ad_creative_rotator_input/,
  );
});

test('rotateCreatives rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => rotateCreatives({ ...validInput, platform: 'snapchat' as never, dryRun: true } as AdCreativeRotatorInput),
    /invalid_ad_creative_rotator_input/,
  );
});
