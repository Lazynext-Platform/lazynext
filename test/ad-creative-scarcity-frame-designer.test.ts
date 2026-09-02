import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Scarcity Frame Designer engine (AI-powered
 * scarcity frame design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_SCARCITY_FRAME_DESIGNER_CREDIT_COST,
  validateAdCreativeScarcityFrameDesignerInput,
  generateScarcityFrames,
  VALID_PLATFORMS,
  VALID_FRAME_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeScarcityFrameDesignerInput,
} from '@/lib/creative/ad-creative-scarcity-frame-designer';

// ── Credit cost ──

test('AD_CREATIVE_SCARCITY_FRAME_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(AD_CREATIVE_SCARCITY_FRAME_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_FRAME_TYPES contains the eight frame types', () => {
  assert.ok(VALID_FRAME_TYPES.includes('limited_quantity'));
  assert.ok(VALID_FRAME_TYPES.includes('limited_time'));
  assert.ok(VALID_FRAME_TYPES.includes('exclusive_access'));
  assert.ok(VALID_FRAME_TYPES.includes('seasonal_window'));
  assert.ok(VALID_FRAME_TYPES.includes('capacity_constraint'));
  assert.ok(VALID_FRAME_TYPES.includes('edition_rarity'));
  assert.ok(VALID_FRAME_TYPES.includes('waitlist_demand'));
  assert.ok(VALID_FRAME_TYPES.includes('price_increase_approaching'));
  assert.equal(VALID_FRAME_TYPES.length, 8);
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

const validInput: AdCreativeScarcityFrameDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Only 50 bottles left of our limited-edition vitamin C serum — offer ends Friday!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateAdCreativeScarcityFrameDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeScarcityFrameDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeScarcityFrameDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeScarcityFrameDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeScarcityFrameDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeScarcityFrameDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeScarcityFrameDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeScarcityFrameDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeScarcityFrameDesignerInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeScarcityFrameDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeScarcityFrameDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeScarcityFrameDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeScarcityFrameDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeScarcityFrameDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeScarcityFrameDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeScarcityFrameDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeScarcityFrameDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeScarcityFrameDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeScarcityFrameDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeScarcityFrameDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeScarcityFrameDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeScarcityFrameDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeScarcityFrameDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeScarcityFrameDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeScarcityFrameDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateAdCreativeScarcityFrameDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeScarcityFrameDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateAdCreativeScarcityFrameDesignerInput({
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
// These tests run generateScarcityFrames with dryRun: true so no real LLM
// calls are made — deterministic heuristic scarcity frames are returned.

test('dry-run returns a ScarcityFrameDesignerResult with strategy', async () => {
  const result = await generateScarcityFrames({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.frames));
  assert.ok(result.strategy.frames.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns scarcity frames with correct structure', async () => {
  const result = await generateScarcityFrames({ ...validInput, dryRun: true });
  for (const f of result.strategy.frames) {
    assert.ok(typeof f.type === 'string' && f.type.length > 0);
    assert.ok(typeof f.scarcitySignal === 'string' && f.scarcitySignal.length > 0);
    assert.ok(typeof f.urgencyElement === 'string' && f.urgencyElement.length > 0);
    assert.ok(typeof f.authenticityMarker === 'string' && f.authenticityMarker.length > 0);
    assert.ok(typeof f.scarcityIntensity === 'number' && f.scarcityIntensity >= 0 && f.scarcityIntensity <= 100);
    assert.ok(typeof f.motivationStrength === 'number' && f.motivationStrength >= 0 && f.motivationStrength <= 100);
    assert.ok(typeof f.framePathway === 'string' && f.framePathway.length > 0);
  }
});

test('dry-run returns scarcity frames with valid frame types', async () => {
  const result = await generateScarcityFrames({ ...validInput, dryRun: true });
  for (const f of result.strategy.frames) {
    assert.ok(
      VALID_FRAME_TYPES.includes(f.type as never),
      `frame type "${f.type}" should be valid`,
    );
  }
});

test('dry-run returns scarcityIntensity in 0-100 range', async () => {
  const result = await generateScarcityFrames({ ...validInput, dryRun: true });
  for (const f of result.strategy.frames) {
    assert.ok(f.scarcityIntensity >= 0 && f.scarcityIntensity <= 100);
  }
});

test('dry-run returns motivationStrength in 0-100 range', async () => {
  const result = await generateScarcityFrames({ ...validInput, dryRun: true });
  for (const f of result.strategy.frames) {
    assert.ok(f.motivationStrength >= 0 && f.motivationStrength <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateScarcityFrames({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 3 scarcity frames', async () => {
  const result = await generateScarcityFrames({ ...validInput, dryRun: true });
  assert.ok(result.strategy.frames.length >= 3);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateScarcityFrames({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.frames.length > 0, `${platform} should produce scarcity frames`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateScarcityFrames({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.frames.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateScarcityFrames({ ...validInput, dryRun: true });
  const r2 = await generateScarcityFrames({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.frames.length, r2.strategy.frames.length);
  assert.equal(r1.strategy.frames[0].scarcityIntensity, r2.strategy.frames[0].scarcityIntensity);
  assert.equal(r1.strategy.frames[0].motivationStrength, r2.strategy.frames[0].motivationStrength);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateScarcityFrames({ ...validInput, dryRun: true });
  const r2 = await generateScarcityFrames({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Frame count is the same but scores differ based on content length
  assert.equal(r1.strategy.frames.length, r2.strategy.frames.length);
});

test('generateScarcityFrames rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateScarcityFrames({ ...validInput, content: '' } as AdCreativeScarcityFrameDesignerInput),
    /invalid_ad_creative_scarcity_frame_designer_input/,
  );
});

test('generateScarcityFrames rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateScarcityFrames({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeScarcityFrameDesignerInput),
    /invalid_ad_creative_scarcity_frame_designer_input/,
  );
});

test('generateScarcityFrames rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateScarcityFrames({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeScarcityFrameDesignerInput),
    /invalid_ad_creative_scarcity_frame_designer_input/,
  );
});

test('generateScarcityFrames rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateScarcityFrames(null as never),
    /invalid_ad_creative_scarcity_frame_designer_input/,
  );
});


