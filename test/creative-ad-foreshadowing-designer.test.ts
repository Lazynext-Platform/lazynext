import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Foreshadowing Designer engine (AI-powered
 * foreshadowing element design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_FORESHADOWING_DESIGNER_CREDIT_COST,
  validateCreativeAdForeshadowingDesignerInput,
  generateForeshadowing,
  VALID_PLATFORMS,
  VALID_HINT_TYPES,
  VALID_VIEWER_DISCOVERY,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdForeshadowingDesignerInput,
} from '@/lib/creative/creative-ad-foreshadowing-designer';

// ── Credit cost ──

test('CREATIVE_AD_FORESHADOWING_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(CREATIVE_AD_FORESHADOWING_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
});

test('VALID_HINT_TYPES contains the eight hint types', () => {
  assert.ok(VALID_HINT_TYPES.includes('visual_plant'));
  assert.ok(VALID_HINT_TYPES.includes('verbal_cue'));
  assert.ok(VALID_HINT_TYPES.includes('prop_placement'));
  assert.ok(VALID_HINT_TYPES.includes('color_motif'));
  assert.ok(VALID_HINT_TYPES.includes('sound_foreshadow'));
  assert.ok(VALID_HINT_TYPES.includes('gesture_hint'));
  assert.ok(VALID_HINT_TYPES.includes('text_overlay'));
  assert.ok(VALID_HINT_TYPES.includes('background_detail'));
  assert.equal(VALID_HINT_TYPES.length, 8);
});

test('VALID_VIEWER_DISCOVERY contains the three discovery values', () => {
  assert.ok(VALID_VIEWER_DISCOVERY.includes('first_watch'));
  assert.ok(VALID_VIEWER_DISCOVERY.includes('second_watch'));
  assert.ok(VALID_VIEWER_DISCOVERY.includes('pause_frame'));
  assert.equal(VALID_VIEWER_DISCOVERY.length, 3);
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

const validInput: CreativeAdForeshadowingDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateCreativeAdForeshadowingDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdForeshadowingDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdForeshadowingDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdForeshadowingDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdForeshadowingDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdForeshadowingDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdForeshadowingDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdForeshadowingDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdForeshadowingDesignerInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdForeshadowingDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdForeshadowingDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdForeshadowingDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdForeshadowingDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdForeshadowingDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdForeshadowingDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdForeshadowingDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdForeshadowingDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdForeshadowingDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdForeshadowingDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdForeshadowingDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdForeshadowingDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdForeshadowingDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Fitness enthusiasts 18-35',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdForeshadowingDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdForeshadowingDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdForeshadowingDesignerInput accepts undefined platform', () => {
  const { valid, errors } = validateCreativeAdForeshadowingDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Fitness enthusiasts 18-35',
    platform: undefined,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdForeshadowingDesignerInput accepts dryRun boolean', () => {
  const { valid, errors } = validateCreativeAdForeshadowingDesignerInput({
    ...validInput,
    dryRun: true,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateForeshadowing with dryRun: true so no real LLM
// calls are made — deterministic heuristic foreshadowing elements are returned.

test('dry-run returns a ForeshadowingDesignerResult with strategy', async () => {
  const result = await generateForeshadowing({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.elements));
  assert.ok(result.strategy.elements.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns elements with correct structure', async () => {
  const result = await generateForeshadowing({ ...validInput, dryRun: true });
  for (const el of result.strategy.elements) {
    assert.ok(typeof el.type === 'string' && el.type.length > 0);
    assert.ok(typeof el.setup === 'string' && el.setup.length > 0);
    assert.ok(typeof el.payoff === 'string' && el.payoff.length > 0);
    assert.ok(typeof el.subtletyScore === 'number' && el.subtletyScore >= 0 && el.subtletyScore <= 100);
    assert.ok(typeof el.rewatchValue === 'number' && el.rewatchValue >= 0 && el.rewatchValue <= 100);
    assert.ok(typeof el.placement === 'string' && el.placement.length > 0);
    assert.ok(VALID_VIEWER_DISCOVERY.includes(el.viewerDiscovery));
  }
});

test('dry-run returns elements with valid hint types', async () => {
  const result = await generateForeshadowing({ ...validInput, dryRun: true });
  for (const el of result.strategy.elements) {
    assert.ok(VALID_HINT_TYPES.includes(el.type as never), `${el.type} should be a valid hint type`);
  }
});

test('dry-run returns subtletyScore in 0-100 range', async () => {
  const result = await generateForeshadowing({ ...validInput, dryRun: true });
  for (const el of result.strategy.elements) {
    assert.ok(el.subtletyScore >= 0 && el.subtletyScore <= 100);
  }
});

test('dry-run returns rewatchValue in 0-100 range', async () => {
  const result = await generateForeshadowing({ ...validInput, dryRun: true });
  for (const el of result.strategy.elements) {
    assert.ok(el.rewatchValue >= 0 && el.rewatchValue <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateForeshadowing({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const rec of result.strategy.recommendations) {
    assert.ok(typeof rec === 'string' && rec.length > 0);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateForeshadowing({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.elements.length > 0, `${platform} should produce elements`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateForeshadowing({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.elements.length > 0);
});

test('dry-run produces deterministic output for same input', async () => {
  const r1 = await generateForeshadowing({ ...validInput, dryRun: true });
  const r2 = await generateForeshadowing({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.elements.length, r2.strategy.elements.length);
  assert.equal(r1.strategy.elements[0].subtletyScore, r2.strategy.elements[0].subtletyScore);
  assert.equal(r1.strategy.elements[0].rewatchValue, r2.strategy.elements[0].rewatchValue);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateForeshadowing({ ...validInput, dryRun: true });
  const r2 = await generateForeshadowing({
    ...validInput,
    content: 'A completely different ad about a fitness app for busy professionals.',
    dryRun: true,
  });
  // Scores should differ because content length differs
  assert.notEqual(r1.strategy.elements[0].subtletyScore, r2.strategy.elements[0].subtletyScore);
});

test('generateForeshadowing rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateForeshadowing({ ...validInput, content: '' } as CreativeAdForeshadowingDesignerInput),
    /invalid_creative_ad_foreshadowing_designer_input/,
  );
});

test('generateForeshadowing rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateForeshadowing({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdForeshadowingDesignerInput),
    /invalid_creative_ad_foreshadowing_designer_input/,
  );
});

test('generateForeshadowing rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateForeshadowing({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdForeshadowingDesignerInput),
    /invalid_creative_ad_foreshadowing_designer_input/,
  );
});
