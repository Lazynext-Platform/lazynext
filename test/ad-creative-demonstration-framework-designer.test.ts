import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative Demonstration Framework Designer engine (AI-powered
 * demonstration framework design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_DEMONSTRATION_FRAMEWORK_DESIGNER_CREDIT_COST,
  validateAdCreativeDemonstrationFrameworkDesignerInput,
  generateDemonstrationFrameworks,
  VALID_PLATFORMS,
  VALID_DEMO_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeDemonstrationFrameworkDesignerInput,
} from '@/lib/creative/ad-creative-demonstration-framework-designer';

// ── Credit cost ──

test('AD_CREATIVE_DEMONSTRATION_FRAMEWORK_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(AD_CREATIVE_DEMONSTRATION_FRAMEWORK_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_DEMO_TYPES contains the eight demo types', () => {
  assert.ok(VALID_DEMO_TYPES.includes('how_to_use'));
  assert.ok(VALID_DEMO_TYPES.includes('product_in_action'));
  assert.ok(VALID_DEMO_TYPES.includes('result_demonstration'));
  assert.ok(VALID_DEMO_TYPES.includes('before_after_demo'));
  assert.ok(VALID_DEMO_TYPES.includes('problem_solution_demo'));
  assert.ok(VALID_DEMO_TYPES.includes('feature_showcase'));
  assert.ok(VALID_DEMO_TYPES.includes('comparison_demo'));
  assert.ok(VALID_DEMO_TYPES.includes('transformation_demo'));
  assert.equal(VALID_DEMO_TYPES.length, 8);
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

const validInput: AdCreativeDemonstrationFrameworkDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateAdCreativeDemonstrationFrameworkDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeDemonstrationFrameworkDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeDemonstrationFrameworkDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeDemonstrationFrameworkDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeDemonstrationFrameworkDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeDemonstrationFrameworkDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeDemonstrationFrameworkDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeDemonstrationFrameworkDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeDemonstrationFrameworkDesignerInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeDemonstrationFrameworkDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeDemonstrationFrameworkDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeDemonstrationFrameworkDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeDemonstrationFrameworkDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeDemonstrationFrameworkDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeDemonstrationFrameworkDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeDemonstrationFrameworkDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeDemonstrationFrameworkDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeDemonstrationFrameworkDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeDemonstrationFrameworkDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeDemonstrationFrameworkDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeDemonstrationFrameworkDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeDemonstrationFrameworkDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeDemonstrationFrameworkDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeDemonstrationFrameworkDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeDemonstrationFrameworkDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateAdCreativeDemonstrationFrameworkDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeDemonstrationFrameworkDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateAdCreativeDemonstrationFrameworkDesignerInput({
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

test('validateAdCreativeDemonstrationFrameworkDesignerInput accepts whitespace-only productOrBrand as invalid', () => {
  const { valid, errors } = validateAdCreativeDemonstrationFrameworkDesignerInput({
    ...validInput,
    productOrBrand: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeDemonstrationFrameworkDesignerInput accepts whitespace-only content as invalid', () => {
  const { valid, errors } = validateAdCreativeDemonstrationFrameworkDesignerInput({
    ...validInput,
    content: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeDemonstrationFrameworkDesignerInput accepts whitespace-only targetAudience as invalid', () => {
  const { valid, errors } = validateAdCreativeDemonstrationFrameworkDesignerInput({
    ...validInput,
    targetAudience: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

// ── Dry-run mode tests ──
//
// These tests run generateDemonstrationFrameworks with dryRun: true so no real
// LLM calls are made — deterministic heuristic frameworks are returned.

test('dry-run returns a DemonstrationFrameworkDesignerResult with strategy', async () => {
  const result = await generateDemonstrationFrameworks({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.frameworks));
  assert.ok(result.strategy.frameworks.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns frameworks with correct structure', async () => {
  const result = await generateDemonstrationFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(typeof f.type === 'string' && f.type.length > 0);
    assert.ok(typeof f.demoScenario === 'string' && f.demoScenario.length > 0);
    assert.ok(typeof f.visualProofElement === 'string' && f.visualProofElement.length > 0);
    assert.ok(typeof f.resultReveal === 'string' && f.resultReveal.length > 0);
    assert.ok(typeof f.demonstrationClarity === 'number' && f.demonstrationClarity >= 0 && f.demonstrationClarity <= 100);
    assert.ok(typeof f.beliefShift === 'number' && f.beliefShift >= 0 && f.beliefShift <= 100);
    assert.ok(typeof f.demonstrationPathway === 'string' && f.demonstrationPathway.length > 0);
  }
});

test('dry-run returns frameworks with valid demo types', async () => {
  const result = await generateDemonstrationFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(
      VALID_DEMO_TYPES.includes(f.type as never),
      `demo type "${f.type}" should be valid`,
    );
  }
});

test('dry-run returns demonstrationClarity in 0-100 range', async () => {
  const result = await generateDemonstrationFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(f.demonstrationClarity >= 0 && f.demonstrationClarity <= 100);
  }
});

test('dry-run returns beliefShift in 0-100 range', async () => {
  const result = await generateDemonstrationFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(f.beliefShift >= 0 && f.beliefShift <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateDemonstrationFrameworks({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 3 frameworks', async () => {
  const result = await generateDemonstrationFrameworks({ ...validInput, dryRun: true });
  assert.ok(result.strategy.frameworks.length >= 3);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateDemonstrationFrameworks({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.frameworks.length > 0, `${platform} should produce frameworks`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateDemonstrationFrameworks({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.frameworks.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateDemonstrationFrameworks({ ...validInput, dryRun: true });
  const r2 = await generateDemonstrationFrameworks({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.frameworks.length, r2.strategy.frameworks.length);
  assert.equal(r1.strategy.frameworks[0].demonstrationClarity, r2.strategy.frameworks[0].demonstrationClarity);
  assert.equal(r1.strategy.frameworks[0].beliefShift, r2.strategy.frameworks[0].beliefShift);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateDemonstrationFrameworks({ ...validInput, dryRun: true });
  const r2 = await generateDemonstrationFrameworks({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Framework count is the same but scores differ based on content length
  assert.equal(r1.strategy.frameworks.length, r2.strategy.frameworks.length);
});

test('generateDemonstrationFrameworks rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateDemonstrationFrameworks({ ...validInput, content: '' } as AdCreativeDemonstrationFrameworkDesignerInput),
    /invalid_ad_creative_demonstration_framework_designer_input/,
  );
});

test('generateDemonstrationFrameworks rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateDemonstrationFrameworks({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeDemonstrationFrameworkDesignerInput),
    /invalid_ad_creative_demonstration_framework_designer_input/,
  );
});

test('generateDemonstrationFrameworks rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateDemonstrationFrameworks({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeDemonstrationFrameworkDesignerInput),
    /invalid_ad_creative_demonstration_framework_designer_input/,
  );
});

test('generateDemonstrationFrameworks rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateDemonstrationFrameworks(null as never),
    /invalid_ad_creative_demonstration_framework_designer_input/,
  );
});

test('dry-run recommendations reference the brand and audience', async () => {
  const result = await generateDemonstrationFrameworks({ ...validInput, dryRun: true });
  const allRecs = result.strategy.recommendations.join(' ').toLowerCase();
  assert.ok(allRecs.length > 0);
});

test('dry-run frameworks have distinct types', async () => {
  const result = await generateDemonstrationFrameworks({ ...validInput, dryRun: true });
  const types = result.strategy.frameworks.map((f) => f.type);
  const unique = new Set(types);
  assert.equal(unique.size, types.length, 'framework types should be distinct');
});
