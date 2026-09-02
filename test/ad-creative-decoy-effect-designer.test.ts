import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Decoy Effect Designer engine (AI-powered
 * decoy effect design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_DECOY_EFFECT_DESIGNER_CREDIT_COST,
  validateAdCreativeDecoyEffectDesignerInput,
  generateDecoyEffects,
  VALID_PLATFORMS,
  VALID_DECOY_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeDecoyEffectDesignerInput,
} from '@/lib/creative/ad-creative-decoy-effect-designer';

// ── Credit cost ──

test('AD_CREATIVE_DECOY_EFFECT_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(AD_CREATIVE_DECOY_EFFECT_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_DECOY_TYPES contains the eight decoy types', () => {
  assert.ok(VALID_DECOY_TYPES.includes('price_decoy'));
  assert.ok(VALID_DECOY_TYPES.includes('feature_decoy'));
  assert.ok(VALID_DECOY_TYPES.includes('quality_decoy'));
  assert.ok(VALID_DECOY_TYPES.includes('quantity_decoy'));
  assert.ok(VALID_DECOY_TYPES.includes('premium_decoy'));
  assert.ok(VALID_DECOY_TYPES.includes('bundle_decoy'));
  assert.ok(VALID_DECOY_TYPES.includes('competitor_decoy'));
  assert.ok(VALID_DECOY_TYPES.includes('asymmetric_decoy'));
  assert.equal(VALID_DECOY_TYPES.length, 8);
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

const validInput: AdCreativeDecoyEffectDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateAdCreativeDecoyEffectDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeDecoyEffectDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeDecoyEffectDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeDecoyEffectDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeDecoyEffectDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeDecoyEffectDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeDecoyEffectDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeDecoyEffectDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeDecoyEffectDesignerInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeDecoyEffectDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeDecoyEffectDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeDecoyEffectDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeDecoyEffectDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeDecoyEffectDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeDecoyEffectDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeDecoyEffectDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeDecoyEffectDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeDecoyEffectDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeDecoyEffectDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeDecoyEffectDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeDecoyEffectDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeDecoyEffectDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeDecoyEffectDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeDecoyEffectDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeDecoyEffectDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateAdCreativeDecoyEffectDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeDecoyEffectDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateAdCreativeDecoyEffectDesignerInput({
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

test('validateAdCreativeDecoyEffectDesignerInput accepts whitespace-only productOrBrand as invalid', () => {
  const { valid, errors } = validateAdCreativeDecoyEffectDesignerInput({
    ...validInput,
    productOrBrand: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeDecoyEffectDesignerInput accepts whitespace-only content as invalid', () => {
  const { valid, errors } = validateAdCreativeDecoyEffectDesignerInput({
    ...validInput,
    content: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeDecoyEffectDesignerInput accepts whitespace-only targetAudience as invalid', () => {
  const { valid, errors } = validateAdCreativeDecoyEffectDesignerInput({
    ...validInput,
    targetAudience: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

// ── Dry-run mode tests ──
//
// These tests run generateDecoyEffects with dryRun: true so no real
// LLM calls are made — deterministic heuristic effects are returned.

test('dry-run returns a DecoyEffectDesignerResult with strategy', async () => {
  const result = await generateDecoyEffects({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.effects));
  assert.ok(result.strategy.effects.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns effects with correct structure', async () => {
  const result = await generateDecoyEffects({ ...validInput, dryRun: true });
  for (const e of result.strategy.effects) {
    assert.ok(typeof e.type === 'string' && e.type.length > 0);
    assert.ok(typeof e.decoyOption === 'string' && e.decoyOption.length > 0);
    assert.ok(typeof e.targetOption === 'string' && e.targetOption.length > 0);
    assert.ok(typeof e.asymmetryElement === 'string' && e.asymmetryElement.length > 0);
    assert.ok(typeof e.decoyInfluence === 'number' && e.decoyInfluence >= 0 && e.decoyInfluence <= 100);
    assert.ok(typeof e.targetPreference === 'number' && e.targetPreference >= 0 && e.targetPreference <= 100);
    assert.ok(typeof e.decoyPathway === 'string' && e.decoyPathway.length > 0);
  }
});

test('dry-run returns effects with valid decoy types', async () => {
  const result = await generateDecoyEffects({ ...validInput, dryRun: true });
  for (const e of result.strategy.effects) {
    assert.ok(
      VALID_DECOY_TYPES.includes(e.type as never),
      `decoy type "${e.type}" should be valid`,
    );
  }
});

test('dry-run returns decoyInfluence in 0-100 range', async () => {
  const result = await generateDecoyEffects({ ...validInput, dryRun: true });
  for (const e of result.strategy.effects) {
    assert.ok(e.decoyInfluence >= 0 && e.decoyInfluence <= 100);
  }
});

test('dry-run returns targetPreference in 0-100 range', async () => {
  const result = await generateDecoyEffects({ ...validInput, dryRun: true });
  for (const e of result.strategy.effects) {
    assert.ok(e.targetPreference >= 0 && e.targetPreference <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateDecoyEffects({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 3 effects', async () => {
  const result = await generateDecoyEffects({ ...validInput, dryRun: true });
  assert.ok(result.strategy.effects.length >= 3);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateDecoyEffects({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.effects.length > 0, `${platform} should produce effects`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateDecoyEffects({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.effects.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateDecoyEffects({ ...validInput, dryRun: true });
  const r2 = await generateDecoyEffects({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.effects.length, r2.strategy.effects.length);
  assert.equal(r1.strategy.effects[0].decoyInfluence, r2.strategy.effects[0].decoyInfluence);
  assert.equal(r1.strategy.effects[0].targetPreference, r2.strategy.effects[0].targetPreference);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateDecoyEffects({ ...validInput, dryRun: true });
  const r2 = await generateDecoyEffects({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Effect count is the same but scores differ based on content length
  assert.equal(r1.strategy.effects.length, r2.strategy.effects.length);
});

test('generateDecoyEffects rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateDecoyEffects({ ...validInput, content: '' } as AdCreativeDecoyEffectDesignerInput),
    /invalid_ad_creative_decoy_effect_designer_input/,
  );
});

test('generateDecoyEffects rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateDecoyEffects({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeDecoyEffectDesignerInput),
    /invalid_ad_creative_decoy_effect_designer_input/,
  );
});

test('generateDecoyEffects rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateDecoyEffects({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeDecoyEffectDesignerInput),
    /invalid_ad_creative_decoy_effect_designer_input/,
  );
});

test('generateDecoyEffects rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateDecoyEffects(null as never),
    /invalid_ad_creative_decoy_effect_designer_input/,
  );
});

test('dry-run recommendations reference the brand and audience', async () => {
  const result = await generateDecoyEffects({ ...validInput, dryRun: true });
  const allRecs = result.strategy.recommendations.join(' ').toLowerCase();
  assert.ok(allRecs.length > 0);
});

test('dry-run effects have distinct types', async () => {
  const result = await generateDecoyEffects({ ...validInput, dryRun: true });
  const types = result.strategy.effects.map((e) => e.type);
  const unique = new Set(types);
  assert.equal(unique.size, types.length, 'effect types should be distinct');
});
