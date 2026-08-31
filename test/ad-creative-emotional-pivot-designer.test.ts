import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Emotional Pivot Designer engine (AI-powered
 * emotional pivot point design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_EMOTIONAL_PIVOT_DESIGNER_CREDIT_COST,
  validateAdCreativeEmotionalPivotDesignerInput,
  generateEmotionalPivots,
  VALID_PLATFORMS,
  VALID_PIVOT_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeEmotionalPivotDesignerInput,
} from '@/lib/creative/ad-creative-emotional-pivot-designer';

// ── Credit cost ──

test('AD_CREATIVE_EMOTIONAL_PIVOT_DESIGNER_CREDIT_COST is 3', () => {
  assert.equal(AD_CREATIVE_EMOTIONAL_PIVOT_DESIGNER_CREDIT_COST, 3);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_PIVOT_TYPES contains the eight pivot types', () => {
  assert.ok(VALID_PIVOT_TYPES.includes('joy_to_sadness'));
  assert.ok(VALID_PIVOT_TYPES.includes('tension_to_relief'));
  assert.ok(VALID_PIVOT_TYPES.includes('fear_to_hope'));
  assert.ok(VALID_PIVOT_TYPES.includes('serious_to_playful'));
  assert.ok(VALID_PIVOT_TYPES.includes('calm_to_excitement'));
  assert.ok(VALID_PIVOT_TYPES.includes('nostalgia_to_aspiration'));
  assert.ok(VALID_PIVOT_TYPES.includes('frustration_to_satisfaction'));
  assert.ok(VALID_PIVOT_TYPES.includes('curiosity_to_revelation'));
  assert.equal(VALID_PIVOT_TYPES.length, 8);
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

const validInput: AdCreativeEmotionalPivotDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateAdCreativeEmotionalPivotDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeEmotionalPivotDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeEmotionalPivotDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeEmotionalPivotDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeEmotionalPivotDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeEmotionalPivotDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeEmotionalPivotDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeEmotionalPivotDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeEmotionalPivotDesignerInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeEmotionalPivotDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeEmotionalPivotDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeEmotionalPivotDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeEmotionalPivotDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeEmotionalPivotDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeEmotionalPivotDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeEmotionalPivotDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeEmotionalPivotDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeEmotionalPivotDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeEmotionalPivotDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeEmotionalPivotDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeEmotionalPivotDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeEmotionalPivotDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-45',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeEmotionalPivotDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeEmotionalPivotDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeEmotionalPivotDesignerInput accepts undefined platform', () => {
  const { valid, errors } = validateAdCreativeEmotionalPivotDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-45',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateEmotionalPivots with dryRun: true so no real LLM
// calls are made — deterministic heuristic emotional pivot design is returned.

test('dry-run returns an EmotionalPivotDesignerResult with strategy', async () => {
  const result = await generateEmotionalPivots({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.pivots));
  assert.ok(result.strategy.pivots.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns pivots with correct structure', async () => {
  const result = await generateEmotionalPivots({ ...validInput, dryRun: true });
  for (const p of result.strategy.pivots) {
    assert.ok(typeof p.type === 'string' && p.type.length > 0);
    assert.ok(typeof p.beforeEmotion === 'string' && p.beforeEmotion.length > 0);
    assert.ok(typeof p.afterEmotion === 'string' && p.afterEmotion.length > 0);
    assert.ok(typeof p.transitionMethod === 'string' && p.transitionMethod.length > 0);
    assert.ok(typeof p.impactScore === 'number' && p.impactScore >= 0 && p.impactScore <= 100);
    assert.ok(typeof p.timing === 'string' && p.timing.length > 0);
    assert.ok(typeof p.viewerEffect === 'string' && p.viewerEffect.length > 0);
  }
});

test('dry-run returns impactScore in 0-100 range', async () => {
  const result = await generateEmotionalPivots({ ...validInput, dryRun: true });
  for (const p of result.strategy.pivots) {
    assert.ok(p.impactScore >= 0 && p.impactScore <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateEmotionalPivots({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateEmotionalPivots({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.pivots.length > 0, `${platform} should produce pivots`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateEmotionalPivots({
    productOrBrand: validInput.productOrBrand,
    content: validInput.content,
    targetAudience: validInput.targetAudience,
    dryRun: true,
  });
  assert.ok(result.strategy.pivots.length > 0);
});

test('dry-run produces deterministic output for the same input', async () => {
  const a = await generateEmotionalPivots({ ...validInput, dryRun: true });
  const b = await generateEmotionalPivots({ ...validInput, dryRun: true });
  assert.equal(a.strategy.pivots.length, b.strategy.pivots.length);
  assert.equal(a.strategy.pivots[0].impactScore, b.strategy.pivots[0].impactScore);
});

test('dry-run returns at least one pivot', async () => {
  const result = await generateEmotionalPivots({ ...validInput, dryRun: true });
  assert.ok(result.strategy.pivots.length >= 1);
});

test('dry-run pivot types are valid pivot types', async () => {
  const result = await generateEmotionalPivots({ ...validInput, dryRun: true });
  for (const p of result.strategy.pivots) {
    assert.ok(
      VALID_PIVOT_TYPES.includes(p.type as never),
      `${p.type} should be a valid pivot type`,
    );
  }
});

test('dry-run beforeEmotion differs from afterEmotion', async () => {
  const result = await generateEmotionalPivots({ ...validInput, dryRun: true });
  for (const p of result.strategy.pivots) {
    assert.notEqual(p.beforeEmotion, p.afterEmotion);
  }
});

test('generateEmotionalPivots rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generateEmotionalPivots({
        ...validInput,
        content: '',
      } as AdCreativeEmotionalPivotDesignerInput),
    /invalid_ad_creative_emotional_pivot_designer_input/,
  );
});

test('generateEmotionalPivots rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generateEmotionalPivots({
        ...validInput,
        productOrBrand: '',
        dryRun: true,
      } as AdCreativeEmotionalPivotDesignerInput),
    /invalid_ad_creative_emotional_pivot_designer_input/,
  );
});

test('generateEmotionalPivots rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generateEmotionalPivots({
        ...validInput,
        targetAudience: '',
        dryRun: true,
      } as AdCreativeEmotionalPivotDesignerInput),
    /invalid_ad_creative_emotional_pivot_designer_input/,
  );
});

test('generateEmotionalPivots rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generateEmotionalPivots({
        ...validInput,
        platform: 'snapchat' as never,
        dryRun: true,
      } as AdCreativeEmotionalPivotDesignerInput),
    /invalid_ad_creative_emotional_pivot_designer_input/,
  );
});

test('dry-run returns at least one recommendation', async () => {
  const result = await generateEmotionalPivots({ ...validInput, dryRun: true });
  assert.ok(result.strategy.recommendations.length >= 1);
});

test('dry-run pivots have non-empty transition methods', async () => {
  const result = await generateEmotionalPivots({ ...validInput, dryRun: true });
  for (const p of result.strategy.pivots) {
    assert.ok(p.transitionMethod.length > 0);
  }
});

test('dry-run pivots have non-empty viewer effects', async () => {
  const result = await generateEmotionalPivots({ ...validInput, dryRun: true });
  for (const p of result.strategy.pivots) {
    assert.ok(p.viewerEffect.length > 0);
  }
});

test('dry-run pivots have non-empty timing', async () => {
  const result = await generateEmotionalPivots({ ...validInput, dryRun: true });
  for (const p of result.strategy.pivots) {
    assert.ok(p.timing.length > 0);
  }
});
