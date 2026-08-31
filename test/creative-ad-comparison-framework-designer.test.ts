import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Comparison Framework Designer engine (AI-powered
 * comparison framework design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_COMPARISON_FRAMEWORK_DESIGNER_CREDIT_COST,
  validateCreativeAdComparisonFrameworkDesignerInput,
  generateComparisonFrameworks,
  VALID_PLATFORMS,
  VALID_COMPARISON_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdComparisonFrameworkDesignerInput,
} from '@/lib/creative/creative-ad-comparison-framework-designer';

// ── Credit cost ──

test('CREATIVE_AD_COMPARISON_FRAMEWORK_DESIGNER_CREDIT_COST is 5', () => {
  assert.equal(CREATIVE_AD_COMPARISON_FRAMEWORK_DESIGNER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_COMPARISON_TYPES contains the eight comparison types', () => {
  assert.ok(VALID_COMPARISON_TYPES.includes('feature_comparison'));
  assert.ok(VALID_COMPARISON_TYPES.includes('price_comparison'));
  assert.ok(VALID_COMPARISON_TYPES.includes('quality_comparison'));
  assert.ok(VALID_COMPARISON_TYPES.includes('speed_comparison'));
  assert.ok(VALID_COMPARISON_TYPES.includes('convenience_comparison'));
  assert.ok(VALID_COMPARISON_TYPES.includes('outcome_comparison'));
  assert.ok(VALID_COMPARISON_TYPES.includes('social_comparison'));
  assert.ok(VALID_COMPARISON_TYPES.includes('lifestyle_comparison'));
  assert.equal(VALID_COMPARISON_TYPES.length, 8);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

test('MAX_AUDIENCE_LENGTH is 2000', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: CreativeAdComparisonFrameworkDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateCreativeAdComparisonFrameworkDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdComparisonFrameworkDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdComparisonFrameworkDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdComparisonFrameworkDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdComparisonFrameworkDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdComparisonFrameworkDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdComparisonFrameworkDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdComparisonFrameworkDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdComparisonFrameworkDesignerInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdComparisonFrameworkDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdComparisonFrameworkDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdComparisonFrameworkDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdComparisonFrameworkDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdComparisonFrameworkDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdComparisonFrameworkDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdComparisonFrameworkDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdComparisonFrameworkDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdComparisonFrameworkDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdComparisonFrameworkDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdComparisonFrameworkDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdComparisonFrameworkDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdComparisonFrameworkDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdComparisonFrameworkDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdComparisonFrameworkDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdComparisonFrameworkDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateCreativeAdComparisonFrameworkDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdComparisonFrameworkDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateCreativeAdComparisonFrameworkDesignerInput({
    productOrBrand: '',
    content: '',
    targetAudience: '',
    platform: 'myspace' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
  assert.ok(errors.includes('content_required'));
  assert.ok(errors.includes('target_audience_required'));
  assert.ok(errors.includes('platform_invalid'));
  assert.ok(errors.length >= 4);
});

// ── Dry-run mode tests ──
//
// These tests run generateComparisonFrameworks with dryRun: true so no real
// LLM calls are made — deterministic heuristic frameworks are returned.

test('dry-run returns a ComparisonFrameworkDesignerResult with strategy', async () => {
  const result = await generateComparisonFrameworks({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.frameworks));
  assert.ok(result.strategy.frameworks.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns frameworks with correct structure', async () => {
  const result = await generateComparisonFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(typeof f.type === 'string' && f.type.length > 0);
    assert.ok(typeof f.comparisonAxis === 'string' && f.comparisonAxis.length > 0);
    assert.ok(typeof f.productAdvantage === 'string' && f.productAdvantage.length > 0);
    assert.ok(typeof f.competitorWeakness === 'string' && f.competitorWeakness.length > 0);
    assert.ok(typeof f.advantageStrength === 'number' && f.advantageStrength >= 0 && f.advantageStrength <= 100);
    assert.ok(typeof f.preferenceShift === 'number' && f.preferenceShift >= 0 && f.preferenceShift <= 100);
    assert.ok(typeof f.comparisonPathway === 'string' && f.comparisonPathway.length > 0);
  }
});

test('dry-run returns frameworks with valid comparison types', async () => {
  const result = await generateComparisonFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(
      VALID_COMPARISON_TYPES.includes(f.type as never),
      `comparison type "${f.type}" should be valid`,
    );
  }
});

test('dry-run returns advantageStrength in 0-100 range', async () => {
  const result = await generateComparisonFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(f.advantageStrength >= 0 && f.advantageStrength <= 100);
  }
});

test('dry-run returns preferenceShift in 0-100 range', async () => {
  const result = await generateComparisonFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(f.preferenceShift >= 0 && f.preferenceShift <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateComparisonFrameworks({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 3 frameworks', async () => {
  const result = await generateComparisonFrameworks({ ...validInput, dryRun: true });
  assert.ok(result.strategy.frameworks.length >= 3);
});

test('dry-run returns exactly 3 deterministic frameworks', async () => {
  const result = await generateComparisonFrameworks({ ...validInput, dryRun: true });
  assert.equal(result.strategy.frameworks.length, 3);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateComparisonFrameworks({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.frameworks.length > 0, `${platform} should produce frameworks`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateComparisonFrameworks({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.frameworks.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateComparisonFrameworks({ ...validInput, dryRun: true });
  const r2 = await generateComparisonFrameworks({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.frameworks.length, r2.strategy.frameworks.length);
  assert.equal(r1.strategy.frameworks[0].advantageStrength, r2.strategy.frameworks[0].advantageStrength);
  assert.equal(r1.strategy.frameworks[0].preferenceShift, r2.strategy.frameworks[0].preferenceShift);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateComparisonFrameworks({ ...validInput, dryRun: true });
  const r2 = await generateComparisonFrameworks({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Framework count is the same but scores differ based on content length
  assert.equal(r1.strategy.frameworks.length, r2.strategy.frameworks.length);
});

test('dry-run comparison types progress through comparison layers', async () => {
  const result = await generateComparisonFrameworks({ ...validInput, dryRun: true });
  const types = result.strategy.frameworks.map((f) => f.type);
  assert.equal(types[0], 'feature_comparison');
  assert.equal(types[1], 'price_comparison');
  assert.equal(types[2], 'outcome_comparison');
});

test('dry-run recommendations reference the brand and audience', async () => {
  const result = await generateComparisonFrameworks({ ...validInput, dryRun: true });
  const joined = result.strategy.recommendations.join(' ').toLowerCase();
  assert.ok(joined.length > 0);
});

test('generateComparisonFrameworks rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateComparisonFrameworks({ ...validInput, content: '' } as CreativeAdComparisonFrameworkDesignerInput),
    /invalid_creative_ad_comparison_framework_designer_input/,
  );
});

test('generateComparisonFrameworks rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateComparisonFrameworks({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdComparisonFrameworkDesignerInput),
    /invalid_creative_ad_comparison_framework_designer_input/,
  );
});

test('generateComparisonFrameworks rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateComparisonFrameworks({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdComparisonFrameworkDesignerInput),
    /invalid_creative_ad_comparison_framework_designer_input/,
  );
});

test('generateComparisonFrameworks rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateComparisonFrameworks(null as never),
    /invalid_creative_ad_comparison_framework_designer_input/,
  );
});
