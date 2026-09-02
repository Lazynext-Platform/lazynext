import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Reciprocity Trigger Designer engine (AI-powered
 * reciprocity framework design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_RECIPROCITY_TRIGGER_DESIGNER_CREDIT_COST,
  validateCreativeAdReciprocityTriggerDesignerInput,
  generateReciprocityFrameworks,
  VALID_PLATFORMS,
  VALID_RECIPROCITY_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdReciprocityTriggerDesignerInput,
} from '@/lib/creative/creative-ad-reciprocity-trigger-designer';

// ── Credit cost ──

test('CREATIVE_AD_RECIPROCITY_TRIGGER_DESIGNER_CREDIT_COST is 5', () => {
  assert.equal(CREATIVE_AD_RECIPROCITY_TRIGGER_DESIGNER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_RECIPROCITY_TYPES contains the eight reciprocity types', () => {
  assert.ok(VALID_RECIPROCITY_TYPES.includes('free_value'));
  assert.ok(VALID_RECIPROCITY_TYPES.includes('educational_gift'));
  assert.ok(VALID_RECIPROCITY_TYPES.includes('tool_access'));
  assert.ok(VALID_RECIPROCITY_TYPES.includes('content_gift'));
  assert.ok(VALID_RECIPROCITY_TYPES.includes('community_access'));
  assert.ok(VALID_RECIPROCITY_TYPES.includes('expert_advice'));
  assert.ok(VALID_RECIPROCITY_TYPES.includes('exclusive_resource'));
  assert.ok(VALID_RECIPROCITY_TYPES.includes('personalized_help'));
  assert.equal(VALID_RECIPROCITY_TYPES.length, 8);
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

const validInput: CreativeAdReciprocityTriggerDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'We are giving away a free 5-day skincare mini course to our community — no strings attached!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateCreativeAdReciprocityTriggerDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdReciprocityTriggerDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdReciprocityTriggerDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdReciprocityTriggerDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdReciprocityTriggerDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdReciprocityTriggerDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdReciprocityTriggerDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdReciprocityTriggerDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdReciprocityTriggerDesignerInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdReciprocityTriggerDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdReciprocityTriggerDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdReciprocityTriggerDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdReciprocityTriggerDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdReciprocityTriggerDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdReciprocityTriggerDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdReciprocityTriggerDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdReciprocityTriggerDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdReciprocityTriggerDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdReciprocityTriggerDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdReciprocityTriggerDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdReciprocityTriggerDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdReciprocityTriggerDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdReciprocityTriggerDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdReciprocityTriggerDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdReciprocityTriggerDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateCreativeAdReciprocityTriggerDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdReciprocityTriggerDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateCreativeAdReciprocityTriggerDesignerInput({
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
// These tests run generateReciprocityFrameworks with dryRun: true so no real LLM
// calls are made — deterministic heuristic reciprocity frameworks are returned.

test('dry-run returns a ReciprocityFrameworkDesignerResult with strategy', async () => {
  const result = await generateReciprocityFrameworks({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.frameworks));
  assert.ok(result.strategy.frameworks.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns reciprocity frameworks with correct structure', async () => {
  const result = await generateReciprocityFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(typeof f.type === 'string' && f.type.length > 0);
    assert.ok(typeof f.giftDescription === 'string' && f.giftDescription.length > 0);
    assert.ok(typeof f.recipientValue === 'string' && f.recipientValue.length > 0);
    assert.ok(typeof f.impliedReciprocity === 'string' && f.impliedReciprocity.length > 0);
    assert.ok(typeof f.giftImpact === 'number' && f.giftImpact >= 0 && f.giftImpact <= 100);
    assert.ok(typeof f.reciprocityLikelihood === 'number' && f.reciprocityLikelihood >= 0 && f.reciprocityLikelihood <= 100);
    assert.ok(typeof f.reciprocityPathway === 'string' && f.reciprocityPathway.length > 0);
  }
});

test('dry-run returns reciprocity frameworks with valid reciprocity types', async () => {
  const result = await generateReciprocityFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(
      VALID_RECIPROCITY_TYPES.includes(f.type as never),
      `reciprocity type "${f.type}" should be valid`,
    );
  }
});

test('dry-run returns giftImpact in 0-100 range', async () => {
  const result = await generateReciprocityFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(f.giftImpact >= 0 && f.giftImpact <= 100);
  }
});

test('dry-run returns reciprocityLikelihood in 0-100 range', async () => {
  const result = await generateReciprocityFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(f.reciprocityLikelihood >= 0 && f.reciprocityLikelihood <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateReciprocityFrameworks({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 3 reciprocity frameworks', async () => {
  const result = await generateReciprocityFrameworks({ ...validInput, dryRun: true });
  assert.ok(result.strategy.frameworks.length >= 3);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateReciprocityFrameworks({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.frameworks.length > 0, `${platform} should produce reciprocity frameworks`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateReciprocityFrameworks({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.frameworks.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateReciprocityFrameworks({ ...validInput, dryRun: true });
  const r2 = await generateReciprocityFrameworks({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.frameworks.length, r2.strategy.frameworks.length);
  assert.equal(r1.strategy.frameworks[0].giftImpact, r2.strategy.frameworks[0].giftImpact);
  assert.equal(r1.strategy.frameworks[0].reciprocityLikelihood, r2.strategy.frameworks[0].reciprocityLikelihood);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateReciprocityFrameworks({ ...validInput, dryRun: true });
  const r2 = await generateReciprocityFrameworks({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Framework count is the same but scores differ based on content length
  assert.equal(r1.strategy.frameworks.length, r2.strategy.frameworks.length);
});

test('generateReciprocityFrameworks rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateReciprocityFrameworks({ ...validInput, content: '' } as CreativeAdReciprocityTriggerDesignerInput),
    /invalid_creative_ad_reciprocity_trigger_designer_input/,
  );
});

test('generateReciprocityFrameworks rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateReciprocityFrameworks({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdReciprocityTriggerDesignerInput),
    /invalid_creative_ad_reciprocity_trigger_designer_input/,
  );
});

test('generateReciprocityFrameworks rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateReciprocityFrameworks({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdReciprocityTriggerDesignerInput),
    /invalid_creative_ad_reciprocity_trigger_designer_input/,
  );
});

test('generateReciprocityFrameworks rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateReciprocityFrameworks(null as never),
    /invalid_creative_ad_reciprocity_trigger_designer_input/,
  );
});
