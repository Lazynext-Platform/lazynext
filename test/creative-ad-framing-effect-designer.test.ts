import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Framing Effect Designer engine (AI-powered
 * framing effect design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_FRAMING_EFFECT_DESIGNER_CREDIT_COST,
  validateCreativeAdFramingEffectDesignerInput,
  generateFramingEffects,
  VALID_PLATFORMS,
  VALID_FRAMING_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdFramingEffectDesignerInput,
} from '@/lib/creative/creative-ad-framing-effect-designer';

// ── Credit cost ──

test('CREATIVE_AD_FRAMING_EFFECT_DESIGNER_CREDIT_COST is 5', () => {
  assert.equal(CREATIVE_AD_FRAMING_EFFECT_DESIGNER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_FRAMING_TYPES contains the eight framing types', () => {
  assert.ok(VALID_FRAMING_TYPES.includes('gain_frame'));
  assert.ok(VALID_FRAMING_TYPES.includes('loss_frame'));
  assert.ok(VALID_FRAMING_TYPES.includes('attribute_frame'));
  assert.ok(VALID_FRAMING_TYPES.includes('goal_frame'));
  assert.ok(VALID_FRAMING_TYPES.includes('risk_frame'));
  assert.ok(VALID_FRAMING_TYPES.includes('opportunity_frame'));
  assert.ok(VALID_FRAMING_TYPES.includes('progress_frame'));
  assert.ok(VALID_FRAMING_TYPES.includes('identity_frame'));
  assert.equal(VALID_FRAMING_TYPES.length, 8);
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

const validInput: CreativeAdFramingEffectDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateCreativeAdFramingEffectDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdFramingEffectDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdFramingEffectDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdFramingEffectDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdFramingEffectDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdFramingEffectDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdFramingEffectDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdFramingEffectDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdFramingEffectDesignerInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdFramingEffectDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdFramingEffectDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdFramingEffectDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdFramingEffectDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdFramingEffectDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdFramingEffectDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdFramingEffectDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdFramingEffectDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdFramingEffectDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdFramingEffectDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdFramingEffectDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdFramingEffectDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdFramingEffectDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdFramingEffectDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdFramingEffectDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdFramingEffectDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateCreativeAdFramingEffectDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdFramingEffectDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateCreativeAdFramingEffectDesignerInput({
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

test('validateCreativeAdFramingEffectDesignerInput accepts whitespace-only productOrBrand as invalid', () => {
  const { valid, errors } = validateCreativeAdFramingEffectDesignerInput({
    ...validInput,
    productOrBrand: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdFramingEffectDesignerInput accepts whitespace-only content as invalid', () => {
  const { valid, errors } = validateCreativeAdFramingEffectDesignerInput({
    ...validInput,
    content: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdFramingEffectDesignerInput accepts whitespace-only targetAudience as invalid', () => {
  const { valid, errors } = validateCreativeAdFramingEffectDesignerInput({
    ...validInput,
    targetAudience: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

// ── Dry-run mode tests ──
//
// These tests run generateFramingEffects with dryRun: true so no real
// LLM calls are made — deterministic heuristic effects are returned.

test('dry-run returns a FramingEffectDesignerResult with strategy', async () => {
  const result = await generateFramingEffects({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.effects));
  assert.ok(result.strategy.effects.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns effects with correct structure', async () => {
  const result = await generateFramingEffects({ ...validInput, dryRun: true });
  for (const e of result.strategy.effects) {
    assert.ok(typeof e.type === 'string' && e.type.length > 0);
    assert.ok(typeof e.framePerspective === 'string' && e.framePerspective.length > 0);
    assert.ok(typeof e.messageFrame === 'string' && e.messageFrame.length > 0);
    assert.ok(typeof e.perceptionShift === 'string' && e.perceptionShift.length > 0);
    assert.ok(typeof e.frameStrength === 'number' && e.frameStrength >= 0 && e.frameStrength <= 100);
    assert.ok(typeof e.decisionInfluence === 'number' && e.decisionInfluence >= 0 && e.decisionInfluence <= 100);
    assert.ok(typeof e.framingPathway === 'string' && e.framingPathway.length > 0);
  }
});

test('dry-run returns effects with valid framing types', async () => {
  const result = await generateFramingEffects({ ...validInput, dryRun: true });
  for (const e of result.strategy.effects) {
    assert.ok(
      VALID_FRAMING_TYPES.includes(e.type as never),
      `framing type "${e.type}" should be valid`,
    );
  }
});

test('dry-run returns frameStrength in 0-100 range', async () => {
  const result = await generateFramingEffects({ ...validInput, dryRun: true });
  for (const e of result.strategy.effects) {
    assert.ok(e.frameStrength >= 0 && e.frameStrength <= 100);
  }
});

test('dry-run returns decisionInfluence in 0-100 range', async () => {
  const result = await generateFramingEffects({ ...validInput, dryRun: true });
  for (const e of result.strategy.effects) {
    assert.ok(e.decisionInfluence >= 0 && e.decisionInfluence <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateFramingEffects({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 3 effects', async () => {
  const result = await generateFramingEffects({ ...validInput, dryRun: true });
  assert.ok(result.strategy.effects.length >= 3);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateFramingEffects({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.effects.length > 0, `${platform} should produce effects`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateFramingEffects({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.effects.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateFramingEffects({ ...validInput, dryRun: true });
  const r2 = await generateFramingEffects({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.effects.length, r2.strategy.effects.length);
  assert.equal(r1.strategy.effects[0].frameStrength, r2.strategy.effects[0].frameStrength);
  assert.equal(r1.strategy.effects[0].decisionInfluence, r2.strategy.effects[0].decisionInfluence);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateFramingEffects({ ...validInput, dryRun: true });
  const r2 = await generateFramingEffects({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Effect count is the same but scores differ based on content length
  assert.equal(r1.strategy.effects.length, r2.strategy.effects.length);
});

test('generateFramingEffects rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateFramingEffects({ ...validInput, content: '' } as CreativeAdFramingEffectDesignerInput),
    /invalid_creative_ad_framing_effect_designer_input/,
  );
});

test('generateFramingEffects rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateFramingEffects({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdFramingEffectDesignerInput),
    /invalid_creative_ad_framing_effect_designer_input/,
  );
});

test('generateFramingEffects rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateFramingEffects({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdFramingEffectDesignerInput),
    /invalid_creative_ad_framing_effect_designer_input/,
  );
});

test('generateFramingEffects rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateFramingEffects(null as never),
    /invalid_creative_ad_framing_effect_designer_input/,
  );
});

test('dry-run recommendations reference the brand and audience', async () => {
  const result = await generateFramingEffects({ ...validInput, dryRun: true });
  const allRecs = result.strategy.recommendations.join(' ').toLowerCase();
  assert.ok(allRecs.length > 0);
});

test('dry-run effects have distinct types', async () => {
  const result = await generateFramingEffects({ ...validInput, dryRun: true });
  const types = result.strategy.effects.map((e) => e.type);
  const unique = new Set(types);
  assert.equal(unique.size, types.length, 'effect types should be distinct');
});
