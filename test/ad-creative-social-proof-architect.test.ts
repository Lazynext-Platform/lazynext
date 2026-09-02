import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Social Proof Architect engine (AI-powered social
 * proof element architecture for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_SOCIAL_PROOF_ARCHITECT_CREDIT_COST,
  validateAdCreativeSocialProofArchitectInput,
  generateSocialProofArchitecture,
  VALID_PLATFORMS,
  VALID_PROOF_TYPES,
  VALID_IMPACTS,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  MAX_CONTENT_LENGTH,
  type AdCreativeSocialProofArchitectInput,
} from '@/lib/creative/ad-creative-social-proof-architect';

// ── Credit cost ──

test('AD_CREATIVE_SOCIAL_PROOF_ARCHITECT_CREDIT_COST is 5', () => {
  assert.equal(AD_CREATIVE_SOCIAL_PROOF_ARCHITECT_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_PROOF_TYPES contains the eight proof types', () => {
  assert.ok(VALID_PROOF_TYPES.includes('testimonial'));
  assert.ok(VALID_PROOF_TYPES.includes('user_count'));
  assert.ok(VALID_PROOF_TYPES.includes('rating'));
  assert.ok(VALID_PROOF_TYPES.includes('expert_endorsement'));
  assert.ok(VALID_PROOF_TYPES.includes('media_coverage'));
  assert.ok(VALID_PROOF_TYPES.includes('peer_proof'));
  assert.ok(VALID_PROOF_TYPES.includes('certification'));
  assert.ok(VALID_PROOF_TYPES.includes('before_after'));
  assert.equal(VALID_PROOF_TYPES.length, 8);
});

test('VALID_IMPACTS contains the three impact levels', () => {
  assert.ok(VALID_IMPACTS.includes('low'));
  assert.ok(VALID_IMPACTS.includes('medium'));
  assert.ok(VALID_IMPACTS.includes('high'));
  assert.equal(VALID_IMPACTS.length, 3);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_AUDIENCE_LENGTH is 2000', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 2000);
});

test('MAX_CONTENT_LENGTH is 2000', () => {
  assert.equal(MAX_CONTENT_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: AdCreativeSocialProofArchitectInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  targetAudience: 'Women 25-40 interested in anti-aging skincare',
  content: 'Promote our new vitamin C serum with a focus on brightening results and trust-building.',
  platform: 'tiktok',
};

test('validateAdCreativeSocialProofArchitectInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeSocialProofArchitectInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeSocialProofArchitectInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeSocialProofArchitectInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeSocialProofArchitectInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeSocialProofArchitectInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeSocialProofArchitectInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeSocialProofArchitectInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeSocialProofArchitectInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeSocialProofArchitectInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeSocialProofArchitectInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeSocialProofArchitectInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeSocialProofArchitectInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeSocialProofArchitectInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeSocialProofArchitectInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeSocialProofArchitectInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeSocialProofArchitectInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeSocialProofArchitectInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeSocialProofArchitectInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeSocialProofArchitectInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeSocialProofArchitectInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeSocialProofArchitectInput({
    productOrBrand: 'A fitness app',
    targetAudience: 'Busy professionals aged 30-45',
    content: 'Drive app installs with a focus on convenience and results.',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeSocialProofArchitectInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeSocialProofArchitectInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeSocialProofArchitectInput accepts undefined platform', () => {
  const { valid, errors } = validateAdCreativeSocialProofArchitectInput({
    productOrBrand: 'A fitness app',
    targetAudience: 'Busy professionals aged 30-45',
    content: 'Drive app installs with a focus on convenience and results.',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeSocialProofArchitectInput accepts dryRun boolean', () => {
  const { valid, errors } = validateAdCreativeSocialProofArchitectInput({
    ...validInput,
    dryRun: true,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateSocialProofArchitecture with dryRun: true so no
// real LLM calls are made — deterministic heuristic architecture is returned.

test('dry-run returns a SocialProofArchitectResult with architecture', async () => {
  const result = await generateSocialProofArchitecture({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.architecture);
  assert.ok(Array.isArray(result.architecture.elements));
  assert.ok(Array.isArray(result.architecture.strategies));
  assert.ok(Array.isArray(result.architecture.recommendations));
  assert.equal(result.dryRun, true);
});

test('dry-run returns elements with correct structure', async () => {
  const result = await generateSocialProofArchitecture({ ...validInput, dryRun: true });
  assert.ok(result.architecture.elements.length > 0);
  for (const el of result.architecture.elements) {
    assert.ok(typeof el.type === 'string' && el.type.length > 0);
    assert.ok(typeof el.content === 'string' && el.content.length > 0);
    assert.ok(typeof el.credibilityScore === 'number');
    assert.ok(el.credibilityScore >= 0 && el.credibilityScore <= 100);
    assert.ok(typeof el.placement === 'string' && el.placement.length > 0);
    assert.ok(typeof el.authenticityNote === 'string' && el.authenticityNote.length > 0);
  }
});

test('dry-run returns elements with valid proof types', async () => {
  const result = await generateSocialProofArchitecture({ ...validInput, dryRun: true });
  for (const el of result.architecture.elements) {
    assert.ok(VALID_PROOF_TYPES.includes(el.type as never), `${el.type} should be a valid proof type`);
  }
});

test('dry-run returns credibilityScore in 0-100 range', async () => {
  const result = await generateSocialProofArchitecture({ ...validInput, dryRun: true });
  for (const el of result.architecture.elements) {
    assert.ok(el.credibilityScore >= 0 && el.credibilityScore <= 100);
  }
});

test('dry-run returns strategies with correct structure', async () => {
  const result = await generateSocialProofArchitecture({ ...validInput, dryRun: true });
  assert.ok(result.architecture.strategies.length > 0);
  for (const s of result.architecture.strategies) {
    assert.ok(typeof s.strategy === 'string' && s.strategy.length > 0);
    assert.ok(typeof s.proofType === 'string' && s.proofType.length > 0);
    assert.ok(typeof s.implementation === 'string' && s.implementation.length > 0);
    assert.ok(VALID_IMPACTS.includes(s.expectedImpact));
    assert.ok(typeof s.integration === 'string' && s.integration.length > 0);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateSocialProofArchitecture({ ...validInput, dryRun: true });
  assert.ok(result.architecture.recommendations.length > 0);
  for (const rec of result.architecture.recommendations) {
    assert.ok(typeof rec === 'string' && rec.length > 0);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateSocialProofArchitecture({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.architecture.elements.length > 0, `${platform} should produce elements`);
    assert.ok(result.architecture.strategies.length > 0, `${platform} should produce strategies`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateSocialProofArchitecture({
    productOrBrand: 'A fitness app',
    targetAudience: 'Busy professionals',
    content: 'Drive app installs.',
    dryRun: true,
  });
  assert.ok(result.architecture.elements.length > 0);
  assert.ok(result.architecture.strategies.length > 0);
});

test('dry-run is deterministic for the same input', async () => {
  const a = await generateSocialProofArchitecture({ ...validInput, dryRun: true });
  const b = await generateSocialProofArchitecture({ ...validInput, dryRun: true });
  assert.deepEqual(a.architecture.elements.length, b.architecture.elements.length);
  assert.deepEqual(a.architecture.strategies.length, b.architecture.strategies.length);
  assert.deepEqual(a.architecture.recommendations, b.architecture.recommendations);
});

test('dry-run produces at least 4 strategies', async () => {
  const result = await generateSocialProofArchitecture({ ...validInput, dryRun: true });
  assert.ok(result.architecture.strategies.length >= 4);
});

test('dry-run produces at least 8 elements (one per proof type)', async () => {
  const result = await generateSocialProofArchitecture({ ...validInput, dryRun: true });
  assert.ok(result.architecture.elements.length >= 8);
});

test('dry-run includes at least one high-impact strategy', async () => {
  const result = await generateSocialProofArchitecture({ ...validInput, dryRun: true });
  const highImpact = result.architecture.strategies.filter((s) => s.expectedImpact === 'high');
  assert.ok(highImpact.length >= 1);
});

test('generateSocialProofArchitecture rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateSocialProofArchitecture({ ...validInput, content: '' } as AdCreativeSocialProofArchitectInput),
    /invalid_ad_creative_social_proof_architect_input/,
  );
});

test('generateSocialProofArchitecture rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateSocialProofArchitecture({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeSocialProofArchitectInput),
    /invalid_ad_creative_social_proof_architect_input/,
  );
});

test('generateSocialProofArchitecture rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateSocialProofArchitecture({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeSocialProofArchitectInput),
    /invalid_ad_creative_social_proof_architect_input/,
  );
});

test('generateSocialProofArchitecture rejects over-length content in dry-run mode', async () => {
  await assert.rejects(
    () => generateSocialProofArchitecture({ ...validInput, content: 'x'.repeat(MAX_CONTENT_LENGTH + 1), dryRun: true } as AdCreativeSocialProofArchitectInput),
    /invalid_ad_creative_social_proof_architect_input/,
  );
});

test('generateSocialProofArchitecture rejects over-length productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateSocialProofArchitecture({ ...validInput, productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1), dryRun: true } as AdCreativeSocialProofArchitectInput),
    /invalid_ad_creative_social_proof_architect_input/,
  );
});

test('generateSocialProofArchitecture rejects over-length targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateSocialProofArchitecture({ ...validInput, targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1), dryRun: true } as AdCreativeSocialProofArchitectInput),
    /invalid_ad_creative_social_proof_architect_input/,
  );
});
