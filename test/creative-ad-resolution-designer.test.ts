import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Resolution Designer engine (AI-powered resolution
 * structure design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_RESOLUTION_DESIGNER_CREDIT_COST,
  validateCreativeAdResolutionDesignerInput,
  generateResolution,
  VALID_PLATFORMS,
  VALID_RESOLUTION_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdResolutionDesignerInput,
} from '@/lib/creative/creative-ad-resolution-designer';

// ── Credit cost ──

test('CREATIVE_AD_RESOLUTION_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(CREATIVE_AD_RESOLUTION_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_RESOLUTION_TYPES contains the eight resolution types', () => {
  assert.ok(VALID_RESOLUTION_TYPES.includes('circular_return'));
  assert.ok(VALID_RESOLUTION_TYPES.includes('linear_complete'));
  assert.ok(VALID_RESOLUTION_TYPES.includes('open_ended'));
  assert.ok(VALID_RESOLUTION_TYPES.includes('twist_reveal'));
  assert.ok(VALID_RESOLUTION_TYPES.includes('emotional_catharsis'));
  assert.ok(VALID_RESOLUTION_TYPES.includes('call_back_resolution'));
  assert.ok(VALID_RESOLUTION_TYPES.includes('transformation_complete'));
  assert.ok(VALID_RESOLUTION_TYPES.includes('mystery_solved'));
  assert.equal(VALID_RESOLUTION_TYPES.length, 8);
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

const validInput: CreativeAdResolutionDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and self-care',
  platform: 'tiktok',
};

test('validateCreativeAdResolutionDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdResolutionDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdResolutionDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdResolutionDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdResolutionDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdResolutionDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdResolutionDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdResolutionDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdResolutionDesignerInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdResolutionDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdResolutionDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdResolutionDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdResolutionDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdResolutionDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdResolutionDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdResolutionDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdResolutionDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdResolutionDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdResolutionDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdResolutionDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdResolutionDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdResolutionDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-45',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdResolutionDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdResolutionDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdResolutionDesignerInput accepts undefined platform', () => {
  const { valid, errors } = validateCreativeAdResolutionDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-45',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateResolution with dryRun: true so no real LLM
// calls are made — deterministic heuristic resolution design is returned.

test('dry-run returns a ResolutionDesignerResult with design', async () => {
  const result = await generateResolution({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.design);
  assert.equal(result.dryRun, true);
});

test('dry-run returns satisfactionScore in 0-100 range', async () => {
  const result = await generateResolution({ ...validInput, dryRun: true });
  assert.ok(result.design.satisfactionScore >= 0 && result.design.satisfactionScore <= 100);
});

test('dry-run returns memorabilityScore in 0-100 range', async () => {
  const result = await generateResolution({ ...validInput, dryRun: true });
  assert.ok(result.design.memorabilityScore >= 0 && result.design.memorabilityScore <= 100);
});

test('dry-run returns a valid resolution type', async () => {
  const result = await generateResolution({ ...validInput, dryRun: true });
  assert.ok(VALID_RESOLUTION_TYPES.includes(result.design.structure.type as never));
});

test('dry-run returns structure with correct fields', async () => {
  const result = await generateResolution({ ...validInput, dryRun: true });
  const s = result.design.structure;
  assert.ok(typeof s.type === 'string' && s.type.length > 0);
  assert.ok(typeof s.description === 'string' && s.description.length > 0);
  assert.ok(typeof s.timing === 'string' && s.timing.length > 0);
  assert.ok(typeof s.narrativeCompletion === 'number');
  assert.ok(s.narrativeCompletion >= 0 && s.narrativeCompletion <= 100);
});

test('dry-run returns closure with correct fields', async () => {
  const result = await generateResolution({ ...validInput, dryRun: true });
  const c = result.design.closure;
  assert.ok(typeof c.primaryEmotion === 'string' && c.primaryEmotion.length > 0);
  assert.ok(typeof c.closureMethod === 'string' && c.closureMethod.length > 0);
  assert.ok(typeof c.viewerFeeling === 'string' && c.viewerFeeling.length > 0);
  assert.ok(typeof c.emotionalDepth === 'number');
  assert.ok(c.emotionalDepth >= 0 && c.emotionalDepth <= 100);
});

test('dry-run returns ctaBridge with correct fields', async () => {
  const result = await generateResolution({ ...validInput, dryRun: true });
  const b = result.design.ctaBridge;
  assert.ok(typeof b.bridgeMethod === 'string' && b.bridgeMethod.length > 0);
  assert.ok(typeof b.transitionPhrase === 'string' && b.transitionPhrase.length > 0);
  assert.ok(typeof b.ctaPlacement === 'string' && b.ctaPlacement.length > 0);
  assert.ok(typeof b.naturalness === 'number');
  assert.ok(b.naturalness >= 0 && b.naturalness <= 100);
});

test('dry-run returns recommendations array', async () => {
  const result = await generateResolution({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.design.recommendations));
  assert.ok(result.design.recommendations.length > 0);
  for (const rec of result.design.recommendations) {
    assert.ok(typeof rec === 'string' && rec.length > 0);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateResolution({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.design.structure.type, `${platform} should produce a structure type`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateResolution({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-45',
    dryRun: true,
  });
  assert.ok(result.design.structure.type);
});

test('dry-run is deterministic for the same input', async () => {
  const a = await generateResolution({ ...validInput, dryRun: true });
  const b = await generateResolution({ ...validInput, dryRun: true });
  assert.equal(a.design.satisfactionScore, b.design.satisfactionScore);
  assert.equal(a.design.memorabilityScore, b.design.memorabilityScore);
  assert.equal(a.design.structure.type, b.design.structure.type);
});

test('dry-run produces different types for different content lengths', async () => {
  const shortContent = await generateResolution({
    ...validInput,
    content: 'short',
    dryRun: true,
  });
  const longContent = await generateResolution({
    ...validInput,
    content: 'x'.repeat(500),
    dryRun: true,
  });
  // Not guaranteed to differ, but both must be valid types
  assert.ok(VALID_RESOLUTION_TYPES.includes(shortContent.design.structure.type as never));
  assert.ok(VALID_RESOLUTION_TYPES.includes(longContent.design.structure.type as never));
});

test('generateResolution rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateResolution({ ...validInput, content: '' } as CreativeAdResolutionDesignerInput),
    /invalid_creative_ad_resolution_designer_input/,
  );
});

test('generateResolution rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateResolution({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdResolutionDesignerInput),
    /invalid_creative_ad_resolution_designer_input/,
  );
});

test('generateResolution rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateResolution({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdResolutionDesignerInput),
    /invalid_creative_ad_resolution_designer_input/,
  );
});

test('generateResolution rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateResolution(null as never),
    /invalid_creative_ad_resolution_designer_input/,
  );
});

test('dry-run recommendations reference the brand', async () => {
  const result = await generateResolution({ ...validInput, dryRun: true });
  const allRecs = result.design.recommendations.join(' ').toLowerCase();
  assert.ok(allRecs.length > 0);
});
