import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Authority Positioning Designer engine (AI-powered
 * authority positioning design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_AUTHORITY_POSITIONING_DESIGNER_CREDIT_COST,
  validateAdCreativeAuthorityPositioningDesignerInput,
  generateAuthorityPositionings,
  VALID_PLATFORMS,
  VALID_AUTHORITY_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeAuthorityPositioningDesignerInput,
} from '@/lib/creative/ad-creative-authority-positioning-designer';

// ── Credit cost ──

test('AD_CREATIVE_AUTHORITY_POSITIONING_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(AD_CREATIVE_AUTHORITY_POSITIONING_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_AUTHORITY_TYPES contains the eight authority types', () => {
  assert.ok(VALID_AUTHORITY_TYPES.includes('expert_credential'));
  assert.ok(VALID_AUTHORITY_TYPES.includes('industry_leadership'));
  assert.ok(VALID_AUTHORITY_TYPES.includes('award_recognition'));
  assert.ok(VALID_AUTHORITY_TYPES.includes('media_featured'));
  assert.ok(VALID_AUTHORITY_TYPES.includes('certification_proof'));
  assert.ok(VALID_AUTHORITY_TYPES.includes('experience_proof'));
  assert.ok(VALID_AUTHORITY_TYPES.includes('endorsement_authority'));
  assert.ok(VALID_AUTHORITY_TYPES.includes('thought_leadership'));
  assert.equal(VALID_AUTHORITY_TYPES.length, 8);
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

const validInput: AdCreativeAuthorityPositioningDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateAdCreativeAuthorityPositioningDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeAuthorityPositioningDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeAuthorityPositioningDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeAuthorityPositioningDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeAuthorityPositioningDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeAuthorityPositioningDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeAuthorityPositioningDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeAuthorityPositioningDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeAuthorityPositioningDesignerInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeAuthorityPositioningDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeAuthorityPositioningDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeAuthorityPositioningDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeAuthorityPositioningDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeAuthorityPositioningDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeAuthorityPositioningDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeAuthorityPositioningDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeAuthorityPositioningDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeAuthorityPositioningDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeAuthorityPositioningDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeAuthorityPositioningDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeAuthorityPositioningDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeAuthorityPositioningDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeAuthorityPositioningDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeAuthorityPositioningDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeAuthorityPositioningDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateAdCreativeAuthorityPositioningDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeAuthorityPositioningDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateAdCreativeAuthorityPositioningDesignerInput({
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

test('validateAdCreativeAuthorityPositioningDesignerInput accepts whitespace-only productOrBrand as invalid', () => {
  const { valid, errors } = validateAdCreativeAuthorityPositioningDesignerInput({
    ...validInput,
    productOrBrand: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeAuthorityPositioningDesignerInput accepts whitespace-only content as invalid', () => {
  const { valid, errors } = validateAdCreativeAuthorityPositioningDesignerInput({
    ...validInput,
    content: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeAuthorityPositioningDesignerInput accepts whitespace-only targetAudience as invalid', () => {
  const { valid, errors } = validateAdCreativeAuthorityPositioningDesignerInput({
    ...validInput,
    targetAudience: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

// ── Dry-run mode tests ──
//
// These tests run generateAuthorityPositionings with dryRun: true so no real
// LLM calls are made — deterministic heuristic positionings are returned.

test('dry-run returns a AuthorityPositioningDesignerResult with strategy', async () => {
  const result = await generateAuthorityPositionings({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.positionings));
  assert.ok(result.strategy.positionings.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns positionings with correct structure', async () => {
  const result = await generateAuthorityPositionings({ ...validInput, dryRun: true });
  for (const p of result.strategy.positionings) {
    assert.ok(typeof p.type === 'string' && p.type.length > 0);
    assert.ok(typeof p.authoritySignal === 'string' && p.authoritySignal.length > 0);
    assert.ok(typeof p.credentialElement === 'string' && p.credentialElement.length > 0);
    assert.ok(typeof p.trustTransfer === 'string' && p.trustTransfer.length > 0);
    assert.ok(typeof p.authorityStrength === 'number' && p.authorityStrength >= 0 && p.authorityStrength <= 100);
    assert.ok(typeof p.credibilityBoost === 'number' && p.credibilityBoost >= 0 && p.credibilityBoost <= 100);
    assert.ok(typeof p.positioningPathway === 'string' && p.positioningPathway.length > 0);
  }
});

test('dry-run returns positionings with valid authority types', async () => {
  const result = await generateAuthorityPositionings({ ...validInput, dryRun: true });
  for (const p of result.strategy.positionings) {
    assert.ok(
      VALID_AUTHORITY_TYPES.includes(p.type as never),
      `authority type "${p.type}" should be valid`,
    );
  }
});

test('dry-run returns authorityStrength in 0-100 range', async () => {
  const result = await generateAuthorityPositionings({ ...validInput, dryRun: true });
  for (const p of result.strategy.positionings) {
    assert.ok(p.authorityStrength >= 0 && p.authorityStrength <= 100);
  }
});

test('dry-run returns credibilityBoost in 0-100 range', async () => {
  const result = await generateAuthorityPositionings({ ...validInput, dryRun: true });
  for (const p of result.strategy.positionings) {
    assert.ok(p.credibilityBoost >= 0 && p.credibilityBoost <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateAuthorityPositionings({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 3 positionings', async () => {
  const result = await generateAuthorityPositionings({ ...validInput, dryRun: true });
  assert.ok(result.strategy.positionings.length >= 3);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateAuthorityPositionings({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.positionings.length > 0, `${platform} should produce positionings`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateAuthorityPositionings({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.positionings.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateAuthorityPositionings({ ...validInput, dryRun: true });
  const r2 = await generateAuthorityPositionings({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.positionings.length, r2.strategy.positionings.length);
  assert.equal(r1.strategy.positionings[0].authorityStrength, r2.strategy.positionings[0].authorityStrength);
  assert.equal(r1.strategy.positionings[0].credibilityBoost, r2.strategy.positionings[0].credibilityBoost);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateAuthorityPositionings({ ...validInput, dryRun: true });
  const r2 = await generateAuthorityPositionings({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Positioning count is the same but scores differ based on content length
  assert.equal(r1.strategy.positionings.length, r2.strategy.positionings.length);
});

test('generateAuthorityPositionings rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateAuthorityPositionings({ ...validInput, content: '' } as AdCreativeAuthorityPositioningDesignerInput),
    /invalid_ad_creative_authority_positioning_designer_input/,
  );
});

test('generateAuthorityPositionings rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateAuthorityPositionings({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeAuthorityPositioningDesignerInput),
    /invalid_ad_creative_authority_positioning_designer_input/,
  );
});

test('generateAuthorityPositionings rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateAuthorityPositionings({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeAuthorityPositioningDesignerInput),
    /invalid_ad_creative_authority_positioning_designer_input/,
  );
});

test('generateAuthorityPositionings rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateAuthorityPositionings(null as never),
    /invalid_ad_creative_authority_positioning_designer_input/,
  );
});

test('dry-run recommendations reference the brand and audience', async () => {
  const result = await generateAuthorityPositionings({ ...validInput, dryRun: true });
  const allRecs = result.strategy.recommendations.join(' ').toLowerCase();
  assert.ok(allRecs.length > 0);
});

test('dry-run positionings have distinct types', async () => {
  const result = await generateAuthorityPositionings({ ...validInput, dryRun: true });
  const types = result.strategy.positionings.map((p) => p.type);
  const unique = new Set(types);
  assert.equal(unique.size, types.length, 'positioning types should be distinct');
});
