import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Sensory Contrast Designer engine (AI-powered
 * sensory contrast design in ad creative content for maximum sensory impact).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_SENSORY_CONTRAST_DESIGNER_CREDIT_COST,
  validateAdCreativeSensoryContrastDesignerInput,
  generateSensoryContrast,
  VALID_PLATFORMS,
  VALID_CONTRAST_DIMENSIONS,
  VALID_IMPACTS,
  DEFAULT_CONTRAST_DIMENSION,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  type AdCreativeSensoryContrastDesignerInput,
} from '@/lib/creative/ad-creative-sensory-contrast-designer';

// ── Credit cost ──

test('AD_CREATIVE_SENSORY_CONTRAST_DESIGNER_CREDIT_COST is 5', () => {
  assert.equal(AD_CREATIVE_SENSORY_CONTRAST_DESIGNER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_CONTRAST_DIMENSIONS contains the eight contrast dimensions', () => {
  assert.ok(VALID_CONTRAST_DIMENSIONS.includes('loud_quiet'));
  assert.ok(VALID_CONTRAST_DIMENSIONS.includes('bright_dark'));
  assert.ok(VALID_CONTRAST_DIMENSIONS.includes('fast_slow'));
  assert.ok(VALID_CONTRAST_DIMENSIONS.includes('warm_cold'));
  assert.ok(VALID_CONTRAST_DIMENSIONS.includes('sharp_soft'));
  assert.ok(VALID_CONTRAST_DIMENSIONS.includes('chaotic_calm'));
  assert.ok(VALID_CONTRAST_DIMENSIONS.includes('vibrant_muted'));
  assert.ok(VALID_CONTRAST_DIMENSIONS.includes('dense_sparse'));
  assert.equal(VALID_CONTRAST_DIMENSIONS.length, 8);
});

test('VALID_IMPACTS contains the three impact levels', () => {
  assert.ok(VALID_IMPACTS.includes('low'));
  assert.ok(VALID_IMPACTS.includes('medium'));
  assert.ok(VALID_IMPACTS.includes('high'));
  assert.equal(VALID_IMPACTS.length, 3);
});

test('DEFAULT_CONTRAST_DIMENSION is loud_quiet', () => {
  assert.equal(DEFAULT_CONTRAST_DIMENSION, 'loud_quiet');
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: AdCreativeSensoryContrastDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  contrastDimension: 'loud_quiet',
  platform: 'tiktok',
};

test('validateAdCreativeSensoryContrastDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeSensoryContrastDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeSensoryContrastDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeSensoryContrastDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeSensoryContrastDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeSensoryContrastDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeSensoryContrastDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeSensoryContrastDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeSensoryContrastDesignerInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeSensoryContrastDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeSensoryContrastDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeSensoryContrastDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeSensoryContrastDesignerInput rejects invalid contrastDimension', () => {
  const { valid, errors } = validateAdCreativeSensoryContrastDesignerInput({
    ...validInput,
    contrastDimension: 'hot_cold' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('contrast_dimension_invalid'));
});

test('validateAdCreativeSensoryContrastDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeSensoryContrastDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeSensoryContrastDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeSensoryContrastDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeSensoryContrastDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeSensoryContrastDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'Get fit in 30 days with our AI coach',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeSensoryContrastDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeSensoryContrastDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeSensoryContrastDesignerInput accepts empty contrastDimension string', () => {
  const { valid, errors } = validateAdCreativeSensoryContrastDesignerInput({
    ...validInput,
    contrastDimension: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeSensoryContrastDesignerInput accepts dryRun true', () => {
  const { valid, errors } = validateAdCreativeSensoryContrastDesignerInput({
    ...validInput,
    dryRun: true,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateSensoryContrast with dryRun: true so no real LLM
// calls are made — deterministic heuristic sensory contrast designs are
// returned.

test('dry-run returns a SensoryContrastDesignerResult with design', async () => {
  const result = await generateSensoryContrast({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.design);
  assert.ok(Array.isArray(result.design.contrasts));
  assert.ok(result.design.contrasts.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns impactScore in 0-100 range', async () => {
  const result = await generateSensoryContrast({ ...validInput, dryRun: true });
  assert.ok(result.design.impactScore >= 0 && result.design.impactScore <= 100);
});

test('dry-run returns contrasts with correct structure', async () => {
  const result = await generateSensoryContrast({ ...validInput, dryRun: true });
  for (const c of result.design.contrasts) {
    assert.ok(typeof c.dimension === 'string' && c.dimension.length > 0);
    assert.ok(typeof c.beforeState === 'string' && c.beforeState.length > 0);
    assert.ok(typeof c.afterState === 'string' && c.afterState.length > 0);
    assert.ok(typeof c.transition === 'string' && c.transition.length > 0);
    assert.ok(VALID_IMPACTS.includes(c.impact));
    assert.ok(typeof c.description === 'string' && c.description.length > 0);
  }
});

test('dry-run returns pairs with correct structure', async () => {
  const result = await generateSensoryContrast({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.design.pairs));
  assert.ok(result.design.pairs.length > 0);
  for (const p of result.design.pairs) {
    assert.ok(typeof p.left === 'string' && p.left.length > 0);
    assert.ok(typeof p.right === 'string' && p.right.length > 0);
    assert.ok(typeof p.dimension === 'string' && p.dimension.length > 0);
    assert.ok(typeof p.sensoryEffect === 'string' && p.sensoryEffect.length > 0);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateSensoryContrast({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.design.recommendations));
  assert.ok(result.design.recommendations.length > 0);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateSensoryContrast({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.design.contrasts.length > 0, `${platform} should produce contrasts`);
  }
});

test('dry-run works for all contrast dimensions', async () => {
  for (const dim of VALID_CONTRAST_DIMENSIONS) {
    const result = await generateSensoryContrast({
      ...validInput,
      contrastDimension: dim,
      dryRun: true,
    });
    assert.ok(result.design.contrasts.length > 0, `${dim} should produce contrasts`);
    assert.equal(result.design.contrasts[0].dimension, dim);
  }
});

test('dry-run defaults to loud_quiet when contrastDimension omitted', async () => {
  const result = await generateSensoryContrast({
    productOrBrand: validInput.productOrBrand,
    content: validInput.content,
    dryRun: true,
  });
  assert.ok(result.design.contrasts.length > 0);
  assert.equal(result.design.contrasts[0].dimension, 'loud_quiet');
});

test('dry-run is deterministic for the same input', async () => {
  const r1 = await generateSensoryContrast({ ...validInput, dryRun: true });
  const r2 = await generateSensoryContrast({ ...validInput, dryRun: true });
  assert.equal(r1.design.impactScore, r2.design.impactScore);
  assert.equal(r1.design.contrasts.length, r2.design.contrasts.length);
  assert.deepEqual(
    r1.design.contrasts.map((c) => c.dimension),
    r2.design.contrasts.map((c) => c.dimension),
  );
});

test('dry-run contrasts use the requested dimension', async () => {
  const result = await generateSensoryContrast({
    ...validInput,
    contrastDimension: 'bright_dark',
    dryRun: true,
  });
  for (const c of result.design.contrasts) {
    assert.equal(c.dimension, 'bright_dark');
  }
});

test('dry-run produces at least one high-impact contrast', async () => {
  const result = await generateSensoryContrast({ ...validInput, dryRun: true });
  const hasHigh = result.design.contrasts.some((c) => c.impact === 'high');
  assert.ok(hasHigh, 'should produce at least one high-impact contrast');
});

test('generateSensoryContrast rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateSensoryContrast({ ...validInput, content: '' } as AdCreativeSensoryContrastDesignerInput),
    /invalid_ad_creative_sensory_contrast_designer_input/,
  );
});

test('generateSensoryContrast rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generateSensoryContrast({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeSensoryContrastDesignerInput),
    /invalid_ad_creative_sensory_contrast_designer_input/,
  );
});

test('generateSensoryContrast rejects missing input (null)', async () => {
  await assert.rejects(
    () => generateSensoryContrast(null as never),
    /invalid_ad_creative_sensory_contrast_designer_input/,
  );
});

test('generateSensoryContrast rejects invalid contrastDimension in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generateSensoryContrast({
        ...validInput,
        contrastDimension: 'hot_cold',
        dryRun: true,
      } as AdCreativeSensoryContrastDesignerInput),
    /invalid_ad_creative_sensory_contrast_designer_input/,
  );
});

test('dry-run pairs reference valid contrast dimensions', async () => {
  const result = await generateSensoryContrast({ ...validInput, dryRun: true });
  for (const p of result.design.pairs) {
    assert.ok(
      VALID_CONTRAST_DIMENSIONS.includes(p.dimension),
      `pair dimension ${p.dimension} should be valid`,
    );
  }
});

test('dry-run impact score increases with longer content', async () => {
  const shortResult = await generateSensoryContrast({
    ...validInput,
    content: 'short ad',
    dryRun: true,
  });
  const longResult = await generateSensoryContrast({
    ...validInput,
    content: 'x'.repeat(800),
    dryRun: true,
  });
  assert.ok(
    longResult.design.impactScore >= shortResult.design.impactScore,
    'longer content should not produce a lower impact score',
  );
});
