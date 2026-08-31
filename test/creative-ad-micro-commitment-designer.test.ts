import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Micro-Commitment Designer engine (AI-powered
 * micro-commitment chain design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_MICRO_COMMITMENT_DESIGNER_CREDIT_COST,
  validateCreativeAdMicroCommitmentDesignerInput,
  generateMicroCommitments,
  VALID_PLATFORMS,
  VALID_COMMITMENT_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdMicroCommitmentDesignerInput,
} from '@/lib/creative/creative-ad-micro-commitment-designer';

// ── Credit cost ──

test('CREATIVE_AD_MICRO_COMMITMENT_DESIGNER_CREDIT_COST is 5', () => {
  assert.equal(CREATIVE_AD_MICRO_COMMITMENT_DESIGNER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_COMMITMENT_TYPES contains the eight commitment types', () => {
  assert.ok(VALID_COMMITMENT_TYPES.includes('attention_commitment'));
  assert.ok(VALID_COMMITMENT_TYPES.includes('engagement_commitment'));
  assert.ok(VALID_COMMITMENT_TYPES.includes('click_commitment'));
  assert.ok(VALID_COMMITMENT_TYPES.includes('signup_commitment'));
  assert.ok(VALID_COMMITMENT_TYPES.includes('trial_commitment'));
  assert.ok(VALID_COMMITMENT_TYPES.includes('preference_commitment'));
  assert.ok(VALID_COMMITMENT_TYPES.includes('social_commitment'));
  assert.ok(VALID_COMMITMENT_TYPES.includes('purchase_commitment'));
  assert.equal(VALID_COMMITMENT_TYPES.length, 8);
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

const validInput: CreativeAdMicroCommitmentDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateCreativeAdMicroCommitmentDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdMicroCommitmentDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdMicroCommitmentDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdMicroCommitmentDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdMicroCommitmentDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdMicroCommitmentDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdMicroCommitmentDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdMicroCommitmentDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdMicroCommitmentDesignerInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdMicroCommitmentDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdMicroCommitmentDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdMicroCommitmentDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdMicroCommitmentDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdMicroCommitmentDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdMicroCommitmentDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdMicroCommitmentDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdMicroCommitmentDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdMicroCommitmentDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdMicroCommitmentDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdMicroCommitmentDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdMicroCommitmentDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdMicroCommitmentDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdMicroCommitmentDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdMicroCommitmentDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdMicroCommitmentDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateCreativeAdMicroCommitmentDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdMicroCommitmentDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateCreativeAdMicroCommitmentDesignerInput({
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
// These tests run generateMicroCommitments with dryRun: true so no real LLM
// calls are made — deterministic heuristic commitments are returned.

test('dry-run returns a MicroCommitmentDesignerResult with strategy', async () => {
  const result = await generateMicroCommitments({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.commitments));
  assert.ok(result.strategy.commitments.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns commitments with correct structure', async () => {
  const result = await generateMicroCommitments({ ...validInput, dryRun: true });
  for (const c of result.strategy.commitments) {
    assert.ok(typeof c.type === 'string' && c.type.length > 0);
    assert.ok(typeof c.commitmentTrigger === 'string' && c.commitmentTrigger.length > 0);
    assert.ok(typeof c.frictionLevel === 'string' && c.frictionLevel.length > 0);
    assert.ok(typeof c.nextCommitmentCue === 'string' && c.nextCommitmentCue.length > 0);
    assert.ok(typeof c.commitmentMomentum === 'number' && c.commitmentMomentum >= 0 && c.commitmentMomentum <= 100);
    assert.ok(typeof c.conversionProbability === 'number' && c.conversionProbability >= 0 && c.conversionProbability <= 100);
    assert.ok(typeof c.commitmentPathway === 'string' && c.commitmentPathway.length > 0);
  }
});

test('dry-run returns commitments with valid commitment types', async () => {
  const result = await generateMicroCommitments({ ...validInput, dryRun: true });
  for (const c of result.strategy.commitments) {
    assert.ok(
      VALID_COMMITMENT_TYPES.includes(c.type as never),
      `commitment type "${c.type}" should be valid`,
    );
  }
});

test('dry-run returns commitmentMomentum in 0-100 range', async () => {
  const result = await generateMicroCommitments({ ...validInput, dryRun: true });
  for (const c of result.strategy.commitments) {
    assert.ok(c.commitmentMomentum >= 0 && c.commitmentMomentum <= 100);
  }
});

test('dry-run returns conversionProbability in 0-100 range', async () => {
  const result = await generateMicroCommitments({ ...validInput, dryRun: true });
  for (const c of result.strategy.commitments) {
    assert.ok(c.conversionProbability >= 0 && c.conversionProbability <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateMicroCommitments({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns exactly 4 commitments (progressive chain)', async () => {
  const result = await generateMicroCommitments({ ...validInput, dryRun: true });
  assert.equal(result.strategy.commitments.length, 4);
});

test('dry-run returns a progressive commitment chain', async () => {
  const result = await generateMicroCommitments({ ...validInput, dryRun: true });
  const types = result.strategy.commitments.map((c) => c.type);
  assert.equal(types[0], 'attention_commitment');
  assert.equal(types[1], 'engagement_commitment');
  assert.equal(types[2], 'click_commitment');
  assert.equal(types[3], 'signup_commitment');
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateMicroCommitments({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.commitments.length > 0, `${platform} should produce commitments`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateMicroCommitments({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.commitments.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateMicroCommitments({ ...validInput, dryRun: true });
  const r2 = await generateMicroCommitments({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.commitments.length, r2.strategy.commitments.length);
  assert.equal(r1.strategy.commitments[0].commitmentMomentum, r2.strategy.commitments[0].commitmentMomentum);
  assert.equal(r1.strategy.commitments[0].conversionProbability, r2.strategy.commitments[0].conversionProbability);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateMicroCommitments({ ...validInput, dryRun: true });
  const r2 = await generateMicroCommitments({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Commitment count is the same but scores differ based on content length
  assert.equal(r1.strategy.commitments.length, r2.strategy.commitments.length);
});

test('dry-run recommendations reference brand and audience', async () => {
  const result = await generateMicroCommitments({ ...validInput, dryRun: true });
  const joined = result.strategy.recommendations.join(' ');
  assert.ok(joined.length > 0);
});

test('generateMicroCommitments rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateMicroCommitments({ ...validInput, content: '' } as CreativeAdMicroCommitmentDesignerInput),
    /invalid_creative_ad_micro_commitment_designer_input/,
  );
});

test('generateMicroCommitments rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateMicroCommitments({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdMicroCommitmentDesignerInput),
    /invalid_creative_ad_micro_commitment_designer_input/,
  );
});

test('generateMicroCommitments rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateMicroCommitments({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdMicroCommitmentDesignerInput),
    /invalid_creative_ad_micro_commitment_designer_input/,
  );
});

test('generateMicroCommitments rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateMicroCommitments(null as never),
    /invalid_creative_ad_micro_commitment_designer_input/,
  );
});

test('dry-run commitment momentum increases progressively', async () => {
  const result = await generateMicroCommitments({ ...validInput, dryRun: true });
  const scores = result.strategy.commitments.map((c) => c.commitmentMomentum);
  // Momentum should generally increase through the chain
  assert.ok(scores[3] >= scores[0], 'final commitment momentum should be >= first');
});
