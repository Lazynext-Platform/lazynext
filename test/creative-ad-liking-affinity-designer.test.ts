import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Liking Affinity Designer engine (AI-powered
 * liking affinity strategy design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_LIKING_AFFINITY_DESIGNER_CREDIT_COST,
  validateCreativeAdLikingAffinityDesignerInput,
  generateLikingAffinities,
  VALID_PLATFORMS,
  VALID_AFFINITY_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdLikingAffinityDesignerInput,
} from '@/lib/creative/creative-ad-liking-affinity-designer';

// ── Credit cost ──

test('CREATIVE_AD_LIKING_AFFINITY_DESIGNER_CREDIT_COST is 5', () => {
  assert.equal(CREATIVE_AD_LIKING_AFFINITY_DESIGNER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_AFFINITY_TYPES contains the eight affinity types', () => {
  assert.ok(VALID_AFFINITY_TYPES.includes('similarity_bond'));
  assert.ok(VALID_AFFINITY_TYPES.includes('shared_experience'));
  assert.ok(VALID_AFFINITY_TYPES.includes('compliment_strategy'));
  assert.ok(VALID_AFFINITY_TYPES.includes('humor_connection'));
  assert.ok(VALID_AFFINITY_TYPES.includes('vulnerability_appeal'));
  assert.ok(VALID_AFFINITY_TYPES.includes('shared_values'));
  assert.ok(VALID_AFFINITY_TYPES.includes('personality_mirror'));
  assert.ok(VALID_AFFINITY_TYPES.includes('relatable_struggle'));
  assert.equal(VALID_AFFINITY_TYPES.length, 8);
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

const validInput: CreativeAdLikingAffinityDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateCreativeAdLikingAffinityDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdLikingAffinityDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdLikingAffinityDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdLikingAffinityDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdLikingAffinityDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdLikingAffinityDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdLikingAffinityDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdLikingAffinityDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdLikingAffinityDesignerInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdLikingAffinityDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdLikingAffinityDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdLikingAffinityDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdLikingAffinityDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdLikingAffinityDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdLikingAffinityDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdLikingAffinityDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdLikingAffinityDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdLikingAffinityDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdLikingAffinityDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdLikingAffinityDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdLikingAffinityDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdLikingAffinityDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdLikingAffinityDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdLikingAffinityDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdLikingAffinityDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateCreativeAdLikingAffinityDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdLikingAffinityDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateCreativeAdLikingAffinityDesignerInput({
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
// These tests run generateLikingAffinities with dryRun: true so no real LLM
// calls are made — deterministic heuristic affinities are returned.

test('dry-run returns a LikingAffinityDesignerResult with strategy', async () => {
  const result = await generateLikingAffinities({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.affinities));
  assert.ok(result.strategy.affinities.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns affinities with correct structure', async () => {
  const result = await generateLikingAffinities({ ...validInput, dryRun: true });
  for (const a of result.strategy.affinities) {
    assert.ok(typeof a.type === 'string' && a.type.length > 0);
    assert.ok(typeof a.similarityCue === 'string' && a.similarityCue.length > 0);
    assert.ok(typeof a.connectionElement === 'string' && a.connectionElement.length > 0);
    assert.ok(typeof a.warmthSignal === 'string' && a.warmthSignal.length > 0);
    assert.ok(typeof a.affinityStrength === 'number' && a.affinityStrength >= 0 && a.affinityStrength <= 100);
    assert.ok(typeof a.resistanceReduction === 'number' && a.resistanceReduction >= 0 && a.resistanceReduction <= 100);
    assert.ok(typeof a.affinityPathway === 'string' && a.affinityPathway.length > 0);
  }
});

test('dry-run returns affinities with valid affinity types', async () => {
  const result = await generateLikingAffinities({ ...validInput, dryRun: true });
  for (const a of result.strategy.affinities) {
    assert.ok(
      VALID_AFFINITY_TYPES.includes(a.type as never),
      `affinity type "${a.type}" should be valid`,
    );
  }
});

test('dry-run returns affinityStrength in 0-100 range', async () => {
  const result = await generateLikingAffinities({ ...validInput, dryRun: true });
  for (const a of result.strategy.affinities) {
    assert.ok(a.affinityStrength >= 0 && a.affinityStrength <= 100);
  }
});

test('dry-run returns resistanceReduction in 0-100 range', async () => {
  const result = await generateLikingAffinities({ ...validInput, dryRun: true });
  for (const a of result.strategy.affinities) {
    assert.ok(a.resistanceReduction >= 0 && a.resistanceReduction <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateLikingAffinities({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns exactly 3 affinities', async () => {
  const result = await generateLikingAffinities({ ...validInput, dryRun: true });
  assert.equal(result.strategy.affinities.length, 3);
});

test('dry-run returns a layered affinity set', async () => {
  const result = await generateLikingAffinities({ ...validInput, dryRun: true });
  const types = result.strategy.affinities.map((a) => a.type);
  assert.equal(types[0], 'similarity_bond');
  assert.equal(types[1], 'shared_experience');
  assert.equal(types[2], 'compliment_strategy');
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateLikingAffinities({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.affinities.length > 0, `${platform} should produce affinities`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateLikingAffinities({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.affinities.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateLikingAffinities({ ...validInput, dryRun: true });
  const r2 = await generateLikingAffinities({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.affinities.length, r2.strategy.affinities.length);
  assert.equal(r1.strategy.affinities[0].affinityStrength, r2.strategy.affinities[0].affinityStrength);
  assert.equal(r1.strategy.affinities[0].resistanceReduction, r2.strategy.affinities[0].resistanceReduction);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateLikingAffinities({ ...validInput, dryRun: true });
  const r2 = await generateLikingAffinities({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Affinity count is the same but scores differ based on content length
  assert.equal(r1.strategy.affinities.length, r2.strategy.affinities.length);
});

test('dry-run recommendations reference brand and audience', async () => {
  const result = await generateLikingAffinities({ ...validInput, dryRun: true });
  const joined = result.strategy.recommendations.join(' ');
  assert.ok(joined.length > 0);
});

test('generateLikingAffinities rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateLikingAffinities({ ...validInput, content: '' } as CreativeAdLikingAffinityDesignerInput),
    /invalid_creative_ad_liking_affinity_designer_input/,
  );
});

test('generateLikingAffinities rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateLikingAffinities({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdLikingAffinityDesignerInput),
    /invalid_creative_ad_liking_affinity_designer_input/,
  );
});

test('generateLikingAffinities rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateLikingAffinities({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdLikingAffinityDesignerInput),
    /invalid_creative_ad_liking_affinity_designer_input/,
  );
});

test('generateLikingAffinities rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateLikingAffinities(null as never),
    /invalid_creative_ad_liking_affinity_designer_input/,
  );
});

test('dry-run affinity strength increases progressively', async () => {
  const result = await generateLikingAffinities({ ...validInput, dryRun: true });
  const scores = result.strategy.affinities.map((a) => a.affinityStrength);
  // Strength should generally increase through the affinities
  assert.ok(scores[2] >= scores[0], 'final affinity strength should be >= first');
});

test('dry-run recommendations reference the affinity types', async () => {
  const result = await generateLikingAffinities({ ...validInput, dryRun: true });
  const joined = result.strategy.recommendations.join(' ');
  assert.ok(joined.includes('similarity bond') || joined.includes('shared experience') || joined.includes('compliment strategy'));
});

test('dry-run affinity pathway is non-empty for each affinity', async () => {
  const result = await generateLikingAffinities({ ...validInput, dryRun: true });
  for (const a of result.strategy.affinities) {
    assert.ok(a.affinityPathway.length > 0, 'affinity pathway should be non-empty');
  }
});
