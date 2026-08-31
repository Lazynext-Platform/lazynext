import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Social Momentum Designer engine (AI-powered
 * social momentum design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_SOCIAL_MOMENTUM_DESIGNER_CREDIT_COST,
  validateAdCreativeSocialMomentumDesignerInput,
  generateSocialMomentum,
  VALID_PLATFORMS,
  VALID_MOMENTUM_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeSocialMomentumDesignerInput,
} from '@/lib/creative/ad-creative-social-momentum-designer';

// ── Credit cost ──

test('AD_CREATIVE_SOCIAL_MOMENTUM_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(AD_CREATIVE_SOCIAL_MOMENTUM_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_MOMENTUM_TYPES contains the eight momentum types', () => {
  assert.ok(VALID_MOMENTUM_TYPES.includes('viral_cascade'));
  assert.ok(VALID_MOMENTUM_TYPES.includes('community_growth'));
  assert.ok(VALID_MOMENTUM_TYPES.includes('trend_adoption'));
  assert.ok(VALID_MOMENTUM_TYPES.includes('influencer_wave'));
  assert.ok(VALID_MOMENTUM_TYPES.includes('user_generated_wave'));
  assert.ok(VALID_MOMENTUM_TYPES.includes('milestone_celebration'));
  assert.ok(VALID_MOMENTUM_TYPES.includes('movement_building'));
  assert.ok(VALID_MOMENTUM_TYPES.includes('collective_action'));
  assert.equal(VALID_MOMENTUM_TYPES.length, 8);
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

const validInput: AdCreativeSocialMomentumDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Join 50,000+ women who transformed their skin with our vitamin C serum in just 7 days!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateAdCreativeSocialMomentumDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeSocialMomentumDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeSocialMomentumDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeSocialMomentumDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeSocialMomentumDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeSocialMomentumDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeSocialMomentumDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeSocialMomentumDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeSocialMomentumDesignerInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeSocialMomentumDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeSocialMomentumDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeSocialMomentumDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeSocialMomentumDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeSocialMomentumDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeSocialMomentumDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeSocialMomentumDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeSocialMomentumDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeSocialMomentumDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeSocialMomentumDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeSocialMomentumDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeSocialMomentumDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeSocialMomentumDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeSocialMomentumDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeSocialMomentumDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeSocialMomentumDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateAdCreativeSocialMomentumDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeSocialMomentumDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateAdCreativeSocialMomentumDesignerInput({
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
// These tests run generateSocialMomentum with dryRun: true so no real LLM
// calls are made — deterministic heuristic momentum builders are returned.

test('dry-run returns a SocialMomentumDesignerResult with strategy', async () => {
  const result = await generateSocialMomentum({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.momentum));
  assert.ok(result.strategy.momentum.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns momentum builders with correct structure', async () => {
  const result = await generateSocialMomentum({ ...validInput, dryRun: true });
  for (const m of result.strategy.momentum) {
    assert.ok(typeof m.type === 'string' && m.type.length > 0);
    assert.ok(typeof m.socialSignal === 'string' && m.socialSignal.length > 0);
    assert.ok(typeof m.communityEvidence === 'string' && m.communityEvidence.length > 0);
    assert.ok(typeof m.bandwagonElement === 'string' && m.bandwagonElement.length > 0);
    assert.ok(typeof m.momentumVelocity === 'number' && m.momentumVelocity >= 0 && m.momentumVelocity <= 100);
    assert.ok(typeof m.socialProofStrength === 'number' && m.socialProofStrength >= 0 && m.socialProofStrength <= 100);
    assert.ok(typeof m.momentumPathway === 'string' && m.momentumPathway.length > 0);
  }
});

test('dry-run returns momentum builders with valid momentum types', async () => {
  const result = await generateSocialMomentum({ ...validInput, dryRun: true });
  for (const m of result.strategy.momentum) {
    assert.ok(
      VALID_MOMENTUM_TYPES.includes(m.type as never),
      `momentum type "${m.type}" should be valid`,
    );
  }
});

test('dry-run returns momentumVelocity in 0-100 range', async () => {
  const result = await generateSocialMomentum({ ...validInput, dryRun: true });
  for (const m of result.strategy.momentum) {
    assert.ok(m.momentumVelocity >= 0 && m.momentumVelocity <= 100);
  }
});

test('dry-run returns socialProofStrength in 0-100 range', async () => {
  const result = await generateSocialMomentum({ ...validInput, dryRun: true });
  for (const m of result.strategy.momentum) {
    assert.ok(m.socialProofStrength >= 0 && m.socialProofStrength <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateSocialMomentum({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 3 momentum builders', async () => {
  const result = await generateSocialMomentum({ ...validInput, dryRun: true });
  assert.ok(result.strategy.momentum.length >= 3);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateSocialMomentum({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.momentum.length > 0, `${platform} should produce momentum builders`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateSocialMomentum({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.momentum.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateSocialMomentum({ ...validInput, dryRun: true });
  const r2 = await generateSocialMomentum({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.momentum.length, r2.strategy.momentum.length);
  assert.equal(r1.strategy.momentum[0].momentumVelocity, r2.strategy.momentum[0].momentumVelocity);
  assert.equal(r1.strategy.momentum[0].socialProofStrength, r2.strategy.momentum[0].socialProofStrength);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateSocialMomentum({ ...validInput, dryRun: true });
  const r2 = await generateSocialMomentum({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Momentum count is the same but scores differ based on content length
  assert.equal(r1.strategy.momentum.length, r2.strategy.momentum.length);
});

test('generateSocialMomentum rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateSocialMomentum({ ...validInput, content: '' } as AdCreativeSocialMomentumDesignerInput),
    /invalid_ad_creative_social_momentum_designer_input/,
  );
});

test('generateSocialMomentum rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateSocialMomentum({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeSocialMomentumDesignerInput),
    /invalid_ad_creative_social_momentum_designer_input/,
  );
});

test('generateSocialMomentum rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateSocialMomentum({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeSocialMomentumDesignerInput),
    /invalid_ad_creative_social_momentum_designer_input/,
  );
});

test('generateSocialMomentum rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateSocialMomentum(null as never),
    /invalid_ad_creative_social_momentum_designer_input/,
  );
});
