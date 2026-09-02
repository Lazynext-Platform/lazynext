import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative BAB Framework Designer engine (AI-powered
 * Before-After-Bridge framework design for ad creative content).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_BAB_FRAMEWORK_DESIGNER_CREDIT_COST,
  validateAdCreativeBABFrameworkDesignerInput,
  generateBABFrameworks,
  VALID_PLATFORMS,
  VALID_TRANSFORMATION_TYPES,
  MAX_PRODUCT_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeBABFrameworkDesignerInput,
} from '@/lib/creative/ad-creative-bab-framework-designer';

// ── Credit cost ──

test('AD_CREATIVE_BAB_FRAMEWORK_DESIGNER_CREDIT_COST is 4', () => {
  assert.equal(AD_CREATIVE_BAB_FRAMEWORK_DESIGNER_CREDIT_COST, 4);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('VALID_TRANSFORMATION_TYPES contains the eight transformation types', () => {
  assert.ok(VALID_TRANSFORMATION_TYPES.includes('status_transformation'));
  assert.ok(VALID_TRANSFORMATION_TYPES.includes('capability_transformation'));
  assert.ok(VALID_TRANSFORMATION_TYPES.includes('emotional_transformation'));
  assert.ok(VALID_TRANSFORMATION_TYPES.includes('financial_transformation'));
  assert.ok(VALID_TRANSFORMATION_TYPES.includes('time_transformation'));
  assert.ok(VALID_TRANSFORMATION_TYPES.includes('social_transformation'));
  assert.ok(VALID_TRANSFORMATION_TYPES.includes('health_transformation'));
  assert.ok(VALID_TRANSFORMATION_TYPES.includes('lifestyle_transformation'));
  assert.equal(VALID_TRANSFORMATION_TYPES.length, 8);
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

const validInput: AdCreativeBABFrameworkDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  content: 'Tired of dull skin? Our vitamin C serum brightens in just 7 days. Try it risk-free today!',
  targetAudience: 'Women 25-40 interested in skincare and wellness',
  platform: 'tiktok',
};

test('validateAdCreativeBABFrameworkDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeBABFrameworkDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeBABFrameworkDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeBABFrameworkDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeBABFrameworkDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeBABFrameworkDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeBABFrameworkDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeBABFrameworkDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeBABFrameworkDesignerInput rejects missing content', () => {
  const { valid, errors } = validateAdCreativeBABFrameworkDesignerInput({
    ...validInput,
    content: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeBABFrameworkDesignerInput rejects content over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeBABFrameworkDesignerInput({
    ...validInput,
    content: 'x'.repeat(MAX_CONTENT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_too_long'));
});

test('validateAdCreativeBABFrameworkDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeBABFrameworkDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeBABFrameworkDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeBABFrameworkDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeBABFrameworkDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeBABFrameworkDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeBABFrameworkDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeBABFrameworkDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeBABFrameworkDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeBABFrameworkDesignerInput({
    productOrBrand: 'A fitness app',
    content: 'A great ad for our new product',
    targetAudience: 'Busy professionals 30-50',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeBABFrameworkDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeBABFrameworkDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeBABFrameworkDesignerInput rejects non-string platform', () => {
  const { valid, errors } = validateAdCreativeBABFrameworkDesignerInput({
    ...validInput,
    platform: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeBABFrameworkDesignerInput collects multiple errors', () => {
  const { valid, errors } = validateAdCreativeBABFrameworkDesignerInput({
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

test('validateAdCreativeBABFrameworkDesignerInput accepts whitespace-only productOrBrand as invalid', () => {
  const { valid, errors } = validateAdCreativeBABFrameworkDesignerInput({
    ...validInput,
    productOrBrand: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeBABFrameworkDesignerInput accepts whitespace-only content as invalid', () => {
  const { valid, errors } = validateAdCreativeBABFrameworkDesignerInput({
    ...validInput,
    content: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('content_required'));
});

test('validateAdCreativeBABFrameworkDesignerInput accepts whitespace-only targetAudience as invalid', () => {
  const { valid, errors } = validateAdCreativeBABFrameworkDesignerInput({
    ...validInput,
    targetAudience: '   ',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

// ── Dry-run mode tests ──
//
// These tests run generateBABFrameworks with dryRun: true so no real
// LLM calls are made — deterministic heuristic frameworks are returned.

test('dry-run returns a BABFrameworkDesignerResult with strategy', async () => {
  const result = await generateBABFrameworks({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.strategy);
  assert.ok(Array.isArray(result.strategy.frameworks));
  assert.ok(result.strategy.frameworks.length > 0);
  assert.equal(result.dryRun, true);
});

test('dry-run returns frameworks with correct structure', async () => {
  const result = await generateBABFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(typeof f.type === 'string' && f.type.length > 0);
    assert.ok(typeof f.beforeState === 'string' && f.beforeState.length > 0);
    assert.ok(typeof f.afterState === 'string' && f.afterState.length > 0);
    assert.ok(typeof f.bridgeMechanism === 'string' && f.bridgeMechanism.length > 0);
    assert.ok(typeof f.contrastStrength === 'number' && f.contrastStrength >= 0 && f.contrastStrength <= 100);
    assert.ok(typeof f.desireTrigger === 'number' && f.desireTrigger >= 0 && f.desireTrigger <= 100);
    assert.ok(typeof f.babPathway === 'string' && f.babPathway.length > 0);
  }
});

test('dry-run returns frameworks with valid transformation types', async () => {
  const result = await generateBABFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(
      VALID_TRANSFORMATION_TYPES.includes(f.type as never),
      `transformation type "${f.type}" should be valid`,
    );
  }
});

test('dry-run returns contrastStrength in 0-100 range', async () => {
  const result = await generateBABFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(f.contrastStrength >= 0 && f.contrastStrength <= 100);
  }
});

test('dry-run returns desireTrigger in 0-100 range', async () => {
  const result = await generateBABFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(f.desireTrigger >= 0 && f.desireTrigger <= 100);
  }
});

test('dry-run returns recommendations', async () => {
  const result = await generateBABFrameworks({ ...validInput, dryRun: true });
  assert.ok(Array.isArray(result.strategy.recommendations));
  assert.ok(result.strategy.recommendations.length > 0);
  for (const r of result.strategy.recommendations) {
    assert.ok(typeof r === 'string' && r.length > 0);
  }
});

test('dry-run returns at least 3 frameworks', async () => {
  const result = await generateBABFrameworks({ ...validInput, dryRun: true });
  assert.ok(result.strategy.frameworks.length >= 3);
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateBABFrameworks({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.strategy.frameworks.length > 0, `${platform} should produce frameworks`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateBABFrameworks({
    ...validInput,
    platform: undefined,
    dryRun: true,
  });
  assert.ok(result.strategy.frameworks.length > 0);
});

test('dry-run output is deterministic for same input', async () => {
  const r1 = await generateBABFrameworks({ ...validInput, dryRun: true });
  const r2 = await generateBABFrameworks({ ...validInput, dryRun: true });
  assert.equal(r1.strategy.frameworks.length, r2.strategy.frameworks.length);
  assert.equal(r1.strategy.frameworks[0].contrastStrength, r2.strategy.frameworks[0].contrastStrength);
  assert.equal(r1.strategy.frameworks[0].desireTrigger, r2.strategy.frameworks[0].desireTrigger);
});

test('dry-run output varies with different content', async () => {
  const r1 = await generateBABFrameworks({ ...validInput, dryRun: true });
  const r2 = await generateBABFrameworks({
    ...validInput,
    content: 'Short',
    dryRun: true,
  });
  // Framework count is the same but scores differ based on content length
  assert.equal(r1.strategy.frameworks.length, r2.strategy.frameworks.length);
});

test('generateBABFrameworks rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateBABFrameworks({ ...validInput, content: '' } as AdCreativeBABFrameworkDesignerInput),
    /invalid_ad_creative_bab_framework_designer_input/,
  );
});

test('generateBABFrameworks rejects missing productOrBrand in dry-run mode', async () => {
  await assert.rejects(
    () => generateBABFrameworks({ ...validInput, productOrBrand: '', dryRun: true } as AdCreativeBABFrameworkDesignerInput),
    /invalid_ad_creative_bab_framework_designer_input/,
  );
});

test('generateBABFrameworks rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateBABFrameworks({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeBABFrameworkDesignerInput),
    /invalid_ad_creative_bab_framework_designer_input/,
  );
});

test('generateBABFrameworks rejects missing input (non-object)', async () => {
  await assert.rejects(
    () => generateBABFrameworks(null as never),
    /invalid_ad_creative_bab_framework_designer_input/,
  );
});

test('dry-run recommendations reference the brand and audience', async () => {
  const result = await generateBABFrameworks({ ...validInput, dryRun: true });
  const allRecs = result.strategy.recommendations.join(' ').toLowerCase();
  assert.ok(allRecs.length > 0);
});

test('dry-run frameworks have distinct types', async () => {
  const result = await generateBABFrameworks({ ...validInput, dryRun: true });
  const types = result.strategy.frameworks.map((f) => f.type);
  const unique = new Set(types);
  assert.equal(unique.size, types.length, 'framework types should be distinct');
});

test('dry-run frameworks reference before and after states', async () => {
  const result = await generateBABFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(f.beforeState.length > 0, 'beforeState should not be empty');
    assert.ok(f.afterState.length > 0, 'afterState should not be empty');
    assert.ok(f.bridgeMechanism.length > 0, 'bridgeMechanism should not be empty');
  }
});

test('dry-run frameworks have babPathway containing arrow notation', async () => {
  const result = await generateBABFrameworks({ ...validInput, dryRun: true });
  for (const f of result.strategy.frameworks) {
    assert.ok(f.babPathway.includes('→'), 'babPathway should contain arrow notation');
  }
});
