import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Color Palette Generator engine (AI-powered color palette
 * generation for ad creatives based on product, platform, and emotional goal).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_COLOR_PALETTE_GENERATOR_CREDIT_COST,
  validateAdColorPaletteGeneratorInput,
  generateColorPalettes,
  VALID_PLATFORMS,
  VALID_EMOTIONS,
  MAX_PRODUCT_LENGTH,
  MAX_BRAND_COLOR_LENGTH,
  MIN_COUNT,
  MAX_COUNT,
  DEFAULT_COUNT,
  type AdColorPaletteGeneratorInput,
} from '@/lib/creative/ad-color-palette-generator';

// ── Credit cost ──

test('AD_COLOR_PALETTE_GENERATOR_CREDIT_COST is 3', () => {
  assert.equal(AD_COLOR_PALETTE_GENERATOR_CREDIT_COST, 3);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_EMOTIONS contains the six emotions', () => {
  assert.ok(VALID_EMOTIONS.includes('energetic'));
  assert.ok(VALID_EMOTIONS.includes('calm'));
  assert.ok(VALID_EMOTIONS.includes('luxury'));
  assert.ok(VALID_EMOTIONS.includes('trust'));
  assert.ok(VALID_EMOTIONS.includes('playful'));
  assert.ok(VALID_EMOTIONS.includes('urgent'));
  assert.equal(VALID_EMOTIONS.length, 6);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_BRAND_COLOR_LENGTH is 7', () => {
  assert.equal(MAX_BRAND_COLOR_LENGTH, 7);
});

test('count bounds are 1-5 with default 3', () => {
  assert.equal(MIN_COUNT, 1);
  assert.equal(MAX_COUNT, 5);
  assert.equal(DEFAULT_COUNT, 3);
});

// ── Input validation tests ──

const validInput: AdColorPaletteGeneratorInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  platform: 'tiktok',
  emotion: 'energetic',
  brandColor: '#1a1a1a',
  count: 3,
};

test('validateAdColorPaletteGeneratorInput accepts a valid input', () => {
  const { valid, errors } = validateAdColorPaletteGeneratorInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdColorPaletteGeneratorInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdColorPaletteGeneratorInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdColorPaletteGeneratorInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdColorPaletteGeneratorInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdColorPaletteGeneratorInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdColorPaletteGeneratorInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdColorPaletteGeneratorInput rejects missing platform', () => {
  const { valid, errors } = validateAdColorPaletteGeneratorInput({
    ...validInput,
    platform: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_required'));
});

test('validateAdColorPaletteGeneratorInput rejects invalid platform', () => {
  const { valid, errors } = validateAdColorPaletteGeneratorInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdColorPaletteGeneratorInput rejects invalid emotion', () => {
  const { valid, errors } = validateAdColorPaletteGeneratorInput({
    ...validInput,
    emotion: 'angry' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('emotion_invalid'));
});

test('validateAdColorPaletteGeneratorInput rejects invalid brandColor type', () => {
  const { valid, errors } = validateAdColorPaletteGeneratorInput({
    ...validInput,
    brandColor: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('brand_color_invalid'));
});

test('validateAdColorPaletteGeneratorInput rejects brandColor over 7 chars', () => {
  const { valid, errors } = validateAdColorPaletteGeneratorInput({
    ...validInput,
    brandColor: '#1234567',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('brand_color_too_long'));
});

test('validateAdColorPaletteGeneratorInput rejects non-hex brandColor', () => {
  const { valid, errors } = validateAdColorPaletteGeneratorInput({
    ...validInput,
    brandColor: 'red',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('brand_color_invalid'));
});

test('validateAdColorPaletteGeneratorInput rejects count below 1', () => {
  const { valid, errors } = validateAdColorPaletteGeneratorInput({
    ...validInput,
    count: 0,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_out_of_range'));
});

test('validateAdColorPaletteGeneratorInput rejects count above 5', () => {
  const { valid, errors } = validateAdColorPaletteGeneratorInput({
    ...validInput,
    count: 6,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_out_of_range'));
});

test('validateAdColorPaletteGeneratorInput rejects invalid count type', () => {
  const { valid, errors } = validateAdColorPaletteGeneratorInput({
    ...validInput,
    count: 'three' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('count_invalid'));
});

test('validateAdColorPaletteGeneratorInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdColorPaletteGeneratorInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdColorPaletteGeneratorInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdColorPaletteGeneratorInput({
    productOrBrand: 'A new fitness app',
    platform: 'instagram',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateColorPalettes with dryRun: true so no real LLM
// calls are made — deterministic heuristic palettes are returned instead.

test('dry-run returns an AdColorPaletteGeneratorResult with palettes', async () => {
  const result = await generateColorPalettes({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(Array.isArray(result.palettes));
  assert.ok(result.palettes.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns palettes with correct structure', async () => {
  const result = await generateColorPalettes({ ...validInput, dryRun: true });
  for (const palette of result.palettes) {
    assert.ok(typeof palette.name === 'string' && palette.name.length > 0);
    assert.ok(Array.isArray(palette.colors));
    assert.ok(palette.colors.length >= 4);
    for (const color of palette.colors) {
      assert.ok(typeof color === 'string');
      assert.ok(/^#[0-9a-fA-F]{6}$/.test(color), `${color} should be a valid hex color`);
    }
    assert.ok(/^#[0-9a-fA-F]{6}$/.test(palette.primary));
    assert.ok(/^#[0-9a-fA-F]{6}$/.test(palette.secondary));
    assert.ok(/^#[0-9a-fA-F]{6}$/.test(palette.accent));
    assert.ok(/^#[0-9a-fA-F]{6}$/.test(palette.background));
    assert.ok(/^#[0-9a-fA-F]{6}$/.test(palette.text));
    assert.ok(typeof palette.emotion === 'string' && palette.emotion.length > 0);
    assert.ok(typeof palette.platformFit === 'string' && palette.platformFit.length > 0);
    assert.ok(typeof palette.psychology === 'string' && palette.psychology.length > 0);
  }
});

test('dry-run returns the requested count of palettes', async () => {
  const result = await generateColorPalettes({ ...validInput, count: 5, dryRun: true });
  assert.equal(result.palettes.length, 5);
});

test('dry-run defaults to 3 palettes when count not provided', async () => {
  const result = await generateColorPalettes({
    productOrBrand: 'A coffee subscription',
    platform: 'instagram',
    dryRun: true,
  });
  assert.equal(result.palettes.length, DEFAULT_COUNT);
});

test('dry-run palette emotion matches requested emotion', async () => {
  const result = await generateColorPalettes({
    ...validInput,
    emotion: 'calm',
    dryRun: true,
  });
  for (const palette of result.palettes) {
    assert.equal(palette.emotion, 'calm');
  }
});

test('dry-run works for all six emotions', async () => {
  for (const emotion of VALID_EMOTIONS) {
    const result = await generateColorPalettes({
      productOrBrand: 'A fitness app',
      platform: 'youtube',
      emotion,
      dryRun: true,
    });
    assert.ok(result.palettes.length > 0, `${emotion} should produce palettes`);
    for (const palette of result.palettes) {
      assert.equal(palette.emotion, emotion);
    }
  }
});

test('dry-run incorporates brandColor into palettes when provided', async () => {
  const brandColor = '#ff5722';
  const result = await generateColorPalettes({
    ...validInput,
    brandColor,
    dryRun: true,
  });
  for (const palette of result.palettes) {
    assert.equal(palette.primary.toLowerCase(), brandColor.toLowerCase());
  }
});

test('generateColorPalettes rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateColorPalettes({ ...validInput, productOrBrand: '' } as AdColorPaletteGeneratorInput),
    /invalid_ad_color_palette_generator_input/,
  );
});

test('generateColorPalettes rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () => generateColorPalettes({ ...validInput, platform: 'snapchat' as never, dryRun: true } as AdColorPaletteGeneratorInput),
    /invalid_ad_color_palette_generator_input/,
  );
});

test('generateColorPalettes rejects invalid count in dry-run mode', async () => {
  await assert.rejects(
    () => generateColorPalettes({ ...validInput, count: 10, dryRun: true } as AdColorPaletteGeneratorInput),
    /invalid_ad_color_palette_generator_input/,
  );
});
