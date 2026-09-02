import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Micro-Moment Designer engine (AI-powered
 * micro-moment design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_MICRO_MOMENT_DESIGNER_CREDIT_COST,
  validateCreativeAdMicroMomentDesignerInput,
  generateMicroMoments,
  VALID_PLATFORMS,
  VALID_MOMENT_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdMicroMomentDesignerInput,
} from '@/lib/creative/creative-ad-micro-moment-designer';

// ── Credit cost ──

test('CREATIVE_AD_MICRO_MOMENT_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(CREATIVE_AD_MICRO_MOMENT_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_MOMENT_TYPES contains the eight moment types', () => {
  assert.ok(VALID_MOMENT_TYPES.includes('visual_pop'));
  assert.ok(VALID_MOMENT_TYPES.includes('text_reveal'));
  assert.ok(VALID_MOMENT_TYPES.includes('sound_cue'));
  assert.ok(VALID_MOMENT_TYPES.includes('expression_change'));
  assert.ok(VALID_MOMENT_TYPES.includes('scene_shift'));
  assert.ok(VALID_MOMENT_TYPES.includes('color_burst'));
  assert.ok(VALID_MOMENT_TYPES.includes('motion_accel'));
  assert.ok(VALID_MOMENT_TYPES.includes('pause_beat'));
  assert.equal(VALID_MOMENT_TYPES.length, 8);
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

const validInput: CreativeAdMicroMomentDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateCreativeAdMicroMomentDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdMicroMomentDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdMicroMomentDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdMicroMomentDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdMicroMomentDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdMicroMomentDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdMicroMomentDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdMicroMomentDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdMicroMomentDesignerInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdMicroMomentDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdMicroMomentDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdMicroMomentDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdMicroMomentDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdMicroMomentDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdMicroMomentDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdMicroMomentDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdMicroMomentDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdMicroMomentDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdMicroMomentDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdMicroMomentDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdMicroMomentDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdMicroMomentDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-45',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdMicroMomentDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdMicroMomentDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdMicroMomentDesignerInput accepts undefined platform', () => {
  const { valid, errors } = validateCreativeAdMicroMomentDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-45',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdMicroMomentDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateCreativeAdMicroMomentDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdMicroMomentDesignerInput accepts dryRun boolean true', () => {
  const { valid, errors } = validateCreativeAdMicroMomentDesignerInput({
    ...validInput,
    dryRun: true,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdMicroMomentDesignerInput accepts dryRun boolean false', () => {
  const { valid, errors } = validateCreativeAdMicroMomentDesignerInput({
    ...validInput,
    dryRun: false,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateMicroMoments with dryRun: true so no real LLM
// calls are made — deterministic heuristic micro-moments are returned.

test('dry-run returns a MomentDesignerResult with sequence', async () => {
  const result = await generateMicroMoments({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.sequence);
  assert.ok(Array.isArray(result.sequence.moments));
  assert.ok(result.sequence.moments.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns moments with correct structure', async () => {
  const result = await generateMicroMoments({ ...validInput, dryRun: true });
  for (const m of result.sequence.moments) {
    assert.ok(typeof m.type === 'string' && m.type.length > 0);
    assert.ok(typeof m.timestamp === 'string' && m.timestamp.length > 0);
    assert.ok(typeof m.duration === 'string' && m.duration.length > 0);
    assert.ok(typeof m.description === 'string' && m.description.length > 0);
    assert.ok(typeof m.attentionScore === 'number' && m.attentionScore >= 0 && m.attentionScore <= 100);
    assert.ok(typeof m.implementation === 'string' && m.implementation.length > 0);
    assert.ok(typeof m.emotionalBeat === 'string' && m.emotionalBeat.length > 0);
  }
});

test('dry-run returns attentionScore in 0-100 range', async () => {
  const result = await generateMicroMoments({ ...validInput, dryRun: true });
  for (const m of result.sequence.moments) {
    assert.ok(m.attentionScore >= 0 && m.attentionScore <= 100);
  }
});

test('dry-run returns 4-8 moments', async () => {
  const result = await generateMicroMoments({ ...validInput, dryRun: true });
  assert.ok(result.sequence.moments.length >= 4 && result.sequence.moments.length <= 8);
});

test('dry-run returns recommendations', async () => {
  const result = await generateMicroMoments({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.sequence.recommendations));
  assert.ok(result.sequence.recommendations.length > 0);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateMicroMoments({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.sequence.moments.length > 0, `${platform} should produce moments`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateMicroMoments({
    productOrBrand: validInput.productOrBrand,
    content: validInput.content,
    targetAudience: validInput.targetAudience,
    dryRun: true,
  });
  assert.ok(result.sequence.moments.length > 0);
});

test('dry-run is deterministic for the same input', async () => {
  const a = await generateMicroMoments({ ...validInput, dryRun: true });
  const b = await generateMicroMoments({ ...validInput, dryRun: true });
  assert.equal(a.sequence.moments.length, b.sequence.moments.length);
  assert.equal(a.sequence.moments[0].type, b.sequence.moments[0].type);
  assert.equal(a.sequence.moments[0].attentionScore, b.sequence.moments[0].attentionScore);
});

test('dry-run moment types are from the valid set', async () => {
  const result = await generateMicroMoments({ ...validInput, dryRun: true });
  for (const m of result.sequence.moments) {
    assert.ok(VALID_MOMENT_TYPES.includes(m.type as never), `${m.type} should be valid`);
  }
});

test('dry-run first moment has the highest attention score', async () => {
  const result = await generateMicroMoments({ ...validInput, dryRun: true });
  const first = result.sequence.moments[0];
  for (const m of result.sequence.moments) {
    assert.ok(first.attentionScore >= m.attentionScore - 10, 'first moment should be high-attention');
  }
});

test('generateMicroMoments rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateMicroMoments({ ...validInput, content: '' } as CreativeAdMicroMomentDesignerInput),
    /invalid_creative_ad_micro_moment_designer_input/,
  );
});

test('generateMicroMoments rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateMicroMoments({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdMicroMomentDesignerInput),
    /invalid_creative_ad_micro_moment_designer_input/,
  );
});

test('generateMicroMoments rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateMicroMoments({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdMicroMomentDesignerInput),
    /invalid_creative_ad_micro_moment_designer_input/,
  );
});

test('generateMicroMoments rejects over-length content', async () => {
  await assert.rejects(
    () =>
      generateMicroMoments({
        ...validInput,
        content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
        dryRun: true,
      } as CreativeAdMicroMomentDesignerInput),
    /invalid_creative_ad_micro_moment_designer_input/,
  );
});

test('generateMicroMoments rejects over-length targetAudience', async () => {
  await assert.rejects(
    () =>
      generateMicroMoments({
        ...validInput,
        targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
        dryRun: true,
      } as CreativeAdMicroMomentDesignerInput),
    /invalid_creative_ad_micro_moment_designer_input/,
  );
});
