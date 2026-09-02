import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Font Pairing Generator engine (AI-powered font pairing
 * recommendations for ad creatives).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_FONT_PAIRING_GENERATOR_CREDIT_COST,
  validateAdFontPairingGeneratorInput,
  generateFontPairings,
  VALID_PLATFORMS,
  VALID_MOODS,
  MAX_PRODUCT_LENGTH,
  MIN_COUNT,
  MAX_COUNT,
  DEFAULT_COUNT,
  type AdFontPairingGeneratorInput,
} from '@/lib/creative/ad-font-pairing-generator';

// ── Credit cost ──

test('AD_FONT_PAIRING_GENERATOR_CREDIT_COST is 3', () => {
  assert.equal(AD_FONT_PAIRING_GENERATOR_CREDIT_COST, 3);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_MOODS contains the six moods', () => {
  assert.ok(VALID_MOODS.includes('modern'));
  assert.ok(VALID_MOODS.includes('classic'));
  assert.ok(VALID_MOODS.includes('playful'));
  assert.ok(VALID_MOODS.includes('luxury'));
  assert.ok(VALID_MOODS.includes('bold'));
  assert.ok(VALID_MOODS.includes('minimal'));
  assert.equal(VALID_MOODS.length, 6);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('count bounds are 1-5 with default 3', () => {
  assert.equal(MIN_COUNT, 1);
  assert.equal(MAX_COUNT, 5);
  assert.equal(DEFAULT_COUNT, 3);
});

// ── Input validation tests ──

const validInput: AdFontPairingGeneratorInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  platform: 'tiktok',
  mood: 'modern',
  count: 3,
};

test('validateAdFontPairingGeneratorInput accepts a valid input', () => {
  const { valid, errors } = validateAdFontPairingGeneratorInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdFontPairingGeneratorInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdFontPairingGeneratorInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdFontPairingGeneratorInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdFontPairingGeneratorInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdFontPairingGeneratorInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdFontPairingGeneratorInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdFontPairingGeneratorInput rejects missing platform', () => {
  const { valid, errors } = validateAdFontPairingGeneratorInput({
    ...validInput,
    platform: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_required'));
});

test('validateAdFontPairingGeneratorInput rejects invalid platform', () => {
  const { valid, errors } = validateAdFontPairingGeneratorInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdFontPairingGeneratorInput rejects invalid mood', () => {
  const { valid, errors } = validateAdFontPairingGeneratorInput({
    ...validInput,
    mood: 'angry' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('mood_invalid'));
});

test('validateAdFontPairingGeneratorInput rejects count below 1', () => {
  const { valid, errors } = validateAdFontPairingGeneratorInput({
    ...validInput,
    count: 0,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_out_of_range'));
});

test('validateAdFontPairingGeneratorInput rejects count above 5', () => {
  const { valid, errors } = validateAdFontPairingGeneratorInput({
    ...validInput,
    count: 6,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_out_of_range'));
});

test('validateAdFontPairingGeneratorInput rejects invalid count type', () => {
  const { valid, errors } = validateAdFontPairingGeneratorInput({
    ...validInput,
    count: 'three' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_invalid'));
});

test('validateAdFontPairingGeneratorInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdFontPairingGeneratorInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdFontPairingGeneratorInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdFontPairingGeneratorInput({
    productOrBrand: 'A new fitness app',
    platform: 'instagram',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateFontPairings with dryRun: true so no real LLM
// calls are made — deterministic heuristic pairings are returned instead.

test('dry-run returns an AdFontPairingGeneratorResult with pairings', async () => {
  const result = await generateFontPairings({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(Array.isArray(result.pairings));
  assert.ok(result.pairings.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns pairings with correct structure', async () => {
  const result = await generateFontPairings({ ...validInput, dryRun: true });
  for (const pairing of result.pairings) {
    assert.ok(typeof pairing.name === 'string' && pairing.name.length > 0);
    assert.ok(typeof pairing.headingFont === 'string' && pairing.headingFont.length > 0);
    assert.ok(typeof pairing.bodyFont === 'string' && pairing.bodyFont.length > 0);
    assert.ok(typeof pairing.styleDescription === 'string' && pairing.styleDescription.length > 0);
    assert.ok(typeof pairing.mood === 'string' && pairing.mood.length > 0);
    assert.ok(typeof pairing.readabilityScore === 'number');
    assert.ok(pairing.readabilityScore >= 0 && pairing.readabilityScore <= 100);
    assert.ok(Array.isArray(pairing.platformFit));
    assert.ok(typeof pairing.useCase === 'string' && pairing.useCase.length > 0);
  }
});

test('dry-run returns the requested count of pairings', async () => {
  const result = await generateFontPairings({ ...validInput, count: 5, dryRun: true });
  assert.equal(result.pairings.length, 5);
});

test('dry-run defaults to 3 pairings when count not provided', async () => {
  const result = await generateFontPairings({
    productOrBrand: 'A coffee subscription',
    platform: 'instagram',
    dryRun: true,
  });
  assert.equal(result.pairings.length, DEFAULT_COUNT);
});

test('dry-run pairing mood matches requested mood', async () => {
  const result = await generateFontPairings({
    ...validInput,
    mood: 'luxury',
    dryRun: true,
  });
  for (const pairing of result.pairings) {
    assert.equal(pairing.mood, 'luxury');
  }
});

test('dry-run works for all six moods', async () => {
  for (const mood of VALID_MOODS) {
    const result = await generateFontPairings({
      productOrBrand: 'A fitness app',
      platform: 'youtube',
      mood,
      dryRun: true,
    });
    assert.ok(result.pairings.length > 0, `${mood} should produce pairings`);
    for (const pairing of result.pairings) {
      assert.equal(pairing.mood, mood);
    }
  }
});

test('generateFontPairings rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateFontPairings({ ...validInput, productOrBrand: '' } as AdFontPairingGeneratorInput),
    /invalid_ad_font_pairing_generator_input/,
  );
});

test('generateFontPairings rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => generateFontPairings({ ...validInput, platform: 'snapchat' as never, dryRun: true } as AdFontPairingGeneratorInput),
    /invalid_ad_font_pairing_generator_input/,
  );
});

test('generateFontPairings rejects invalid count in dry-run mode', async () => {
  await assert.rejects(
    () => generateFontPairings({ ...validInput, count: 10, dryRun: true } as AdFontPairingGeneratorInput),
    /invalid_ad_font_pairing_generator_input/,
  );
});
