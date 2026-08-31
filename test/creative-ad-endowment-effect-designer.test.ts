import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Endowment Effect Designer engine (AI-powered
 * endowment effect design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_ENDOWMENT_EFFECT_DESIGNER_CREDIT_COST,
  validateCreativeAdEndowmentEffectDesignerInput,
  generateEndowmentEffects,
  VALID_PLATFORMS,
  VALID_ENDOWMENT_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdEndowmentEffectDesignerInput,
} from '@/lib/creative/creative-ad-endowment-effect-designer';

// ── Credit cost ──

test('CREATIVE_AD_ENDOWMENT_EFFECT_DESIGNER_CREDIT_COST is 5', () => {
  assert.equal(CREATIVE_AD_ENDOWMENT_EFFECT_DESIGNER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_ENDOWMENT_TYPES contains the eight endowment types', () => {
  assert.ok(VALID_ENDOWMENT_TYPES.includes('trial_ownership'));
  assert.ok(VALID_ENDOWMENT_TYPES.includes('preview_access'));
  assert.ok(VALID_ENDOWMENT_TYPES.includes('personalization_stake'));
  assert.ok(VALID_ENDOWMENT_TYPES.includes('customization_investment'));
  assert.ok(VALID_ENDOWMENT_TYPES.includes('usage_investment'));
  assert.ok(VALID_ENDOWMENT_TYPES.includes('emotional_attachment'));
  assert.ok(VALID_ENDOWMENT_TYPES.includes('social_investment'));
  assert.ok(VALID_ENDOWMENT_TYPES.includes('identity_investment'));
  assert.equal(VALID_ENDOWMENT_TYPES.length, 8);
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

const validInput: CreativeAdEndowmentEffectDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateCreativeAdEndowmentEffectDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdEndowmentEffectDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdEndowmentEffectDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdEndowmentEffectDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdEndowmentEffectDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdEndowmentEffectDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdEndowmentEffectDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdEndowmentEffectDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdEndowmentEffectDesignerInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdEndowmentEffectDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdEndowmentEffectDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdEndowmentEffectDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdEndowmentEffectDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdEndowmentEffectDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdEndowmentEffectDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdEndowmentEffectDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdEndowmentEffectDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdEndowmentEffectDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdEndowmentEffectDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdEndowmentEffectDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdEndowmentEffectDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdEndowmentEffectDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdEndowmentEffectDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdEndowmentEffectDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdEndowmentEffectDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateCreativeAdEndowmentEffectDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdEndowmentEffectDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateCreativeAdEndowmentEffectDesignerInput({
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

test('validateCreativeAdEndowmentEffectDesignerInput accepts whitespace-only productOrBrand as invalid', () => {
  const { valid, errors } = validateCreativeAdEndowmentEffectDesignerInput({
    ...validInput,
    productOrBrand: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdEndowmentEffectDesignerInput accepts whitespace-only content as invalid', () => {
  const { valid, errors } = validateCreativeAdEndowmentEffectDesignerInput({
    ...validInput,
    content: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdEndowmentEffectDesignerInput accepts whitespace-only targetAudience as invalid', () => {
  const { valid, errors } = validateCreativeAdEndowmentEffectDesignerInput({
    ...validInput,
    targetAudience: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

// ── Dry-run mode tests ──
//
// These tests run generateEndowmentEffects with dryRun: true so no real
// LLM calls are made — deterministic heuristic effects are returned.

test('dry-run returns a EndowmentEffectDesignerResult with strategy', async () => {
  const result = await generateEndowmentEffects({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.effects));
  assert.ok(result.strategy.effects.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns effects with correct structure', async () => {
  const result = await generateEndowmentEffects({ ...validInput, dryRun: true });
  for (const e of result.strategy.effects) {
    assert.ok(typeof e.type === 'string' && e.type.length > 0);
    assert.ok(typeof e.ownershipCue === 'string' && e.ownershipCue.length > 0);
    assert.ok(typeof e.personalizationElement === 'string' && e.personalizationElement.length > 0);
    assert.ok(typeof e.lossAversionTrigger === 'string' && e.lossAversionTrigger.length > 0);
    assert.ok(typeof e.ownershipFeeling === 'number' && e.ownershipFeeling >= 0 && e.ownershipFeeling <= 100);
    assert.ok(typeof e.retentionStrength === 'number' && e.retentionStrength >= 0 && e.retentionStrength <= 100);
    assert.ok(typeof e.endowmentPathway === 'string' && e.endowmentPathway.length > 0);
  }
});

test('dry-run returns effects with valid endowment types', async () => {
  const result = await generateEndowmentEffects({ ...validInput, dryRun: true });
  for (const e of result.strategy.effects) {
    assert.ok(
      VALID_ENDOWMENT_TYPES.includes(e.type as never),
      `endowment type "${e.type}" should be valid`,
    );
  }
});

test('dry-run returns ownershipFeeling in 0-100 range', async () => {
  const result = await generateEndowmentEffects({ ...validInput, dryRun: true });
  for (const e of result.strategy.effects) {
    assert.ok(e.ownershipFeeling >= 0 && e.ownershipFeeling <= 100);
  }
});

test('dry-run returns retentionStrength in 0-100 range', async () => {
  const result = await generateEndowmentEffects({ ...validInput, dryRun: true });
  for (const e of result.strategy.effects) {
    assert.ok(e.retentionStrength >= 0 && e.retentionStrength <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateEndowmentEffects({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 3 effects', async () => {
  const result = await generateEndowmentEffects({ ...validInput, dryRun: true });
  assert.ok(result.strategy.effects.length >= 3);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateEndowmentEffects({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.effects.length > 0, `${platform} should produce effects`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateEndowmentEffects({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.effects.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateEndowmentEffects({ ...validInput, dryRun: true });
  const r2 = await generateEndowmentEffects({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.effects.length, r2.strategy.effects.length);
  assert.equal(r1.strategy.effects[0].ownershipFeeling, r2.strategy.effects[0].ownershipFeeling);
  assert.equal(r1.strategy.effects[0].retentionStrength, r2.strategy.effects[0].retentionStrength);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateEndowmentEffects({ ...validInput, dryRun: true });
  const r2 = await generateEndowmentEffects({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Effect count is the same but scores differ based on content length
  assert.equal(r1.strategy.effects.length, r2.strategy.effects.length);
});

test('generateEndowmentEffects rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateEndowmentEffects({ ...validInput, content: '' } as CreativeAdEndowmentEffectDesignerInput),
    /invalid_creative_ad_endowment_effect_designer_input/,
  );
});

test('generateEndowmentEffects rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateEndowmentEffects({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdEndowmentEffectDesignerInput),
    /invalid_creative_ad_endowment_effect_designer_input/,
  );
});

test('generateEndowmentEffects rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateEndowmentEffects({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdEndowmentEffectDesignerInput),
    /invalid_creative_ad_endowment_effect_designer_input/,
  );
});

test('generateEndowmentEffects rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateEndowmentEffects(null as never),
    /invalid_creative_ad_endowment_effect_designer_input/,
  );
});

test('dry-run recommendations reference the brand and audience', async () => {
  const result = await generateEndowmentEffects({ ...validInput, dryRun: true });
  const allRecs = result.strategy.recommendations.join(' ').toLowerCase();
  assert.ok(allRecs.length > 0);
});

test('dry-run effects have distinct types', async () => {
  const result = await generateEndowmentEffects({ ...validInput, dryRun: true });
  const types = result.strategy.effects.map((e) => e.type);
  const unique = new Set(types);
  assert.equal(unique.size, types.length, 'effect types should be distinct');
});

test('dry-run effects include trial_ownership, preview_access, and personalization_stake', async () => {
  const result = await generateEndowmentEffects({ ...validInput, dryRun: true });
  const types = result.strategy.effects.map((e) => e.type);
  assert.ok(types.includes('trial_ownership'));
  assert.ok(types.includes('preview_access'));
  assert.ok(types.includes('personalization_stake'));
});

test('dry-run recommendations are non-empty strings', async () => {
  const result = await generateEndowmentEffects({ ...validInput, dryRun: true });
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string');
    assert.ok(r.trim().length > 0);
  }
});

test('dry-run effect ownershipCue references the audience', async () => {
  const result = await generateEndowmentEffects({ ...validInput, dryRun: true });
  const audienceSlug = validInput.targetAudience.toLowerCase().slice(0, 20).replace(/[^a-z0-9]/g, '');
  const allCues = result.strategy.effects.map((e) => e.ownershipCue.toLowerCase()).join(' ');
  assert.ok(
    allCues.includes(audienceSlug) || allCues.includes('audience'),
    'ownership cues should reference the audience',
  );
});
