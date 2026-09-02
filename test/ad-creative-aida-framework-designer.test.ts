import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Ad Creative AIDA Framework Designer engine (AI-powered
 * AIDA copy framework design for ad creative).
 *
 * Tests cover input validation, credit cost, and dry-run mode (no real LLM
 * calls) so they can run in the Node test runner.
 */
import {
  AD_CREATIVE_AIDA_FRAMEWORK_DESIGNER_CREDIT_COST,
  validateAdCreativeAIDAFrameworkDesignerInput,
  generateAIDAFramework,
  VALID_PLATFORMS,
  MAX_PRODUCT_LENGTH,
  MAX_AUDIENCE_LENGTH,
  type AdCreativeAIDAFrameworkDesignerInput,
} from '@/lib/creative/ad-creative-aida-framework-designer';

// ── Credit cost ──

test('AD_CREATIVE_AIDA_FRAMEWORK_DESIGNER_CREDIT_COST is 3', () => {
  assert.equal(AD_CREATIVE_AIDA_FRAMEWORK_DESIGNER_CREDIT_COST, 3);
});

// ── Constants ──

test('VALID_PLATFORMS contains the four supported platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.equal(VALID_PLATFORMS.length, 4);
});

test('MAX_PRODUCT_LENGTH is 2000', () => {
  assert.equal(MAX_PRODUCT_LENGTH, 2000);
});

test('MAX_AUDIENCE_LENGTH is 2000', () => {
  assert.equal(MAX_AUDIENCE_LENGTH, 2000);
});

// ── Input validation tests ──

const validInput: AdCreativeAIDAFrameworkDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  targetAudience: 'Women 25-34 interested in clean beauty',
  platform: 'tiktok',
};

test('validateAdCreativeAIDAFrameworkDesignerInput accepts a valid input', () => {
  const { valid, errors } = validateAdCreativeAIDAFrameworkDesignerInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateAdCreativeAIDAFrameworkDesignerInput rejects missing input (non-object)', () => {
  const { valid, errors } = validateAdCreativeAIDAFrameworkDesignerInput(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('validateAdCreativeAIDAFrameworkDesignerInput rejects missing productOrBrand', () => {
  const { valid, errors } = validateAdCreativeAIDAFrameworkDesignerInput({
    ...validInput,
    productOrBrand: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('validateAdCreativeAIDAFrameworkDesignerInput rejects productOrBrand over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeAIDAFrameworkDesignerInput({
    ...validInput,
    productOrBrand: 'x'.repeat(MAX_PRODUCT_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_too_long'));
});

test('validateAdCreativeAIDAFrameworkDesignerInput rejects missing targetAudience', () => {
  const { valid, errors } = validateAdCreativeAIDAFrameworkDesignerInput({
    ...validInput,
    targetAudience: '',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_required'));
});

test('validateAdCreativeAIDAFrameworkDesignerInput rejects targetAudience over 2000 chars', () => {
  const { valid, errors } = validateAdCreativeAIDAFrameworkDesignerInput({
    ...validInput,
    targetAudience: 'x'.repeat(MAX_AUDIENCE_LENGTH + 1),
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('target_audience_too_long'));
});

test('validateAdCreativeAIDAFrameworkDesignerInput rejects invalid platform', () => {
  const { valid, errors } = validateAdCreativeAIDAFrameworkDesignerInput({
    ...validInput,
    platform: 'snapchat' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('platform_invalid'));
});

test('validateAdCreativeAIDAFrameworkDesignerInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateAdCreativeAIDAFrameworkDesignerInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('validateAdCreativeAIDAFrameworkDesignerInput accepts input with only required fields', () => {
  const { valid, errors } = validateAdCreativeAIDAFrameworkDesignerInput({
    productOrBrand: 'A fitness app',
    targetAudience: 'Busy professionals aged 30-45',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeAIDAFrameworkDesignerInput accepts empty platform string', () => {
  const { valid, errors } = validateAdCreativeAIDAFrameworkDesignerInput({
    ...validInput,
    platform: '',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeAIDAFrameworkDesignerInput accepts undefined platform', () => {
  const { valid, errors } = validateAdCreativeAIDAFrameworkDesignerInput({
    productOrBrand: 'A fitness app',
    targetAudience: 'Busy professionals aged 30-45',
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeAIDAFrameworkDesignerInput accepts dryRun boolean true', () => {
  const { valid, errors } = validateAdCreativeAIDAFrameworkDesignerInput({
    ...validInput,
    dryRun: true,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

test('validateAdCreativeAIDAFrameworkDesignerInput accepts dryRun boolean false', () => {
  const { valid, errors } = validateAdCreativeAIDAFrameworkDesignerInput({
    ...validInput,
    dryRun: false,
  });
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
});

// ── Dry-run mode tests ──
//
// These tests run generateAIDAFramework with dryRun: true so no real LLM
// calls are made — deterministic heuristic AIDA copy is returned.

test('dry-run returns an AIDAFrameworkDesignerResult with framework', async () => {
  const result = await generateAIDAFramework({ ...validInput, dryRun: true });
  assert.ok(result);
  assert.ok(result.framework);
  assert.equal(result.dryRun, true);
});

test('dry-run returns framework with all four AIDA stages', async () => {
  const result = await generateAIDAFramework({ ...validInput, dryRun: true });
  assert.ok(result.framework.attention);
  assert.ok(result.framework.interest);
  assert.ok(result.framework.desire);
  assert.ok(result.framework.action);
});

test('dry-run returns stages with correct structure', async () => {
  const result = await generateAIDAFramework({ ...validInput, dryRun: true });
  const stages = ['attention', 'interest', 'desire', 'action'] as const;
  for (const s of stages) {
    const stage = result.framework[s];
    assert.ok(typeof stage.stage === 'string' && stage.stage.length > 0);
    assert.ok(typeof stage.copy === 'string' && stage.copy.length > 0);
    assert.ok(typeof stage.hook === 'string' && stage.hook.length > 0);
    assert.ok(typeof stage.cta === 'string' && stage.cta.length > 0);
  }
});

test('dry-run returns stage names matching the stage keys', async () => {
  const result = await generateAIDAFramework({ ...validInput, dryRun: true });
  assert.equal(result.framework.attention.stage, 'attention');
  assert.equal(result.framework.interest.stage, 'interest');
  assert.equal(result.framework.desire.stage, 'desire');
  assert.equal(result.framework.action.stage, 'action');
});

test('dry-run works for all four platforms', async () => {
  for (const platform of VALID_PLATFORMS) {
    const result = await generateAIDAFramework({
      ...validInput,
      platform,
      dryRun: true,
    });
    assert.ok(result.framework.attention, `${platform} should produce a framework`);
  }
});

test('dry-run works without a platform', async () => {
  const result = await generateAIDAFramework({
    productOrBrand: validInput.productOrBrand,
    targetAudience: validInput.targetAudience,
    dryRun: true,
  });
  assert.ok(result.framework.attention);
});

test('dry-run is deterministic for the same input', async () => {
  const a = await generateAIDAFramework({ ...validInput, dryRun: true });
  const b = await generateAIDAFramework({ ...validInput, dryRun: true });
  assert.equal(a.framework.attention.copy, b.framework.attention.copy);
  assert.equal(a.framework.action.cta, b.framework.action.cta);
});

test('generateAIDAFramework rejects invalid input in dry-run mode', async () => {
  await assert.rejects(
    () => generateAIDAFramework({ ...validInput, productOrBrand: '' } as AdCreativeAIDAFrameworkDesignerInput),
    /invalid_ad_creative_aida_framework_designer_input/,
  );
});

test('generateAIDAFramework rejects missing targetAudience in dry-run mode', async () => {
  await assert.rejects(
    () => generateAIDAFramework({ ...validInput, targetAudience: '', dryRun: true } as AdCreativeAIDAFrameworkDesignerInput),
    /invalid_ad_creative_aida_framework_designer_input/,
  );
});

test('dry-run stage copy references the brand or audience', async () => {
  const result = await generateAIDAFramework({ ...validInput, dryRun: true });
  const allCopy = [
    result.framework.attention.copy,
    result.framework.interest.copy,
    result.framework.desire.copy,
    result.framework.action.copy,
  ].join(' ').toLowerCase();
  assert.ok(
    allCopy.includes('brand') || allCopy.includes('audience'),
    'copy should reference the brand or audience',
  );
});
