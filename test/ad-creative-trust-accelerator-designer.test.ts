import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Trust Accelerator Designer engine (AI-powered
 * trust accelerator design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_TRUST_ACCELERATOR_DESIGNER_CREDIT_COST,
  validateAdCreativeTrustAcceleratorDesignerInput,
  generateTrustAccelerators,
  VALID_PLATFORMS,
  VALID_ACCELERATOR_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeTrustAcceleratorDesignerInput,
} from '@/lib/creative/ad-creative-trust-accelerator-designer';

// ── Credit cost ──

test('AD_CREATIVE_TRUST_ACCELERATOR_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(AD_CREATIVE_TRUST_ACCELERATOR_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_ACCELERATOR_TYPES contains the eight accelerator types', () => {
  assert.ok(VALID_ACCELERATOR_TYPES.includes('authority_endorsement'));
  assert.ok(VALID_ACCELERATOR_TYPES.includes('social_proof_cascade'));
  assert.ok(VALID_ACCELERATOR_TYPES.includes('expert_validation'));
  assert.ok(VALID_ACCELERATOR_TYPES.includes('user_testimony'));
  assert.ok(VALID_ACCELERATOR_TYPES.includes('data_backed_claim'));
  assert.ok(VALID_ACCELERATOR_TYPES.includes('transparency_reveal'));
  assert.ok(VALID_ACCELERATOR_TYPES.includes('guarantee_offer'));
  assert.ok(VALID_ACCELERATOR_TYPES.includes('community_consensus'));
  assert.equal(VALID_ACCELERATOR_TYPES.length, 8);
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

const validInput: AdCreativeTrustAcceleratorDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateAdCreativeTrustAcceleratorDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeTrustAcceleratorDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeTrustAcceleratorDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeTrustAcceleratorDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeTrustAcceleratorDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeTrustAcceleratorDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeTrustAcceleratorDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeTrustAcceleratorDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeTrustAcceleratorDesignerInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeTrustAcceleratorDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeTrustAcceleratorDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeTrustAcceleratorDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeTrustAcceleratorDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeTrustAcceleratorDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeTrustAcceleratorDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeTrustAcceleratorDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeTrustAcceleratorDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeTrustAcceleratorDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeTrustAcceleratorDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeTrustAcceleratorDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeTrustAcceleratorDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeTrustAcceleratorDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeTrustAcceleratorDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeTrustAcceleratorDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeTrustAcceleratorDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateAdCreativeTrustAcceleratorDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeTrustAcceleratorDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateAdCreativeTrustAcceleratorDesignerInput({
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

test('validateAdCreativeTrustAcceleratorDesignerInput accepts whitespace-only productOrBrand as invalid', () => {
  const { valid, errors } = validateAdCreativeTrustAcceleratorDesignerInput({
    ...validInput,
    productOrBrand: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeTrustAcceleratorDesignerInput accepts whitespace-only content as invalid', () => {
  const { valid, errors } = validateAdCreativeTrustAcceleratorDesignerInput({
    ...validInput,
    content: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeTrustAcceleratorDesignerInput accepts whitespace-only targetAudience as invalid', () => {
  const { valid, errors } = validateAdCreativeTrustAcceleratorDesignerInput({
    ...validInput,
    targetAudience: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

// ── Dry-run mode tests ──
//
// These tests run generateTrustAccelerators with dryRun: true so no real LLM
// calls are made — deterministic heuristic accelerators are returned.

test('dry-run returns a TrustAcceleratorDesignerResult with strategy', async () => {
  const result = await generateTrustAccelerators({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.accelerators));
  assert.ok(result.strategy.accelerators.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns accelerators with correct structure', async () => {
  const result = await generateTrustAccelerators({ ...validInput, dryRun: true });
  for (const a of result.strategy.accelerators) {
    assert.ok(typeof a.type === 'string' && a.type.length > 0);
    assert.ok(typeof a.trustSignal === 'string' && a.trustSignal.length > 0);
    assert.ok(typeof a.credibilityMarker === 'string' && a.credibilityMarker.length > 0);
    assert.ok(typeof a.proofElement === 'string' && a.proofElement.length > 0);
    assert.ok(typeof a.trustVelocity === 'number' && a.trustVelocity >= 0 && a.trustVelocity <= 100);
    assert.ok(typeof a.credibilityScore === 'number' && a.credibilityScore >= 0 && a.credibilityScore <= 100);
    assert.ok(typeof a.accelerationPathway === 'string' && a.accelerationPathway.length > 0);
  }
});

test('dry-run returns accelerators with valid accelerator types', async () => {
  const result = await generateTrustAccelerators({ ...validInput, dryRun: true });
  for (const a of result.strategy.accelerators) {
    assert.ok(
      VALID_ACCELERATOR_TYPES.includes(a.type as never),
      `accelerator type "${a.type}" should be valid`,
    );
  }
});

test('dry-run returns trustVelocity in 0-100 range', async () => {
  const result = await generateTrustAccelerators({ ...validInput, dryRun: true });
  for (const a of result.strategy.accelerators) {
    assert.ok(a.trustVelocity >= 0 && a.trustVelocity <= 100);
  }
});

test('dry-run returns credibilityScore in 0-100 range', async () => {
  const result = await generateTrustAccelerators({ ...validInput, dryRun: true });
  for (const a of result.strategy.accelerators) {
    assert.ok(a.credibilityScore >= 0 && a.credibilityScore <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateTrustAccelerators({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 3 accelerators', async () => {
  const result = await generateTrustAccelerators({ ...validInput, dryRun: true });
  assert.ok(result.strategy.accelerators.length >= 3);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateTrustAccelerators({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.accelerators.length > 0, `${platform} should produce accelerators`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateTrustAccelerators({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.accelerators.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateTrustAccelerators({ ...validInput, dryRun: true });
  const r2 = await generateTrustAccelerators({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.accelerators.length, r2.strategy.accelerators.length);
  assert.equal(r1.strategy.accelerators[0].trustVelocity, r2.strategy.accelerators[0].trustVelocity);
  assert.equal(r1.strategy.accelerators[0].credibilityScore, r2.strategy.accelerators[0].credibilityScore);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateTrustAccelerators({ ...validInput, dryRun: true });
  const r2 = await generateTrustAccelerators({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Accelerator count is the same but scores differ based on content length
  assert.equal(r1.strategy.accelerators.length, r2.strategy.accelerators.length);
});

test('generateTrustAccelerators rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateTrustAccelerators({ ...validInput, content: '' } as AdCreativeTrustAcceleratorDesignerInput),
    /invalid_ad_creative_trust_accelerator_designer_input/,
  );
});

test('generateTrustAccelerators rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateTrustAccelerators({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeTrustAcceleratorDesignerInput),
    /invalid_ad_creative_trust_accelerator_designer_input/,
  );
});

test('generateTrustAccelerators rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateTrustAccelerators({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeTrustAcceleratorDesignerInput),
    /invalid_ad_creative_trust_accelerator_designer_input/,
  );
});

test('generateTrustAccelerators rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateTrustAccelerators(null as never),
    /invalid_ad_creative_trust_accelerator_designer_input/,
  );
});

test('dry-run recommendations reference the brand and audience', async () => {
  const result = await generateTrustAccelerators({ ...validInput, dryRun: true });
  const allRecs = result.strategy.recommendations.join(' ').toLowerCase();
  assert.ok(allRecs.length > 0);
});

test('dry-run accelerators have distinct types', async () => {
  const result = await generateTrustAccelerators({ ...validInput, dryRun: true });
  const types = result.strategy.accelerators.map((a) => a.type);
  const unique = new Set(types);
  assert.equal(unique.size, types.length, 'accelerator types should be distinct');
});
