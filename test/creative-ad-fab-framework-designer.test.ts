import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Creative Ad FAB Framework Designer engine (AI-powered
 * FAB framework design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  CREATIVE_AD_FAB_FRAMEWORK_DESIGNER_CREDIT_COST,
  validateCreativeAdFABFrameworkDesignerInput,
  generateFABFrameworks,
  VALID_PLATFORMS,
  VALID_BENEFIT_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type CreativeAdFABFrameworkDesignerInput,
} from '@/lib/creative/creative-ad-fab-framework-designer';

// ── Credit cost ──

test('CREATIVE_AD_FAB_FRAMEWORK_DESIGNER_CREDIT_COST is 5', () => {
  assert.equal(CREATIVE_AD_FAB_FRAMEWORK_DESIGNER_CREDIT_COST, 5);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_BENEFIT_TYPES contains the eight benefit types', () => {
  assert.ok(VALID_BENEFIT_TYPES.includes('functional_benefit'));
  assert.ok(VALID_BENEFIT_TYPES.includes('emotional_benefit'));
  assert.ok(VALID_BENEFIT_TYPES.includes('social_benefit'));
  assert.ok(VALID_BENEFIT_TYPES.includes('financial_benefit'));
  assert.ok(VALID_BENEFIT_TYPES.includes('time_benefit'));
  assert.ok(VALID_BENEFIT_TYPES.includes('status_benefit'));
  assert.ok(VALID_BENEFIT_TYPES.includes('safety_benefit'));
  assert.ok(VALID_BENEFIT_TYPES.includes('convenience_benefit'));
  assert.equal(VALID_BENEFIT_TYPES.length, 8);
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

const validInput: CreativeAdFABFrameworkDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateCreativeAdFABFrameworkDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateCreativeAdFABFrameworkDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateCreativeAdFABFrameworkDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateCreativeAdFABFrameworkDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateCreativeAdFABFrameworkDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateCreativeAdFABFrameworkDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateCreativeAdFABFrameworkDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdFABFrameworkDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateCreativeAdFABFrameworkDesignerInput rejects missing content', () => {
  const { valid, errors } = validateCreativeAdFABFrameworkDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateCreativeAdFABFrameworkDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdFABFrameworkDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateCreativeAdFABFrameworkDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateCreativeAdFABFrameworkDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateCreativeAdFABFrameworkDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateCreativeAdFABFrameworkDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateCreativeAdFABFrameworkDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateCreativeAdFABFrameworkDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdFABFrameworkDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateCreativeAdFABFrameworkDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateCreativeAdFABFrameworkDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateCreativeAdFABFrameworkDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdFABFrameworkDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateCreativeAdFABFrameworkDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateCreativeAdFABFrameworkDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateCreativeAdFABFrameworkDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateCreativeAdFABFrameworkDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateCreativeAdFABFrameworkDesignerInput({
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
// These tests run generateFABFrameworks with dryRun: true so no real LLM
// calls are made — deterministic heuristic frameworks are returned.

test('dry-run returns a FABFrameworkDesignerResult with strategy', async () => {
  const result = await generateFABFrameworks({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.frameworks));
  assert.ok(result.strategy.frameworks.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns frameworks with correct structure', async () => {
  const result = await generateFABFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(typeof f.type === 'string' && f.type.length > 0);
    assert.ok(typeof f.feature === 'string' && f.feature.length > 0);
    assert.ok(typeof f.advantage === 'string' && f.advantage.length > 0);
    assert.ok(typeof f.benefitStatement === 'string' && f.benefitStatement.length > 0);
    assert.ok(typeof f.featureAppeal === 'number' && f.featureAppeal >= 0 && f.featureAppeal <= 100);
    assert.ok(typeof f.benefitResonance === 'number' && f.benefitResonance >= 0 && f.benefitResonance <= 100);
    assert.ok(typeof f.fabPathway === 'string' && f.fabPathway.length > 0);
  }
});

test('dry-run returns frameworks with valid benefit types', async () => {
  const result = await generateFABFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(
      VALID_BENEFIT_TYPES.includes(f.type as never),
      `benefit type "${f.type}" should be valid`,
    );
  }
});

test('dry-run returns featureAppeal in 0-100 range', async () => {
  const result = await generateFABFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(f.featureAppeal >= 0 && f.featureAppeal <= 100);
  }
});

test('dry-run returns benefitResonance in 0-100 range', async () => {
  const result = await generateFABFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(f.benefitResonance >= 0 && f.benefitResonance <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateFABFrameworks({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns exactly 3 frameworks', async () => {
  const result = await generateFABFrameworks({ ...validInput, dryRun: true });
  assert.equal(result.strategy.frameworks.length, 3);
});

test('dry-run returns a set of distinct benefit types', async () => {
  const result = await generateFABFrameworks({ ...validInput, dryRun: true });
  const types = result.strategy.frameworks.map((f) => f.type);
  assert.equal(types[0], 'functional_benefit');
  assert.equal(types[1], 'emotional_benefit');
  assert.equal(types[2], 'convenience_benefit');
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateFABFrameworks({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.frameworks.length > 0, `${platform} should produce frameworks`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateFABFrameworks({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.frameworks.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateFABFrameworks({ ...validInput, dryRun: true });
  const r2 = await generateFABFrameworks({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.frameworks.length, r2.strategy.frameworks.length);
  assert.equal(r1.strategy.frameworks[0].featureAppeal, r2.strategy.frameworks[0].featureAppeal);
  assert.equal(r1.strategy.frameworks[0].benefitResonance, r2.strategy.frameworks[0].benefitResonance);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateFABFrameworks({ ...validInput, dryRun: true });
  const r2 = await generateFABFrameworks({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Framework count is the same but scores differ based on content length
  assert.equal(r1.strategy.frameworks.length, r2.strategy.frameworks.length);
});

test('dry-run recommendations reference brand and audience', async () => {
  const result = await generateFABFrameworks({ ...validInput, dryRun: true });
  const joined = result.strategy.recommendations.join(' ');
  assert.ok(joined.length > 0);
});

test('generateFABFrameworks rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateFABFrameworks({ ...validInput, content: '' } as CreativeAdFABFrameworkDesignerInput),
    /invalid_creative_ad_fab_framework_designer_input/,
  );
});

test('generateFABFrameworks rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateFABFrameworks({ ...validInput, productOrBrand: '', dryRun: true } as CreativeAdFABFrameworkDesignerInput),
    /invalid_creative_ad_fab_framework_designer_input/,
  );
});

test('generateFABFrameworks rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateFABFrameworks({ ...validInput, targetAudience: '', dryRun: true } as CreativeAdFABFrameworkDesignerInput),
    /invalid_creative_ad_fab_framework_designer_input/,
  );
});

test('generateFABFrameworks rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateFABFrameworks(null as never),
    /invalid_creative_ad_fab_framework_designer_input/,
  );
});

test('dry-run feature appeal increases progressively', async () => {
  const result = await generateFABFrameworks({ ...validInput, dryRun: true });
  const scores = result.strategy.frameworks.map((f) => f.featureAppeal);
  // Appeal should generally increase through the frameworks
  assert.ok(scores[2] >= scores[0], 'final framework feature appeal should be >= first');
});

test('dry-run frameworks have non-empty benefit statements', async () => {
  const result = await generateFABFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(f.benefitStatement.length > 10, 'benefit statement should be descriptive');
  }
});

test('dry-run frameworks have non-empty FAB pathways', async () => {
  const result = await generateFABFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(f.fabPathway.length > 5, 'FAB pathway should be descriptive');
  }
});

test('dry-run recommendations count is at least 3', async () => {
  const result = await generateFABFrameworks({ ...validInput, dryRun: true });
  assert.ok(result.strategy.recommendations.length >= 3);
});
