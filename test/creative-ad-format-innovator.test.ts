import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Format Innovator engine (AI-powered ad format
 * innovation by combining existing format elements in novel ways).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_FORMAT_INNOVATOR_CREDIT_COST,
  validateCreativeAdFormatInnovatorInput,
  generateFormatInnovation,
  VALID_PLATFORMS,
  VALID_DIFFICULTIES,
  VALID_IMPACTS,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  MAX_FORMATS_LENGTH,
  MAX_FORMATS,
  type CreativeAdFormatInnovatorInput,
} from '@/lib/creative/creative-ad-format-innovator';

// ── Credit cost ──

test('CREATIVE_AD_FORMAT_INNOVATOR_CREDIT_COST is 5', () => {
  assert.equal(CREATIVE_AD_FORMAT_INNOVATOR_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_DIFFICULTIES contains the three difficulties', () => {
  assert.ok(VALID_DIFFICULTIES.includes('low'));
  assert.ok(VALID_DIFFICULTIES.includes('medium'));
  assert.ok(VALID_DIFFICULTIES.includes('high'));
  assert.equal(VALID_DIFFICULTIES.length, 3);
});

test('VALID_IMPACTS contains the three impacts', () => {
  assert.ok(VALID_IMPACTS.includes('low'));
  assert.ok(VALID_IMPACTS.includes('medium'));
  assert.ok(VALID_IMPACTS.includes('high'));
  assert.equal(VALID_IMPACTS.length, 3);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_AUDIENCE_LENGTH is 2000', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 2000);
});

test('MAX_FORMATS_LENGTH is 2000', () => {
  assert.equal(MAX_FORMATS_LENGTH, 2000);
});

test('MAX_FORMATS is 10', () => {
  assert.equal(MAX_FORMATS, 10);
});

// ── Input validation tests ──

const validInput: CreativeAdFormatInnovatorInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  targetAudience: 'Women 25-40 interested in clean beauty',
  currentFormats: 'vertical video, image carousel, story ad',
  platform: 'tiktok',
};

test('validateCreativeAdFormatInnovatorInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdFormatInnovatorInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdFormatInnovatorInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdFormatInnovatorInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdFormatInnovatorInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdFormatInnovatorInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdFormatInnovatorInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdFormatInnovatorInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdFormatInnovatorInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdFormatInnovatorInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdFormatInnovatorInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdFormatInnovatorInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdFormatInnovatorInput rejects currentFormats over 2000 chars (string)', () => {
  const { valid, errors } = validateCreativeAdFormatInnovatorInput({
    ...validInput,
    currentFormats: 'x'.repeat(MAX_FORMATS_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('formats_too_long'));
});

test('validateCreativeAdFormatInnovatorInput rejects currentFormats over 2000 chars (array)', () => {
  const { valid, errors } = validateCreativeAdFormatInnovatorInput({
    ...validInput,
    currentFormats: ['x'.repeat(MAX_FORMATS_LENGTH + 1)],
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('formats_too_long'));
});

test('validateCreativeAdFormatInnovatorInput rejects too many formats (string)', () => {
  const { valid, errors } = validateCreativeAdFormatInnovatorInput({
    ...validInput,
    currentFormats: Array.from({ length: MAX_FORMATS + 1 }, (_, i) => `format${i}`).join(','),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('too_many_formats'));
});

test('validateCreativeAdFormatInnovatorInput rejects too many formats (array)', () => {
  const { valid, errors } = validateCreativeAdFormatInnovatorInput({
    ...validInput,
    currentFormats: Array.from({ length: MAX_FORMATS + 1 }, (_, i) => `format${i}`),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('too_many_formats'));
});

test('validateCreativeAdFormatInnovatorInput rejects invalid currentFormats type', () => {
  const { valid, errors } = validateCreativeAdFormatInnovatorInput({
    ...validInput,
    currentFormats: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('formats_invalid'));
});

test('validateCreativeAdFormatInnovatorInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdFormatInnovatorInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdFormatInnovatorInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdFormatInnovatorInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdFormatInnovatorInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdFormatInnovatorInput({
    productOrBrand: 'A fitness app',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdFormatInnovatorInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdFormatInnovatorInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdFormatInnovatorInput accepts currentFormats as array', () => {
  const { valid, errors } = validateCreativeAdFormatInnovatorInput({
    ...validInput,
    currentFormats: ['vertical video', 'image carousel', 'story ad'],
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdFormatInnovatorInput accepts undefined currentFormats', () => {
  const { valid, errors } = validateCreativeAdFormatInnovatorInput({
    productOrBrand: 'A fitness app',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateFormatInnovation with dryRun: true so no real LLM
// calls are made — deterministic heuristic format concepts are returned.

test('dry-run returns a FormatInnovatorResult with innovation', async () => {
  const result = await generateFormatInnovation({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.innovation);
  assert.ok(Array.isArray(result.innovation.formats));
  assert.ok(result.innovation.formats.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns formats with correct structure', async () => {
  const result = await generateFormatInnovation({ ...validInput, dryRun: true });
  for (const f of result.innovation.formats) {
    assert.ok(typeof f.name === 'string' && f.name.length > 0);
    assert.ok(typeof f.description === 'string' && f.description.length > 0);
    assert.ok(typeof f.noveltyScore === 'number' && f.noveltyScore >= 0 && f.noveltyScore <= 100);
    assert.ok(Array.isArray(f.formatElements));
    assert.ok(VALID_DIFFICULTIES.includes(f.implementationDifficulty));
    assert.ok(VALID_IMPACTS.includes(f.expectedImpact));
    assert.ok(Array.isArray(f.platformFit));
  }
});

test('dry-run returns formatElements with correct structure', async () => {
  const result = await generateFormatInnovation({ ...validInput, dryRun: true });
  for (const f of result.innovation.formats) {
    for (const el of f.formatElements) {
      assert.ok(typeof el.element === 'string' && el.element.length > 0);
      assert.ok(typeof el.source === 'string' && el.source.length > 0);
      assert.ok(typeof el.innovation === 'string' && el.innovation.length > 0);
    }
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateFormatInnovation({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.innovation.recommendations));
  assert.ok(result.innovation.recommendations.length > 0);
});

test('dry-run returns at least 3 formats', async () => {
  const result = await generateFormatInnovation({ ...validInput, dryRun: true });
  assert.ok(result.innovation.formats.length >= 3);
});

test('dry-run returns formatElements with at least 2 elements each', async () => {
  const result = await generateFormatInnovation({ ...validInput, dryRun: true });
  for (const f of result.innovation.formats) {
    assert.ok(f.formatElements.length >= 2, `${f.name} should have at least 2 format elements`);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateFormatInnovation({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.innovation.formats.length > 0, `${platform} should produce formats`);
  }
});

test('dry-run works without currentFormats', async () => {
  const result = await generateFormatInnovation({
    productOrBrand: 'A fitness app',
    targetAudience: 'Busy professionals 30-50',
    dryRun: true,
  });
  assert.ok(result.innovation.formats.length > 0);
});

test('dry-run works with currentFormats as array', async () => {
  const result = await generateFormatInnovation({
    ...validInput,
    currentFormats: ['vertical video', 'image carousel', 'story ad'],
    dryRun: true,
  });
  assert.ok(result.innovation.formats.length > 0);
});

test('dry-run noveltyScore is in 0-100 range', async () => {
  const result = await generateFormatInnovation({ ...validInput, dryRun: true });
  for (const f of result.innovation.formats) {
    assert.ok(f.noveltyScore >= 0 && f.noveltyScore <= 100);
  }
});

test('dry-run platformFit contains valid platforms', async () => {
  const result = await generateFormatInnovation({ ...validInput, dryRun: true });
  for (const f of result.innovation.formats) {
    for (const p of f.platformFit) {
      assert.ok(VALID_PLATFORMS.includes(p), `${p} should be a valid platform`);
    }
  }
});

test('generateFormatInnovation rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateFormatInnovation({ ...validInput, productOrBrand: '' } as CreativeAdFormatInnovatorInput),
    /invalid_creative_ad_format_innovator_input/,
  );
});

test('generateFormatInnovation rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateFormatInnovation({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdFormatInnovatorInput),
    /invalid_creative_ad_format_innovator_input/,
  );
});
