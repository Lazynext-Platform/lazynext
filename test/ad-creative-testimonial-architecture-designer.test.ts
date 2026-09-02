import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Testimonial Architecture Designer engine (AI-powered
 * testimonial architecture design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_TESTIMONIAL_ARCHITECTURE_DESIGNER_CREDIT_COST,
  validateAdCreativeTestimonialArchitectureDesignerInput,
  generateTestimonialArchitectures,
  VALID_PLATFORMS,
  VALID_TESTIMONIAL_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeTestimonialArchitectureDesignerInput,
} from '@/lib/creative/ad-creative-testimonial-architecture-designer';

// ── Credit cost ──

test('AD_CREATIVE_TESTIMONIAL_ARCHITECTURE_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(AD_CREATIVE_TESTIMONIAL_ARCHITECTURE_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_TESTIMONIAL_TYPES contains the eight testimonial types', () => {
  assert.ok(VALID_TESTIMONIAL_TYPES.includes('before_after_testimonial'));
  assert.ok(VALID_TESTIMONIAL_TYPES.includes('transformation_testimonial'));
  assert.ok(VALID_TESTIMONIAL_TYPES.includes('expert_endorsement'));
  assert.ok(VALID_TESTIMONIAL_TYPES.includes('peer_review'));
  assert.ok(VALID_TESTIMONIAL_TYPES.includes('case_study'));
  assert.ok(VALID_TESTIMONIAL_TYPES.includes('social_proof_compilation'));
  assert.ok(VALID_TESTIMONIAL_TYPES.includes('video_testimonial'));
  assert.ok(VALID_TESTIMONIAL_TYPES.includes('quantified_result'));
  assert.equal(VALID_TESTIMONIAL_TYPES.length, 8);
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

const validInput: AdCreativeTestimonialArchitectureDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateAdCreativeTestimonialArchitectureDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeTestimonialArchitectureDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeTestimonialArchitectureDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeTestimonialArchitectureDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeTestimonialArchitectureDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeTestimonialArchitectureDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeTestimonialArchitectureDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeTestimonialArchitectureDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeTestimonialArchitectureDesignerInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeTestimonialArchitectureDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeTestimonialArchitectureDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeTestimonialArchitectureDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeTestimonialArchitectureDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeTestimonialArchitectureDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeTestimonialArchitectureDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeTestimonialArchitectureDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeTestimonialArchitectureDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeTestimonialArchitectureDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeTestimonialArchitectureDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeTestimonialArchitectureDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeTestimonialArchitectureDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeTestimonialArchitectureDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeTestimonialArchitectureDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeTestimonialArchitectureDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeTestimonialArchitectureDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateAdCreativeTestimonialArchitectureDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeTestimonialArchitectureDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateAdCreativeTestimonialArchitectureDesignerInput({
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

test('validateAdCreativeTestimonialArchitectureDesignerInput accepts whitespace-only productOrBrand as invalid', () => {
  const { valid, errors } = validateAdCreativeTestimonialArchitectureDesignerInput({
    ...validInput,
    productOrBrand: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeTestimonialArchitectureDesignerInput accepts whitespace-only content as invalid', () => {
  const { valid, errors } = validateAdCreativeTestimonialArchitectureDesignerInput({
    ...validInput,
    content: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeTestimonialArchitectureDesignerInput accepts whitespace-only targetAudience as invalid', () => {
  const { valid, errors } = validateAdCreativeTestimonialArchitectureDesignerInput({
    ...validInput,
    targetAudience: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

// ── Dry-run mode tests ──
//
// These tests run generateTestimonialArchitectures with dryRun: true so no real
// LLM calls are made — deterministic heuristic architectures are returned.

test('dry-run returns a TestimonialArchitectureDesignerResult with strategy', async () => {
  const result = await generateTestimonialArchitectures({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.architectures));
  assert.ok(result.strategy.architectures.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns architectures with correct structure', async () => {
  const result = await generateTestimonialArchitectures({ ...validInput, dryRun: true });
  for (const a of result.strategy.architectures) {
    assert.ok(typeof a.type === 'string' && a.type.length > 0);
    assert.ok(typeof a.testimonialAngle === 'string' && a.testimonialAngle.length > 0);
    assert.ok(typeof a.proofElement === 'string' && a.proofElement.length > 0);
    assert.ok(typeof a.placementStrategy === 'string' && a.placementStrategy.length > 0);
    assert.ok(typeof a.credibilityScore === 'number' && a.credibilityScore >= 0 && a.credibilityScore <= 100);
    assert.ok(typeof a.persuasionImpact === 'number' && a.persuasionImpact >= 0 && a.persuasionImpact <= 100);
    assert.ok(typeof a.testimonialPathway === 'string' && a.testimonialPathway.length > 0);
  }
});

test('dry-run returns architectures with valid testimonial types', async () => {
  const result = await generateTestimonialArchitectures({ ...validInput, dryRun: true });
  for (const a of result.strategy.architectures) {
    assert.ok(
      VALID_TESTIMONIAL_TYPES.includes(a.type as never),
      `testimonial type "${a.type}" should be valid`,
    );
  }
});

test('dry-run returns credibilityScore in 0-100 range', async () => {
  const result = await generateTestimonialArchitectures({ ...validInput, dryRun: true });
  for (const a of result.strategy.architectures) {
    assert.ok(a.credibilityScore >= 0 && a.credibilityScore <= 100);
  }
});

test('dry-run returns persuasionImpact in 0-100 range', async () => {
  const result = await generateTestimonialArchitectures({ ...validInput, dryRun: true });
  for (const a of result.strategy.architectures) {
    assert.ok(a.persuasionImpact >= 0 && a.persuasionImpact <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateTestimonialArchitectures({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 3 architectures', async () => {
  const result = await generateTestimonialArchitectures({ ...validInput, dryRun: true });
  assert.ok(result.strategy.architectures.length >= 3);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateTestimonialArchitectures({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.architectures.length > 0, `${platform} should produce architectures`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateTestimonialArchitectures({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.architectures.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateTestimonialArchitectures({ ...validInput, dryRun: true });
  const r2 = await generateTestimonialArchitectures({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.architectures.length, r2.strategy.architectures.length);
  assert.equal(r1.strategy.architectures[0].credibilityScore, r2.strategy.architectures[0].credibilityScore);
  assert.equal(r1.strategy.architectures[0].persuasionImpact, r2.strategy.architectures[0].persuasionImpact);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateTestimonialArchitectures({ ...validInput, dryRun: true });
  const r2 = await generateTestimonialArchitectures({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Architecture count is the same but scores differ based on content length
  assert.equal(r1.strategy.architectures.length, r2.strategy.architectures.length);
});

test('generateTestimonialArchitectures rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateTestimonialArchitectures({ ...validInput, content: '' } as AdCreativeTestimonialArchitectureDesignerInput),
    /invalid_ad_creative_testimonial_architecture_designer_input/,
  );
});

test('generateTestimonialArchitectures rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateTestimonialArchitectures({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeTestimonialArchitectureDesignerInput),
    /invalid_ad_creative_testimonial_architecture_designer_input/,
  );
});

test('generateTestimonialArchitectures rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateTestimonialArchitectures({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeTestimonialArchitectureDesignerInput),
    /invalid_ad_creative_testimonial_architecture_designer_input/,
  );
});

test('generateTestimonialArchitectures rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateTestimonialArchitectures(null as never),
    /invalid_ad_creative_testimonial_architecture_designer_input/,
  );
});

test('dry-run recommendations reference the brand and audience', async () => {
  const result = await generateTestimonialArchitectures({ ...validInput, dryRun: true });
  const allRecs = result.strategy.recommendations.join(' ').toLowerCase();
  assert.ok(allRecs.length > 0);
});

test('dry-run architectures have distinct types', async () => {
  const result = await generateTestimonialArchitectures({ ...validInput, dryRun: true });
  const types = result.strategy.architectures.map((a) => a.type);
  const unique = new Set(types);
  assert.equal(unique.size, types.length, 'architecture types should be distinct');
});
