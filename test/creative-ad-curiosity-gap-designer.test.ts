import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad Curiosity Gap Designer engine (AI-powered
 * curiosity gap design in ad creative content for maximum viewer engagement).
 *
 * Tests cover input validation, credit cost, constants, and dry-run mode (no
 * real LLM calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_CURIOSITY_GAP_DESIGNER_CREDIT_COST,
  validateCreativeAdCuriosityGapDesignerInput,
  generateCuriosityGaps,
  VALID_PLATFORMS,
  VALID_GAP_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdCuriosityGapDesignerInput,
} from '@/lib/creative/creative-ad-curiosity-gap-designer';

// ── Credit cost ──

test('CREATIVE_AD_CURIOSITY_GAP_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(CREATIVE_AD_CURIOSITY_GAP_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_GAP_TYPES contains the eight gap types', () => {
  assert.ok(VALID_GAP_TYPES.includes('information_gap'));
  assert.ok(VALID_GAP_TYPES.includes('mystery_box'));
  assert.ok(VALID_GAP_TYPES.includes('partial_reveal'));
  assert.ok(VALID_GAP_TYPES.includes('question_hook'));
  assert.ok(VALID_GAP_TYPES.includes('countdown_tease'));
  assert.ok(VALID_GAP_TYPES.includes('transformation_tease'));
  assert.ok(VALID_GAP_TYPES.includes('secret_reveal'));
  assert.ok(VALID_GAP_TYPES.includes('what_happens_next'));
  assert.equal(VALID_GAP_TYPES.length, 8);
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

const validInput: CreativeAdCuriosityGapDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateCreativeAdCuriosityGapDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdCuriosityGapDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdCuriosityGapDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdCuriosityGapDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdCuriosityGapDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdCuriosityGapDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdCuriosityGapDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdCuriosityGapDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdCuriosityGapDesignerInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdCuriosityGapDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdCuriosityGapDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdCuriosityGapDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdCuriosityGapDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdCuriosityGapDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdCuriosityGapDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdCuriosityGapDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdCuriosityGapDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdCuriosityGapDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdCuriosityGapDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdCuriosityGapDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdCuriosityGapDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdCuriosityGapDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Fitness enthusiasts 18-35',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdCuriosityGapDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdCuriosityGapDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdCuriosityGapDesignerInput accepts undefined platform', () => {
  const { valid, errors } = validateCreativeAdCuriosityGapDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Fitness enthusiasts 18-35',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdCuriosityGapDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateCreativeAdCuriosityGapDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdCuriosityGapDesignerInput accepts dryRun true', () => {
  const { valid, errors } = validateCreativeAdCuriosityGapDesignerInput({
    ...validInput,
    dryRun: true,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateCuriosityGaps with dryRun: true so no real LLM
// calls are made — deterministic heuristic curiosity gaps are returned.

test('dry-run returns a CuriosityGapDesignerResult with strategy', async () => {
  const result = await generateCuriosityGaps({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.gaps));
  assert.ok(result.strategy.gaps.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns gaps with correct structure', async () => {
  const result = await generateCuriosityGaps({ ...validInput, dryRun: true });
  for (const g of result.strategy.gaps) {
    assert.ok(typeof g.type === 'string' && g.type.length > 0);
    assert.ok(VALID_GAP_TYPES.includes(g.type as never));
    assert.ok(typeof g.opening === 'string' && g.opening.length > 0);
    assert.ok(typeof g.tease === 'string' && g.tease.length > 0);
    assert.ok(typeof g.resolutionTiming === 'string' && g.resolutionTiming.length > 0);
    assert.ok(
      typeof g.curiosityScore === 'number' && g.curiosityScore >= 0 && g.curiosityScore <= 100,
    );
    assert.ok(typeof g.engagementStrategy === 'string' && g.engagementStrategy.length > 0);
    assert.ok(typeof g.payoff === 'string' && g.payoff.length > 0);
  }
});

test('dry-run returns curiosityScore in 0-100 range', async () => {
  const result = await generateCuriosityGaps({ ...validInput, dryRun: true });
  for (const g of result.strategy.gaps) {
    assert.ok(g.curiosityScore >= 0 && g.curiosityScore <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateCuriosityGaps({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const rec of result.strategy.recommendations) {
    assert.ok(typeof rec === 'string' && rec.length > 0);
  }
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateCuriosityGaps({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.gaps.length > 0, `${platform} should produce gaps`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateCuriosityGaps({
    productOrBrand: validInput.productOrBrand,
    content: validInput.content,
    targetAudience: validInput.targetAudience,
    dryRun: true,
  });
  assert.ok(result.strategy.gaps.length > 0);
});

test('dry-run produces deterministic output for same input', async () => {
  const r1 = await generateCuriosityGaps({ ...validInput, dryRun: true });
  const r2 = await generateCuriosityGaps({ ...validInput, dryRun: true });
  assert.deepEqual(r1, r2);
});

test('dry-run gaps include question_hook type', async () => {
  const result = await generateCuriosityGaps({ ...validInput, dryRun: true });
  const types = result.strategy.gaps.map((g) => g.type);
  assert.ok(types.includes('question_hook'));
});

test('dry-run gaps include mystery_box type', async () => {
  const result = await generateCuriosityGaps({ ...validInput, dryRun: true });
  const types = result.strategy.gaps.map((g) => g.type);
  assert.ok(types.includes('mystery_box'));
});

test('dry-run gaps include partial_reveal type', async () => {
  const result = await generateCuriosityGaps({ ...validInput, dryRun: true });
  const types = result.strategy.gaps.map((g) => g.type);
  assert.ok(types.includes('partial_reveal'));
});

test('dry-run gaps include transformation_tease type', async () => {
  const result = await generateCuriosityGaps({ ...validInput, dryRun: true });
  const types = result.strategy.gaps.map((g) => g.type);
  assert.ok(types.includes('transformation_tease'));
});

test('dry-run gaps include secret_reveal type', async () => {
  const result = await generateCuriosityGaps({ ...validInput, dryRun: true });
  const types = result.strategy.gaps.map((g) => g.type);
  assert.ok(types.includes('secret_reveal'));
});

test('dry-run gaps all have valid gap types', async () => {
  const result = await generateCuriosityGaps({ ...validInput, dryRun: true });
  for (const g of result.strategy.gaps) {
    assert.ok(
      VALID_GAP_TYPES.includes(g.type as never),
      `gap type ${g.type} should be valid`,
    );
  }
});

test('dry-run curiosity score increases with longer content', async () => {
  const shortResult = await generateCuriosityGaps({
    ...validInput,
    content: 'short ad',
    dryRun: true,
  });
  const longResult = await generateCuriosityGaps({
    ...validInput,
    content: 'x'.repeat(800),
    dryRun: true,
  });
  const shortAvg =
    shortResult.strategy.gaps.reduce((s, g) => s + g.curiosityScore, 0) /
    shortResult.strategy.gaps.length;
  const longAvg =
    longResult.strategy.gaps.reduce((s, g) => s + g.curiosityScore, 0) /
    longResult.strategy.gaps.length;
  assert.ok(
    longAvg >= shortAvg,
    'longer content should not produce a lower average curiosity score',
  );
});

test('generateCuriosityGaps rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generateCuriosityGaps({ ...validInput, content: '' } as CreativeAdCuriosityGapDesignerInput),
    /invalid_creative_ad_curiosity_gap_designer_input/,
  );
});

test('generateCuriosityGaps rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generateCuriosityGaps({
        ...validInput,
        productOrBrand: '',
        dryRun: true,
      } as CreativeAdCuriosityGapDesignerInput),
    /invalid_creative_ad_curiosity_gap_designer_input/,
  );
});

test('generateCuriosityGaps rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generateCuriosityGaps({
        ...validInput,
        targetAudience: '',
        dryRun: true,
      } as CreativeAdCuriosityGapDesignerInput),
    /invalid_creative_ad_curiosity_gap_designer_input/,
  );
});

test('generateCuriosityGaps rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateCuriosityGaps(null as never),
    /invalid_creative_ad_curiosity_gap_designer_input/,
  );
});

test('generateCuriosityGaps rejects invalid platform in dry-run mode', async () => {
  await assert.rejects(
    () =>
      generateCuriosityGaps({
        ...validInput,
        platform: 'snapchat',
        dryRun: true,
      } as CreativeAdCuriosityGapDesignerInput),
    /invalid_creative_ad_curiosity_gap_designer_input/,
  );
});

test('dry-run produces at least 5 gaps', async () => {
  const result = await generateCuriosityGaps({ ...validInput, dryRun: true });
  assert.ok(result.strategy.gaps.length >= 5, 'should produce at least 5 curiosity gaps');
});

test('dry-run recommendations reference the brand', async () => {
  const result = await generateCuriosityGaps({ ...validInput, dryRun: true });
  const allRecs = result.strategy.recommendations.join(' ').toLowerCase();
  assert.ok(
    allRecs.includes('brand') || allRecs.includes('skincare'),
    'recommendations should reference the brand',
  );
});
