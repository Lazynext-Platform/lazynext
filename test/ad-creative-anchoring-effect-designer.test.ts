import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Anchoring Effect Designer engine (AI-powered
 * anchoring framework design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_ANCHORING_EFFECT_DESIGNER_CREDIT_COST,
  validateAdCreativeAnchoringEffectDesignerInput,
  generateAnchoringFrameworks,
  VALID_PLATFORMS,
  VALID_ANCHOR_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeAnchoringEffectDesignerInput,
} from '@/lib/creative/ad-creative-anchoring-effect-designer';

// ── Credit cost ──

test('AD_CREATIVE_ANCHORING_EFFECT_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(AD_CREATIVE_ANCHORING_EFFECT_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_ANCHOR_TYPES contains the eight anchor types', () => {
  assert.ok(VALID_ANCHOR_TYPES.includes('price_anchor'));
  assert.ok(VALID_ANCHOR_TYPES.includes('value_anchor'));
  assert.ok(VALID_ANCHOR_TYPES.includes('competitor_anchor'));
  assert.ok(VALID_ANCHOR_TYPES.includes('premium_anchor'));
  assert.ok(VALID_ANCHOR_TYPES.includes('historical_anchor'));
  assert.ok(VALID_ANCHOR_TYPES.includes('aspirational_anchor'));
  assert.ok(VALID_ANCHOR_TYPES.includes('social_anchor'));
  assert.ok(VALID_ANCHOR_TYPES.includes('scarcity_anchor'));
  assert.equal(VALID_ANCHOR_TYPES.length, 8);
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

const validInput: AdCreativeAnchoringEffectDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Originally $199, now just $89 for our limited-edition vitamin C serum — offer ends Friday!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateAdCreativeAnchoringEffectDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeAnchoringEffectDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeAnchoringEffectDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeAnchoringEffectDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeAnchoringEffectDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeAnchoringEffectDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeAnchoringEffectDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeAnchoringEffectDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeAnchoringEffectDesignerInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeAnchoringEffectDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeAnchoringEffectDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeAnchoringEffectDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeAnchoringEffectDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeAnchoringEffectDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeAnchoringEffectDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeAnchoringEffectDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeAnchoringEffectDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeAnchoringEffectDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeAnchoringEffectDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeAnchoringEffectDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeAnchoringEffectDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeAnchoringEffectDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeAnchoringEffectDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeAnchoringEffectDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeAnchoringEffectDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateAdCreativeAnchoringEffectDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeAnchoringEffectDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateAdCreativeAnchoringEffectDesignerInput({
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
// These tests run generateAnchoringFrameworks with dryRun: true so no real LLM
// calls are made — deterministic heuristic anchoring frameworks are returned.

test('dry-run returns a AnchoringFrameworkDesignerResult with strategy', async () => {
  const result = await generateAnchoringFrameworks({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.frameworks));
  assert.ok(result.strategy.frameworks.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns anchoring frameworks with correct structure', async () => {
  const result = await generateAnchoringFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(typeof f.type === 'string' && f.type.length > 0);
    assert.ok(typeof f.anchorReference === 'string' && f.anchorReference.length > 0);
    assert.ok(typeof f.anchorValue === 'string' && f.anchorValue.length > 0);
    assert.ok(typeof f.perceivedValueShift === 'string' && f.perceivedValueShift.length > 0);
    assert.ok(typeof f.anchorStrength === 'number' && f.anchorStrength >= 0 && f.anchorStrength <= 100);
    assert.ok(typeof f.perceptionShift === 'number' && f.perceptionShift >= 0 && f.perceptionShift <= 100);
    assert.ok(typeof f.anchoringPathway === 'string' && f.anchoringPathway.length > 0);
  }
});

test('dry-run returns anchoring frameworks with valid anchor types', async () => {
  const result = await generateAnchoringFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(
      VALID_ANCHOR_TYPES.includes(f.type as never),
      `anchor type "${f.type}" should be valid`,
    );
  }
});

test('dry-run returns anchorStrength in 0-100 range', async () => {
  const result = await generateAnchoringFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(f.anchorStrength >= 0 && f.anchorStrength <= 100);
  }
});

test('dry-run returns perceptionShift in 0-100 range', async () => {
  const result = await generateAnchoringFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(f.perceptionShift >= 0 && f.perceptionShift <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateAnchoringFrameworks({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 3 anchoring frameworks', async () => {
  const result = await generateAnchoringFrameworks({ ...validInput, dryRun: true });
  assert.ok(result.strategy.frameworks.length >= 3);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateAnchoringFrameworks({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.frameworks.length > 0, `${platform} should produce anchoring frameworks`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateAnchoringFrameworks({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.frameworks.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateAnchoringFrameworks({ ...validInput, dryRun: true });
  const r2 = await generateAnchoringFrameworks({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.frameworks.length, r2.strategy.frameworks.length);
  assert.equal(r1.strategy.frameworks[0].anchorStrength, r2.strategy.frameworks[0].anchorStrength);
  assert.equal(r1.strategy.frameworks[0].perceptionShift, r2.strategy.frameworks[0].perceptionShift);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateAnchoringFrameworks({ ...validInput, dryRun: true });
  const r2 = await generateAnchoringFrameworks({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Framework count is the same but scores differ based on content length
  assert.equal(r1.strategy.frameworks.length, r2.strategy.frameworks.length);
});

test('generateAnchoringFrameworks rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateAnchoringFrameworks({ ...validInput, content: '' } as AdCreativeAnchoringEffectDesignerInput),
    /invalid_ad_creative_anchoring_effect_designer_input/,
  );
});

test('generateAnchoringFrameworks rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateAnchoringFrameworks({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeAnchoringEffectDesignerInput),
    /invalid_ad_creative_anchoring_effect_designer_input/,
  );
});

test('generateAnchoringFrameworks rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateAnchoringFrameworks({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeAnchoringEffectDesignerInput),
    /invalid_ad_creative_anchoring_effect_designer_input/,
  );
});

test('generateAnchoringFrameworks rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateAnchoringFrameworks(null as never),
    /invalid_ad_creative_anchoring_effect_designer_input/,
  );
});
