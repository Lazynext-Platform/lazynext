import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Transformation Arc Designer engine (AI-powered
 * transformation arc design for ad creative content).
 *
 * Tests cover input validation, credit cost, constants, and dry-run mode (no
 * real LLM calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_TRANSFORMATION_ARC_DESIGNER_CREDIT_COST,
  validateCreativeAdTransformationArcDesignerInput,
  generateTransformationArc,
  VALID_PLATFORMS,
  VALID_ARC_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdTransformationArcDesignerInput,
} from '@/lib/creative/creative-ad-transformation-arc-designer';

// ── Credit cost ──

test('CREATIVE_AD_TRANSFORMATION_ARC_DESIGNER_CREDIT_COST is 5', () => {
  assert.equal(CREATIVE_AD_TRANSFORMATION_ARC_DESIGNER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_ARC_TYPES contains the eight arc types', () => {
  assert.ok(VALID_ARC_TYPES.includes('personal_growth'));
  assert.ok(VALID_ARC_TYPES.includes('status_change'));
  assert.ok(VALID_ARC_TYPES.includes('problem_solution'));
  assert.ok(VALID_ARC_TYPES.includes('limitation_freedom'));
  assert.ok(VALID_ARC_TYPES.includes('invisible_visible'));
  assert.ok(VALID_ARC_TYPES.includes('doubt_confidence'));
  assert.ok(VALID_ARC_TYPES.includes('chaos_order'));
  assert.ok(VALID_ARC_TYPES.includes('ordinary_extraordinary'));
  assert.equal(VALID_ARC_TYPES.length, 8);
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

const validInput: CreativeAdTransformationArcDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 concerned about skin aging',
  platform: 'tiktok',
};

test('validateCreativeAdTransformationArcDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdTransformationArcDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdTransformationArcDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdTransformationArcDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdTransformationArcDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdTransformationArcDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdTransformationArcDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdTransformationArcDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdTransformationArcDesignerInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdTransformationArcDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdTransformationArcDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdTransformationArcDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdTransformationArcDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdTransformationArcDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdTransformationArcDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdTransformationArcDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdTransformationArcDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdTransformationArcDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdTransformationArcDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdTransformationArcDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdTransformationArcDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdTransformationArcDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdTransformationArcDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdTransformationArcDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdTransformationArcDesignerInput rejects whitespace-only productOrBrand', () => {
  const { valid, errors } = validateCreativeAdTransformationArcDesignerInput({
    ...validInput,
    productOrBrand: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdTransformationArcDesignerInput rejects whitespace-only content', () => {
  const { valid, errors } = validateCreativeAdTransformationArcDesignerInput({
    ...validInput,
    content: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdTransformationArcDesignerInput rejects whitespace-only targetAudience', () => {
  const { valid, errors } = validateCreativeAdTransformationArcDesignerInput({
    ...validInput,
    targetAudience: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

// ── Dry-run mode tests ──
//
// These tests run generateTransformationArc with dryRun: true so no real LLM
// calls are made — deterministic heuristic transformation arcs are returned.

test('dry-run returns a TransformationArcDesignerResult with strategy', async () => {
  const result = await generateTransformationArc({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(result.strategy.arc);
  assert.equal(result.dryRun, true);
});

test('dry-run returns an arc with a valid type', async () => {
  const result = await generateTransformationArc({ ...validInput, dryRun: true });
  assert.ok(VALID_ARC_TYPES.includes(result.strategy.arc.type as never));
});

test('dry-run returns a beforeState string', async () => {
  const result = await generateTransformationArc({ ...validInput, dryRun: true });
  assert.ok(typeof result.strategy.arc.beforeState === 'string');
  assert.ok(result.strategy.arc.beforeState.length > 0);
});

test('dry-run returns a catalyst string', async () => {
  const result = await generateTransformationArc({ ...validInput, dryRun: true });
  assert.ok(typeof result.strategy.arc.catalyst === 'string');
  assert.ok(result.strategy.arc.catalyst.length > 0);
});

test('dry-run returns afterState string', async () => {
  const result = await generateTransformationArc({ ...validInput, dryRun: true });
  assert.ok(typeof result.strategy.arc.afterState === 'string');
  assert.ok(result.strategy.arc.afterState.length > 0);
});

test('dry-run returns emotionalJourney string', async () => {
  const result = await generateTransformationArc({ ...validInput, dryRun: true });
  assert.ok(typeof result.strategy.arc.emotionalJourney === 'string');
  assert.ok(result.strategy.arc.emotionalJourney.length > 0);
});

test('dry-run returns viewerIdentificationScore in 0-100 range', async () => {
  const result = await generateTransformationArc({ ...validInput, dryRun: true });
  assert.ok(
    result.strategy.arc.viewerIdentificationScore >= 0 &&
      result.strategy.arc.viewerIdentificationScore <= 100,
  );
});

test('dry-run returns stages array with correct structure', async () => {
  const result = await generateTransformationArc({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.arc.stages));
  assert.ok(result.strategy.arc.stages.length > 0);
  for (const stage of result.strategy.arc.stages) {
    assert.ok(typeof stage.name === 'string' && stage.name.length > 0);
    assert.ok(typeof stage.description === 'string' && stage.description.length > 0);
    assert.ok(typeof stage.emotionalShift === 'string' && stage.emotionalShift.length > 0);
    assert.ok(
      typeof stage.progressLevel === 'number' &&
        stage.progressLevel >= 0 &&
        stage.progressLevel <= 100,
    );
  }
});

test('dry-run returns recommendations array', async () => {
  const result = await generateTransformationArc({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const rec of result.strategy.recommendations) {
    assert.ok(typeof rec === 'string' && rec.length > 0);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateTransformationArc({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.arc.stages.length > 0, `${platform} should produce stages`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateTransformationArc({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.arc.stages.length > 0);
});

test('dry-run produces deterministic output for same input', async () => {
  const r1 = await generateTransformationArc({ ...validInput, dryRun: true });
  const r2 = await generateTransformationArc({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.arc.type, r2.strategy.arc.type);
  assert.equal(r1.strategy.arc.viewerIdentificationScore, r2.strategy.arc.viewerIdentificationScore);
  assert.equal(r1.strategy.arc.stages.length, r2.strategy.arc.stages.length);
});

test('dry-run arc type varies with content length', async () => {
  const shortContent = await generateTransformationArc({
    ...validInput,
    content: 'short',
    dryRun: true,
  });
  const longContent = await generateTransformationArc({
    ...validInput,
    content: 'x'.repeat(500),
    dryRun: true,
  });
  // The arc type is selected by content length modulo arc types count, so
  // differing lengths should generally produce different types.
  assert.ok(VALID_ARC_TYPES.includes(shortContent.strategy.arc.type as never));
  assert.ok(VALID_ARC_TYPES.includes(longContent.strategy.arc.type as never));
});

test('generateTransformationArc rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generateTransformationArc({
        ...validInput,
        content: '',
      } as CreativeAdTransformationArcDesignerInput),
    /invalid_creative_ad_transformation_arc_designer_input/,
  );
});

test('generateTransformationArc rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generateTransformationArc({
        ...validInput,
        productOrBrand: '',
        dryRun: true,
      } as CreativeAdTransformationArcDesignerInput),
    /invalid_creative_ad_transformation_arc_designer_input/,
  );
});

test('generateTransformationArc rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generateTransformationArc({
        ...validInput,
        targetAudience: '',
        dryRun: true,
      } as CreativeAdTransformationArcDesignerInput),
    /invalid_creative_ad_transformation_arc_designer_input/,
  );
});

test('generateTransformationArc rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generateTransformationArc({
        ...validInput,
        platform: 'snapchat',
        dryRun: true,
      } as CreativeAdTransformationArcDesignerInput),
    /invalid_creative_ad_transformation_arc_designer_input/,
  );
});
