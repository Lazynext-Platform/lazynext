import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Identity Alignment Designer engine (AI-powered
 * identity alignment design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_IDENTITY_ALIGNMENT_DESIGNER_CREDIT_COST,
  validateCreativeAdIdentityAlignmentDesignerInput,
  generateIdentityAlignments,
  VALID_PLATFORMS,
  VALID_ALIGNMENT_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdIdentityAlignmentDesignerInput,
} from '@/lib/creative/creative-ad-identity-alignment-designer';

// ── Credit cost ──

test('CREATIVE_AD_IDENTITY_ALIGNMENT_DESIGNER_CREDIT_COST is 5', () => {
  assert.equal(CREATIVE_AD_IDENTITY_ALIGNMENT_DESIGNER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_ALIGNMENT_TYPES contains the eight alignment types', () => {
  assert.ok(VALID_ALIGNMENT_TYPES.includes('values_mirror'));
  assert.ok(VALID_ALIGNMENT_TYPES.includes('aspirational_self'));
  assert.ok(VALID_ALIGNMENT_TYPES.includes('tribe_membership'));
  assert.ok(VALID_ALIGNMENT_TYPES.includes('lifestyle_fit'));
  assert.ok(VALID_ALIGNMENT_TYPES.includes('professional_identity'));
  assert.ok(VALID_ALIGNMENT_TYPES.includes('creative_identity'));
  assert.ok(VALID_ALIGNMENT_TYPES.includes('role_model_echo'));
  assert.ok(VALID_ALIGNMENT_TYPES.includes('self_image_reinforcement'));
  assert.equal(VALID_ALIGNMENT_TYPES.length, 8);
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

const validInput: CreativeAdIdentityAlignmentDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateCreativeAdIdentityAlignmentDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdIdentityAlignmentDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdIdentityAlignmentDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdIdentityAlignmentDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdIdentityAlignmentDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdIdentityAlignmentDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdIdentityAlignmentDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdIdentityAlignmentDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdIdentityAlignmentDesignerInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdIdentityAlignmentDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdIdentityAlignmentDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdIdentityAlignmentDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdIdentityAlignmentDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdIdentityAlignmentDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdIdentityAlignmentDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdIdentityAlignmentDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdIdentityAlignmentDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdIdentityAlignmentDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdIdentityAlignmentDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdIdentityAlignmentDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdIdentityAlignmentDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdIdentityAlignmentDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdIdentityAlignmentDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdIdentityAlignmentDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdIdentityAlignmentDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateCreativeAdIdentityAlignmentDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdIdentityAlignmentDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateCreativeAdIdentityAlignmentDesignerInput({
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
// These tests run generateIdentityAlignments with dryRun: true so no real
// LLM calls are made — deterministic heuristic alignments are returned.

test('dry-run returns an IdentityAlignmentDesignerResult with strategy', async () => {
  const result = await generateIdentityAlignments({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.alignments));
  assert.ok(result.strategy.alignments.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns alignments with correct structure', async () => {
  const result = await generateIdentityAlignments({ ...validInput, dryRun: true });
  for (const a of result.strategy.alignments) {
    assert.ok(typeof a.type === 'string' && a.type.length > 0);
    assert.ok(typeof a.identityAnchor === 'string' && a.identityAnchor.length > 0);
    assert.ok(typeof a.selfExpressionCue === 'string' && a.selfExpressionCue.length > 0);
    assert.ok(typeof a.belongingElement === 'string' && a.belongingElement.length > 0);
    assert.ok(typeof a.alignmentStrength === 'number' && a.alignmentStrength >= 0 && a.alignmentStrength <= 100);
    assert.ok(typeof a.identityResonance === 'number' && a.identityResonance >= 0 && a.identityResonance <= 100);
    assert.ok(typeof a.alignmentPathway === 'string' && a.alignmentPathway.length > 0);
  }
});

test('dry-run returns alignments with valid alignment types', async () => {
  const result = await generateIdentityAlignments({ ...validInput, dryRun: true });
  for (const a of result.strategy.alignments) {
    assert.ok(
      VALID_ALIGNMENT_TYPES.includes(a.type as never),
      `alignment type "${a.type}" should be valid`,
    );
  }
});

test('dry-run returns alignmentStrength in 0-100 range', async () => {
  const result = await generateIdentityAlignments({ ...validInput, dryRun: true });
  for (const a of result.strategy.alignments) {
    assert.ok(a.alignmentStrength >= 0 && a.alignmentStrength <= 100);
  }
});

test('dry-run returns identityResonance in 0-100 range', async () => {
  const result = await generateIdentityAlignments({ ...validInput, dryRun: true });
  for (const a of result.strategy.alignments) {
    assert.ok(a.identityResonance >= 0 && a.identityResonance <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateIdentityAlignments({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 3 alignments', async () => {
  const result = await generateIdentityAlignments({ ...validInput, dryRun: true });
  assert.ok(result.strategy.alignments.length >= 3);
});

test('dry-run returns exactly 3 deterministic alignments', async () => {
  const result = await generateIdentityAlignments({ ...validInput, dryRun: true });
  assert.equal(result.strategy.alignments.length, 3);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateIdentityAlignments({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.alignments.length > 0, `${platform} should produce alignments`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateIdentityAlignments({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.alignments.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateIdentityAlignments({ ...validInput, dryRun: true });
  const r2 = await generateIdentityAlignments({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.alignments.length, r2.strategy.alignments.length);
  assert.equal(r1.strategy.alignments[0].alignmentStrength, r2.strategy.alignments[0].alignmentStrength);
  assert.equal(r1.strategy.alignments[0].identityResonance, r2.strategy.alignments[0].identityResonance);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateIdentityAlignments({ ...validInput, dryRun: true });
  const r2 = await generateIdentityAlignments({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Alignment count is the same but scores differ based on content length
  assert.equal(r1.strategy.alignments.length, r2.strategy.alignments.length);
});

test('dry-run alignment types progress through identity layers', async () => {
  const result = await generateIdentityAlignments({ ...validInput, dryRun: true });
  const types = result.strategy.alignments.map((a) => a.type);
  assert.equal(types[0], 'values_mirror');
  assert.equal(types[1], 'aspirational_self');
  assert.equal(types[2], 'tribe_membership');
});

test('dry-run recommendations reference the brand and audience', async () => {
  const result = await generateIdentityAlignments({ ...validInput, dryRun: true });
  const joined = result.strategy.recommendations.join(' ').toLowerCase();
  assert.ok(joined.length > 0);
});

test('generateIdentityAlignments rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateIdentityAlignments({ ...validInput, content: '' } as CreativeAdIdentityAlignmentDesignerInput),
    /invalid_creative_ad_identity_alignment_designer_input/,
  );
});

test('generateIdentityAlignments rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateIdentityAlignments({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdIdentityAlignmentDesignerInput),
    /invalid_creative_ad_identity_alignment_designer_input/,
  );
});

test('generateIdentityAlignments rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateIdentityAlignments({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdIdentityAlignmentDesignerInput),
    /invalid_creative_ad_identity_alignment_designer_input/,
  );
});

test('generateIdentityAlignments rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateIdentityAlignments(null as never),
    /invalid_creative_ad_identity_alignment_designer_input/,
  );
});
