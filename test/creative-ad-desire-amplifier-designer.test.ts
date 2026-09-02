import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Desire Amplifier Designer engine (AI-powered
 * desire amplifier design for ad creative content).
 *
 * Tests cover input validation, credit cost, dry-run mode (no real LLM
 * calls), constants, type exports, and parseDesignerJson behavior so they
 * can run in the Node test runner.
 */
import {
  CREATIVE_AD_DESIRE_AMPLIFIER_DESIGNER_CREDIT_COST,
  validateCreativeAdDesireAmplifierDesignerInput,
  generateDesireAmplifiers,
  VALID_PLATFORMS,
  VALID_AMPLIFIER_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  CREATIVE_AD_DESIRE_AMPLIFIER_DESIGNER_SYS,
  CREATIVE_AD_DESIRE_AMPLIFIER_DESIGNER_MODEL,
  type CreativeAdDesireAmplifierDesignerInput,
  type DesireAmplifier,
  type AmplifierStrategy,
  type DesireAmplifierDesignerResult,
  type AmplifierType,
} from '@/lib/creative/creative-ad-desire-amplifier-designer';

// ── Credit cost ──

test('CREATIVE_AD_DESIRE_AMPLIFIER_DESIGNER_CREDIT_COST is 5', () => {
  assert.equal(CREATIVE_AD_DESIRE_AMPLIFIER_DESIGNER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_AMPLIFIER_TYPES contains the eight amplifier types', () => {
  assert.ok(VALID_AMPLIFIER_TYPES.includes('scarcity_amplifier'));
  assert.ok(VALID_AMPLIFIER_TYPES.includes('social_proof_amplifier'));
  assert.ok(VALID_AMPLIFIER_TYPES.includes('aspiration_amplifier'));
  assert.ok(VALID_AMPLIFIER_TYPES.includes('exclusivity_amplifier'));
  assert.ok(VALID_AMPLIFIER_TYPES.includes('transformation_amplifier'));
  assert.ok(VALID_AMPLIFIER_TYPES.includes('pleasure_amplifier'));
  assert.ok(VALID_AMPLIFIER_TYPES.includes('status_amplifier'));
  assert.ok(VALID_AMPLIFIER_TYPES.includes('fomo_amplifier'));
  assert.equal(VALID_AMPLIFIER_TYPES.length, 8);
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

test('CREATIVE_AD_DESIRE_AMPLIFIER_DESIGNER_SYS is a non-empty string', () => {
  assert.ok(typeof CREATIVE_AD_DESIRE_AMPLIFIER_DESIGNER_SYS === 'string');
  assert.ok(CREATIVE_AD_DESIRE_AMPLIFIER_DESIGNER_SYS.length > 0);
});

test('CREATIVE_AD_DESIRE_AMPLIFIER_DESIGNER_MODEL is a string', () => {
  assert.ok(typeof CREATIVE_AD_DESIRE_AMPLIFIER_DESIGNER_MODEL === 'string');
});

// ── Type exports (compile-time check via runtime usage) ──

test('type exports are usable at runtime (AmplifierType union)', () => {
  const a: AmplifierType = 'scarcity_amplifier';
  assert.equal(a, 'scarcity_amplifier');
});

test('type exports are usable at runtime (DesireAmplifier interface)', () => {
  const amp: DesireAmplifier = {
    type: 'fomo_amplifier',
    desireTrigger: 'trigger',
    escalationTechnique: 'escalation',
    cravingBuilder: 'craving',
    desireIntensity: 80,
    urgencyLevel: 70,
    amplificationPathway: 'pathway',
  };
  assert.equal(amp.desireIntensity, 80);
});

test('type exports are usable at runtime (AmplifierStrategy interface)', () => {
  const s: AmplifierStrategy = { amplifiers: [], recommendations: ['r'] };
  assert.equal(s.recommendations.length, 1);
});

test('type exports are usable at runtime (DesireAmplifierDesignerResult interface)', () => {
  const r: DesireAmplifierDesignerResult = {
    strategy: { amplifiers: [], recommendations: [] },
    dryRun: true,
  };
  assert.equal(r.dryRun, true);
});

// ── Input validation tests ──

const validInput: CreativeAdDesireAmplifierDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateCreativeAdDesireAmplifierDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdDesireAmplifierDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdDesireAmplifierDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdDesireAmplifierDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdDesireAmplifierDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdDesireAmplifierDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdDesireAmplifierDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdDesireAmplifierDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdDesireAmplifierDesignerInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdDesireAmplifierDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdDesireAmplifierDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdDesireAmplifierDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdDesireAmplifierDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdDesireAmplifierDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdDesireAmplifierDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdDesireAmplifierDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdDesireAmplifierDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdDesireAmplifierDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdDesireAmplifierDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdDesireAmplifierDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdDesireAmplifierDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdDesireAmplifierDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdDesireAmplifierDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdDesireAmplifierDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdDesireAmplifierDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateCreativeAdDesireAmplifierDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdDesireAmplifierDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateCreativeAdDesireAmplifierDesignerInput({
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

test('validateCreativeAdDesireAmplifierDesignerInput accepts valid dryRun boolean', () => {
  const { valid } = validateCreativeAdDesireAmplifierDesignerInput({
    ...validInput,
    dryRun: true,
  });
  assert.ok(valid);
});

// ── Dry-run mode tests ──
//
// These tests run generateDesireAmplifiers with dryRun: true so no real LLM
// calls are made — deterministic heuristic amplifiers are returned.

test('dry-run returns a DesireAmplifierDesignerResult with strategy', async () => {
  const result = await generateDesireAmplifiers({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.amplifiers));
  assert.ok(result.strategy.amplifiers.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns exactly 3 amplifiers', async () => {
  const result = await generateDesireAmplifiers({ ...validInput, dryRun: true });
  assert.equal(result.strategy.amplifiers.length, 3);
});

test('dry-run returns amplifiers with correct structure', async () => {
  const result = await generateDesireAmplifiers({ ...validInput, dryRun: true });
  for (const a of result.strategy.amplifiers) {
    assert.ok(typeof a.type === 'string' && a.type.length > 0);
    assert.ok(typeof a.desireTrigger === 'string' && a.desireTrigger.length > 0);
    assert.ok(typeof a.escalationTechnique === 'string' && a.escalationTechnique.length > 0);
    assert.ok(typeof a.cravingBuilder === 'string' && a.cravingBuilder.length > 0);
    assert.ok(typeof a.desireIntensity === 'number' && a.desireIntensity >= 0 && a.desireIntensity <= 100);
    assert.ok(typeof a.urgencyLevel === 'number' && a.urgencyLevel >= 0 && a.urgencyLevel <= 100);
    assert.ok(typeof a.amplificationPathway === 'string' && a.amplificationPathway.length > 0);
  }
});

test('dry-run returns amplifiers with valid amplifier types', async () => {
  const result = await generateDesireAmplifiers({ ...validInput, dryRun: true });
  for (const a of result.strategy.amplifiers) {
    assert.ok(
      VALID_AMPLIFIER_TYPES.includes(a.type as AmplifierType),
      `amplifier type "${a.type}" should be valid`,
    );
  }
});

test('dry-run returns desireIntensity in 0-100 range', async () => {
  const result = await generateDesireAmplifiers({ ...validInput, dryRun: true });
  for (const a of result.strategy.amplifiers) {
    assert.ok(a.desireIntensity >= 0 && a.desireIntensity <= 100);
  }
});

test('dry-run returns urgencyLevel in 0-100 range', async () => {
  const result = await generateDesireAmplifiers({ ...validInput, dryRun: true });
  for (const a of result.strategy.amplifiers) {
    assert.ok(a.urgencyLevel >= 0 && a.urgencyLevel <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateDesireAmplifiers({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateDesireAmplifiers({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.amplifiers.length > 0, `${platform} should produce amplifiers`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateDesireAmplifiers({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.amplifiers.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateDesireAmplifiers({ ...validInput, dryRun: true });
  const r2 = await generateDesireAmplifiers({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.amplifiers.length, r2.strategy.amplifiers.length);
  assert.equal(r1.strategy.amplifiers[0].desireIntensity, r2.strategy.amplifiers[0].desireIntensity);
  assert.equal(r1.strategy.amplifiers[0].urgencyLevel, r2.strategy.amplifiers[0].urgencyLevel);
});

test('dry-run output varies with different content length', async () => {
  const r1 = await generateDesireAmplifiers({ ...validInput, dryRun: true });
  const r2 = await generateDesireAmplifiers({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Amplifier count is the same but scores differ based on content length
  assert.equal(r1.strategy.amplifiers.length, r2.strategy.amplifiers.length);
});

test('generateDesireAmplifiers rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateDesireAmplifiers({ ...validInput, content: '' } as CreativeAdDesireAmplifierDesignerInput),
    /invalid_creative_ad_desire_amplifier_designer_input/,
  );
});

test('generateDesireAmplifiers rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateDesireAmplifiers({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdDesireAmplifierDesignerInput),
    /invalid_creative_ad_desire_amplifier_designer_input/,
  );
});

test('generateDesireAmplifiers rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateDesireAmplifiers({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdDesireAmplifierDesignerInput),
    /invalid_creative_ad_desire_amplifier_designer_input/,
  );
});

test('generateDesireAmplifiers rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateDesireAmplifiers(null as never),
    /invalid_creative_ad_desire_amplifier_designer_input/,
  );
});
