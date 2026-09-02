import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Format Converter engine (AI-powered ad format
 * conversion between long-form, short-form, image-ad, video-script, carousel,
 * and story formats).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_FORMAT_CONVERTER_CREDIT_COST,
  validateCreativeFormatConverterInput,
  convertFormat,
  VALID_PLATFORMS,
  VALID_FORMATS,
  MAX_CONTENT_LENGTH,
  MAX_PRODUCT_LENGTH,
  type CreativeFormatConverterInput,
} from '@/lib/creative/creative-format-converter';

// ── Credit cost ──

test('CREATIVE_FORMAT_CONVERTER_CREDIT_COST is 4', () => {
  assert.equal(CREATIVE_FORMAT_CONVERTER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_FORMATS contains the six supported formats', () => {
  assert.ok(VALID_FORMATS.includes('long-form'));
  assert.ok(VALID_FORMATS.includes('short-form'));
  assert.ok(VALID_FORMATS.includes('image-ad'));
  assert.ok(VALID_FORMATS.includes('video-script'));
  assert.ok(VALID_FORMATS.includes('carousel'));
  assert.ok(VALID_FORMATS.includes('story'));
  assert.equal(VALID_FORMATS.length, 6);
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: CreativeFormatConverterInput = {
  content: 'Our vitamin C serum brightens skin in just two weeks with 20% L-ascorbic acid.',
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  sourceFormat: 'long-form',
  targetFormat: 'short-form',
  platform: 'tiktok',
};

test('validateCreativeFormatConverterInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeFormatConverterInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeFormatConverterInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeFormatConverterInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeFormatConverterInput rejects missing content', () => {
  const { valid, errors } = validateCreativeFormatConverterInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeFormatConverterInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeFormatConverterInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeFormatConverterInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeFormatConverterInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeFormatConverterInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeFormatConverterInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeFormatConverterInput rejects missing sourceFormat', () => {
  const { valid, errors } = validateCreativeFormatConverterInput({
    ...validInput,
    sourceFormat: '' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('source_format_required'));
});

test('validateCreativeFormatConverterInput rejects invalid sourceFormat', () => {
  const { valid, errors } = validateCreativeFormatConverterInput({
    ...validInput,
    sourceFormat: 'blog' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('source_format_invalid'));
});

test('validateCreativeFormatConverterInput rejects missing targetFormat', () => {
  const { valid, errors } = validateCreativeFormatConverterInput({
    ...validInput,
    targetFormat: '' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_format_required'));
});

test('validateCreativeFormatConverterInput rejects invalid targetFormat', () => {
  const { valid, errors } = validateCreativeFormatConverterInput({
    ...validInput,
    targetFormat: 'banner' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_format_invalid'));
});

test('validateCreativeFormatConverterInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeFormatConverterInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeFormatConverterInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeFormatConverterInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeFormatConverterInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeFormatConverterInput({
    content: 'A great product description.',
    productOrBrand: 'A fitness app',
    sourceFormat: 'long-form',
    targetFormat: 'video-script',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run convertFormat with dryRun: true so no real LLM calls are
// made — deterministic heuristic conversion is returned instead.

test('dry-run returns a FormatConverterResult with conversion', async () => {
  const result = await convertFormat({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.conversion);
  assert.equal(result.dryRun, true);
});

test('dry-run returns conversion with correct structure', async () => {
  const result = await convertFormat({ ...validInput, dryRun: true });
  const c = result.conversion;
  assert.ok(typeof c.convertedContent === 'string' && c.convertedContent.length > 0);
  assert.ok(Array.isArray(c.formatNotes) && c.formatNotes.length > 0);
  assert.ok(Array.isArray(c.adaptations) && c.adaptations.length > 0);
  assert.ok(typeof c.characterCount === 'number' && c.characterCount > 0);
  assert.ok(typeof c.estimatedDuration === 'string' && c.estimatedDuration.length > 0);
  assert.ok(Array.isArray(c.platformOptimizations));
});

test('dry-run works for all target formats', async () => {
  for (const target of VALID_FORMATS) {
    const result = await convertFormat({
      content: 'A great product description.',
      productOrBrand: 'A fitness app',
      sourceFormat: 'long-form',
      targetFormat: target,
      dryRun: true,
    });
    assert.ok(result.conversion.convertedContent.length > 0, `${target} should produce converted content`);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await convertFormat({
      content: 'A great product description.',
      productOrBrand: 'A fitness app',
      sourceFormat: 'long-form',
      targetFormat: 'short-form',
      platform,
      dryRun: true,
    });
    assert.ok(result.conversion.platformOptimizations.length > 0, `${platform} should have platform optimizations`);
  }
});

test('dry-run works without platform', async () => {
  const result = await convertFormat({
    content: 'A great product description.',
    productOrBrand: 'A fitness app',
    sourceFormat: 'long-form',
    targetFormat: 'carousel',
    dryRun: true,
  });
  assert.ok(result.conversion.convertedContent.length > 0);
  assert.equal(result.conversion.platformOptimizations.length, 0);
});

test('convertFormat rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => convertFormat({ ...validInput, content: '' } as CreativeFormatConverterInput),
    /invalid_creative_format_converter_input/,
  );
});

test('convertFormat rejects invalid sourceFormat in dry-run mode', async () => {
  await assert.rejects(
    () => convertFormat({ ...validInput, sourceFormat: 'blog' as never, dryRun: true } as CreativeFormatConverterInput),
    /invalid_creative_format_converter_input/,
  );
});
